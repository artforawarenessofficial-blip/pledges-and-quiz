import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, ADMIN_COOKIE_MAX_AGE, computeAdminToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

  if (!ADMIN_PASSWORD || body.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  // Cookie value is derived from server secrets (HMAC), not a guessable sentinel.
  const token = await computeAdminToken();
  if (!token) {
    // ADMIN_SECRET missing — refuse to issue a session rather than fail open.
    return NextResponse.json({ error: 'Server auth is not configured' }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/', // must cover /api/admin/* too, not just /admin pages
    maxAge: ADMIN_COOKIE_MAX_AGE,
    sameSite: 'lax',
  });

  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  return res;
}
