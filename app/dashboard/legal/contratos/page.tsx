'use client';

import useSWR from 'swr';
import { AddContractModal } from '@/components/legal/add-contract-modal';
import { ContractsTracker } from '@/components/legal/contracts-tracker';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No fue posible cargar contratos');
  return payload;
};

export default function LegalContractsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/legal/contratos', fetcher, { revalidateOnFocus: false });
  const contracts = (data?.contracts || []).map((contract: any) => ({
    id: contract.id,
    title: contract.title,
    provider: contract.contractor_name || 'Sin contratista',
    startDate: contract.start_date || null,
    endDate: contract.end_date || null,
    status: contract.status === 'Vencido' ? 'expired' : contract.status === 'Por Vencer' || contract.status === 'En Revisión' ? 'expiring' : 'active',
    value: contract.contract_value
      ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: contract.currency || 'CLP', minimumFractionDigits: 0 }).format(contract.contract_value)
      : '-',
    approvalStatus: contract.compliance_status === 'Pendiente' ? 'pending' : contract.compliance_status === 'Incumplimiento' ? 'rejected' : 'approved',
    fileUrl: contract.file_url,
  }));

  const handleAdd = async (payload: Record<string, string | number | boolean | File | null | undefined>) => {
    const hasFile = payload.file instanceof File;
    const body = hasFile
      ? (() => {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null) formData.append(key, value instanceof File ? value : String(value));
          });
          return formData;
        })()
      : JSON.stringify(payload);

    const response = await fetch('/api/legal/contratos', {
      method: 'POST',
      credentials: 'include',
      headers: hasFile ? undefined : { 'Content-Type': 'application/json' },
      body,
    });
    if (response.ok) await mutate();
  };

  if (isLoading) return <StatePanel tone="neutral" title="Cargando contratos" description="Leyendo contratos reales de la organización." />;
  if (error) return <StatePanel tone="error" title="Contratos no disponibles" description="No se reemplaza la fuente por una lista vacía." />;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 border-b border-border/70 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Legal</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Vigencia, revisión, contratista, responsable y respaldo contractual.</p>
        </div>
        <AddContractModal onSubmit={handleAdd} />
      </header>

      {contracts.length ? (
        <ContractsTracker contracts={contracts} />
      ) : (
        <StatePanel tone="neutral" title="No hay contratos registrados" description="El flujo permanece vacío hasta que exista un contrato real que gestionar." />
      )}
    </div>
  );
}
