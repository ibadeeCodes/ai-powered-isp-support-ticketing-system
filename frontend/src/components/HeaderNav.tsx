'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, LifeBuoy, LogOut, User, Headphones, PlusCircle, LayoutDashboard, Inbox } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function HeaderNav() {
  const { session, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isAgent = session?.role === 'AGENT' || session?.role === 'ADMIN';
  const RoleIcon = isAgent ? Headphones : User;
  const roleLabel = session?.role === 'ADMIN' ? 'Admin' : isAgent ? 'Agent' : 'Customer';

  return (
    <nav className="flex items-center gap-3">
      {/* Network status pill */}
      <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
        <Activity className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
        Network: Operational
      </div>

      {!loading && session && (
        <>
          {/* Role-specific primary action */}
          {isAgent ? (
            <Link
              href="/agent"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
          ) : (
            <Link
              href="/tickets/new"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              New Ticket
            </Link>
          )}

          {/* Customer: My Tickets */}
          {!isAgent && (
            <Link
              href="/tickets"
              className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
            >
              <Inbox className="w-3.5 h-3.5" />
              My Tickets
            </Link>
          )}

          {/* User badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <RoleIcon className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-semibold text-slate-200">{session.name}</span>
            <span className="hidden sm:inline text-xs text-slate-400">({roleLabel})</span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </>
      )}

      {!loading && !session && (
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition-all"
        >
          Sign in
        </Link>
      )}

      {/* Help */}
      <a
        href="#help"
        className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-100 transition-colors"
      >
        <LifeBuoy className="w-4 h-4" />
        <span className="hidden sm:inline">Help</span>
      </a>
    </nav>
  );
}
