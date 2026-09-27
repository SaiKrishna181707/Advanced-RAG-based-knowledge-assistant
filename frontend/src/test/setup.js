/** Vitest setup: jest-dom matchers and the browser APIs jsdom does not provide. */
import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

// jsdom implements neither of these, and both are used by the app.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

if (!window.scrollTo) {
  window.scrollTo = vi.fn()
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn()
}

// jsdom has no IntersectionObserver; framer-motion's `whileInView` (used on
// the landing page reveal animations) needs one to mount at all. This stub
// never fires a callback, which is fine for tests — they assert on content
// that's already in the DOM, not on the post-intersection animated state.
if (!window.IntersectionObserver) {
  class IntersectionObserverStub {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = () => []
  }
  window.IntersectionObserver = IntersectionObserverStub
  global.IntersectionObserver = IntersectionObserverStub
}