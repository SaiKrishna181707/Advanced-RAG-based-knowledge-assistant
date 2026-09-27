/**
 * "Trusted by" logo marquee.
 *
 * A seamless, edge-fading, infinitely-scrolling row of wordmarks, styled
 * after the motion-agency marquee pattern (see design references). Pure
 * CSS animation (not framer-motion) since it runs forever and off the main
 * thread cost matters more than spring physics here.
 *
 * The marks are invented placeholder brands, not real company logos —
 * swap the MARKS array for actual customer logos (as <img> or <svg>) once
 * you have real ones to show.
 */
const MARKS = [
  'NORTHWIND',
  'STRATUM',
  'HALCYON LABS',
  'ARCERA',
  'VELORA',
  'PILLARIS',
  'GREYFIELD',
  'KESTREL & CO',
]

function Mark({ label }) {
  return (
    <span className="mx-8 flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted/70 grayscale transition-all duration-300 hover:text-ink hover:grayscale-0 sm:text-base">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
      {label}
    </span>
  )
}

export default function LogoCarousel() {
  // Duplicate the row so the CSS animation can loop seamlessly at -50%.
  const row = [...MARKS, ...MARKS]

  return (
    <div className="border-y border-line bg-surface/60 py-8">
      <p className="mb-5 text-center text-2xs font-semibold uppercase tracking-[0.2em] text-muted">
        Trusted by teams who read a lot of documents
      </p>
      <div
        className="marquee-mask relative flex overflow-hidden"
        role="group"
        aria-label="Companies using ALBATROSS"
      >
        {/* row is MARKS duplicated once; the track holds it twice more so the
            0% -> -50% translate always has a matching set of marks to hand off to. */}
        <div className="flex w-max animate-marquee items-center" aria-hidden="true">
          {[...row, ...row].map((label, index) => (
            <Mark key={`${label}-${index}`} label={label} />
          ))}
        </div>
      </div>
    </div>
  )
}
