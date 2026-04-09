import { NextRequest, NextResponse } from 'next/server';

function isValidSession(password: string): boolean {
  return [
    process.env.KB_PASSWORD,
    process.env.PASS_TEAM,
    process.env.PASS_LIMITED,
    process.env.PASS_RESTRICTED,
    process.env.PASS_EXECUTIVE,
    process.env.PASS_ADMIN,
  ].includes(password);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/auth')) return NextResponse.next();

  const session = request.cookies.get('kb_session');
  if (!session || !isValidSession(session.value)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|login).*)'],
};
