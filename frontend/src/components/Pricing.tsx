"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for exploring the platform and basic resume building.",
    features: [
      "1 AI-tailored resume per month",
      "Basic job matching",
      "Standard ATS analysis",
      "Community support"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    name: "Pro",
    price: "$19",
    period: "/mo",
    description: "For serious job seekers ready to land their next role.",
    features: [
      "Unlimited AI resumes",
      "Advanced opportunity discovery",
      "Unlimited ATS scoring",
      "AI Interview Prep (5/mo)",
      "Priority email support"
    ],
    cta: "Upgrade to Pro",
    popular: true
  },
  {
    name: "Premium",
    price: "$49",
    period: "/mo",
    description: "Complete career management and unlimited AI resources.",
    features: [
      "Everything in Pro",
      "Unlimited AI Interview Prep",
      "Salary negotiation coach",
      "Cover letter generation",
      "1-on-1 human review (monthly)"
    ],
    cta: "Get Premium",
    popular: false
  }
];

export default function Pricing() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section id="pricing" className="py-24 px-6 bg-brand-surface border-y border-brand-border/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-text mb-4">Simple, transparent pricing</h2>
          <p className="text-lg text-brand-muted max-w-xl mx-auto">Invest in your career with a plan that fits your goals.</p>
        </div>

        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {plans.map((plan, idx) => {
            const isHighlighted = hoveredIndex === idx || (hoveredIndex === null && plan.popular);
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                <Card className={`h-full flex flex-col p-8 transition-colors duration-300 ${isHighlighted ? 'border-brand-accent shadow-lg shadow-brand-accent/5' : 'border-brand-border/80 shadow-sm'}`}>
                  {plan.popular && (
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full transition-colors duration-300 ${isHighlighted ? 'bg-brand-accent text-[#0A0A0E]' : 'bg-brand-muted text-white'}`}>
                      Most Popular
                    </div>
                  )}
                  
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-brand-text mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-4xl font-bold text-brand-text">{plan.price}</span>
                      {plan.period && <span className="text-brand-muted">{plan.period}</span>}
                    </div>
                    <p className="text-sm text-brand-muted h-10">{plan.description}</p>
                  </div>
                  
                  <div className="flex-1">
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-brand-text">
                          <Check size={16} className={`mt-0.5 flex-shrink-0 transition-colors duration-300 ${isHighlighted ? 'text-brand-accent' : 'text-brand-muted'}`} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Link href="/signin">
                    <Button 
                      variant={isHighlighted ? "accent" : "outline"} 
                      className="w-full"
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
