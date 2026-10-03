# Actualización segura de contraseñas en MOTIL

Este documento reemplaza el procedimiento histórico que incluía una contraseña real y proponía actualizar un hash directamente en una tabla de aplicación.

## Regla

Las contraseñas reales no se almacenan en el repositorio, documentación, issues, PRs, scripts ni logs.

## Procedimiento

1. Use el flujo oficial de administración o recuperación de Supabase Auth.
2. Defina la nueva contraseña fuera del repositorio.
3. Revoque o cierre sesiones anteriores cuando el cambio responda a una exposición.
4. Verifique el acceso con la nueva credencial.
5. No modifique manualmente un campo `password_hash` de una tabla de perfil como sustituto de Supabase Auth.

## Automatización local

Los scripts administrativos deben leer la contraseña desde una variable de entorno no versionada, por ejemplo:

```bash
MOTIL_NEW_PASSWORD='<valor-local>' node scripts/change-password.mjs
```

Nunca sustituya `<valor-local>` por una credencial real dentro de un archivo versionado.
