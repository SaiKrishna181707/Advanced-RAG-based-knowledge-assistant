/**
 * Public product landing page.
 *
 * Route: /
 * A signed-in visitor is redirected to the dashboard by LandingGate in App.jsx.
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
import LogoCarousel from '../components/landing/LogoCarousel'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'ALBATROSS — Your knowledge, actually searchable'
  }, [])

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <LogoCarousel />
        <Reveal delay={0.05}><Benefits /></Reveal>
        <Reveal delay={0.05}><Workflow /></Reveal>
        <Reveal delay={0.05}><Pricing /></Reveal>
        <Reveal delay={0.05}><FinalCta /></Reveal>
      </main>
      <Footer />
    </div>
  )
}