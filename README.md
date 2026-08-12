# Area Mail

Panel central multi-sitio para administrar automatizaciones de correo de Area Prime, Area Retail y Area Hub. El MVP incluye dashboard, sitios, automatizaciones editables, campañas, previews con branding dinámico, integraciones, contactos, actividad, configuración, datos ficticios y tareas ejecutables manualmente.

## Stack

Next.js App Router compatible con Vinext, React 19, TypeScript strict, Tailwind CSS, PostgreSQL/Supabase, plantillas React, adapters preparados para Resend/Tokko/WordPress y tareas preparadas para Trigger.dev. El despliegue está preparado mediante OpenAI Sites/Vercel-compatible Next APIs.

## Instalación

```bash
npm install
copy .env.example .env.local
npm run dev
```

Abre la URL local mostrada. En desarrollo, `/login` ofrece acceso simulado y no requiere credenciales. Supabase Auth queda como el límite de autenticación para el modo live; no existe registro público.

## Variables de entorno

Consulta `.env.example`. Mantén `INTEGRATIONS_MODE=mock` para trabajar sin APIs. Nunca expongas `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `TRIGGER_SECRET_KEY` ni `TOKKO_API_KEY` al cliente.

## Supabase, migrations y seed

La migración inicial está en `supabase/migrations/202608120001_initial.sql` y crea todos los enums, tablas, relaciones, restricciones de duplicados e índices. `supabase/seed.sql` inserta las marcas, nueve automatizaciones y sus integraciones pendientes. Aplícalos desde Supabase CLI o SQL Editor en ese orden.

## Modo mock y tareas

Los mocks incluyen 30 propiedades, 15 posts, campañas en cuatro estados, integraciones y actividad. Para ejecutar tareas manualmente:

```bash
curl -X POST http://localhost:3000/api/tasks/sync-properties
curl -X POST http://localhost:3000/api/tasks/sync-blog-posts
curl -X POST http://localhost:3000/api/tasks/generate-weekly-properties
curl -X POST http://localhost:3000/api/tasks/generate-monthly-properties
curl -X POST http://localhost:3000/api/tasks/generate-monthly-blog
```

Trigger.dev podrá llamar estos mismos servicios al agregar el SDK y las claves reales. Ninguna tarea mock envía correos.

## Rutas

`/login`, `/dashboard`, `/sites`, `/sites/[siteId]`, `/automations`, `/campaigns`, `/campaigns/[id]`, `/templates`, `/integrations`, `/contacts`, `/activity`, `/settings` y `/api/tasks/[name]`.

## Estructura

- `app/`: páginas, layouts y route handlers.
- `src/domain/`: tipos de negocio.
- `src/data/`: dataset ficticio.
- `src/components/`: UI reutilizable.
- `src/services/`: lógica de campañas y filtros.
- `src/integrations/`: interfaces y adapters mock/live.
- `emails/`: tres plantillas sin branding hardcodeado.
- `trigger/`: catálogo y ejecución manual de tareas.
- `supabase/`: migración y seed.
- `tests/`: pruebas unitarias esenciales.

## Scripts y calidad

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Modo live y deployment

Configura las variables del proveedor, completa los adapters reales y cambia `INTEGRATIONS_MODE=live`. Revisa `docs/INTEGRATIONS.md` antes de conectar servicios. Para Vercel, importa el repositorio, configura las variables y despliega como aplicación Next.js. Para Sites, usa la configuración `.openai/hosting.json` incluida.
