export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationContext } from '@/lib/api/organization-context';
import { CARPETA_ARRANQUE_DOCUMENTS, formatRutDisplay, normalizeRutDigits } from '@/lib/carpeta-arranque';

const allowedRoles = new Set(['superadmin', 'admin', 'manager']);
const BATCH_SIZE = 50;

function allowed(role?: string) {
  return allowedRoles.has(String(role || '').trim().toLowerCase());
}

function chunks<T>(items: T[], size = BATCH_SIZE) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function folderStatus(input: { folder: any | null; uploaded: number; rejected: number; approved: number }) {
  if (!input.folder) return { code: 'missing', label: 'SIN CARPETA' };
  if (input.rejected > 0) return { code: 'observed', label: 'OBSERVADA' };
  if (input.uploaded < CARPETA_ARRANQUE_DOCUMENTS.length) return { code: 'incomplete', label: 'INCOMPLETA' };
  if (input.approved >= CARPETA_ARRANQUE_DOCUMENTS.length) return { code: 'approved', label: 'APROBADA' };
  return { code: 'review', label: 'EN REVISIÓN' };
}

export async function GET(request: NextRequest) {
  const context = await getOrganizationContext(request);
  if (!context.ok) return context.response;
  if (!allowed(context.role)) return NextResponse.json({ error: 'Forbidden: RRHH access required' }, { status: 403 });

  try {
    const { data: eecc, error: eeccError } = await context.supabase
      .from('eecc')
      .select('id,name,rut,representative,email,phone,is_active,notes,created_by,created_at,updated_at')
      .eq('organization_id', context.organizationId)
      .order('name')
      .limit(250);
    if (eeccError) throw eeccError;

    const rows = eecc || [];
    const creatorIds = Array.from(new Set(rows.map((row) => row.created_by).filter(Boolean))) as string[];
    const rutVariants = Array.from(new Set(rows.flatMap((row) => {
      const normalized = normalizeRutDigits(row.rut);
      return [row.rut, normalized, formatRutDisplay(normalized)].filter(Boolean);
    }))) as string[];

    const folders: any[] = [];
    if (creatorIds.length && rutVariants.length) {
      for (const creatorBatch of chunks(creatorIds)) {
        for (const rutBatch of chunks(rutVariants)) {
          const { data, error } = await context.supabase
            .from('carpetas_arranque')
            .select('id,empresa_nombre,empresa_rut,created_by,status,submitted_at,created_at,updated_at')
            .in('created_by', creatorBatch)
            .in('empresa_rut', rutBatch)
            .order('created_at', { ascending: false })
            .limit(500);
          if (error) throw error;
          folders.push(...(data || []));
        }
      }
    }

    const folderIds = Array.from(new Set(folders.map((row) => row.id)));
    const documents: any[] = [];
    for (const folderBatch of chunks(folderIds)) {
      const { data, error } = await context.supabase
        .from('carpeta_documentos')
        .select('id,carpeta_id,slot_index,file_name,uploaded_at,l1_status,l2_status')
        .in('carpeta_id', folderBatch)
        .limit(1000);
      if (error) throw error;
      documents.push(...(data || []));
    }

    const items = rows.map((company) => {
      const rut = normalizeRutDigits(company.rut);
      const companyFolders = folders
        .filter((folder) => normalizeRutDigits(folder.empresa_rut) === rut && Boolean(company.created_by) && folder.created_by === company.created_by)
        .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
      const folder = companyFolders[0] || null;
      const docs = folder ? documents.filter((doc) => doc.carpeta_id === folder.id) : [];
      const uploaded = docs.filter((doc) => Boolean(doc.file_name)).length;
      const rejected = docs.filter((doc) => doc.l1_status === 'no_cumple' || doc.l2_status === 'no_cumple').length;
      const approved = docs.filter((doc) => doc.l2_status === 'cumple').length;
      const pendingReview = docs.filter((doc) => Boolean(doc.file_name) && doc.l2_status !== 'cumple' && doc.l2_status !== 'no_cumple').length;

      return {
        ...company,
        rut_display: formatRutDisplay(company.rut),
        folder: folder ? {
          status: folder.status,
          submitted_at: folder.submitted_at,
          uploaded,
          required: CARPETA_ARRANQUE_DOCUMENTS.length,
          approved,
          rejected,
          pending_review: pendingReview,
        } : null,
        documentary_status: folderStatus({ folder, uploaded, rejected, approved }),
      };
    });

    return NextResponse.json({
      contractors: items,
      summary: {
        total: items.length,
        active: items.filter((item) => item.is_active !== false).length,
        with_folder: items.filter((item) => Boolean(item.folder)).length,
        incomplete: items.filter((item) => ['incomplete', 'missing'].includes(item.documentary_status.code)).length,
        observed: items.filter((item) => item.documentary_status.code === 'observed').length,
        approved: items.filter((item) => item.documentary_status.code === 'approved').length,
        pending_review_documents: items.reduce((sum, item) => sum + Number(item.folder?.pending_review || 0), 0),
      },
      policy: {
        statement: 'El estado mostrado es documental. No equivale por sí solo a habilitación legal, HSE u operacional.',
      },
      source: 'public.eecc + carpetas_arranque + carpeta_documentos, scoped through organization-owned EECC creator identity',
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[rrhh/contractors]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar Contratistas 360' }, { status: 500 });
  }
}
