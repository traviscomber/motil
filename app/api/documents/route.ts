export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/guard';
import { listDocumentsForOrganization } from '@/lib/api/documents';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Number(searchParams.get('limit') || '50');
    const offset = Number(searchParams.get('offset') || '0');

    const data = await listDocumentsForOrganization(auth.organizationId, {
      status,
      category,
      search,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ documents: [], total: 0 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.authorized || !auth.organizationId || !auth.user) {
    return auth.response || NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const category = String(formData.get('category') || '').trim();
  const documentType = String(formData.get('documentType') || '').trim();

  if (!(file instanceof File) || !category) {
    return NextResponse.json({ error: 'file y category son requeridos' }, { status: 400 });
  }

  const canonicalFormData = new FormData();
  canonicalFormData.append('file', file);
  canonicalFormData.append('module', String(formData.get('module') || 'documentos'));
  canonicalFormData.append('category', category);
  canonicalFormData.append('title', String(formData.get('title') || file.name));
  canonicalFormData.append('documentType', documentType || category);
  canonicalFormData.append('description', String(formData.get('description') || ''));
  if (formData.get('validFrom')) canonicalFormData.append('validFrom', String(formData.get('validFrom')));
  if (formData.get('validUntil')) canonicalFormData.append('validUntil', String(formData.get('validUntil')));

  const response = await fetch(new URL('/api/documents/upload', request.url), {
    method: 'POST',
    headers: {
      Cookie: request.headers.get('cookie') || '',
    },
    body: canonicalFormData,
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
