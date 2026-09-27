/**
 * The API contract layer.
 *
 * This is the only place that knows the backend envelope shape, so it is the only
 * place that has to be tested for it. axios is replaced with a controllable
 * transport so the real unwrapping, error mapping and 401 handling are exercised
 * rather than stubbed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
  request: null,
  onRequest: null,
  onResponse: null,
  onError: null,
}))

vi.mock('axios', () => {
  const instance = {
    request: (config) => harness.request(config),
    interceptors: {
      request: { use: (fn) => { harness.onRequest = fn } },
      response: {
        use: (ok, err) => {
          harness.onResponse = ok
          harness.onError = err
        },
      },
    },
  }
  const axios = { create: () => instance, isCancel: () => false }
  return { default: axios, ...axios }
})

const { ApiError, UNAUTHORIZED_EVENT, authAPI, getToken, setToken } = await import('./client')

/** A response as axios would hand it to the response interceptor. */
function ok(data) {
  return { data, status: 200 }
}

function httpError(status, body) {
  return { response: { status, data: body } }
}

/**
 * The response interceptor rejects with the normalised error, so the rejection
 * has to be unwrapped before it can be asserted on.
 */
function rejected(promise) {
  return promise.then(
    () => {
      throw new Error('Expected the interceptor to reject, but it resolved.')
    },
    (error) => error,
  )
}

beforeEach(() => {
  harness.request = vi.fn()
  window.localStorage.clear()
})

describe('envelope handling', () => {
  it('returns only the data payload, not the envelope', async () => {
    harness.request.mockResolvedValue(
      ok({ success: true, data: { user: { id: 'u1' } }, error: null }),
    )

    await expect(authAPI.me()).resolves.toEqual({ user: { id: 'u1' } })
  })

  it('passes a non-envelope body straight through', async () => {
    // The file-download path returns raw bytes rather than an envelope.
    harness.request.mockResolvedValue(ok('raw'))

    await expect(authAPI.me()).resolves.toBe('raw')
  })

  it('sends the bearer token when one is stored', async () => {
    setToken('token-abc')
    const config = harness.onRequest({ headers: {} })

    expect(config.headers.Authorization).toBe('Bearer token-abc')
  })

  it('omits the header when there is no session', async () => {
    setToken(null)
    const config = harness.onRequest({ headers: {} })

    expect(config.headers.Authorization).toBeUndefined()
  })
})

describe('error normalisation', () => {
  it('surfaces the backend message and code for a validation failure', async () => {
    const error = await rejected(
      harness.onError(
        httpError(422, {
          success: false,
          data: null,
          error: { code: 'validation_error', message: 'Your password must be at least 8 characters long.' },
        }),
      ),
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('Your password must be at least 8 characters long.')
    expect(error.code).toBe('validation_error')
    expect(error.status).toBe(422)
  })

  it('marks a duplicate upload as a conflict with the backend wording', async () => {
    const error = await rejected(
      harness.onError(
        httpError(409, {
          success: false,
          data: null,
          error: { code: 'conflict', message: 'Document already exists.' },
        }),
      ),
    )

    expect(error.status).toBe(409)
    expect(error.message).toBe('Document already exists.')
  })

  it('classifies a usage-limit rejection so the UI can offer an upgrade', async () => {
    const error = await rejected(
      harness.onError(
        httpError(402, {
          success: false,
          data: null,
          error: { code: 'usage_limit_reached', message: 'You have used all 200 questions on the Free plan.' },
        }),
      ),
    )

    expect(error.isLimitError).toBe(true)
    expect(error.isAuthError).toBe(false)
  })

  it('classifies an LLM outage as upstream so the UI can say "try again"', async () => {
    const error = await rejected(
      harness.onError(
        httpError(502, {
          success: false,
          data: null,
          error: { code: 'llm_unavailable', message: 'The answer service is unavailable right now. Please try again.' },
        }),
      ),
    )

    expect(error.isUpstream).toBe(true)
  })

  it('falls back to a readable message when the body carries none', async () => {
    const error = await rejected(harness.onError(httpError(415, null)))

    expect(error.status).toBe(415)
    expect(error.message).toBe('That file type is not supported.')
  })

  it('reports a connection failure without leaking a transport error', async () => {
    const error = await rejected(
      harness.onError(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })),
    )

    expect(error.isOffline).toBe(true)
    expect(error.message).toMatch(/could not reach albatross/i)
    // A raw axios message must never reach the user.
    expect(error.message).not.toMatch(/network error/i)
  })

  it('never exposes a server stack trace from a 500', async () => {
    const error = await rejected(
      harness.onError(
        httpError(500, {
          success: false,
          data: null,
          error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' },
        }),
      ),
    )

    expect(error.message).toBe('Something went wrong on our side. Please try again.')
    expect(error.message).not.toMatch(/traceback|file "|line \d+/i)
  })
})

describe('expired sessions', () => {
  it('clears the token and announces the sign-out on a 401', async () => {
    setToken('stale-token')
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await rejected(
      harness.onError(
        httpError(401, {
          success: false,
          data: null,
          error: { code: 'invalid_token', message: 'Invalid authentication token.' },
        }),
      ),
    )

    expect(getToken()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })

  it('does not announce a sign-out when there was no session to begin with', async () => {
    setToken(null)
    const listener = vi.fn()
    window.addEventListener(UNAUTHORIZED_EVENT, listener)

    await rejected(
      harness.onError(
        httpError(401, { success: false, data: null, error: { code: 'unauthenticated', message: 'Authentication required.' } }),
      ),
    )

    expect(listener).not.toHaveBeenCalled()
    window.removeEventListener(UNAUTHORIZED_EVENT, listener)
  })
})
