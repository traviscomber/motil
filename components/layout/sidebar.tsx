'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, Boxes, ChevronDown, CircleDollarSign, FileCheck, Gem, HelpCircle, Home, Leaf, LogOut, Menu, ShieldCheck, ShoppingCart, Users, Wrench, X, Zap, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useModuleAccess } from '@/hooks/use-module-access';

type MenuItem = { label: string; href: string; icon: LucideIcon; group: string; moduleKey?: string; roles?: string[] };
const operationalRoles = ['superadmin','admin','manager','supervisor','Operaciones-Supervisor','Sostenibilidad-Supervisor','HSE-Supervisor','Bodega-Supervisor','Compras-Supervisor','jefe_mantencion','jefe_planta','jefe_produccion'];
const allStandardRoles = ['superadmin','admin','manager','supervisor','viewer','jefe_mantencion','jefe_planta','jefe_produccion','Operaciones-Supervisor','Finanzas-Supervisor','Bodega-Supervisor','Compras-Supervisor','Sostenibilidad-Supervisor','HSE-Supervisor'];
const menuItems: MenuItem[] = [
  { label:'Inicio',href:'/dashboard',icon:Home,group:'Principal',roles:allStandardRoles },
  { label:'Gestión diaria',href:'/dashboard/daily-management',icon:Activity,group:'Principal',roles:operationalRoles },
  { label:'Producción',href:'/dashboard/produccion',icon:Zap,group:'Áreas',moduleKey:'prod_operaciones',roles:['superadmin','admin','Operaciones-Supervisor','jefe_mantencion','jefe_planta','jefe_produccion'] },
  { label:'Geología',href:'/dashboard/produccion/geologia',icon:Gem,group:'Áreas',moduleKey:'prod_geologia' },
  { label:'Mantenimiento',href:'/dashboard/mantenimiento',icon:Wrench,group:'Áreas',moduleKey:'mant_operaciones',roles:['superadmin','admin','Operaciones-Supervisor','jefe_mantencion'] },
  { label:'Bodega',href:'/dashboard/bodega',icon:Boxes,group:'Áreas',moduleKey:'bodega_inventario',roles:['superadmin','admin','Bodega-Supervisor','jefe_mantencion'] },
  { label:'Compras',href:'/dashboard/compras',icon:ShoppingCart,group:'Áreas',moduleKey:'fin_compras',roles:['superadmin','admin','Compras-Supervisor'] },
  { label:'Finanzas',href:'/dashboard/finanzas',icon:CircleDollarSign,group:'Áreas',moduleKey:'fin_finanzas',roles:['superadmin','admin','Finanzas-Supervisor'] },
  { label:'RRHH',href:'/dashboard/rrhh',icon:Users,group:'Áreas',roles:['superadmin','admin','manager'] },
  { label:'Sostenibilidad',href:'/dashboard/sostenibilidad',icon:Leaf,group:'Áreas',moduleKey:'sos_tablero',roles:['superadmin','admin','Sostenibilidad-Supervisor','HSE-Supervisor'] },
  { label:'Legal',href:'/dashboard/legal',icon:FileCheck,group:'Áreas',moduleKey:'legal_modulo',roles:['superadmin','admin','manager'] },
  { label:'Roles y cargos',href:'/dashboard/admin/roles',icon:ShieldCheck,group:'Administración',roles:['superadmin','admin'] },
  { label:'Usuarios',href:'/dashboard/admin/users',icon:Users,group:'Administración',roles:['superadmin','admin'] },
  { label:'Ayuda',href:'/dashboard/guias',icon:HelpCircle,group:'Ayuda',roles:allStandardRoles },
];
const groupOrder=['Principal','Áreas','Administración','Ayuda'];
function isItemActive(pathname:string,href:string){if(href==='/dashboard')return pathname===href;return pathname===href||pathname.startsWith(`${href}/`)}
export function Sidebar(){
  const pathname=usePathname(); const router=useRouter(); const {role,logout}=useAuth(); const {enforced,canView}=useModuleAccess();
  const [isOpen,setIsOpen]=useState(false); const [expandedGroups,setExpandedGroups]=useState<Record<string,boolean>>({Principal:true,Áreas:true});
  const filteredItems=useMemo(()=>{if(!role)return[];return menuItems.filter((item)=>{if(enforced&&item.moduleKey)return canView(item.moduleKey);const roleAllowed=role==='superadmin'||role==='admin'||(role==='gerente_operaciones'&&item.group!=='Administración')||!item.roles||item.roles.includes(role);if(!roleAllowed)return false;if(!enforced||!item.moduleKey)return true;return canView(item.moduleKey)})},[role,enforced,canView]);
  const activeGroup=useMemo(()=>filteredItems.find((item)=>isItemActive(pathname,item.href))?.group,[filteredItems,pathname]);
  useEffect(()=>{if(activeGroup)setExpandedGroups((current)=>({...current,[activeGroup]:true}))},[activeGroup]);
  const navigate=(href:string)=>{router.push(href);setIsOpen(false)};
  return <><Button variant="outline" size="icon" aria-label={isOpen?'Cerrar navegación':'Abrir navegación'} className="fixed left-4 top-3 z-50 bg-background lg:hidden" onClick={()=>setIsOpen((current)=>!current)}>{isOpen?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</Button><aside className={cn('fixed inset-y-0 left-0 z-40 flex h-screen w-[248px] flex-col border-r border-sidebar-border/80 bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0',isOpen?'translate-x-0':'-translate-x-full')}><div className="border-b border-sidebar-border/80 px-4 py-4"><Link href="/dashboard" className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Image src="/brand/motil-wordmark.png" alt="MOTIL" width={2094} height={610} priority className="h-7 w-auto"/><p className="mt-2 truncate text-[10px] uppercase tracking-[0.09em] text-muted-foreground">Mining Operating System</p></Link></div><nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Navegación principal"><div className="space-y-2">{groupOrder.map((group)=>{const items=filteredItems.filter((item)=>item.group===group);if(!items.length)return null;const expanded=expandedGroups[group]??false;return <section key={group}><button type="button" onClick={()=>setExpandedGroups((current)=>({...current,[group]:!expanded}))} aria-expanded={expanded} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"><span>{group}</span><ChevronDown className={cn('h-3.5 w-3.5 transition-transform',!expanded&&'-rotate-90')}/></button>{expanded?<div className="mt-0.5 space-y-0.5">{items.map((item)=>{const Icon=item.icon;const active=isItemActive(pathname,item.href);return <button type="button" key={item.href} onClick={()=>navigate(item.href)} aria-current={active?'page':undefined} className={cn('relative flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',active?'bg-primary/10 font-medium text-foreground before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary':'text-sidebar-foreground/72 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground')}><Icon className={cn('h-4 w-4 shrink-0',active?'text-primary':'text-muted-foreground')}/><span className="truncate">{item.label}</span></button>})}</div>:null}</section>})}</div></nav><div className="border-t border-sidebar-border/80 p-3"><ThemeToggle/><Button variant="ghost" className="mt-1 w-full justify-start gap-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}><LogOut className="h-4 w-4"/>Cerrar sesión</Button></div></aside>{isOpen?<button type="button" aria-label="Cerrar navegación" className="fixed inset-0 z-30 bg-black/45 lg:hidden" onClick={()=>setIsOpen(false)}/>:null}</>;
}
