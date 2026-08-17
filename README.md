# Area Mail

Panel privado multi-sitio para campañas, automatizaciones, audiencias e integraciones inmobiliarias.

## Stack y límites de confianza

- Vinext/React 19 sobre Cloudflare Workers.
- Supabase Auth y PostgreSQL con RLS multi-tenant.
- Credenciales administrativas únicamente en servidor.
- Resend, Tokko y WordPress detrás de adaptadores con timeout, límite de respuesta y protección SSRF.
- Trigger.dev para trabajos programados.

El panel no tiene registro público. Todas las páginas privadas validan la sesión en servidor y cada operación comprueba el rol global o el rol de la marca antes de acceder con la credencial de servicio.

## Desarrollo

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abre `http://localhost:3000`. Sin una configuración válida de Supabase no se concede acceso al panel.

## Variables

Consulta `.env.example`. Nunca expongas `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `TRIGGER_SECRET_KEY` ni `TOKKO_API_KEY` al navegador o al repositorio. En producción configúralas como secretos del proveedor, no como archivos `.env` desplegados.

## Base de datos

Aplica todas las migraciones de `supabase/migrations` en orden. Incluyen RLS por marca, privilegios de columna para impedir elevación de roles, índices para consultas por tenant y restricciones de automatizaciones.

## Calidad

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

Antes de producción completa obligatoriamente [docs/PRODUCTION_SECURITY.md](docs/PRODUCTION_SECURITY.md).
