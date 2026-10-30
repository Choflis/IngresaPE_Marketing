# Narración integrada en videos

El usuario autorizó unir el flujo existente de fal.ai y las voces de Gemini. El creador permitirá elegir Puck, Sadachbia, Achird o Fenrir y entregará un MP4 con narración en español, con la pregunta, las alternativas, la clave revisada y su explicación. También ofrecerá generar sin voz.

Se conserva Next.js, PostgreSQL, Remotion y FFmpeg. Se reutiliza `video_jobs.voice` para congelar la voz y el modelo de cada trabajo; los trabajos anteriores permanecen sin narración. La clave de Gemini solo se usa en el servidor. El modelo será `gemini-3.1-flash-tts-preview`, el mismo de las muestras ya escuchadas, sin sustituciones automáticas de proveedor o modelo.

## Enfoque elegido

La integración directa en el worker aprovecha el montaje existente. Se genera y comprueba la voz antes de enviar una nueva animación a fal.ai; después FFmpeg une la narración al video. Generar voz dentro del navegador perdería la recuperación de trabajos y expondría credenciales. Pedir al modelo de video que dibuje respuestas o genere voz impediría mantener el contenido revisado y el control de tiempos.

## Contenido y sincronización

Cuatro segmentos: introducción, pregunta con alternativas, respuesta correcta con explicación y cierre. Se reutiliza la introducción de la voz elegida ya guardada en la app. Los demás segmentos se generan con texto determinista del banco aprobado, sin inventar o resumir la respuesta.

La duración del formato se mantiene: Las fijas siempre dura 30 segundos. Sus transiciones se calculan con las duraciones reales de voz, dejando al menos dos segundos para pensar antes de revelar la clave. Solo se admite acelerar hasta 1,25 veces con conservación del tono; si no cabe se pide acortar el contenido antes de solicitar fal.ai. Los formatos dino y reto usan la misma revelación sincronizada.

## Recuperación y límites

Cada segmento se guarda de forma atómica en el directorio privado del trabajo. Los reintentos de montaje reutilizan los audios y el clip existentes. Una solicitud de voz sin respuesta confirmada queda para revisión y no se reenvía automáticamente. Errores de autenticación, cuota, bloqueo o contenido demasiado largo se muestran sin producir silenciosamente un video sin voz. La cancelación se comprueba entre segmentos y antes de solicitar fal.ai.

## Verificación

Pruebas de guion y clave, tiempos y límites, contrato REST de Gemini con respuestas controladas, caché y ambigüedad, persistencia en PostgreSQL, selección en el creador y un MP4 real de 30 segundos con pista de audio. No se requiere consumir una animación pagada para probar el montaje.
