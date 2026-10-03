/**
 * Analytics.
 *
 * Every figure comes from GET /api/analytics, which is derived from stored data.
 * An account with no activity shows zeros rather than an empty-looking dashboard.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Activity, FileText, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react'
import clsx from 'clsx'
import { Card, MetricStrip, SectionHeader } from '../components/ui/Primitives'
import EmptyState from '../components/ui/EmptyState'
import { useThemeStore } from '../store/theme'
import { describeActivity } from '../lib/activity'
import { formatBytes, formatDuration, formatNumber, relativeTime } from '../lib/format'

const STATUS_COLORS = {
  ready: '#0d7d70',
  processing: '#a16207',
  indexing: '#2563eb',
  uploading: '#7c3aed',
  failed: '#b91c1c',
}

function buildSeries(rows, days = 30) {
  const byDate = new Map((rows || []).map((row) => [row.date, row.count]))
  const series = []
  const today = new Date()
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - offset)
    const key = date.toISOString().slice(0, 10)
    series.push({
      date: key,
      label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count: byDate.get(key) || 0,
    })
  }
  return series
}

function ChartCard({ title, description, children, empty, emptyMessage }) {
  return (
    <Card className="p-4">
      <SectionHeader title={title} description={description} />
      <div className="mt-4 h-56">
        {empty ? (
          <EmptyState compact icon={Activity} title="Nothing to plot yet" description={emptyMessage} />
        ) : (
          children
        )}
      </div>
    </Card>
  )
}

export default function AnalyticsPage() {
  const dark = useThemeStore((state) => state.resolvedDark)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    import('../api/client').then(({ analyticsAPI }) =>
      analyticsAPI
        .overview()
        .then((payload) => {
          if (active) setData(payload)
        })
        .catch((err) => {
          if (active) setError(err.message)
        })
        .finally(() => {
          if (active) setLoading(false)
        }),
    )
    return () => {
      active = false
    }
  }, [])

  const palette = dark
    ? { primary: '#2dd4bf', secondary: '#60a5fa', axis: '#96a5bc', grid: '#233044' }
    : { primary: '#0d7d70', secondary: '#2563eb', axis: '#586378', grid: '#e2e5eb' }

  const series = useMemo(() => buildSeries(data?.questions_over_time), [data])
  const byCollection = data?.documents_by_collection || []
  const byStatus = data?.documents_by_status || []
  const totals = data?.totals
  const performance = data?.performance
  const feedback = data?.feedback

  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
        <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="skeleton h-20 rounded-card" />
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="skeleton h-72 rounded-card" />
          <div className="skeleton h-72 rounded-card" />
        </div>
      </div>
    )
  }

  const hasQuestions = series.some((point) => point.count > 0)
  const hasDocuments = byStatus.length > 0
  const documentTotal = byStatus.reduce((sum, entry) => sum + (entry.count || 0), 0)
  const tooltipStyle = {
    background: dark ? '#151e2d' : '#ffffff',
    border: `1px solid ${palette.grid}`,
    borderRadius: 10,
    fontSize: 12,
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <SectionHeader
        title="Analytics"
        description="Counts, latencies and failures measured from your own knowledge base."
      />

      <MetricStrip
        columns={6}
        metrics={[
          { label: 'Documents', value: formatNumber(totals?.documents) },
          { label: 'Pages', value: formatNumber(totals?.pages) },
          { label: 'Chunks indexed', value: formatNumber(totals?.chunks) },
          { label: 'Storage used', value: formatBytes(totals?.storage_bytes) },
          { label: 'Conversations', value: formatNumber(totals?.conversations) },
          { label: 'Questions asked', value: formatNumber(totals?.user_questions) },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <ChartCard
          title="Questions over time"
          description="Questions asked in the last 30 days."
          empty={!hasQuestions}
          emptyMessage="Ask a question and it will be plotted here."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: palette.axis }}
                interval={Math.max(0, Math.floor(series.length / 6) - 1)}
                axisLine={{ stroke: palette.grid }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: palette.axis }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: palette.axis }} />
              <Bar
                dataKey="count"
                name="Questions"
                fill={palette.primary}
                radius={[3, 3, 0, 0]}
                maxBarSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="p-4">
          <SectionHeader title="Performance" description="Timings measured on your answers." />
          <dl className="mt-4 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">Average retrieval</dt>
              <dd className="text-sm font-medium tabular-nums text-ink">
                {formatDuration(performance?.avg_retrieval_ms)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted">Average generation</dt>
              <dd className="text-sm font-medium tabular-nums text-ink">
                {formatDuration(performance?.avg_llm_ms)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <dt className="text-sm text-muted">Answers measured</dt>
              <dd className="text-sm font-medium tabular-nums text-ink">
                {formatNumber(performance?.answers)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-sm text-muted">
                <TriangleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                Processing failures
              </dt>
              <dd
                className={clsx(
                  'text-sm font-medium tabular-nums',
                  totals?.processing_failures ? 'text-danger' : 'text-ink',
                )}
              >
                {formatNumber(totals?.processing_failures)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Documents by collection"
          description="How your knowledge base is distributed."
          empty={byCollection.length === 0}
          emptyMessage="Upload documents and file them into collections."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCollection} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 10, fill: palette.axis }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={112}
                tickFormatter={(value) => (value.length > 16 ? `${value.slice(0, 15)}...` : value)}
                tick={{ fontSize: 10, fill: palette.axis }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Documents" fill={palette.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card className="p-4">
          <SectionHeader title="Processing status" description="Where documents currently stand." />
          {!hasDocuments ? (
            <EmptyState
              compact
              className="mt-4"
              icon={Activity}
              title="Nothing to report"
              description="Upload a document and its processing state will appear here."
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {byStatus.map((entry) => {
                const count = entry.count || 0
                const share = documentTotal > 0 ? (count / documentTotal) * 100 : 0
                const color = STATUS_COLORS[entry.status] || palette.secondary
                return (
                  <li key={entry.status}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 capitalize text-ink">
                        <span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {entry.status}
                      </span>
                      <span className="tabular-nums text-muted">{formatNumber(count)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${share}%`, backgroundColor: color }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader title="Most queried documents" description="Documents cited most often in answers." />
          {(data?.most_queried_documents || []).length === 0 ? (
            <EmptyState
              compact
              icon={FileText}
              title="No citations yet"
              description="Documents appear here once answers start citing them."
              className="mt-4"
            />
          ) : (
            <ol className="mt-3 space-y-2">
              {(data?.most_queried_documents || []).map((document, index) => (
                <li key={document.document_id} className="flex items-center gap-3">
                  <span className="w-4 shrink-0 text-2xs tabular-nums text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink" title={document.name}>
                    {document.name}
                  </span>
                  <span className="shrink-0 text-2xs tabular-nums text-muted">
                    {document.count} citation{document.count === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <SectionHeader title="Answer feedback" description="Ratings left on answers." />
          {(feedback?.up ?? 0) + (feedback?.down ?? 0) === 0 ? (
            <EmptyState
              compact
              className="mt-4"
              icon={ThumbsUp}
              title="No ratings yet"
              description="Rate an answer in chat and it will be counted here."
            />
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-positive/12 text-positive">
                  <ThumbsUp aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xl font-semibold tabular-nums text-ink">{feedback?.up ?? 0}</p>
                  <p className="text-2xs text-muted">Helpful</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-danger/12 text-danger">
                  <ThumbsDown aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xl font-semibold tabular-nums text-ink">{feedback?.down ?? 0}</p>
                  <p className="text-2xs text-muted">Not helpful</p>
                </div>
              </div>
              <p className="border-t border-line pt-3 text-2xs text-muted">
                {feedback?.satisfaction !== null && feedback?.satisfaction !== undefined
                  ? `${Math.round(feedback.satisfaction * 100)}% of rated answers were marked helpful.`
                  : 'No answers have been rated yet.'}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <SectionHeader title="Recent activity" description="The last 15 recorded events." />
          {(data?.activity || []).length === 0 ? (
            <EmptyState compact icon={Activity} title="No activity yet" className="mt-4" />
          ) : (
            <ol className="mt-3 space-y-2.5">
              {(data?.activity || []).map((entry) => {
                const activity = describeActivity(entry)
                const Icon = activity.icon
                return (
                  <li key={entry.id} className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-raised text-muted">
                      {Icon ? <Icon aria-hidden="true" className="h-3 w-3" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink">{activity.label}</span>
                      {activity.detail && (
                        <span className="block truncate text-2xs text-muted">{activity.detail}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-2xs text-muted">
                      {relativeTime(entry.created_at)}
                    </span>
                  </li>
                )
              })}
            </ol>
          )}
        </Card>
      </div>
    </div>
  )
}