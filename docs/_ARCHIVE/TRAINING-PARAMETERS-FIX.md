# Training Parameters Fix - Based on Research

## 🔴 **CRITICAL FINDINGS FROM RESEARCH**

### 1. **LoRA Rank 48 is TOO HIGH**
- **Research Recommendation:** 8-16 for small datasets, 16-24 for larger
- **Your Current:** 48
- **Impact:** Causes severe overfitting → Plastic skin appearance
- **Fix:** Reduced to 16 (base), scales down to 8 for <10 images

### 2. **Num Repeats 20 is TOO HIGH**
- **Research Recommendation:** 5-10 for 15-25 images
- **Your Current:** 20
- **Impact:** Model memorizes training data instead of learning → Overfitting
- **Fix:** Reduced to 8 (base), scales down to 5 for <10 images

### 3. **Steps 1400 Might Be Overkill**
- **Research Recommendation:** 1000-1200 is usually optimal
- **Your Current:** 1400
- **Impact:** Longer training time, potential overfitting
- **Fix:** Reduced to 1000 (base), scales down for smaller datasets

### 4. **Missing Weight Decay**
- **Research Recommendation:** Add weight_decay: 0.01 for regularization
- **Your Current:** Not included
- **Impact:** Less regularization → More overfitting
- **Fix:** Added weight_decay: 0.01

---

## ✅ **FIXES IMPLEMENTED**

### Updated Parameters:

| Parameter | Old | New | Reason |
|-----------|-----|-----|--------|
| **lora_rank** | 48 | 16 (base) | Research: 8-16 for small, 16-24 for large |
| **network_alpha** | 48 | 16 (base) | Must match lora_rank |
| **num_repeats** | 20 | 8 (base) | Research: 5-10 for 15-25 images |
| **steps** | 1400 | 1000 (base) | Research: 1000-1200 optimal |
| **learning_rate** | 0.00008 | 0.0001 | Slightly higher for better convergence |
| **weight_decay** | None | 0.01 | NEW: Regularization to prevent overfitting |

### Adaptive Scaling:

- **< 10 images:** rank=8, repeats=5-8, steps=800
- **10-15 images:** rank=12, repeats=6-9, steps=900
- **15-24 images:** rank=16, repeats=8, steps=1000 (optimal)
- **25+ images:** rank=24, repeats=10, steps=1000

---

## 🎯 **Expected Results**

After these fixes:

1. ✅ **Less Overfitting** - Lower rank prevents memorization
2. ✅ **More Natural Skin** - Reduced repeats = better generalization
3. ✅ **Better Quality on Retraining** - Adaptive parameters prevent degradation
4. ✅ **Faster Training** - Fewer steps = quicker completion

---

## ⚠️ **Important Notes**

### Multiple Versions on Replicate:
- **Research says:** Multiple versions can cause conflicts
- **Your situation:** App uses latest version (correct)
- **Recommendation:** Old versions don't need deletion (app handles correctly)
- **However:** Could add cleanup feature for organization

### Guidance Scale:
- **Current:** 3.5 (good)
- **Research:** Lower = more natural skin, but 3.5 is optimal balance
- **No change needed** - 3.5 is correct

---

## 📊 **Before vs After Comparison**

### Before (Causing Overfitting):
```typescript
lora_rank: 48        // TOO HIGH → Overfitting
num_repeats: 20      // TOO HIGH → Memorization
steps: 1400          // Might be overkill
weight_decay: none   // Missing regularization
```

### After (Research-Based):
```typescript
lora_rank: 16        // Optimal for generalization
num_repeats: 8       // Prevents memorization
steps: 1000          // Optimal range
weight_decay: 0.01   // Added regularization
```

---

## 🧪 **Testing Recommendations**

1. **Test with New Parameters:**
   - Retrain one user with new parameters
   - Compare quality vs old parameters
   - Check for plastic skin improvement

2. **Monitor Training Loss:**
   - If loss drops below 0.2 = still overfitting
   - May need to reduce parameters further

3. **Compare Image Quality:**
   - Generate images before/after parameter change
   - Check skin texture realism
   - Verify no quality loss

---

## 📝 **Summary**

The **root cause** of quality degradation and plastic skin is:

1. **Overfitting** from LoRA rank 48 (should be 16)
2. **Memorization** from num_repeats 20 (should be 8)
3. **Missing regularization** (now added weight_decay)

**Multiple versions on Replicate are NOT the issue** - the app correctly uses the latest version.

**The fix:** Reduced LoRA rank to 16, num_repeats to 8, and added weight_decay for regularization. This should significantly improve quality and reduce plastic skin appearance.
