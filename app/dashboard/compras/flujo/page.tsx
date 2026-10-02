import { AwardEvidencePanel } from '@/components/procurement/award-evidence-panel';
import { AwardOutcomeLearning } from '@/components/procurement/award-outcome-learning';
import { ProgressiveProcurementWorkflow } from '@/components/procurement/progressive-procurement-workflow';
import Link from 'next/link';

export default async function ProcurementWorkflowPage({ searchParams }: { searchParams: Promise<{ workOrderId?: string }> }) {
  const workOrderId = (await searchParams).workOrderId?.trim();
  if (workOrderId) return <Link href="/dashboard/compras/flujo" className="text-sm underline underline-offset-4">Ver flujo completo de Compras</Link>;
  return <div className="space-y-6"><AwardEvidencePanel /><AwardOutcomeLearning /><ProgressiveProcurementWorkflow /></div>;
}
