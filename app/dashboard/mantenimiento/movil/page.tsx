import { MobileTerrainPanel } from '@/components/maintenance/mobile-terrain-panel';

export const metadata = {
  title: 'Operación en terreno de mantenimiento',
  description: 'Vista mínima de trabajo asignado para mecánicos en terreno',
};

export default function MaintenanceMobilePage() {
  return <MobileTerrainPanel />;
}

