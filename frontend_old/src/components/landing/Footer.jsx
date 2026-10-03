import { Link } from 'react-router-dom'
import { BrandMark } from '../layout/Brand'
import { Github, Twitter, Linkedin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-line/40 bg-surface/50 pb-12 pt-20">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
              <BrandMark className="h-8 w-8 text-accent" />
              <span className="font-semibold tracking-[0.16em] text-ink text-xl">
                ALBATROSS CAREER
              </span>
            </Link>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
              An AI career workspace that turns your real skills, experience, projects, and achievements into better job applications.
            </p>
            <div className="mt-8 flex gap-5">
              <a href="https://github.com/SaiKrishna181707/Advanced-RAG-based-knowledge-assistant" className="text-muted hover:text-ink transition-colors">
                <span className="sr-only">GitHub</span>
                <Github className="h-5 w-5" />
              </a>
              <span className="text-muted cursor-not-allowed">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-5 w-5" />
              </span>
              <span className="text-muted cursor-not-allowed">
                <span className="sr-only">LinkedIn</span>
                <Linkedin className="h-5 w-5" />
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Product</h3>
            <ul className="mt-6 space-y-4">
              <li><a href="#how-it-works" className="text-sm text-muted hover:text-accent transition-colors">How it works</a></li>
              <li><a href="#pricing" className="text-sm text-muted hover:text-accent transition-colors">Pricing</a></li>
              <li><span className="text-sm text-muted cursor-not-allowed">Changelog</span></li>
              <li><a href="https://github.com/SaiKrishna181707/Advanced-RAG-based-knowledge-assistant" className="text-sm text-muted hover:text-accent transition-colors">Documentation</a></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-ink">Legal & Privacy</h3>
            <ul className="mt-6 space-y-4">
              <li><span className="text-sm text-muted cursor-not-allowed">Privacy Policy</span></li>
              <li><span className="text-sm text-muted cursor-not-allowed">Terms of Service</span></li>
              <li><span className="text-sm text-muted cursor-not-allowed">Data Security</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-6 border-t border-line/40 pt-8 sm:flex-row">
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} ALBATROSS CAREER. All rights reserved.
          </p>
          <p className="text-xs text-muted/60">
            Your career profile and resumes stay private in your account.
          </p>
        </div>
      </div>
    </footer>
  )
}