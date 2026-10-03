import React from 'react';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-brand-bg pt-20 pb-10 border-t border-brand-border px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-text flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-bg"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
              <span className="font-semibold text-xl tracking-tight text-brand-text">Nexus</span>
            </Link>
            <p className="text-sm text-brand-muted max-w-xs mb-6">
              The intelligent career platform. Build better resumes, prep for interviews, and land your dream role.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-brand-muted hover:text-brand-text transition-colors">Twitter</a>
              <a href="#" className="text-brand-muted hover:text-brand-text transition-colors">LinkedIn</a>
              <a href="#" className="text-brand-muted hover:text-brand-text transition-colors">GitHub</a>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-brand-text mb-4 text-sm">Product</h4>
            <ul className="space-y-3 text-sm text-brand-muted">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Changelog</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Integration</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-brand-text mb-4 text-sm">Resources</h4>
            <ul className="space-y-3 text-sm text-brand-muted">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Career Guides</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Resume Templates</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Help Center</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-brand-text mb-4 text-sm">Legal</h4>
            <ul className="space-y-3 text-sm text-brand-muted">
              <li><a href="#" className="hover:text-brand-accent transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-brand-accent transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-brand-muted">
            © {currentYear} Nexus Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            <span>Designed with</span>
            <span className="text-red-500">♥</span>
            <span>for professionals</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
