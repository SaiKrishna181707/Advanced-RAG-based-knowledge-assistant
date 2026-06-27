/**
 * api/client.js  —  Centralised API layer
 *
 * All calls to the Flask backend go through this file.
 * If you ever change the backend URL (e.g. for production), you change it here only.
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',          // Vite proxy forwards this to http://localhost:5000/api
  timeout: 60000,           // 60s — LLM calls can take a while
  headers: { 'Content-Type': 'application/json' },
})

// ─── Chat ────────────────────────────────────────────────────
export const chatAPI = {
  ask: (question, conversationId = null) =>
    api.post('/chat/ask', { question, conversation_id: conversationId }),

  getConversations: () => api.get('/chat/conversations'),

  getConversation: (id) => api.get(`/chat/conversations/${id}`),

  createConversation: (title) => api.post('/chat/conversations', { title }),

  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
}

// ─── Documents ───────────────────────────────────────────────
export const documentsAPI = {
  upload: (file, collection = 'General', onProgress) => {
    const form = new FormData()
    form.append('file', file)
    form.append('collection', collection)
    return api.post('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
      },
      timeout: 300000,   // 5 min for large PDFs
    })
  },

  list: () => api.get('/documents/'),

  delete: (id) => api.delete(`/documents/${id}`),

  status: (id) => api.get(`/documents/${id}/status`),
}

// ─── Search ──────────────────────────────────────────────────
export const searchAPI = {
  search: (query, topK = 10) =>
    api.post('/search/', { query, top_k: topK }),
}

// ─── Analytics ───────────────────────────────────────────────
export const analyticsAPI = {
  get: () => api.get('/analytics/'),
}

export default api
