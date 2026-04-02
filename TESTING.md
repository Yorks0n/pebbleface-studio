# Testing

100% test coverage is the key to great vibe coding. Tests let you move fast, trust your instincts, and ship with confidence — without them, vibe coding is just yolo coding. With tests, it's a superpower.

## Framework

**Vitest 4.x** — runs in Node environment, no DOM required for unit tests.

## Run Tests

```bash
pnpm test          # run all tests once
pnpm test --watch  # re-run on file change
```

## Test Files

| File | What it covers |
|------|---------------|
| `src/lib/image-time.test.ts` | All pure functions for ImageTimeNode: glyph key sets, strftime format expressions, uppercase detection, layout positions, rendered value (including 12h midnight edge), glyph file name parsing |
| `src/store/scene.loadProject.test.ts` | `loadProject` backwards-compat: old `digits` field migrates to `glyphs` with uppercase keys |

## Conventions

- Test files live next to the source file (`foo.ts` → `foo.test.ts`)
- Use `describe` + `it`, plain assertions with `expect(...).toBe(...)`
- Pure function tests: no mocks, no DOM
- Store tests: use `useSceneStore.getState()` directly, reset state in `beforeEach`
- Regression tests: add a comment `// Regression: ISSUE-NNN — what broke` above the test

## Expectations

- When writing new pure functions, write a corresponding test
- When fixing a bug, write a regression test
- When adding a conditional (if/else), test both paths
- Never commit code that makes existing tests fail
