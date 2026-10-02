"use client";
import React, { useState } from 'react';
import Link from 'next/link';

const LOGO_FILTER = 'brightness(0) saturate(100%) invert(20%) sepia(34%) saturate(1200%) hue-rotate(100deg) brightness(94%)';

export function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <footer className="bg-cream-soft border-t border-[color:var(--line)] mt-auto">
      <div className="container-page py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-14">
          {/* Newsletter */}
          <div className="lg:col-span-2 max-w-xl">
            <h3 className="font-montserrat font-bold text-2xl text-ink mb-2">Grow with us.</h3>
            <p className="text-[color:var(--muted)] mb-5">Get a monthly note on upcoming drives, new pledges, and the forests we&apos;re growing together.</p>
            {status === 'done' ? (
              <p className="text-forest font-semibold">🌱 You&apos;re in. Welcome to the community!</p>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="flex-1 bg-white border border-[color:var(--line)] rounded-full px-5 py-3 focus:border-leaf focus:outline-none focus:ring-4 focus:ring-leaf/15"
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="rounded-full bg-forest text-white px-7 py-3 font-semibold hover:bg-forest-700 transition-colors disabled:opacity-60"
                >
                  {status === 'loading' ? 'Joining…' : 'Subscribe'}
                </button>
              </form>
            )}
            {status === 'error' && <p className="text-red-500 text-sm mt-2">Something went wrong. Please try again.</p>}
            <p className="text-[color:var(--muted)] text-sm mt-3">
              Monthly digest. Unsubscribe anytime. See our{' '}
              <Link href="/privacy" className="underline hover:text-forest">Privacy Policy</Link>.
            </p>
          </div>

          {/* Explore + Connect */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-ink mb-4">Explore</h4>
              <ul className="space-y-3 text-[15px]">
                <li><Link href="/pledges" className="text-[color:var(--muted)] hover:text-forest">Pledges</Link></li>
                <li><Link href="/quiz" className="text-[color:var(--muted)] hover:text-forest">Quizzes</Link></li>
                <li><Link href="/certificates" className="text-[color:var(--muted)] hover:text-forest">Certificates</Link></li>
                <li><Link href="/events" className="text-[color:var(--muted)] hover:text-forest">Events</Link></li>
                <li><Link href="/calendar" className="text-[color:var(--muted)] hover:text-forest">Calendar</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-ink mb-4">Connect</h4>
              <ul className="space-y-3 text-[15px]">
                <li><Link href="/organizations" className="text-[color:var(--muted)] hover:text-forest">Partner with us</Link></li>
                <li><Link href="/organizations" className="text-[color:var(--muted)] hover:text-forest">For organizations</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-[color:var(--line)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/communitree-logo.png" alt="COMMUNITREE" style={{ height: 32, width: 'auto', display: 'block', filter: LOGO_FILTER }} />
            <span className="text-[color:var(--muted)] text-lg font-light leading-none mb-1">&amp;</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/ezone-logo.png" alt="EZONE" style={{ height: 26, width: 'auto', display: 'block' }} />
          </div>
          <div className="flex flex-col sm:items-end gap-1">
            <Link href="/privacy" className="text-[color:var(--muted)] text-sm hover:text-forest underline">
              Privacy Policy &amp; Terms
            </Link>
            <Link href="/takedown" className="text-[color:var(--muted)] text-sm hover:text-forest underline">
              Report content / Takedown
            </Link>
            <p className="text-[color:var(--muted)] text-sm text-center sm:text-right">
              Turning intentions into action. · © {new Date().getFullYear()} COMMUNITREE &amp; EZONE
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
