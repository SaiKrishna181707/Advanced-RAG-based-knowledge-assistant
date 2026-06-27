// pages/SettingsPage.jsx
import Topbar from '../components/layout/Topbar'

const CONFIG_ROWS = [
  { label: 'LLM Model',        value: 'llama-3.3-70b-versatile', note: 'via Groq API' },
  { label: 'Embedding Model',  value: 'all-MiniLM-L6-v2',        note: '384 dimensions, runs locally' },
  { label: 'Chunk Size',       value: '500 characters',           note: 'Configurable in .env' },
  { label: 'Chunk Overlap',    value: '50 characters',            note: 'Prevents context loss at boundaries' },
  { label: 'Retrieval Top-K',  value: '5 chunks',                 note: 'Sent as context to LLM' },
  { label: 'Search Strategy',  value: 'Hybrid (Dense + BM25)',    note: 'Reciprocal Rank Fusion' },
  { label: 'Temperature',      value: '0.1',                      note: 'Low = more factual answers' },
  { label: 'Vector Store',     value: 'FAISS (IndexFlatL2)',       note: 'Persisted to disk' },
  { label: 'Database',         value: 'SQLite',                   note: 'rag_assistant.db' },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <div className="bg-bg-card border border-bg-border rounded-card overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-bg-border">
              <h3 className="text-sm font-medium text-text-primary">Current Configuration</h3>
              <p className="text-xs text-text-muted mt-0.5">To change these, edit the <code className="text-accent-purpleLight">.env</code> file and restart the backend</p>
            </div>
            <div className="divide-y divide-bg-border">
              {CONFIG_ROWS.map(({ label, value, note }) => (
                <div key={label} className="flex items-start justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm text-text-primary">{label}</p>
                    {note && <p className="text-xs text-text-muted mt-0.5">{note}</p>}
                  </div>
                  <span className="text-sm font-mono text-accent-purpleLight bg-accent-purpleDim
                                   px-2 py-0.5 rounded text-right ml-4 flex-shrink-0">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-text-muted px-1">
            Full configuration support (UI-based model switching, chunk size sliders) is planned for a future release.
          </p>
        </div>
      </div>
    </div>
  )
}
