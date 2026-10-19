'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, ShieldCheck, Wifi, LifeBuoy, ArrowRight, Inbox } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function CustomerHomePage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  // Redirect agents to their own dashboard
  useEffect(() => {
    if (!loading && session && (session.role === 'AGENT' || session.role === 'ADMIN')) {
      router.replace('/agent');
    }
  }, [loading, session, router]);

  if (loading || !session) return null;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      {/* Hero Banner */}
      <div className="text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/80 text-blue-400 text-xs font-semibold border border-blue-800/80">
          <Wifi className="w-3.5 h-3.5 text-blue-400" />
          ISP Customer Operations &amp; Support
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
          How can we help you,{' '}
          <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            {session.name}
          </span>
          ?
        </h1>
        <p className="text-slate-400 text-base max-w-xl mx-auto">
          Encountering connectivity problems, red optical LOS lights, or router issues? Submit a
          support ticket and our engineering team will assist you.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/tickets/new"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            Submit a Support Ticket
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          <Link
            href="/tickets"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm shadow-sm transition-all hover:border-blue-500"
          >
            <Inbox className="w-4 h-4 text-blue-400" />
            View My Tickets
          </Link>
        </div>
      </div>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg shadow-black/20 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60 flex items-center justify-center">
            <PlusCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Direct Issue Logging</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Report optical signal drops, router failures, or speed degradation in seconds with our
            streamlined ticket form.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg shadow-black/20 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Unique Tracking Number</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every submission generates a human-readable identifier (e.g. TIC-1001) for fast
            follow-up and verification.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg shadow-black/20 space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 flex items-center justify-center">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Verified Customer Profile</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tickets are automatically tied to your active broadband subscription account for prompt
            diagnostic response.
          </p>
        </div>
      </div>
    </div>
  );
}
