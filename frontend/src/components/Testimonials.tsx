"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';

const testimonials = [
  {
    quote: "I was applying for months with no response. Nexus tailored my resume to highlight my architectural decisions, and I landed 3 interviews in a week.",
    author: "Sarah J.",
    role: "Senior Staff Engineer",
    metric: "+300% interview rate"
  },
  {
    quote: "The AI interview prep was incredibly accurate. It asked me three questions that actually came up in my final loop at Meta.",
    author: "Michael T.",
    role: "Product Manager",
    metric: "Landed offer"
  },
  {
    quote: "Finally a tool that doesn't just stuff keywords, but actually rewrites my impact beautifully. Clean, simple, and effective.",
    author: "Elena R.",
    role: "UX Designer",
    metric: "Saved 15+ hours"
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-2xl font-semibold text-brand-text mb-2">Trusted by professionals</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((test, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
          >
            <Card className="p-6 h-full flex flex-col justify-between bg-brand-surface shadow-sm border-brand-border/60">
              <div className="mb-6">
                <p className="text-brand-text leading-relaxed text-sm font-medium">"{test.quote}"</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-surface-hover flex items-center justify-center text-brand-muted font-bold text-sm">
                    {test.author.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-text">{test.author}</p>
                    <p className="text-xs text-brand-muted">{test.role}</p>
                  </div>
                </div>
                {test.metric && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-full">
                    {test.metric}
                  </span>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
