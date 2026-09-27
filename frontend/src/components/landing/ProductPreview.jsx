/**
 * The landing page's centrepiece: a small, faithful stand-in for the real
 * workspace, drawn with the same shapes the app draws.
 *
 * It reproduces the application shell rather than a generic marketing card - the
 * navigation rail, the scope selector, the retrieval timing line, numbered
 * citations and scored sources are all things a signed-in user actually sees. It
 * is deliberately static: no API calls and no invented analytics, so the preview
 * cannot promise a surface that does not exist.
 */
import { useCallback, useRef, useState } from 'react'
import {
  ArrowUp,
  Check,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Search,
} from 'lucide-react'
import clsx from 'clsx'
import { BrandMark } from '../layout/Brand'

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessagesSquare },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'library', label: 'Library', icon: FileText },
]

const RAIL = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: MessageSquare, label: 'Chat', active: true },
  { icon: FileText, label: 'Documents' },
  { icon: FolderOpen, label: 'Collections' },
  { icon: Search, label: 'Search' },
]

const SOURCES = [
  {
    n: 1,
    name: 'MIMIC-III-Study.pdf',
    location: 'Page 7',
    score: 0.87,
    snippet: 'we restrict the cohort to 12,480 admissions with at least two recorded observations\u2026',
  },
  {
    n: 2,
    name: 'MIMIC-III-Study.pdf',
    location: 'Page 12',
    score: 0.74,
    snippet: 'a held-out split of 20% was reserved for evaluation; the remainder was used for fitting\u2026',
  },
]

const RESULTS = [
  {
    name: 'MIMIC-III-Study.pdf',
    location: 'Page 7',
    score: 0.91,
    snippet:
      'We restrict the cohort to 12,480 admissions with at least two recorded observations per stay\u2026',
  },
  {
    name: 'MIMIC-III-Study.pdf',
    location: 'Page 12',
    score: 0.78,
    snippet: 'A held-out split of 20% was reserved for evaluation; the remainder was used for fitting\u2026',
  },
  {
    name: 'Cohort-Methods.md',
    location: 'Section 3',
    score: 0.64,
    snippet: 'Admissions missing an ICU length of stay were excluded before the sample was frozen\u2026',
  },
]

const DOCUMENTS = [
  { name: 'MIMIC-III-Study.pdf', meta: '42 pages \u00b7 318 chunks', collection: 'Research Papers' },
  { name: 'Cohort-Methods.md', meta: '9 sections \u00b7 41 chunks', collection: 'Research Papers' },
  { name: 'Trial-Results-2025.pdf', meta: '28 pages \u00b7 190 chunks', collection: 'Trial Results' },
  { name: 'Care-Notes.csv', meta: '1,204 rows \u00b7 96 chunks', collection: 'Trial Results' },
]

/** A numbered citation chip: the affordance the answer view renders inline. */
function Citation({ n }) {
  return (
    <span className="mx-0.5 inline-flex items-baseline rounded border border-accent/40 bg-accent/10 px-1 align-middle text-2xs font-semibold text-accent-ink">
      {n}
    </span>
  )
}

/** Relevance bar used by both the sources list and the search results. */
function Relevance({ score, showValue = true }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <span className="hidden h-1 w-14 overflow-hidden rounded-full bg-line sm:block">
        <span
          className="block h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.round(score * 100)}%` }}
        />
      </span>
      {showValue && <span className="tabular-nums text-2xs text-muted">{score.toFixed(2)}</span>}
    </span>
  )
}

function ChatView() {
  return (
    <div className="grid sm:grid-cols-[1.55fr_1fr]">
      <div className="flex flex-col gap-3 p-3.5 sm:p-4">
        <div className="flex justify-end">
          <p className="max-w-[88%] rounded-card rounded-br-sm bg-accent px-3 py-2 text-xs leading-relaxed text-accent-fg sm:text-sm">
            Which dataset did they evaluate on, and how large was it?
          </p>
        </div>

        <p className="flex items-center gap-1.5 text-2xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
          Research Papers · hybrid retrieval · 34 ms
        </p>

        <div className="max-w-[95%] rounded-card rounded-bl-sm border border-line bg-canvas px-3 py-2.5 text-xs leading-relaxed text-ink sm:text-sm">
          <p>
            The model was evaluated on the MIMIC-III clinical dataset, restricted to 12,480
            admission records after filtering
            <Citation n={1} />. They held back a 20% split for evaluation
            <Citation n={2} />.
          </p>
          <p className="mt-2 text-2xs text-muted">2 passages · 1 document</p>
        </div>

        <div className="mt-auto flex items-center gap-2 rounded-input border border-line bg-canvas py-1.5 pl-3 pr-1.5">
          <span className="flex-1 text-xs text-muted/80">Ask a follow-up</span>
          <span
            aria-hidden="true"
            className="h-3.5 w-px animate-caret bg-accent"
          />
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-accent text-accent-fg">
            <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      <div className="border-t border-line bg-raised/40 p-3.5 sm:border-l sm:border-t-0 sm:p-4">
        <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted">Sources</p>
        <ul className="mt-3 space-y-2">
          {SOURCES.map((source) => (
            <li key={source.n} className="rounded-input border border-line bg-surface p-2.5">
              <div className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-accent/12 text-2xs font-semibold text-accent-ink">
                  {source.n}
                </span>
                <span className="min-w-0 truncate text-2xs font-medium text-ink">{source.name}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-2xs leading-relaxed text-muted">
                {source.snippet}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-2xs text-muted">{source.location}</span>
                <Relevance score={source.score} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function SearchView() {
  return (
    <div className="space-y-3 p-3.5 sm:p-4">
      <div className="flex items-center gap-2 rounded-input border border-line bg-canvas py-1.5 pl-3 pr-2">
        <Search aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
        <span className="flex-1 truncate text-xs text-ink">where was the cohort restricted</span>
        <span className="hidden shrink-0 rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-2xs text-muted sm:block">
          hybrid
        </span>
      </div>

      <p className="px-0.5 text-2xs text-muted">3 passages · ranked by fused score</p>

      <ul className="space-y-2">
        {RESULTS.map((result) => (
          <li key={`${result.name}-${result.location}`} className="rounded-input border border-line bg-surface p-3">
            <div className="flex items-center gap-2">
              <FileText aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted" />
              <span className="min-w-0 truncate text-2xs font-medium text-ink">{result.name}</span>
              <span className="shrink-0 text-2xs text-muted">{result.location}</span>
              <span className="ml-auto">
                <Relevance score={result.score} />
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-2xs leading-relaxed text-muted">{result.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function LibraryView() {
  return (
    <div className="divide-y divide-line">
      {DOCUMENTS.map((document) => (
        <div key={document.name} className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-input bg-raised">
            <FileText aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-ink">{document.name}</span>
            <span className="block truncate text-2xs text-muted">{document.meta}</span>
          </span>
          <span className="hidden items-center gap-1.5 text-2xs text-muted md:flex">
            <FolderOpen aria-hidden="true" className="h-3 w-3" />
            {document.collection}
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-positive/40 bg-positive/10 px-2 py-0.5 text-2xs font-medium text-positive">
            <Check aria-hidden="true" className="h-2.5 w-2.5" />
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
  const onKeyDown = useCallback(
    (event) => {
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
    },
    [active],
  )

  const View = VIEWS[active]

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-lifted">
      {/* Window chrome: enough to read as the product, not a decorative browser. */}
      <div className="flex items-center gap-2 border-b border-line bg-raised px-3 py-2">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
          <span className="h-2 w-2 rounded-full bg-line" />
        </span>
        <span className="mx-auto hidden rounded border border-line bg-surface px-2 py-0.5 font-mono text-2xs text-muted sm:block">
          albatross.app/chat
        </span>
        <span className="ml-auto text-2xs text-muted sm:ml-0">Product preview</span>
      </div>

      <div className="flex">
        {/* Navigation rail, mirroring the real application shell. */}
        <nav
          aria-hidden="true"
          className="hidden w-11 shrink-0 flex-col items-center gap-0.5 border-r border-line py-3 sm:flex"
        >
          <BrandMark className="mb-2 h-5 w-5 text-accent" />
          {RAIL.map((item) => (
            <span
              key={item.label}
              className={clsx(
                'flex h-7 w-7 items-center justify-center rounded-input',
                item.active ? 'bg-accent/12 text-accent-ink' : 'text-muted/70',
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
            </span>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 border-b border-line px-2 py-1.5">
            <div
              role="tablist"
              aria-label="Product preview"
              onKeyDown={onKeyDown}
              className="flex gap-0.5"
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
                      'flex items-center gap-1.5 rounded-input px-2.5 py-1 text-2xs font-medium transition-colors',
                      selected ? 'bg-raised text-ink' : 'text-muted hover:text-ink',
                    )}
                  >
                    <tab.icon aria-hidden="true" className="h-3 w-3" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <span className="ml-auto hidden items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-2xs text-muted sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
              All documents
            </span>
          </div>

          <div
            role="tabpanel"
            id={`preview-panel-${active}`}
            aria-labelledby={`preview-tab-${active}`}
            key={active}
            className="min-h-[17.5rem] animate-fade-in"
          >
            <View />
          </div>
        </div>
      </div>
    </div>
  )
}
