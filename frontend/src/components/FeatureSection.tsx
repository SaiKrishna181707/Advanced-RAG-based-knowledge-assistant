"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const features = [
  {
    number: "01",
    title: "Discover",
    description: "Find relevant opportunities perfectly matched to your skills. Our AI scans thousands of job postings to find where you're most likely to succeed.",
    bullets: ["Smart skill matching", "Hidden opportunity detection", "Salary and culture alignment"],
    reversed: false,
    mockup: (
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm">
        <h4 className="font-semibold text-brand-text mb-4 text-sm">Recommended Matches</h4>
        <div className="space-y-3">
          {[
            { title: "Senior React Engineer", company: "Linear", match: "98%" },
            { title: "Frontend Lead", company: "Notion", match: "94%" },
            { title: "Software Engineer III", company: "Netflix", match: "91%" }
          ].map((job, i) => (
            <div key={i} className="flex gap-4 p-4 bg-brand-surface-hover rounded-xl border border-white/5 shadow-sm items-center hover:border-brand-accent/50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold">
                {job.company[0]}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-brand-text">{job.title}</div>
                <div className="text-xs text-brand-muted">{job.company}</div>
              </div>
              <div className="text-xs font-semibold text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-full">
                {job.match}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    number: "02",
    title: "Analyze",
    description: "Understand your role fit and identify missing requirements before you apply. Compare your profile against job descriptions instantly.",
    bullets: ["Instant ATS compatibility scoring", "Skill gap analysis", "Competitor benchmarking"],
    reversed: true,
    mockup: (
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-brand-muted">Frontend Lead - Notion</h4>
            <div className="text-4xl font-bold text-brand-text">84%</div>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-brand-accent flex items-center justify-center">
            <span className="font-semibold text-brand-accent">Fit</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-brand-accent w-[84%]" />
          </div>
          <div className="flex justify-between text-xs text-brand-muted">
            <span>Profile Match</span>
            <span>High</span>
          </div>
        </div>
      </div>
    )
  },
  {
    number: "03",
    title: "Tailor",
    description: "Improve your resume content while keeping claims entirely truthful. Generate role-specific bullet points that highlight your most relevant experience.",
    bullets: ["Context-aware phrasing suggestions", "Automated keyword optimization", "Multiple resume versions"],
    reversed: false,
    mockup: (
       <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm flex flex-col gap-4">
        <div className="p-4 bg-brand-surface-hover border border-red-900/30 rounded-xl relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 rounded-l-xl" />
          <p className="text-sm line-through text-gray-400">Led a team of developers to build the app.</p>
        </div>
        <div className="p-4 bg-brand-surface-hover border border-brand-accent/20 rounded-xl relative shadow-sm">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-accent rounded-l-xl" />
          <p className="text-sm text-brand-text font-medium">Spearheaded a 5-person engineering team to architect and launch the mobile application, increasing user retention by 24%.</p>
        </div>
      </div>
    )
  },
  {
    number: "04",
    title: "Prepare",
    description: "Generate interview preparation materials based on the target role, company culture, and your specific experience.",
    bullets: ["Custom technical questions", "Behavioral scenario generation", "Company insight briefing"],
    reversed: true,
    mockup: (
      <div className="bg-brand-surface border border-brand-border text-brand-text rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-6 text-brand-accent">
          <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider">AI Interviewer Active</span>
        </div>
        <div className="space-y-4">
          <div className="bg-white/10 rounded-xl p-4 rounded-tl-none mr-8">
            <p className="text-sm text-brand-text">"Can you walk me through a time you had to pivot a major technical decision late in the project?"</p>
          </div>
          <div className="bg-brand-accent/20 rounded-xl p-4 rounded-tr-none ml-8 text-right">
            <p className="text-sm text-brand-text">"At my previous role, we realized our database schema wouldn't scale right before beta launch..."</p>
          </div>
        </div>
      </div>
    )
  },
  {
    number: "05",
    title: "Track",
    description: "Manage applications, track interviews, and automate follow-ups all in one clean Kanban interface.",
    bullets: ["Visual application pipeline", "Automated follow-up reminders", "Interview scheduling integration"],
    reversed: false,
    mockup: (
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-4 shadow-sm flex gap-3 h-48 overflow-hidden">
        
        <div className="flex-1 bg-brand-bg rounded-xl p-3 border border-white/5 flex flex-col gap-2">
          <span className="text-xs font-medium text-brand-muted">Applied (24)</span>
          <div className="bg-brand-surface p-3 rounded-lg border border-white/5 shadow-sm hover:border-brand-accent/30 transition-colors cursor-pointer">
            <div className="text-xs font-semibold text-brand-text">Software Engineer</div>
            <div className="text-[10px] text-brand-muted">Vercel • 2d ago</div>
          </div>
          <div className="bg-brand-surface p-3 rounded-lg border border-white/5 shadow-sm opacity-60">
            <div className="text-xs font-semibold text-brand-text">Frontend Dev</div>
            <div className="text-[10px] text-brand-muted">Shopify • 3d ago</div>
          </div>
        </div>

        <div className="flex-1 bg-brand-bg rounded-xl p-3 border border-white/5 flex flex-col gap-2">
          <span className="text-xs font-medium text-brand-muted">Interviewing (5)</span>
          <div className="bg-brand-surface p-3 rounded-lg border border-brand-accent/50 shadow-sm relative overflow-hidden cursor-pointer hover:border-brand-accent transition-colors">
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent" />
            <div className="text-xs font-semibold text-brand-text mt-1">Sr. React Engineer</div>
            <div className="text-[10px] text-brand-muted">Stripe • Tech Screen</div>
          </div>
        </div>

      </div>
    )
  }
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto space-y-32">
        {features.map((feature, index) => (
          <div key={feature.number} className={`flex flex-col md:flex-row gap-12 lg:gap-24 items-center ${feature.reversed ? 'md:flex-row-reverse' : ''}`}>
            
            {/* Text Side */}
            <motion.div 
              initial={{ opacity: 0, x: feature.reversed ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex-1 space-y-6"
            >
              <div className="flex items-center gap-4 text-brand-muted font-mono text-sm">
                <span>{feature.number}</span>
                <span className="w-8 h-px bg-brand-border"></span>
                <span>{feature.title}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">
                {feature.description.split('.')[0]}.
              </h2>
              <p className="text-lg text-brand-muted">
                {feature.description.split('.').slice(1).join('.').trim()}
              </p>
              
              <ul className="space-y-3 pt-4">
                {feature.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-center gap-3 text-brand-text font-medium text-sm">
                    <div className="w-5 h-5 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-brand-accent" />
                    </div>
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Mockup Side */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full max-w-md mx-auto relative"
            >
              <div className="absolute -inset-4 bg-brand-surface/50 rounded-[32px] -z-10" />
              {feature.mockup}
            </motion.div>

          </div>
        ))}
      </div>
    </section>
  );
}
