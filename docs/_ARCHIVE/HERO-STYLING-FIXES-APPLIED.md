# Hero Styling Standardization - Applied Fixes

**Date:** 2026-01-09  
**Standard:** Paid Blueprint Hero (used as reference)

---

## ✅ Changes Applied

### 1. Homepage Hero (`/components/sselfie/landing-page-new.tsx`)

**Changes:**
- ✅ Added dark overlay: `rgba(0, 0, 0, 0.4)`
- ✅ Updated label styling to match Paid Blueprint:
  - `block mb-4 text-sm sm:text-base font-light tracking-[0.2em] uppercase text-white`
  - Added text shadow: `0 2px 10px rgba(0,0,0,0.3)`
- ✅ Updated H1 styling to match Paid Blueprint:
  - `text-3xl sm:text-5xl md:text-6xl lg:text-7xl`
  - `fontStyle: "normal"`, `fontWeight: 300`
  - Text shadow: `0 2px 20px rgba(0,0,0,0.3)`
- ✅ Updated description styling:
  - `text-base sm:text-lg md:text-xl`
  - Text shadow: `0 1px 5px rgba(0,0,0,0.3)`
- ✅ Updated button styles to match Paid Blueprint:
  - `bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px]`
- ✅ Updated container to match Paid Blueprint:
  - `max-w-4xl mx-auto text-center px-4 sm:px-6 pb-16 sm:pb-20 pt-20`
  - Content positioned at bottom: `items-end justify-center`

---

### 2. Free Blueprint Hero (`/app/blueprint/page-client.tsx`)

**Changes:**
- ✅ Updated container positioning to match Paid Blueprint:
  - Changed from `items-center justify-center` to `items-end justify-center`
  - Updated padding: `pb-16 sm:pb-20 pt-20`
- ✅ Updated button style to match Paid Blueprint:
  - `bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px]`
  - Removed: `hover:bg-black hover:text-white border border-white font-light shadow-xl`
- ✅ Updated section container:
  - Changed from `min-h-[calc(100vh-80px)]` to `min-h-screen`
  - Changed from `items-center` to `items-end`

---

### 3. Email Capture Hero (`/components/blueprint/blueprint-email-capture.tsx`)

**Major Changes:**
- ✅ Added dark overlay: `rgba(0, 0, 0, 0.4)` (was `bg-black/60`)
- ✅ Added gradient overlay: `radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)`
- ✅ Updated label styling to match Paid Blueprint:
  - Changed from `text-xs tracking-[0.3em] text-white/70` to `text-sm sm:text-base tracking-[0.2em] text-white`
  - Added text shadow: `0 2px 10px rgba(0,0,0,0.3)`
- ✅ Updated H1 styling to match Paid Blueprint:
  - Changed from `text-4xl sm:text-5xl md:text-6xl font-extralight` to `text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light`
  - Added `fontStyle: "normal"`, `fontWeight: 300`
  - Added text shadow: `0 2px 20px rgba(0,0,0,0.3)`
- ✅ Updated description styling:
  - Changed from `text-base sm:text-lg text-white/80` to `text-base sm:text-lg md:text-xl text-white`
  - Added text shadow: `0 1px 5px rgba(0,0,0,0.3)`
- ✅ Updated container:
  - Changed from `max-w-2xl` to `max-w-4xl`
  - Updated padding: `px-4 sm:px-6 pb-16 sm:pb-20 pt-20`
  - Content positioned at bottom: `items-end justify-center`
- ✅ Updated email capture form to match Paid Blueprint:
  - Changed from vertical stack (`space-y-4`) to horizontal layout (`flex flex-col sm:flex-row gap-3`)
  - Updated input styling to match Paid Blueprint:
    - `px-4 py-3 sm:py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20`
    - `placeholder:text-sm` (was `placeholder:text-xs`)
  - Updated button styling to match Paid Blueprint:
    - `bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100`
- ✅ Removed logo image (not in Paid Blueprint hero)
- ✅ Changed from `Input` component to native `input` elements

---

## 📋 Standardized Hero Structure (All Pages Now Match)

```tsx
<section className="relative min-h-screen flex items-end justify-center overflow-hidden" style={{ minHeight: "100dvh" }}>
  {/* Background Image */}
  <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url(...)", backgroundPosition: "50% 25%" }} />
  
  {/* Dark Overlay */}
  <div className="absolute inset-0" style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }} />
  
  {/* Gradient Overlay */}
  <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)" }} />
  
  {/* Hero Content - positioned at bottom */}
  <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 pb-16 sm:pb-20 pt-20 h-full flex flex-col items-end justify-center">
    {/* Label */}
    <span className="block mb-4 text-sm sm:text-base font-light tracking-[0.2em] uppercase text-white" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}>
      Label Text
    </span>
    
    {/* H1 */}
    <h1
      style={{
        fontFamily: "'Times New Roman', serif",
        fontStyle: "normal",
        fontWeight: 300,
        textShadow: "0 2px 20px rgba(0,0,0,0.3)",
      }}
      className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-4 sm:mb-6 text-white leading-[1.1] tracking-tight"
    >
      Headline
    </h1>
    
    {/* Description */}
    <p className="text-base sm:text-lg md:text-xl leading-relaxed mb-6 sm:mb-8 max-w-xl mx-auto text-white" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}>
      Description text
    </p>
    
    {/* Email Capture / CTA */}
    <form className="max-w-md mx-auto mb-6 w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <input className="flex-1 px-4 py-3 sm:py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 placeholder:text-sm focus:outline-none focus:border-white/40 focus:bg-white/15" />
        <button className="bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px] flex items-center justify-center whitespace-nowrap">
          Button Text
        </button>
      </div>
    </form>
  </div>
</section>
```

---

## ✅ Standardized Elements

### Typography
- **Label:** `text-sm sm:text-base font-light tracking-[0.2em] uppercase text-white` + text shadow
- **H1:** `text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-light` + `fontWeight: 300` + text shadow
- **Description:** `text-base sm:text-lg md:text-xl` + text shadow

### Overlays
- **Dark Overlay:** `rgba(0, 0, 0, 0.4)`
- **Gradient Overlay:** `radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)`

### Buttons
- **Primary Button:** `bg-white text-black px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 min-h-[44px]`

### Email Capture Inputs
- **Input Style:** `px-4 py-3 sm:py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 placeholder:text-sm`

### Container
- **Max Width:** `max-w-4xl`
- **Padding:** `px-4 sm:px-6 pb-16 sm:pb-20 pt-20`
- **Position:** `items-end justify-center` (content at bottom)

---

## 🎯 Result

All hero sections now have:
- ✅ Consistent typography (fonts, sizes, weights, shadows)
- ✅ Consistent overlays (dark + gradient)
- ✅ Consistent button styles
- ✅ Consistent email capture form styling
- ✅ Consistent content positioning (bottom-aligned)
- ✅ Consistent container sizing and padding

**All heroes now match the Paid Blueprint hero standard.**
