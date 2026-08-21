# Seguridad y salida a producción

Este documento separa los controles incluidos en el código de los controles que deben configurarse en Supabase, Vercel, Resend y Trigger.dev. Ningún sistema puede prometer riesgo cero; producción requiere mantener ambos grupos.

## Controles implementados

- Autenticación verificada en servidor con `getUser()`, no mediante datos de sesión confiados por el cliente.
- Autorización por propietario y roles por marca; lecturas filtradas por UUID de membresía.
- RLS multi-tenant y privilegios de columna que impiden que un usuario se asigne `platform_owner`.
- Protección CSRF por `Origin`/Fetch Metadata en operaciones con cookies.
- JSON tipado defensivamente, límites de cuerpo y listas blancas para evitar mass assignment.
- Escape de HTML en correos de prueba y saneamiento de URLs externas.
- Protección SSRF para WordPress, incluidas redirecciones, IP privadas y hosts reservados.
- Timeouts, límites de descarga y paginación en Resend, Tokko y WordPress.
- Webhook Resend firmado, comparación constante, ventana anti-replay de cinco minutos y cuerpo máximo de 256 KiB.
- CSP, HSTS, anti-framing, `nosniff`, política de permisos y `no-store` para auth/API.
- Funciones de Next.js sin uso de shell, `child_process`, escritura persistente al sistema operativo ni evaluación dinámica.
- Dependencias de producción auditadas y configuración de observabilidad habilitada.

## Bloqueadores antes de exponer Internet

1. Aplicar todas las migraciones, especialmente `202608130004_harden_profile_privileges.sql` y `202608130005_query_indexes.sql`.
2. En Supabase Auth: desactivar registro público, exigir confirmación de correo, contraseña mínima de 12 caracteres, protección de contraseñas filtradas, CAPTCHA y límites de intentos. Activar MFA para propietarios y administradores.
3. Limitar las URLs de redirección de Supabase únicamente al dominio productivo y sus callbacks exactos; no usar comodines amplios.
4. Guardar secretos mediante Vercel Environment Variables, excluir `.env*` del paquete y rotar cualquier clave que haya pasado por artefactos, logs, chat o repositorio.
5. En Vercel: activar Firewall/WAF, bot protection y rate limiting. Base recomendada: login/recuperación 5 solicitudes por minuto por IP; APIs mutables 60/min; sincronizaciones y tareas 5/min; webhook Resend 120/min.
6. Mantener `/api/tasks/*` restringido a `platform_owner` y añadir rate limiting distribuido.
7. Configurar alertas para picos de 401/403/413/429/5xx, latencia de proveedores, errores de webhook y ejecuciones anómalas.
8. Activar copias de seguridad/PITR en Supabase, probar restauración y definir retención/borrado de contactos y payloads de webhooks.
9. Mantener `APP_ENV=production`; habilitar envíos masivos con `ENABLE_BULK_SEND=true` solo después de una prueba controlada.
10. Ejecutar el pipeline completo y un escaneo DAST sobre staging después de cada cambio de auth, roles, webhook o integraciones.

## Riesgos residuales conocidos

- La CSP necesita temporalmente `unsafe-inline` para la hidratación y los estilos existentes; se debe migrar a nonces cuando se retire el CSS en línea.
- El rate limiting distribuido pertenece a Vercel Firewall o a un almacén compartido; no puede garantizarse con memoria local por aislamiento, múltiples regiones y reinicios de funciones.
