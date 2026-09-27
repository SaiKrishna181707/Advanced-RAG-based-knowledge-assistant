/**
 * Application state: documents, collections, conversations and the chat stream.
 *
 * Streaming model: the user's question is added optimistically, then an empty
 * assistant message is created and filled in as `delta` events arrive from
 * /api/chat/stream. `stop()` aborts the request; `ask({ regenerate: true })` asks the
 * backend to replace the last answer instead of appending a new turn.
 */
import { create } from 'zustand'
import {
  chatAPI,
  collectionsAPI,
  conversationsAPI,
  documentsAPI,
  meAPI,
} from '../api/client'
import { normalizeCitations } from '../lib/citations'

const DEFAULT_SCOPE = { mode: 'all', collection_id: null, document_ids: [] }

let toastId = 0
let tempId = 0
const nextTempId = () => `temp-${++tempId}`

export const useStore = create((set, get) => ({
  // -------------------------------------------------------------- toasts
  toasts: [],
  addToast: (message, type = 'info', options = {}) => {
    const id = ++toastId
    set((state) => ({ toasts: [...state.toasts, { id, message, type, ...options }] }))
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
      options.duration ?? (type === 'error' ? 7000 : 4000),
    )
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),

  // ----------------------------------------------------------- documents
  documents: [],
  documentsLoading: false,
  documentsError: null,
  uploads: [],
  isUploading: false,

  loadDocuments: async (params = {}) => {
    set({ documentsLoading: true, documentsError: null })
    try {
      const data = await documentsAPI.list(params)
      set({ documents: data.documents || [], documentsLoading: false })
      return data.documents || []
    } catch (error) {
      set({ documentsLoading: false, documentsError: error.message })
      return []
    }
  },

  refreshDocument: async (id) => {
    try {
      const data = await documentsAPI.get(id)
      set((state) => ({
        documents: state.documents.map((item) =>
          item.id === id ? data.document : item,
        ),
      }))
      return data.document
    } catch {
      return null
    }
  },

  deleteDocument: async (id, name) => {
    try {
      await documentsAPI.remove(id)
      set((state) => ({ documents: state.documents.filter((item) => item.id !== id) }))
      get().addToast(`"${name}" deleted.`, 'success')
      return true
    } catch (error) {
      get().addToast(error.message, 'error')
      return false
    }
  },

  updateDocument: async (id, fields) => {
    try {
      const data = await documentsAPI.update(id, fields)
      set((state) => ({
        documents: state.documents.map((item) => (item.id === id ? data.document : item)),
      }))
      return data.document
    } catch (error) {
      get().addToast(error.message, 'error')
      return null
    }
  },

  uploadDocument: async (file, { collectionId = null } = {}) => {
    const key = `${file.name}-${Date.now()}`
    set((state) => ({
      isUploading: true,
      uploads: [...state.uploads, { key, name: file.name, progress: 0, status: 'uploading' }],
    }))

    const patch = (changes) =>
      set((state) => ({
        uploads: state.uploads.map((item) => (item.key === key ? { ...item, ...changes } : item)),
      }))

    try {
      const data = await documentsAPI.upload(file, {
        collectionId,
        onProgress: (percent) => patch({ progress: percent ?? 0 }),
      })
      const document = data.document
      patch({ status: 'processing', progress: 100, id: document.id })
      set((state) => ({ documents: [document, ...state.documents] }))
      get().addToast(`"${document.name}" is being processed.`, 'info')

      get().trackDocument(document.id, key)
      return document
    } catch (error) {
      patch({ status: 'failed', error: error.message })
      get().addToast(error.message, 'error')
      throw error
    } finally {
      set({ isUploading: false })
    }
  },

  /** Poll a freshly uploaded document until processing finishes. */
  trackDocument: async (id, uploadKey = null, { intervalMs = 1200, attempts = 200 } = {}) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
      let snapshot
      try {
        snapshot = await documentsAPI.status(id)
      } catch {
        return null
      }
      set((state) => ({
        documents: state.documents.map((item) =>
          item.id === id
            ? {
                ...item,
                status: snapshot.status,
                stage: snapshot.stage,
                chunk_count: snapshot.chunk_count,
                page_count: snapshot.page_count ?? item.page_count,
                processing_time_ms: snapshot.processing_time_ms,
                error_message: snapshot.error_message,
              }
            : item,
        ),
        uploads: uploadKey
          ? state.uploads.map((item) =>
              item.key === uploadKey
                ? { ...item, status: snapshot.status, error: snapshot.error_message }
                : item,
            )
          : state.uploads,
      }))

      if (snapshot.status === 'ready') {
        get().addToast('Document is ready to search.', 'success')
        if (uploadKey) {
          setTimeout(
            () => set((state) => ({ uploads: state.uploads.filter((item) => item.key !== uploadKey) })),
            2500,
          )
        }
        return snapshot
      }
      if (snapshot.status === 'failed') {
        get().addToast(snapshot.error_message || 'That document could not be processed.', 'error')
        return snapshot
      }
    }
    return null
  },

  clearUploads: () => set({ uploads: [] }),

  // --------------------------------------------------------- collections
  collections: [],
  unfiledDocuments: 0,
  collectionsLoading: false,

  loadCollections: async () => {
    set({ collectionsLoading: true })
    try {
      const data = await collectionsAPI.list()
      set({
        collections: data.collections || [],
        unfiledDocuments: data.unfiled_documents || 0,
        collectionsLoading: false,
      })
      return data.collections || []
    } catch (error) {
      set({ collectionsLoading: false })
      get().addToast(error.message, 'error')
      return []
    }
  },

  createCollection: async (payload) => {
    const data = await collectionsAPI.create(payload)
    set((state) => ({ collections: [...state.collections, data.collection] }))
    get().addToast(`Collection "${data.collection.name}" created.`, 'success')
    return data.collection
  },

  updateCollection: async (id, fields) => {
    const data = await collectionsAPI.update(id, fields)
    set((state) => ({
      collections: state.collections.map((item) => (item.id === id ? data.collection : item)),
    }))
    return data.collection
  },

  deleteCollection: async (id) => {
    await collectionsAPI.remove(id)
    set((state) => ({ collections: state.collections.filter((item) => item.id !== id) }))
    get().loadDocuments()
    get().addToast('Collection deleted.', 'success')
  },

  moveDocuments: async (collectionId, documentIds) => {
    const data = await collectionsAPI.moveDocuments(collectionId, documentIds)
    get().loadDocuments()
    get().loadCollections()
    get().addToast(`Moved ${data.moved} document${data.moved === 1 ? '' : 's'}.`, 'success')
    return data
  },

  // -------------------------------------------------------- conversations
  conversations: [],
  conversationsLoading: false,
  currentConversationId: null,
  messages: [],
  scope: { ...DEFAULT_SCOPE },
  isStreaming: false,
  streamError: null,

  loadConversations: async (params = {}) => {
    set({ conversationsLoading: true })
    try {
      const data = await conversationsAPI.list(params)
      set({ conversations: data.conversations || [], conversationsLoading: false })
      return data.conversations || []
    } catch (error) {
      set({ conversationsLoading: false })
      return []
    }
  },

  selectConversation: async (id) => {
    get().stop()
    set({ currentConversationId: id, messages: [], streamError: null })
    try {
      const data = await conversationsAPI.get(id)
      set({
        messages: data.conversation.messages || [],
        scope: data.conversation.scope || { ...DEFAULT_SCOPE },
      })
    } catch (error) {
      get().addToast(error.message, 'error')
      set({ currentConversationId: null, messages: [] })
    }
  },

  newConversation: () => {
    get().stop()
    set({ currentConversationId: null, messages: [], streamError: null, scope: { ...DEFAULT_SCOPE } })
  },

  renameConversation: async (id, title) => {
    try {
      const data = await conversationsAPI.update(id, { title })
      set((state) => ({
        conversations: state.conversations.map((item) =>
          item.id === id ? data.conversation : item,
        ),
      }))
      return data.conversation
    } catch (error) {
      get().addToast(error.message, 'error')
      return null
    }
  },

  deleteConversation: async (id) => {
    try {
      await conversationsAPI.remove(id)
      set((state) => ({
        conversations: state.conversations.filter((item) => item.id !== id),
        currentConversationId:
          state.currentConversationId === id ? null : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
      }))
      get().addToast('Conversation deleted.', 'success')
    } catch (error) {
      get().addToast(error.message, 'error')
    }
  },

  clearConversation: async (id) => {
    try {
      await conversationsAPI.clear(id)
      set((state) => ({
        messages: state.currentConversationId === id ? [] : state.messages,
        conversations: state.conversations.map((item) =>
          item.id === id ? { ...item, message_count: 0, last_message_preview: '' } : item,
        ),
      }))
      get().addToast('Conversation cleared.', 'success')
    } catch (error) {
      get().addToast(error.message, 'error')
    }
  },

  setScope: (scope) => set({ scope: { ...DEFAULT_SCOPE, ...scope } }),

  setMessageFeedback: (messageId, rating) =>
    set((state) => ({
      messages: state.messages.map((item) =>
        item.id === messageId ? { ...item, feedback: rating } : item,
      ),
    })),

  sendFeedback: async (messageId, rating, comment = null) => {
    const conversationId = get().currentConversationId
    if (!conversationId) return
    const previous = get().messages.find((item) => item.id === messageId)?.feedback
    get().setMessageFeedback(messageId, rating)
    try {
      await conversationsAPI.feedback(conversationId, {
        message_id: messageId,
        rating,
        comment,
      })
      get().addToast('Thanks for the feedback.', 'success')
    } catch (error) {
      get().setMessageFeedback(messageId, previous ?? null)
      get().addToast(error.message, 'error')
    }
  },

  loadFollowups: async (messageId) => {
    try {
      const data = await chatAPI.followups({ message_id: messageId })
      return data.suggestions || []
    } catch {
      return []
    }
  },

  stop: () => {
    const handle = get().streamHandle
    if (handle) handle.abort()
    set({ streamHandle: null, isStreaming: false })
  },

  streamHandle: null,
  followups: {},

  /**
   * Ask a question and stream the answer.
   * Returns a promise that resolves once the stream finishes or fails.
   */
  ask: async (question, { regenerate = false, topK = null } = {}) => {
    const state = get()
    if (state.isStreaming) return

    const conversationId = state.currentConversationId
    const scope = state.scope

    if (!regenerate) {
      set((s) => ({
        messages: [
          ...s.messages,
          { id: nextTempId(), role: 'user', content: question, created_at: new Date().toISOString() },
        ],
        streamError: null,
      }))
    } else {
      // Drop the previous answer; the backend deletes it from history too.
      set((s) => {
        const messages = [...s.messages]
        if (messages.length && messages[messages.length - 1].role === 'assistant') messages.pop()
        return { messages, streamError: null }
      })
    }

    const assistantTempId = nextTempId()
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: assistantTempId,
          role: 'assistant',
          content: '',
          sources: [],
          streaming: true,
          created_at: new Date().toISOString(),
        },
      ],
      isStreaming: true,
    }))

    // Accepts a patch object, or a function of the current message when the new
    // value depends on the previous one (as streaming updates do).
    const patchAssistant = (changes) =>
      set((s) => ({
        messages: s.messages.map((item) =>
          item.id === assistantTempId
            ? { ...item, ...(typeof changes === 'function' ? changes(item) : changes) }
            : item,
        ),
      }))

    await new Promise((resolve) => {
      const handle = chatAPI.stream(
        {
          question: regenerate ? undefined : question,
          conversation_id: conversationId,
          regenerate,
          scope,
          ...(topK ? { top_k: topK } : {}),
        },
        {
          onMeta: (meta) => {
            set({ currentConversationId: meta.conversation_id })
            patchAssistant({
              retrieval_ms: meta.retrieval_ms,
              scope_label: meta.scope_label,
              notice: meta.notice || null,
            })
          },
          onSources: (sources) => patchAssistant({ sources }),
          onDelta: (text) =>
            set((s) => ({
              messages: s.messages.map((item) =>
                item.id === assistantTempId ? { ...item, content: item.content + text } : item,
              ),
            })),
          onDone: (done) => {
            // A full-width citation marker can be split across two deltas, so the
            // finished text is normalised once more here rather than per delta.
            patchAssistant((item) => ({
              content: normalizeCitations(item.content),
            }))
            // Only overwrite what the final event actually carries: `meta`
            // already supplied the retrieval timing, and a missing field in
            // `done` must not wipe a value the UI is already showing.
            patchAssistant((item) => ({
              ...item,
              streaming: false,
              id: done.message_id || assistantTempId,
              ...(done.llm_ms ?? item.llm_ms) !== undefined
                ? { llm_ms: done.llm_ms ?? item.llm_ms }
                : {},
              ...(done.model ?? item.model) !== undefined
                ? { model: done.model ?? item.model }
                : {},
              ...(done.retrieval_ms ?? item.retrieval_ms) !== undefined
                ? { retrieval_ms: done.retrieval_ms ?? item.retrieval_ms }
                : {},
            }))
            set({ isStreaming: false, streamHandle: null })
            get().loadConversations()
            resolve()
          },
          onError: (error, info = {}) => {
            patchAssistant({
              streaming: false,
              isError: !info.partial,
              errorMessage: error.message,
              retryQuestion: regenerate ? null : question,
            })
            set({ isStreaming: false, streamHandle: null, streamError: error.message })
            resolve()
          },
        },
      )
      set({ streamHandle: handle })
    })
  },

  // ------------------------------------------------------------ account
  overview: null,
  overviewLoading: false,
  usage: null,
  preferences: null,
  preferenceOptions: null,

  loadOverview: async () => {
    set({ overviewLoading: true })
    try {
      const data = await meAPI.overview()
      set({ overview: data, usage: data.usage, overviewLoading: false })
      return data
    } catch (error) {
      set({ overviewLoading: false, overviewError: error.message })
      return null
    }
  },

  loadUsage: async () => {
    try {
      const data = await meAPI.usage()
      set({ usage: data.usage })
      return data.usage
    } catch {
      return null
    }
  },

  loadPreferences: async () => {
    try {
      const data = await meAPI.preferences()
      set({ preferences: data.preferences, preferenceOptions: data.options })
      return data
    } catch {
      return null
    }
  },

  savePreferences: async (fields) => {
    const data = await meAPI.updatePreferences(fields)
    set({ preferences: data.preferences })
    return data.preferences
  },

  changePlan: async (plan) => {
    const data = await meAPI.changePlan(plan)
    set({ usage: data.usage })
    get().addToast(`You are now on the ${data.usage.plan_name} plan.`, 'success')
    return data
  },
}))