# Academic Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** Studio personal legible de academia con creador por pasos y conexión Runway operable.
**Architecture:** Conservar Next.js/PostgreSQL/worker, reemplazar presentación y centralizar configuración dinámica privada del proveedor.
**Tech Stack:** React, CSS tokens, pg, Runway SDK, Remotion, Sharp.
**Spec:** docs/superpowers/specs/2026-10-28-academic-studio-design.md

## Global Constraints

- Ningún secreto en cliente/GET/logs/Git; no comprar créditos.
- Datos y versiones previos conservados.
- Producir exclusivamente después de revisión explícita.

## Review Focus

- Retroceder y filtros no pierden selección ni resetean proveedor.
- Doble click/error de red conserva idempotencia.
- Conector inválido no reemplaza configuración válida.
- Configuración local compartida legible por worker pero no servida como recurso.
- Panel móvil sin overflow y controles/textos cómodos.

### Task 1: Configuración Runway

- [x] Inspeccionar Brave autorizado por GUI/CDP y acceder solo a Runway.
- [x] Añadir pruebas de configuración privada con valores inválidos y redacción de secretos; observar RED.
- [x] Implementar lectura dinámica, guardado privado atómico y endpoints autenticados de conectar/avatar.
- [x] Verificar conexión real: clave aceptada, saldo API 0; generación real pendiente de recarga.

### Task 2: Creador guiado

- [x] Escribir browser regression que impida avanzar sin preguntas; observar RED.
- [x] Implementar cuatro pasos, resumen, preview apropiada y continuidad de estado.
- [x] Actualizar E2E de producción existente y verificar MP4/PNG.

### Task 3: Diseño académico

- [x] Actualizar DESIGN.md y tokens claros, jerarquía y tipos.
- [x] Ajustar dashboard, banco, formatos, biblioteca, configuración y login.
- [x] Revisar desktop/móvil con capturas y movimiento reducido.

### Task 4: Entrega

- [x] Typecheck, tests, DB, browser, build y revisión final independiente.
- [x] Actualizar README/capturas/verificación, registrar exactamente el resultado Runway.
- [x] Commit y push; conservar servicios funcionando.
