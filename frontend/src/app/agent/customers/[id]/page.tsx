'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  UserCircle2,
  Mail,
  Phone,
  Calendar,
  Ticket,
  Clock,
  AlertCircle,
  Loader2,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { getAgentCustomerById, getAgentCustomerTickets } from '@/lib/api';
import {
  AgentCustomerProfile,
  AgentCustomerTicket,
  AgentCustomerTicketsPage,
} from '@/types/ticket';
import { useAuth } from '@/context/AuthContext';

// ---------------------------------------------------------------------------
// Style maps (Dark Theme)
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
  IN_PROGRESS: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  RESOLVED: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
  CLOSED: 'bg-slate-800 text-slate-300 border-slate-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: 'bg-slate-800 text-slate-300',
  MEDIUM: 'bg-blue-950/80 text-blue-400 border border-blue-800/60',
  HIGH: 'bg-amber-950/80 text-amber-400 border border-amber-800/60',
  CRITICAL: 'bg-rose-950/80 text-rose-400 border border-rose-800/60',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TicketRow({ ticket }: { ticket: AgentCustomerTicket }) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-800/80 bg-slate-950/50 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/60">
            {ticket.ticketNumber}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[ticket.status] ?? 'bg-slate-800 text-slate-300 border-slate-700'}`}
          >
            <Clock className="w-3 h-3" />
            {ticket.status.replace('_', ' ')}
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[ticket.priority] ?? 'bg-slate-800 text-slate-300'}`}
          >
            {ticket.priority}
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-blue-400">
          {ticket.subject}
        </p>
      </div>
      <span className="text-xs text-slate-500 flex-shrink-0 mt-1">{timeAgo(ticket.createdAt)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AgentCustomerDetailPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  // ── Customer Profile State ────────────────────────────────────────────────
  const [customer, setCustomer] = useState<AgentCustomerProfile | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [customerError, setCustomerError] = useState<string | null>(null);

  // ── Customer Tickets State ────────────────────────────────────────────────
  const [ticketsPage, setTicketsPage] = useState<AgentCustomerTicketsPage | null>(null);
  const [ticketCurrentPage, setTicketCurrentPage] = useState(1);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  // Redirect customers away from agent pages
  useEffect(() => {
    if (!authLoading && session?.role === 'CUSTOMER') {
      router.replace('/');
    }
  }, [authLoading, session, router]);

  const fetchCustomerProfile = useCallback(async (customerId: string) => {
    setLoadingCustomer(true);
    setCustomerError(null);
    try {
      const data = await getAgentCustomerById(customerId);
      setCustomer(data);
    } catch (err: unknown) {
      setCustomerError(err instanceof Error ? err.message : 'Failed to load customer profile.');
    } finally {
      setLoadingCustomer(false);
    }
  }, []);

  const fetchCustomerTickets = useCallback(async (customerId: string, page: number) => {
    setLoadingTickets(true);
    setTicketsError(null);
    try {
      const data = await getAgentCustomerTickets(customerId, { page, limit: 10 });
      setTicketsPage(data);
    } catch (err: unknown) {
      setTicketsError(err instanceof Error ? err.message : 'Failed to load customer tickets.');
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  // Fetch both in parallel on mount / when customer ID changes
  useEffect(() => {
    if (!id || authLoading || !session) return;

    setTicketCurrentPage(1);
    Promise.all([
      fetchCustomerProfile(id),
      fetchCustomerTickets(id, 1),
    ]);
  }, [id, authLoading, session, fetchCustomerProfile, fetchCustomerTickets]);

  const handlePageChange = (newPage: number) => {
    setTicketCurrentPage(newPage);
    if (id) {
      fetchCustomerTickets(id, newPage);
    }
  };

  if (authLoading || !session) return null;

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Back link */}
      <Link
        href="/agent"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* ── Customer Profile Section ────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 text-slate-100">
        {loadingCustomer && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading customer profile…</p>
          </div>
        )}

        {customerError && !loadingCustomer && (
          <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold text-sm">Failed to load customer profile</p>
                <p className="text-xs mt-0.5">{customerError}</p>
              </div>
            </div>
            <button
              onClick={() => id && fetchCustomerProfile(id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {!loadingCustomer && !customerError && customer && (
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center flex-shrink-0">
              <UserCircle2 className="w-8 h-8 text-indigo-400" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-100">{customer.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Customer since {formatDate(customer.createdAt)}
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <Mail className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-200 truncate">{customer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <Phone className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-slate-200">{customer.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <Calendar className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Member since</p>
                    <p className="text-sm font-medium text-slate-200">{formatDate(customer.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Customer Tickets Section ────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4 text-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-bold text-slate-100">Tickets</h2>
            {ticketsPage?.pagination && (
              <span className="text-xs text-slate-400 font-medium">
                ({ticketsPage.pagination.total} total)
              </span>
            )}
          </div>
          <button
            onClick={() => id && fetchCustomerTickets(id, ticketCurrentPage)}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loadingTickets && (
          <div className="flex items-center justify-center py-10 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm text-slate-400">Loading tickets…</p>
          </div>
        )}

        {ticketsError && !loadingTickets && (
          <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div>
                <p className="font-semibold text-sm">Failed to load tickets</p>
                <p className="text-xs mt-0.5">{ticketsError}</p>
              </div>
            </div>
            <button
              onClick={() => id && fetchCustomerTickets(id, ticketCurrentPage)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {!loadingTickets && !ticketsError && (ticketsPage?.items ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6 text-slate-500" />
            </div>
            <p className="text-sm font-semibold text-slate-200">No tickets yet</p>
            <p className="text-xs text-slate-400 mt-1">This customer hasn't submitted any tickets.</p>
          </div>
        )}

        {!loadingTickets && !ticketsError && (ticketsPage?.items ?? []).length > 0 && (
          <div className="space-y-2">
            {ticketsPage!.items.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loadingTickets && !ticketsError && ticketsPage?.pagination && ticketsPage.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              disabled={ticketCurrentPage <= 1}
              onClick={() => handlePageChange(Math.max(1, ticketCurrentPage - 1))}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </button>
            <span className="text-xs text-slate-400">
              Page {ticketsPage.pagination.page} of {ticketsPage.pagination.totalPages}
            </span>
            <button
              disabled={ticketCurrentPage >= ticketsPage.pagination.totalPages}
              onClick={() => handlePageChange(Math.min(ticketsPage.pagination.totalPages, ticketCurrentPage + 1))}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
