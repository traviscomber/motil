import type { OrganizationSuccessContext } from '@/lib/api/organization-context';

export type WorkshopSite = 'Don Jaime' | 'San Pedro' | 'Peumo';

export function workshopSiteFromCargo(cargoName?: string | null): WorkshopSite | null {
  const cargo = String(cargoName || '').trim().toLowerCase();
  if (cargo === 'jefe de taller mina don jaime') return 'Don Jaime';
  if (cargo === 'jefe de taller mina san pedro') return 'San Pedro';
  if (cargo === 'jefe de taller mina peumo') return 'Peumo';
  return null;
}

export function workshopSiteFromKnownLocation(location?: string | null): WorkshopSite | null {
  const text = String(location || '').trim().toLowerCase();
  if (/^(mina\s+)?don jaime$/.test(text)) return 'Don Jaime';
  if (/^(mina\s+)?san pedro$/.test(text)) return 'San Pedro';
  if (/^(mina\s+)?peumo$/.test(text)) return 'Peumo';
  return null;
}

export function workshopSiteFromRoleTitle(title?: string | null): WorkshopSite | null {
  const text = String(title || '').trim().toLowerCase();
  if (/\bmina\s+don jaime\b/.test(text)) return 'Don Jaime';
  if (/\bmina\s+san pedro\b/.test(text)) return 'San Pedro';
  if (/\bmina\s+peumo\b/.test(text)) return 'Peumo';
  return null;
}

export type WorkshopHeadScope =
  | { isWorkshopHead: false; site: null; personId: null }
  | { isWorkshopHead: true; site: WorkshopSite; personId: string | null };

export async function resolveWorkshopHeadScope(context: OrganizationSuccessContext): Promise<WorkshopHeadScope> {
  const { data: profile, error: profileError } = await context.supabase
    .from('profiles')
    .select('cargo_id,status')
    .eq('organization_id', context.organizationId)
    .eq('id', context.userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.cargo_id) return { isWorkshopHead: false, site: null, personId: null };

  const { data: cargo, error: cargoError } = await context.supabase
    .from('cargos').select('name').eq('id', profile.cargo_id).maybeSingle();
  if (cargoError) throw cargoError;

  const site = workshopSiteFromCargo(cargo?.name);
  if (!site) return { isWorkshopHead: false, site: null, personId: null };
  if (String(profile.status || '').toLowerCase() !== 'active') {
    return { isWorkshopHead: true, site, personId: null };
  }

  const { data: person, error: personError } = await context.supabase
    .from('people').select('id')
    .eq('organization_id', context.organizationId)
    .eq('profile_id', context.userId)
    .eq('employment_status', 'active')
    .maybeSingle();
  if (personError) throw personError;
  return { isWorkshopHead: true, site, personId: person?.id || null };
}

export function workshopHeadCanAccessOrder(
  scope: WorkshopHeadScope,
  order: { workshop_site?: string | null; assigned_person_id?: string | null },
): boolean {
  if (!scope.isWorkshopHead) return true;
  if (!scope.personId) return false;
  if (order.workshop_site) return order.workshop_site === scope.site;
  // Older unclassified OTs are visible ONLY to their explicitly assigned technician.
  return order.assigned_person_id === scope.personId;
}

export function workshopHeadOrderFilter(scope: Extract<WorkshopHeadScope, { isWorkshopHead: true }>): string {
  // Values are from fixed canonical site constants and a verified UUID, never client input.
  return `workshop_site.eq."${scope.site}",and(workshop_site.is.null,assigned_person_id.eq.${scope.personId})`;
}
