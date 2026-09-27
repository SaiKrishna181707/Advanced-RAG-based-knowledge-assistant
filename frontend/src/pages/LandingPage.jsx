import { useEffect } from 'react'
import Hero from '../components/landing/Hero'
import LogoCarousel from '../components/landing/LogoCarousel'
import Benefits from '../components/landing/Benefits'
import Workflow from '../components/landing/Workflow'
import Pricing from '../components/landing/Pricing'
import FinalCta from '../components/landing/FinalCta'
import Footer from '../components/landing/Footer'
import AnimatedTopDockHost from '../components/landing/AnimatedTopDockHost'
import Reveal from '../components/landing/Reveal'

export default function LandingPage() {
  useEffect(() => { document.title = 'ALBATROSS — Your knowledge, actually searchable' }, [])
  return (
    <div className="landing-page min-h-dvh bg-canvas text-ink">
      <AnimatedTopDockHost />
      <main>
        <Hero />
        <Reveal><LogoCarousel /></Reveal>
        <Reveal><Benefits /></Reveal>
        <Reveal delay={0.05}><Workflow /></Reveal>
        <Reveal delay={0.05}><Pricing /></Reveal>
        <Reveal><FinalCta /></Reveal>
      </main>
      <Footer />
    </div>
  )
}