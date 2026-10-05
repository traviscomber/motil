'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Contratistas 360');
  return payload;
};

type ContractorRow = {
  id: string;
  name: string;
  rut: string | null;
  rut_display: string;
  representative: string | null;
  email: string | null;
  is_active: boolean;
  folder: { uploaded: number; required: number; approved: number; rejected: number; pending_review: number } | null;
  documentary_status: { code: 'missing' | 'incomplete' | 'observed' | 'review' | 'approved'; label: string };
};

function metric(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('es-CL').format(value);
}

function documentaryVariant(code: ContractorRow['documentary_status']['code']) {
  if (code === 'observed') return 'destructive' as const;
  if (code === 'approved') return 'secondary' as const;
  return 'outline' as const;
}

export default function RrhhContractorsPage() {
  const [query, setQuery] = useState('');
  const { data, error, isLoading } = useSWR('/api/rrhh/contractors', fetcher, { revalidateOnFocus: false });
  const rows: ContractorRow[] = Array.isArray(data?.contractors) ? data.contractors : [];

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) => [row.name, row.rut, row.representative, row.email].some((field) => String(field || '').toLowerCase().includes(value)));
  }, [query, rows]);

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>RRHH · EECC</PageHeaderEyebrow>
          <PageHeaderTitle>Contratistas 360</PageHeaderTitle>
          <PageHeaderDescription>
            Empresas contratistas, carpeta de arranque y avance de revisión documental en una vista. El estado documental no reemplaza Legal, HSE ni la habilitación de personas.
          </PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild variant="outline"><Link href="/dashboard/legal/control-contractual">Control contractual</Link></Button>
        </PageHeaderActions>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          ['EECC', data?.summary?.total],
          ['Activas', data?.summary?.active],
          ['Con carpeta', data?.summary?.with_folder],
          ['Docs. por revisar', data?.summary?.pending_review_documents],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{isLoading || error ? '—' : metric(value as number | null)}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, RUT, representante o correo" className="pl-9" />
      </div>

      {isLoading ? <StatePanel tone="loading" title="Cargando contratistas" description="Reuniendo EECC y carpeta de arranque." /> : null}
      {error ? <StatePanel tone="error" title="No se pudo cargar Contratistas 360" description={error.message} /> : null}
      {!isLoading && !error && filtered.length === 0 ? <StatePanel tone="neutral" title="Sin contratistas" description="No hay EECC que coincidan con la búsqueda." /> : null}

      {!isLoading && !error && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_150px] gap-4 border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
            <span>Empresa</span><span>Responsable</span><span>Carpeta de arranque</span><span>Estado</span>
          </div>
          {filtered.map((row) => (
            <div key={row.id} className="grid gap-3 border-b px-4 py-4 last:border-b-0 lg:grid-cols-[1.4fr_1fr_1fr_150px] lg:items-center lg:gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">{row.name}</p>
                  <Badge variant={row.is_active ? 'secondary' : 'outline'}>{row.is_active ? 'Activa' : 'Inactiva'}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{row.rut_display || row.rut || 'RUT no informado'}</p>
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate">{row.representative || 'Sin representante'}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{row.email || 'Sin correo'}</p>
              </div>
              <div className="text-sm">
                {row.folder ? (
                  <>
                    <p className="tabular-nums">{row.folder.uploaded}/{row.folder.required} documentos cargados</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.folder.rejected > 0 ? String(row.folder.rejected) + ' observado(s)' : String(row.folder.pending_review) + ' pendiente(s) de revisión'}
                    </p>
                  </>
                ) : <p className="text-muted-foreground">Sin carpeta de arranque vinculada</p>}
              </div>
              <div><Badge variant={documentaryVariant(row.documentary_status.code)}>{row.documentary_status.label}</Badge></div>
            </div>
          ))}
        </div>
      ) : null}

      {!isLoading && !error ? (
        <StatePanel tone="neutral" title="Límite de interpretación" description={data?.policy?.statement || 'El estado documental no equivale por sí solo a habilitación operacional.'} />
      ) : null}
    </div>
  );
}
