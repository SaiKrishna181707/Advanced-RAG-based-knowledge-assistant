/**
 * Public product landing page.
 *
 * Route: /
 * A signed-in visitor is redirected to the dashboard by LandingGate in App.jsx,
 * so this page is only ever shown to visitors.
 *
 * Deliberately short: hero and product preview, four benefits, the workflow,
 * pricing, one closing call to action. Nothing else.
 */
import { useEffect } from 'react'
import LandingNav from '../components/landing/LandingNav'
import Hero from '../components/landing/Hero'
import Benefits from '../components/landing/Benefits'
import Workflow from '../components/landing/Workflow'
import Pricing from '../components/landing/Pricing'
import FinalCta from '../components/landing/FinalCta'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'ALBATROSS — Your knowledge, actually searchable'
  }, [])

  return (
    <div className="min-h-dvh bg-canvas">
      <LandingNav />
      <main>
        <Hero />
        <Benefits />
        <Workflow />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
