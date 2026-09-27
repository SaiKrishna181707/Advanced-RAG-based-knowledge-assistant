/**
 * Sliding company logo marquee with premium SVGs.
 */
import clsx from 'clsx'

const LOGOS = [
  {
    name: 'Vercel',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6">
        <path d="M12 1L24 22H0L12 1Z" />
      </svg>
    ),
  },
  {
    name: 'Linear',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6">
        <path d="M12.983 23.364v-6.953h-5.07l1.094-3.526h3.976V9.083c0-3.328 1.944-5.26 5.244-5.26 1.487 0 2.91.135 3.324.2l-.438 3.428c-.352-.04-.984-.067-1.846-.067-1.748 0-2.222.753-2.222 2.053v3.447h4.032l-.894 3.526h-3.138v6.954h-4.062Z" />
      </svg>
    ),
  },
  {
    name: 'Stripe',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-7">
        <path d="M10.9 21c-4.6 0-7.7-2.1-8.5-5.3l3.5-1.1c.4 1.7 2 2.8 4.7 2.8 2.6 0 3.7-1 3.7-2.2 0-1.3-.9-1.9-3.7-2.6-3.4-.8-6.1-2.1-6.1-5.6 0-3.4 3-5.7 7.2-5.7 4.1 0 6.6 2.1 7.4 4.8l-3.3 1.1c-.5-1.5-1.9-2.4-4-2.4-2 0-3.3.9-3.3 2.1 0 1.2.9 1.7 3.5 2.4 3.7.9 6.3 2.1 6.3 5.7.1 3.7-3.1 6-7.4 6z" />
      </svg>
    ),
  },
  {
    name: 'Scale',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6">
        <path d="M2.2 5.1L12 1.3l9.8 3.8v9.8L12 22.7l-9.8-7.8V5.1z" />
      </svg>
    ),
  },
  {
    name: 'Anthropic',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
    ),
  },
  {
    name: 'Raycast',
    svg: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-6">
        <path d="M12 1v6.5a4.5 4.5 0 0 0 0 9V23A11 11 0 0 1 12 1z" />
      </svg>
    ),
  },
]

function CompanyBadge({ name, svg }) {
  return (
    <span className="mx-12 flex shrink-0 items-center justify-center gap-3 text-muted/40 transition-colors hover:text-ink/80">
      {svg}
      <span className="text-xl font-bold tracking-tight">{name}</span>
    </span>
  )
}

export default function LogoCarousel() {
  const row = [...LOGOS, ...LOGOS, ...LOGOS]

  return (
    <div className="bg-canvas py-12">
      <p className="mb-10 text-center text-xs font-semibold uppercase tracking-widest text-muted/60">
        Powering knowledge for teams at
      </p>
      
      <div
        className="marquee-mask relative flex overflow-hidden"
        role="group"
        aria-label="Trusted companies"
      >
        <div className="flex w-max animate-marquee items-center" aria-hidden="true">
          {row.map((logo, index) => (
            <CompanyBadge key={`${logo.name}-${index}`} name={logo.name} svg={logo.svg} />
          ))}
        </div>
      </div>
    </div>
  )
}
