# Bulk Selection Best Practices (Mobile-First)

## How Professional Apps Handle Bulk Selection

### 1. **Instagram (Mobile)**
- ✅ **Long-press** on any image to enter selection mode
- ✅ **Tap to select/deselect** individual items
- ✅ **Top bar** shows count: "3 selected"
- ✅ **Select All** button in top bar
- ✅ **Action buttons** at bottom: "Delete", "Archive", "Share"
- ✅ **Exit button** (X) in top-left to cancel selection
- ✅ **Visual feedback**: Selected items have checkmark overlay

### 2. **Google Photos (Mobile)**
- ✅ **Long-press** to enter selection mode
- ✅ **Tap to toggle** selection
- ✅ **Top bar**: Count + "Select all" / "Deselect all"
- ✅ **Bottom action bar**: Delete, Share, Archive, Add to album
- ✅ **Swipe gestures** for quick actions
- ✅ **Visual**: Blue checkmark circle on selected items

### 3. **Apple Photos (iOS)**
- ✅ **Select button** in top-right to enter mode
- ✅ **Tap items** to select/deselect
- ✅ **Top bar**: "X selected" with Select All option
- ✅ **Bottom toolbar**: Delete, Share, Add to Album
- ✅ **Visual**: Blue checkmark on selected items

### 4. **Pinterest (Mobile)**
- ✅ **Long-press** to enter selection
- ✅ **Tap to select** multiple boards/pins
- ✅ **Top bar**: Selection count
- ✅ **Bottom actions**: Delete, Move, Copy
- ✅ **Visual**: Checkmark overlay

## Industry Standard Pattern (Mobile-First)

### **Entry Methods:**
1. **Long-press** on any item (most common)
2. **Select button** in toolbar (alternative)
3. **Long-press + drag** to select multiple (advanced)

### **UI Elements:**
1. **Top Bar:**
   - Selection count: "3 selected"
   - Select All / Deselect All toggle
   - Cancel/Exit button (X)

2. **Bottom Action Bar:**
   - Primary actions: Delete, Save, Share
   - Sticky at bottom (mobile-friendly)
   - Disabled when nothing selected

3. **Visual Indicators:**
   - Checkmark overlay on selected items
   - Slight darkening/overlay on selected
   - Number badge on selected items (optional)

### **Interaction:**
- **Tap item** = Toggle selection
- **Long-press** = Enter selection mode (if not already)
- **Swipe down** = Exit selection mode (optional)
- **Select All** = Select all visible items

## Recommendation for SSELFIE Gallery

### **Mobile-First Approach:**

1. **Entry:**
   - Long-press any image → Enter selection mode
   - OR: "Select" button in top toolbar

2. **Selection:**
   - Tap images to toggle selection
   - Visual: Checkmark overlay (white check on dark background)

3. **Top Bar (when in selection mode):**
   - Left: "Cancel" button (X)
   - Center: "3 selected" count
   - Right: "Select All" / "Deselect All" toggle

4. **Bottom Action Bar (sticky):**
   - "Delete" button (red, left)
   - "Save" button (primary, right)
   - Disabled state when 0 selected

5. **Exit:**
   - Tap "Cancel" button
   - OR: Tap outside selection area
   - OR: Swipe down gesture (optional)

### **Technical Implementation:**

```typescript
// State
const [selectionMode, setSelectionMode] = useState(false)
const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())

// Entry
const handleLongPress = () => {
  setSelectionMode(true)
  triggerHaptic("medium")
}

// Toggle selection
const toggleSelection = (imageId: string) => {
  const newSet = new Set(selectedImages)
  if (newSet.has(imageId)) {
    newSet.delete(imageId)
  } else {
    newSet.add(imageId)
  }
  setSelectedImages(newSet)
  triggerHaptic("light")
}

// Bulk actions
const bulkDelete = async () => {
  // Delete all selected images
}

const bulkSave = async () => {
  // Save all selected images (mark as saved)
}
```

### **UX Considerations:**
- ✅ **Haptic feedback** on selection toggle
- ✅ **Smooth animations** for checkmarks
- ✅ **Optimistic UI** (remove from list immediately)
- ✅ **Confirmation dialog** for bulk delete
- ✅ **Loading states** during bulk operations
- ✅ **Error handling** with retry option
