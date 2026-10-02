import { MobileTerrainPanel } from '@/components/maintenance/mobile-terrain-panel';

export const metadata = {
  title: 'Trabajo de hoy | Mantenimiento',
  description: 'Trabajo asignado en terreno, sin colas globales ni indicadores innecesarios.',
};

export default function MaintenanceMobilePage() {
  return <div className="mx-auto w-full max-w-md"><MobileTerrainPanel /></div>;
}
