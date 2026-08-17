# Arquitectura frontend

## Principios

- Las páginas de `app/` obtienen datos y componen vistas; no contienen UI compleja.
- Los componentes cliente se limitan a interacción local, navegación y llamadas de usuario.
- La configuración estática vive fuera de los componentes.
- El dominio no depende de React.
- Parseo, normalización y validación determinista viven en `src/lib/` y tienen pruebas.
- Los componentes compartidos reciben datos ya preparados y no consultan repositorios.

## Estructura

```text
app/
  (panel)/                 Rutas y carga de datos del servidor
src/
  components/
    dashboard/             Bloques presentacionales del dashboard
    shell/                 Navegación y estructura global
    ui.tsx                 Primitivas compartidas existentes
  database/                Acceso a persistencia
  domain/                  Tipos del negocio
  integrations/            Adaptadores externos
  lib/                     Utilidades puras y testeables
  services/                Casos de uso y composición de dominio
```

## Límites

1. Una página puede importar repositorios y componentes de vista.
2. Un componente de vista no debe importar repositorios.
3. Un componente cliente no debe contener parseadores o reglas de negocio extensas.
4. Una integración externa no debe devolver estructuras específicas de React.
5. Los estados de carga, error y vacío se resuelven cerca del componente que posee la operación.

## Próximos puntos de extracción

- Dividir `repositories.ts` por agregado: sitios, campañas, contactos y actividad.
- Migrar las capas históricas de `globals.css` a hojas por característica y eliminar reglas sobrescritas.
- Separar importación, resumen y tabla dentro de `ContactsView`.
- Convertir `CampaignComposer` en formulario, selector de contenido y hook de creación independientes.
- Dividir `ResendEmailTracker` en filtros, tabla, detalle y estado de consulta.
