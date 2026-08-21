# Lista de salida a producción

Esta lista complementa los controles incluidos en el código. No se debe habilitar el envío masivo hasta completarla y dejar evidencia de cada punto.

## Antes de staging

- [ ] Aplicar y registrar las migraciones de `supabase/migrations` en orden.
- [ ] Confirmar que el correo de propietario existe y tiene `platform_owner`.
- [ ] Probar con dos usuarios de marcas distintas que no puedan leer ni modificar información ajena.
- [ ] Verificar una sincronización controlada de Tokko y WordPress para cada marca.
- [ ] Enviar un correo de prueba a una cuenta controlada y comprobar el evento de Resend.
- [ ] Definir el dominio público final y las URLs exactas de callback de Supabase.

## Supabase

- [ ] Desactivar el registro público si el acceso será solo por invitación.
- [ ] Exigir confirmación de correo, contraseña mínima de 12 caracteres y protección ante contraseñas filtradas.
- [ ] Activar CAPTCHA y límites de intentos de login y recuperación.
- [ ] Activar MFA para propietarios y administradores.
- [ ] Activar copias de seguridad/PITR y probar una restauración.
- [ ] Mantener la service-role key solo en secretos de servidor; nunca en el navegador, repositorio o ticket.

## Vercel y despliegue

- [ ] Desplegar con un dominio propio y registrar ese dominio en los callbacks de Supabase y Resend.
- [ ] Guardar secretos en Vercel Environment Variables; `.env` y `.env.local` deben quedar excluidos por `.vercelignore`.
- [ ] Activar Vercel Firewall/WAF y protección contra bots según el plan contratado.
- [ ] Aplicar rate limits: login/recuperación 5 por minuto/IP; APIs mutables 60 por minuto/IP; sincronizaciones y tareas 5 por minuto/IP; webhook Resend 120 por minuto/IP.
- [ ] Mantener `/api/tasks/*` limitado a `platform_owner` y aplicar un rate limit distribuido adicional.
- [ ] Configurar alertas para 401/403/413/429/5xx, fallos de webhook, fallos de sincronización y latencia de proveedores.

## Envíos y cumplimiento

- [ ] Confirmar consentimiento y fuente antes de cada importación de contactos.
- [ ] Configurar SPF, DKIM y DMARC del dominio remitente.
- [ ] Mantener un enlace de baja y el flujo de supresión antes de activar campañas masivas.
- [ ] Mantener `ENABLE_BULK_SEND=false` hasta ejecutar una campaña piloto aprobada.
- [ ] Desplegar Trigger.dev, verificar `send-campaign` y confirmar la tarea programada `automation-scheduler` en `America/Lima`.

## Calidad recurrente

- [ ] El workflow `Quality gate` debe estar verde antes de fusionar cambios.
- [ ] Añadir pruebas de flujo completo para login, roles, importación CSV, sincronizaciones y envío de prueba.
- [ ] Ejecutar un escaneo DAST contra staging después de cambios de autenticación, permisos, webhooks o integraciones.
