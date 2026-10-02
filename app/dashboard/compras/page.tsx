'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { ArrowRight, Database, FileText, Plus, Search, ShoppingCart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader, PageHeaderActions, PageHeaderContent, PageHeaderDescription, PageHeaderEyebrow, PageHeaderTitle } from '@/components/ui/page-header';
import { StatePanel } from '@/components/ui/state-panel';
import { OperationalPipelineBoard } from '@/components/pipeline/operational-pipeline-board';

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

const shortcuts = [
  { href: '/dashboard/compras/control-proveedores/candidatos', label: 'Cotizar', description: 'Comparar proveedores y ofertas.', icon: Search },
  { href: '/dashboard/compras/flujo', label: 'Seguimiento', description: 'Solicitudes, órdenes y recepciones.', icon: ShoppingCart },
  { href: '/dashboard/compras/proveedores-360', label: 'Proveedores', description: 'Historial y ficha del proveedor.', icon: Users },
  { href: '/dashboard/compras/facturas', label: 'Facturas', description: 'Facturas y cuentas por pagar.', icon: FileText },
  { href: '/dashboard/compras/documentos', label: 'Documentos', description: 'Respaldos vinculados a cada compra.', icon: FileText },
  { href: '/dashboard/compras/fuentes', label: 'Fuentes', description: 'Origen de órdenes y proveedores.', icon: Database },
];

export default function ComprasPage() {
  const { data, error, isLoading, mutate } = useSWR<Overview>('/api/procurement/overview', fetcher, { revalidateOnFocus: false });
  const overview = error ? undefined : data;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Abastecimiento</PageHeaderEyebrow>
          <PageHeaderTitle>Compras</PageHeaderTitle>
          <PageHeaderDescription>Solicitudes, proveedores y seguimiento de compras.</PageHeaderDescription>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button asChild>
            <Link href="/dashboard/compras/flujo"><Plus className="h-4 w-4" />Nueva compra</Link>
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? (
        <StatePanel
          tone="error"
          title="Resumen de Compras no disponible"
          description="Las fuentes faltantes no se reemplazan por cero."
          actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
          className="min-h-0"
        />
      ) : null}

      <section aria-labelledby="compras-pendientes" className="space-y-3">
        <h2 id="compras-pendientes" className="text-lg font-semibold tracking-tight">Qué necesita atención</h2>
        <OperationalPipelineBoard />
      </section>

      <section className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2 xl:grid-cols-3" aria-label="Acciones de compras">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group flex items-center gap-4 bg-card px-5 py-4 transition-colors hover:bg-muted/35">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1"><p className="font-medium">{item.label}</p><p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p></div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          );
        })}
      </section>

      <details className="border-t pt-4">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Ver resumen de compras</summary>
        <section className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de Compras">
          {[
            ['OC canónicas', overview?.canonical.purchaseOrders],
            ['Proveedores', overview?.canonical.suppliers],
            ['Solicitudes', overview?.operational.intakeRequests],
            ['Órdenes operativas', overview?.operational.operationalOrders],
            ['Recepciones', overview?.operational.receipts],
            ['Facturas', overview?.operational.invoices],
            ['Cuentas por pagar', overview?.operational.accountsPayable],
            ['Documentos', overview?.operational.documents],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">{isLoading || value == null ? '—' : Number(value).toLocaleString('es-CL')}</p>
            </div>
          ))}
        </section>
      </details>
    </div>
  );
}
