# Maya Chat Focus Mode — Implementation Spec
**Date:** 2026-03-01
**Status:** Ready for North to implement
**Priority:** High — approved by Sandra

---

## Context

The Maya screen currently has too many tabs (PHOTOS / VIDEOS / PROMPTS / TRAINING / FEED) and too many action buttons below the input (New Project / History). This clutters the UI. Sandra approved a cleanup to focus the screen on the core action: chatting with Maya.

**⚠️ IMPORTANT — What NOT to touch:**
- Do NOT remove Training from the app navigation (it must remain accessible via the slide-in MENU)
- Do NOT remove or change the feed tab logic, just hide it from the tab bar
- Do NOT change any backend logic, API calls, or data fetching
- Do NOT touch `maya-quick-prompts.tsx` — North already added `quick-chips` variant in commit `8f93fa0b`

---

## Approved Changes (4 total)

### Change 1 — Tab bar: reduce to CHAT + VIDEOS only

**File:** `components/sselfie/maya/maya-tab-switcher.tsx`

The `tabs` array currently shows 5 tabs. Change it to show only 2:

```tsx
// BEFORE
const tabs = [
  { id: "photos" as const, label: "Photos" },
  { id: "videos" as const, label: "Videos" },
  { id: "prompts" as const, label: "Prompts" },
  { id: "training" as const, label: "Training" },
  { id: "feed" as const, label: "Feed" },
]

// AFTER — keep id as "photos" for backward compatibility, just change label
const tabs = [
  { id: "photos" as const, label: "Chat" },
  { id: "videos" as const, label: "Videos" },
]
```

**Keep the TypeScript type unchanged** — `"photos" | "videos" | "prompts" | "training" | "feed"` — so no cascade changes are needed elsewhere. The component just won't render the hidden tabs.

**Training remains accessible** via the slide-in MENU navigation (it already has a "Training" button there). This is not a regression.

---

### Change 2 — Add `···` dots menu to the header

**File:** `components/sselfie/maya/maya-header.tsx`

Add a `···` (three dots) button between the Mode Toggle and the MENU button. Tapping it opens a small dropdown with 4 items:
- Settings
- New Project
- History
- Prompts Library

**New props to add to `MayaHeaderUnifiedProps` interface:**
```tsx
onNewProject?: () => void
onHistory?: () => void
```

**New state/ref to add:**
```tsx
const [isDotsMenuOpen, setIsDotsMenuOpen] = useState(false)
const dotsMenuRef = useRef<HTMLDivElement>(null)
```

**Add click-outside handler** for dotsMenuRef inside the existing useEffect that already handles `showNavMenu`.

**Button + dropdown UI** — insert between Mode Toggle and Menu Button:
```tsx
{(onSettings || onNewProject || onHistory || onNavigation) && (
  <div className="relative" ref={dotsMenuRef}>
    <button
      onClick={() => setIsDotsMenuOpen(prev => !prev)}
      className="touch-manipulation active:scale-95 flex items-center justify-center"
      style={{
        width: '44px', height: '44px', minWidth: '44px', minHeight: '44px',
        borderRadius: '12px',
        border: '1px solid #e5e5e5',
        backgroundColor: 'transparent',
        cursor: 'pointer',
      }}
      aria-label="More options"
    >
      <span style={{ fontSize: '18px', fontWeight: 500, color: '#0a0a0a', letterSpacing: '0.05em' }}>···</span>
    </button>

    {isDotsMenuOpen && (
      <div
        className="absolute right-0 z-[200] animate-in fade-in slide-in-from-top-2 duration-150"
        style={{
          top: 'calc(100% + 8px)', width: '200px',
          backgroundColor: '#ffffff', border: '1px solid #e5e5e5',
          borderRadius: '16px', padding: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        }}
      >
        {onSettings && (
          <button onClick={() => { onSettings(); setIsDotsMenuOpen(false) }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 transition-colors touch-manipulation"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: '#0a0a0a' }}>
            Settings
          </button>
        )}
        {onNewProject && (
          <button onClick={() => { onNewProject(); setIsDotsMenuOpen(false) }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 transition-colors touch-manipulation"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: '#0a0a0a' }}>
            New Project
          </button>
        )}
        {onHistory && (
          <button onClick={() => { onHistory(); setIsDotsMenuOpen(false) }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 transition-colors touch-manipulation"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: '#0a0a0a' }}>
            History
          </button>
        )}
        {onNavigation && (
          <button onClick={() => { onNavigation('prompts'); setIsDotsMenuOpen(false) }}
            className="w-full text-left px-4 py-3 rounded-xl hover:bg-stone-50 transition-colors touch-manipulation"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 300, color: '#0a0a0a' }}>
            Prompts Library
          </button>
        )}
      </div>
    )}
  </div>
)}
```

---

### Change 3 — Wire quick-chips above input (Chat tab)

**File:** `components/sselfie/maya-chat-screen.tsx`

Find the `MayaQuickPrompts` usage inside the fixed input bar container (the one with `variant="input-area"`). Change the variant prop so the Chat tab (id: "photos") uses quick-chips:

```tsx
// BEFORE
variant="input-area"

// AFTER
variant={activeMayaTab === "photos" ? "quick-chips" : "input-area"}
```

Note: `activeMayaTab === "photos"` is the Chat tab (the id is "photos" for backward compat).

The `quick-chips` variant already exists in `maya-quick-prompts.tsx` (added by North in commit `8f93fa0b`) — no changes needed to that file.

---

### Change 4 — Remove New Project / History from input bar

**File:** `components/sselfie/maya/maya-unified-input.tsx`

Remove the entire block that renders New Project and History as text buttons below the input. These are now accessible via the `···` dots menu in the header.

Find and remove this block (approx 40 lines):
```tsx
{/* Navigation buttons - New Project and History ... */}
{(onNewProject || onHistory) && (
  <div className="mt-2 flex items-center justify-start gap-4" ...>
    {onNewProject && (<button ...>New Project</button>)}
    {onHistory && (<button ...>History</button>)}
  </div>
)}
```

Replace with a single comment:
```tsx
{/* New Project / History moved to header ··· menu */}
```

Keep the `onNewProject` and `onHistory` props in the interface — they may still be passed by the parent but are just no longer rendered here.

---

## Files to Touch (only these 4)

| File | Change |
|------|--------|
| `components/sselfie/maya/maya-tab-switcher.tsx` | Reduce tabs array to 2 items, rename Photos→Chat |
| `components/sselfie/maya/maya-header.tsx` | Add `···` dots menu with 4 items |
| `components/sselfie/maya-chat-screen.tsx` | Wire quick-chips variant for Chat tab |
| `components/sselfie/maya/maya-unified-input.tsx` | Remove New Project/History button row |

## Files NOT to touch

- `maya-quick-prompts.tsx` — quick-chips variant already exists
- `maya-chat-history.tsx` — no changes
- Any API routes or backend files
- Any other Maya components

---

## Current Git State

A commit `d6ce710c` was made with partially correct changes but it **incorrectly removed Training tab entirely** (by changing the type union). North should **revert that commit** and implement fresh from this spec.

```bash
# Revert the bad commit first
git revert d6ce710c --no-edit

# Then implement from this spec and commit fresh
```

Or alternatively, force-reset to `8f93fa0b` (North's last clean commit) and implement from scratch.

---

## QA Checklist (test on 375px mobile)

- [ ] Tab bar shows exactly 2 tabs: CHAT | VIDEOS
- [ ] Training is still accessible via MENU → Training
- [ ] `···` button appears in header between Mode Toggle and MENU
- [ ] Tapping `···` opens dropdown with Settings / New Project / History / Prompts Library
- [ ] Tapping outside `···` dropdown closes it
- [ ] Quick prompt chips appear as horizontal scrollable row above the input on CHAT tab
- [ ] No New Project / History text buttons below the input
- [ ] No TypeScript errors in build
- [ ] VIDEOS tab still works
