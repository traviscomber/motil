type NavigationItem = { href: string; moduleKey?: string; roles?: string[]; group?: string };

export function canNavigateTo(item: NavigationItem, role: string | null | undefined, enforced: boolean, canView: (moduleKey: string) => boolean): boolean {
  if (!role) return false;
  if (enforced && item.moduleKey) return canView(item.moduleKey);
  return role === 'superadmin' || role === 'admin'
    || (role === 'gerente_operaciones' && item.group !== 'admin')
    || !item.roles || item.roles.includes(role);
}

export function activeNavigationHref(pathname: string, items: readonly NavigationItem[]): string | undefined {
  return items.filter(({ href }) => pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;
}
