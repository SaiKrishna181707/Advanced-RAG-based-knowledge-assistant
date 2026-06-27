// pages/CollectionsPage.jsx
import { FolderOpen } from 'lucide-react'
import { useStore } from '../store'
import Topbar from '../components/layout/Topbar'

export default function CollectionsPage() {
  const { documents } = useStore()

  // Group docs by collection
  const collections = documents.reduce((acc, doc) => {
    const col = doc.collection || 'General'
    if (!acc[col]) acc[col] = []
    acc[col].push(doc)
    return acc
  }, {})

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Collections" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(collections).map(([name, docs]) => (
            <div key={name} className="bg-bg-card border border-bg-border rounded-card p-5
                                       hover:border-accent-purple/30 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-accent-purpleDim flex items-center justify-center">
                  <FolderOpen size={17} className="text-accent-purpleLight" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{name}</p>
                  <p className="text-xs text-text-muted">{docs.length} document{docs.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="space-y-1">
                {docs.slice(0, 3).map(d => (
                  <p key={d.id} className="text-xs text-text-secondary truncate">{d.name}</p>
                ))}
                {docs.length > 3 && (
                  <p className="text-xs text-text-muted">+{docs.length - 3} more</p>
                )}
              </div>
            </div>
          ))}
          {Object.keys(collections).length === 0 && (
            <div className="col-span-3 flex flex-col items-center py-24 gap-3">
              <FolderOpen size={40} className="text-text-muted opacity-20" />
              <p className="text-sm text-text-muted">No collections yet. Upload documents to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
