/**
 * Document inspector: metadata, extracted text by page/section, chunks and — for
 * PDFs — the original file rendered from an authenticated blob URL.
 *
 * The blob is fetched with the bearer token rather than embedded as a URL, so the
 * file endpoint never has to accept a token in a query string.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, FileText, Layers, Loader2, ScanLine } from 'lucide-react'
import clsx from 'clsx'
import Modal from './ui/Modal'
import { Badge, Spinner } from './ui/Primitives'
import { documentsAPI } from '../api/client'
import { formatBytes, formatDate, formatDuration, locationLabel } from '../lib/format'

const TABS = [
  { key: 'overview', label: 'Overview', icon: ScanLine },
  { key: 'text', label: 'Extracted text', icon: FileText },
  { key: 'chunks', label: 'Chunks', icon: Layers },
]

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-b-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-right text-sm text-ink">{value ?? '—'}</dd>
    </div>
  )
}

export default function DocumentViewer({ open, document: doc, onClose }) {
  const [tab, setTab] = useState('overview')
  const [content, setContent] = useState(null)
  const [chunks, setChunks] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fileUrl, setFileUrl] = useState(null)
  const [fileError, setFileError] = useState(null)
  const urlsRef = useRef([])

  const isPdf = doc?.extension === 'pdf'

  useEffect(() => {
    if (!open) {
      setTab('overview')
      setContent(null)
      setChunks(null)
      setError(null)
      setFileUrl(null)
      setFileError(null)
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
      return undefined
    }

    let active = true
    setLoading(true)
    setError(null)
    Promise.all([documentsAPI.content(doc.id), documentsAPI.chunks(doc.id)])
      .then(([contentData, chunkData]) => {
        if (!active) return
        setContent(contentData)
        setChunks(chunkData)
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
  }, [open, doc?.id])

  useEffect(() => {
    if (!open || !isPdf) return undefined
    let active = true
    documentsAPI
      .fetchFile(doc.id)
      .then((blob) => {
        if (!active) return
        const url = URL.createObjectURL(blob)
        urlsRef.current.push(url)
        setFileUrl(url)
      })
      .catch((err) => {
        if (active) setFileError(err.message)
      })
    return () => {
      active = false
    }
  }, [open, isPdf, doc?.id])

  const pages = content?.pages || []
  const unit = content?.location_unit || 'page'
  const chunkList = chunks?.chunks || []

  const grouped = useMemo(() => {
    if (!chunkList.length) return []
    return chunkList
  }, [chunkList])

  if (!doc) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={doc.name}
      description={`${String(doc.extension || '').toUpperCase()} · ${formatBytes(doc.file_size)} · uploaded ${formatDate(doc.created_at)}`}
    >
      <div role="tablist" aria-label="Document views" className="flex flex-wrap gap-1 border-b border-line pb-3">
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-input px-3 py-1.5 text-sm font-medium transition-colors',
              tab === item.key ? 'bg-accent/12 text-accent-ink' : 'text-muted hover:bg-raised hover:text-ink',
            )}
          >
            <item.icon aria-hidden="true" className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-input border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {tab === 'overview' && (
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Metadata</h3>
            <dl className="mt-2">
              <Row label="Status" value={<Badge tone={doc.status === 'ready' ? 'positive' : doc.status === 'failed' ? 'danger' : 'caution'}>{doc.status}</Badge>} />
              <Row label="Pages" value={doc.page_count} />
              <Row label="Chunks" value={doc.chunk_count} />
              <Row label="Characters" value={content?.char_count?.toLocaleString()} />
              <Row label="MIME type" value={doc.mime_type} />
              <Row label="Extraction" value={doc.extraction_status} />
              <Row label="Indexing" value={doc.indexing_status} />
              <Row label="Processing time" value={formatDuration(doc.processing_time_ms)} />
              <Row label="Checksum" value={<span className="font-mono text-xs">{String(doc.sha256 || '').slice(0, 16)}…</span>} />
            </dl>
            {doc.error_message && (
              <p role="alert" className="mt-3 rounded-input border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {doc.error_message}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              {isPdf ? 'Original file' : 'Original file preview'}
            </h3>
            <div className="mt-2 overflow-hidden rounded-card border border-line bg-raised">
              {isPdf && fileUrl && (
                <iframe src={fileUrl} title={`Preview of ${doc.name}`} className="h-[26rem] w-full" />
              )}
              {isPdf && !fileUrl && !fileError && (
                <p className="flex items-center gap-2 p-6 text-sm text-muted">
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Loading the original PDF…
                </p>
              )}
              {fileError && <p className="p-6 text-sm text-danger">{fileError}</p>}
              {!isPdf && (
                <div className="p-6">
                  <p className="text-sm text-muted">
                    Inline preview is available for PDFs. For this format the extracted text is the
                    reliable view — open the Extracted text tab.
                  </p>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      download={doc.name}
                      className="btn-secondary mt-3 inline-flex"
                    >
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                      Download the original
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'text' && (
        <div className="mt-4">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Rebuilding the extracted text…
            </p>
          )}
          {!loading && pages.length === 0 && (
            <p className="text-sm text-muted">No extracted text is stored for this document.</p>
          )}
          <div className="space-y-4">
            {pages.map((page) => (
              <section key={page.page_number ?? page.index}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {locationLabel(unit, page.page_number) || 'Section'}
                </h3>
                <pre className="mt-1.5 max-h-72 overflow-auto whitespace-pre-wrap rounded-card border border-line bg-raised p-3 font-mono text-xs leading-relaxed text-ink">
                  {page.text || '(no text extracted on this page)'}
                </pre>
              </section>
            ))}
          </div>
        </div>
      )}

      {tab === 'chunks' && (
        <div className="mt-4">
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted">
              <Spinner /> Loading chunks…
            </p>
          )}
          <p className="text-xs text-muted">
            {grouped.length} indexed chunks. These are the units the retriever searches and the model
            receives.
          </p>
          <ol className="mt-3 space-y-3">
            {grouped.map((chunk, index) => (
              <li key={chunk.id} className="rounded-card border border-line p-3">
                <div className="flex flex-wrap items-center gap-2 text-2xs text-muted">
                  <span className="font-mono">#{chunk.chunk_index ?? index}</span>
                  {chunk.page_number !== null && chunk.page_number !== undefined && (
                    <span className="chip">{locationLabel(unit, chunk.page_number)}</span>
                  )}
                  <span className="tabular-nums">{chunk.char_count} chars</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink">{chunk.content}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Modal>
  )
}