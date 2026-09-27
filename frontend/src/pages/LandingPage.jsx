/**
 * Public product landing page.
 *
 * Route: /
 * A signed-in visitor is redirected to the dashboard by PublicOnlyRoute's
 * sibling behaviour in App.jsx, so this page is only ever shown to visitors.
 */
import { useEffect } from 'react'
import LandingNav from '../components/landing/LandingNav'
import Hero from '../components/landing/Hero'
import HowItWorks from '../components/landing/HowItWorks'
import Capabilities from '../components/landing/Capabilities'
import Architecture from '../components/landing/Architecture'
import Trust from '../components/landing/Trust'
import Insights from '../components/landing/Insights'
import Pricing from '../components/landing/Pricing'
import Faq, { FinalCta } from '../components/landing/Faq'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'ALBATROSS — Navigate Your Knowledge'
  }, [])

  return (
    <div className="min-h-dvh bg-canvas">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Capabilities />
        <Architecture />
        <Trust />
        <Insights />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}