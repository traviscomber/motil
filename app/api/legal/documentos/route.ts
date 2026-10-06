export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const auth = await resolveAuthContext(request);
  if (!auth || !auth.organizationId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';

  let query = supabase
    .from('module_documents')
    .select('id, document_name, document_type, document_type_category, description, status, provenance_status, canonical_role, file_path, file_url, uploaded_at, uploaded_by, valid_until')
    .eq('organization_id', auth.organizationId)
    .eq('module', 'legal')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('uploaded_at', { ascending: false });

  if (search) {
    query = query.ilike('document_name', `%${search}%`);
  }
  if (category) {
    query = query.eq('document_type_category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[legal/documentos GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const documents = await Promise.all(
    (data || []).map(async (doc) => {
      let fileUrl: string | null = doc.file_url ?? null;

      if (!fileUrl && doc.file_path) {
        const { data: signedData } = await supabase.storage
          .from('module-documents')
          .createSignedUrl(doc.file_path, 3600);
        fileUrl = signedData?.signedUrl ?? null;
      }

      return {
        id: doc.id,
        document_name: doc.document_name,
        title: doc.document_name,
        description: doc.description || '',
        category: doc.document_type_category || doc.document_type || 'legal',
        document_type: doc.document_type,
        documentType: doc.document_type_category || doc.document_type || 'legal',
        status: doc.status || 'active',
        provenance_status: doc.provenance_status || 'canonical',
        canonical_role: doc.canonical_role || 'canonical',
        file_url: fileUrl,
        fileUrl,
        file_path: doc.file_path,
        filePath: doc.file_path,
        uploaded_at: doc.uploaded_at,
        uploadedAt: doc.uploaded_at,
        uploaded_by: doc.uploaded_by,
        uploadedBy: doc.uploaded_by,
        valid_until: doc.valid_until,
      };
    })
  );

  return NextResponse.json({ documents, total: documents.length });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);
  if (!auth || !auth.organizationId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Un documento canónico requiere archivo. Usa multipart/form-data con file.' },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'El archivo es requerido' }, { status: 400 });
  }

  const uploadFormData = new FormData();
  uploadFormData.append('file', file);
  uploadFormData.append('module', 'legal');
  uploadFormData.append('category', String(formData.get('category') || 'documentos'));
  uploadFormData.append('title', String(formData.get('title') || file.name));
  uploadFormData.append('documentType', String(formData.get('documentType') || 'legal'));
  uploadFormData.append('description', String(formData.get('description') || ''));

  const uploadRes = await fetch(new URL('/api/documents/upload', request.url), {
    method: 'POST',
    headers: {
      Cookie: request.headers.get('cookie') || '',
    },
    body: uploadFormData,
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) {
    return NextResponse.json(uploadData, { status: uploadRes.status });
  }

  return NextResponse.json({ document: uploadData }, { status: 201 });
}
