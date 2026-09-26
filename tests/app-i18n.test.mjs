import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dict = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');
const layout = fs.readFileSync('app/dashboard/layout.tsx', 'utf8');
const shell = fs.readFileSync('components/layout/dashboard-shell.tsx', 'utf8');
const sidebar = fs.readFileSync('components/layout/sidebar.tsx', 'utf8');
const header = fs.readFileSync('components/layout/header.tsx', 'utf8');
const langSwitch = fs.readFileSync('components/layout/app-language-switch.tsx', 'utf8');
const homePage = fs.readFileSync('app/dashboard/page.tsx', 'utf8');
const dashboardHome = fs.readFileSync('components/dashboard/dashboard-home.tsx', 'utf8');

test('dashboard layout resolves locale server-side and feeds the shell', () => {
  assert.match(layout, /getDictionaryForRequest\(\)/);
  assert.match(layout, /<DashboardShell locale=\{locale\} dictionary=\{dictionary\}>/);
  assert.match(shell, /<Sidebar dictionary=\{dictionary\} \/>/);
  assert.match(shell, /<Header sidebarCollapsed=\{collapsed\} onToggleSidebar=\{toggleSidebar\} locale=\{locale\} dictionary=\{dictionary\} \/>/);
});

test('sidebar renders every label from the dictionary', () => {
  // Menu entries keyed, not labelled, in source.
  assert.match(sidebar, /itemKey: 'home', href: '\/dashboard'/);
  assert.match(sidebar, /group: 'areas', moduleKey: 'mant_operaciones'/);
  assert.match(sidebar, /\{t\.items\[item\.itemKey\]\}/);
  assert.match(sidebar, /\{t\.groups\[group\]\}/);
  assert.match(sidebar, /\{dictionary\.app\.header\.signOut\}/);
  assert.match(sidebar, /aria-label=\{isOpen\?t\.close:t\.open\}/);
  assert.match(sidebar, /\{t\.tagline\}/);
  // No hardcoded Spanish chrome may remain.
  for (const literal of ['Inicio', 'Gestión diaria', 'Cerrar navegación', 'Navegación principal', "label:'", "group:'Principal'", "group:'Áreas'"]) {
    assert.doesNotMatch(sidebar, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `sidebar must not hardcode ${literal}`);
  }
});

test('header breadcrumbs, roles and actions come from the dictionary', () => {
  assert.match(header, /const t=dictionary\.app\.header;/);
  assert.match(header, /const routes=t\.routes as Record<string,string>;/);
  assert.match(header, /const roleLabels=t\.roles as Record<string,string>;/);
  assert.match(header, /sidebarAction=sidebarCollapsed\?t\.showMenu:t\.hideMenu/);
  assert.match(header, /aria-label=\{t\.breadcrumbLabel\}/);
  assert.match(header, /aria-label=\{t\.viewCalendar\}/);
  assert.match(header, /aria-label=\{t\.viewAlerts\}/);
  assert.match(header, /\{t\.signOut\}/);
  assert.doesNotMatch(header, /const routeLabels/);
  assert.doesNotMatch(header, /Mostrar menú/);
  assert.doesNotMatch(header, /Ruta de navegación/);
  assert.doesNotMatch(header, /Sin rol asignado/);
});

test('app language switcher forces a full document navigation', () => {
  assert.match(langSwitch, /locale === 'en' \? pathname : `\/en\$\{pathname\}`/);
  assert.match(langSwitch, /preventDefault\(\)/);
  assert.match(langSwitch, /window\.location\.assign\(target\)/);
  assert.match(langSwitch, /lang=\{locale === 'en' \? 'es' : 'en'\}/);
});

test('app namespace carries chrome copy for both locales', () => {
  assert.match(dict, /app: \{/);
  // es
  assert.match(dict, /home: 'Inicio'/);
  assert.match(dict, /'ordenes-trabajo': 'Órdenes de trabajo'/);
  assert.match(dict, /superadmin: 'Administrador general'/);
  assert.match(dict, /signOut: 'Cerrar sesión'/);
  assert.match(dict, /openUserMenu: 'Abrir menú de usuario'/);
  // en
  assert.match(dict, /home: 'Home'/);
  assert.match(dict, /'ordenes-trabajo': 'Work orders'/);
  assert.match(dict, /superadmin: 'General administrator'/);
  assert.match(dict, /signOut: 'Sign out'/);
  assert.match(dict, /openUserMenu: 'Open user menu'/);
});

test('dashboard home is a server wrapper over a locale-aware client', () => {
  assert.match(homePage, /getDictionaryForRequest\(\)/);
  assert.match(homePage, /<DashboardHome locale=\{locale\} dictionary=\{dictionary\} \/>/);
  assert.match(dashboardHome, /const t = dictionary\.app\.home;/);
  assert.match(dashboardHome, /t\.modes\.plant/);
  assert.match(dashboardHome, /t\.modes\.maintenance/);
  assert.match(dashboardHome, /t\.modes\.drilling/);
  assert.match(dashboardHome, /t\.modes\.management/);
  assert.match(dashboardHome, /t\.modes\.general/);
  const priorities = fs.readFileSync('components/dashboard/home-decision-priorities.tsx', 'utf8');
  assert.match(priorities, /dictionary\.app\.home\.priorities/);
  // No hardcoded role-mode copy may remain in the component.
  for (const literal of ['Mi Planta', 'Mi Mantención', 'Mi Bodega', 'Resumen ejecutivo', 'Acciones pendientes', 'Por qué importa:']) {
    assert.doesNotMatch(dashboardHome, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `dashboard-home must not hardcode ${literal}`);
  }
  assert.match(shell, /pathname === '\/dashboard' \? <HomeDecisionPriorities locale=\{locale\} dictionary=\{dictionary\} \/> : null/);
});

test('actions inbox is a server wrapper over a locale-aware client', () => {
  const actionsPage = fs.readFileSync('app/dashboard/acciones/page.tsx', 'utf8');
  const inbox = fs.readFileSync('components/actions/actions-inbox.tsx', 'utf8');

  assert.match(actionsPage, /getDictionaryForRequest\(\)/);
  assert.match(actionsPage, /<ActionsInbox locale=\{locale\} dictionary=\{dictionary\} \/>/);
  assert.match(inbox, /const t = dictionary\.app\.actions;/);
  assert.match(inbox, /t\.lanes\[lane\]/);
  assert.match(inbox, /t\.families\[key\]/);
  assert.match(inbox, /t\.severity\[task\.severity\]/);
  // No hardcoded actions copy may remain in the component.
  for (const literal of ['Mis acciones', 'Operación al día', 'Escalaciones', 'Calidad de datos', 'Marcar pendiente', 'Operación actual']) {
    assert.doesNotMatch(inbox, new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `actions-inbox must not hardcode ${literal}`);
  }
});
