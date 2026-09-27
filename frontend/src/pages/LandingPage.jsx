/**
 * Public product landing page.
 *
 * Route: /
 * A signed-in visitor is redirected to the dashboard by LandingGate in App.jsx,
 * so this page is only ever shown to visitors.
 *
 * The entire marketing page uses a dark palette scoped via the
 * .albatross-landing wrapper class, preventing the app-wide light theme from
 * leaking into the marketing page.
 */
import { useEffect } from 'react'
import LandingNav from '../components/landing/LandingNav'
import Hero from '../components/landing/Hero'
import Benefits from '../components/landing/Benefits'
import Workflow from '../components/landing/Workflow'
import Pricing from '../components/landing/Pricing'
import FinalCta from '../components/landing/FinalCta'
import Footer from '../components/landing/Footer'
import Reveal from '../components/landing/Reveal'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'ALBATROSS — Your knowledge, actually searchable'
  }, [])

  return (
    <div className="albatross-landing">
      <LandingNav />
      <main>
        <Hero />
        <Reveal>
          <Benefits />
        </Reveal>
        <Reveal delay={0.05}>
          <Workflow />
        </Reveal>
        <Reveal delay={0.05}>
          <Pricing />
        </Reveal>
        <Reveal>
          <FinalCta />
        </Reveal>
      </main>
      <Footer />
    </div>
  )
}