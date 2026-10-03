"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/card';
import { Briefcase, CheckCircle2, Star, TrendingUp, Sparkles, FileText, ChevronRight } from 'lucide-react';

export default function DashboardPreview() {
  return (
    <div className="max-w-6xl mx-auto px-6 mb-32">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="relative"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-brand-accent/5 blur-[100px] rounded-full z-0" />
        
        <div className="relative z-10 bg-brand-surface rounded-[32px] p-4 md:p-8 border border-brand-border shadow-2xl flex flex-col gap-6">
          
          {/* Top Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Profile / Resume Score */}
            <Card className="col-span-1 md:col-span-1 bg-brand-surface-hover border-none shadow-none p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-semibold text-brand-text mb-1">Resume Score</h3>
                  <p className="text-xs text-brand-muted">Based on 100+ industry markers</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold text-xl">
                  92
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted flex items-center gap-1.5"><CheckCircle2 size={14} className="text-brand-accent" /> Impact</span>
                  <span className="font-medium text-brand-text">95/100</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-muted flex items-center gap-1.5"><CheckCircle2 size={14} className="text-brand-accent" /> ATS Readability</span>
                  <span className="font-medium text-brand-text">88/100</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
                  <div className="bg-brand-accent h-1.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </Card>

            {/* AI Suggestions */}
            <Card className="col-span-1 md:col-span-2 p-6 flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-brand-accent" />
                <h3 className="font-semibold text-brand-text">AI Suggestions</h3>
              </div>
              <div className="space-y-3">
                <div className="bg-brand-surface-hover border border-brand-border rounded-xl p-3 flex justify-between items-center group cursor-pointer hover:border-brand-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                      <Star size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-text group-hover:text-brand-accent transition-colors">Quantify your achievements</p>
                      <p className="text-xs text-brand-muted">Add metrics to your recent role</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </div>
                <div className="bg-brand-surface-hover border border-brand-border rounded-xl p-3 flex justify-between items-center group cursor-pointer hover:border-brand-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <FileText size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-brand-text group-hover:text-brand-accent transition-colors">Missing keywords detected</p>
                      <p className="text-xs text-brand-muted">"React Native" is highly requested</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-brand-muted" />
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Job Match */}
            <Card className="p-6">
              <h3 className="font-semibold text-brand-text mb-4">Top Job Matches</h3>
              <div className="space-y-4">
                {[
                  { title: "Senior Frontend Engineer", company: "Stripe", match: 94, icon: <Briefcase size={16}/> },
                  { title: "Product Designer", company: "Vercel", match: 89, icon: <Briefcase size={16}/> }
                ].map((job, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand-surface-hover flex items-center justify-center text-brand-text">
                        {job.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-brand-text">{job.title}</p>
                        <p className="text-xs text-brand-muted">{job.company}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-brand-accent">{job.match}%</span>
                      <p className="text-[10px] uppercase tracking-wider text-brand-muted">Match</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Application Pipeline */}
            <Card className="p-6 bg-brand-surface-hover border-brand-border relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full -mr-10 -mt-10 blur-xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-brand-text">Application Pipeline</h3>
                  <TrendingUp size={18} className="text-brand-muted" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-brand-bg rounded-xl p-3">
                    <p className="text-brand-muted text-xs mb-1">Applied</p>
                    <p className="text-2xl font-semibold text-brand-text">24</p>
                  </div>
                  <div className="bg-brand-bg rounded-xl p-3">
                    <p className="text-brand-muted text-xs mb-1">Interviews</p>
                    <p className="text-2xl font-semibold text-brand-text">5</p>
                  </div>
                  <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-xl p-3">
                    <p className="text-brand-accent text-xs mb-1">Offers</p>
                    <p className="text-2xl font-semibold text-brand-text">2</p>
                  </div>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
