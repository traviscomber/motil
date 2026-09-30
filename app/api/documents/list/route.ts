import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthContext } from '@/lib/api/auth-session';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { listDocumentsForOrganization } from '@/lib/api/documents';

export const dynamic = 'force-dynamic';

const BUCKET = 'module-documents';

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContext(request);
    if (!auth || !auth.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get('module');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const assetId = searchParams.get('assetId');
    const canonicalSection = searchParams.get('canonicalSection');
    const limit = Number(searchParams.get('limit') || '50');
    const offset = Number(searchParams.get('offset') || '0');

    if (module) {
      const supabase = getSupabaseServerClient();

      let query = supabase
        .from('module_documents')
        .select('*')
        .eq('organization_id', auth.organizationId)
        .eq('module', module)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (assetId) {
        query = query.eq('asset_id', assetId);
      }

      if (canonicalSection) {
        query = query.eq('canonical_section', canonicalSection);
      }

      if (search) {
        query = query.ilike('document_name', `%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json({ error: `Error al obtener documentos: ${error.message}` }, { status: 500 });
      }

      const documents = await Promise.all(
        (data || []).map(async (doc) => {
          let file_url: string | null = null;
          if (doc.file_path) {
            const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60 * 60);
            file_url = signed?.signedUrl || null;
          }
          return { ...doc, file_url };
        })
      );

      return NextResponse.json({ documents });
    }

    const data = await listDocumentsForOrganization(auth.organizationId, {
      status,
      category,
      search,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        documents: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}
