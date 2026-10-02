import { MaintenanceMobileRoute } from '@/components/maintenance/maintenance-mobile-route';

export const metadata = {
  title: 'Operación en terreno de mantenimiento',
  description: 'Vista mínima de trabajo asignado para mecánicos en terreno',
};

export default function MaintenanceMobilePage() {
  return <MaintenanceMobileRoute />;
}

