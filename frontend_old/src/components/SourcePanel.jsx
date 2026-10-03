/**
 * Citation inspector.
 *
 * Opens from a numbered citation in an answer. Shows the document, the location,
 * the retrieval score and the exact passage that was handed to the model. The
 * passage text is fetched from the server by chunk id so it is always the stored
 * version rather than a copy held in the browser.
 */
import { useEffect, useState } from 'react'
import { FileText, Gauge, Hash, X } from 'lucide-react'
import { searchAPI } from '../api/client'
import { Badge, Spinner } from './ui/Primitives'
import { locationLabel } from '../lib/format'

export default function SourcePanel({ open, source, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !source?.chunk_id) {
      setDetail(null)
      return undefined
    }
    let active = true
    setLoading(true)
    setError(null)
    searchAPI
      .chunk(source.chunk_id)
      .then((data) => {
        if (active) setDetail(data)
      })
      .catch((err) => {
        if (active) setError(err.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [open, source?.chunk_id])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !source) return null

  const chunk = detail?.chunk
  const documentName = chunk?.document_name || source.document
  const location = locationLabel(source.location_unit, chunk?.page_number ?? source.page)
  const text = chunk?.content || source.content || source.snippet

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label="Source passage">
      <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />

      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-surface shadow-lifted animate-slide-in-right">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted">Source</p>
            <h2 className="mt-1 truncate text-sm font-semibold text-ink" title={documentName}>
              {documentName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close source panel"
            className="rounded-input p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          {source.index ? <Badge tone="accent">Citation {source.index}</Badge> : null}
          {location && (
            <span className="chip">
              <FileText aria-hidden="true" className="h-3 w-3" />
              {location}
            </span>
          )}
          {typeof source.relevance === 'number' && (
            <span className="chip">
              <Gauge aria-hidden="true" className="h-3 w-3" />
              relevance {source.relevance.toFixed(2)}
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && !text && (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Loading the stored passage…
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-input border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {text && (
            <blockquote className="border-l-2 border-accent/50 pl-4 text-sm leading-relaxed text-ink">
              {text}
            </blockquote>
          )}

          {!text && !loading && !error && (
            <p className="text-sm text-muted">
              The stored text for this passage is no longer available. It may have been removed from
              the document since this answer was generated.
            </p>
          )}
        </div>

        <footer className="space-y-1.5 border-t border-line px-5 py-3 text-2xs text-muted">
          {chunk?.chunk_index !== undefined && chunk?.chunk_index !== null && (
            <p className="flex items-center gap-1.5">
              <Hash aria-hidden="true" className="h-3 w-3" />
              Chunk {chunk.chunk_index} of the extracted text
            </p>
          )}
          <p>This is the exact passage the model was given for this citation.</p>
        </footer>
      </aside>
    </div>
  )
}