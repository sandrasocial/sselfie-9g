# Retraining Root Cause Analysis - Research Findings

## 🔍 Research Summary

Based on web research, I've identified **critical issues** that explain why retraining causes quality degradation and "plastic skin" appearance.

---

## 🔴 **CRITICAL FINDING #1: Multiple Versions Can Cause Conflicts**

### Research Finding:
> "When deploying multiple versions of the same LoRA model under identical model names, several quality issues can arise. Conflicting LoRA adapters can lead to degraded quality or unexpected results."

### What This Means:
- **Replicate stores ALL versions** of a model (as seen in your screenshot: `4e0de78d`, `686b79b2`, `6fb3e8e6`, etc.)
- **The app uses the latest version** (correct)
- **BUT:** If old versions have conflicting training data, they can interfere
- **Solution:** Old versions should be deleted or archived

### Impact on Your App:
- User retrains multiple times → Multiple versions on Replicate
- Each version might have different training data quality
- App uses latest version, but old versions still exist
- **This is likely NOT the main issue** since app uses latest version correctly

---

## 🔴 **CRITICAL FINDING #2: Overfitting Causes "Plastic Skin"**

### Research Finding:
> "Plastic-like, artificial skin textures are a common challenge with Flux LoRA models. This is often caused by overfitting, where the model memorizes training data instead of learning generalizable features."

### Your Current Training Parameters (VERY AGGRESSIVE):
```typescript
steps: 1400,
lora_rank: 48,        // ⚠️ VERY HIGH (recommended: 8-16 for small datasets)
num_repeats: 20,      // ⚠️ VERY HIGH (with fewer images = overfitting)
learning_rate: 0.00008,
```

### Research Recommendations:
- **LoRA Rank:** 8-16 for small datasets (you're using 48!)
- **Training Loss:** If drops below 0.2 = overfitting (need to monitor)
- **Num Repeats:** Should scale with dataset size (you use fixed 20)
- **Dropout:** 0.1 recommended (you have 0.15, which is good)

### Why This Causes Plastic Skin:
1. **High LoRA Rank (48)** → Model learns too many specific features
2. **High Num Repeats (20)** → With fewer images, model sees same images too many times
3. **Result:** Model memorizes training images → Loses generalization → Produces "plastic" look

---

## 🔴 **CRITICAL FINDING #3: Retraining with Fewer Images = Overfitting**

### Research Finding:
> "Retraining with fewer images than original training can cause overfitting. The model needs diverse, high-quality data to generalize properly."

### Your Current Flow:
1. User trains with 20 images → Good quality
2. User retrains with only 5-10 images → **Overfitting!**
3. Model memorizes the few images → Plastic appearance

### Research Solution:
- **Minimum 15-25 images** for good quality
- **Diverse angles, lighting, expressions**
- **High-quality, unfiltered images**

---

## 🔴 **CRITICAL FINDING #4: Training Parameters Too Aggressive for Retraining**

### The Problem:
Your adaptive parameters help, but the **base parameters are still too aggressive**:

```typescript
// Current (even with adaptive):
< 10 images: lora_rank: 32, num_repeats: 10-15
10-15 images: lora_rank: 40, num_repeats: 15-20
15+ images: lora_rank: 48, num_repeats: 20  // Still too high!
```

### Research Recommendations:
- **LoRA Rank:** Should be 8-16 for most cases (not 48!)
- **Num Repeats:** Should be 5-10 for 15-25 images (not 20!)
- **Steps:** 1000-1200 is usually enough (1400 might be overkill)

---

## 🔴 **CRITICAL FINDING #5: Guidance Scale Can Cause Plastic Look**

### Research Finding:
> "Higher guidance values can lead to an unnatural 'plastic' appearance. Lowering the guidance closer to 0 can bring out lifelike textures."

### Your Current Settings:
- Using quality presets with various guidance scales
- Some presets might use high guidance → Plastic look

### Solution:
- Lower guidance scale for more natural results
- Use guidance around 3.5 or lower for realistic skin

---

## 🎯 **Root Causes Identified**

### Primary Causes (Most Likely):

1. **🔴 Overfitting from Aggressive Parameters**
   - LoRA rank 48 is TOO HIGH
   - Num repeats 20 is TOO HIGH
   - With fewer images on retraining = severe overfitting

2. **🔴 Retraining with Too Few Images**
   - Users retrain with 5-10 images
   - Model memorizes these few images
   - Loses ability to generalize

3. **🔴 High Guidance Scale**
   - Some quality presets use high guidance
   - Causes plastic/artificial appearance

### Secondary Causes:

4. **🟡 Multiple Versions (Less Likely)**
   - Old versions exist but app uses latest (correct)
   - Might cause confusion but not main issue

5. **🟡 No Regularization**
   - Missing dropout in some cases
   - Missing weight decay

---

## ✅ **Recommended Fixes**

### 1. **Reduce LoRA Rank (CRITICAL)**
```typescript
// Current: 48 (TOO HIGH)
// Recommended: 16-24 for most cases
lora_rank: 16,  // Much better for generalization
network_alpha: 16,  // Match rank
```

### 2. **Reduce Num Repeats (CRITICAL)**
```typescript
// Current: 20 (TOO HIGH)
// Recommended: 5-10 for 15-25 images
num_repeats: 8,  // Better generalization
```

### 3. **Reduce Steps**
```typescript
// Current: 1400
// Recommended: 1000-1200
steps: 1000,
```

### 4. **Add Better Regularization**
```typescript
dropout: 0.1,  // Already have 0.15, which is good
weight_decay: 0.01,  // Add this
```

### 5. **Lower Guidance Scale for Realistic Skin**
```typescript
// In quality presets, use lower guidance for portraits
guidance_scale: 3.5,  // Instead of 5-7
```

### 6. **Delete Old Versions (Optional)**
- Add option to archive/delete old model versions on Replicate
- Keeps model list clean
- Prevents confusion

---

## 📊 **Comparison: Current vs Recommended**

| Parameter | Current | Recommended | Impact |
|-----------|---------|-------------|--------|
| LoRA Rank | 48 | 16-24 | 🔴 **CRITICAL** - Reduces overfitting |
| Num Repeats | 20 | 5-10 | 🔴 **CRITICAL** - Prevents memorization |
| Steps | 1400 | 1000-1200 | 🟡 Medium - Saves time, similar quality |
| Learning Rate | 0.00008 | 0.0001-0.0004 | 🟡 Medium - Faster convergence |
| Guidance Scale | 3.5-7 | 3.5 | 🟡 Medium - More natural skin |

---

## 🎯 **Action Plan**

### Immediate (High Priority):

1. **Reduce LoRA Rank to 16-24** (from 48)
2. **Reduce Num Repeats to 8-10** (from 20)
3. **Add weight decay** (0.01)
4. **Lower guidance scale** in portrait presets

### Medium Priority:

5. **Monitor training loss** - Stop if drops below 0.2
6. **Add early stopping** based on validation loss
7. **Improve image quality validation** - Warn if < 15 images

### Low Priority:

8. **Add version cleanup** - Option to delete old versions
9. **Add training metrics logging** - Track loss over time

---

## 🔬 **Testing Recommendations**

1. **Test with Lower Parameters:**
   - Retrain one user with: rank=16, repeats=8, steps=1000
   - Compare quality vs current parameters

2. **Test Guidance Scale:**
   - Generate images with guidance 3.5 vs 7
   - Compare skin realism

3. **Test Image Count:**
   - Retrain with 5 images vs 20 images
   - Compare overfitting indicators

---

## 📝 **Summary**

The **primary cause** of quality degradation and plastic skin is:

1. **Overfitting** from aggressive parameters (rank 48, repeats 20)
2. **Retraining with too few images** (5-10 instead of 15-25)
3. **High guidance scale** causing artificial appearance

**Multiple versions on Replicate are likely NOT the main issue** - the app correctly uses the latest version. However, cleaning up old versions is still a good practice.

**The fix:** Reduce LoRA rank to 16-24, reduce num_repeats to 8-10, and lower guidance scale for more natural results.
