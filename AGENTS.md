# Pebble Face Studio — Agent Guide

## What this project does
- Visual Pebble watchface editor (React + Vite + TS + react-konva + Zustand + Tailwind).
- Scene graph stored in `src/store/scene.ts` (rect/text/bitmap); Konva is a renderer only.
- Export flow (`src/utils/exporter.ts`) builds `appinfo.json`, `src/main.c` scaffold, and `resources/images/*` zip via JSZip + FileSaver.

## How to run locally
1) Install deps: `pnpm install`
2) Dev server: `pnpm dev` → open shown localhost port
3) Build check: `pnpm build`
4) Lint: `pnpm lint`

## Using the editor
- Tools (left): select / rectangle / text / bitmap (file picker). Click canvas (200×228) to place rect/text; drag/scale/rotate with Transformer; Shift for multi-select.
- Properties (right): edit x/y/w/h/rotation/fill/stroke; text: content/font/size; bitmap: filename; delete button.
- Layers panel: reorder (top/up/down/bottom) and quick select.
- Aplite preview toggle: grayscale/high-contrast preview without mutating stored colors.
- Export button: “Export Pebble Project (zip)” downloads Pebble SDK-ready bundle.

## Files & structure
- `src/App.tsx` — page layout wiring toolbar/canvas/panels.
- `src/components/*` — UI pieces; `CanvasStage` handles Konva stage + Transformer; `Toolbar` manages tool mode and image import.
- `src/store/scene.ts` — Zustand store, node types, layer reordering, aplite color helper.
- `src/utils/exporter.ts` — zip generation, Pebble templates.
- `tailwind.config.cjs`, `src/index.css` — styling foundation (Space Grotesk + Inter Tight).

## Notes & constraints
- Do not persist Konva JSON; always map to custom scene graph.
- Export keeps uploaded bitmaps as-is (PNG by default).
- No automated tests yet; `pnpm test` placeholder echoes a message.
