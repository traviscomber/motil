'use client';

import useSWR from 'swr';
import { MobileTerrainPanel } from '@/components/maintenance/mobile-terrain-panel';
import { StatePanel } from '@/components/ui/state-panel';

type ViewerContext = { mode?: 'leadership' | 'planning' | 'execution' | 'workshop' | 'oversight' | 'general' };

async function fetcher(url: string): Promise<ViewerContext> {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar el contexto de mantenimiento.');
  return payload as ViewerContext;
}

export function MaintenanceMobileRoute() {
  const { data, error, isLoading } = useSWR<ViewerContext>('/api/maintenance/viewer-context', fetcher, { revalidateOnFocus: false });

  if (isLoading) return <StatePanel tone="loading" title="Preparando trabajo en terreno" />;
  if (error) return <StatePanel tone="error" title="No se pudo cargar tu trabajo" description={error.message} />;

  if (data?.mode !== 'execution') {
    return (
      <StatePanel
        tone="neutral"
        title="Vista móvil no asignada a este cargo"
        description="Esta pantalla se reserva para ejecución en terreno con teléfono. Usa el Resumen de Mantenimiento para tu trabajo asignado."
      />
    );
  }

  return <MobileTerrainPanel />;
}
