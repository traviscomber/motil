# Sistema de Cargos - Arquitectura Conectada

## Resumen Ejecutivo

El sistema de permisos se basa en una única fuente de verdad: **CARGO**. Todos los permisos y accesos se heredan del cargo asignado al usuario a través de la **Matriz de Roles**.

---

## Componentes Conectados

### 1. Base de Datos - Tabla `cargos`

**Ubicación:** Supabase → tabla `cargos`

**Columnas:**
- `id` (UUID): Identificador único del cargo
- `name` (TEXT): Nombre del cargo (ej: "JEFE SOSTENIBILIDAD", "GERENTE", etc.)
- `display_order` (INTEGER): Orden de visualización en listas y dropdowns
- `created_at` (TIMESTAMP): Fecha de creación

**Cargos disponibles:**
- PRESIDENTE (display_order: 0)
- GERENTE (display_order: 1)
- SUBGERENTE OP. (display_order: 2)
- JEFE SOSTENIBILIDAD (display_order: 3)
- PREVENCIONISTA (display_order: 4)
- ASISTENTE TÉCNICO (display_order: 5)
- JEFE MINA PEUMO (display_order: 6)
- JEFE MINA DON JAIME (display_order: 7)
- JEFE ING. PLA MINA (display_order: 8)
- JEFE GEÓLOGIA (display_order: 9)
- (y más...)

---

### 2. Matriz de Roles - `role_matrix`

**Ubicación:** Supabase → tabla `role_matrix`

**Estructura:**
```
cargo_id (FK → cargos.id) 
  + module_key (TEXT) 
  = access_level (ED/LEC/SR)
```

**Niveles de acceso:**
- `ED` (Editor): Acceso completo de lectura y escritura
- `LEC` (Solo lectura): Acceso de lectura únicamente
- `SR` (Sin acceso): Sin acceso al módulo

**Módulos disponibles:**
- eecc (Estado Económico)
- bodega (Gestión de Bodega)
- finanzas (Finanzas)
- sostenibilidad (Sostenibilidad)
- rrhh (Recursos Humanos)
- (y más...)

---

### 3. Perfil de Usuario - `profiles`

**Ubicación:** Supabase → tabla `profiles`

**Columnas relevantes:**
- `id` (UUID): ID del usuario (FK → auth.users)
- `email` (TEXT): Email del usuario
- `full_name` (TEXT): Nombre completo
- `role` (TEXT): Rol del sistema (siempre `'viewer'` para usuarios normales)
- `cargo_id` (UUID FK → cargos.id): **ÚNICO campo que determina permisos**
- `status` (TEXT): 'active' o 'inactive'

---

### 4. Administración de Cargos - `/dashboard/admin/roles`

**Ubicación:** `pages/dashboard/admin/roles/page.tsx`

**Funcionalidades:**

#### Tab 1: Asignar Cargos
- Ver lista de cargos disponibles
- Crear nuevos cargos
- Editar/Eliminar cargos
- **IMPORTANTE:** Los cambios aquí se reflejan automáticamente en el dropdown de crear usuario

#### Tab 2: Matriz de Roles
- Visualizar permisos por cargo y módulo
- Editar acceso (ED/LEC/SR) para cada cargo-módulo
- Los cambios aquí determinan qué puede hacer cada usuario según su cargo

---

### 5. Creación de Usuarios - `/dashboard/admin/users`

**Ubicación:** `pages/dashboard/admin/users/page.tsx`

**Componente:** `CreateUserForm`

**Campos obligatorios:**
1. Nombre completo
2. Correo electrónico
3. Contraseña (validada: 8+ chars, mayúscula, número, símbolo)
4. **Cargo** (seleccionado del dropdown cargado dinámicamente)

**Flujo:**
1. El formulario carga cargos desde `/api/admin/cargos`
2. Usuario selecciona un cargo
3. Al crear usuario:
   - Se valida que cargo esté seleccionado
   - Se crea usuario con `role='viewer'` y `cargo_id=<selected_cargo_id>`
   - Los permisos se heredan automáticamente de la matriz

---

### 6. API Endpoints

#### `GET /api/admin/cargos`
**Propósito:** Cargar lista de cargos disponibles para el dropdown

**Respuesta:**
```json
{
  "cargos": [
    { "id": "uuid-1", "name": "PRESIDENTE", "display_order": 0 },
    { "id": "uuid-2", "name": "GERENTE", "display_order": 1 },
    ...
  ]
}
```

**Nota importante:** Este endpoint devuelve TODOS los cargos sin filtrar por organización, ya que la tabla `cargos` no tiene columna `organization_id`.

#### `POST /api/admin/users`
**Propósito:** Crear nuevo usuario

**Request:**
```json
{
  "email": "usuario@empresa.cl",
  "password": "SecurePassword123!",
  "full_name": "Juan Pérez",
  "cargo_id": "uuid-del-cargo"
}
```

**Validaciones:**
- Email debe ser válido
- Password debe cumplir requisitos
- Cargo ID es obligatorio

---

## Flujo de Permisos

```
USUARIO
  ├─ Nombre
  ├─ Email
  ├─ Contraseña
  └─ CARGO (único determinante de permisos)
       │
       └─ MATRIZ DE ROLES
            ├─ Módulo A → ED/LEC/SR
            ├─ Módulo B → ED/LEC/SR
            ├─ Módulo C → ED/LEC/SR
            └─ ...
```

### Ejemplo Práctico

**Escenario:** Crear usuario "María" como "JEFE SOSTENIBILIDAD"

1. Admin va a `/dashboard/admin/users`
2. Completa formulario:
   - Nombre: "María López"
   - Email: "maria@lapatagua.cl"
   - Contraseña: <SET_VIA_AUTH_ADMIN>
   - Cargo: **"JEFE SOSTENIBILIDAD"** ← Selecciona del dropdown
3. Sistema crea usuario con `cargo_id = ID de JEFE SOSTENIBILIDAD`
4. María automáticamente tiene acceso según la matriz:
   - ¿Puede editar sostenibilidad? Sí (si matriz dice ED)
   - ¿Puede acceder a finanzas? Depende de la matriz
   - ¿Puede editar bodega? Depende de la matriz

---

## Administración Centralizada

### Para crear/modificar cargos:
→ Ir a `/dashboard/admin/roles` → Tab "Asignar cargos"

### Para definir permisos de cada cargo:
→ Ir a `/dashboard/admin/roles` → Tab "Matriz de roles"

### Para crear usuarios con un cargo:
→ Ir a `/dashboard/admin/users` → Seleccionar cargo del dropdown

---

## Puntos de Sincronización

El sistema está totalmente conectado mediante estos puntos:

| Acción | Efecto Inmediato |
|--------|-----------------|
| Crear cargo en "Asignar cargos" | Aparece en dropdown de crear usuario |
| Eliminar cargo | Ya no se puede asignar a nuevos usuarios |
| Cambiar permisos en matriz | Los usuarios con ese cargo heredan nuevos permisos |
| Asignar cargo a usuario | Usuario obtiene permisos según matriz |

---

## Arquitectura de Código

### Archivos Clave
- `pages/dashboard/admin/roles/page.tsx` - Página principal de administración
- `components/admin/assign-cargo-tab.tsx` - Gestión de cargos
- `components/admin/role-matrix-tab.tsx` - Matriz de permisos
- `components/admin/create-user-form.tsx` - Formulario de creación de usuarios
- `app/api/admin/cargos/route.ts` - API para cargar cargos
- `app/api/admin/users/route.ts` - API para crear usuarios
- `lib/api/admin-data.ts` - Funciones de base de datos

### Flujo de Datos
1. `CreateUserForm` llama a `GET /api/admin/cargos`
2. API devuelve cargos desde BD (tabla `cargos`)
3. Usuario selecciona cargo
4. `CreateUserForm` llama a `POST /api/admin/users` con `cargo_id`
5. API crea usuario en `profiles` con `cargo_id`
6. Sistema RBAC automáticamente consulta `role_matrix[cargo_id][module]` para cada acceso

---

## Resumen de Cambios Recientes

**Fix aplicado:** Removido filtro `organization_id` del endpoint `/api/admin/cargos` porque esa columna no existe en la tabla `cargos`. Ahora devuelve todos los cargos correctamente ordenados por `display_order`.

**Estado:** ✅ Funcionando correctamente
