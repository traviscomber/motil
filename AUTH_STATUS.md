# Estado de autenticación de MOTIL

Este archivo sustituye documentación histórica que contenía credenciales y describía modos de autenticación ya obsoletos.

## Estado vigente

- El acceso requiere credenciales válidas.
- Las sesiones de compatibilidad se firman y se verifican en servidor.
- Las sesiones Supabase Auth se resuelven contra el perfil canónico de MOTIL.
- Los perfiles inactivos invalidan el acceso.
- Los roles y la organización se resuelven desde datos canónicos y asignaciones vigentes.
- El registro público está deshabilitado.
- La creación de usuarios se realiza desde Administración > Usuarios por personal autorizado.
- Las credenciales y secretos no deben almacenarse en documentación ni código versionado.

## Compatibilidad

MOTIL conserva una capa temporal de compatibilidad para perfiles históricos mientras se completa la convergencia hacia identidades Supabase Auth vinculadas mediante `auth_profile_identity_links`. Esa compatibilidad no autoriza contraseñas vacías, contraseñas arbitrarias ni cookies sin firma.

## Verificación

La fuente de verdad es el código desplegado y las tablas canónicas de autenticación/autorización. No usar documentos históricos como fuente de credenciales o comportamiento runtime.
