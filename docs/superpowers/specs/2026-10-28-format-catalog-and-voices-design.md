# Catálogo de formatos y voces — propuesta para revisión

Estado: aprobado por el usuario e implementado localmente. Fecha: 2026-10-28. Voz y actuación real pendientes de prueba con saldo.

## Intención y requisitos del usuario

El video en `ejemplo_Video/gemini_generated_video_3778db79.mp4` representa un formato entre varios. El dashboard debe mostrar todos los formatos del estudio y ofrecer una entrada a cada uno. El formato de referencia tendrá su propia sección. El usuario pide videos de 30 segundos, voz parecida a la referencia y prevé una recarga de US$10 en la API de Runway. No se ha comprado saldo ni autorizado un consumo concreto de prueba.

La referencia mide 720 × 1280, dura 20 segundos y contiene audio. Presenta fondo blanco escolar, detalles rojos, dinosaurio a la izquierda, título «Las fijas», pregunta y alternativas a la derecha y cierre con la web. Se revisaron fotogramas; no se ha evaluado de oído el timbre de la voz. La adaptación solicitada durará 30 segundos.

## Situación actual

- `Studio.tsx` concentra navegación y dashboard; el inicio destaca una lección y áreas académicas, sin catálogo de formatos.
- `Workspace.tsx` lista las plantillas existentes. `scripts/seed.ts` define cuatro iniciales: Dino responde, Reto de admisión, Pregunta del día y Repaso en tres pasos. Pueden existir variantes adicionales en la base, que deben aparecer automáticamente.
- El creador comienza por preguntas y selecciona la primera plantilla; las tarjetas no permiten entrar con un formato preseleccionado.
- Las variantes solo almacenan nombre, tipo, color y duración. El reto se reconoce por su nombre. Falta una identidad estable para composiciones distintas.
- El render de video actual usa fondo oscuro y un clip rectangular del personaje. No reproduce la composición de la referencia.
- Runway recibe el guion con `gwm1_avatars`; el avatar se crea con la voz `adrian`. No existe una sección de selección de voces.
- La duración real del video actualmente se sustituye por la del clip de Runway. Cambiar únicamente la duración de una tarjeta a 30 no garantiza un archivo final de 30 segundos.

## Enfoques considerados

1. **Catálogo común, composiciones por formato y voces compartidas (recomendado).** Reutilizar la aplicación, preguntas, biblioteca, cola y proveedor existentes; separar navegación, tarjetas, detalle de formato y selección de voz. Permite incorporar formatos sin volver a reorganizar el inicio.
2. **Página y flujo independientes para cada formato.** Ofrece libertad total a cada sección, pero duplica selección de preguntas, producción y gestión de voces. No aporta una ventaja suficiente a los formatos académicos actuales.
3. **Solo cambiar el aspecto del dashboard.** Es menor trabajo, pero deja sin resolver selección directa, identidad de composición, persistencia de voz y duración final.

El usuario aprobó implementar el enfoque 1 y añadió Apple Design Skill como guía visual.

## Pantallas y navegación propuestas

### Inicio / dashboard

El catálogo ocupa la primera sección visible, después de un encabezado compacto. Se listan todas las plantillas vigentes de la base, incluidas las creadas por el usuario, con filtros Todos, Videos, Imágenes y Carruseles. Cada tarjeta muestra nombre, vista previa apropiada, tipo, duración cuando corresponda y acción «Usar formato». Las métricas y los trabajos recientes quedan debajo del catálogo. Los estados vacíos y de carga tienen acciones claras.

### Sección de un formato

Entrar desde cualquier tarjeta abre su detalle con vista previa, descripción, voz recomendada si es video y botón de creación. Al entrar al creador, el formato queda seleccionado y los pasos conservan las selecciones al avanzar y retroceder. Se mantiene el banco común de preguntas.

«Las fijas» se añade como composición de video propia, sin sustituir los formatos existentes. Su sección muestra la referencia mediante un endpoint autenticado; no copiar el video a `public` sin necesidad. La referencia se identifica como ejemplo, no como salida de la generación actual.

### Voces

Añadir «Voces» a la navegación. Mostrar la voz actual y las voces configuradas, estado del proveedor, reproductor de una muestra disponible y elección predeterminada por formato. La muestra existente puede escucharse sin generar una nueva. Crear o regenerar una muestra es una acción explícita con aviso del costo estimado, cuando el proveedor lo permita; no generar al cargar una página.

Permitir seleccionar voces de proveedor o conectar un ID de voz personalizada ya creada. Exponer estados pendientes, lista y error. Guardar una selección no debe cambiar trabajos ya enviados. Las voces seleccionables deben existir o validarse contra el proveedor; no presentar perfiles inventados como voces funcionales.

## Voz recomendada y proveedor

Usar **Runway Voices API**, que permite crear una voz personalizada desde audio, o diseñarla con el modelo de ElevenLabs `eleven_ttv_v3`. Reutilizar la clave de Runway actual; no exigir una segunda suscripción de ElevenLabs.

La primera opción para buscar parecido es una voz personalizada desde un segmento limpio de la referencia. El proveedor pide una muestra entre 10 segundos y 5 minutos; comprobar que la voz útil del archivo cumple ese mínimo y que no queda contaminada por música. No afirmar que el ejemplo ya se ha escuchado, aislado o clonado.

Si la muestra no es apta, diseñar una voz por descripción y comparar su muestra con el ejemplo. La aprobación auditiva del usuario determina el parecido; no prometer una copia idéntica. No crear voces ni pruebas pagadas durante el refactor sin mostrar primero la acción y el costo o su incertidumbre.

La narración final se envía como texto y una voz personalizada por solicitud mediante `speech.voice`, conservando la sincronización de boca de Runway. Las selecciones por solicitud evitan modificar globalmente un avatar compartido entre trabajos. El modo local conserva su rotulado y no se presenta como una actuación real de Runway.

## Composición «Las fijas», propuesta de 30 segundos

- 0–2 s: identidad «Las fijas de Ingresa PE» e introducción.
- 2–10 s: pregunta y alternativas con tiempo de lectura.
- 10–27 s: respuesta correcta y explicación.
- 27–30 s: llamada a practicar en la web, con la marca y la dirección ingresa.pe; no se presenta una captura inventada de la web.

Estos tiempos se fijaron en la implementación: lectura en silencio y narración de la respuesta desde el segundo 10, con clip máximo de 17 segundos. Dibujar texto, fórmulas, indicadores y marca con Remotion. Usar el clip Runway para el personaje, verificando que el encuadre o una separación de fondo permiten integrarlo sin perder la identidad visual. Los gestos de cuerpo completo del ejemplo no quedan garantizados por el avatar.

La salida es vertical y de exactamente 30 segundos para este formato. No acelerar excesivamente ni cortar una explicación a mitad. Validar previamente que el guion cabe, medir el clip y rechazar de forma recuperable una narración demasiado larga, conservando el archivo para corregir sin reenviar automáticamente. Si termina antes, completar con la pregunta o cierre local. La línea de tiempo debe acomodar la narración medida y respetar las fases; no ubicar arbitrariamente un guion continuo sobre una pregunta que aún no aparece.

Los demás formatos mantienen su composición y duración configurada, salvo que el usuario cambie expresamente sus valores. No imponer una duración a imágenes o carruseles.

## Modelo de datos e integración

Añadir mediante migración aditiva una clave estable de composición a versiones de plantilla, con valores explícitos para formatos actuales y `las-fijas`. Mantener una composición genérica para variantes existentes que no encajen en una clave conocida. No borrar ni recrear preguntas, medios ni trabajos.

Guardar referencias de voces y predeterminado por formato; persistir la selección concreta en el trabajo al crear el lote. Las claves privadas permanecen en servidor. Validar IDs y permisos tanto en API como al enviar al proveedor. Una migración añade «Las fijas» idempotentemente a instalaciones existentes; no depender de que la tabla de plantillas esté vacía ni de reconocer nombres nuevos en el render.

Separar catálogo/tarjetas reutilizables del dashboard y del componente de configuración. Conservar acceso autenticado a muestras y referencia local. Resolver vínculos de detalle sin perder navegación atrás/adelante.

## Presupuesto y estimaciones

Runway publica US$0.01 por crédito. Avatar: un crédito por tres segundos de video, más uno por cada 50 caracteres de texto, con redondeo del texto hacia arriba. Un clip de 30 segundos y 450 caracteres cuesta aproximadamente 19 créditos, sin impuestos, creación de voz, avatar ni repeticiones. US$10 / 0.19 permite como máximo 52 generaciones bajo ese supuesto, no 52 entregas garantizadas. Esa cifra fue una estimación previa para 30 segundos de avatar continuo y 450 caracteres; Las fijas implementado reserva lectura sin voz y narra solo la explicación. Su reserva se calcula a partir del guion real y no garantiza un número fijo de entregas.

El panel debe distinguir saldo verificado de API, presupuesto mensual de US$10 y costo/reserva por lote. No afirmar que una recarga se realizó porque el usuario indicó el presupuesto. El cálculo debe incluir la duración estimada o medida de voz y los caracteres reales; conservar un margen de reserva y mostrar su diferencia frente al costo estimado. Bajar la resolución no cambia la tarifa publicada de este avatar.

No consumir créditos al navegar, configurar tarjetas o reproducir muestras guardadas. No comprar créditos, crear un avatar duplicado ni reenviar automáticamente tareas de resultado incierto.

## Verificación de la implementación

- Navegador: catálogo completo en escritorio y móvil, filtros, detalle, selección directa, navegación y conservación de selección.
- Integración: persistencia de voz y composición por trabajo; cambios posteriores no afectan trabajos existentes; migración idempotente y preservación del catálogo previo.
- Render: archivo de 30 segundos comprobado con ffprobe, fases legibles, sin texto duplicado, alternativas ni respuesta inventadas; plantilla distinta para cada composición.
- Proveedor: voz seleccionada en la solicitud y recuperación segura de errores; ninguna generación por GET o navegación. Realizar verificaciones sin costo; la semejanza y actuación reales quedan pendientes de una prueba pagada explícita cuando haya saldo.
- Ejecutar typecheck, pruebas relevantes, build y verificación del flujo con datos locales. No declarar coincidencia de voz o calidad de Runway usando solo una demostración local.

## Fuentes consultadas

- https://docs.dev.runwayml.com/characters/custom-voice/
- https://docs.dev.runwayml.com/characters/concepts/
- https://docs.dev.runwayml.com/guides/pricing/
- SDK instalado: `resources/avatar-videos.ts`, que permite una voz personalizada por solicitud.
- Guía Next.js instalada: `01-app/01-getting-started/05-server-and-client-components.md`.
