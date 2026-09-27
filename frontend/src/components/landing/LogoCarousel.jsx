/**
 * Supported document formats.
 *
 * This uses the marquee treatment as a product signal rather than fake social
 * proof. Every item below is an actual format accepted by the backend.
 */
const FORMATS = ['PDF', 'DOCX', 'MARKDOWN', 'CSV', 'PLAIN TEXT']

function Format({ label }) {
  return (
    <span className="mx-8 flex shrink-0 items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted/70 sm:text-base">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent opacity-70" />
      {label}
    </span>
  )
}

export default function LogoCarousel() {
  const row = [...FORMATS, ...FORMATS]

  return (
    <div className="border-y border-line bg-surface/60 py-7">
      <p className="mb-5 text-center text-2xs font-semibold uppercase tracking-[0.2em] text-muted">
        Bring the knowledge you already have
      </p>

      <div
        className="marquee-mask relative flex overflow-hidden"
        role="group"
        aria-label="Supported document formats"
      >
        <div className="flex w-max animate-marquee items-center" aria-hidden="true">
          {[...row, ...row].map((label, index) => (
            <Format key={`${label}-${index}`} label={label} />
          ))}
        </div>
      </div>
    </div>
  )
}
