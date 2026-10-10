'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AreaNavigation } from '@/components/ui/area-navigation';
import { SecondaryDetails } from '@/components/ui/secondary-details';
import { GeologiaDashboard } from '@/components/production/geologia-dashboard';
import { GeologiaHistoricalCanonical } from '@/components/production/geologia-historical-canonical';
import { GeologiaCanonicalStatus } from '@/components/production/geologia-canonical-status';
import { GeologiaDataCompleteness } from '@/components/production/geologia-data-completeness';
import { GeologiaInterpretation } from '@/components/production/geologia-interpretation';
import { GeologiaInterpretationMatrix } from '@/components/production/geologia-interpretation-matrix';
import { GeologiaNextBestEvidence } from '@/components/production/geologia-next-best-evidence';
import { GeologiaCoreVision } from '@/components/production/geologia-corevision';

const tabs = [
  ['today', 'Resumen'],
  ['pending', 'Tareas'],
  ['holes', 'Ficha'],
  ['corevision', 'CoreVision'],
  ['interpretation', 'Lectura'],
  ['matrix', 'Matriz'],
  ['results', 'Resultados'],
  ['completeness', 'Cobertura'],
  ['priorities', 'Excepciones'],
  ['canonical', 'Estado'],
  ['history', 'Histórico'],
] as const;

type TabKey = (typeof tabs)[number][0];
const tabKeys = new Set<TabKey>(tabs.map(([key]) => key));

export function GeologiaWorkspaceShell() {
  const [tab, setTab] = useState<TabKey>('today');

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab') as TabKey | null;
    if (requested && tabKeys.has(requested)) setTab(requested);
  }, []);

  const selectTab = (key: TabKey) => {
    setTab(key);
    const url = new URL(window.location.href);
    if (key === 'today') url.searchParams.delete('tab');
    else url.searchParams.set('tab', key);
    url.searchParams.delete('recovery');
    url.searchParams.delete('hole');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  };

  const navigationItems = tabs.map(([key, label]) => ({
    href: key === 'today' ? '/dashboard/produccion/geologia' : `/dashboard/produccion/geologia?tab=${key}`,
    label,
    onSelect: () => selectTab(key),
  }));

  const showDashboard = !['history', 'canonical', 'completeness', 'interpretation', 'matrix', 'priorities', 'corevision'].includes(tab);
  const dashboardClassName = `geologia-dashboard-simplified ${showDashboard ? 'block' : 'hidden'} ${tab === 'holes' ? 'geologia-holes-focus' : ''}`;

  return (
    <div className="space-y-5">
      <AreaNavigation label="Geología" primary={navigationItems.slice(0, 3)} secondary={navigationItems.slice(3)}
        isActive={(href) => href === (tab === 'today' ? '/dashboard/produccion/geologia' : `/dashboard/produccion/geologia?tab=${tab}`)} />

      {tab === 'canonical' ? (
        <div className="space-y-3">
          <Button size="sm" variant="outline" onClick={() => selectTab('pending')}>Abrir tareas</Button>
          <SecondaryDetails>
            <p className="text-sm font-medium">Estado = control y trazabilidad canónica</p>
            <p className="text-xs text-muted-foreground">Aquí se revisan reconciliación, bloqueos y procedencia. Toda acción operativa se atiende en Hoy → Tareas.</p>
          </SecondaryDetails>
        </div>
      ) : null}


      <div className={dashboardClassName}>
        <style>{`
          nav[aria-label="Vistas de Geología"] { display: none !important; }
          .geologia-dashboard-simplified section[aria-label="Resumen geológico"] { display: none !important; }
          .geologia-holes-focus table th:nth-child(4),
          .geologia-holes-focus table td:nth-child(4) { display: none !important; }
          .geologia-holes-focus aside > section:first-child { display: none !important; }
          .geologia-holes-focus > div.space-y-6 > div.grid > div.space-y-5 > section:first-child:has(.border-dashed) { display: none !important; }
        `}</style>
        <GeologiaDashboard view={showDashboard ? tab as 'today' | 'holes' | 'results' | 'pending' : 'today'} onViewChange={selectTab} />
      </div>

      {tab === 'interpretation' ? <GeologiaInterpretation /> : null}
      {tab === 'matrix' ? <GeologiaInterpretationMatrix /> : null}
      {tab === 'priorities' ? <GeologiaNextBestEvidence /> : null}
      {tab === 'corevision' ? <GeologiaCoreVision /> : null}
      {tab === 'completeness' ? <GeologiaDataCompleteness /> : null}
      {tab === 'canonical' ? <GeologiaCanonicalStatus /> : null}
      {tab === 'history' ? <GeologiaHistoricalCanonical /> : null}
    </div>
  );
}
