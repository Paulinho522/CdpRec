import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  if (isLoginPage) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
  runtime: 'nodejs',
};
