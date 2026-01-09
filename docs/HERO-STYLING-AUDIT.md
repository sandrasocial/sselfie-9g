# Hero Styling Inconsistencies Audit

**Date:** 2026-01-09  
**Scope:** Hero sections across landing page, free blueprint, paid blueprint, and email capture

---

## 🔍 Pages Audited

1. **Homepage/Landing Page** - `/components/sselfie/landing-page-new.tsx`
2. **Free Blueprint (Step 0)** - `/app/blueprint/page-client.tsx`
3. **Paid Blueprint Landing** - `/components/paid-blueprint/paid-blueprint-landing.tsx`
4. **Email Capture** - `/components/blueprint/blueprint-email-capture.tsx`

---

## 📊 Styling Comparison Table

| Element | Homepage | Free Blueprint | Paid Blueprint | Email Capture |
|---------|----------|----------------|----------------|---------------|
| **Background Image** | `30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png` | `x7d928rnjsrmr0cvknvss5q6xm-B9fjSTkpQhQHUq3pBPExL4Pjcm5jNU.png` | `x7d928rnjsrmr0cvknvss5q6xm-B9fjSTkpQhQHUq3pBPExL4Pjcm5jNU.png` | `/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png` |
| **Background Position** | `50% 25%` | `50% 25%` | `50% 25%` | `object-cover` (default center) |
| **Dark Overlay** | ❌ None | `rgba(0, 0, 0, 0.4)` | `rgba(0, 0, 0, 0.4)` | `bg-black/60` |
| **Gradient Overlay** | `radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)` | `radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)` | `radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)` | ❌ None |
| **Content Position** | Centered (flex justify-center) | Centered (flex justify-center) | **Bottom** (`items-end`) | Centered (flex justify-center) |
| **Label/Span** | `label fade-up` class | `block mb-4 text-sm sm:text-base font-light tracking-[0.2em] uppercase` | `block mb-4 text-sm sm:text-base font-light tracking-[0.2em] uppercase` | `text-xs font-light tracking-[0.3em] uppercase text-white/70 mb-4` |
| **Label Text Shadow** | `0 2px 10px rgba(0,0,0,0.3)` | `0 2px 10px rgba(0,0,0,0.3)` | `0 2px 10px rgba(0,0,0,0.3)` | ❌ None |
| **H1 Font Family** | `'Times New Roman', serif` | `'Times New Roman', serif` | `'Times New Roman', serif` | `'Times New Roman', serif` |
| **H1 Font Weight** | `300` | `300` | `300` | `extralight` (200) |
| **H1 Font Style** | `normal` | `normal` | `normal` | ❌ Not set |
| **H1 Text Shadow** | `0 2px 20px rgba(0,0,0,0.3)` | `0 2px 20px rgba(0,0,0,0.3)` | `0 2px 20px rgba(0,0,0,0.3)` | ❌ None |
| **H1 Size** | `hero-title` class | `text-3xl sm:text-5xl md:text-6xl lg:text-7xl` | `text-3xl sm:text-5xl md:text-6xl lg:text-7xl` | `text-4xl sm:text-5xl md:text-6xl` |
| **H1 Tracking** | Class-based | `tracking-tight` | `tracking-tight` | `tracking-tight` |
| **H1 Color** | White (via class) | `text-white` | `text-white` | `text-white` |
| **Description Text Shadow** | `0 1px 5px rgba(0,0,0,0.3)` | `0 1px 5px rgba(0,0,0,0.3)` | `0 1px 5px rgba(0,0,0,0.3)` | ❌ None |
| **Description Size** | `description` class | `text-base sm:text-lg md:text-xl` | `text-base sm:text-lg md:text-xl` | `text-base sm:text-lg` |
| **Description Color** | White (via class) | `text-white` | `text-white` | `text-white/80` |
| **Container Max Width** | Not explicitly set | `max-w-4xl` | `max-w-4xl` | `max-w-2xl` |
| **Container Padding** | Class-based | `px-4 sm:px-6` | `px-4 sm:px-6 pb-16 sm:pb-20 pt-20` | `px-4 py-12 sm:py-16` |

---

## ❌ Inconsistencies Found

### 1. **Background Images**
- **Homepage:** Different image (`30vxpdwy61rmw0cvdxj8apjzgc...`)
- **Free Blueprint:** Same as Paid (`x7d928rnjsrmr0cvknvss5q6xm...`)
- **Paid Blueprint:** Same as Free (`x7d928rnjsrmr0cvknvss5q6xm...`)
- **Email Capture:** Different image (`/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png`)

**Issue:** Three different background images across funnel

---

### 2. **Dark Overlay**
- **Homepage:** ❌ Missing
- **Free Blueprint:** ✅ `rgba(0, 0, 0, 0.4)`
- **Paid Blueprint:** ✅ `rgba(0, 0, 0, 0.4)`
- **Email Capture:** ✅ `bg-black/60` (equivalent to `rgba(0, 0, 0, 0.6)`)

**Issue:** Homepage missing dark overlay, Email Capture has darker overlay

---

### 3. **Gradient Overlay**
- **Homepage:** ✅ Present
- **Free Blueprint:** ✅ Present
- **Paid Blueprint:** ✅ Present
- **Email Capture:** ❌ Missing

**Issue:** Email Capture missing gradient overlay

---

### 4. **Content Positioning**
- **Homepage:** Centered vertically
- **Free Blueprint:** Centered vertically
- **Paid Blueprint:** **Bottom-aligned** (`items-end`)
- **Email Capture:** Centered vertically

**Issue:** Paid Blueprint hero content is at bottom, others are centered

---

### 5. **Label/Span Styling**
- **Homepage:** Uses `label fade-up` class
- **Free Blueprint:** Inline styles with `block mb-4 text-sm sm:text-base font-light tracking-[0.2em] uppercase`
- **Paid Blueprint:** Same as Free Blueprint
- **Email Capture:** `text-xs font-light tracking-[0.3em] uppercase text-white/70 mb-4` (smaller, different tracking, different opacity)

**Issue:** Email Capture label is smaller, different tracking, different opacity, no text shadow

---

### 6. **H1 Font Weight**
- **Homepage:** `fontWeight: 300`
- **Free Blueprint:** `fontWeight: 300`
- **Paid Blueprint:** `fontWeight: 300`
- **Email Capture:** `font-extralight` (200)

**Issue:** Email Capture uses lighter font weight (200 vs 300)

---

### 7. **H1 Text Shadow**
- **Homepage:** ✅ `0 2px 20px rgba(0,0,0,0.3)`
- **Free Blueprint:** ✅ `0 2px 20px rgba(0,0,0,0.3)`
- **Paid Blueprint:** ✅ `0 2px 20px rgba(0,0,0,0.3)`
- **Email Capture:** ❌ Missing

**Issue:** Email Capture H1 missing text shadow

---

### 8. **H1 Size**
- **Homepage:** `hero-title` class (unknown exact size)
- **Free Blueprint:** `text-3xl sm:text-5xl md:text-6xl lg:text-7xl`
- **Paid Blueprint:** `text-3xl sm:text-5xl md:text-6xl lg:text-7xl`
- **Email Capture:** `text-4xl sm:text-5xl md:text-6xl` (missing `lg:text-7xl`)

**Issue:** Email Capture missing largest breakpoint size

---

### 9. **Description Text Shadow**
- **Homepage:** ✅ `0 1px 5px rgba(0,0,0,0.3)`
- **Free Blueprint:** ✅ `0 1px 5px rgba(0,0,0,0.3)`
- **Paid Blueprint:** ✅ `0 1px 5px rgba(0,0,0,0.3)`
- **Email Capture:** ❌ Missing

**Issue:** Email Capture description missing text shadow

---

### 10. **Description Color**
- **Homepage:** White (via class)
- **Free Blueprint:** `text-white`
- **Paid Blueprint:** `text-white`
- **Email Capture:** `text-white/80` (80% opacity)

**Issue:** Email Capture description has reduced opacity

---

### 11. **Container Max Width**
- **Homepage:** Not explicitly set (uses class)
- **Free Blueprint:** `max-w-4xl`
- **Paid Blueprint:** `max-w-4xl`
- **Email Capture:** `max-w-2xl` (narrower)

**Issue:** Email Capture container is narrower

---

## ✅ Consistent Elements

- **H1 Font Family:** All use `'Times New Roman', serif` ✅
- **H1 Color:** All use white ✅
- **H1 Tracking:** All use `tracking-tight` ✅
- **Description Font:** All use light weight ✅
- **Button Styles:** Similar white buttons with black text ✅

---

## 🎯 Recommended Standardization

### Standard Hero Styling (Recommended)

```typescript
// Background
backgroundImage: "url('...')" // Use same image across all
backgroundPosition: "50% 25%"

// Overlays (in order)
1. Dark Overlay: backgroundColor: "rgba(0, 0, 0, 0.4)"
2. Gradient Overlay: background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)"

// Content Position
flex items-center justify-center // Centered vertically

// Label/Span
className: "block mb-4 text-sm sm:text-base font-light tracking-[0.2em] uppercase text-white"
style: { textShadow: "0 2px 10px rgba(0,0,0,0.3)" }

// H1
style: {
  fontFamily: "'Times New Roman', serif",
  fontStyle: "normal",
  fontWeight: 300,
  textShadow: "0 2px 20px rgba(0,0,0,0.3)",
}
className: "text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-4 sm:mb-6 text-white leading-[1.1] tracking-tight"

// Description
className: "text-base sm:text-lg md:text-xl leading-relaxed mb-6 sm:mb-8 max-w-xl mx-auto text-white"
style: { textShadow: "0 1px 5px rgba(0,0,0,0.3)" }

// Container
className: "relative z-10 max-w-4xl mx-auto text-center w-full h-full flex flex-col justify-center px-4 sm:px-6"
```

---

## 📋 Fix Priority

### 🔴 High Priority (Visual Impact)
1. **Email Capture:** Add gradient overlay
2. **Email Capture:** Add text shadows to H1 and description
3. **Email Capture:** Fix H1 font weight (300, not 200)
4. **Email Capture:** Fix H1 size (add `lg:text-7xl`)
5. **Email Capture:** Fix description color (full white, not 80%)
6. **Homepage:** Add dark overlay for consistency

### 🟡 Medium Priority (Consistency)
7. **Email Capture:** Fix label styling (match others)
8. **Email Capture:** Fix container max-width (4xl, not 2xl)
9. **Paid Blueprint:** Consider centering content (currently bottom-aligned)

### 🟢 Low Priority (Optional)
10. **Background Images:** Consider using same image across all pages
11. **Email Capture:** Match label tracking (0.2em, not 0.3em)

---

## 📝 Files to Update

1. `/components/sselfie/landing-page-new.tsx` - Add dark overlay
2. `/components/blueprint/blueprint-email-capture.tsx` - Fix all inconsistencies
3. `/components/paid-blueprint/paid-blueprint-landing.tsx` - Consider centering content (optional)

---

**Next Step:** Create standardized hero component or fix inconsistencies in individual files.
