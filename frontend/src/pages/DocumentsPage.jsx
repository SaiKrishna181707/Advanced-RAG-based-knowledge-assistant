/**
 * Document management: upload, filter, inspect, move between collections, delete.
 */
import { useEffect, useMemo, useState } from 'react'
import { Filter, FolderInput, Search, Trash2, Upload, X } from 'lucide-react'
import { Button, Card, SectionHeader } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Modal from '../components/ui/Modal'
import UploadZone from '../components/documents/UploadZone'
import UploadProgress from '../components/documents/UploadProgress'
import DocumentTable from '../components/documents/DocumentTable'
import DocumentViewer from '../components/DocumentViewer'
import { useStore } from '../store'
import { pluralize } from '../lib/format'

export default function DocumentsPage() {
  const documents = useStore((state) => state.documents)
  const loading = useStore((state) => state.documentsLoading)
  const loadDocuments = useStore((state) => state.loadDocuments)
  const collections = useStore((state) => state.collections)
  const loadCollections = useStore((state) => state.loadCollections)
  const deleteDocument = useStore((state) => state.deleteDocument)
  const moveDocuments = useStore((state) => state.moveDocuments)
  const addToast = useStore((state) => state.addToast)

  const [showUpload, setShowUpload] = useState(false)
  const [search, setSearch] = useState('')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState(new Set())
  const [viewing, setViewing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [moving, setMoving] = useState(null)
  const [moveTarget, setMoveTarget] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    loadDocuments()
    loadCollections()
  }, [loadDocuments, loadCollections])

  // A newly uploaded document arrives while the user is on this page.
  const uploads = useStore((state) => state.uploads)
  useEffect(() => {
    if (uploads.length) setShowUpload(true)
  }, [uploads.length])

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return documents.filter((document) => {
      if (needle && !document.name.toLowerCase().includes(needle)) return false
      if (collectionFilter === 'unfiled' && document.collection_id) return false
      if (collectionFilter !== 'all' && collectionFilter !== 'unfiled' && document.collection_id !== collectionFilter) {
        return false
      }
      if (statusFilter !== 'all' && document.status !== statusFilter) return false
      return true
    })
  }, [documents, search, collectionFilter, statusFilter])

  const toggle = (id) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = (ids) => {
    setSelected((current) => (current.size === ids.length ? new Set() : new Set(ids)))
  }

  const selectedIds = Array.from(selected)

  const runMove = async () => {
    if (!moveTarget) return
    setBusy(true)
    try {
      await moveDocuments(moveTarget, moving ? [moving.id] : selectedIds)
      setMoving(null)
      setSelected(new Set())
      setMoveTarget('')
    } catch {
      /* the store reported the reason */
    } finally {
      setBusy(false)
    }
  }

  const runDelete = async () => {
    if (!deleting) return
    setBusy(true)
    const ok = await deleteDocument(deleting.id, deleting.name)
    setBusy(false)
    setDeleting(null)
    if (ok) {
      setSelected((current) => {
        const next = new Set(current)
        next.delete(deleting.id)
        return next
      })
    }
  }

  const filtersActive = search || collectionFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Documents"
        description="Everything in your knowledge base, with its processing state and provenance."
        actions={
          <Button
            variant={showUpload ? 'secondary' : 'primary'}
            icon={showUpload ? X : Upload}
            onClick={() => setShowUpload((value) => !value)}
          >
            {showUpload ? 'Hide upload' : 'Upload'}
          </Button>
        }
      />

      {showUpload && (
        <div className="space-y-6">
          <UploadZone />
          <UploadProgress />
        </div>
      )}

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            />
            <label htmlFor="document-search" className="sr-only">
              Search documents by name
            </label>
            <input
              id="document-search"
              type="search"
              className="input pl-8"
              placeholder="Search by name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
            <label htmlFor="collection-filter" className="sr-only">
              Filter by collection
            </label>
            <select
              id="collection-filter"
              className="input w-auto"
              value={collectionFilter}
              onChange={(event) => setCollectionFilter(event.target.value)}
            >
              <option value="all">All collections</option>
              <option value="unfiled">Unfiled</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>

            <label htmlFor="status-filter" className="sr-only">
              Filter by status
            </label>
            <select
              id="status-filter"
              className="input w-auto"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Any status</option>
              <option value="ready">Ready</option>
              <option value="processing">Processing</option>
              <option value="indexing">Indexing</option>
              <option value="uploading">Uploading</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {filtersActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('')
                setCollectionFilter('all')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <span className="text-xs text-muted">{pluralize(selectedIds.length, 'document')} selected</span>
            <Button
              size="sm"
              variant="secondary"
              icon={FolderInput}
              onClick={() => {
                setMoving(null)
                setMoveTarget('')
                setMoving({ bulk: true })
              }}
            >
              Move to collection
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Deselect
            </Button>
          </div>
        )}
      </Card>

      {loading && !documents.length ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-12 rounded-card" />
          ))}
        </div>
      ) : (
        <DocumentTable
          documents={filtered}
          collections={collections}
          selected={selected}
          onToggle={toggle}
          onToggleAll={toggleAll}
          onView={setViewing}
          onDelete={setDeleting}
          onMove={(document) => {
            setMoveTarget('')
            setMoving({ document })
          }}
          emptyAction={
            filtersActive ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setCollectionFilter('all')
                  setStatusFilter('all')
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button variant="primary" size="sm" icon={Upload} onClick={() => setShowUpload(true)}>
                Upload a document
              </Button>
            )
          }
        />
      )}

      <DocumentViewer open={Boolean(viewing)} document={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={runDelete}
        loading={busy}
        title="Delete this document?"
        description={deleting?.name}
        confirmLabel="Delete"
      />

      <Modal
        open={Boolean(moving)}
        onClose={() => setMoving(null)}
        title="Move to a collection"
        description={
          moving?.document
            ? moving.document.name
            : `${pluralize(selectedIds.length, 'document')} will be moved.`
        }
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoving(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={runMove} loading={busy} disabled={!moveTarget}>
              Move
            </Button>
          </>
        }
      >
        {collections.length ? (
          <>
            <label htmlFor="move-target" className="label">
              Collection
            </label>
            <select
              id="move-target"
              className="input"
              value={moveTarget}
              onChange={(event) => setMoveTarget(event.target.value)}
            >
              <option value="">Choose a collection…</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </>
        ) : (
          <EmptyState
            compact
            icon={FolderInput}
            title="No collections yet"
            description="Create a collection first, then documents can be filed into it."
          />
        )}
      </Modal>

      {documents.some((item) => item.status === 'failed') && (
        <p className="flex items-start gap-2 text-xs text-muted">
          <Trash2 aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0" />
          A failed document does not block its own re-upload: uploading the same file again will
          replace the failed record.
        </p>
      )}
    </div>
  )
}