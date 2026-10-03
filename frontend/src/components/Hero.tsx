"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import Link from 'next/link';
import { Sparkles, Briefcase, FileText } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 overflow-hidden min-h-[80vh] flex flex-col justify-center">
      
      {/* Background Animated Grid */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23F5F1EB' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          maskImage: 'radial-gradient(ellipse at center, black 10%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 10%, transparent 80%)'
        }} 
      />

      {/* Glow Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-accent/20 rounded-full blur-[120px] pointer-events-none -z-10" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.2, 0.4, 0.2] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-accent-secondary/10 rounded-full blur-[120px] pointer-events-none -z-10" 
      />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        
        {/* Floating Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="absolute -top-12 -left-12 hidden md:flex items-center gap-2 bg-brand-surface border border-brand-border px-4 py-2 rounded-full shadow-lg"
        >
          <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
          <span className="text-xs font-semibold text-brand-text">10x Application Rate</span>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="absolute top-12 -right-8 hidden md:flex items-center gap-2 bg-brand-surface border border-brand-border px-4 py-2 rounded-full shadow-lg"
        >
          <Sparkles size={14} className="text-brand-accent-secondary" />
          <span className="text-xs font-semibold text-brand-text">AI Tailoring</span>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-block mb-6"
        >
          <span className="bg-brand-accent/10 text-brand-accent border border-brand-accent/20 text-xs font-bold tracking-wider uppercase px-4 py-1.5 rounded-full">
            AI-Powered Career Platform
          </span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-brand-text mb-6"
        >
          Build your career with <br className="hidden md:block"/> 
          <span className="text-brand-accent relative inline-block">
            intelligence.
            <motion.div 
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="absolute -bottom-2 left-0 w-full h-1 bg-brand-accent/50 rounded-full origin-left"
            />
          </span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-brand-muted mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          Unlock your professional potential with an AI co-pilot that tailors your resume, matches you with the right roles, and prepares you for every interview.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/signin">
            <Button size="lg" className="w-full sm:w-auto px-8 group relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <motion.span 
                  className="inline-block"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </Button>
          </Link>
          <Button variant="outline" size="lg" className="w-full sm:w-auto px-8">
            Explore Features
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
