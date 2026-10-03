/** Consistent empty state: icon, headline, explanation and an optional action. */
import clsx from 'clsx'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center rounded-card border border-dashed border-line text-center',
        compact ? 'gap-2 p-6' : 'gap-3 p-10',
        className,
      )}
    >
      {Icon && (
        <span className="rounded-full bg-accent/10 p-3 text-accent-ink">
          <Icon aria-hidden="true" className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </span>
      )}
      <div>
        <p className={clsx('font-medium text-ink', compact ? 'text-sm' : 'text-base')}>{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}