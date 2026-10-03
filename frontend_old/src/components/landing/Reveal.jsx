/**
 * Scroll-reveal wrapper for landing sections.
 *
 * Wraps a section so it animates in once, the first time it enters the
 * viewport, instead of the page loading fully static. Respects
 * prefers-reduced-motion by skipping the transform (opacity-only fallback
 * handled via CSS media query in globals.css).
 */
import { motion } from 'framer-motion'

const VARIANTS = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
}

export default function Reveal({ children, delay = 0, className }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={VARIANTS}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
