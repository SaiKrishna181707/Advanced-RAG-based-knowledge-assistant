import http from './client'

export const careerAPI = {
  getProfile: () => 
    http.get('/career/profile').then(res => res.data.data),
    
  updateProfile: (payload) => 
    http.put('/career/profile', payload).then(res => res.data.data),
    
  // Resume Endpoints
  getResumes: () => 
    http.get('/career/resumes').then(res => res.data.data),
    
  getResume: (id) => 
    http.get(`/career/resumes/${id}`).then(res => res.data.data),

  getExtraction: (id) =>
    http.get(`/career/resumes/${id}/extraction`).then(res => res.data.data),
    
  uploadResume: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return http.post('/career/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data.data)
  },
  
  deleteResume: (id) => 
    http.delete(`/career/resumes/${id}`).then(res => res.data),
    
  processResume: (id) => 
    http.post(`/career/resumes/${id}/process`).then(res => res.data.data),
    
  importResume: (id, sections) => 
    http.post(`/career/resumes/${id}/import`, { sections }).then(res => res.data.data),
}
