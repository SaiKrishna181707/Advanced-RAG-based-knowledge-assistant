/**
 * pages/SearchPage.jsx
 *
 * Dedicated semantic search — shows raw chunks with similarity scores.
 * Useful for debugging retrieval quality.
 */

import { useState } from 'react'
import { Search, FileText, Loader2, Zap } from 'lucide-react'
import { searchAPI } from '../api/client'
import Topbar from '../components/layout/Topbar'
import clsx from 'clsx'

function ScoreBar({ score }) {
  const pct = Math.round(score * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-bg-hover rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-purple rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-accent-purpleLight w-8 text-right">{pct}%</span>
    </div>
  )
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setSearched(true)
    const t0 = Date.now()
    try {
      const { data } = await searchAPI.search(query.trim(), 10)
      setResults(data.results)
      setElapsed(Date.now() - t0)
    } catch (e) {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Semantic Search" />
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Search box */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 flex items-center gap-3 bg-bg-card border border-bg-border
                            rounded-2xl px-4 py-3 focus-within:border-accent-purple/50 transition-colors">
              <Search size={16} className="text-text-muted flex-shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search across all your documents…"
                className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || loading}
              className="px-5 py-3 bg-accent-purple hover:bg-violet-600 disabled:opacity-50
                         text-white text-sm rounded-2xl transition-colors flex items-center gap-2"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
              Search
            </button>
          </div>

          {/* Results */}
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="text-accent-purple animate-spin" />
            </div>
          )}

          {!loading && searched && results.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <Search size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No relevant chunks found. Try a different query or upload more documents.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-text-secondary">
                  {results.length} chunks retrieved
                </p>
                <span className="text-xs text-text-muted">{elapsed}ms</span>
              </div>

              <div className="space-y-3">
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="bg-bg-card border border-bg-border rounded-card p-5 hover:border-accent-purple/30 transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-accent-purpleLight" />
                        <span className="text-xs font-medium text-text-secondary">
                          Doc #{r.document_id} · Page {r.page_number}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">Rank #{i + 1}</span>
                    </div>

                    {/* Content */}
                    <p className="text-sm text-text-primary leading-relaxed mb-3">{r.snippet}</p>

                    {/* Similarity score bar */}
                    <div>
                      <div className="flex justify-between text-xs text-text-muted mb-1">
                        <span>Similarity</span>
                      </div>
                      <ScoreBar score={r.score} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!searched && (
            <div className="text-center py-20">
              <Search size={40} className="mx-auto mb-4 text-text-muted opacity-20" />
              <p className="text-sm text-text-muted">Type a query to search across all uploaded documents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
