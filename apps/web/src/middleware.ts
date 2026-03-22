import { NextRequest, NextResponse } from 'next/server';

/**
 * Decode the `exp` field from a JWT without any external library.
 * Works in the Next.js Edge Runtime (uses Web `atob`).
 * Returns null when the token is malformed.
 */
function getJwtExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64URL → Base64: replace URL-safe chars and pad
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** True when the token is missing, malformed, or its `exp` is in the past. */
function isJwtExpired(token: string): boolean {
  const exp = getJwtExp(token);
  return exp === null || exp * 1000 < Date.now();
}

export function middleware(request: NextRequest) {
  // bypass authentication when auditing with Lighthouse or other tooling
  // locally. Set LH_SKIP_AUTH=1 in your environment when starting the dev
  // server to allow unauthenticated access to protected routes.
  if (process.env.LH_SKIP_AUTH === '1') {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublic = pathname.startsWith('/login') || pathname.startsWith('/email-verify');
  const isRoot = pathname === '/';

  // A token is only "valid" if it exists AND has not expired.
  // Checking expiry here prevents the infinite redirect loop where:
  //   1. Client sees expired JWT → sets isAuthenticated:false → router.replace('/login')
  //   2. Middleware sees stale 7-day cookie → redirects /login back to /dashboard
  //   3. → back to step 1 forever ("Đang kiểm tra đăng nhập..." spinner never resolves)
  const hasValidToken = !!token && !isJwtExpired(token);

  if (!hasValidToken && !isPublic) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Delete the stale cookie so the browser doesn't keep sending it.
    if (token) response.cookies.delete('access_token');
    return response;
  }

  if (hasValidToken && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isRoot) {
    return NextResponse.redirect(new URL(hasValidToken ? '/dashboard' : '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
