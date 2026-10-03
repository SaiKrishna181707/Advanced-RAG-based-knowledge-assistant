/**
 * A stand-in for src/api/client.js used by the component and store tests.
 *
 * It is deliberately self-contained: importing the real module from here would be
 * circular, because the tests replace that exact module path.
 *
 * Everything the app calls is a spy, so a test that forgot to set up a response
 * fails loudly instead of reaching the network.
 */
import { vi } from 'vitest'

export const UNAUTHORIZED_EVENT = 'albatross:unauthorized'
export const API_BASE_URL = '/api'

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

const TOKEN_KEY = 'albatross.token'
const REFRESH_KEY = 'albatross.refresh'

function readStored(key) {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStored(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function getToken() {
  return readStored(TOKEN_KEY)
}

export function setToken(token) {
  writeStored(TOKEN_KEY, token)
}

export function getRefreshToken() {
  return readStored(REFRESH_KEY)
}

export function setRefreshToken(token) {
  writeStored(REFRESH_KEY, token)
}

export function setSession({ token, refreshToken } = {}) {
  setToken(token)
  setRefreshToken(refreshToken)
}

export function clearSession() {
  setToken(null)
  setRefreshToken(null)
}

/** Reject with an ApiError - the shape every caller handles. */
export function apiError(message, options) {
  return Promise.reject(new ApiError(message, options))
}

export const authAPI = {
  signup: vi.fn(),
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
  session: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  deleteAccount: vi.fn(),
}

export const documentsAPI = {
  upload: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  status: vi.fn(),
  content: vi.fn(),
  chunks: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  fetchFile: vi.fn(),
}

export const collectionsAPI = {
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  moveDocuments: vi.fn(),
}

export const conversationsAPI = {
  list: vi.fn(),
  create: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  feedback: vi.fn(),
}

export const chatAPI = {
  ask: vi.fn(),
  stream: vi.fn(),
  followups: vi.fn(),
}

export const searchAPI = {
  search: vi.fn(),
  options: vi.fn(),
  chunk: vi.fn(),
}

export const analyticsAPI = { overview: vi.fn() }

export const meAPI = {
  overview: vi.fn(),
  usage: vi.fn(),
  activity: vi.fn(),
  preferences: vi.fn(),
  updatePreferences: vi.fn(),
  changePlan: vi.fn(),
  exportData: vi.fn(),
}

export const metaAPI = { health: vi.fn(), plans: vi.fn() }

export function streamAnswer() {
  return { abort: vi.fn() }
}

/** Clear every spy between tests. */
export function resetApiMocks() {
  for (const group of [
    authAPI,
    documentsAPI,
    collectionsAPI,
    conversationsAPI,
    chatAPI,
    searchAPI,
    analyticsAPI,
    meAPI,
    metaAPI,
  ]) {
    Object.values(group).forEach((fn) => fn.mockReset())
  }
}

export default {}
