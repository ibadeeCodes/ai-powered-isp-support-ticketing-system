'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Ticket,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Inbox,
  CalendarDays,
  Users,
  UserCheck,
} from 'lucide-react';
import { getTicketById } from '@/lib/api';
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

export default function TicketDetailPage() {
  const params = useParams();
  const { loading: authLoading } = useAuth();

  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const rawId = params?.id;
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;

    if (!id) {
      setError('Missing ticket ID.');
      setLoading(false);
      return;
    }

    getTicketById(id)
      .then((data) => {
        setTicket(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load this ticket. Please try again.';
        setError(errorMsg);
        setLoading(false);
      });
  }, [authLoading, params]);

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Back link */}
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to My Tickets
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          <p className="text-sm text-slate-400 mt-3">Loading ticket details...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Failed to load ticket</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Ticket detail */}
      {ticket && !loading && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden text-slate-100">
          {/* Header */}
          <div className="p-6 bg-slate-950 border-b border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950/80 border border-blue-800/60 px-2.5 py-1 rounded-md">
                  {ticket.ticketNumber}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mt-2">
                  {ticket.subject}
                </h1>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_STYLES[ticket.status]}`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {ticket.status}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${PRIORITY_STYLES[ticket.priority]}`}
                >
                  {ticket.priority} Priority
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Description
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 rounded-xl p-4 border border-slate-800">
                {ticket.description}
              </p>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Created
                </span>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  {new Date(ticket.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Last Updated
                </span>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-slate-500" />
                  {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Assignment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Assigned Team
                </span>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-400" />
                  {ticket.assignedTeam?.name ?? 'No team assigned'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Assigned Agent
                </span>
                <p className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  {ticket.assignedAgent ? ticket.assignedAgent.name : 'No agent assigned'}
                </p>
              </div>
            </div>

            {/* Customer info when available (agent view) */}
            {ticket.customer && (
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-900/60">
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1.5">
                  Customer
                </h2>
                <p className="text-sm font-semibold text-slate-100">{ticket.customer.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {ticket.customer.email}
                  {ticket.customer.email && ticket.customer.phone ? ' • ' : ''}
                  {ticket.customer.phone}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fallback when ticket not found */}
      {!ticket && !loading && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Ticket not found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">
            This ticket could not be located. It may have been removed or you may not have access.
          </p>
          <Link
            href="/tickets"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all"
          >
            <Inbox className="w-4 h-4" />
            Back to My Tickets
          </Link>
        </div>
      )}
    </div>
  );
}