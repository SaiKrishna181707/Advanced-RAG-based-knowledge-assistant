import { Brain, User } from 'lucide-react'

export default function Topbar({ title = 'Advanced RAG Knowledge Assistant' }) {
  return (
    <header className="h-14 border-b border-bg-border bg-bg-secondary flex items-center px-6 justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-medium text-text-primary">{title}</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-accent-purpleDim text-accent-purpleLight border border-accent-purple/30">
          llama-3.3-70b
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-text-muted">Powered by Groq</span>
        <div className="w-8 h-8 rounded-full bg-bg-hover border border-bg-border flex items-center justify-center">
          <User size={15} className="text-text-secondary" />
        </div>
      </div>
    </header>
  )
}
