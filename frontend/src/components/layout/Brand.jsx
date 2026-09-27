/**
 * ALBATROSS identity: an abstract wing sweeping over a horizon line.
 * Deliberately restrained — a navigation mark, not a mascot.
 */
import clsx from 'clsx'

export function BrandMark({ className }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <circle cx="16" cy="16" r="15" className="fill-current opacity-[0.10]" />
      <path
        d="M3.6 19.4c4.6-4.9 10.1-7.2 16.3-6.9 2.6.12 5.1.75 7.5 1.9-2.2 4.7-5.9 7.3-11 7.7-4.6.36-9.1-.63-12.8-2.7Z"
        className="fill-current"
      />
      <path
        d="M4 25.6h24"
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  )
}

export default function Brand({ size = 'md', className, withTagline = false }) {
  const mark = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const text = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <BrandMark className={clsx(mark, 'text-accent')} />
      <span className="leading-none">
        <span className={clsx('block font-semibold tracking-[0.16em] text-ink', text)}>
          ALBATROSS
        </span>
        {withTagline && (
          <span className="mt-1 block text-2xs tracking-wide text-muted">
            Navigate your knowledge.
          </span>
        )}
      </span>
    </span>
  )
}