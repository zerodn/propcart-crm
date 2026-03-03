import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  const isPublic = pathname.startsWith('/login');
  const isRoot = pathname === '/';

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isRoot) {
    return NextResponse.redirect(new URL(token ? '/dashboard' : '/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
