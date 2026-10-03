"use client";
import React from 'react';
import Link from 'next/link';
import { Button } from './ui/button';
import { motion } from 'framer-motion';

export default function Hero() {
  return (
    <section className="pt-32 pb-16 px-6 md:pt-48 md:pb-24 max-w-7xl mx-auto flex flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-accent bg-brand-accent/10 rounded-full mb-6">
          AI-powered career platform
        </span>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-brand-text mb-6 max-w-4xl">
          Build your career with <span className="text-brand-accent">intelligence.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-brand-muted max-w-2xl mb-10 leading-relaxed">
          Unlock your professional potential with an AI co-pilot that tailors your resume, matches you with the right roles, and prepares you for every interview.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/signin" className="w-full sm:w-auto">
            <Button variant="accent" size="lg" className="w-full sm:w-auto" asChild>
              Get Started
            </Button>
          </Link>
          <Link href="#features" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto" asChild>
              Explore Features
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
