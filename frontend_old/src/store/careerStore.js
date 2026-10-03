import { create } from 'zustand'
import { careerAPI } from '../api/career'

export const useCareerStore = create((set, get) => ({
  profile: null,
  profileLoading: false,
  profileError: null,
  
  loadProfile: async () => {
    if (get().profileLoading) return
    set({ profileLoading: true, profileError: null })
    try {
      const profile = await careerAPI.getProfile()
      set({ profile, profileLoading: false })
    } catch (error) {
      set({ profileError: error.message, profileLoading: false })
    }
  },
  
  updateProfile: async (updates) => {
    try {
      const updated = await careerAPI.updateProfile(updates)
      set({ profile: updated })
      return updated
    } catch (error) {
      throw error
    }
  },

  resumes: [],
  resumesLoading: false,
  
  loadResumes: async () => {
    set({ resumesLoading: true })
    try {
      const resumes = await careerAPI.getResumes()
      set({ resumes, resumesLoading: false })
    } catch (error) {
      set({ resumesLoading: false })
      console.error(error)
    }
  },
  
  uploadResume: async (file) => {
    const newResume = await careerAPI.uploadResume(file)
    set((state) => ({ resumes: [newResume, ...state.resumes] }))
    return newResume
  },
  
  processResume: async (id) => {
    // Optimistic update status to processing
    set((state) => ({
      resumes: state.resumes.map(r => r.id === id ? { ...r, processing_status: 'extracting_text', status: 'processing' } : r)
    }))
    try {
      const updated = await careerAPI.processResume(id)
      set((state) => ({
        resumes: state.resumes.map(r => r.id === id ? updated : r)
      }))
      return updated
    } catch (error) {
      // Revert or show failed on error
      set((state) => ({
        resumes: state.resumes.map(r => r.id === id ? { ...r, processing_status: 'failed', status: 'failed' } : r)
      }))
      throw error
    }
  },
  
  deleteResume: async (id) => {
    await careerAPI.deleteResume(id)
    set((state) => ({ resumes: state.resumes.filter(r => r.id !== id) }))
  },

  importResume: async (id, sections) => {
    const updatedProfile = await careerAPI.importResume(id, sections)
    set({ profile: updatedProfile })
    return updatedProfile
  }
}))
