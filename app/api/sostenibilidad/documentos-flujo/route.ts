export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSustainabilityContext } from '@/lib/api/sostenibilidad-mvp';

type DocumentApprovalRow = {
  approval_level: number;
  approval_level_name: string | null;
  required_role: string | null;
  status: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  comments: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DocumentFlowRow = {
  id: string;
  title: string | null;
  description: string | null;
  current_file_url: string | null;
  file_name?: string | null;
  category: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  document_approvals?: DocumentApprovalRow[] | null;
};

type DocumentFlowResponse = DocumentFlowRow & {
  documento_nombre: string;
  descripcion: string | null;
  archivo_url: string | null;
  estado: string | null;
  creador_nombre: string | null;
  nombre_archivo: string | null;
  tipo: string | null;
};

function buildApprovalChain(documentId: string) {
  return [
    {
      document_id: documentId,
      approval_level: 1,
      approval_level_name: 'Jefe de Sostenibilidad',
      required_role: 'jefe_sostenibilidad',
      status: 'pending',
    },
    {
      document_id: documentId,
      approval_level: 2,
      approval_level_name: 'Gerente General',
      required_role: 'gerente_general',
      status: 'pending',
    },
  ];
}

function buildApprovalChainForStatus(
  documentId: string,
  status: string,
  actorId: string,
  actorName: string | null
) {
  const normalizedStatus = normalizeDocumentStatus(status);
  const now = new Date().toISOString();

  return buildApprovalChain(documentId).map((approval) => {
    if (normalizedStatus === 'approved') {
      return {
        ...approval,
        status: 'approved',
        approved_by: actorId,
        approved_by_name: actorName,
        approved_at: now,
      };
    }

    if (normalizedStatus === 'rejected') {
      return {
        ...approval,
        status: 'rejected',
        approved_by: actorId,
        approved_by_name: actorName,
        approved_at: now,
      };
    }

    return {
      ...approval,
      status: 'pending',
      approved_by: null,
      approved_by_name: null,
      approved_at: null,
    };
  });
}

async function syncApprovalChain(
  supabase: any,
  documentId: string,
  status: string,
  actorId: string,
  actorName: string | null
) {
  await supabase.from('document_approvals').delete().eq('document_id', documentId);
  return supabase.from('document_approvals').insert(
    buildApprovalChainForStatus(documentId, status, actorId, actorName)
  );
}

function normalizeDocumentStatus(value: unknown) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'draft';
  if (['draft', 'borrador'].includes(text)) return 'draft';
  if (['submitted', 'pendiente_validador1', 'pendiente', 'under_review'].includes(text)) return 'submitted';
  if (['approved', 'aprobado_final', 'aprobado'].includes(text)) return 'approved';
  if (['rejected', 'rechazado'].includes(text)) return 'rejected';
  return 'draft';
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function normalizeCategory(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  return text || 'sostenibilidad';
}

function normalizeDocumentType(value: unknown) {
  const text = normalizeText(value).toLowerCase();
  return text || 'document';
}

function normalizeFileUrl(value: unknown) {
  const text = normalizeText(value);
  return text || null;
}

export async function GET(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mineOnly =
      searchParams.get('mine') === 'true' || searchParams.get('user_id') === context.userId;

    let query = context.supabase
      .from('documents')
      .select(
        `
        id,
        title,
        description,
        category,
        document_type,
        status,
        current_file_url,
        file_size_mb,
        file_mime_type,
        created_by,
        created_at,
        updated_at,
        document_approvals (
          id,
          approval_level,
          approval_level_name,
          required_role,
          status,
          assigned_to,
          assigned_to_name,
          approved_by,
          approved_by_name,
          comments,
          rejection_reason,
          approved_at
        )
      `
      )
      .eq('organization_id', context.organizationId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (mineOnly) {
      query = query.or(`created_by.eq.${context.userId},submitted_by.eq.${context.userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const mapped = (Array.isArray(data) ? (data as unknown as DocumentFlowRow[]) : []).map((doc): DocumentFlowResponse => ({
      ...doc,
      documento_nombre: doc.title || doc.file_name || 'Documento',
      descripcion: doc.description,
      archivo_url: doc.current_file_url,
      estado: doc.status,
      creador_nombre: context.userName || context.userEmail || context.userId,
      nombre_archivo: doc.file_name || doc.title || null,
      tipo: doc.category,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudieron cargar los documentos';
    console.error('[sostenibilidad][documentos-flujo] GET fallback:', message);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const title = normalizeText(body.title || body.documento_nombre);
    const description = normalizeText(body.description || body.descripcion);
    const category = normalizeCategory(body.category);
    const documentType = normalizeDocumentType(body.document_type || body.documentType);
    const status = normalizeDocumentStatus(body.status || body.estado || 'draft');
    const fileUrl = normalizeFileUrl(body.file_url || body.archivo_url);
    const fileSizeMb = body.file_size_mb ?? body.fileSizeMb ?? null;
    const fileMimeType = normalizeFileUrl(body.file_mime_type || body.fileMimeType);

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const { data: document, error: documentError } = await context.supabase
      .from('documents')
      .insert({
        organization_id: context.organizationId,
        title,
        description: description || null,
        category,
        document_type: documentType,
        status,
        created_by: context.userId,
        submitted_by: context.userId,
        current_file_url: fileUrl || null,
        file_size_mb: fileSizeMb,
        file_mime_type: fileMimeType,
        updated_at: new Date().toISOString(),
      })
      .select('id, title, description, category, document_type, status, current_file_url, created_by, created_at, updated_at')
      .single();

    if (documentError) throw documentError;

    const { error: approvalError } = await syncApprovalChain(
      context.supabase,
      document.id,
      status,
      context.userId,
      context.userName || context.userEmail || null
    );

    if (approvalError) throw approvalError;

    await context.supabase.from('document_audit_logs').insert({
      document_id: document.id,
      action: 'created',
      user_id: context.userId,
      details: `Documento creado: ${title}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document created successfully',
        data: {
          ...document,
          documento_nombre: document.title,
          descripcion: document.description,
          archivo_url: document.current_file_url,
          estado: document.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo crear el documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getSustainabilityContext(request);
  if (!context.ok) return context.response;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();
    const title = normalizeText(body.title || body.documento_nombre);
    const description = normalizeText(body.description || body.descripcion);
    const category = normalizeCategory(body.category);
    const documentType = normalizeDocumentType(body.document_type || body.documentType);
    const status = normalizeDocumentStatus(body.status || body.estado || 'draft');
    const fileUrl = normalizeFileUrl(body.file_url || body.archivo_url);
    const fileSizeMb = body.file_size_mb ?? body.fileSizeMb ?? null;
    const fileMimeType = normalizeFileUrl(body.file_mime_type || body.fileMimeType);

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const { data: document, error: documentError } = await context.supabase
      .from('documents')
      .update({
        title,
        description: description || null,
        category,
        document_type: documentType,
        status,
        current_file_url: fileUrl || null,
        file_size_mb: fileSizeMb,
        file_mime_type: fileMimeType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', context.organizationId)
      .select('id, title, description, category, document_type, status, current_file_url, created_by, created_at, updated_at')
      .single();

    if (documentError) throw documentError;

    const { error: approvalError } = await syncApprovalChain(
      context.supabase,
      document.id,
      status,
      context.userId,
      context.userName || context.userEmail || null
    );

    if (approvalError) throw approvalError;

    await context.supabase.from('document_audit_logs').insert({
      document_id: document.id,
      action: 'updated',
      user_id: context.userId,
      details: `Documento actualizado: ${title}`,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Document updated successfully',
        data: {
          ...document,
          documento_nombre: document.title,
          descripcion: document.description,
          archivo_url: document.current_file_url,
          estado: document.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo actualizar el documento';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
