# Catálogo de formatos y voces — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar el estudio como catálogo educativo para crear videos, incorporar Las fijas de 30 segundos y seleccionar voces reales sin duplicar contenido ni marcar respuestas incorrectas.
**Architecture:** Una identidad de composición por versión de formato; catálogo compartido entre inicio y formatos; detalle y creador con selección persistente. La voz se guarda por trabajo y se envía por solicitud, separada del avatar global.
**Tech Stack:** Next.js instalado, React, PostgreSQL, Remotion, Runway SDK, Vitest y Playwright.
**Spec:** `docs/superpowers/specs/2026-10-28-format-catalog-and-voices-design.md` (aprobado por el usuario en el turno de implementación; añade Apple Design Skill).

## Global Constraints

- Conservar los archivos y datos existentes; cambios en la rama local `feat/format-catalog-voices`.
- Diseño guiado por https://github.com/dickwu/apple-design-skill, leído desde `/tmp/ingresape-apple-design-skill/SKILL.md`; principios web, no convenciones nativas impuestas.
- UI clara: superficies #ffffff / #f5f5f7, tinta #1d1d1f, texto secundario #62626b (6.04:1 sobre blanco), acción #bd1737 (6.28:1), éxito #1f7548 (5.68:1).
- Una cuadrícula de formatos como elemento principal; controles sobrios, sans serif, tamaños de texto legibles, foco visible, movimiento reducido y objetivos táctiles de 44px.
- Videos Las fijas: 720×1280, 30 fps, 900 fotogramas; estructura escolar blanca/roja, personaje a la izquierda y pregunta/alternativas a la derecha.
- Sin compras ni generaciones pagadas automáticas; saldo real y presupuesto son conceptos distintos.
- No hacer commits ni publicar sin solicitud; entregar cambios verificables en el checkout configurado.

## Review Focus

- Respuesta correcta fuera de la alternativa A: solo debe resaltarse la clave revisada.
- Etiquetas o respuestas repetidas: rechazar antes de reservar presupuesto y de renderizar.
- Plantillas creadas anteriormente: conservar y listar, sin depender del nombre para renderizar.
- Navegar de creador a voces/configuración y volver: conservar preguntas y formato.
- Voz de proveedor no disponible o audio que excede el tramo: fallo explícito sin enviar otra generación.

### Task 1: Contratos de composición, contenido y voz

**Files:** `src/lib/video-format.ts`, `src/lib/voices.ts`, `src/lib/validation.ts`, `src/lib/types.ts`, `tests/video-format.test.ts`, `tests/domain.test.ts`.
**Interfaces:** `CompositionKey`; `formatNarration(q, composition)`; `lasFijasPhase(seconds)`; `voiceSpeech(text, voice)`; `assertValidChoices(choices)`.

- [x] Escribir pruebas de clave no-A, duplicados, fases de 30s y voz por solicitud; ejecutar y observar fallos.
- [x] Implementar contratos comunes; ejecutar pruebas y suite.

### Task 2: Persistencia y producción

**Files:** `db/migrations/002_formats_and_voices.sql`, `src/server/catalog.ts`, `src/server/production.ts`, `src/server/process-job.ts`, `src/server/runway.ts`, `src/server/voices.ts`, API existente, seed.
**Interfaces:** plantilla con `composition` y `default_voice_id`; trabajo con snapshot `voice`; perfiles de voz verificados.

- [x] Añadir pruebas de migración, persistencia y selección de voz antes del código.
- [x] Migración aditiva, Las fijas idempotente, voces iniciales y catálogo sin duplicaciones.
- [x] Validación y persistencia por trabajo; API autenticada para referencia, voces y predeterminado.
- [x] Mantener duración exacta de Las fijas y conservar clip si no cabe; ejecutar integración DB.

### Task 3: Composición Las fijas y vistas previas

**Files:** `src/video/LasFijasVideo.tsx`, `src/video/QuestionChoices.tsx`, `src/video/QuestionVideo.tsx`, `src/video/Root.tsx`, recursos de marca.
**Interfaces:** `VideoProps` con composición y clip temporizado; una lista de alternativas compartida con claves de contenido.

- [x] Probar markup de alternativas y marcado correcto en render real de React.
- [x] Crear composición con intro, lectura, respuesta narrada y cierre, sin reescribir textos con IA.
- [x] Renderizar 30s local, medir con ffprobe e inspeccionar pregunta, respuesta y cierre.

### Task 4: Catálogo, detalle y voces con diseño educativo

**Files:** `src/components/FormatCatalog.tsx`, `FormatDetail.tsx`, `Voices.tsx`, `Studio.tsx`, `Creator.tsx`, `Workspace.tsx`, estilos consolidados.
**Interfaces:** `onUse(templateVersionId)`; rutas hash de detalle; creador persistente y voz por formato.

- [x] Añadir E2E de catálogo, filtros, detalle, voz y persistencia; observar fallo antes del refactor.
- [x] Extraer tarjetas reutilizadas; dashboard con todos los formatos y detalle Las fijas.
- [x] Sección de voces con audio de referencia, perfiles reales, conectar voz y guardar predeterminado; ninguna generación al navegar.
- [x] Consolidar estilos antiguos en un único sistema claro y adaptable; comprobar móvil y zoom.

### Task 5: Verificación y revisión

**Files:** pruebas y documentación de verificación.

- [x] Ejecutar suite, typecheck, integración DB y build.
- [x] Comprobar navegación con Playwright y capturas de escritorio/móvil; comprobar audio de referencia y preview.
- [x] Revisión independiente final de cambios y corrección de hallazgos importantes.
- [x] Informar qué está verificado localmente y qué requiere saldo/prueba real de voz.
