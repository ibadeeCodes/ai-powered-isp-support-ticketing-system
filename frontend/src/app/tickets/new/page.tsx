'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  PlusCircle,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import { createTicket, getDefaultCustomer } from '@/lib/api';
import { Ticket, Customer } from '@/types/ticket';
import { useAuth } from '@/context/AuthContext';

export default function CreateTicketPage() {
  const { session } = useAuth();

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);

  // Form states
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    // Fetch the full customer profile from the backend.
    // Auth headers are injected automatically by getAuthHeaders() in api.ts.
    getDefaultCustomer()
      .then((data) => setCustomer(data))
      .catch(() => {
        // If backend is unavailable, show minimal info from session
        if (session?.customerId) {
          setCustomer({
            id: session.customerId,
            name: session.name || 'Customer',
            email: '',
            phone: '',
          });
        }
      });
  }, [session]);

  const validate = () => {
    const newErrors: { subject?: string; description?: string } = {};

    if (!subject.trim()) {
      newErrors.subject = 'Subject is required.';
    } else if (subject.length > 255) {
      newErrors.subject = 'Subject must not exceed 255 characters.';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Please provide a little more detail (at least 10 characters).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        customerId: customer?.id ?? session?.customerId ?? undefined,
      });
      setCreatedTicket(result);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while creating the ticket.';
      setServerError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubject('');
    setDescription('');
    setErrors({});
    setServerError(null);
    setCreatedTicket(null);
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
          <PlusCircle className="w-7 h-7 text-blue-400" />
          Submit a Support Ticket
        </h1>
        <p className="text-sm text-slate-400 mt-1.5">
          Describe your connectivity or equipment issue. Our operations team will investigate
          promptly.
        </p>
      </div>

      {/* Subscriber Context Banner */}
      <div className="mb-6 p-4 rounded-xl bg-blue-950/40 border border-blue-900/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-900/50 text-blue-400 border border-blue-800/60 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Submitting as
            </p>
            <p className="text-sm font-bold text-slate-100">
              {customer?.name || session?.name || 'Loading subscriber profile...'}
            </p>
            {(customer?.email || customer?.phone) && (
              <p className="text-xs text-slate-400">
                {customer.email}
                {customer.email && customer.phone ? ' • ' : ''}
                {customer.phone}
              </p>
            )}
          </div>
        </div>
        <span className="hidden sm:inline-flex px-2.5 py-1 text-xs font-medium rounded-full bg-blue-950 text-blue-300 border border-blue-800/80">
          Subscriber Account Active
        </span>
      </div>

      {/* Success State */}
      {createdTicket ? (
        <div className="bg-slate-900 rounded-2xl border border-emerald-800/80 shadow-xl p-6 sm:p-8 space-y-6 text-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100">Ticket Created Successfully!</h2>
              <p className="text-sm text-slate-400">
                Your ticket has been registered in the system. Keep this ticket number for your
                records.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Ticket Number
              </span>
              <p className="text-xl font-mono font-bold text-blue-400 mt-0.5">
                {createdTicket.ticketNumber}
              </p>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Initial Status
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950/80 text-sky-400 border border-sky-800/60">
                  <Clock className="w-3 h-3" />
                  {createdTicket.status}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
                  {createdTicket.priority} Priority
                </span>
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Subject
              </span>
              <p className="text-sm font-semibold text-slate-200 mt-0.5">{createdTicket.subject}</p>
            </div>

            <div className="sm:col-span-2">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Description
              </span>
              <p className="text-sm text-slate-300 mt-0.5 whitespace-pre-wrap">
                {createdTicket.description}
              </p>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-800 text-xs text-slate-500">
              Created: {new Date(createdTicket.createdAt).toLocaleString()} • ID: {createdTicket.id}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01]"
            >
              <PlusCircle className="w-4 h-4" />
              Submit Another Ticket
            </button>
          </div>
        </div>
      ) : (
        /* Ticket Creation Form */
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl p-6 sm:p-8 space-y-5"
        >
          {serverError && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Failed to submit ticket</p>
                <p className="text-xs mt-0.5 text-rose-300">{serverError}</p>
              </div>
            </div>
          )}

          {/* Subject Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="subject"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
              >
                Subject <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-slate-500">{subject.length}/255</span>
            </div>
            <input
              id="subject"
              type="text"
              value={subject}
              maxLength={255}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors({ ...errors, subject: undefined });
              }}
              placeholder="e.g., Optical signal drop, Red LOS blinking light, Frequent disconnects"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all ${
                errors.subject
                  ? 'border-rose-800 bg-rose-950/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-800 bg-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            />
            {errors.subject && (
              <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.subject}
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="description"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
              >
                Detailed Description <span className="text-rose-400">*</span>
              </label>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Provide specific details or error indicators
              </span>
            </div>
            <textarea
              id="description"
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: undefined });
              }}
              placeholder="Please explain the issue. What lights are on your router? Did you try rebooting? When did the problem begin?"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all resize-none ${
                errors.description
                  ? 'border-rose-800 bg-rose-950/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                  : 'border-slate-800 bg-slate-950 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting Ticket...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Ticket
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
