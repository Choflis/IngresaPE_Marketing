# Studio 0.2 — academia y creación guiada

El usuario pide implementar directamente una mejora de diseño con skills: más dinámico, claro, legible, flujo entendible y toque de academia. Autoriza conectar su cuenta Runway iniciada en Brave y mantiene autorización previa de verificar y subir trabajo. Se ejecuta en la rama de feature del checkout limpio, conservando los datos existentes.

## Diseño elegido

Interfaz clara de academia: papel marfil, superficies blancas, texto tinta, acento rojo Ingresa PE, titulares editoriales, cuerpo 15–16px y metadatos legibles (mínimo 12px). Mantener identidad y mascota. Open Design frontend-design + impeccable-design-polish guían el trabajo. Navegación lateral, biblioteca y banco existentes conservan comportamiento. Animaciones útiles y reduced-motion.

## Flujo

Creador con cuatro pasos visibles, progreso y botones Atrás/Continuar: (1) escoger área/preguntas aprobadas; (2) formato; (3) revisar pregunta, respuesta y proveedor; (4) generar lote con resumen y presupuesto. No avanzar sin selección ni solicitar generaciones antes del paso final. Volver conserva valores. Vista previa acorde con video/imagen/carrusel. Resultado presenta cola y siguiente acción.

## Runway

Intentar controlar la sesión específica de Runway en Brave por un canal de automatización disponible; no extraer cookies ni contraseñas desde almacenamiento del navegador, no interferir con otras cuentas y no comprar créditos. Las claves deben permanecer solo en servidor, ignoradas por Git. Si hay credenciales/saldo, verificar organización, registrar avatar y probar una generación corta. Si no puede obtenerse la clave mediante acceso normal autorizado, incorporar un conector explícito en Configuración y documentar el bloqueo real sin simular conexión.

Configurar desde panel: formulario de API key oculta, validar contra proveedor antes de guardar, avatar propio, prueba de conexión y estado de saldo cuando disponible. Guardado en archivo local privado del volumen storage compartido entre web/worker; valores no salen en GET de configuración ni logs, ni forman parte de Git. Lectura dinámica para no exigir reiniciar por cada conexión. Mantener .env como alternativa. Reusar avatar mediante su ID y crear solo por acción explícita, para evitar duplicados.

## Verificación

Pruebas funcionales para puertas de pasos, conservación de selección, revisión y generación; configuración de proveedor sin filtrado de credenciales y recuperación de errores. Browser desktop/móvil, contraste/legibilidad y capturas. Typecheck, unitarias, integración DB, build. Prueba Runway real solo con evidencia de task ID y archivo, nunca confundir con demo local.
