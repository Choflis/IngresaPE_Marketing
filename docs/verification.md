# Verificación de la entrega

Fecha: 2026-10-28. Entorno local Linux, Node 26.11.1 y PostgreSQL 17 en Docker. Runtime de distribución: Node 24 en Docker y .nvmrc.

## Evidencia obtenida

- TypeScript estricto: `npm run typecheck`, sin errores.
- Dominio: 12 pruebas unitarias aprobadas (validación y políticas de solicitudes).
- Base real aislada: 9 pruebas aprobadas con `npm run test:db`; cubren normalización, rollback, idempotencia concurrente, versiones, presupuesto simultáneo, incertidumbre y recuperación del proveedor.
- Build Next.js de producción: completado.
- Auditoría npm: sin vulnerabilidades después de fijar Zod transitorio a la versión parcheada mediante overrides.
- Imagen Docker: build completado; se vuelve a validar con los archivos finales antes del push.
- Producción real de medios locales: PNG y dos MP4 completados en la instalación de prueba. Esto es composición local, no generación real del proveedor.
- E2E de navegador: verificación final en curso; se registrará el resultado antes del push.

## Runway

No hay `RUNWAYML_API_SECRET` ni `RUNWAY_AVATAR_ID` configurados en el entorno. `npm run runway:check` informa PENDIENTE y termina con código 2. La API pública consultada sin credenciales responde HTTP 401, como corresponde.

**No se generó ni se evaluó un video real de Runway.** La integración usa el SDK oficial tipado y pruebas de su manejo de errores, pero la calidad del dinosaurio y su voz deben verificarse con una cuenta con saldo. No se gastaron créditos.

Las pruebas con proveedor simulado se limitan a situaciones de fallo/reanudación: no se presentan como evidencia de generación real. Los archivos de demostración local llevan etiqueta visible.

## Límites

No hay prueba de carga masiva ni garantía de capacidad ilimitada. La configuración inicial procesa dos trabajos simultáneos; el lote se limita a 25 preguntas. El almacenamiento local debe respaldarse y dimensionarse. La captura del panel muestra datos reales de una instalación de desarrollo que incluye contenido de prueba.
