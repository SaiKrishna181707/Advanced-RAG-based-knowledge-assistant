/**
 * Sliding company logo marquee with genuine SimpleIcons SVGs.
 */
const LOGOS = [
  { name: 'Vercel', slug: 'vercel' },
  { name: 'GitHub', slug: 'github' },
  { name: 'Stripe', slug: 'stripe' },
  { name: 'Notion', slug: 'notion' },
  { name: 'Linear', slug: 'linear' },
  { name: 'OpenAI', slug: 'openai' },
  { name: 'Raycast', slug: 'raycast' },
  { name: 'Anthropic', slug: 'anthropic' },
]

function CompanyBadge({ name, slug }) {
  // Use simpleicons CDN to get 100% genuine accurate brand logos dynamically.
  // Using white color (hex ffffff) and CSS opacity to match the theme cleanly.
  const src = `https://cdn.simpleicons.org/${slug}/ffffff`
  
  return (
    <span className="mx-12 flex shrink-0 items-center justify-center gap-3 opacity-40 transition-opacity hover:opacity-100">
      <img src={src} alt={name} className="h-7 w-auto object-contain" />
      <span className="text-xl font-bold tracking-tight text-white">{name}</span>
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
            <CompanyBadge key={`${logo.name}-${index}`} name={logo.name} slug={logo.slug} />
          ))}
        </div>
      </div>
    </div>
  )
}
