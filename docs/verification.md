# Verificación de la entrega

Fecha: 2026-10-28. Entorno local Linux, Node 26.11.1 y PostgreSQL 17 en Docker. Runtime de distribución: Node 24 en Docker y .nvmrc.

## Evidencia obtenida

- TypeScript estricto: `npm run typecheck`, sin errores.
- Dominio: 16 pruebas unitarias aprobadas (validación y políticas de solicitudes).
- Base real aislada: 11 pruebas aprobadas con `npm run test:db`; cubren normalización, rollback, idempotencia concurrente, versiones, presupuesto simultáneo, incertidumbre y recuperación del proveedor.
- Build Next.js de producción: completado.
- Auditoría npm: sin vulnerabilidades después de fijar Zod transitorio a la versión parcheada mediante overrides.
- Imagen Docker de la entrega base 0.1: build completado. Runtime comprobado en Node 24.22.1: web y worker saludables, login autenticado y un MP4 generado dentro del contenedor, con descarga privada HTTP 206.
- Producción real de medios locales: PNG y dos MP4 completados en la instalación de prueba. Esto es composición local, no generación real del proveedor.
- E2E de navegador: 4 pruebas aprobadas. Flujo guiado, selección conservada al volver de Configuración, credenciales protegidas, producción local y controles de los 25 trabajos de un lote.

## Revisión independiente

Se revisó el código con un segundo agente en modo de solo lectura. Se corrigieron tres hallazgos materiales:

1. Hidratación de preguntas dentro del mismo cliente transaccional, evitando agotar el pool al recibir diez lotes concurrentes. La regresión reprodujo el timeout antes del cambio y ahora aprueba las diez solicitudes.
2. Acceso progresivo a todos los trabajos cargados, incluyendo los controles de recuperación de un lote de 25.
3. Separación entre límite duro de una hora y heartbeat de 60 segundos con renovación automática; la prueba de pg-boss real desplaza los timestamps y ejecuta su supervisor para demostrar que una tarea sana de más de 60 segundos sigue activa y que un heartbeat perdido vuelve a la cola.

También se sustituyó el healthcheck HTTP heredado del worker por uno que comprueba su propio heartbeat en PostgreSQL.

Se verificó por separado el montaje de un clip local con audio sintético: el MP4 resultante contiene video H.264 de 720 × 1280 y audio AAC. Esta prueba verifica que el montaje conserva audio; no es una prueba de Runway.

## Revisión del rediseño 0.2

Revisión independiente en modo lectura. Se corrigió una carrera entre cambio de clave y operaciones de avatar; todas las mutaciones de configuración, incluida la CLI, comparten un advisory lock de PostgreSQL. Las solicitudes usan la clave capturada dentro del lock. El revisor verificó las correcciones sin hallazgos importantes pendientes.

Las pruebas de base usan además un almacenamiento temporal aislado para que la cuenta configurada en la instalación no altere las políticas bajo prueba.

## Runway

Conexión autenticada real verificada mediante el SDK oficial el 2026-10-28. La clave creada desde la sesión autorizada de Brave se guarda en la configuración privada, fuera de Git. Saldo de API confirmado: **0 créditos**. No se compraron créditos ni se creó un avatar con costo.

**No se generó ni se evaluó un video real de Runway.** Para terminar esa validación se necesita recargar el saldo de API y preparar el avatar. Los créditos web son independientes. La UI permite conectar la clave, preparar el dinosaurio y consultar su estado.

Las pruebas con proveedor simulado se limitan a situaciones de fallo/reanudación: no se presentan como evidencia de generación real. Los archivos de demostración local llevan etiqueta visible.

## Límites

No hay prueba de carga masiva ni garantía de capacidad ilimitada. La configuración inicial procesa dos trabajos simultáneos; el lote se limita a 25 preguntas. El almacenamiento local debe respaldarse y dimensionarse. La captura del panel muestra datos reales de una instalación de desarrollo que incluye contenido de prueba.
