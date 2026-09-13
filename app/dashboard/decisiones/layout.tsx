'use client';

import { usePathname } from 'next/navigation';
import { DecisionCasesPanel } from '@/components/dashboard/decision-cases-panel';
import { OperationalDecisionSync } from '@/components/dashboard/operational-decision-sync';
import { ManagementContextNav } from '@/components/layout/management-context-nav';

export default function DecisionCenterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDecisionHome = pathname === '/dashboard/decisiones' || pathname === '/dashboard/decisiones/';

  return (
    <div className="space-y-5">
      <ManagementContextNav />
      {isDecisionHome ? <OperationalDecisionSync /> : null}
      {children}
      {isDecisionHome ? <DecisionCasesPanel /> : null}
    </div>
  );
}
