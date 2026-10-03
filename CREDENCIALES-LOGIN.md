# Credenciales y acceso seguro de MOTIL

Este repositorio no debe almacenar contraseñas, tokens, service-role keys ni credenciales reales.

## Desarrollo local

Configura credenciales mediante variables de entorno locales y usa `.env.local` (ignorado por Git).

Ejemplo:

```bash
MOTIL_TEST_EMAIL=usuario-pruebas@example.com
MOTIL_TEST_PASSWORD=<definir-localmente>
```

## Ambientes compartidos

- Crear usuarios de prueba desde el sistema de autenticación correspondiente.
- Mantener secretos únicamente en el gestor de variables del ambiente.
- No documentar contraseñas reales en Markdown, issues, PRs, logs ni código fuente.
- Rotar inmediatamente cualquier credencial que haya sido publicada accidentalmente.

## Recuperación de acceso

Usar el flujo oficial de recuperación o administración de usuarios. No mantener endpoints públicos de reseteo con contraseñas embebidas en documentación.

## Nota de seguridad

Este archivo reemplaza documentación histórica que incluía credenciales en texto plano. Si una credencial real estuvo versionada anteriormente, debe considerarse comprometida y rotarse; eliminarla del HEAD no la elimina del historial Git.
