"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    // Simulate auth request
    setTimeout(() => {
      setIsSubmitting(false);
      alert('Authentication would happen here!');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 px-6 sm:px-6 lg:px-8 font-sans selection:bg-brand-accent/20">
      
      {/* Decorative background blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-10 h-10 rounded-xl bg-brand-text flex items-center justify-center transition-transform group-hover:scale-105">
            <span className="text-brand-bg font-bold text-xl">E</span>
          </div>
          <span className="font-semibold text-2xl tracking-tight text-brand-text">ElevateAI</span>
        </Link>
        
        <h2 className="text-center text-3xl font-bold tracking-tight text-brand-text">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-brand-muted">
          Don't have an account?{' '}
          <Link href="/signin" className="font-medium text-brand-accent hover:text-brand-accent-hover transition-colors">
            Sign up for free
          </Link>
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <Card className="p-8 shadow-xl shadow-black/[0.03] border-brand-border/60">
          <div className="flex flex-col gap-4">
            
            <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-3 bg-brand-surface-hover hover:bg-brand-surface border-brand-border">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-medium text-brand-text">Continue with Google</span>
            </Button>
            
            <Button variant="outline" className="w-full h-12 flex items-center justify-center gap-3 bg-brand-surface-hover hover:bg-brand-surface border-brand-border">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.05 2.26.45 3.05.45.71 0 1.96-.54 3.41-.45 1.35.04 2.51.37 3.39 1.15-2.73 1.6-2.25 5.36.49 6.42-.69 1.93-1.43 3.52-2.34 5.4zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="font-medium text-brand-text">Continue with Apple</span>
            </Button>

          </div>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-brand-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-brand-surface text-brand-muted">Or continue with email</span>
              </div>
            </div>

            <div className="mt-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-brand-text sr-only">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full appearance-none rounded-xl border border-brand-border bg-brand-surface-hover px-4 py-3 text-brand-text placeholder-gray-400 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent sm:text-sm transition-colors shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <Button 
                    type="submit" 
                    variant="accent" 
                    className="w-full h-11"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border-2 border-brand-bg/30 border-t-brand-bg animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign in with Email"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>
        <p className="mt-6 text-center text-xs text-brand-muted max-w-xs mx-auto">
          By clicking continue, you agree to our{' '}
          <a href="#" className="underline hover:text-brand-text transition-colors">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="underline hover:text-brand-text transition-colors">Privacy Policy</a>.
        </p>
      </motion.div>
    </div>
  );
}
