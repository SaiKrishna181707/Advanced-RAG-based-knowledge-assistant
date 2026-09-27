/**
 * Sliding company logo marquee to provide social proof dynamics.
 */
import clsx from 'clsx'

const COMPANIES = [
  'Acme Corp',
  'Globex',
  'Soylent',
  'Initech',
  'Umbrella Corp',
  'Stark Industries',
  'Wayne Enterprises',
  'Massive Dynamic',
]

function CompanyBadge({ name }) {
  return (
    <span className="mx-8 flex shrink-0 items-center justify-center gap-2 text-xl font-bold tracking-tight text-muted/40 transition-colors hover:text-ink/60">
      {name}
    </span>
  )
}

export default function LogoCarousel() {
  const row = [...COMPANIES, ...COMPANIES]

  return (
    <div className="border-y border-line bg-canvas py-10">
      <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted">
        Trusted by innovative teams worldwide
      </p>

      {/* 
        The marquee-mask class uses a linear gradient mask in globals.css 
        to fade out the edges smoothly.
      */}
      <div
        className="marquee-mask relative flex overflow-hidden"
        role="group"
        aria-label="Trusted companies"
      >
        <div className="flex w-max animate-marquee items-center" aria-hidden="true">
          {[...row, ...row].map((name, index) => (
            <CompanyBadge key={`${name}-${index}`} name={name} />
          ))}
        </div>
      </div>
    </div>
  )
}
