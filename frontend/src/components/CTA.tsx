"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from './ui/button';

export default function CTA() {
  return (
    <section className="py-24 px-6 max-w-5xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
        className="bg-brand-text rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden"
      >
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-accent/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight max-w-2xl">
            Your next opportunity starts here.
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl">
            Join thousands of professionals using AI to build better resumes, ace their interviews, and land their dream roles.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link href="/signin" className="w-full sm:w-auto">
              <Button variant="accent" size="lg" className="w-full sm:w-auto px-8" asChild>
                Start for free
              </Button>
            </Link>
            <Link href="/#demo" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto px-8 border-white/20 text-white hover:bg-white/10 hover:text-white" asChild>
                View demo
              </Button>
            </Link>
          </div>
          <p className="text-white/40 text-xs mt-6">No credit card required. 14-day free trial on Pro.</p>
        </div>
      </motion.div>
    </section>
  );
}
