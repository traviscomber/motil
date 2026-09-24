import { Asset360Overview } from '@/components/maintenance/asset-360-overview';
import { AssetEconomicOperationalHistory } from '@/components/maintenance/asset-economic-operational-history';
import { AssetEconomicConditionTrend } from '@/components/maintenance/asset-economic-condition-trend';

export const metadata = {
  title: 'Equipo 360° | Mantenimiento',
  description: 'Ficha 360 única del activo: identidad, estado, atención, trabajo, historial y documentación.',
};

type FichaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FichaPage({ params }: FichaPageProps) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  return (
    <div className="space-y-4">
      <Asset360Overview assetId={assetId} />
      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">
          Historial económico-operacional
        </summary>
        <div className="border-t border-border p-4">
          <AssetEconomicOperationalHistory assetId={assetId} />
        </div>
      </details>
      <details className="rounded-lg border border-border bg-card">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold">
          Tendencia costo + condición
        </summary>
        <div className="border-t border-border p-4">
          <AssetEconomicConditionTrend assetId={assetId} />
        </div>
      </details>
    </div>
  );
}