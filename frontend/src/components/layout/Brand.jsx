/**
 * ALBATROSS identity: an abstract wing sweeping over a horizon line.
 * Deliberately restrained — a navigation mark, not a mascot.
 *
 * `animated` opts a single instance into a one-time draw-in on mount (used
 * on the landing hero/nav). Every other usage stays the plain static mark.
 */
import clsx from 'clsx'
import { motion } from 'framer-motion'

const WING_PATH =
  'M3.6 19.4c4.6-4.9 10.1-7.2 16.3-6.9 2.6.12 5.1.75 7.5 1.9-2.2 4.7-5.9 7.3-11 7.7-4.6.36-9.1-.63-12.8-2.7Z'
const HORIZON_PATH = 'M4 25.6h24'

export function BrandMark({ className, animated = false }) {
  if (!animated) {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
        <circle cx="16" cy="16" r="15" className="fill-current opacity-[0.10]" />
        <path d={WING_PATH} className="fill-current" />
        <path
          d={HORIZON_PATH}
          className="stroke-current"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <motion.circle
        cx="16"
        cy="16"
        r="15"
        className="fill-current opacity-[0.10]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.path
        d={WING_PATH}
        className="fill-current"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <motion.path
        d={HORIZON_PATH}
        className="stroke-current"
        strokeWidth="1.6"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.5 }}
        transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}

export default function Brand({ size = 'md', className, withTagline = false, animated = false }) {
  const mark = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const text = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <BrandMark className={clsx(mark, 'text-accent')} animated={animated} />
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
