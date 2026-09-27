/**
 * Public product landing page.
 *
 * Keep the page short: hero and product preview, a concise proof strip,
 * four product claims, the workflow, pricing and one closing CTA.
 */
import { useEffect } from 'react'
import LandingNav from '../components/landing/LandingNav'
import Hero from '../components/landing/Hero'
import LogoCarousel from '../components/landing/LogoCarousel'
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
    <div className="min-h-dvh bg-canvas">
      <LandingNav />
      <main>
        <Hero />

        <Reveal>
          <LogoCarousel />
        </Reveal>

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
