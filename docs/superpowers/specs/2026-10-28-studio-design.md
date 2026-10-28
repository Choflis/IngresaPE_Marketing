# Ingresa PE Studio — diseño

Herramienta privada para un propietario, autorizada por el usuario para construir, verificar y subir al repositorio. El usuario delega las decisiones técnicas y pide Open Design, colores de Ingresa PE y base normalizada. No es un producto público ni una ampliación de la app educativa.

## Alcance

Panel con acceso privado, banco de preguntas por áreas/cursos/temas, preguntas con alternativas y explicación revisada, formatos versionados, producción por lotes, biblioteca y configuración. Exportación de videos MP4 y publicaciones PNG. Personaje animado: Runway avatar videos genera el clip hablado del dinosaurio; Remotion compone el formato fijo. Modo de demostración rotulado y sin llamadas pagadas para verificar el circuito sin credenciales. Nunca presentar la demostración como generación real de Runway.

## Decisiones

Next.js 16, React, TypeScript, PostgreSQL 17, node-postgres y migraciones SQL, pg-boss, Remotion, Sharp, Docker Compose. PostgreSQL más cola evita introducir Redis para una herramienta personal, sin perder procesamiento concurrente. Worker independiente con límite configurable, recuperación y parada ordenada. Solicitudes remotas persistidas: después de una respuesta ambigua no reenviar una solicitud pagada automáticamente. Reanudar polling con task ID. Material multimedia persistido localmente en volumen privado, descargable mediante sesión.

## Datos

Áreas, cursos, temas, fuentes, preguntas, versiones de pregunta, alternativas, relación pregunta-área, plantillas, versiones de plantilla, lotes, trabajos, solicitudes de proveedor, archivos, usuarios y sesiones. Relaciones por FK y restricciones. Versiones inmutables utilizadas por trabajos; JSON solo para configuración de presentación o respuesta externa, no para sustituir relaciones. Semilla: preguntas originales de práctica, etiquetadas como muestra, no preguntas oficiales ni predicciones.

## Seguridad y límites

Un propietario inicial generado por setup. Contraseñas bcrypt, sesión opaca revocable en DB y cookie HttpOnly. Mutaciones verifican origen. Claves solo en servidor/.env ignorado. Upload limitado, MIME real verificado, nombres internos aleatorios. Consultas parametrizadas. Límites de lote, concurrencia, gasto estimado Runway por mes y solicitudes por proyecto. Archivos de proveedor se descargan antes de expirar. Errores no exponen secretos. No publicar en redes automáticamente.

## Diseño

Flujo Open Design: frontend-design + dashboard + sistema linear-app, adaptados a la marca, documentado en DESIGN.md. Tema oscuro #090D16, acento #C80727 y mascota/logo obtenidos de la web de Ingresa PE. Interfaz en español, navegación lateral, acciones claras, tablas reales, estados vacíos y errores, móvil usable. Métricas derivadas de DB, sin números inventados.

## Verificación

Pruebas de validación, transacciones, autenticación, restricciones, lotes, idempotencia y reanudación, errores del proveedor y montaje real. Playwright para login, creación de pregunta, lote, imágenes, MP4 de demostración y privacidad. Build y typecheck. Runway real requiere API key con saldo; informar evidencia exacta y no simular éxito si falta.

## Alternativas

BullMQ/Redis añade servicio operacional; se elige pg-boss por persistencia compartida y soporte de workers concurrentes. FFmpeg solo es viable pero Remotion permite plantillas React y previsualización común. Servicios de video 100% generativo no aseguran tipografía/layout fijos, por lo que el montaje es determinista.
