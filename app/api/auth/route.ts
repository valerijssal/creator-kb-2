import { NextRequest, NextResponse } from 'next/server';

const LEVELS: Record<string, string> = {
  [process.env.KB_PASSWORD ?? '']: 'open',
  [process.env.PASS_TEAM ?? '']: 'team',
  [process.env.PASS_LIMITED ?? '']: 'limited',
  [process.env.PASS_RESTRICTED ?? '']: 'restricted',
  [process.env.PASS_EXECUTIVE ?? '']: 'executive',
  [process.env.PASS_ADMIN ?? '']: 'admin',
};

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const level = LEVELS[password];

  if (!level) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true, level });
  response.cookies.set('kb_session', password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  response.cookies.set('kb_level', level, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('kb_session');
  response.cookies.delete('kb_level');
  return response;
}
