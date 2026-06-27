/**
 * store/index.js  —  Global State with Zustand
 *
 * What is Zustand?
 *   A minimal state management library. Think of it as a shared "memory" for the app.
 *   Any component can read or update state without passing props everywhere.
 *
 * We store:
 *   - conversations list + current conversation
 *   - documents list
 *   - loading states
 *   - toast notifications
 */

import { create } from 'zustand'
import { chatAPI, documentsAPI } from '../api/client'

export const useStore = create((set, get) => ({

  // ─── Conversations ──────────────────────────────────────
  conversations: [],
  currentConversationId: null,
  messages: [],
  isAsking: false,

  loadConversations: async () => {
    try {
      const { data } = await chatAPI.getConversations()
      set({ conversations: data })
    } catch (e) {
      console.error('Failed to load conversations:', e)
    }
  },

  selectConversation: async (id) => {
    set({ currentConversationId: id, messages: [] })
    try {
      const { data } = await chatAPI.getConversation(id)
      set({ messages: data.messages })
    } catch (e) {
      console.error('Failed to load conversation:', e)
    }
  },

  newConversation: () => {
    set({ currentConversationId: null, messages: [] })
  },

  askQuestion: async (question) => {
    const { currentConversationId, messages } = get()

    // Optimistically add user message to UI immediately
    const userMsg = { id: Date.now(), role: 'user', content: question, created_at: new Date().toISOString() }
    set({ messages: [...messages, userMsg], isAsking: true })

    try {
      const { data } = await chatAPI.ask(question, currentConversationId)

      const assistantMsg = {
        id: data.message_id,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        retrieval_time_ms: data.retrieval_time_ms,
        llm_time_ms: data.llm_time_ms,
        created_at: new Date().toISOString(),
      }

      set((state) => ({
        messages: [...state.messages, assistantMsg],
        currentConversationId: data.conversation_id,
        isAsking: false,
      }))

      // Refresh conversation list (title may have been created)
      get().loadConversations()
    } catch (e) {
      const errMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${e.response?.data?.error || e.message}`,
        isError: true,
        created_at: new Date().toISOString(),
      }
      set((state) => ({
        messages: [...state.messages, errMsg],
        isAsking: false,
      }))
    }
  },

  deleteConversation: async (id) => {
    try {
      await chatAPI.deleteConversation(id)
      set((state) => ({
        conversations: state.conversations.filter(c => c.id !== id),
        currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        messages: state.currentConversationId === id ? [] : state.messages,
      }))
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
  },

  // ─── Documents ──────────────────────────────────────────
  documents: [],
  isUploading: false,
  uploadProgress: 0,

  loadDocuments: async () => {
    try {
      const { data } = await documentsAPI.list()
      set({ documents: data })
    } catch (e) {
      console.error('Failed to load documents:', e)
    }
  },

  uploadDocument: async (file, collection) => {
    set({ isUploading: true, uploadProgress: 0 })
    try {
      const { data } = await documentsAPI.upload(file, collection, (pct) => {
        set({ uploadProgress: pct })
      })
      get().addToast(`"${data.original_name}" uploaded successfully — ${data.chunk_count} chunks`, 'success')
      get().loadDocuments()
      return data
    } catch (e) {
      get().addToast(e.response?.data?.error || 'Upload failed', 'error')
      throw e
    } finally {
      set({ isUploading: false, uploadProgress: 0 })
    }
  },

  deleteDocument: async (id, name) => {
    try {
      await documentsAPI.delete(id)
      set((state) => ({ documents: state.documents.filter(d => d.id !== id) }))
      get().addToast(`"${name}" deleted`, 'success')
    } catch (e) {
      get().addToast('Delete failed', 'error')
    }
  },

  // ─── Toasts ─────────────────────────────────────────────
  toasts: [],

  addToast: (message, type = 'info') => {
    const id = Date.now()
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, 4000)
  },
}))
