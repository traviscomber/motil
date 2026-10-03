# Administración de usuarios privilegiados

Este documento reemplaza una nota histórica que contenía credenciales y datos específicos de una cuenta administrativa.

## Regla vigente

- Los usuarios administrativos se crean y gestionan desde Administración > Usuarios.
- Las credenciales reales no se almacenan en Git, documentación, issues, PRs ni logs.
- La asignación de rol debe quedar limitada a la organización correspondiente.
- El estado del perfil debe ser `active` para permitir acceso.
- Los permisos de módulos deben resolverse desde la matriz canónica de roles/cargos.
- Las identidades Supabase Auth deben estar vinculadas a un perfil MOTIL canónico.

## Verificación

Para validar un usuario privilegiado:

1. Confirmar perfil canónico y organización.
2. Confirmar vínculo de identidad Auth cuando corresponda.
3. Confirmar rol/cargo vigente.
4. Probar sólo las operaciones autorizadas para ese rol.
5. Revisar RLS y guards de API del módulo afectado.

No insertar hashes ni credenciales manualmente como procedimiento operativo.
