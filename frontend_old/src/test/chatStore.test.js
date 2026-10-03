/**
 * The chat streaming protocol.
 *
 * The backend sends newline-delimited JSON: meta -> sources -> delta* -> done|error.
 * These tests drive that sequence through the store and assert what the user ends
 * up with, including the citation normalisation and the incomplete-scope notice.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { USER } from './fixtures'

vi.mock('../api/client', () => import('./apiClientMock'))

const { chatAPI, conversationsAPI } = await import('./apiClientMock')
const { useStore } = await import('../store/index')

/** Drive a canned event sequence through the registered stream handlers. */
function replay(events) {
  chatAPI.stream.mockImplementation((payload, handlers) => {
    for (const event of events) {
      if (event.type === 'meta') handlers.onMeta(event)
      if (event.type === 'sources') handlers.onSources(event.sources)
      if (event.type === 'delta') handlers.onDelta(event.text)
      if (event.type === 'done') handlers.onDone(event)
      if (event.type === 'error') handlers.onError(event.error, event.info)
    }
    return { abort: vi.fn() }
  })
}

const SOURCES = [
  {
    index: 1,
    chunk_id: 'chunk1',
    document_id: 'doc1',
    document: 'evaluation-memo.txt',
    page: 1,
    location_unit: 'page',
    relevance: 0.9,
    snippet: 'After filtering, 12,480 admissions records remained.',
    content: 'After filtering, 12,480 admissions records remained.',
  },
]

beforeEach(() => {
  conversationsAPI.list.mockResolvedValue({ conversations: [] })
  useStore.setState({
    messages: [],
    isStreaming: false,
    streamError: null,
    currentConversationId: null,
    scope: { mode: 'all', collection_id: null, document_ids: [] },
  })
})

describe('streaming an answer', () => {
  it('assembles the deltas into one assistant message', async () => {
    replay([
      { type: 'meta', conversation_id: 'c1', retrieval_ms: 12, scope_label: 'All documents' },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'The filtered cohort contained ' },
      { type: 'delta', text: '**12,480** records[1].' },
      { type: 'done', message_id: 'm1', llm_ms: 400, model: 'openai/gpt-oss-120b' },
    ])

    await useStore.getState().ask('How many were in the cohort?')

    const { messages } = useStore.getState()
    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({ role: 'user', content: 'How many were in the cohort?' })
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBe('The filtered cohort contained **12,480** records[1].')
    expect(messages[1].streaming).toBe(false)
    expect(messages[1].id).toBe('m1')
    expect(messages[1].sources).toEqual(SOURCES)
    expect(messages[1].llm_ms).toBe(400)
    expect(messages[1].retrieval_ms).toBe(12)
  })

  it('normalises a full-width citation split across two deltas', async () => {
    // gpt-oss can emit \u30101\u3011, and the marker may straddle a chunk boundary.
    replay([
      { type: 'meta', conversation_id: 'c1' },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'The total was 12,480 USD\u3010' },
      { type: 'delta', text: '1\u3011.' },
      { type: 'done', message_id: 'm1' },
    ])

    await useStore.getState().ask('What was the total?')

    const answer = useStore.getState().messages[1]
    // The finished message must carry the plain marker the UI can resolve.
    expect(answer.content).toBe('The total was 12,480 USD[1].')
  })

  it('keeps the sources so a citation is clickable', async () => {
    replay([
      { type: 'meta', conversation_id: 'c1' },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'Answer [1].' },
      { type: 'done', message_id: 'm1' },
    ])

    await useStore.getState().ask('Question?')

    const [source] = useStore.getState().messages[1].sources
    expect(source.chunk_id).toBe('chunk1')
    expect(source.document).toBe('evaluation-memo.txt')
    expect(source.page).toBe(1)
  })

  it('records the incomplete-scope notice when documents are still processing', async () => {
    const notice =
      '1 document in this scope is still being processed, so it may not be reflected in this answer yet.'
    replay([
      { type: 'meta', conversation_id: 'c1', notice },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'Partial answer [1].' },
      { type: 'done', message_id: 'm1' },
    ])

    await useStore.getState().ask('Question?')

    expect(useStore.getState().messages[1].notice).toBe(notice)
  })

  it('leaves the notice empty when every document is ready', async () => {
    replay([
      { type: 'meta', conversation_id: 'c1', notice: null },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'Answer [1].' },
      { type: 'done', message_id: 'm1' },
    ])

    await useStore.getState().ask('Question?')

    expect(useStore.getState().messages[1].notice).toBeNull()
  })

  it('tracks the conversation id so later turns stay in the same thread', async () => {
    replay([
      { type: 'meta', conversation_id: 'conv-42' },
      { type: 'sources', sources: [] },
      { type: 'delta', text: 'Hello.' },
      { type: 'done', message_id: 'm1' },
    ])

    await useStore.getState().ask('Hi')

    expect(useStore.getState().currentConversationId).toBe('conv-42')
  })
})

describe('streaming failures', () => {
  it('marks the message as an error with a retry affordance', async () => {
    const failure = Object.assign(new Error('The answer service is unavailable right now. Please try again.'), {
      status: 502,
    })
    replay([
      { type: 'meta', conversation_id: 'c1' },
      { type: 'error', error: failure, info: { partial: false } },
    ])

    await useStore.getState().ask('Question?')

    const state = useStore.getState()
    const answer = state.messages[1]
    expect(answer.isError).toBe(true)
    expect(answer.streaming).toBe(false)
    expect(answer.errorMessage).toMatch(/answer service is unavailable/i)
    expect(answer.retryQuestion).toBe('Question?')
    expect(state.isStreaming).toBe(false)
  })

  it('keeps the partial answer when the stream dies mid-flight', async () => {
    const failure = Object.assign(new Error('The answer service took too long to respond. Please try again.'), {
      status: 502,
    })
    replay([
      { type: 'meta', conversation_id: 'c1' },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'The methodology uses ' },
      { type: 'error', error: failure, info: { partial: true } },
    ])

    await useStore.getState().ask('What is the methodology?')

    const answer = useStore.getState().messages[1]
    expect(answer.content).toBe('The methodology uses ')
    // Partial text is still useful, so it is not blanked out as a hard error.
    expect(answer.isError).toBe(false)
  })

  it('regenerating drops the previous answer instead of appending a second one', async () => {
    useStore.setState({
      currentConversationId: 'c1',
      messages: [
        { id: 'u1', role: 'user', content: 'What is the methodology?' },
        { id: 'a1', role: 'assistant', content: 'An older answer.' },
      ],
    })
    replay([
      { type: 'meta', conversation_id: 'c1' },
      { type: 'sources', sources: SOURCES },
      { type: 'delta', text: 'A better answer [1].' },
      { type: 'done', message_id: 'a2' },
    ])

    await useStore.getState().ask(null, { regenerate: true })

    const { messages } = useStore.getState()
    expect(messages).toHaveLength(2)
    expect(messages[1].content).toBe('A better answer [1].')
    expect(messages.filter((m) => m.role === 'assistant')).toHaveLength(1)
  })
})
