# Image Loading Performance Audit

**Date:** January 2025  
**Status:** ⚠️ NEEDS OPTIMIZATION

## Summary

Audited all image upload and gallery modals in Maya screen and Feed Planner screen. Found several performance issues that are causing slow image loading.

## Components Audited

### 1. **ImageGalleryModal** (`components/sselfie/image-gallery-modal.tsx`)
**Used in:** Maya screen, Feed Planner, Concept Cards

**Current Implementation:**
- ✅ Has pagination (LIMIT = 100)
- ✅ Uses `loading="lazy"` on images
- ✅ Has `getOptimizedImageUrl()` function for Vercel Blob URLs
- ✅ Uses intersection observer for infinite scroll
- ⚠️ **ISSUE:** Only optimizes Vercel Blob URLs, other URLs load full-size
- ⚠️ **ISSUE:** Thumbnail size is 400px (could be smaller for grid view)
- ⚠️ **ISSUE:** Quality is 75% (could be lower for thumbnails)

**Optimization Applied:**
```typescript
getOptimizedImageUrl(image.image_url, 400, 75) // 400px width, 75% quality
```

### 2. **ImageLibraryModal** (`components/sselfie/pro-mode/ImageLibraryModal.tsx`)
**Used in:** Maya Pro Mode

**Current Implementation:**
- ✅ Uses `loading="lazy"` on images
- ❌ **CRITICAL ISSUE:** No image optimization - loads full-size images
- ❌ **ISSUE:** No thumbnail generation
- ❌ **ISSUE:** All images load immediately (no pagination)

**Code:**
```typescript
<img
  src={imageUrl}  // ❌ Full-size image, no optimization
  alt={`${title} ${index + 1}`}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

### 3. **ImageUploadFlow** (`components/sselfie/pro-mode/ImageUploadFlow.tsx`)
**Used in:** Maya Pro Mode upload flow

**Current Implementation:**
- ✅ Uses `loading="lazy"` on images
- ❌ **CRITICAL ISSUE:** No image optimization - loads full-size images
- ❌ **ISSUE:** No thumbnail generation

**Code:**
```typescript
<img
  src={imageUrl || "/placeholder.svg"}  // ❌ Full-size image, no optimization
  alt={`${category} ${index + 1}`}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

### 4. **FeedGallerySelector** (`components/feed-planner/feed-gallery-selector.tsx`)
**Used in:** Feed Planner screen

**Current Implementation:**
- ⚠️ **NEEDS VERIFICATION:** Need to check if optimization is applied

## Performance Issues Identified

### 🔴 Critical Issues

1. **ImageLibraryModal - No Optimization**
   - Loads full-size images (potentially 2-5MB each)
   - Grid shows 2-5 columns, so 10-25 full-size images load at once
   - **Impact:** Very slow initial load, high bandwidth usage

2. **ImageUploadFlow - No Optimization**
   - Loads full-size images in thumbnails
   - Multiple categories displayed simultaneously
   - **Impact:** Slow loading when viewing uploaded images

3. **ImageGalleryModal - Suboptimal Thumbnail Size**
   - Uses 400px width thumbnails (could be 200-300px for grid)
   - 75% quality (could be 60-70% for thumbnails)
   - **Impact:** Larger file sizes than necessary

### ⚠️ Medium Issues

4. **No Progressive Loading**
   - All images in viewport load simultaneously
   - No blur-up placeholder or skeleton loading
   - **Impact:** Perceived slowness

5. **No Image Caching Strategy**
   - Images re-fetch on every modal open
   - No browser cache headers optimization
   - **Impact:** Repeated slow loads

6. **Large Initial Batch**
   - ImageGalleryModal loads 100 images initially
   - Could start with 20-30 and load more on scroll
   - **Impact:** Slow initial render

## Recommended Optimizations

### Priority 1: Add Image Optimization to ImageLibraryModal

**Fix:**
```typescript
// Add getOptimizedImageUrl function or import from image-gallery-modal
function getOptimizedImageUrl(url: string, width?: number, quality?: number): string {
  if (!url) return "/placeholder.svg"
  
  if (url.includes("blob.vercel-storage.com") || url.includes("public.blob.vercel-storage.com")) {
    const params = new URLSearchParams()
    if (width) params.append("width", width.toString())
    if (quality) params.append("quality", quality.toString())
    return `${url}?${params.toString()}`
  }
  
  return url
}

// Update img tag:
<img
  src={getOptimizedImageUrl(imageUrl, 300, 70)}  // 300px width, 70% quality for thumbnails
  alt={`${title} ${index + 1}`}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

### Priority 2: Add Image Optimization to ImageUploadFlow

**Fix:** Same as above - add `getOptimizedImageUrl()` and use it for all image URLs.

### Priority 3: Optimize ImageGalleryModal Thumbnails

**Fix:**
```typescript
// Reduce thumbnail size and quality for grid view
getOptimizedImageUrl(image.image_url, 300, 70)  // Instead of 400, 75
```

### Priority 4: Reduce Initial Load Batch

**Fix:**
```typescript
// In ImageGalleryModal
const LIMIT = 30  // Instead of 100 - load more on scroll
```

### Priority 5: Add Progressive Loading

**Fix:**
- Add blur-up placeholders or skeleton loaders
- Use Next.js Image component with blur placeholder (if using Next.js)
- Or add low-quality placeholder that loads first

### Priority 6: Add Image Caching

**Fix:**
- Ensure API returns proper cache headers
- Use service worker for offline caching
- Implement browser cache for optimized URLs

## Expected Performance Improvements

| Optimization | Current | Optimized | Improvement |
|-------------|---------|-----------|-------------|
| ImageLibraryModal (10 images) | ~20-50MB | ~2-5MB | **80-90% reduction** |
| ImageUploadFlow (15 images) | ~30-75MB | ~3-7MB | **80-90% reduction** |
| ImageGalleryModal (100 images) | ~40-100MB | ~10-25MB | **60-75% reduction** |
| Initial Load Time | 5-15s | 1-3s | **70-80% faster** |

## Implementation Priority

1. **🔴 CRITICAL:** Add optimization to ImageLibraryModal (biggest impact)
2. **🔴 CRITICAL:** Add optimization to ImageUploadFlow (biggest impact)
3. **🟡 HIGH:** Optimize ImageGalleryModal thumbnails
4. **🟡 HIGH:** Reduce initial batch size
5. **🟢 MEDIUM:** Add progressive loading
6. **🟢 MEDIUM:** Improve caching

## Files to Modify

1. `components/sselfie/pro-mode/ImageLibraryModal.tsx` - Add optimization
2. `components/sselfie/pro-mode/ImageUploadFlow.tsx` - Add optimization
3. `components/sselfie/image-gallery-modal.tsx` - Improve thumbnail size/quality
4. `components/feed-planner/feed-gallery-selector.tsx` - Verify and add optimization if missing

## Notes

- Vercel Blob Storage supports automatic image optimization via query parameters
- Other image sources (if any) may need different optimization strategies
- Consider using Next.js Image component for automatic optimization (if migrating to Next.js)
- Test on mobile devices - performance impact is more noticeable on slower connections

