/**
 * ALBATROSS identity: an animated flying albatross outline.
 *
 * `animated` opts into a continuous gentle flying/flapping motion.
 */
import clsx from 'clsx'
import { motion } from 'framer-motion'

// A simple but elegant bird outline (wings up)
const WING_UP = 'M16,10 C10,4 2,6 1,12 C5,8 12,14 16,18 C20,14 27,8 31,12 C30,6 22,4 16,10 Z'
// Wings down (same number of nodes for smooth interpolation)
const WING_DOWN = 'M16,14 C10,22 2,20 1,14 C5,18 12,16 16,18 C20,16 27,18 31,14 C30,20 22,22 16,14 Z'

export function BrandMark({ className, animated = false }) {
  // A sleek geometric 'A' without a horizontal crossbar
  const A_PATH = 'M 12 4 L 20 4 L 28 28 L 21.5 28 L 16 11 L 10.5 28 L 4 28 Z'

  if (!animated) {
    return (
      <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
        <path d={A_PATH} className="fill-ink" />
        <path d={WING_UP} className="fill-accent drop-shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="none">
      <path d={A_PATH} className="fill-ink" />
      <motion.path
        className="fill-accent drop-shadow-[0_0_8px_rgba(79,70,229,0.5)]"
        animate={{
          d: [WING_UP, WING_DOWN, WING_UP],
          y: [0, -1, 0]
        }}
        transition={{
          duration: 3,
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </svg>
  )
}

export default function Brand({ size = 'md', className, withTagline = false, animated = false }) {
  const mark = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'
  const text = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base'
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <BrandMark className={mark} animated={animated} />
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
