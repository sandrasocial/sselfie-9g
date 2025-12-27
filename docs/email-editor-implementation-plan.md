# WYSIWYG Email Editor Implementation Plan

## Recommendation: GrapesJS Email Builder

**Why GrapesJS:**
- ✅ Free and open source (no license fees)
- ✅ Built-in email builder mode (handles table layouts, inline styles)
- ✅ React-compatible
- ✅ Preserves email client compatibility
- ✅ Highly customizable (can match SSELFIE brand)
- ✅ User-friendly drag-and-drop interface

**Alternative:** Unlayer (commercial, ~$49-99/month) - more polished but requires paid license

## Implementation Approach

### Phase 1: Add "Visual Edit" Button to EmailPreviewCard

Replace the "Edit HTML" flow with a "Visual Edit" button that opens GrapesJS editor.

### Phase 2: Integrate GrapesJS

1. Install GrapesJS:
   ```bash
   npm install grapesjs grapesjs-preset-newsletter
   ```

2. Create `components/admin/email-visual-editor.tsx`:
   - Wrapper component for GrapesJS
   - Loads existing HTML
   - Configured for email editing (table layouts, inline styles)
   - SSELFIE brand presets (colors, fonts, buttons)

3. Update EmailPreviewCard:
   - Add "Visual Edit" button (replaces "Edit HTML" for non-technical users)
   - Opens modal/dialog with GrapesJS editor
   - On save, calls `onManualEdit` with updated HTML

### Phase 3: Configure GrapesJS for SSELFIE

- Pre-configure SSELFIE colors (#1c1917, #fafaf9, etc.)
- Pre-configure fonts (Times New Roman, system fonts)
- Pre-configure button styles
- Ensure output maintains table-based layout
- Ensure inline styles are preserved

## User Experience Flow

```
Email Preview Card
  ↓
Click "Visual Edit" button (new button, more prominent than "Edit HTML")
  ↓
Modal opens with GrapesJS editor
  ↓
User can:
  - Click text to edit it directly
  - Select text to change color, font, size
  - Click buttons/images to edit them
  - Add/remove links
  - Change colors via color picker
  - Drag and drop elements (if needed)
  ↓
Click "Save Changes"
  ↓
Preview updates immediately
  ↓
Edited HTML sent to Alex for refinement (optional)

```

## Quick Win Option (Simpler)

If full GrapesJS integration is too complex initially, we could:

1. **Enhanced "Edit" button prompts**: Make the current "Edit" button smarter by adding common edit options:
   - "Change text color to..."
   - "Add a link to..."
   - "Change button text to..."
   - "Make text larger/smaller"

2. **Preset edit buttons** on the card:
   - "Change Colors" → Opens color picker, sends to Alex
   - "Add Link" → Link dialog, sends to Alex
   - "Edit Text" → Text edit, sends to Alex

This would be faster to implement but less powerful than a full WYSIWYG editor.

## Recommendation

**Start with Enhanced Edit prompts** (Quick Win) to improve UX immediately, then plan GrapesJS integration for full visual editing capability.

Would you like me to:
1. Implement the enhanced edit prompts (faster, simpler)
2. Start GrapesJS integration (full WYSIWYG, more work)
3. Show you both options so you can choose?

