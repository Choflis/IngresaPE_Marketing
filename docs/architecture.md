# Arquitectura y decisiones

## Componentes

- **Next.js 16 / React / TypeScript**: panel privado y API con sesión de propietario.
- **PostgreSQL 17**: catálogo normalizado, versiones, sesiones, medios y producción.
- **pg-boss 12**: cola duradera en un esquema separado de PostgreSQL. No requiere Redis.
- **Worker Node.js**: despacha el outbox de trabajos y procesa varios en paralelo.
- **fal.ai por REST**: LongCat Video Distilled 480p desde imagen (predeterminado) o texto. Cola remota, polling por request ID y descarga privada del clip.
- **Gemini TTS + FFmpeg**: narración opcional de Puck, Sadachbia, Achird o Fenrir, congelada en `video_jobs.voice`. El worker genera segmentos privados antes de solicitar fal.ai, mide su duración, ajusta los tiempos visuales y añade una pista AAC al MP4 sin volver a codificar el video. Funciona también con la animación local.
- **Remotion**: conserva el diseño y compone el clip animado, pregunta, alternativas y cierre como MP4 H.264.
- **Sharp**: publicaciones PNG y carruseles de tres imágenes.
- **Gemini opcional**: borrador de guion a partir de la explicación existente. El borrador no reemplaza el contenido aprobado ni cambia automáticamente lo que se dibuja en el video.

## Persistencia y concurrencia

El lote y sus trabajos se insertan en una única transacción. Una clave de idempotencia por propietario permite repetir la solicitud HTTP sin duplicar el lote. El cliente conserva esa clave ante errores de red. La fila del trabajo actúa como outbox: si el servidor se cae antes de despachar a pg-boss, el worker lo descubre después.

La cola utiliza política `exclusive` por ID de trabajo. Un advisory lock por trabajo evita que dos procesos monten el mismo contenido a la vez, incluso al recuperarse una tarea. El límite duro de ejecución es de una hora; el heartbeat de 60 segundos se renueva automáticamente cada 20 segundos. La detección de caída no depende del límite duro. La concurrencia se configura por proceso; al aumentar réplicas también crece la concurrencia total. El banco y las plantillas se referencian por versiones concretas.

Antes de llamar al proveedor se registra una solicitud en estado `submitting`. El gateway hace un único POST sin reintentos de creación. Las consultas GET pueden recuperarse con el mismo request ID. Si se recibe el ID, se persiste y los siguientes intentos consultan ese ID. Si el resultado del envío es ambiguo, el trabajo pasa a `needs_attention`: el propietario debe comprobar el portal y vincular la tarea original. Esto prioriza evitar un segundo cobro sobre reintentar a ciegas. No es posible garantizar exactly-once sobre un servicio externo sin idempotencia compartida.

Los medios se descargan del proveedor a almacenamiento persistente para no depender de sus enlaces temporales. No se exponen como archivos públicos: la API comprueba la sesión y el propietario y admite rangos para reproducir MP4.

La narración usa registros privados por segmento antes de llamar a Gemini. Los audios confirmados se reutilizan al reintentar. Un timeout, respuesta incompleta o HTTP 408/5xx conserva un registro pendiente y requiere revisión; una cuota rechazada permite reintento manual. No se sustituyen automáticamente voces, modelos o proveedores. Las transiciones se basan en cuadros de 30 fps; se dejan al menos dos segundos para pensar, se conserva el tono y se admite como máximo una aceleración de 1,25. Si la voz no cabe, no se solicita una nueva animación a fal.ai.

## Normalización

El banco y el catálogo se normalizan relacionalmente. Cada trabajo conserva además un snapshot JSON de la solicitud técnica a fal.ai (modelo, prompt, cuadros, semilla e imagen), sin credenciales, para que la recuperación mantenga los parámetros originales. Este snapshot no se devuelve al navegador. Se separan áreas, cursos, temas, preguntas, alternativas, fuentes, versiones, plantillas, lotes, trabajos, medios y solicitudes. La relación pregunta-área es muchos a muchos. Las alternativas referencian una versión de pregunta; un índice parcial impide dos respuestas correctas y la validación de aplicación exige exactamente una.

Los IDs de proveedor y estado de solicitud están en `provider_requests`, con unicidad por trabajo. `job_assets` relaciona trabajos y archivos, incluyendo las tres páginas del carrusel. `schema_migrations` controla las migraciones, con lock para inicio concurrente de web/worker.

## Seguridad y operación

Contraseñas bcrypt, sesión opaca de 256 bits con hash almacenado en DB, expiración a siete días, cookie HttpOnly y SameSite Strict. Origen exacto requerido para mutaciones; configuración HTTPS mediante APP_URL y AUTH_COOKIE_SECURE. Rate limit persistente de ocho intentos por correo en quince minutos. Queries parametrizadas. Uploads de imagen verificados con Sharp, límite de entrada de 10 MB y 25 megapíxeles, recodificación a PNG. Claves API únicamente en el servidor: configuración privada atómica en storage/config/fal.json (0600), compartida por web y worker, con variables de entorno como alternativa. El GET del estudio solo devuelve si hay clave, modelo y presupuesto; nunca la clave.

## Fuentes investigadas

Consultadas el 2026-10-29; modelos y precios pueden cambiar:

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers).
- [pg-boss](https://pgboss.io/): workers, SKIP LOCKED y recuperación.
- [LongCat desde imagen](https://fal.ai/models/fal-ai/longcat-video/distilled/image-to-video/480p/api).
- [LongCat desde texto](https://fal.ai/models/fal-ai/longcat-video/distilled/text-to-video/480p/api).
- [Cola REST de fal.ai](https://docs.fal.ai/model-apis/model-endpoints/queue).
- [Remotion: datos variables](https://www.remotion.dev/docs/parameterized-rendering).
- [Licencia Remotion](https://www.remotion.dev/docs/license/pricing): revisar elegibilidad según tamaño de organización.
- [Sharp](https://sharp.pixelplumbing.com/api-composite/).
- [Open Design](https://github.com/nexu-io/open-design), commit consultado `c6bb5a8b8190e17b7e9c546c731814ffe10d4f67`.
- [Temario oficial UNSA 2027](https://transparencia.unsa.edu.pe/handle/123456789/1773).
