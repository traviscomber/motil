# CONTINUAR DESARROLLO - Instrucciones Paso a Paso

## PASO 1: SETUP INICIAL (5 minutos)

```bash
# 1. Obtener el código
git clone [tu-repo-url]
cd [proyecto]

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://[tu-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[tu-key]

# 4. Iniciar servidor de desarrollo
pnpm dev

# 5. Verificar que funciona
# Ir a: http://localhost:3000/auth/login
# Login con: juan@n3uralia.com / c4rlit0s
```

---

## PASO 2: ENTENDER LA ARQUITECTURA (30 minutos)

```
LEER EN ESTE ORDEN:
1. /QUICK_REFERENCE.md         (2 min - resumen rápido)
2. /BRANDBOOK.md               (5 min - reglas de colores - CRÍTICO)
3. /PROJECT_SUMMARY.md         (20 min - arquitectura completa)
4. /CODE_STATUS.md             (5 min - qué está hecho)
```

---

## PASO 3: VERIFICAR ESTADO ACTUAL (10 minutos)

### 3a. Test que el login funciona
```
1. Navegar a http://localhost:3000/auth/login
2. Email: juan@n3uralia.com
3. Password: <SET_VIA_AUTH_ADMIN>
4. Verificar que llega a dashboard
```

### 3b. Test que Sostenibilidad funciona
```
1. En el sidebar, hacer click en "Dashboard Sostenibilidad"
2. Verificar que carga la página con 4 pilares
3. Hacer click en "Calendario"
4. Verificar URL cambia a /dashboard/sostenibilidad/calendario
```

### 3c. Verificar que NO hay colores prohibidos
```bash
# En terminal, buscar colores prohibidos:
grep -r "bg-blue\|bg-green\|bg-red\|bg-orange\|text-blue\|text-green\|text-red\|text-orange" app/ components/ | head -20

# Resultado esperado: (vacío - sin coincidencias)
```

---

## PASO 4: SIGUIENTE TAREA DE DESARROLLO

### Opción A: Continuar con Operaciones (Recomendado)
```
1. Copiar estructura de /app/dashboard/sostenibilidad/prevencion-riesgos/
2. Crear /app/dashboard/produccion/page.tsx
3. Agregar a menuItems en /components/layout/sidebar.tsx:
   {
     label: 'Producción',
     href: '/dashboard/produccion',
     icon: Zap,
     group: 'Operaciones',
   }
4. Crear componentes siguiendo patrón de Sostenibilidad
5. IMPORTANTE: Usar SOLO tokens (primary, secondary, destructive, muted)
6. Testear con agent-browser
```

### Opción B: Arreglar Colores de Todo el Sitio
```
1. Usar patrón de buscar y reemplazar:
   grep -r "bg-blue" app/dashboard/produccion/ 
   → Reemplazar con bg-primary (o bg-secondary, destructive, muted)
2. Aplicar a todos los archivos uno por uno
3. Referencias: /components/ui/brand-badge.tsx
4. Verificar con search que no queden colores prohibidos
```

### Opción C: Ambas (Paralelo)
```
Equipo 1: Implementar Producción
Equipo 2: Arreglar colores en Mantenimiento, Bodega, Compras
```

---

## PASO 5: CREAR NUEVO MÓDULO (Detallado)

### Estructura a Copiar
```
/app/dashboard/sostenibilidad/prevencion-riesgos/
  └── page.tsx              (componente principal)
  ├── capacitaciones/
  │   └── page.tsx          (sub-módulo)
  ├── epp/
  │   └── page.tsx          (sub-módulo)
  └── ...
```

### Template para page.tsx
```tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProductionPage() {
  const [data, setData] = useState([])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Producción</h1>
          <p className="text-muted-foreground">Gestión de producción en tiempo real</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo
        </Button>
      </div>

      {/* Cards Grid - USE SEMANTIC TOKENS ONLY */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {data.map((item) => (
          <Card key={item.id} className="bg-background border-border">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span className="text-primary">{item.name}</span>
                <Button variant="ghost" size="sm">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### Colores Permitidos SOLO:
```css
/* PERMITIDO */
className="bg-primary"      ✅
className="text-secondary"  ✅
className="bg-destructive/10" ✅
className="text-muted-foreground" ✅

/* PROHIBIDO */
className="bg-blue-500"     ❌
className="text-green-600"  ❌
className="bg-red-100"      ❌
className="text-orange-800" ❌
```

---

## PASO 6: GIT WORKFLOW

```bash
# 1. Actualizar rama principal
git pull origin main

# 2. Crear rama de feature
git checkout -b feature/produccion-module

# 3. Hacer cambios...

# 4. Commit
git add .
git commit -m "feat: agregar módulo Producción con CRUD completo"

# 5. Push
git push origin feature/produccion-module

# 6. Pull request en GitHub
```

---

## PASO 7: TESTING ANTES DE DEPLOY

```bash
# 1. Verificar build
pnpm build

# 2. Testear localmente
pnpm dev
# Navegar a http://localhost:3000

# 3. Test con agent-browser
agent-browser open http://localhost:3000/dashboard/produccion
agent-browser click @e3  # Click crear nuevo
agent-browser screenshot

# 4. Verificar NO hay errores en console
# Abrir DevTools (F12) → Console → Debe estar limpia
```

---

## PASO 8: DESPLEGAR A PRODUCCIÓN

```bash
# 1. Asegurar que todo está en main
git push origin main

# 2. Vercel auto-deploya desde main
# O manual:
vercel deploy --prod

# 3. Verificar en Vercel dashboard
# Ir a: https://vercel.com/[tu-team]/[tu-proyecto]
```

---

## REFERENCIAS RÁPIDAS

### Imports Comunes
```tsx
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Icons
import { Plus, Trash2, Edit, Search } from 'lucide-react'

// Utils
import { cn } from '@/lib/utils'

// Data fetching
import useSWR from 'swr'
```

### Componentes Sostenibilidad (Copiar)
```
- /app/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones/ → Referencia CRUD
- /components/ui/brand-badge.tsx → Status badges
- /components/ui/status-badge.tsx → Estados
- /components/alerts/alertas-panel.tsx → Alertas
```

### Patrones de Código
```tsx
// Fetch data with SWR
const { data, error, isLoading } = useSWR('/api/items', fetcher)

// Form validation with Zod
import { z } from 'zod'
const schema = z.object({
  name: z.string().min(1),
})

// Semantic colors ONLY
<div className="bg-primary text-primary-foreground">
```

---

## PROBLEMAS COMUNES & SOLUCIONES

### Problema: "Cannot find module X"
```bash
# Solución: Reinstalar dependencias
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Problema: Colores no se ven bien
```
Solución: Verificar que usas tokens correctos (bg-primary, no bg-orange-500)
Lee: /BRANDBOOK.md
```

### Problema: Sidebar no navega
```
Solución: El bug ya fue FIXED (router.push en handleNavigation)
Solo verifica que el código en sidebar.tsx tiene router.push()
```

### Problema: Build falla
```bash
# Solución: Verificar TypeScript
pnpm lint

# Si hay errores, arreglarlo:
# - Chequear tipos
# - Verificar imports
# - Compilar: pnpm build
```

---

## CHECKLIST ANTES DE TERMINAR LA SESIÓN

- [ ] Code está en Git (git push)
- [ ] Build successful (pnpm build - sin errores)
- [ ] Local test passed (pnpm dev - abrir en browser)
- [ ] No console errors (F12 → Console limpia)
- [ ] Brandbook compliance (sin colores prohibidos)
- [ ] Responsive tested (mobile + desktop)
- [ ] Documentation updated (agregar a PROJECT_SUMMARY.md si cambiaste arquitectura)
- [ ] Pull request creado (si es en rama separada)

---

## CONTACTO & AYUDA

**Si necesitas ayuda:**
1. Leer: /PROJECT_SUMMARY.md
2. Buscar patrón en: /app/dashboard/sostenibilidad/
3. Revisar: /CODE_STATUS.md
4. Verificar: /BRANDBOOK.md (si es sobre colores)

**Documentación siempre disponible:**
- `/PROJECT_SUMMARY.md` - Arquitectura
- `/QUICK_REFERENCE.md` - Referencia rápida
- `/BRANDBOOK.md` - Colores
- `/CODE_STATUS.md` - Estado actual
- `v0_memories/user/MEMORY.md` - Contexto histórico

---

**Fecha de Creación:** May 14, 2026  
**Última Actualización:** May 14, 2026  
**Estado:** LISTO PARA DESARROLLAR

¡ÉXITO CON EL PROYECTO! 🚀
