# Integraciones reales

El proyecto funciona por defecto con `INTEGRATIONS_MODE=mock`. Los componentes de interfaz nunca acceden directamente a proveedores externos: cada integración implementa una interfaz estable y se selecciona desde `src/integrations/factory.ts`.

## Tokko

Para activar el proveedor real necesitaremos la API key, el endpoint oficial, ejemplos de la estructura de propiedades y las reglas de negocio que separan Prime, Retail y Hub. Las reglas vivirán en `sites.tokko_filter`; por ahora se conservan vacías y no se inventa ninguna clasificación.

## WordPress

Se necesita la URL de cada instalación, los endpoints REST habilitados y confirmar si requieren autenticación. Cada sitio ya guarda `wordpress_url` y el adaptador recibe el sitio como argumento.

## Resend

Se necesita la API key, verificar los tres dominios, definir emails remitentes y obtener los IDs de segmentos, topics y dominios. Estos IDs se almacenarán en `site_integrations.config`, nunca en el navegador. El servicio está separado en módulos de broadcasts, contactos, segmentos, topics y dominios.

## Paso a modo live

1. Completar las variables secretas del entorno de despliegue.
2. Implementar las llamadas oficiales dentro de los adapters `provider.ts`.
3. Configurar filtros Tokko y referencias Resend por sitio.
4. Validar una sincronización y envío de prueba antes de habilitar tareas programadas.
