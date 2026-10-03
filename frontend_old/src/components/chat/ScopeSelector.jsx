/**
 * Retrieval scope picker.
 *
 * Controls which part of the knowledge base a question may draw on. Ids are
 * resolved server-side against the owner's records, so the picker only ever
 * offers what the account actually owns.
 */
import { useMemo, useState } from 'react'
import { Check, ChevronDown, Globe2, FolderTree, Files } from 'lucide-react'
import clsx from 'clsx'
import Modal from '../ui/Modal'
import { Button, Badge } from '../ui/Primitives'
import { useStore } from '../../store'

function scopeLabel(scope, collections, documents) {
  if (scope.mode === 'collection') {
    const collection = collections.find((item) => item.id === scope.collection_id)
    return collection?.name || 'Collection'
  }
  if (scope.mode === 'documents') {
    const count = scope.document_ids.length
    if (count === 0) return 'Select documents'
    if (count === 1) {
      const document = documents.find((item) => item.id === scope.document_ids[0])
      return document?.name || '1 document'
    }
    return `${count} documents`
  }
  return 'All Documents'
}

export default function ScopeSelector({ className }) {
  const scope = useStore((state) => state.scope)
  const setScope = useStore((state) => state.setScope)
  const collections = useStore((state) => state.collections)
  const documents = useStore((state) => state.documents)
  const loadCollections = useStore((state) => state.loadCollections)

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(scope.mode)
  const [collectionId, setCollectionId] = useState(scope.collection_id)
  const [documentIds, setDocumentIds] = useState(scope.document_ids)
  const [filter, setFilter] = useState('')

  const readyDocuments = useMemo(
    () => documents.filter((item) => item.status === 'ready'),
    [documents],
  )

  const visibleDocuments = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return readyDocuments
    return readyDocuments.filter((item) => item.name.toLowerCase().includes(needle))
  }, [readyDocuments, filter])

  const openPicker = () => {
    setMode(scope.mode)
    setCollectionId(scope.collection_id)
    setDocumentIds(scope.document_ids)
    setFilter('')
    setOpen(true)
    if (!collections.length) loadCollections()
  }

  const apply = () => {
    if (mode === 'collection') {
      setScope({ mode: 'collection', collection_id: collectionId, document_ids: [] })
    } else if (mode === 'documents') {
      setScope({ mode: 'documents', collection_id: null, document_ids: documentIds })
    } else {
      setScope({ mode: 'all', collection_id: null, document_ids: [] })
    }
    setOpen(false)
  }

  const toggleDocument = (id) => {
    setDocumentIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const disabled =
    (mode === 'collection' && !collectionId) || (mode === 'documents' && documentIds.length === 0)

  const MODES = [
    { key: 'all', icon: Globe2, title: 'All Documents', detail: 'Search across your whole knowledge base.' },
    { key: 'collection', icon: FolderTree, title: 'A collection', detail: 'Restrict retrieval to one knowledge space.' },
    { key: 'documents', icon: Files, title: 'Selected documents', detail: 'Pick the exact files to search.' },
  ]

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        className={clsx('btn-secondary gap-2', className)}
        title="Choose which documents this conversation may search"
      >
        <span className="text-muted">Ask across:</span>
        <span className="max-w-[10rem] truncate font-medium text-ink">
          {scopeLabel(scope, collections, documents)}
        </span>
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Retrieval scope"
        description="Choose what this conversation is allowed to search."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={apply} disabled={disabled}>
              Use this scope
            </Button>
          </>
        }
      >
        <fieldset className="space-y-2">
          <legend className="sr-only">Scope mode</legend>
          {MODES.map((item) => (
            <label
              key={item.key}
              className={clsx(
                'flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors',
                mode === item.key ? 'border-accent/50 bg-accent/5' : 'border-line hover:bg-raised',
              )}
            >
              <input
                type="radio"
                name="scope-mode"
                value={item.key}
                checked={mode === item.key}
                onChange={() => setMode(item.key)}
                className="mt-1 accent-[rgb(var(--accent))]"
              />
              <span className="flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-ink">
                  <item.icon aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
                  {item.title}
                </span>
                <span className="mt-0.5 block text-xs text-muted">{item.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {mode === 'collection' && (
          <div className="mt-4">
            <label htmlFor="scope-collection" className="label">
              Collection
            </label>
            {collections.length ? (
              <select
                id="scope-collection"
                className="input"
                value={collectionId || ''}
                onChange={(event) => setCollectionId(event.target.value || null)}
              >
                <option value="">Choose a collection…</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name} ({collection.document_count})
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted">
                You have not created a collection yet. Create one from the Collections page.
              </p>
            )}
          </div>
        )}

        {mode === 'documents' && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label htmlFor="scope-document-filter" className="label mb-0">
                Documents
              </label>
              <Badge tone={documentIds.length ? 'accent' : 'neutral'}>
                {documentIds.length} selected
              </Badge>
            </div>
            <input
              id="scope-document-filter"
              type="search"
              className="input mt-1.5"
              placeholder="Filter documents…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-input border border-line p-1.5">
              {visibleDocuments.length === 0 && (
                <p className="px-2 py-3 text-sm text-muted">
                  No processed documents match that filter.
                </p>
              )}
              {visibleDocuments.map((document) => {
                const checked = documentIds.includes(document.id)
                return (
                  <label
                    key={document.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm hover:bg-raised"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDocument(document.id)}
                      className="accent-[rgb(var(--accent))]"
                    />
                    <span className="min-w-0 flex-1 truncate text-ink">{document.name}</span>
                    {checked && <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}