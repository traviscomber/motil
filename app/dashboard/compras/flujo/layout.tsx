import type { ReactNode } from 'react';
import { OpenSupplyNeeds } from '@/components/procurement/open-supply-needs';
import { SecondaryDetails } from '@/components/ui/secondary-details';

export default function ProcurementFlowLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      {children}
      <SecondaryDetails label="Necesidades de mantenimiento">
        <OpenSupplyNeeds />
      </SecondaryDetails>
    </div>
  );
}
