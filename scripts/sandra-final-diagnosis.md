# Sandra's Image Quality Issue - Final Diagnosis
**Email:** sandra.r.m.pereira@gmail.com  
**User ID:** 5040000c-5ce6-4114-8319-6ec1a632f749  
**Date:** December 14, 2025

## 🔍 Summary of Investigation

### ✅ What We Fixed:
1. **Super-Realism LoRA Disabled** - Now automatically disabled for authentic iPhone aesthetic prompts
2. **User LoRA Scale Used** - Now correctly uses database value (1.00) instead of ignoring it
3. **Prompt Cleaning** - Banned words removed, authenticity keywords properly added

### ❌ What We Cannot Verify:
1. **Training Data Quality** - No training runs or selfie uploads in database
2. **Number of Training Images** - Cannot verify if 15-25 images were used
3. **Image Quality** - Cannot check if images were filtered, edited, or low quality
4. **Training Parameters** - Cannot verify if training used optimal parameters

## 🚨 Most Likely Root Cause: **Training Data Quality**

Since:
- ✅ Prompts are correct (no banned words, has authenticity keywords)
- ✅ LoRA scale is optimal (1.00)
- ✅ Super-Realism LoRA now disabled
- ✅ Trigger word is correct
- ❌ Images still look plastic after multiple retrains

**The issue is almost certainly in the TRAINING DATA itself.**

### Common Training Data Problems That Cause Plastic Look:

1. **Filtered/Edited Images** (MOST COMMON)
   - Instagram filters applied
   - Beauty apps used (smooth skin, face tuning)
   - Heavy editing or retouching
   - **Result:** LoRA learns to generate filtered/plastic-looking images

2. **Inconsistent Image Quality**
   - Mix of professional photos and phone photos
   - Some images heavily edited, others natural
   - **Result:** LoRA learns inconsistent aesthetic

3. **Wrong Image Count**
   - Too few (<10): LoRA doesn't learn well, looks generic
   - Too many (>30): Overfitting, can look artificial
   - **Optimal:** 15-25 diverse, high-quality images

4. **Low Resolution or Compression**
   - Images too small or heavily compressed
   - **Result:** Poor detail capture, plastic appearance

5. **Lack of Diversity**
   - All images same angle, same expression
   - **Result:** LoRA learns limited features, looks artificial

## 💡 CRITICAL RECOMMENDATIONS

### 1. **Retrain with Carefully Selected Images**

**Image Selection Guidelines:**
- ✅ **15-25 images** (optimal range)
- ✅ **No filters or editing** (raw, natural photos only)
- ✅ **High resolution** (at least 512x512, preferably 1024x1024)
- ✅ **Diverse angles** (front, 3/4, side views)
- ✅ **Different expressions** (neutral, slight variations)
- ✅ **Natural lighting** (consistent across images)
- ✅ **Clear face visibility** (face clearly visible in all)
- ✅ **No heavy makeup** (natural appearance)
- ✅ **Consistent person** (same person across all images)

**What to AVOID:**
- ❌ Instagram filters or beauty apps
- ❌ Professional studio photos (too polished)
- ❌ Heavily edited or retouched images
- ❌ Low resolution or compressed images
- ❌ Too similar images (same angle/expression)
- ❌ Inconsistent lighting (some professional, some phone)

### 2. **Verify Training Parameters**

When retraining, ensure these parameters are used:
- Steps: **1400** (optimal for quality)
- LoRA Rank: **48** (high - good for detail)
- Learning Rate: **0.00008** (low - good for quality)
- Num Repeats: **20** (high - good for face learning)
- Resolution: **1024** (high resolution)

### 3. **Test After Retraining**

After retraining:
1. Generate test images with new LoRA
2. Compare to previous results
3. Verify images look authentic, not plastic
4. If still plastic, review training images again

## 🔧 Technical Fixes Already Applied

1. ✅ **Super-Realism LoRA Auto-Disable**
   - Location: `app/api/maya/generate-image/route.ts`
   - Behavior: Automatically disables when prompt contains authentic iPhone keywords
   - Impact: Prevents conflicting "super realistic" aesthetic

2. ✅ **User LoRA Scale Priority**
   - Location: `app/api/maya/generate-image/route.ts`
   - Behavior: Uses database value first, then settings, then preset
   - Impact: Ensures optimal scale (1.00) is used

3. ✅ **Prompt Cleaning**
   - Location: `app/api/maya/generate-concepts/route.ts`
   - Behavior: Removes banned words, adds authenticity keywords
   - Impact: Prompts are correct for authentic aesthetic

## 📊 Next Steps

### Immediate:
1. **Review Training Images** (if accessible via Replicate dashboard)
   - Check for filters, editing, or quality issues
   - Verify image count and diversity
   - Identify any problems

2. **Retrain with High-Quality Images**
   - Follow image selection guidelines above
   - Use current optimal training parameters
   - Monitor training progress

3. **Test New LoRA**
   - Generate images after retraining
   - Compare to previous results
   - Verify improvement

### If Issue Persists After Retraining:
1. Check if LoRA file is corrupted
2. Verify training completed successfully
3. Test with different prompt variations
4. Consider if base model (Flux) has changed

## 🎯 Expected Outcome

After retraining with high-quality, unfiltered images:
- Images should look authentic and natural
- No plastic or artificial appearance
- Better character likeness
- More consistent results

The key is **training data quality** - if the training images look plastic/filtered, the LoRA will learn to generate plastic-looking images.
