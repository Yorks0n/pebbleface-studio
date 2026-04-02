# TODOS

Work items deferred from plan reviews. Add new items at the top.

---

## [P3] ImageTimeNode: warn on unrecognized glyph file names

**What:** In `PropertiesPanel.tsx handleDigitUpload`, files where `parseGlyphKeyFromFileName` returns `null` are silently dropped. Show a toast or inline warning listing which files were skipped and why.

**Why:** Users upload PNGs, see nothing happen, and don't know the file name format was wrong. The help text exists but users miss it mid-upload.

**Effort:** S (CC: ~10 min)
**Depends on:** Nothing (standalone UX fix)
**Source:** plan-eng-review 2026-04-02

---

## [P2] button.tsx hex color cleanup

**What:** Replace `hover:bg-[#333]`, `hover:border-[#333]`, `hover:bg-[#eee]`, `text-[#666]` in `src/components/ui/button.tsx` with Tailwind color tokens.

**Why:** The button component has the same hardcoded hex drift as LayerPanel. Left out of the UI spacing pass because the styles are intentional button component theming, but a future unification pass should bring button hover colors into the token system (e.g., `bg-surface`, `text-dim`).

**Effort:** S (CC: ~5 min)
**Depends on:** UI spacing polish PR merged (token system in place)
**Source:** plan-ceo-review 2026-04-01

---

## [P2] PanelSection / PanelRow component extraction

**What:** Extract `<PanelSection>` (header + children + optional divider) and `<PanelRow>` (label + control, consistent gap) as reusable primitives. Use them in `PropertiesPanel.tsx`, `LayerPanel.tsx`, and `Toolbar.tsx`.

**Why:** The 10x vision from the CEO review. After the spacing pass, spacing is consistent but enforced by className memory. Component primitives enforce it structurally — no future developer needs to remember `gap-panel-xs`. This is the structural equivalent of what the spacing pass does at the value level.

**Effort:** M (CC: ~30 min)
**Depends on:** UI spacing polish PR merged
**Source:** plan-ceo-review 2026-04-01

---

## [P3] PropertiesPanel split into sub-components

**What:** Split `src/components/PropertiesPanel.tsx` (921 lines) into per-node-type components: `RectProperties`, `TextProperties`, `TimeProperties`, `ImageTimeProperties`, `GPathProperties`, `GlobalProperties`. Route by `target.type`.

**Why:** The monolith makes spacing and styling changes harder to reason about. Splitting by concern makes each section independently editable and removes the cognitive overhead of navigating 921 lines to find one field group.

**Effort:** M (CC: ~20 min)
**Depends on:** PanelSection/PanelRow extraction (above) would make this cleaner, but not required
**Source:** plan-ceo-review 2026-04-01
