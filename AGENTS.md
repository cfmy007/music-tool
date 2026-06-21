# AGENTS.md

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- No test or lint scripts exist. Format with `npx prettier --write .`

## Stack

- Svelte 5 (runes: `$state`, `$derived`, `$effect`) + Vite 7
- TypeScript files but `jsconfig.json` (not `tsconfig.json`) — `checkJs: true` enables type checking on `.js`/`.svelte`
- PWA via `vite-plugin-pwa`
- No backend — all data in IndexedDB (`MusicToolDB`)

## Path aliases

- `$lib` → `src/lib` (configured in both `vite.config.ts` and `jsconfig.json`)

## Architecture

Two main views in `App.svelte`:

- **Tuner** — microphone-based pitch detection using `pitchy`
- **Score Library** — folder tree → note editor with drawing layers on score images

Data flow: IndexedDB (`src/lib/db/indexedDB.ts`) ↔ Svelte stores (`src/lib/stores/`) ↔ Components (`src/lib/components/`)

Key stores: `scoreStore`, `historyStore`, `settingsStore`, `uiStore`

## Data model

See `src/lib/db/schema.ts` for all interfaces. Core entities:

- `Folder` → contains `Note`s
- `Note` → has `ScorePage`s (image blobs) and `NoteLayer`s (canvas drawings)
- `AppSettings` — singleton (`key: 'global'`) storing last tab, tuner mode, metronome config

Bump `DB_VERSION` in schema when adding/changing stores.

## Code conventions

- Chinese comments throughout — match existing style
- Prettier: single quotes, no trailing commas, 100 char width, `prettier-plugin-svelte`
- Svelte 5 runes syntax only — do not use legacy `$:` reactive statements
- Components use `<script lang="ts">` blocks
- Responsive: app adapts layout for landscape (sidebar nav) vs portrait (bottom nav)

## Dependencies of note

- `@tldraw/tldraw` — used for drawing/annotation on score pages
- `pdf-lib` + `jszip` — export/import functionality in `src/lib/services/`
- `lucide-svelte` — icon library
- `pitchy` — audio pitch detection for tuner

## Gotchas

- `SizeController.ts` in repo root is a reference snippet, not part of the build
- No TypeScript compiler — rely on `checkJs` in jsconfig and IDE diagnostics
- IndexedDB is async; always `await` db operations and handle init failures
