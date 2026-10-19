'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Ticket,
  Clock,
  AlertCircle,
  Loader2,
  PlusCircle,
  ArrowRight,
  Search,
  Inbox,
} from 'lucide-react';
import { getTickets } from '@/lib/api';
import { Ticket as TicketType, TicketStatus, TicketPriority } from '@/types/ticket';
import { useAuth } from '@/context/AuthContext';

const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
  [TicketStatus.IN_PROGRESS]: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  [TicketStatus.RESOLVED]: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
  [TicketStatus.CLOSED]: 'bg-slate-800 text-slate-300 border-slate-700',
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'bg-slate-800 text-slate-300 border-slate-700',
  [TicketPriority.MEDIUM]: 'bg-blue-950/80 text-blue-400 border-blue-800/60',
  [TicketPriority.HIGH]: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  [TicketPriority.CRITICAL]: 'bg-rose-950/80 text-rose-400 border-rose-800/60',
};

export default function CustomerTicketsPage() {
  const { loading: authLoading } = useAuth();

  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;

    getTickets()
      .then((data) => {
        setTickets(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load your tickets. Please try again.';
        setError(errorMsg);
        setLoading(false);
      });
  }, [authLoading]);

  const filteredTickets = tickets.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.status.toLowerCase().includes(q) ||
      t.priority.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-5xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
            <Inbox className="w-7 h-7 text-blue-400" />
            My Support Tickets
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Track the status of all tickets submitted from your account.
          </p>
        </div>

        <Link
          href="/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01]"
        >
          <PlusCircle className="w-4 h-4" />
          New Ticket
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by ticket number, subject, status, or priority..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400 mt-3">Loading your tickets...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Failed to load tickets</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filteredTickets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-200">
            {tickets.length === 0 ? 'No tickets yet' : 'No matching tickets'}
          </h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            {tickets.length === 0
              ? 'When you submit a support ticket, it will appear here with its status and priority.'
              : 'Try adjusting your search to find the ticket you are looking for.'}
          </p>
          {tickets.length === 0 && (
            <Link
              href="/tickets/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Your First Ticket
            </Link>
          )}
        </div>
      )}

      {/* Ticket list */}
      {!loading && !error && filteredTickets.length > 0 && (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}`}
              className="group block bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/20 hover:border-blue-500/50 hover:bg-slate-850 transition-all p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded-md">
                      {ticket.ticketNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[ticket.status]}`}
                    >
                      <Clock className="w-3 h-3" />
                      {ticket.status}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PRIORITY_STYLES[ticket.priority]}`}
                    >
                      {ticket.priority} Priority
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 group-hover:text-blue-400 truncate">
                    {ticket.subject}
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5 line-clamp-2">{ticket.description}</p>
                </div>

                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}