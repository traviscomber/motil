export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const server = getSupabaseServerClient();
  const [membersResult, assetsResult] = await Promise.all([
    server.from('user_roles').select('user_id').eq('organization_id', auth.organizationId),
    server.from('maintenance_assets').select('id').eq('organization_id', auth.organizationId),
  ]);
  if (membersResult.error || assetsResult.error) {
    return NextResponse.json({ error: membersResult.error?.message || assetsResult.error?.message || 'No se pudo resolver el ámbito organizacional' }, { status: 500 });
  }
  const memberIds = (membersResult.data || []).map((row) => String(row.user_id)).filter(Boolean);
  const assetIds = (assetsResult.data || []).map((row) => String(row.id)).filter(Boolean);
  const ownershipFilters: string[] = [];
  if (memberIds.length) ownershipFilters.push(`uploaded_by.in.(${memberIds.join(',')})`);
  if (assetIds.length) ownershipFilters.push(`asset_id.in.(${assetIds.join(',')})`);

  if (!ownershipFilters.length) return NextResponse.json({ documents: [], total: 0 });

  let query = server
    .from('module_documents')
    .select('id, document_name, document_type, category, description, status, file_path, file_url, uploaded_at, uploaded_by, valid_from, valid_until, expires_at, l1_status, l2_status, tags, asset_id')
    .eq('module', 'legal')
    .is('deleted_at', null)
    .or(ownershipFilters.join(','))
    .order('uploaded_at', { ascending: false });

  if (search) {
    query = query.ilike('document_name', `%${search}%`);
  }
  if (category) {
    query = query.eq('document_type', category);
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
        title: doc.document_name,
        description: doc.description || '',
        category: doc.category || doc.document_type || 'legal',
        documentType: doc.document_type || 'legal',
        status: doc.status || 'draft',
        validFrom: doc.valid_from,
        validUntil: doc.valid_until,
        expiryDate: doc.expires_at || doc.valid_until,
        l1Status: doc.l1_status,
        l2Status: doc.l2_status,
        tags: doc.tags || [],
        assetId: doc.asset_id,
        fileUrl,
        filePath: doc.file_path,
        uploadedAt: doc.uploaded_at,
        uploadedBy: doc.uploaded_by,
      };
    })
  );

  return NextResponse.json({ documents, total: documents.length });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await resolveAuthContext(request);
  if (!auth) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const contentType = request.headers.get('content-type') || '';

  // If it's FormData with a file, delegate to the standard upload endpoint
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (file) {
      // Forward to the documents/upload endpoint with module='legal'
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('module', 'legal');
      uploadFormData.append('category', formData.get('category') || 'legal');
      uploadFormData.append('documentType', formData.get('documentType') || 'legal');
      uploadFormData.append('description', formData.get('description') || '');
      
      const uploadRes = await fetch(
        new URL('/api/documents/upload', request.url),
        {
          method: 'POST',
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
          body: uploadFormData,
        }
      );
      
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        return NextResponse.json(uploadData, { status: uploadRes.status });
      }
      
      return NextResponse.json({ document: uploadData }, { status: 201 });
    }
  }

  // Otherwise, handle as JSON metadata-only request
  const body = await request.json();
  const { title, category, documentType, description } = body;

  if (!title) {
    return NextResponse.json({ error: 'El título es requerido' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('module_documents')
    .insert({
      document_name: title,
      document_type: documentType || category || 'legal',
      description: description || null,
      module: 'legal',
      status: 'draft',
      uploaded_by: auth.user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ document: data }, { status: 201 });
}
