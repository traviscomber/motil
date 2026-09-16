import { Asset360Overview } from '@/components/maintenance/asset-360-overview';
import { AssetEconomicOperationalHistory } from '@/components/maintenance/asset-economic-operational-history';
import { AssetRelatedOperations } from '@/components/maintenance/asset-related-operations';
import { CertifiedFinancialSummary } from '@/components/finance/certified-financial-summary';
import { EntityTimeline } from '@/components/shared/entity-timeline';

export const metadata = {
  title: 'Equipo 360° | Mantenimiento',
  description: 'Vista operacional del equipo, su historia económica, relaciones, costos e historial.',
};

type EquipmentFichaPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EquipmentFichaPage({ params }: EquipmentFichaPageProps) {
  const { id } = await params;
  const assetId = decodeURIComponent(id);

  return (
    <div className="space-y-5">
      <Asset360Overview assetId={assetId} />
      <AssetEconomicOperationalHistory assetId={assetId} />
      <AssetRelatedOperations assetId={assetId} />
      <CertifiedFinancialSummary entity="asset" id={assetId} />
      <EntityTimeline entity="asset" id={assetId} />
    </div>
  );
}
