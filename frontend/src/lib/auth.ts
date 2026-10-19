export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';

export interface AuthSession {
  id: string;
  role: UserRole;
  customerId?: string | null;
  name: string;
  email: string;
  accessToken: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    customerId?: string | null;
  };
}

/**
 * Authenticate against the backend API and return a session.
 * Throws an Error with a human-readable message on failure.
 */
export async function login(email: string, password: string): Promise<AuthSession> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    let message = 'Invalid email or password';
    try {
      const data = await res.json();
      if (Array.isArray(data?.message)) {
        message = data.message.join(', ');
      } else if (data?.message) {
        message = data.message as string;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const data: LoginResponse = await res.json();
  return {
    id: data.user.id,
    role: data.user.role,
    customerId: data.user.customerId,
    name: data.user.name,
    email: data.user.email,
    accessToken: data.accessToken,
  };
}

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------
const SESSION_KEY = 'isp_auth_session';
const SESSION_COOKIE = 'isp_auth_present';

/** Persist a session to localStorage and set the middleware cookie. */
export function saveSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`;
}

/** Load the current session from localStorage. Returns null if not authenticated. */
export function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

/** Clear the session from localStorage and remove the middleware cookie. */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Return the auth headers required by the backend JwtAuthGuard.
 * Safe to call only in client-side code (reads from localStorage).
 */
export function getAuthHeaders(): Record<string, string> {
  const session = loadSession();
  if (!session?.accessToken) return {};

  return {
    Authorization: `Bearer ${session.accessToken}`,
  };
}