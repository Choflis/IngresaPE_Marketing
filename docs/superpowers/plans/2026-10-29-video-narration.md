# Video narration implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Deliver narrated videos from the existing creator using the four selected Gemini voices.

**Architecture:** Snapshot the selected voice in `video_jobs.voice`. Prepare cached TTS segments and a measured timeline before fal submission, render the matching visuals, then mux a complete padded narration track into the MP4.

**Tech Stack:** Next.js 16, PostgreSQL, Gemini REST, Remotion, FFmpeg, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-video-narration-design.md`

## Global constraints

- Preserve 30 seconds for Las fijas and use the approved answer and explanation.
- Puck, Sadachbia, Achird, Fenrir only; server-side Gemini key; model frozen per job.
- At least two seconds to think, maximum playback speed 1.25, no truncation.
- Cached media survive retries; ambiguous voice requests never resubmit automatically.
- Existing jobs and image outputs remain compatible; narration is optional.

## Review focus

- Incorrect answer label or repeated alternatives must never enter narration.
- Oversized narration must fail before a paid video request.
- Quota errors, cancellation and ambiguous requests must not produce silent success.
- Repeated rendering must preserve original audio and avoid a second TTS request.
- A selected voice must survive the API and worker, including local video mode.

### Task 1: Narration domain and Gemini boundary

Files: create `src/lib/voices.ts`, `src/lib/narration.ts`, `src/server/gemini-tts.ts`, `tests/narration.test.ts`, `tests/gemini-tts.test.ts`.

Interfaces: shared voice catalog and Zod selection; `buildNarrationScript(question)` returns ordered segment text; `planNarration(durations, totalSeconds)` returns segment starts, speed and visual timing. `generateSpeech(text, voice)` returns a validated WAV buffer.

- [x] Write and run failing tests for correct B answer, unique alternatives, speed bounds, think time, invalid durations, REST voice/model, invalid audio, quota and network errors.
- [x] Implement these interfaces and run the focused tests until green.

### Task 2: Private audio preparation and MP4 assembly

Files: create `src/server/narration.ts`, `src/server/mux-audio.ts`, `tests/narration-media.test.ts`; modify `src/server/render.ts`, video props and compositions.

Interfaces: `prepareNarration(question, voice, directory, duration, isCancelled)` returns audio path and measured timing or null on cancellation. `muxNarration(video, audio, output, seconds)` adds AAC without re-encoding video. Render consumes the timing and optional narration path.

- [x] Write and run failing tests for cached TTS, ambiguous receipt, cancellation, oversized speech, FFmpeg duration and audio mux.
- [x] Implement atomic segment storage, pitch-preserving tempo and delayed mixing, shared visual timing, MP4 mux; run tests until green.

### Task 3: Persist and execute narrated jobs

Files: modify `src/lib/validation.ts`, `src/server/production.ts`, `src/server/process-job.ts`, studio API and types, `tests/database.test.ts`; add worker integration tests.

Interfaces: optional batch voice selection becomes a frozen `video_jobs.voice` object. Studio returns only public narration availability. Worker prepares narration before fal, passes timing to render, and surfaces narration failures explicitly.

- [x] Write and run failing tests for voice snapshot, missing key, invalid selection, non-video behavior, preparation-before-fal and no silent success.
- [x] Implement integration and run unit and real database tests.

### Task 4: Creator selection and end-to-end verification

Files: modify `Creator.tsx`, `Voices.tsx`, `globals.css`, `README.md`; add `tests/e2e/narration.spec.ts`, update existing local generation test to select no voice.

- [x] Write and run failing browser tests for voice selection, samples, production payload, missing-key feedback and mobile layout.
- [x] Implement a shared four-voice selector plus no-voice option, accurate cost/preview copy, and remove pending-integration messages.
- [x] Verify full test suite, database suite, browser flows, typecheck, formatting, build and a real narrated 30-second MP4 using local mascot animation.
- [x] Review the final diff and record evidence in the execution ledger.
