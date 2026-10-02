'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import Link from 'next/link';
import type { Equipment } from '@/lib/types/equipment';
import { Button } from '@/components/ui/button';
import { EquipmentList } from '@/components/maintenance/equipment-list';
import { EquipmentSheet } from '@/components/maintenance/equipment-sheet';


export default function EquiposPage() {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSelectEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedEquipment(null);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Mantenimiento · Flota operacional</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Equipos</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Estado y trabajo pendiente por equipo. El detalle operativo, técnico y económico vive en su Ficha 360.
          </p>
        </div>
        <Button asChild><Link href="/dashboard/mantenimiento/equipos/importar"><Upload className="mr-2 h-4 w-4" />Importar equipos</Link></Button>
      </section>

      <EquipmentList onSelectEquipment={handleSelectEquipment} />

      <EquipmentSheet equipment={selectedEquipment} isOpen={isSheetOpen} onClose={handleCloseSheet} canEdit={true} />
    </div>
  );
}
