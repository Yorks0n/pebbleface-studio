# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pebble Face Studio is a visual watchface editor for Pebble smartwatches, built with React + Vite + TypeScript + react-konva + Zustand + Tailwind. Users design watchfaces visually, then export a Pebble SDK-ready `.zip` or compile to `.pbw` (Pebble bundle) via a remote build server.

## Commands

```bash
pnpm install       # install deps
pnpm dev           # dev server (localhost:5173)
pnpm build         # tsc -b && vite build → /dist
pnpm lint          # ESLint 9 flat config
pnpm format        # Prettier on src/**/*.{ts,tsx,css,md}
pnpm preview       # preview production build
```

No automated tests exist yet; `pnpm test` is a placeholder.

## Architecture

### State: `src/store/scene.ts`
Central Zustand store. The scene graph is the single source of truth — Konva is a renderer only, never persisted.

**Node types** (discriminated union on `type`):
- `RectNode` — filled/stroked rectangle
- `TextNode` — static text with font/size/color
- `TimeNode` — live time/date text using format strings (strftime-style)
- `BitmapNode` — PNG image stored as base64 dataURL
- `ImageTimeNode` — image-based digit glyphs for clock display
- `GPathNode` — vector path as relative point array

**Key store fields**: `nodes[]`, `selectedIds[]`, `aplitePreview`, `stage` (dimensions), `targetPlatforms`, `customFonts[]`.

### Canvas: `src/components/CanvasStage.tsx`
Konva Stage renders all nodes as Konva shapes. A single `<Transformer>` handles multi-select drag/scale/rotate; `onTransformEnd` commits changes back to the store.

Aplite preview mode runs pixel-level B&W conversion via a canvas 2D context on top of the Konva stage — it does not mutate stored colors.

### Export: `src/utils/exporter.ts`
Builds a JSZip bundle containing:
- `src/main.c` — generated Pebble C code for the entire scene
- `package.json` — Pebble app manifest with resource declarations
- `wscript` — Pebble SDK build script
- `resources/images/*.png` and `resources/fonts/*.ttf`

`compileAndDownload()` in `src/lib/buildClient.ts` POSTs the zip as FormData to `/api/build`, which the Cloudflare Worker proxies to the upstream `RUNNER_ORIGIN` build server, and returns a `.pbw` binary for download.

### Color Handling: `src/lib/utils.ts`
Pebble hardware uses 2-bit quantized color on some models. Key functions:
- `pebbleBwHexFromHex()` — converts color to B&W for aplite preview
- `pebbleGrayToneFromHex()` — maps to 4-level grayscale
- `apliteColor()` — final B&W conversion used in preview rendering

### Supported Platforms & Resolutions
- **Basalt** 144×168 — Aplite, Basalt, Diorite, Flint
- **Chalk** 180×180 — Pebble Time Round
- **Emery** 200×228 — Pebble Time 2

### Deployment
Cloudflare Workers via Wrangler (`wrangler.jsonc`). Static assets from `/dist`; `/api/build` proxies to `RUNNER_ORIGIN`. Routes to `studio.pebbleface.com`.

## Key Constraints

- **Do not persist Konva JSON** — always map to the custom scene graph in the store.
- Uploaded bitmaps stay as PNG; do not re-encode unless converting for Pebble resource compatibility.
- Custom fonts are stored as base64 dataURLs in the project JSON so they survive save/load.
- The retro aesthetic uses zero border-radius everywhere, Departure Mono font, and black/white color palette — preserve this when adding UI.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
