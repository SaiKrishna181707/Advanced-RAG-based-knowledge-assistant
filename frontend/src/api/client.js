import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

export const chatAPI = {
  ask: (question, conversationId = null) =>
    api.post('/chat/ask', { question, conversation_id: conversationId }),
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  createConversation: (title) => api.post('/chat/conversations', { title }),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
}

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
      timeout: 300000,
    })
  },
  list: () => api.get('/documents/'),
  delete: (id) => api.delete(`/documents/${id}`),
  status: (id) => api.get(`/documents/${id}/status`),
}

export const searchAPI = {
  search: (query, topK = 10) =>
    api.post('/search/', { query, top_k: topK }),
}

export const analyticsAPI = {
  get: () => api.get('/analytics/'),
}

export default api