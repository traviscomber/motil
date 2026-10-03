# Módulos por Rol - Sistema n3uralia ERP

## Descripción General

El sistema implementa **control de acceso basado en roles (RBAC)** en el sidebar. Cada usuario solo ve los módulos para los que tiene permisos según su rol.

---

## Roles y Permisos

### 🔴 SUPERADMIN (juan@n3uralia.com)
**Acceso:** COMPLETO a TODOS los módulos

**Módulos disponibles:**
- ✅ Dashboard
- ✅ Alertas
- ✅ Producción
- ✅ Mantención
- ✅ Órdenes de Trabajo
- ✅ Bodega & Inventario
- ✅ HSE & Compliance
- ✅ Gestión Documental
- ✅ Compras & OCs
- ✅ Finanzas & Presupuesto
- ✅ Reportes & Análisis
- ✅ IA Operacional Minera
- ✅ Dashboard de KPIs
- ✅ Gestión de Usuarios (Admin)
- ✅ Gestión de Permisos (Admin)
- ✅ Guías de Uso

---

### 🟠 OPERACIONES-SUPERVISOR (demo@n3uralia.com)
**Acceso:** Módulos de operación minera crítica

**Módulos disponibles:**
- ✅ Dashboard
- ✅ Alertas
- ✅ Producción
- ✅ Mantención
- ✅ Órdenes de Trabajo
- ✅ Bodega & Inventario
- ✅ HSE & Compliance
- ✅ Gestión Documental
- ❌ Compras & OCs
- ❌ Finanzas & Presupuesto
- ❌ Reportes & Análisis
- ❌ IA Operacional Minera
- ❌ Dashboard de KPIs
- ❌ Gestión de Usuarios
- ❌ Gestión de Permisos

---

### 🟢 BODEGA-SUPERVISOR
**Acceso:** Solo módulo de bodega

**Módulos disponibles:**
- ✅ Dashboard
- ✅ Bodega & Inventario
- ✅ Guías de Uso

---

### 🔵 HSE-SUPERVISOR
**Acceso:** Solo módulo de HSE

**Módulos disponibles:**
- ✅ Dashboard
- ✅ HSE & Compliance
- ✅ Guías de Uso

---

### 🟡 COMPRAS-SUPERVISOR
**Acceso:** Solo módulo de compras

**Módulos disponibles:**
- ✅ Dashboard
- ✅ Compras & OCs
- ✅ Guías de Uso

---

### 🟣 FINANZAS-SUPERVISOR
**Acceso:** Solo módulo de finanzas

**Módulos disponibles:**
- ✅ Dashboard
- ✅ Finanzas & Presupuesto
- ✅ Reportes & Análisis
- ✅ Guías de Uso

---

## Implementación Técnica

### Archivo: `components/layout/sidebar.tsx`

**Cambios realizados:**
1. Importación del hook `useAuth()` para obtener el rol del usuario
2. Array `rolePermissions` que define qué roles pueden ver cada módulo
3. Hook `useMemo` para filtrar items según el rol (recomputación eficiente)
4. Renderizado dinámico del sidebar solo con módulos permitidos

**Código:**
```typescript
const rolePermissions: Record<string, string[]> = {
  'Producción': ['superadmin', 'admin', 'Operaciones-Supervisor'],
  'HSE & Compliance': ['superadmin', 'admin', 'HSE-Supervisor'],
  'Bodega & Inventario': ['superadmin', 'admin', 'Bodega-Supervisor'],
  // ... más módulos
};

const filteredMenuItems = useMemo(() => {
  if (!role) return [];
  if (role === 'superadmin' || role === 'admin') {
    return menuItems; // Ver todo
  }
  return menuItems.filter(item => {
    const allowedRoles = rolePermissions[item.label] || [];
    return allowedRoles.includes(role);
  });
}, [role]);
```

---

## Cómo Probar

1. **Acceder como SUPERADMIN:**
   - Email: `juan@n3uralia.com`
   - Contraseña: `<SET_VIA_AUTH_ADMIN>`
   - Resultado: Verás TODOS los módulos

2. **Acceder como OPERACIONES-SUPERVISOR:**
   - Email: `demo@n3uralia.com`
   - Contraseña: `<SET_VIA_AUTH_ADMIN>`
   - Resultado: Verás solo módulos de operación

---

## Cómo Agregar Nuevos Roles

1. Editar `rolePermissions` en `components/layout/sidebar.tsx`
2. Añadir entrada para cada módulo que el nuevo rol debe ver
3. Crear usuario con el nuevo rol via Supabase Auth user_metadata

**Ejemplo:**
```typescript
const rolePermissions = {
  'Producción': ['superadmin', 'admin', 'Operaciones-Supervisor', 'NUEVO-ROL'],
  'Dashboard': ['superadmin', 'admin', 'NUEVO-ROL', 'viewer'],
};
```

---

## Seguridad

- El filtrado es **frontend-only para UX**
- **IMPORTANTE:** Las rutas de API también deben validar el rol
- Ver: `lib/middleware/check-permission.ts` para validación backend

---

**Estado:** ✅ Implementado y Operativo
**Última actualización:** Mayo 2026
