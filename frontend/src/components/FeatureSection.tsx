"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureProps {
  number: string;
  title: string;
  description: string;
  bullets: string[];
  reversed?: boolean;
  mockup: React.ReactNode;
}

const features: FeatureProps[] = [
  {
    number: "01",
    title: "Discover",
    description: "Find relevant opportunities that actually match your skills. Our AI continuously scans thousands of boards to bring the best roles directly to you.",
    bullets: ["Smart role matching algorithms", "Hidden opportunity detection", "Salary transparency insights"],
    reversed: false,
    mockup: (
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm">
        <div className="h-4 w-24 bg-white/10 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4 p-4 bg-brand-surface-hover rounded-xl border border-white/5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-brand-accent/10" />
              <div className="flex-1">
                <div className="h-3 w-32 bg-white/10 rounded mb-2" />
                <div className="h-2 w-20 bg-white/5 rounded" />
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
            <div className="h-3 w-16 bg-white/10 rounded" />
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
          <div className="bg-brand-surface-hover/10 rounded-xl p-4 rounded-tl-none mr-8">
            <p className="text-sm text-white/90">"Can you walk me through a time you had to pivot a major technical decision late in the project?"</p>
          </div>
          <div className="bg-brand-accent/20 rounded-xl p-4 rounded-tr-none ml-8 text-right">
            <div className="h-2 w-32 bg-brand-surface-hover/40 rounded inline-block mb-1" />
            <div className="h-2 w-48 bg-brand-surface-hover/40 rounded inline-block" />
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
        {['Applied', 'Interviewing'].map((col, idx) => (
          <div key={idx} className="flex-1 bg-brand-bg rounded-xl p-3 border border-white/5 flex flex-col gap-2">
            <span className="text-xs font-medium text-brand-muted">{col}</span>
            <div className="bg-brand-surface-hover p-3 rounded-lg border border-white/5 shadow-sm">
              <div className="h-2 w-16 bg-white/10 rounded mb-2" />
              <div className="h-2 w-10 bg-white/5 rounded" />
            </div>
            {idx === 0 && (
              <div className="bg-brand-surface-hover p-3 rounded-lg border border-white/5 shadow-sm opacity-50">
                <div className="h-2 w-20 bg-white/10 rounded mb-2" />
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }
];

export default function FeatureSection() {
  return (
    <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-32">
        {features.map((feature, idx) => (
          <div 
            key={feature.number} 
            className={cn(
              "flex flex-col md:flex-row items-center gap-12 lg:gap-24",
              feature.reversed ? "md:flex-row-reverse" : ""
            )}
          >
            <motion.div 
              initial={{ opacity: 0, x: feature.reversed ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex-1 space-y-6"
            >
              <span className="text-brand-muted font-mono text-sm">{feature.number} — {feature.title}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-brand-text tracking-tight">
                {feature.description.split('.')[0]}.
              </h2>
              <p className="text-brand-muted text-lg leading-relaxed">
                {feature.description.split('.').slice(1).join('.').trim()}
              </p>
              
              <ul className="space-y-3 pt-4">
                {feature.bullets.map((bullet, i) => (
                  <li key={i} className="flex items-center gap-3 text-brand-text font-medium">
                    <div className="w-5 h-5 rounded-full bg-brand-accent/10 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-brand-accent" />
                    </div>
                    {bullet}
                  </li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full"
            >
              <div className="relative">
                {/* Decorative background element */}
                <div className="absolute -inset-4 bg-brand-surface/50 rounded-[32px] -z-10" />
                {feature.mockup}
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </section>
  );
}
