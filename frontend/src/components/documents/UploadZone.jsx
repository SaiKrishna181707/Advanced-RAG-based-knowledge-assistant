/**
 * components/documents/UploadZone.jsx
 *
 * Drag-and-drop PDF upload area.
 * Uses react-dropzone for drag handling.
 */

import { useDropzone } from 'react-dropzone'
import { Upload, FileText, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '../../store'
import clsx from 'clsx'

export default function UploadZone({ onClose }) {
  const [collection, setCollection] = useState('General')
  const { uploadDocument, isUploading, uploadProgress } = useStore()

  const onDrop = async (acceptedFiles) => {
    if (!acceptedFiles.length) return
    for (const file of acceptedFiles) {
      try {
        await uploadDocument(file, collection)
      } catch (e) {
        // error toast handled in store
      }
    }
    if (onClose) onClose()
  }

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,  // 50 MB
    multiple: true,
    disabled: isUploading,
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-bg-border rounded-2xl p-6 w-full max-w-md animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Upload Documents</h2>
          {!isUploading && (
            <button onClick={onClose} className="text-text-muted hover:text-text-primary">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Collection selector */}
        <div className="mb-4">
          <label className="text-xs text-text-muted mb-1.5 block">Collection</label>
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="w-full bg-bg-hover border border-bg-border rounded-input px-3 py-2
                       text-sm text-text-primary outline-none focus:border-accent-purple/50"
            disabled={isUploading}
          >
            <option>General</option>
            <option>Research Papers</option>
            <option>DSA Notes</option>
            <option>Machine Learning</option>
            <option>Company Policies</option>
          </select>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={clsx(
            'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all',
            isDragActive
              ? 'border-accent-purple bg-accent-purpleDim'
              : 'border-bg-border hover:border-accent-purple/50 hover:bg-bg-hover',
            isUploading && 'cursor-not-allowed opacity-60'
          )}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={32} className="text-accent-purpleLight animate-spin" />
              <p className="text-sm text-text-primary">Processing PDF…</p>
              <div className="w-full bg-bg-hover rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-accent-purple transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-text-muted">{uploadProgress}% uploaded</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload size={32} className="text-text-muted" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {isDragActive ? 'Drop PDFs here' : 'Drag & drop PDFs here'}
                </p>
                <p className="text-xs text-text-muted mt-1">or click to browse · Max 50MB per file</p>
              </div>
            </div>
          )}
        </div>

        {/* Selected files preview */}
        {acceptedFiles.length > 0 && !isUploading && (
          <div className="mt-3 space-y-1">
            {acceptedFiles.map((f) => (
              <div key={f.name} className="flex items-center gap-2 text-xs text-text-secondary bg-bg-hover rounded-lg px-3 py-2">
                <FileText size={12} className="text-accent-purpleLight" />
                <span className="truncate">{f.name}</span>
                <span className="ml-auto text-text-muted">{(f.size / 1024).toFixed(0)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
