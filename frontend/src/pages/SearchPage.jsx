/**
 * Knowledge search: semantic, keyword or hybrid retrieval with filters.
 * Every result shows document, location, snippet, relevance and collection.
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileText, Gauge, Search as SearchIcon, SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'
import { Badge, Button, Card, SectionHeader } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import SourcePanel from '../components/SourcePanel'
import { searchAPI } from '../api/client'
import { useStore } from '../store'
import { locationLabel } from '../lib/format'

const MODES = [
  { value: 'hybrid', label: 'Hybrid', detail: 'Semantic and keyword, fused' },
  { value: 'semantic', label: 'Semantic', detail: 'Vector similarity' },
  { value: 'keyword', label: 'Keyword', detail: 'BM25 term matching' },
]

function highlight(snippet, query) {
  if (!snippet || !query) return snippet
  const terms = query
    .split(/\s+/)
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .filter((term) => term.length > 2)
  if (!terms.length) return snippet
  const pattern = new RegExp(`(${terms.join('|')})`, 'gi')
  return String(snippet)
    .split(pattern)
    .map((part, index) =>
      index % 2 === 1 ? (
        <mark key={`${part}-${index}`} className="rounded bg-accent/20 px-0.5 text-ink">
          {part}
        </mark>
      ) : (
        part
      ),
    )
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams()
  const collections = useStore((state) => state.collections)
  const documents = useStore((state) => state.documents)
  const loadCollections = useStore((state) => state.loadCollections)
  const loadDocuments = useStore((state) => state.loadDocuments)

  const [query, setQuery] = useState('')
  const [mode, setMode] = useState('hybrid')
  const [collectionId, setCollectionId] = useState(params.get('collection') || '')
  const [documentIds, setDocumentIds] = useState([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [topK, setTopK] = useState(10)
  const [showFilters, setShowFilters] = useState(Boolean(params.get('collection')))

  const [results, setResults] = useState(null)
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [openSource, setOpenSource] = useState(null)

  useEffect(() => {
    loadCollections()
    loadDocuments()
  }, [loadCollections, loadDocuments])

  const readyDocuments = useMemo(
    () => documents.filter((item) => item.status === 'ready'),
    [documents],
  )

  const runSearch = async (event) => {
    if (event) event.preventDefault()
    const text = query.trim()
    if (text.length < 2) {
      setError('Enter at least two characters to search.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await searchAPI.search({
        query: text,
        mode,
        top_k: Number(topK) || 10,
        ...(collectionId ? { collection_id: collectionId } : {}),
        ...(documentIds.length ? { document_ids: documentIds } : {}),
        ...(dateFrom ? { date_from: dateFrom } : {}),
        ...(dateTo ? { date_to: dateTo } : {}),
        ...(pageNumber ? { page_number: Number(pageNumber) } : {}),
      })
      setResults(data.results || [])
      setMeta({ count: data.count, latency_ms: data.latency_ms, mode: data.mode })
    } catch (err) {
      setError(err.message)
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setCollectionId('')
    setDocumentIds([])
    setDateFrom('')
    setDateTo('')
    setPageNumber('')
    setParams({}, { replace: true })
  }

  const filtersActive = Boolean(collectionId || documentIds.length || dateFrom || dateTo || pageNumber)

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Search"
        description="Find the passage, not just the document. Results are the same units the assistant reads."
      />

      <Card className="p-4">
        <form onSubmit={runSearch} className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <SearchIcon
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
              <label htmlFor="search-query" className="sr-only">
                Search your knowledge base
              </label>
              <input
                id="search-query"
                type="search"
                className="input pl-9"
                placeholder="What are you looking for?"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" loading={loading}>
              Search
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <fieldset className="flex flex-wrap items-center gap-1">
              <legend className="sr-only">Search mode</legend>
              {MODES.map((item) => (
                <label
                  key={item.value}
                  title={item.detail}
                  className={clsx(
                    'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    mode === item.value
                      ? 'border-accent/50 bg-accent/12 text-accent-ink'
                      : 'border-line text-muted hover:text-ink',
                  )}
                >
                  <input
                    type="radio"
                    name="search-mode"
                    value={item.value}
                    checked={mode === item.value}
                    onChange={() => setMode(item.value)}
                    className="sr-only"
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>

            <Button
              variant="ghost"
              size="sm"
              icon={SlidersHorizontal}
              aria-expanded={showFilters}
              onClick={() => setShowFilters((value) => !value)}
            >
              Filters
              {filtersActive && <Badge tone="accent">active</Badge>}
            </Button>
          </div>

          {showFilters && (
            <div className="grid gap-3 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="filter-collection" className="label">
                  Collection
                </label>
                <select
                  id="filter-collection"
                  className="input"
                  value={collectionId}
                  onChange={(event) => setCollectionId(event.target.value)}
                >
                  <option value="">All collections</option>
                  {collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="filter-page" className="label">
                  Page number
                </label>
                <input
                  id="filter-page"
                  type="number"
                  min="0"
                  className="input"
                  value={pageNumber}
                  onChange={(event) => setPageNumber(event.target.value)}
                  placeholder="Any page"
                />
              </div>

              <div>
                <label htmlFor="filter-from" className="label">
                  Uploaded after
                </label>
                <input
                  id="filter-from"
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="filter-to" className="label">
                  Uploaded before
                </label>
                <input
                  id="filter-to"
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="filter-documents" className="label">
                  Limit to documents <span className="text-muted/70">(optional)</span>
                </label>
                <select
                  id="filter-documents"
                  multiple
                  size={4}
                  className="input h-auto"
                  value={documentIds}
                  onChange={(event) =>
                    setDocumentIds(Array.from(event.target.selectedOptions).map((option) => option.value))
                  }
                >
                  {readyDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-2xs text-muted">
                  Hold Ctrl (or Cmd) to select more than one.
                </p>
              </div>

              <div>
                <label htmlFor="filter-topk" className="label">
                  Results
                </label>
                <select
                  id="filter-topk"
                  className="input"
                  value={topK}
                  onChange={(event) => setTopK(event.target.value)}
                >
                  {[5, 10, 15, 20, 25].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              {filtersActive && (
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>
                    Clear filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </form>
      </Card>

      {error && (
        <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {meta && !error && (
        <p className="text-xs text-muted">
          {meta.count} result{meta.count === 1 ? '' : 's'} · {meta.mode} retrieval ·{' '}
          <span className="tabular-nums">{meta.latency_ms} ms</span>
        </p>
      )}

      {results === null && !error && (
        <EmptyState
          icon={SearchIcon}
          title="Search across your knowledge base"
          description="Results are retrieved passages with their document, location and relevance — click any result to read the stored text."
        />
      )}

      {results !== null && results.length === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="No passages matched"
          description="Try different words, switch to keyword mode, or widen the filters."
        />
      )}

      {results && results.length > 0 && (
        <ol className="space-y-3">
          {results.map((result) => (
            <li key={result.chunk_id}>
              <Card interactive className="w-full p-4 text-left">
                <button
                  type="button"
                  onClick={() => setOpenSource(result)}
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-ink">
                      <FileText aria-hidden="true" className="h-3.5 w-3.5 text-muted" />
                      {result.document_name}
                    </span>
                    {locationLabel('page', result.page_number) && (
                      <span className="chip">{locationLabel('page', result.page_number)}</span>
                    )}
                    {result.collection_name && <span className="chip">{result.collection_name}</span>}
                    <span className="ml-auto flex items-center gap-1.5 text-2xs text-muted">
                      <Gauge aria-hidden="true" className="h-3 w-3" />
                      <span className="tabular-nums">
                        relevance {typeof result.relevance === 'number' ? result.relevance.toFixed(2) : '—'}
                      </span>
                    </span>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-muted">
                    {highlight(result.snippet || result.content, query)}
                  </p>
                </button>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <SourcePanel open={Boolean(openSource)} source={openSource} onClose={() => setOpenSource(null)} />
    </div>
  )
}