/** Shared presentational primitives. Every one is a real semantic element. */
import clsx from 'clsx'
import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
}

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: '',
  lg: 'px-4 py-2.5 text-sm',
}

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon: Icon = null, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={props.type ?? 'button'}
      className={clsx(VARIANTS[variant] ?? VARIANTS.secondary, SIZES[size], className)}
      aria-busy={loading || undefined}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon aria-hidden="true" className="h-4 w-4" />
      )}
      {children}
    </button>
  )
})

export function Card({ as: Tag = 'div', className, interactive = false, children, ...props }) {
  return (
    <Tag className={clsx(interactive ? 'card-interactive' : 'card', className)} {...props}>
      {children}
    </Tag>
  )
}

export function SectionHeader({ title, description, actions, className }) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  neutral: 'border-line bg-raised text-muted',
  accent: 'border-accent/35 bg-accent/10 text-accent-ink',
  positive: 'border-positive/35 bg-positive/10 text-positive',
  caution: 'border-caution/35 bg-caution/10 text-caution',
  danger: 'border-danger/35 bg-danger/10 text-danger',
}

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium',
        TONES[tone] ?? TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Progress({ value, max = 100, label, className, tone = 'accent' }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  const bar =
    tone === 'danger' ? 'bg-danger' : percent >= 90 ? 'bg-caution' : 'bg-accent'
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div className={clsx('h-full rounded-full transition-all', bar)} style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span role="status" aria-label={label}>
      <Loader2 aria-hidden="true" className={clsx('h-4 w-4 animate-spin text-muted', className)} />
    </span>
  )
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={clsx('skeleton h-4 w-full', className)} />
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card space-y-3 p-4">
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={index % 2 ? 'w-4/5' : 'w-full'} />
      ))}
    </div>
  )
}

export function Stat({ label, value, hint, icon: Icon, tone = 'neutral' }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && (
          <span
            className={clsx(
              'rounded-lg p-1.5',
              tone === 'accent' ? 'bg-accent/12 text-accent-ink' : 'bg-raised text-muted',
            )}
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

const METRIC_COLUMNS = {
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

/**
 * A single hairline-separated row of headline figures. Preferred over a row of
 * Stat cards when the numbers are a summary rather than an entry point.
 */
export function MetricStrip({ metrics, columns = 4, className }) {
  return (
    <dl
      className={clsx(
        'grid gap-px overflow-hidden rounded-card border border-line bg-line',
        METRIC_COLUMNS[columns] ?? METRIC_COLUMNS[4],
        className,
      )}
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-surface px-4 py-3.5">
          <dt className="text-2xs font-medium uppercase tracking-wide text-muted">{metric.label}</dt>
          <dd className="mt-1 text-xl font-semibold tabular-nums text-ink">{metric.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Small inline "usage: 42 / 100" meter used in the sidebar and settings. */
export function UsageMeter({ label, used, limit, percent, detail }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums text-ink">{detail}</span>
      </div>
      <Progress value={percent} label={`${label} usage`} className="mt-1.5" />
    </div>
  )
}