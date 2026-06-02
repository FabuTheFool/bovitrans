import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — borra la cookie de sesión. */
export async function POST() {
  cookies().delete(SESSION_COOKIE_NAME);
  return new NextResponse(null, { status: 204 });
}
