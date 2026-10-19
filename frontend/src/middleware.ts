import { NextRequest, NextResponse } from 'next/server';

/** Cookie name set by saveSession() in src/lib/auth.ts */
const SESSION_COOKIE = 'isp_auth_present';

/** Routes that are always accessible without authentication */
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  const isAuthenticated = request.cookies.has(SESSION_COOKIE);

  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    // Preserve the intended destination so we can redirect back after login (future enhancement)
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

