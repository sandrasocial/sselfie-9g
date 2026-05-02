# DS-01: Design System — Global Token Migration (E2E)

**Priority:** HIGH  
**Source:** `docs/brand/DESIGN_SYSTEM.md` + hardcoded color audit  
**Branch:** current design-system cleanup branch  
**Commit prefix:** `ds:`  
**Touches:** `app/globals.css`, `lib/design-tokens.ts`, top-offender components

---

## Context

The canonical SSELFIE guide now lives in `docs/brand/DESIGN_SYSTEM.md`. The app should use the
cool workbook palette across screens, pages, wizards, and product flows:

- `obsidian` / black: `#0A0A0A`
- `porcelain` / white: `#FFFFFF`
- `pearl`: `#F5F5F5`
- `whisper`: `#E5E5E5`
- `smoke`: `#666666`
- `stone`: `#8A8780`
- `stoneDark`: `#2C2B29`
- `stoneSoft`: `#D4D1CC`

The problem: **147 component files still hardcode hex values** instead of using the shared tokens.

An audit found **1,476 hardcoded hex instances** across the codebase. The same colour appears in
four different forms simultaneously:

| Form | Example |
|------|---------|
| Tailwind arbitrary | `text-[#0F0D0B]` |
| Inline React style | `color: "#0F0D0B"` |
| `globals.css` variable | `--ink: #0F0D0B` |
| `tailwind.config.ts` | `deepest: "#0d0c0b"` |

A color change currently requires hunting multiple locations. This spec migrates the system so
one edit to `app/globals.css` or `lib/design-tokens.ts` propagates everywhere.

---

## Phase 1 — Lock the source of truth first

### 1A. Align `app/globals.css` with the workbook palette

Update the root variables and `.sselfie-app-shell` overrides so old names still work, but resolve
to the approved cool palette:

```css
--color-obsidian: #0a0a0a;
--color-porcelain: #ffffff;
--color-pearl: #f5f5f5;
--color-smoke: #666666;
--color-whisper: #e5e5e5;

--app-bg: #ffffff;
--app-surface: #f5f5f5;
--app-elevated: #ffffff;
--app-border: #e5e5e5;
--app-text-primary: #0a0a0a;
--app-text-secondary: #666666;
--app-text-muted: #8a8780;
```

Legacy marketing aliases may remain for compatibility, but their values should point to the cool
palette (`--cream` = white, `--cream-warm` = pearl, `--cream-deep` = whisper). Do not introduce
new beige or cream-tinted values.

### 1B. Align `lib/design-tokens.ts`

Keep existing export names for compatibility, but make shared classes use workbook surfaces:

- Primary surfaces: `var(--app-bg)`, `var(--app-surface)`, `var(--app-elevated)`
- Borders: `var(--app-border)` / `var(--app-glass-border)`
- Text: `var(--app-text-primary)`, `var(--app-text-secondary)`, `var(--app-text-muted)`
- Primary buttons: black background, white text
- Shadows: lighter editorial depth, not heavy dark glass
- Radius: rounded UI remains; only photos/thumbnails should move toward `0px` to `8px`

### 1C. Wire Tailwind aliases where useful

Tailwind v4 generates utility classes from `@theme` variables. Prefer aliases that name the
workbook system directly. Add only if they are missing:

```css
/* Workbook palette aliases */
--color-brand-obsidian:  var(--color-obsidian);
--color-brand-porcelain: var(--color-porcelain);
--color-brand-pearl:     var(--color-pearl);
--color-brand-smoke:     var(--color-smoke);
--color-brand-whisper:   var(--color-whisper);

/* Legacy aliases kept only for existing public/marketing classes */
--color-ink:             var(--ink);
--color-ink-soft:        var(--ink-soft);
--color-cream:           var(--cream);
--color-cream-warm:      var(--cream-warm);
--color-cream-deep:      var(--cream-deep);
--color-stone:           var(--stone);
```

After this change, use new token names for new work. Legacy names exist only so older components
do not break while they are being migrated.

### 1D. Update `tailwind.config.ts` only if needed

Prefer `@theme` in `app/globals.css` as the primary Tailwind v4 source. Touch
`tailwind.config.ts` only when a current utility class cannot be generated from `@theme`.

---

## Phase 2 — Migrate the top 10 offending files

Work through these files **one at a time**. Commit after each file. Do not batch.

### Token reference table

Use this when replacing hardcoded values:

| Hex | Tailwind class | CSS var | Notes |
|-----|---------------|---------|-------|
| `#0A0A0A` / `#0a0a0a` | `bg-brand-obsidian` / `text-brand-obsidian` | `var(--color-obsidian)` | Primary black |
| `#FFFFFF` / `#fff` | `bg-brand-porcelain` / `text-brand-porcelain` | `var(--color-porcelain)` | White surface/text |
| `#F5F5F5` / `#f5f5f5` | `bg-brand-pearl` | `var(--color-pearl)` | Pearl surface |
| `#E5E5E5` / `#e5e5e5` | `border-brand-whisper` / `bg-brand-whisper` | `var(--color-whisper)` | Dividers, soft borders |
| `#666666` / `#666` | `text-brand-smoke` | `var(--color-smoke)` | Secondary copy |
| `#8A8780` / `#8a8780` | `text-stone` | `var(--stone)` | Muted stone-gray labels |
| `#2C2B29` / `#2c2b29` | `bg-stone-dark` | `var(--stone-dark)` | Deep gray accents |
| `#D4D1CC` / `#d4d1cc` | `border-stone-soft` | `var(--stone-200)` / `var(--stoneSoft)` | Soft stone accents |
| `rgba(10,10,10,...)` | n/a — keep as CSS var | `var(--div-cream)` / `var(--app-*)` | Light surface overlays |
| `rgba(229,229,229,...)` | n/a — keep as CSS var | `var(--div-dark)` / `var(--glass-border)` | Dark surface dividers |

Retire older warm values as they are touched: `#EDE9E2`, `#F4F0E6`, `#D9D3C8`,
`#C4B5A0`, `#A89A8A`, `#7A6F63`, `#0F0D0B`, and `#1E1A15`.

### File 1: `app/checkout/success-content.tsx` (~102 hardcoded colours)

Most offenders will be `className="text-[#f0ede8]"` → `className="text-brand-porcelain"` or
`className="text-[#0d0c0b]"` → `className="text-brand-obsidian"`. Use find-and-replace for the
most frequent values, then review the rest manually.

Inline styles pattern: `style={{ color: "#f0ede8" }}` → either convert to a className or
`style={{ color: "var(--color-porcelain)" }}` if the inline style can't be avoided.

### File 2: `components/sselfie/studio-screen.tsx` (~69 hardcoded colours)

This file will primarily use the Studio token set (obsidian, porcelain, pearl, smoke, stone).
The glass/stone-panel classes from `globals.css` should already handle most surfaces:
`.stone-panel`, `.stone-chip`, `.stone-inset-panel`. Check if any wrapper `divs` have
`style={{ background: "#1c1b19" }}` or beige legacy values and replace with app tokens/classes.

### File 3: `app/page.tsx` or `components/sselfie/landing-page-new.tsx` (~62 hardcoded colours)

Marketing surface. Check for the `const C = { ink: "#0F0D0B", ... }` pattern. If present,
delete the local `C` object entirely and use Tailwind classes or CSS vars inline directly.
Pattern to look for and replace:

```tsx
// BEFORE
<h1 style={{ color: C.onDark, textShadow: LP.dark }}>

// AFTER — use semantic class
<h1 className="sa-h1 on-dark">
```

For sections: `style={{ background: C.ink }}` → `className="surface-dark"`.
For light sections, use workbook white/pearl surfaces. Existing `surface-cream` naming can remain
temporarily, but it should resolve to white/pearl values.

### File 4: `components/sselfie/concept-card.tsx` (~57 hardcoded colours)

Look for the inline style pattern with the colour constants. Replace with:
- Surface containers → `.card-dark` or `.card-cream`
- Body text → `text-on-dark-sub` or `text-on-cream-sub`
- Labels → `text-on-dark-muted` or `text-on-cream-muted`

### File 5: `components/sselfie/public-marketing.tsx`

**Special case.** This is the canonical marketing component. It uses:
```tsx
const C = { ink: "#0F0D0B", ... }
const LP = { dark: "0 2px 8px ...", cream: "1px 2px 3px ..." }
function ty(variant, dark) { ... }
```

**Do not delete `C`, `LP`, or `ty()` in this pass** — they are used throughout hundreds of
lines. Instead, do a targeted replacement of the most duplicated values:

1. Find all `style={{ background: C.ink }}` → `className="surface-dark"` (remove inline style)
2. Find all `style={{ background: C.cream }}` → `className="surface-cream"` while that class maps to white/pearl
3. Find `style={{ ...ty("eyebrow", dark) }}` → `className={\`eyebrow \${dark ? "on-dark" : "on-cream"}\`}`
4. Find `style={{ ...ty("h1", dark) }}` → `className={\`sa-h1 \${dark ? "on-dark" : "on-cream"}\`}`
5. Find `style={{ ...ty("h2", dark) }}` → `className={\`sa-h2 \${dark ? "on-dark" : "on-cream"}\`}`
6. Find `style={{ ...ty("body", dark) }}` → `className={\`sa-body \${dark ? "on-dark" : "on-cream"}\`}`

After the above, `C` and `LP` will still be referenced by card borders, dividers, and
special cases — leave those for the next iteration. This is a partial migration pass, not
a full rewrite.

### Files 6–10

Apply the same token-reference table above to:

- `components/sselfie/gallery-screen.tsx`
- `components/sselfie/feed-publishing-hub.tsx`
- `components/sselfie/academy-screen.tsx`
- `components/sselfie/blueprint-screen.tsx`
- `components/sselfie/instagram-photo-card.tsx`

For each: search for `#[0-9a-fA-F]{3,6}` and `rgba(` patterns in className and style props.
Replace using the token table above. Commit after each file.

---

## Phase 3 — Lint enforcement (run last, after Phase 2 is merged)

### 3A. Install the ESLint rule

Add to `.eslintrc.json` or the appropriate ESLint config file:

```json
{
  "rules": {
    "no-restricted-syntax": [
      "warn",
      {
        "selector": "Literal[value=/^#[0-9a-fA-F]{3,6}$/]",
        "message": "Hardcoded hex colour. Use a CSS variable (var(--ink)) or Tailwind alias (text-ink) instead."
      }
    ]
  }
}
```

This emits a **warning** (not error) for now so it doesn't break existing CI. Once Phase 2
is fully merged and clean, upgrade to `"error"`.

### 3B. Add to `package.json` scripts

```json
"lint:tokens": "eslint --rule 'no-restricted-syntax: [warn, ...]' components/ app/ --ext .tsx,.ts"
```

Or just run `pnpm lint` — the rule will be caught in the normal lint pass.

---

## What NOT to change

- Do not introduce new palette values in `app/globals.css`; update only documented tokens from `docs/brand/DESIGN_SYSTEM.md`.
- Do not change any server-side route logic, API routes, or database queries.
- Do not refactor component structure — colour replacement only.
- Do not change font sizes, spacing, or layout during color passes — tokens only.
- Do not remove the `const C` or `LP` objects from `public-marketing.tsx` in one pass — they are used in too many places. Migrate iteratively.

---

## Commit format

```
ds: align workbook design tokens (Phase 1)
ds: migrate checkout/success-content.tsx to design tokens
ds: migrate studio-screen.tsx to design tokens
ds: migrate landing-page-new.tsx to design tokens
ds: migrate concept-card.tsx to design tokens
ds: partial migration public-marketing.tsx (surfaces + headings)
ds: migrate gallery, feed, academy, blueprint, photo-card
ds: add ESLint token-hardcoding rule (Phase 3)
```

---

## Done criteria

- [ ] `app/globals.css` and `lib/design-tokens.ts` match `docs/brand/DESIGN_SYSTEM.md`
- [ ] `pnpm build` passes with 0 errors after Phase 1
- [ ] `pnpm lint` passes (warnings only for remaining hardcoded values)
- [ ] All 10 listed components use Tailwind aliases or CSS vars — no raw hex in className or style
- [ ] `public-marketing.tsx` uses `.surface-dark`, `.surface-cream`, `.sa-h1/.sa-h2`, `.eyebrow`, `.sa-body` for all section wrappers and headings
- [ ] No new hardcoded hex values introduced in any commit in this branch
- [ ] Report the final commit SHA and a count of remaining hardcoded hex instances (use ripgrep: `rg -n '#[0-9a-fA-F]{3,6}' components app --glob '*.{tsx,ts}' | wc -l`)
