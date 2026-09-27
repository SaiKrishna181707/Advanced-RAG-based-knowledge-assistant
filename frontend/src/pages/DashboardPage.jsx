/**
 * Personal dashboard.
 *
 * Everything on this page comes from GET /api/me/overview - counts, the fourteen
 * day question trend, recent documents and conversations, and usage against the
 * current plan. The ask box is the one interactive piece: it opens a new
 * conversation through the same streaming endpoint the chat page uses.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ArrowUp, FileText, FileUp, MessagesSquare, Search } from 'lucide-react'
import clsx from 'clsx'
import {
  Button,
  Card,
  MetricStrip,
  SectionHeader,
  Skeleton,
  UsageMeter,
} from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import { useStore } from '../store'
import { useAuthStore } from '../store/authStore'
import { pluralize, relativeTime } from '../lib/format'

const TREND_DAYS = 14

/**
 * The API only returns days that actually had questions, so the window is
 * zero-filled here to keep the chart's shape stable between renders.
 */
function buildTrend(rows) {
  const byDate = new Map((rows || []).map((row) => [row.date, row.count]))
  const today = new Date()
  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (TREND_DAYS - 1 - index))
    const key = date.toISOString().slice(0, 10)
    return {
      date: key,
      count: byDate.get(key) || 0,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    }
  })
}

/** Fourteen narrow bars, rendered with plain elements so the dashboard stays light. */
function TrendChart({ series }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...series.map((point) => point.count))
  const total = series.reduce((sum, point) => sum + point.count, 0)
  const hovered = active === null ? null : series[active]

  return (
    <div className="mt-5">
      <div className="relative flex h-24 items-end gap-[3px]">
        {hovered && (
          <p
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-2xs text-ink shadow-card"
            style={{ left: `${((active + 0.5) / series.length) * 100}%` }}
          >
            {hovered.label} &middot; {pluralize(hovered.count, 'question')}
          </p>
        )}
        {series.map((point, index) => (
          <button
            key={point.date}
            type="button"
            onMouseEnter={() => setActive(index)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            aria-label={`${point.label}: ${pluralize(point.count, 'question')}`}
            className="flex h-full flex-1 cursor-default flex-col items-center justify-end focus:outline-none"
          >
            {point.count > 0 ? (
              <span
                className={clsx(
                  'w-full max-w-[18px] rounded-[3px] transition-colors',
                  active === index ? 'bg-accent-ink' : 'bg-accent',
                )}
                style={{ height: `${Math.max(8, (point.count / max) * 100)}%` }}
              />
            ) : (
              <span
                className={clsx(
                  'h-[3px] w-[3px] rounded-full transition-colors',
                  active === index ? 'bg-muted' : 'bg-line',
                )}
              />
            )}
          </button>
        ))}
      </div>
      <div className="h-px w-full bg-line" />
      <div className="mt-2 flex items-baseline justify-between gap-2 text-2xs text-muted">
        <span>{series[0]?.label}</span>
        <span className="tabular-nums">
          {total === 0 ? 'Nothing asked yet' : `${pluralize(total, 'question')} in ${TREND_DAYS} days`}
        </span>
        <span>Today</span>
      </div>
    </div>
  )
}


export default function DashboardPage() {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const overview = useStore((state) => state.overview)
  const loading = useStore((state) => state.overviewLoading)
  const error = useStore((state) => state.overviewError)
  const loadOverview = useStore((state) => state.loadOverview)
  const documents = useStore((state) => state.documents)
  const loadDocuments = useStore((state) => state.loadDocuments)
  const loadConversations = useStore((state) => state.loadConversations)
  const newConversation = useStore((state) => state.newConversation)
  const selectConversation = useStore((state) => state.selectConversation)
  const setScope = useStore((state) => state.setScope)
  const ask = useStore((state) => state.ask)

  const [draft, setDraft] = useState('')
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    loadOverview()
    loadDocuments()
    loadConversations()
  }, [loadOverview, loadDocuments, loadConversations])

  const counts = overview?.counts
  const usage = overview?.usage
  const name = (user?.name || '').split(' ')[0]
  const readyCount = useMemo(
    () => documents.filter((document) => document.status === 'ready').length,
    [documents],
  )
  const series = useMemo(() => buildTrend(overview?.questions_by_day), [overview])
  const asked = series.reduce((sum, point) => sum + point.count, 0)
  const pending = loading && !counts

  const submit = (event) => {
    event.preventDefault()
    const question = draft.trim()
    if (!question || asking || readyCount === 0) return
    setAsking(true)
    setDraft('')
    newConversation()
    setScope({ mode: 'all', collection_id: null, document_ids: [] })
    navigate('/app/chat')
    ask(question)
  }

  const openConversation = (id) => {
    selectConversation(id)
    navigate('/app/chat')
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Welcome back{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Ask a question across everything you have uploaded.
          </p>
        </div>
        <Link to="/app/documents" className="btn-secondary text-sm">
          <FileUp aria-hidden="true" className="h-4 w-4" />
          Upload document
        </Link>
      </header>

      {error && !overview && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <span>{error}</span>
          <Button size="sm" onClick={loadOverview}>
            Retry
          </Button>
        </div>
      )}

      {/* Ask */}
      <Card className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Ask your knowledge base</h2>
        <p className="mt-0.5 text-2xs text-muted">
          Answers are grounded in retrieved passages and always cite their sources.
        </p>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="dashboard-question" className="sr-only">
            Ask a question about your documents
          </label>
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
            <input
              id="dashboard-question"
              type="text"
              value={draft}
              autoComplete="off"
              disabled={readyCount === 0}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                readyCount === 0
                  ? 'Upload a document to start asking questions'
                  : 'Ask anything across your documents…'
              }
              className="input pl-9"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            icon={ArrowUp}
            loading={asking}
            disabled={!draft.trim() || readyCount === 0}
            className="shrink-0"
          >
            Ask
          </Button>
        </form>
        <p className="mt-2 text-2xs text-muted">
          {readyCount === 0 ? (
            <>
              No processed documents yet.{' '}
              <Link to="/app/documents" className="text-accent-ink underline underline-offset-2">
                Upload one
              </Link>{' '}
              to get started.
            </>
          ) : (
            `Searching across ${pluralize(readyCount, 'ready document')}`
          )}
        </p>
      </Card>

      {/* Counts */}
      {pending ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="bg-surface px-4 py-3.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-5 w-10" />
            </div>
          ))}
        </div>
      ) : (
        <MetricStrip
          metrics={[
            { label: 'Documents', value: counts?.documents ?? 0 },
            { label: 'Questions', value: counts?.questions ?? 0 },
            { label: 'Collections', value: counts?.collections ?? 0 },
            { label: 'Conversations', value: counts?.conversations ?? 0 },
          ]}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Trend */}
        <Card className="p-4">
          <SectionHeader
            title="Questions"
            description={`The last ${TREND_DAYS} days.`}
            actions={
              <Link to="/app/analytics" className="btn-ghost text-xs">
                Analytics
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {pending ? (
            <Skeleton className="mt-5 h-24 rounded-card" />
          ) : asked === 0 ? (
            <EmptyState
              compact
              className="mt-4"
              icon={Search}
              title="No questions in this window"
              description="Ask something from the box above and the trend will build up here."
            />
          ) : (
            <TrendChart series={series} />
          )}
        </Card>

        {/* Usage */}
        <Card className="p-4">
          <SectionHeader
            title="Usage"
            description={usage ? `${usage.plan_name} plan` : 'This month'}
            actions={
              <Link to="/app/settings" className="btn-ghost text-xs">
                Manage
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {usage ? (
            <div className="mt-4 space-y-4">
              <UsageMeter
                label="Documents"
                percent={usage.documents.percent}
                detail={usage.documents.label}
              />
              <UsageMeter
                label="Questions this month"
                percent={usage.questions.percent}
                detail={usage.questions.label}
              />
              <UsageMeter
                label="Storage"
                percent={usage.storage.percent}
                detail={usage.storage.label}
              />
              <p className="border-t border-line pt-3 text-2xs text-muted">
                Retrieves up to {usage.limits.retrieval_top_k} passages per question on this plan.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Recent documents */}
        <Card className="p-4">
          <SectionHeader
            title="Recent documents"
            actions={
              <Link to="/app/documents" className="btn-ghost text-xs">
                All documents
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {(overview?.recent_documents || []).length === 0 ? (
            <EmptyState
              compact
              icon={FileText}
              title="No documents yet"
              description="Upload a PDF, text file, Markdown, DOCX or CSV to get started."
              action={
                <Button variant="primary" size="sm" onClick={() => navigate('/app/documents')}>
                  Upload a document
                </Button>
              }
              className="mt-4"
            />
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {(overview?.recent_documents || []).map((document) => (
                <li key={document.id} className="flex items-center gap-3 py-2.5">
                  <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                  <Link
                    to="/app/documents"
                    className="min-w-0 flex-1 truncate text-sm text-ink hover:text-accent-ink hover:underline"
                  >
                    {document.name}
                  </Link>
                  <span className="shrink-0 text-2xs text-muted">
                    {pluralize(document.chunk_count || 0, 'passage')}
                    <span aria-hidden="true"> &middot; </span>
                    {relativeTime(document.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Recent conversations */}
        <Card className="p-4">
          <SectionHeader
            title="Recent conversations"
            actions={
              <Link to="/app/chat" className="btn-ghost text-xs">
                Open chat
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {(overview?.recent_conversations || []).length === 0 ? (
            <EmptyState
              compact
              icon={MessagesSquare}
              title="No conversations yet"
              description="Ask your first question and the thread will appear here."
              className="mt-4"
            />
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {(overview?.recent_conversations || []).map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(conversation.id)}
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:text-accent-ink"
                  >
                    <MessagesSquare aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">
                        {conversation.title || 'New conversation'}
                      </span>
                      {conversation.last_message_preview &&
                        conversation.last_message_preview !== conversation.title && (
                          <span className="block truncate text-2xs text-muted">
                            {conversation.last_message_preview}
                          </span>
                        )}
                    </span>
                    <span className="shrink-0 text-2xs text-muted">
                      {relativeTime(conversation.updated_at || conversation.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}