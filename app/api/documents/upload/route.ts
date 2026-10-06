import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const BUCKET = 'module-documents';

const allowedTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
];

function safeParseJson(value: string) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth || !auth.organizationId) {
      return NextResponse.json({ error: 'No autorizado para cargar documentos sin organización activa.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const module = String(formData.get('module') || '').trim();
    const category = String(formData.get('category') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const documentType = String(formData.get('documentType') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const validFrom = String(formData.get('validFrom') || '').trim();
    const validUntil = String(formData.get('validUntil') || '').trim();
    const assetId = String(formData.get('assetId') || '').trim();
    const canonicalSection = String(formData.get('canonicalSection') || '').trim();
    const extractedDataRaw = String(formData.get('extractedData') || '').trim();
    const bypassDuplicate = formData.get('bypassDuplicate') === 'true';

    if (!file || !module || !category) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no debe superar 50MB' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    if (!bypassDuplicate) {
      const { data: existingDocs, error: searchError } = await supabase
        .from('module_documents')
        .select('id, document_name, status, provenance_status')
        .eq('organization_id', auth.organizationId)
        .eq('module', module)
        .eq('category', category)
        .eq('document_name', title || file.name)
        .is('deleted_at', null)
        .limit(1);

      if (searchError) {
        console.error('[documents/upload] duplicate check error:', searchError);
      }

      if (existingDocs && existingDocs.length > 0) {
        return NextResponse.json(
          {
            error: `El documento "${title || file.name}" ya existe en esta categoría.`,
            isDuplicate: true,
            existingDocument: existingDocs[0],
          },
          { status: 409 }
        );
      }
    }

    const sanitizePathSegment = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9.\-]/gi, '_')
        .toLowerCase();

    const timestamp = Date.now();
    const sanitizedModule = sanitizePathSegment(module);
    const sanitizedCategory = sanitizePathSegment(category);
    const sanitizedName = sanitizePathSegment(file.name);
    const filePath = `${sanitizedModule}/${sanitizedCategory}/${timestamp}_${sanitizedName}`;

    const buffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[documents/upload] storage error:', uploadError);
      return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 });
    }

    const now = new Date().toISOString();
    const { data: document, error: dbError } = await supabase
      .from('module_documents')
      .insert({
        organization_id: auth.organizationId,
        module,
        category,
        document_name: title || file.name,
        document_type: file.name.split('.').pop()?.toLowerCase() || file.type.split('/').pop() || 'bin',
        document_type_category: documentType || null,
        asset_id: assetId || null,
        canonical_section: canonicalSection || null,
        extracted_data: safeParseJson(extractedDataRaw),
        file_path: uploadData.path,
        file_size_bytes: file.size,
        description: description || null,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        status: 'active',
        is_active: true,
        provenance_status: 'canonical',
        canonical_role: 'canonical',
        canonicalized_at: now,
        uploaded_by: auth.user.id,
      })
      .select()
      .single();

    if (dbError) {
      await supabase.storage.from(BUCKET).remove([uploadData.path]);
      console.error('[documents/upload] database error:', dbError);
      return NextResponse.json({ error: `Error al crear registro: ${dbError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      documentId: document.id,
      fileName: file.name,
      status: document.status,
      provenanceStatus: document.provenance_status,
      message: 'Documento canónico cargado exitosamente',
    });
  } catch (error) {
    console.error('[documents/upload] error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
