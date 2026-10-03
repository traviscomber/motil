export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Registro público deshabilitado. Los usuarios de MOTIL se crean desde Administración > Usuarios.',
    },
    {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
