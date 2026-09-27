/**
 * The landing page's centrepiece: a small, self-contained mock of the real
 * workspace, standing in for a wall of feature cards.
 *
 * Three tabs mirror the three surfaces a customer actually uses - chat, search
 * and the document library - and each renders the same shapes the app renders
 * (citation chips, relevance scores, processing states), so the preview cannot
 * drift into promising a UI that does not exist. Everything here is static: no
 * API calls, no invented analytics.
 */
import { useCallback, useRef, useState } from 'react'
import {
  ArrowUp,
  Check,
  FileText,
  FolderOpen,
  MessagesSquare,
  Search,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessagesSquare },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: FileText },
]

const SOURCES = [
  { n: 1, name: 'MIMIC-III-Study.pdf', page: 'Page 7', score: '0.87' },
  { n: 2, name: 'MIMIC-III-Study.pdf', page: 'Page 12', score: '0.74' },
]

const RESULTS = [
  {
    name: 'MIMIC-III-Study.pdf',
    page: 'Page 7',
    score: 0.91,
    snippet:
      'We restrict the cohort to 12,480 admissions with at least two recorded observations per stay\u2026',
  },
  {
    name: 'MIMIC-III-Study.pdf',
    page: 'Page 12',
    score: 0.78,
    snippet:
      'A held-out split of 20% was reserved for evaluation; the remainder was used for fitting\u2026',
  },
  {
    name: 'Cohort-Methods.md',
    page: 'Section 3',
    score: 0.64,
    snippet:
      'Admissions missing an ICU length of stay were excluded before the sample was frozen\u2026',
  },
]

const DOCUMENTS = [
  { name: 'MIMIC-III-Study.pdf', meta: '42 pages \u00b7 318 chunks', collection: 'Research Papers' },
  { name: 'Cohort-Methods.md', meta: '9 sections \u00b7 41 chunks', collection: 'Research Papers' },
  { name: 'Trial-Results-2025.pdf', meta: '28 pages \u00b7 190 chunks', collection: 'Trial Results' },
  { name: 'Care-Notes.csv', meta: '1,204 rows \u00b7 96 chunks', collection: 'Trial Results' },
]

/** A numbered citation chip, the same affordance the answer view renders. */
function Citation({ n }) {
  return (
    <span className="mx-0.5 inline-flex items-center rounded border border-accent/40 bg-accent/10 px-1 align-middle text-2xs font-semibold text-accent-ink">
      {n}
    </span>
  )
}

function ChatView() {
  return (
    <div className="grid gap-0 sm:grid-cols-[1.6fr_1fr]">
      <div className="space-y-4 border-line p-4 sm:border-r sm:p-5">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-card rounded-br-sm bg-accent px-3.5 py-2 text-sm text-accent-fg">
            Which dataset did they evaluate on, and how large was it?
          </p>
        </div>

        <div className="space-y-2.5">
          <p className="flex items-center gap-2 text-2xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
            Research Papers · hybrid retrieval · 34 ms
          </p>
          <div className="max-w-[92%] space-y-2 rounded-card rounded-bl-sm border border-line bg-surface px-3.5 py-3 text-sm text-ink">
            <p>
              The model was evaluated on the MIMIC-III clinical dataset, restricted to 12,480
              admission records after filtering
              <Citation n={1} />. They held back a 20% split for evaluation
              <Citation n={2} />.
            </p>
            <p className="text-xs text-muted">Drawn from 2 passages across 1 document.</p>
          </div>
        </div>

        <div className="flex items-end gap-2 rounded-card border border-line bg-surface p-2">
          <span className="flex-1 px-1 py-1.5 text-sm text-muted">Ask a follow-up…</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-input bg-accent text-accent-fg">
            <ArrowUp aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </div>

      <div className="space-y-3 bg-raised/50 p-4 sm:p-5">
        <p className="text-2xs font-semibold uppercase tracking-wide text-muted">Sources</p>
        {SOURCES.map((source) => (
          <div key={source.n} className="card p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-accent/12 text-2xs font-semibold text-accent-ink">
                {source.n}
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-ink">{source.name}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-2xs text-muted">
              <span>{source.page}</span>
              <span className="tabular-nums">relevance {source.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SearchView() {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex flex-1 items-center gap-2 rounded-input border border-line bg-surface px-3 py-2 text-sm text-ink">
          <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
          how large was the evaluation cohort
        </span>
        <span className="flex items-center gap-1 rounded-input border border-line bg-raised p-1">
          {['Hybrid', 'Semantic', 'Keyword'].map((mode, index) => (
            <span
              key={mode}
              className={clsx(
                'rounded-[7px] px-2.5 py-1 text-2xs font-medium',
                index === 0 ? 'bg-surface text-ink shadow-card' : 'text-muted',
              )}
            >
              {mode}
            </span>
          ))}
        </span>
      </div>

      <p className="text-2xs text-muted">3 results · 12 ms</p>

      <div className="space-y-2.5">
        {RESULTS.map((result) => (
          <div key={result.page} className="card p-3.5">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="truncate text-xs font-medium text-ink">{result.name}</span>
                <span className="shrink-0 text-2xs text-muted">{result.page}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-line sm:block">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.round(result.score * 100)}%` }}
                  />
                </span>
                <span className="tabular-nums text-2xs text-muted">{result.score.toFixed(2)}</span>
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{result.snippet}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LibraryView() {
  return (
    <div className="space-y-2.5 p-4 sm:p-5">
      {DOCUMENTS.map((document) => (
        <div key={document.name} className="card flex items-center gap-3 p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised">
            <FileText aria-hidden="true" className="h-4 w-4 text-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-ink">{document.name}</span>
            <span className="block truncate text-2xs text-muted">{document.meta}</span>
          </span>
          <span className="hidden items-center gap-1.5 text-2xs text-muted sm:flex">
            <FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />
            {document.collection}
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-positive/40 bg-positive/10 px-2 py-0.5 text-2xs font-medium text-positive">
            <Check aria-hidden="true" className="h-3 w-3" />
            Ready
          </span>
        </div>
      ))}
    </div>
  )
}

const VIEWS = { chat: ChatView, search: SearchView, library: LibraryView }

export default function ProductPreview() {
  const [active, setActive] = useState('chat')
  const tabRefs = useRef({})

  // Standard tablist keyboard behaviour: arrows move, Home/End jump.
  const onKeyDown = useCallback((event) => {
    const index = TABS.findIndex((tab) => tab.id === active)
    let next = null
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = TABS.length - 1
    if (next === null) return
    event.preventDefault()
    const target = TABS[next]
    setActive(target.id)
    tabRefs.current[target.id]?.focus()
  }, [active])

  const View = VIEWS[active]

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-lifted">
      <div className="flex items-center gap-2 border-b border-line bg-raised px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
          <span className="h-2.5 w-2.5 rounded-full bg-line" />
        </span>
        <span className="ml-2 truncate text-2xs text-muted">albatross.app</span>
        <span className="ml-auto hidden items-center gap-1.5 text-2xs text-muted sm:flex">
          <Sparkles aria-hidden="true" className="h-3 w-3 text-accent" />
          Product preview
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Product preview"
        onKeyDown={onKeyDown}
        className="flex gap-1 border-b border-line px-2.5 py-2"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`preview-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`preview-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              ref={(element) => {
                tabRefs.current[tab.id] = element
              }}
              onClick={() => setActive(tab.id)}
              className={clsx(
                'flex items-center gap-1.5 rounded-input px-3 py-1.5 text-xs font-medium transition-colors',
                selected ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <tab.icon aria-hidden="true" className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`preview-panel-${active}`}
        aria-labelledby={`preview-tab-${active}`}
        key={active}
        className="min-h-[19rem] animate-fade-in"
      >
        <View />
      </div>
    </div>
  )
}
