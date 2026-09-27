/**
 * ALBATROSS API client.
 *
 * Responsibilities:
 *   - attach the bearer token to every request
 *   - unwrap the backend envelope { success, data, error } so callers get `data`
 *   - turn failures into a single ApiError shape with a safe, user-facing message
 *   - sign the user out when the token stops working
 *   - read newline-delimited JSON from /api/chat/stream
 */
import axios from 'axios'

const TOKEN_KEY = 'albatross.token'
export const UNAUTHORIZED_EVENT = 'albatross:unauthorized'

export const API_BASE_URL = import.meta.env.VITE_API_URL
  ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api`
  : '/api'

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token)
    else window.localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private browsing - the token simply will not persist */
  }
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', details = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isAuthError() {
    return this.status === 401
  }

  get isLimitError() {
    return this.status === 402
  }

  get isOffline() {
    return this.status === 0
  }

  get isUpstream() {
    return this.status === 502 || this.code === 'upstream_error'
  }
}

const FALLBACK_MESSAGES = {
  0: 'We could not reach ALBATROSS. Check your connection and try again.',
  400: 'The request could not be understood.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have access to that.',
  404: 'We could not find what you were looking for.',
  409: 'That already exists.',
  413: 'That file is larger than the allowed limit.',
  415: 'That file type is not supported.',
  422: 'Please check the highlighted fields and try again.',
  429: 'Too many requests. Please slow down and try again shortly.',
  500: 'Something went wrong on our side. Please try again.',
  502: 'The answer service is temporarily unavailable. Please try again.',
}

function normaliseError(error) {
  if (error instanceof ApiError) return error

  if (axios.isCancel?.(error) || error?.code === 'ERR_CANCELED') {
    return new ApiError('Request cancelled.', { status: 0, code: 'cancelled' })
  }

  const response = error?.response
  if (!response) {
    return new ApiError(FALLBACK_MESSAGES[0], { status: 0, code: 'network_error' })
  }

  const body = response.data
  const envelope = body && typeof body === 'object' ? body.error : null
  const message =
    (envelope && envelope.message) ||
    (typeof body === 'string' && body) ||
    FALLBACK_MESSAGES[response.status] ||
    'Request failed.'

  return new ApiError(message, {
    status: response.status,
    code: (envelope && envelope.code) || 'error',
    details: envelope?.details ?? null,
  })
}

const http = axios.create({ baseURL: API_BASE_URL, timeout: 60000 })

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401 && getToken()) {
      setToken(null)
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    return Promise.reject(normaliseError(error))
  },
)

/** Perform a request and return only the `data` payload of the envelope. */
async function call(config) {
  const response = await http.request(config)
  const body = response.data
  if (body && typeof body === 'object' && 'success' in body) {
    return body.data
  }
  return body
}

// ------------------------------------------------------------------ auth

export const authAPI = {
  signup: (payload) => call({ method: 'post', url: '/auth/signup', data: payload }),
  login: (payload) => call({ method: 'post', url: '/auth/login', data: payload }),
  me: () => call({ method: 'get', url: '/auth/me' }),
  session: () => call({ method: 'get', url: '/auth/session' }),
  updateProfile: (payload) => call({ method: 'patch', url: '/auth/profile', data: payload }),
  changePassword: (payload) => call({ method: 'post', url: '/auth/password', data: payload }),
  deleteAccount: (password) =>
    call({ method: 'delete', url: '/auth/account', data: { password } }),
}

// ------------------------------------------------------------- documents

export const documentsAPI = {
  upload: (file, { collectionId = null, onProgress } = {}) => {
    const form = new FormData()
    form.append('file', file)
    if (collectionId) form.append('collection_id', collectionId)
    return call({
      method: 'post',
      url: '/documents/upload',
      data: form,
      timeout: 300000,
      onUploadProgress: (event) => {
        if (!onProgress) return
        const total = event.total || event.event?.total
        onProgress(total ? Math.round((event.loaded * 100) / total) : null)
      },
    })
  },
  list: (params = {}) => call({ method: 'get', url: '/documents/', params }),
  get: (id) => call({ method: 'get', url: `/documents/${id}` }),
  status: (id) => call({ method: 'get', url: `/documents/${id}/status` }),
  content: (id) => call({ method: 'get', url: `/documents/${id}/content` }),
  chunks: (id) => call({ method: 'get', url: `/documents/${id}/chunks` }),
  update: (id, fields) => call({ method: 'patch', url: `/documents/${id}`, data: fields }),
  remove: (id) => call({ method: 'delete', url: `/documents/${id}` }),
  /** Authenticated URL for the stored original. Fetched with the token, not embedded. */
  fetchFile: async (id) => {
    const token = getToken()
    const response = await fetch(`${API_BASE_URL}/documents/${id}/file`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      throw new ApiError(
        FALLBACK_MESSAGES[response.status] || 'That file could not be opened.',
        { status: response.status },
      )
    }
    return response.blob()
  },
}

// ----------------------------------------------------------- collections

export const collectionsAPI = {
  list: () => call({ method: 'get', url: '/collections/' }),
  create: (payload) => call({ method: 'post', url: '/collections/', data: payload }),
  get: (id) => call({ method: 'get', url: `/collections/${id}` }),
  update: (id, fields) => call({ method: 'patch', url: `/collections/${id}`, data: fields }),
  remove: (id) => call({ method: 'delete', url: `/collections/${id}` }),
  moveDocuments: (id, documentIds) =>
    call({ method: 'post', url: `/collections/${id}/documents`, data: { document_ids: documentIds } }),
}

// --------------------------------------------------------- conversations

export const conversationsAPI = {
  list: (params = {}) => call({ method: 'get', url: '/conversations/', params }),
  create: (payload = {}) => call({ method: 'post', url: '/conversations/', data: payload }),
  get: (id) => call({ method: 'get', url: `/conversations/${id}` }),
  update: (id, fields) => call({ method: 'patch', url: `/conversations/${id}`, data: fields }),
  remove: (id) => call({ method: 'delete', url: `/conversations/${id}` }),
  clear: (id) => call({ method: 'post', url: `/conversations/${id}/clear` }),
  feedback: (id, payload) =>
    call({ method: 'post', url: `/conversations/${id}/feedback`, data: payload }),
}

// ------------------------------------------------------------------ chat

/**
 * Stream an answer. The backend emits newline-delimited JSON events:
 *   {type:'meta'} -> {type:'sources'} -> {type:'delta'|'error'}* -> {type:'done'}
 *
 * Returns a handle with abort(), so "Stop generating" can cancel the request.
 */
export function streamAnswer(payload, handlers = {}) {
  const controller = new AbortController()
  const { onMeta, onSources, onDelta, onDone, onError } = handlers

  const run = async () => {
    const token = getToken()
    let response
    try {
      response = await fetch(`${API_BASE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (error) {
      if (error?.name === 'AbortError') return
      onError?.(new ApiError(FALLBACK_MESSAGES[0], { status: 0, code: 'network_error' }))
      return
    }

    if (!response.ok) {
      let message = FALLBACK_MESSAGES[response.status] || 'The answer could not be generated.'
      let code = 'error'
      try {
        const body = await response.json()
        if (body?.error?.message) message = body.error.message
        if (body?.error?.code) code = body.error.code
      } catch {
        /* non-JSON error body - keep the fallback message */
      }
      if (response.status === 401 && getToken()) {
        setToken(null)
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
      }
      onError?.(new ApiError(message, { status: response.status, code }))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      onError?.(new ApiError('Streaming is not supported in this browser.', { status: 0 }))
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false

    const handle = (line) => {
      const trimmed = line.trim()
      if (!trimmed) return
      let event
      try {
        event = JSON.parse(trimmed)
      } catch {
        return
      }
      if (event.type === 'meta') onMeta?.(event)
      else if (event.type === 'sources') onSources?.(event.sources || [])
      else if (event.type === 'delta') onDelta?.(event.text || '')
      else if (event.type === 'error') {
        finished = true
        onError?.(new ApiError(event.message || 'The answer could not be generated.', {
          status: 502,
          code: 'stream_error',
        }), { partial: Boolean(event.partial) })
      } else if (event.type === 'done') {
        finished = true
        onDone?.(event)
      }
    }

    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let index = buffer.indexOf('\n')
        while (index >= 0) {
          handle(buffer.slice(0, index))
          buffer = buffer.slice(index + 1)
          index = buffer.indexOf('\n')
        }
      }
      if (buffer) handle(buffer)
      if (!finished) onDone?.({})
    } catch (error) {
      if (error?.name !== 'AbortError') {
        onError?.(new ApiError('The answer stream was interrupted.', { status: 0, code: 'stream_error' }))
      }
    }
  }

  run()
  return { abort: () => controller.abort() }
}

export const chatAPI = {
  ask: (payload) => call({ method: 'post', url: '/chat/ask', data: payload }),
  stream: streamAnswer,
  followups: (payload) => call({ method: 'post', url: '/chat/followups', data: payload }),
}

// ---------------------------------------------------------------- search

export const searchAPI = {
  search: (payload) => call({ method: 'post', url: '/search/', data: payload }),
  options: () => call({ method: 'get', url: '/search/options' }),
  chunk: (id) => call({ method: 'get', url: `/search/chunk/${id}` }),
}

// ------------------------------------------------------------- analytics

export const analyticsAPI = {
  overview: () => call({ method: 'get', url: '/analytics/' }),
}

// ------------------------------------------------------------- account

export const meAPI = {
  overview: () => call({ method: 'get', url: '/me/overview' }),
  usage: () => call({ method: 'get', url: '/me/usage' }),
  activity: (params = {}) => call({ method: 'get', url: '/me/activity', params }),
  preferences: () => call({ method: 'get', url: '/me/preferences' }),
  updatePreferences: (fields) => call({ method: 'patch', url: '/me/preferences', data: fields }),
  changePlan: (plan) => call({ method: 'post', url: '/me/plan', data: { plan } }),
  exportData: () => call({ method: 'get', url: '/me/export' }),
}

export const metaAPI = {
  health: () => call({ method: 'get', url: '/health' }),
  plans: () => call({ method: 'get', url: '/plans' }),
}

export default http