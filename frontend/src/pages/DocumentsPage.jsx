/**
 * pages/DocumentsPage.jsx
 *
 * Document management: upload, list, delete PDFs.
 */

import { useEffect, useState } from 'react'
import { FileText, Trash2, Plus, Clock, Hash, HardDrive, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useStore } from '../store'
import UploadZone from '../components/documents/UploadZone'
import Topbar from '../components/layout/Topbar'
import clsx from 'clsx'

function formatBytes(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_BADGE = {
  ready:      { icon: <CheckCircle size={12} />,  text: 'Ready',      color: 'text-green-400 bg-green-400/10' },
  processing: { icon: <Loader2 size={12} className="animate-spin" />, text: 'Processing', color: 'text-yellow-400 bg-yellow-400/10' },
  error:      { icon: <AlertCircle size={12} />,  text: 'Error',      color: 'text-red-400 bg-red-400/10' },
}

function DocumentCard({ doc, onDelete }) {
  const badge = STATUS_BADGE[doc.status] || STATUS_BADGE.processing

  return (
    <div className="group bg-bg-card border border-bg-border rounded-card p-5 hover:border-accent-purple/30
                    transition-all duration-200 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent-purpleDim flex items-center justify-center flex-shrink-0">
            <FileText size={17} className="text-accent-purpleLight" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{doc.name}</p>
            <span className="text-xs text-text-muted">{doc.collection}</span>
          </div>
        </div>
        <span className={clsx('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0', badge.color)}>
          {badge.icon} {badge.text}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: HardDrive, label: 'Size', value: formatBytes(doc.file_size) },
          { icon: Hash,      label: 'Chunks', value: doc.chunk_count ?? '—' },
          { icon: Clock,     label: 'Pages', value: doc.page_count ?? '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-bg-hover rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon size={11} className="text-text-muted" />
              <span className="text-xs text-text-muted">{label}</span>
            </div>
            <p className="text-sm font-medium text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-bg-border">
        <span className="text-xs text-text-muted">Added {formatDate(doc.created_at)}</span>
        <button
          onClick={() => onDelete(doc.id, doc.name)}
          className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400
                     transition-all flex items-center gap-1 text-xs"
        >
          <Trash2 size={13} /> Delete
        </button>
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const { documents, loadDocuments, deleteDocument } = useStore()
  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { loadDocuments() }, [])

  const filtered = documents.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.collection.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Documents" />
      <div className="flex-1 overflow-y-auto p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="flex-1 max-w-xs bg-bg-card border border-bg-border rounded-input px-4 py-2
                       text-sm text-text-primary placeholder-text-muted outline-none
                       focus:border-accent-purple/50 transition-colors"
          />
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-violet-600
                       text-white text-sm rounded-input transition-colors"
          >
            <Plus size={15} /> Upload PDF
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Documents', value: documents.length },
            { label: 'Ready', value: documents.filter(d => d.status === 'ready').length },
            { label: 'Total Chunks', value: documents.reduce((s, d) => s + (d.chunk_count || 0), 0) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bg-card border border-bg-border rounded-card px-5 py-4">
              <p className="text-xs text-text-muted">{label}</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Document grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <FileText size={40} className="text-text-muted opacity-30" />
            <p className="text-text-secondary text-sm">
              {search ? 'No documents match your search' : 'No documents yet — upload your first PDF'}
            </p>
            {!search && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-purpleDim text-accent-purpleLight
                           rounded-input text-sm hover:bg-accent-purple hover:text-white transition-colors"
              >
                <Plus size={15} /> Upload PDF
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={deleteDocument}
              />
            ))}
          </div>
        )}
      </div>

      {showUpload && <UploadZone onClose={() => { setShowUpload(false); loadDocuments() }} />}
    </div>
  )
}
