import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — datos del usuario actual o 401. */
export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'No autenticado.' } },
      { status: 401 },
    );
  }
  return NextResponse.json({
    data: {
      id: Number(session.sub),
      email: session.email,
      nombre: session.nombre,
      rol: session.rol,
    },
  });
}
