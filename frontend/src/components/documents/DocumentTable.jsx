/**
 * Documents table.
 *
 * Rows are selectable so documents can be moved between collections in bulk. The
 * table scrolls horizontally on narrow screens rather than collapsing, because
 * the columns are the point.
 */
import { Fragment, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Trash2,
  FolderInput,
} from 'lucide-react'
import clsx from 'clsx'
import { Badge } from '../ui/Primitives'
import { formatBytes, formatDate, relativeTime } from '../../lib/format'
import EmptyState from '../ui/EmptyState'

const STATUS_TONE = {
  ready: 'positive',
  failed: 'danger',
  uploading: 'caution',
  processing: 'caution',
  indexing: 'caution',
}

function StatusCell({ document }) {
  const tone = STATUS_TONE[document.status] || 'neutral'
  const Icon =
    document.status === 'ready'
      ? CheckCircle2
      : document.status === 'failed'
        ? AlertCircle
        : Loader2
  return (
    <Badge tone={tone}>
      <Icon
        aria-hidden="true"
        className={clsx('h-3 w-3', ['processing', 'uploading', 'indexing'].includes(document.status) && 'animate-spin')}
      />
      {document.status}
    </Badge>
  )
}

function RowMenu({ document, onView, onDelete, onMove }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${document.name}`}
        className="rounded-input p-1.5 text-muted transition-colors hover:bg-raised hover:text-ink"
      >
        <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-lifted"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onView(document)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-raised"
            >
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
              View document
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onMove(document)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-raised"
            >
              <FolderInput aria-hidden="true" className="h-3.5 w-3.5" />
              Move to collection
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onDelete(document)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function DocumentTable({
  documents,
  collections = [],
  selected,
  onToggle,
  onToggleAll,
  onView,
  onDelete,
  onMove,
  emptyAction,
}) {
  if (!documents.length) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents here yet"
        description="Upload a PDF, text file, Markdown, DOCX or CSV to start building your knowledge base."
        action={emptyAction}
      />
    )
  }

  const collectionName = (id) => collections.find((item) => item.id === id)?.name || null
  const allSelected = documents.length > 0 && selected.size === documents.length

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] border-collapse text-sm">
          <caption className="sr-only">Your documents</caption>
          <thead>
            <tr className="border-b border-line bg-raised/60 text-left">
              <th scope="col" className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => onToggleAll?.(documents.map((item) => item.id))}
                  aria-label="Select all documents"
                  className="accent-[rgb(var(--accent))]"
                />
              </th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Document</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Collection</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Pages</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Chunks</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Size</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Status</th>
              <th scope="col" className="px-3 py-2.5 text-xs font-medium text-muted">Uploaded</th>
              <th scope="col" className="w-12 px-3 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <Fragment key={document.id}>
                <tr className="border-b border-line/70 last:border-b-0 hover:bg-raised/40">
                  <td className="px-3 py-3 align-top">
                    <input
                      type="checkbox"
                      checked={selected.has(document.id)}
                      onChange={() => onToggle?.(document.id)}
                      aria-label={`Select ${document.name}`}
                      className="mt-0.5 accent-[rgb(var(--accent))]"
                    />
                  </td>
                  <td className="max-w-[20rem] px-3 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => onView(document)}
                      className="block max-w-full truncate text-left font-medium text-ink hover:text-accent-ink hover:underline"
                      title={document.name}
                    >
                      {document.name}
                    </button>
                    <span className="text-2xs uppercase text-muted">{document.extension}</span>
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    {collectionName(document.collection_id) || (
                      <span className="text-muted/70">Unfiled</span>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top tabular-nums text-muted">
                    {document.page_count ?? '—'}
                  </td>
                  <td className="px-3 py-3 align-top tabular-nums text-muted">
                    {document.chunk_count ?? 0}
                  </td>
                  <td className="px-3 py-3 align-top tabular-nums text-muted">
                    {formatBytes(document.file_size)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <StatusCell document={document} />
                  </td>
                  <td className="px-3 py-3 align-top text-muted">
                    <span title={formatDate(document.created_at, { withTime: true })}>
                      {relativeTime(document.created_at)}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <RowMenu
                      document={document}
                      onView={onView}
                      onDelete={onDelete}
                      onMove={onMove}
                    />
                  </td>
                </tr>
                {document.status === 'failed' && document.error_message && (
                  <tr className="border-b border-line/70 bg-danger/5">
                    <td />
                    <td colSpan={8} className="px-3 pb-3 text-xs text-danger">
                      {document.error_message}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}