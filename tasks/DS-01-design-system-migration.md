# DS-01: Design System — Global Token Migration (E2E)

**Priority:** HIGH  
**Source:** Design system bundle (claude.ai/design, 2026-04-27) + codebase audit  
**Branch:** `codex/design-system-migration`  
**Commit prefix:** `ds:`  
**Touches:** `tailwind.config.ts`, `app/globals.css`, 10 top-offender components

---

## Context

The SSELFIE design system was formalised and committed to `app/globals.css` on 2026-04-27
(commit `0effec6b`). The CSS variables and semantic classes now exist globally. The problem:
**147 component files still hardcode hex values** instead of using those variables.

An audit found **1,476 hardcoded hex instances** across the codebase. The same colour appears in
four different forms simultaneously:

| Form | Example |
|------|---------|
| Tailwind arbitrary | `text-[#0F0D0B]` |
| Inline React style | `color: "#0F0D0B"` |
| `globals.css` variable | `--ink: #0F0D0B` |
| `tailwind.config.ts` | `deepest: "#0d0c0b"` |

A colour change requires hunting 4 locations. This spec migrates the system so one edit to
`globals.css` propagates everywhere.

---

## Phase 1 — Wire Tailwind to CSS variables (do this first, it closes the hole)

### 1A. Add marketing aliases to the `@theme` block in `app/globals.css`

Tailwind v4 generates utility classes from `@theme` variables. Add these aliases directly after
the existing `--color-brand-*` entries inside the `@theme {}` block (around line 393):

```css
/* Marketing surface aliases — generates bg-ink, text-cream, border-stone, etc. */
--color-ink:            var(--ink);
--color-ink-soft:       var(--ink-soft);
--color-cream:          var(--cream);
--color-cream-warm:     var(--cream-warm);
--color-cream-deep:     var(--cream-deep);
--color-stone:          var(--stone);

/* Semantic text aliases — generates text-on-dark, text-on-cream, etc. */
--color-on-dark:        var(--on-dark);
--color-on-dark-sub:    var(--on-dark-sub);
--color-on-dark-muted:  var(--on-dark-muted);
--color-on-cream:       var(--on-cream);
--color-on-cream-sub:   var(--on-cream-sub);
--color-on-cream-muted: var(--on-cream-muted);
```

After this change, `text-ink`, `bg-cream`, `border-stone`, `text-on-dark-sub` etc. work as
Tailwind utility classes in every component.

### 1B. Update `tailwind.config.ts` — remove hardcoded hex, point to CSS vars

Replace the current `theme.extend.colors` block with CSS variable references so Tailwind v3
compatibility (used for content scanning) stays clean:

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Marketing system — maps to CSS vars in globals.css
        ink:            "var(--ink)",
        "ink-soft":     "var(--ink-soft)",
        cream:          "var(--cream)",
        "cream-warm":   "var(--cream-warm)",
        "cream-deep":   "var(--cream-deep)",
        stone:          "var(--stone)",
        "on-dark":      "var(--on-dark)",
        "on-dark-sub":  "var(--on-dark-sub)",
        "on-dark-muted":"var(--on-dark-muted)",
        "on-cream":     "var(--on-cream)",
        "on-cream-sub": "var(--on-cream-sub)",
        "on-cream-muted":"var(--on-cream-muted)",
        // Studio system — maps to CSS vars in globals.css
        obsidian:       "var(--color-obsidian)",
        porcelain:      "var(--color-porcelain)",
        pearl:          "var(--color-pearl)",
        smoke:          "var(--color-smoke)",
        whisper:        "var(--color-whisper)",
        // Stone scale (keep for legacy class compatibility)
        "stone-deepest":"var(--stone-deepest)",
        "stone-dark":   "var(--stone-dark)",
        "stone-mid":    "var(--stone-mid)",
        "stone-accent": "var(--stone-accent)",
        "stone-pale":   "var(--stone-pale)",
      },
    },
  },
}

export default config
```

**Verify Phase 1:** Run `pnpm build` — it must complete with 0 errors before proceeding.
If Tailwind throws on CSS var references in config (v3 limitation), fall back to:
`ink: "rgb(var(--ink) / <alpha-value>)"` pattern or simply leave v3 config pointing to the
literal hex values and rely solely on the v4 `@theme` block for new classes.

---

## Phase 2 — Migrate the top 10 offending files

Work through these files **one at a time**. Commit after each file. Do not batch.

### Token reference table

Use this when replacing hardcoded values:

| Hex | Tailwind class | CSS var | Notes |
|-----|---------------|---------|-------|
| `#0F0D0B` | `text-ink` / `bg-ink` | `var(--ink)` | Primary dark surface |
| `#1E1A15` | `bg-ink-soft` | `var(--ink-soft)` | Cards on dark |
| `#EDE9E2` | `bg-cream` / `text-cream` | `var(--cream)` | Primary light surface |
| `#F4F0E6` | `bg-cream-warm` | `var(--cream-warm)` | Cards on cream |
| `#D9D3C8` | `border-cream-deep` | `var(--cream-deep)` | Borders on cream |
| `#C4B5A0` | `text-stone` | `var(--stone)` | Secondary / accent |
| `#EDE9E2` (heading on dark) | `text-on-dark` | `var(--on-dark)` | |
| `#C4B5A0` (body on dark) | `text-on-dark-sub` | `var(--on-dark-sub)` | |
| `#A89A8A` (labels on dark) | `text-on-dark-muted` | `var(--on-dark-muted)` | |
| `#3D3830` (body on cream) | `text-on-cream-sub` | `var(--on-cream-sub)` | |
| `#7A6F63` (labels on cream) | `text-on-cream-muted` | `var(--on-cream-muted)` | |
| `#0d0c0b` / `#f0ede8` | `bg-obsidian` / `text-porcelain` | `var(--color-obsidian)` / `var(--color-porcelain)` | Studio tokens |
| `#8a8780` | `text-smoke` | `var(--color-smoke)` | Studio metadata |
| `#a8a49c` | `text-stone-accent` | `var(--stone-accent)` | Studio muted |
| `#c8c4bb` | `text-whisper` | `var(--color-whisper)` | Studio secondary |
| `rgba(237,233,226,0.10)` | n/a — keep as CSS var | `var(--div-dark)` | Divider on dark |
| `rgba(15,13,11,0.10)` | n/a — keep as CSS var | `var(--div-cream)` | Divider on cream |

### File 1: `app/checkout/success-content.tsx` (~102 hardcoded colours)

Most offenders will be `className="text-[#f0ede8]"` → `className="text-porcelain"` or
`className="text-[#0d0c0b]"` → `className="text-obsidian"`. Use find-and-replace for the
most frequent values, then review the rest manually.

Inline styles pattern: `style={{ color: "#f0ede8" }}` → either convert to a className or
`style={{ color: "var(--color-porcelain)" }}` if the inline style can't be avoided.

### File 2: `components/sselfie/studio-screen.tsx` (~69 hardcoded colours)

This file will primarily use the Studio token set (obsidian, porcelain, smoke, stone-accent).
The glass/stone-panel classes from `globals.css` should already handle most surfaces:
`.stone-panel`, `.stone-chip`, `.stone-inset-panel`. Check if any wrapper `divs` have
`style={{ background: "#1c1b19" }}` and replace with `className="bg-stone-dark"`.

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
2. Find all `style={{ background: C.cream }}` → `className="surface-cream"`
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

For each: grep for `#[0-9a-fA-F]{3,6}` and `rgba(` patterns in className and style props.
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

- Do not touch `app/globals.css` `:root` or `@theme` blocks — they are the source of truth and were committed in this session.
- Do not change any server-side route logic, API routes, or database queries.
- Do not refactor component structure — colour replacement only.
- Do not change font sizes, spacing, or layout — tokens only.
- Do not remove the `const C` or `LP` objects from `public-marketing.tsx` in one pass — they are used in too many places. Migrate iteratively.

---

## Commit format

```
ds: wire Tailwind to CSS variables (Phase 1)
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

- [ ] `pnpm build` passes with 0 errors after Phase 1
- [ ] `pnpm lint` passes (warnings only for remaining hardcoded values)
- [ ] All 10 listed components use Tailwind aliases or CSS vars — no raw hex in className or style
- [ ] `public-marketing.tsx` uses `.surface-dark`, `.surface-cream`, `.sa-h1/.sa-h2`, `.eyebrow`, `.sa-body` for all section wrappers and headings
- [ ] No new hardcoded hex values introduced in any commit in this branch
- [ ] Report the final commit SHA and a count of remaining hardcoded hex instances (run: `grep -rn '#[0-9a-fA-F]\{3,6\}' components/ app/ --include='*.tsx' | wc -l`)
