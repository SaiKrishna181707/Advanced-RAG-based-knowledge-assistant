import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import LandingNav from '../components/landing/LandingNav'
import Footer from '../components/landing/Footer'
import { ArrowRight, Target, FileText, CheckCircle, BarChart, Zap } from 'lucide-react'

export default function LandingPage() {
  useEffect(() => {
    document.title = 'ALBATROSS CAREER — Turn your skills into your next opportunity'
  }, [])

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <LandingNav />
      <main className="flex-1">
        {/* 1. Hero */}
        <section className="relative overflow-hidden pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pb-32 text-center">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-6xl max-w-4xl mx-auto">
              Turn your skills into your next opportunity.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
              Build your career profile once. Use it to understand jobs, tailor applications, prepare for interviews, and grow the skills employers actually ask for.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/signup" className="btn-primary text-base px-6 py-3">
                Build your Career Profile
              </Link>
              <a href="#explore" className="btn-secondary text-base px-6 py-3">
                Explore the platform
              </a>
            </div>
          </div>
        </section>

        {/* 2. Product overview */}
        <section id="explore" className="py-16 sm:py-24 bg-surface border-y border-line">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-semibold text-ink">An AI career workspace</h2>
              <p className="mt-4 text-muted max-w-2xl mx-auto">
                Stop rewriting your resume from scratch. ALBATROSS CAREER acts as your intelligent career database, letting you deploy your actual experience wherever it's needed most.
              </p>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-card border border-line bg-canvas p-6">
                <Target className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-lg font-semibold mb-2">Job Fit Analysis</h3>
                <p className="text-sm text-muted">Instantly understand how well your skills map to a job description, backed by evidence from your profile.</p>
              </div>
              <div className="rounded-card border border-line bg-canvas p-6">
                <FileText className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-lg font-semibold mb-2">Truthful Tailoring</h3>
                <p className="text-sm text-muted">Re-frame your existing experience to highlight relevance. Never hallucinated, perfectly ATS-friendly.</p>
              </div>
              <div className="rounded-card border border-line bg-canvas p-6">
                <Zap className="h-8 w-8 text-accent mb-4" />
                <h3 className="text-lg font-semibold mb-2">Interview Prep</h3>
                <p className="text-sm text-muted">Practice targeted mock interviews based specifically on your gaps against the target role.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Final CTA */}
        <section className="py-20 sm:py-32 text-center">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Ready to upgrade your job search?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
              Join early-career developers who are taking control of their professional narrative.
            </p>
            <div className="mt-8 flex justify-center">
              <Link to="/signup" className="btn-primary text-base px-6 py-3">
                Build your Career Profile
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}