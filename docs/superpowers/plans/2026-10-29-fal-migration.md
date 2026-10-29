# Migración a fal.ai — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. El usuario autorizó implementación, retirada de Runway y push; no solicitar otra aprobación del mismo alcance.

**Goal:** Sustituir Runway por LongCat Video Distilled 480p en fal.ai, sin voz por ahora, conservar el catálogo educativo y subir el trabajo excluyendo el video de prueba.
**Architecture:** Contratos puros para modelo, frames y costo; gateway REST de fal con validación de respuestas y sin reenvío de POST; snapshot del modelo/input por trabajo; cola local existente y montaje Remotion con texto y clave revisados.
**Tech Stack:** Next.js instalado, TypeScript, fetch/AbortSignal de Node, Zod, PostgreSQL, Remotion, Vitest y Playwright.
**Spec:** Instrucción del usuario del 2026-10-29, que aprueba usar fal.ai, posponer voz, retirar Runway y hacer push sin el video de prueba.

## Global Constraints

- Modelos permitidos: `fal-ai/longcat-video/distilled/image-to-video/480p` (predeterminado para conservar el personaje) y `fal-ai/longcat-video/distilled/text-to-video/480p` (alternativa del enlace del usuario).
- 480p, 15 fps de generación, US$0.005 por segundo; `num_frames = ceil(duración × 15)`; 30 segundos = 450 cuadros = US$0.15, con reserva redondeada hacia arriba al centavo.
- Sin voz ni sincronización de labios; no exponer ni transmitir claves al navegador. Guardar clave privada y modelo dinámicamente; guardar no implica verificar saldo ni generar contenido.
- Conservar preguntas, medios y trabajos históricos. Ningún trabajo antiguo puede enviarse a un proveedor distinto accidentalmente.
- Usar la cola durable de fal, guardar request ID y nunca reintentar una generación POST de resultado incierto. Cancelación remota PUT; estado y resultado GET usando la ruta de aplicación, sin sufijos de modelo.
- Excluir `/ejemplo_Video/`, almacenamiento privado, claves y MP4 de prueba de commit/push; el video local permanece disponible cuando existe.
- Una vez verificadas las pruebas, commit y push de la rama de trabajo actual, incluyendo el refactor previo aprobado.

## Review Focus

- Costo calculado por frames y 15 fps, independientemente de los 30 fps del render final.
- Cambios de modelo/configuración después de crear un lote no alteran su input guardado.
- Timeouts, HTTP500 y respuestas incompletas tras enviar no pueden producir una segunda generación automática.
- Solicitudes fallidas en estado COMPLETED deben tratarse como fallidas; recuperar archivos solo desde CDN HTTPS permitido, sin redirecciones arbitrarias.
- El checkout publicado debe funcionar sin el video excluido y sin dependencias ni llamadas activas de Runway.

### Task 1: Contratos, configuración y gateway fal

- [x] Escribir y ejecutar pruebas RED de payload, precio, polling/cancelación y secreto privado.
- [x] Implementar `src/lib/fal-contract.ts`, `src/server/fal.ts` y configuración privada fal; ejecutar pruebas GREEN.

### Task 2: Persistencia y cola

- [x] Pruebas de integración RED: proveedor fal, snapshot input/modelo, presupuesto, solicitudes inciertas e históricos.
- [x] Migración aditiva003, snapshot por trabajo, producción y montaje fal. Preservar históricos y política de no reenvío.
- [x] Verificar integración en base `_test` y aplicar migración local.

### Task 3: Interfaz y retirada de Runway

- [x] Actualizar pruebas de navegador para conexión fal, costos, producción local y voz pendiente.
- [x] Reemplazar conector; simplificar Voces a referencia/pending; actualizar catálogo, detalle y creador.
- [x] Retirar gateway, SDK, scripts y rutas de Runway; actualizar documentación y variables de entorno.
- [x] Renderizar animación fal en todo el video, sin voz y sin cambiar duración del formato.

### Task 4: Verificación y publicación

- [x] Suite, typecheck, integración DB, build, formato y navegador.
- [x] Revisión independiente y corrección de hallazgos importantes.
- [x] Staging verificado sin secretos ni videos de prueba. Publicar la rama autorizada y comparar el SHA remoto como último paso de entrega.

## Fuentes primarias

- https://fal.ai/models/fal-ai/longcat-video/distilled/image-to-video/480p/api
- https://fal.ai/models/fal-ai/longcat-video/distilled/text-to-video/480p/api
- https://docs.fal.ai/model-apis/model-endpoints/queue
