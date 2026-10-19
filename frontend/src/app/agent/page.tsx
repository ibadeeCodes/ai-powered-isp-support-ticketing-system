'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Headphones,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Ticket,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Wrench,
  RefreshCw,
  Inbox,
  Search,
  Phone,
  Mail,
  UserCircle2,
  X,
  Bot,
  User,
  UserCheck,
  ChevronDown,
  Save,
  Calendar,
  FileText,
  Zap,
} from 'lucide-react';
import { getAgentTickets, getAgentCustomers, getAgentTicketDetail, updateTicketStatus } from '@/lib/api';
import {
  AgentTicketItem,
  AgentTicketsPage,
  AgentCustomerItem,
  AgentCustomersPage,
  AgentTicketDetail,
  TicketStatus,
  TicketPriority,
} from '@/types/ticket';

// ---------------------------------------------------------------------------
// Style maps (Dark Theme)
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'bg-sky-950/80 text-sky-400 border-sky-800/60',
  [TicketStatus.IN_PROGRESS]: 'bg-amber-950/80 text-amber-400 border-amber-800/60',
  [TicketStatus.RESOLVED]: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
  [TicketStatus.CLOSED]: 'bg-slate-800 text-slate-300 border-slate-700',
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'bg-slate-800 text-slate-300',
  [TicketPriority.MEDIUM]: 'bg-blue-950/80 text-blue-400 border border-blue-800/60',
  [TicketPriority.HIGH]: 'bg-amber-950/80 text-amber-400 border border-amber-800/60',
  [TicketPriority.CRITICAL]: 'bg-rose-950/80 text-rose-400 border border-rose-800/60',
};

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-rose-950/80 text-rose-400',
  HIGH: 'bg-orange-950/80 text-orange-400',
  MEDIUM: 'bg-amber-950/80 text-amber-400',
  LOW: 'bg-slate-800 text-slate-300',
};

const SENTIMENT_STYLES: Record<string, string> = {
  VERY_NEGATIVE: 'text-rose-400',
  NEGATIVE: 'text-orange-400',
  NEUTRAL: 'text-slate-400',
  POSITIVE: 'text-emerald-400',
  VERY_POSITIVE: 'text-emerald-300',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Ticket queue sub-components
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-start gap-3 p-4 border border-slate-800 rounded-xl bg-slate-900/50">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-slate-800 rounded-md" />
          <div className="h-4 w-20 bg-slate-800 rounded-full" />
          <div className="h-4 w-16 bg-slate-800 rounded-full" />
        </div>
        <div className="h-4 w-3/4 bg-slate-800 rounded" />
      </div>
      <div className="h-4 w-10 bg-slate-800 rounded" />
    </div>
  );
}

function TicketRow({ ticket, onClick }: { ticket: AgentTicketItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start justify-between gap-3 p-4 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
          <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/60">
            {ticket.ticketNumber}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[ticket.status]}`}
          >
            <Clock className="w-3 h-3" />
            {ticket.status.replace('_', ' ')}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[ticket.priority]}`}>
            {ticket.priority}
          </span>
          {ticket.ai?.severity && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[ticket.ai.severity] ?? 'bg-slate-800 text-slate-300'}`}>
              {ticket.ai.severity}
            </span>
          )}
          {ticket.ai?.requiresTechnician && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-950/80 text-violet-300 border border-violet-800/60">
              <Wrench className="w-3 h-3" />
              Technician
            </span>
          )}
        </div>
        <p className="text-sm font-semibold text-slate-100 truncate group-hover:text-blue-400">
          {ticket.subject}
        </p>
        {ticket.ai && (
          <p className="text-xs text-slate-400 mt-0.5">
            {ticket.ai.category}
            {ticket.ai.issueType ? ` · ${ticket.ai.issueType}` : ''}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
        <span className="text-xs font-bold text-slate-400">Score: {ticket.priorityScore}</span>
        <span className="text-xs text-slate-500">{timeAgo(ticket.createdAt)}</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Customer lookup sub-components
// ---------------------------------------------------------------------------

function CustomerSkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-3 p-3 border border-slate-800 rounded-xl bg-slate-900/50">
      <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 bg-slate-800 rounded" />
        <div className="h-3 w-24 bg-slate-800 rounded" />
      </div>
      <div className="h-3 w-20 bg-slate-800 rounded" />
    </div>
  );
}

function CustomerRow({ customer }: { customer: AgentCustomerItem }) {
  return (
    <Link
      href={`/agent/customers/${customer.id}`}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all group cursor-pointer"
    >
      <div className="w-8 h-8 rounded-full bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center flex-shrink-0">
        <UserCircle2 className="w-5 h-5 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 group-hover:text-indigo-400 truncate">
          {customer.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Mail className="w-3 h-3 text-slate-500" />
            {customer.email}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
          <Phone className="w-3 h-3 text-slate-500" />
          {customer.phone}
        </span>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Ticket Detail Modal
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: TicketStatus.OPEN, label: 'Open' },
  { value: TicketStatus.IN_PROGRESS, label: 'In Progress' },
  { value: TicketStatus.RESOLVED, label: 'Resolved' },
  { value: TicketStatus.CLOSED, label: 'Closed' },
];

function TicketDetailModal({
  ticketId,
  onClose,
  onStatusUpdated,
}: {
  ticketId: string;
  onClose: () => void;
  onStatusUpdated: (ticketId: string, newStatus: TicketStatus) => void;
}) {
  const [detail, setDetail] = useState<AgentTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Fetch ticket detail
  useEffect(() => {
    setLoading(true);
    setError(null);
    getAgentTicketDetail(ticketId)
      .then((d) => {
        setDetail(d);
        setSelectedStatus(d.status);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load ticket.'))
      .finally(() => setLoading(false));
  }, [ticketId]);

  const handleSaveStatus = async () => {
    if (!detail || !selectedStatus || selectedStatus === detail.status) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await updateTicketStatus(detail.id, selectedStatus);
      setDetail((prev) => prev ? { ...prev, status: selectedStatus } : prev);
      onStatusUpdated(detail.id, selectedStatus);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  };

  const statusChanged = detail && selectedStatus !== detail.status;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal panel */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 flex-shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-slate-400" />
            <span className="font-semibold text-slate-100">Ticket Detail</span>
            {detail && (
              <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-800/60">
                {detail.ticketNumber}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <p className="text-sm text-slate-400">Loading ticket…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Failed to load ticket</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && detail && (
            <>
              {/* ── Status update bar ────────────────────────────────────── */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-semibold text-slate-400 flex-shrink-0">Status</span>
                <div className="relative flex-1">
                  <select
                    value={selectedStatus ?? detail.status}
                    onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                    className="w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-800 text-sm font-medium text-slate-100 bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-100">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
                <button
                  onClick={handleSaveStatus}
                  disabled={!statusChanged || saving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors flex-shrink-0 shadow-md shadow-blue-600/20"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>

              {/* Save feedback */}
              {saveSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Status updated successfully
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-400" /> {saveError}
                </div>
              )}

              {/* ── Priority badges ──────────────────────────────────────── */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_STYLES[detail.priority]}`}>
                  {detail.priority} Priority
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Score: {detail.priorityScore}
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  Created {timeAgo(detail.createdAt)}
                </span>
              </div>

              {/* ── Subject + Description ────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <FileText className="w-3.5 h-3.5" /> Description
                </div>
                <h3 className="text-base font-bold text-slate-100">{detail.subject}</h3>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950 rounded-xl p-4 border border-slate-800">
                  {detail.description}
                </p>
              </div>

              {/* ── Dates ───────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Created</p>
                    <p className="text-xs font-medium text-slate-200">{formatDate(detail.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <Calendar className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Last Updated</p>
                    <p className="text-xs font-medium text-slate-200">{formatDate(detail.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* ── Assignment Details ──────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" /> Assignment
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <Users className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Assigned Team</p>
                      <p className="text-xs font-medium text-slate-200">
                        {detail.assignedTeam?.name ?? 'No team assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <UserCheck className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Assigned Agent</p>
                      <p className="text-xs font-medium text-slate-200">
                        {detail.assignedAgent?.name ?? 'No agent assigned'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Customer info ────────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <User className="w-3.5 h-3.5" /> Customer
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center flex-shrink-0">
                    <UserCircle2 className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{detail.customer.name}</p>
                    <div className="flex flex-wrap gap-3 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Mail className="w-3 h-3 text-slate-500" />{detail.customer.email}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Phone className="w-3 h-3 text-slate-500" />{detail.customer.phone}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/agent/customers/${detail.customer.id}`}
                    onClick={onClose}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex-shrink-0"
                  >
                    View profile →
                  </Link>
                </div>
              </div>

              {/* ── AI Analysis ─────────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  <Bot className="w-3.5 h-3.5" /> AI Analysis
                </div>
                {detail.ai ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Category</p>
                      <p className="text-xs font-semibold text-slate-200 mt-0.5">{detail.ai.category}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Issue Type</p>
                      <p className="text-xs font-semibold text-slate-200 mt-0.5">{detail.ai.issueType}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Severity</p>
                      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 ${SEVERITY_STYLES[detail.ai.severity] ?? 'bg-slate-800 text-slate-300'}`}>
                        {detail.ai.severity}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Sentiment</p>
                      <p className={`text-xs font-semibold mt-0.5 ${SENTIMENT_STYLES[detail.ai.sentiment] ?? 'text-slate-300'}`}>
                        {detail.ai.sentiment.replace('_', ' ')}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Intent</p>
                      <p className="text-xs font-semibold text-slate-200 mt-0.5">{detail.ai.intent}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Confidence</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.round(detail.ai.confidence * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-200">
                          {Math.round(detail.ai.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    {detail.ai.requiresTechnician && (
                      <div className="col-span-2 flex items-center gap-2 p-3 rounded-xl bg-violet-950/80 border border-violet-800/80">
                        <Wrench className="w-4 h-4 text-violet-400 flex-shrink-0" />
                        <p className="text-xs font-semibold text-violet-300">On-site technician required</p>
                      </div>
                    )}
                    <div className="col-span-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <p className="text-xs text-slate-400">Intent summary</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <p className="text-xs font-medium text-slate-200">{detail.ai.intent}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center rounded-xl bg-slate-950 border border-slate-800">
                    <Bot className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-400">No AI analysis yet</p>
                    <p className="text-xs text-slate-500 mt-0.5">Analysis will appear here once completed.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const TICKET_PAGE_SIZE = 8;
const CUSTOMER_PAGE_SIZE = 6;

export default function AgentDashboardPage() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── Ticket queue state ────────────────────────────────────────────────────
  const [queuePage, setQueuePage] = useState<AgentTicketsPage | null>(null);
  const [ticketCurrentPage, setTicketCurrentPage] = useState(1);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // ── Customer lookup state ─────────────────────────────────────────────────
  const [customerPage, setCustomerPage] = useState<AgentCustomersPage | null>(null);
  const [customerCurrentPage, setCustomerCurrentPage] = useState(1);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect customers away from agent dashboard
  useEffect(() => {
    if (!authLoading && session?.role === 'CUSTOMER') {
      router.replace('/');
    }
  }, [authLoading, session, router]);

  // ── Ticket queue fetch ────────────────────────────────────────────────────
  const fetchQueue = useCallback(async (page: number) => {
    setLoadingQueue(true);
    setQueueError(null);
    try {
      const data = await getAgentTickets({ page, limit: TICKET_PAGE_SIZE });
      setQueuePage(data);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to load ticket queue.');
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && session) fetchQueue(ticketCurrentPage);
  }, [authLoading, session, ticketCurrentPage, fetchQueue]);

  // ── Customer lookup fetch ─────────────────────────────────────────────────
  const fetchCustomers = useCallback(async (search: string, page: number) => {
    setLoadingCustomers(true);
    setCustomerError(null);
    try {
      const data = await getAgentCustomers({
        phone: search.trim() || undefined,
        page,
        limit: CUSTOMER_PAGE_SIZE,
      });
      setCustomerPage(data);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : 'Failed to load customers.');
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && session) fetchCustomers('', 1);
  }, [authLoading, session, fetchCustomers]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setActiveSearch(value);
      setCustomerCurrentPage(1);
      fetchCustomers(value, 1);
    }, 350);
  };

  useEffect(() => {
    if (activeSearch !== undefined && session && !authLoading) {
      fetchCustomers(activeSearch, customerCurrentPage);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerCurrentPage]);

  // ── Modal callbacks ───────────────────────────────────────────────────────
  const handleStatusUpdated = useCallback((ticketId: string, newStatus: TicketStatus) => {
    setQueuePage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((t) =>
          t.id === ticketId ? { ...t, status: newStatus } : t,
        ),
      };
    });
  }, []);

  if (authLoading || !session) return null;

  const items: AgentTicketItem[] = queuePage?.items ?? [];
  const ticketPagination = queuePage?.pagination;
  const customerPagination = customerPage?.pagination;

  const openCount = items.filter((t) => t.status === TicketStatus.OPEN).length;
  const inProgressCount = items.filter((t) => t.status === TicketStatus.IN_PROGRESS).length;
  const resolvedCount = items.filter((t) => t.status === TicketStatus.RESOLVED).length;
  const criticalCount = items.filter((t) => t.priority === TicketPriority.CRITICAL).length;

  const STATS = [
    { label: 'Open', value: loadingQueue ? '—' : String(openCount), icon: Ticket, color: 'text-blue-400', bg: 'bg-blue-950/80 border border-blue-800/60' },
    { label: 'In Progress', value: loadingQueue ? '—' : String(inProgressCount), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-950/80 border border-amber-800/60' },
    { label: 'Resolved', value: loadingQueue ? '—' : String(resolvedCount), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-950/80 border border-emerald-800/60' },
    { label: 'Critical', value: loadingQueue ? '—' : String(criticalCount), icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-950/80 border border-rose-800/60' },
  ];

  return (
    <>
      {/* ── Modal ────────────────────────────────────────────────────────── */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}

      <div className="max-w-6xl mx-auto py-6 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Agent Dashboard</h1>
              <p className="text-sm text-slate-400">
                Welcome back, <span className="font-semibold text-slate-200">{session.name}</span>
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
            <Headphones className="w-3.5 h-3.5" />
            Support Agent
          </span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/20 p-5 space-y-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-100">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* ── Ticket Queue ─────────────────────────────────────────────── */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-100">Ticket Queue</h2>
                {ticketPagination && (
                  <span className="text-xs text-slate-400 font-medium">({ticketPagination.total} total)</span>
                )}
              </div>
              <button
                onClick={() => fetchQueue(ticketCurrentPage)}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {loadingQueue && (
              <div className="space-y-3">
                <SkeletonRow /><SkeletonRow /><SkeletonRow />
              </div>
            )}

            {queueError && !loadingQueue && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <AlertCircle className="w-8 h-8 text-rose-400" />
                <p className="text-sm font-semibold text-slate-200">Failed to load queue</p>
                <p className="text-xs text-slate-400">{queueError}</p>
                <button onClick={() => fetchQueue(ticketCurrentPage)} className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {!loadingQueue && !queueError && items.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-200">No tickets in queue</p>
                <p className="text-xs text-slate-400 mt-1">All caught up!</p>
              </div>
            )}

            {!loadingQueue && !queueError && items.length > 0 && (
              <div className="space-y-2">
                {items.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  />
                ))}
              </div>
            )}

            {!loadingQueue && !queueError && ticketPagination && ticketPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  disabled={ticketCurrentPage <= 1}
                  onClick={() => setTicketCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {ticketPagination.page} of {ticketPagination.totalPages}
                </span>
                <button
                  disabled={ticketCurrentPage >= ticketPagination.totalPages}
                  onClick={() => setTicketCurrentPage((p) => Math.min(ticketPagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ── Customer Lookup ──────────────────────────────────────────── */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/20 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-400" />
                <h2 className="text-base font-bold text-slate-100">Customer Lookup</h2>
                {customerPagination && (
                  <span className="text-xs text-slate-400 font-medium">({customerPagination.total} total)</span>
                )}
              </div>
            </div>

            {/* Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by phone number..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              {loadingCustomers && (
                <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
              )}
            </div>

            {customerError && !loadingCustomers && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{customerError}</span>
              </div>
            )}

            {loadingCustomers && (
              <div className="space-y-2">
                <CustomerSkeletonRow /><CustomerSkeletonRow /><CustomerSkeletonRow />
              </div>
            )}

            {!loadingCustomers && !customerError && (customerPage?.items ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-2">
                  <Users className="w-5 h-5 text-slate-500" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {searchInput ? 'No customers found' : 'No customers yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchInput ? `No results for "${searchInput}"` : 'Customers will appear here.'}
                </p>
              </div>
            )}

            {!loadingCustomers && !customerError && (customerPage?.items ?? []).length > 0 && (
              <div className="space-y-2">
                {customerPage!.items.map((customer) => (
                  <CustomerRow key={customer.id} customer={customer} />
                ))}
              </div>
            )}

            {!loadingCustomers && !customerError && customerPagination && customerPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  disabled={customerCurrentPage <= 1}
                  onClick={() => setCustomerCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {customerPagination.page} of {customerPagination.totalPages}
                </span>
                <button
                  disabled={customerCurrentPage >= customerPagination.totalPages}
                  onClick={() => setCustomerCurrentPage((p) => Math.min(customerPagination.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
