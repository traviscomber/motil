'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Building2, FileBarChart, FileCheck2, FolderKanban, PackageSearch, Scale, ShieldCheck } from 'lucide-react';
import { AreaNavigation } from '@/components/ui/area-navigation';

const items = [
  { href: '/dashboard/documentos-gestion', label: 'Resumen', icon: FolderKanban },
  { href: '/dashboard/documentos-gestion/contratos', label: 'Contratos', icon: Scale },
  { href: '/dashboard/documentos-gestion/procedimientos', label: 'Procedimientos', icon: FileCheck2 },
  { href: '/dashboard/documentos-gestion/seguridad', label: 'Seguridad', icon: ShieldCheck },
  { href: '/dashboard/documentos-gestion/adquisiciones', label: 'Adquisiciones', icon: PackageSearch },
  { href: '/dashboard/documentos-gestion/eecc', label: 'Contratistas', icon: Building2 },
  { href: '/dashboard/documentos-gestion/reportes', label: 'Reportes', icon: FileBarChart },
];

export default function DocumentManagementLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-5">
      <AreaNavigation label="Gestión documental" primary={items.slice(0, 3)} secondary={items.slice(3)}
        isActive={(href) => href === '/dashboard/documentos-gestion' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)} />
      {children}
    </div>
  );
}
