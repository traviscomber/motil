import { MaintenancePersonnelPerformanceBoard } from '@/components/maintenance/technician-performance-board';
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

export const metadata = {
  title: 'Mecánicos y operarios | Mantenimiento',
  description: 'Desempeño de mecánicos y operarios basado en órdenes de trabajo y actividad real.',
};

export default function MaintenancePersonnelPage() {
  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Mantenimiento · Personal</PageHeaderEyebrow>
          <PageHeaderTitle>Mecánicos y operarios</PageHeaderTitle>
          <PageHeaderDescription>
            Revisa carga de trabajo e historial desde OT reales, separados por cargo.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>
      <MaintenancePersonnelPerformanceBoard />
    </div>
  );
}
