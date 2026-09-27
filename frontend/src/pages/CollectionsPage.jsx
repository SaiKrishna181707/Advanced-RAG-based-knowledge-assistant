/**
 * Collections — the knowledge spaces a user organises documents into.
 * A collection can be chatted with or searched on its own.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderPlus,
  FolderTree,
  MessageSquare,
  Pencil,
  Search,
  Trash2,
} from 'lucide-react'
import { Button, Card, SectionHeader } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useStore } from '../store'
import { formatBytes, relativeTime } from '../lib/format'

const COLORS = ['#0d7d70', '#2563eb', '#7c3aed', '#c2410c', '#be123c', '#0f766e', '#4d7c0f']

const EMPTY_FORM = { name: '', description: '', color: COLORS[0] }

export default function CollectionsPage() {
  const navigate = useNavigate()
  const collections = useStore((state) => state.collections)
  const unfiled = useStore((state) => state.unfiledDocuments)
  const loading = useStore((state) => state.collectionsLoading)
  const loadCollections = useStore((state) => state.loadCollections)
  const createCollection = useStore((state) => state.createCollection)
  const updateCollection = useStore((state) => state.updateCollection)
  const deleteCollection = useStore((state) => state.deleteCollection)
  const setScope = useStore((state) => state.setScope)
  const newConversation = useStore((state) => state.newConversation)
  const addToast = useStore((state) => state.addToast)

  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    loadCollections()
  }, [loadCollections])

  const openCreate = () => {
    setEditing('new')
    setForm(EMPTY_FORM)
    setError(null)
  }

  const openEdit = (collection) => {
    setEditing(collection.id)
    setForm({
      name: collection.name || '',
      description: collection.description || '',
      color: collection.color || COLORS[0],
    })
    setError(null)
  }

  const submit = async (event) => {
    event.preventDefault()
    if (form.name.trim().length < 1) {
      setError('Give the collection a name.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (editing === 'new') {
        await createCollection({
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
        })
      } else {
        await updateCollection(editing, {
          name: form.name.trim(),
          description: form.description.trim(),
          color: form.color,
        })
        addToast('Collection updated.', 'success')
      }
      setEditing(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const chatWith = (collection) => {
    newConversation()
    setScope({ mode: 'collection', collection_id: collection.id, document_ids: [] })
    navigate('/app/chat')
  }

  const searchIn = (collection) => {
    navigate(`/app/search?collection=${collection.id}`)
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Collections"
        description="Separate knowledge spaces. Scope a conversation or a search to one of them."
        actions={
          <Button variant="primary" icon={FolderPlus} onClick={openCreate}>
            New collection
          </Button>
        }
      />

      {unfiled > 0 && (
        <p className="rounded-card border border-line bg-raised/60 px-4 py-3 text-xs text-muted">
          {unfiled} document{unfiled === 1 ? '' : 's'} are not in a collection. You can still search
          and chat across them — file them to keep things organised.
        </p>
      )}

      {loading && !collections.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <div key={index} className="skeleton h-40 rounded-card" />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No collections yet"
          description="Group related documents — Research Papers, College Notes, Projects — so retrieval can be scoped to a subject."
          action={
            <Button variant="primary" icon={FolderPlus} onClick={openCreate}>
              Create your first collection
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <li key={collection.id}>
              <Card className="flex h-full flex-col p-4">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-lg"
                    style={{ backgroundColor: `${collection.color}22`, border: `1px solid ${collection.color}66` }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-ink" title={collection.name}>
                      {collection.name}
                    </h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                      {collection.description || 'No description'}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                  <div>
                    <dt className="text-2xs text-muted">Documents</dt>
                    <dd className="text-sm font-medium tabular-nums text-ink">{collection.document_count}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs text-muted">Chunks</dt>
                    <dd className="text-sm font-medium tabular-nums text-ink">{collection.chunk_count}</dd>
                  </div>
                  <div>
                    <dt className="text-2xs text-muted">Storage</dt>
                    <dd className="text-sm font-medium tabular-nums text-ink">
                      {formatBytes(collection.storage_bytes)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-2xs text-muted">
                  Created {relativeTime(collection.created_at)}
                </p>

                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-line pt-3">
                  <Button size="sm" variant="secondary" icon={MessageSquare} onClick={() => chatWith(collection)}>
                    Chat
                  </Button>
                  <Button size="sm" variant="ghost" icon={Search} onClick={() => searchIn(collection)}>
                    Search
                  </Button>
                  <span className="ml-auto flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(collection)}
                      aria-label={`Rename ${collection.name}`}
                      className="rounded-input p-1.5 text-muted hover:bg-raised hover:text-ink"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(collection)}
                      aria-label={`Delete ${collection.name}`}
                      className="rounded-input p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New collection' : 'Edit collection'}
        description="A collection is a scope you can chat and search within."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} loading={busy}>
              {editing === 'new' ? 'Create collection' : 'Save changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-input border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div>
            <label htmlFor="collection-name" className="label">
              Name
            </label>
            <input
              id="collection-name"
              className="input"
              value={form.name}
              maxLength={80}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Research Papers"
            />
          </div>

          <div>
            <label htmlFor="collection-description" className="label">
              Description <span className="text-muted/70">(optional)</span>
            </label>
            <textarea
              id="collection-description"
              className="input min-h-[4.5rem] resize-y"
              maxLength={300}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Papers I cite in the literature review."
            />
          </div>

          <fieldset>
            <legend className="label">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, color }))}
                  aria-label={`Use colour ${color}`}
                  aria-pressed={form.color === color}
                  className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: color,
                    borderColor: form.color === color ? 'rgb(var(--ink))' : 'transparent',
                  }}
                />
              ))}
            </div>
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          await deleteCollection(deleting.id)
          setDeleting(null)
        }}
        title="Delete this collection?"
        description={`${deleting?.name} — its ${deleting?.document_count ?? 0} document(s) will be kept and become unfiled.`}
        confirmLabel="Delete collection"
      />
    </div>
  )
}