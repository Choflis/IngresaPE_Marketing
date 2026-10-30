# Verificación de la entrega

Fecha: 2026-10-29. Entorno local Linux, Node 26.11.1 y PostgreSQL 17 en Docker. Runtime de distribución: Node 24.

## fal.ai y catálogo de formatos

- `npm test`: **29 pruebas unitarias aprobadas**, incluyendo contrato de modelos, 450 cuadros a 15 fps, costo, rutas de cola REST, fallos de inferencia y ausencia de reenvío de POST.
- `npm run test:db`: **15 pruebas aprobadas** en una base aislada terminada en `_test`. Cubren normalización, rollback, idempotencia concurrente, versiones, reservas simultáneas, snapshot de modelo, proveedor retirado, timeout ambiguo, recuperación y reutilización de un resultado descargado. La integración de fal está simulada; PostgreSQL es real.
- `npm run test:e2e`: **10 pruebas aprobadas** con navegador, web y worker locales. Incluyen catálogo, selección conservada al ir a configuración/voces, filtros, móvil sin desbordamiento, clave privada, costo de fal, funcionamiento sin el video original excluido, audio privado por rangos, respuestas legadas duplicadas, recuperación de lotes y producción local real de PNG/MP4.
- `npm run typecheck`, `npm run build` y `npm run format:check`: verificados. El build usa webpack según el comando del proyecto.
- Migraciones aditivas 002 y 003 aplicadas a la instalación local. Se conservan preguntas, formatos, archivos y solicitudes históricas. Los trabajos pendientes del proveedor retirado requieren crear un lote nuevo; nunca se envían a fal.ai automáticamente.
- SDK, rutas, scripts y controles activos del proveedor anterior retirados. Clave fal guardada únicamente en servidor; guardar no afirma verificar permisos ni saldo.
- Catálogo y diseño educativo guiados por [Apple Design Skill](https://github.com/dickwu/apple-design-skill), con capturas de escritorio y móvil en `docs/screenshots/`.

## Revisión independiente

Revisión de solo lectura del gateway, persistencia, estados, presupuesto, render y UI. Se corrigió un recorte del personaje en Dino responde y Reto: el clip vertical ahora usa contención y conserva el cuerpo completo. El revisor confirmó la corrección. Se renderizó un clip vertical local de referencia dentro de ambas composiciones: Dino (6 segundos) y Las fijas (30.000000 segundos, H.264, 720 × 1280, 30 fps, sin pista de audio). Los fotogramas revisados conservan el personaje completo y la clave B del ejemplo. Este montaje usa un clip sintético local, no una inferencia de fal.ai.

El refactor previo corrigió también un render roto por alternativas legadas duplicadas y el desbordamiento con cinco alternativas largas. Sus regresiones siguen cubiertas por pruebas.

El servidor de desarrollo presentó recargas continuas con «HMR hash mismatch» después del cambio de dependencias. Se apartó la caché anterior de `.next/dev`, se reinició y se verificó que el navegador carga el creador sin recargas. No se cambió ni parcheó Next.js.

## Video, voz y límites

La muestra local de Las fijas en Biblioteca conserva **30.000000 segundos**, 720 × 1280 y 30 fps. La respuesta del ejemplo es **B, S/96**; el texto y las alternativas se componen con código a partir del banco aprobado.

**No se ha generado un video real con fal.ai.** Falta configurar una API key con saldo para comprobar autenticación, calidad y facturación reales. Las pruebas locales y los proveedores simulados no son evidencia de una inferencia real. No se inició ninguna generación pagada durante esta implementación.

Los modelos configurados son LongCat Video Distilled 480p desde imagen (predeterminado) y desde texto (alternativa). La referencia de costo es US$0.005 por segundo: 30 segundos son 450 cuadros y US$0.15. La reserva mensual no consulta el saldo de fal.ai y conserva envíos que puedan haber sido cobrados.

La narración de Gemini está integrada en el creador y en el worker, con Puck, Sadachbia, Achird y Fenrir. La sincronización labial permanece pendiente; se sincronizan el contenido visual y la narración, sin modificar la boca del personaje. El video original en `ejemplo_Video/` está excluido de Git y Docker; el checkout funciona sin él.

Esta actualización no repite el build de la imagen Docker ni la prueba de carga. El almacenamiento debe respaldarse y dimensionarse. El panel carga hasta 1.000 preguntas y 300 trabajos/archivos recientes, y cada lote admite 25 preguntas.

## Narración integrada · 29 de octubre de 2026

Se generó una prueba real desde la API de lotes y el worker con Gemini Puck y animación local, sin solicitar inferencias a fal.ai: **Las fijas · prueba narrada Puck · 30 s**, disponible en Biblioteca. FFprobe confirmó **30.000000 segundos**, video H.264 de 720 × 1280 a 30 fps y una pista de voz AAC de 30 segundos. Se reutilizó la introducción guardada y Gemini produjo tres segmentos nuevos. La pregunta aparece en el segundo 3,433; la clave A, Música, se revela en 14,033; el cierre empieza en 27,1. Se revisaron fotogramas anteriores y posteriores a la revelación: alternativas sin repetir, solo A marcada y explicación completa.

La suite de navegador pasó **13 pruebas**, incluida selección y persistencia de voz, muestra reproducible y versión móvil sin desbordamiento. PostgreSQL real pasó **19 pruebas**, cubriendo la voz congelada en el trabajo, validación de clave, errores de narración antes de fal.ai y montaje con audio. La revisión independiente detectó un HTTP 408 tratado como rechazo reintentable; se corrigió con una regresión que conserva su estado incierto. No se probó facturación real ni sincronización labial.
