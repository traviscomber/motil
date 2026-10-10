'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { OperationalPipelineBoard } from '@/components/pipeline/operational-pipeline-board';
import { SecondaryDetails } from '@/components/ui/secondary-details';

type Overview = {
  canonical: {
    purchaseOrders: number;
    suppliers: number;
  };
  operational: {
    intakeRequests: number;
    operationalOrders: number;
    receipts: number;
    invoices: number;
    accountsPayable: number;
    documents: number;
  };
};

const fetcher = async (url: string): Promise<Overview> => {
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar Compras');
  return payload as Overview;
};

export default function ComprasPage() {
  const { data, error, isLoading, mutate } = useSWR<Overview>('/api/procurement/overview', fetcher, { revalidateOnFocus: false });

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderTitle>Compras</PageHeaderTitle>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href="/dashboard/compras/flujo"><Plus className="h-4 w-4" />Nueva compra</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section aria-labelledby="compras-pendientes" className="space-y-3">
        <h2 id="compras-pendientes" className="text-lg font-semibold">Pendientes</h2>
        <OperationalPipelineBoard compact />
      </section>

      <SecondaryDetails>
      {error ? (
        <StatePanel
          tone="error"
          title="Resumen de Compras no disponible"
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0"
        />
      ) : null}

      <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-6" aria-label="Resumen de Compras">
        {[
          ['Órdenes de compra', data?.canonical.purchaseOrders],
          ['Proveedores', data?.canonical.suppliers],
          ['Solicitudes', data?.operational.intakeRequests],
          ['Órdenes operativas', data?.operational.operationalOrders],
          ['Recepciones', data?.operational.receipts],
          ['Facturas', data?.operational.invoices],
        ].map(([label, value]) => (
          <div key={String(label)} className="bg-card px-4 py-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{isLoading || value === undefined ? '—' : Number(value).toLocaleString('es-CL')}</p>
          </div>
        ))}
      </section>

      </SecondaryDetails>
    </div>
  );
}
