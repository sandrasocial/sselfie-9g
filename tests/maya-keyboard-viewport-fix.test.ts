// @vitest-environment node

// MAYA-MULTISLIDE-KEYBOARD-01 (2026-07-21) - Sandra's live report: after the first message,
// every subsequent time she went to type, the Maya drawer landed behind the shell or showed
// only its lower half, blocking the chat entirely.
//
// Root cause: the mobile keyboard-viewport tracker recomputed its position on BOTH
// visualViewport "resize" AND "scroll" events. "scroll" fires for any pan of the visual
// viewport, including a transient one WebKit can trigger just from the thread's own
// overflow-y-auto content scrolling (which runs on every new message, via
// Element.scrollIntoView on a sentinel - a call that can walk past the nearest scrollable
// ancestor on WebKit). A stray pan reading landed keyboardBox.top on a wrong value with
// nothing to ever correct it, since the keyboard often never fully closes between messages -
// no fresh "resize" event ever fired to fix it, so the drawer stayed wrongly positioned for
// the rest of the session. Fixed by: tracking only "resize" (keyboard open/close is
// fundamentally a height change, never a scroll), clamping the offset defensively, and
// scrolling the thread's own container directly instead of via scrollIntoView.

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Maya drawer: keyboard-viewport tracking only reacts to genuine keyboard open/close", () => {
  const concierge = read("components/app-v3/maya-concierge.tsx")

  it("tracks visualViewport resize only - never scroll (scroll is what corrupted the position)", () => {
    const effectStart = concierge.indexOf("const [keyboardBox, setKeyboardBox]")
    const effectEnd = concierge.indexOf("}, [])", effectStart)
    const effect = concierge.slice(effectStart, effectEnd)

    expect(effect).toContain('vv.addEventListener("resize", update)')
    expect(effect).not.toContain('addEventListener("scroll"')
    expect(effect).not.toContain('removeEventListener("scroll"')
  })

  it("clamps the keyboard offset so a stray reading can never push the drawer off-screen", () => {
    const effectStart = concierge.indexOf("const [keyboardBox, setKeyboardBox]")
    // Window widened 2026-07-29: the focus-precondition comment block sits above the clamp.
    const effect = concierge.slice(effectStart, effectStart + 2600)
    expect(effect).toContain("Math.max(0, Math.min(vv.offsetTop, vv.height))")
  })

  it("only translates the drawer while an editable element is focused, and clears on blur", () => {
    const effectStart = concierge.indexOf("const [keyboardBox, setKeyboardBox]")
    const effectEnd = concierge.indexOf("}, [])", effectStart)
    const effect = concierge.slice(effectStart, effectEnd)
    // 2026-07-29 live report: toolbar show/hide or partial keyboard dismissal latched a
    // positive offset with no keyboard on screen — the drawer sat "dropped down" until a
    // tap refocused the composer. The keyboard only exists while an editable is focused.
    expect(effect).toContain("editableFocused()")
    expect(effect).toContain('window.addEventListener("focusin", onFocusChange)')
    expect(effect).toContain('window.addEventListener("focusout", onFocusChange)')
    expect(effect).toContain("window.setTimeout(update, 250)")
  })

  it("scrolls the thread's own container directly - never Element.scrollIntoView on a sentinel", () => {
    expect(concierge).toContain("scrollThreadToBottom")
    expect(concierge).toContain("el.scrollTo?.({ top: el.scrollHeight, behavior: \"smooth\" })")
    // The word still appears in the explanatory comment above threadRef; no CODE may call it.
    expect(concierge).not.toMatch(/[a-zA-Z0-9_)\]]\.scrollIntoView\(/)
    expect(concierge).not.toContain("threadEndRef")
  })

  it("attaches the thread ref to the actual scrollable log container", () => {
    const threadStart = concierge.indexOf('role="log"')
    const threadBlock = concierge.slice(Math.max(0, threadStart - 200), threadStart)
    expect(threadBlock).toContain("ref={threadRef}")
  })

  it("every scroll-to-bottom call site uses the shared helper, not a duplicated implementation", () => {
    const calls = concierge.match(/scrollThreadToBottom\(\)/g) || []
    // brand-prompt reveal + the main messages/format/text-choice effect
    expect(calls.length).toBeGreaterThanOrEqual(2)
  })
})
