/** Shared frame for the login and signup screens. */
import { Link } from 'react-router-dom'
import { ArrowLeft, FileSearch, Quote, ShieldCheck, Sparkles } from 'lucide-react'
import Brand from '../layout/Brand'

const POINTS = [
  {
    icon: FileSearch,
    title: 'Grounded, not guessed',
    body: 'Answers are built from the passages actually retrieved from your documents.',
  },
  {
    icon: Quote,
    title: 'Citations you can open',
    body: 'Every claim links to the document and page it came from.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Your knowledge base is isolated to your account, enforced on the server.',
  },
]

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Left: brand panel */}
      <aside className="relative hidden flex-1 overflow-hidden border-r border-line bg-surface lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="chart-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="horizon-glow absolute inset-x-0 top-0 h-72" aria-hidden="true" />

        <div className="relative">
          <Link to="/" className="inline-block rounded-input">
            <Brand size="lg" withTagline />
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-2xl font-semibold leading-snug tracking-tight text-ink">
            Turn a folder of documents into something you can ask questions of.
          </h2>
          <ul className="mt-7 space-y-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent-ink">
                  <point.icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-ink">{point.title}</p>
                  <p className="mt-0.5 text-sm text-muted">{point.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted">
          ALBATROSS · Navigate your knowledge.
        </p>
      </aside>

      {/* Right: form */}
      <main className="flex flex-1 flex-col justify-center bg-canvas px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden">
            <Link to="/" className="inline-block rounded-input">
              <Brand size="md" withTagline />
            </Link>
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          </div>

          <div className="mt-6">{children}</div>

          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}

          <div className="mt-10 flex items-center gap-2 lg:hidden">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
            <Link to="/" className="text-xs text-muted hover:text-ink">
              <span className="inline-flex items-center gap-1">
                <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
                Back to home
              </span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}