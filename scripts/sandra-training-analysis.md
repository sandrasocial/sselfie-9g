# Sandra's Training Data & LoRA Analysis
**Email:** sandra.r.m.pereira@gmail.com  
**User ID:** 5040000c-5ce6-4114-8319-6ec1a632f749  
**Date:** December 14, 2025

## 🔍 Current Status

### ✅ What We Know:
1. **Model Exists:**
   - Replicate Model: `sandrasocial/user-5040000c-selfie-lora`
   - Version: `a6918e48c02f7ec453ee4c18cd3ddb0f921421677eae1f68dd9cc83230cc55c5`
   - LoRA URL: `https://replicate.delivery/xezq/fesc2oMlXVrP5EeoOS4WRSbHi8Y0Mxzy0Qy58fCAVpxcHOMXB/flux-lora.tar`
   - Trigger Word: `user5040000c`
   - LoRA Scale: `1.00` (optimal)
   - Status: `completed`
   - Last Updated: December 14, 2025

2. **Training Parameters (Current System Defaults):**
   - Steps: 1400 (optimal for quality)
   - LoRA Rank: 48 (high - good for face detail)
   - Learning Rate: 0.00008 (low - good for quality)
   - Num Repeats: 20 (high - good for face learning)
   - Resolution: 1024
   - Network Alpha: 48 (matches rank)

### ❌ What We CANNOT Verify:
1. **Training Data:**
   - ❌ No training runs in database
   - ❌ No selfie uploads in database
   - ❌ Cannot verify number of images used
   - ❌ Cannot verify image quality
   - ❌ Cannot verify image diversity

2. **Training History:**
   - User has retrained multiple times (per user report)
   - No historical training data available
   - Cannot compare training runs

## 🚨 Potential Root Causes of Plastic Look

### 1. **Training Image Quality Issues** (MOST LIKELY)
**Common problems:**
- Images were heavily filtered/edited (Instagram filters, beauty apps)
- Images were low resolution or heavily compressed
- Images had inconsistent lighting (some professional, some phone)
- Images were too similar (same angle, same expression)
- Images had artificial enhancements (smooth skin filters)

**Impact:** If training images look "plastic" or "fake", the LoRA will learn to generate plastic-looking images.

**How to Check:**
- Review the actual training images used (if accessible)
- Check if images have filters or heavy editing
- Verify image resolution and quality
- Check image diversity (angles, expressions, lighting)

### 2. **Training Image Count Issues**
**Optimal:** 15-25 high-quality, diverse images
- **Too Few (<10):** LoRA won't learn features well, may look generic
- **Too Many (>30):** May cause overfitting, can look artificial
- **Just Right (15-25):** Best balance for quality and diversity

**Impact:** Wrong image count can cause poor training quality.

### 3. **LoRA File Corruption or Low Quality**
**Possible issues:**
- LoRA file might be corrupted
- LoRA file might be from a failed training run
- LoRA file size might be too small (indicates poor training)

**How to Check:**
- Verify LoRA file is accessible and not corrupted
- Check file size (should be ~50-200MB for a good LoRA)
- Try downloading and inspecting the file

### 4. **Training Parameter Issues** (LESS LIKELY - Current params look good)
**Current parameters are optimal:**
- ✅ Steps: 1400 (good)
- ✅ LoRA Rank: 48 (high - good for detail)
- ✅ Learning Rate: 0.00008 (low - good for quality)
- ✅ Num Repeats: 20 (high - good for face learning)

**However, if training was done with OLD parameters:**
- ❌ Lower LoRA rank (< 32) = less detail capture
- ❌ Higher learning rate (> 0.0001) = can cause overfitting/plastic look
- ❌ Fewer steps (< 1000) = incomplete training
- ❌ Lower num_repeats (< 15) = insufficient face learning

### 5. **Prompt Issues** (ALREADY FIXED)
- ✅ Super-Realism LoRA now disabled for authentic photos
- ✅ User's LoRA scale now used correctly
- ✅ Prompts include authenticity keywords

## 💡 Recommendations

### IMMEDIATE ACTIONS:

1. **Check Training Images (If Possible):**
   - Access Replicate dashboard: https://replicate.com/sandrasocial/user-5040000c-selfie-lora
   - Review the training images used
   - Check for filters, editing, or quality issues
   - Verify image count and diversity

2. **Verify LoRA File:**
   - Check if LoRA URL is accessible
   - Download and verify file size
   - Test if file is corrupted

3. **Retrain with High-Quality Images:**
   If retraining is needed, ensure:
   - **15-25 high-quality images** (not 5, not 50)
   - **No filters or heavy editing** (raw, natural photos)
   - **Diverse angles and expressions** (front, side, different expressions)
   - **Consistent lighting** (all natural or all similar)
   - **High resolution** (at least 512x512, preferably 1024x1024)
   - **Clear face visibility** (face clearly visible in all images)
   - **No heavy makeup or editing** (natural appearance)

### TRAINING IMAGE GUIDELINES:

**✅ GOOD Training Images:**
- Natural, unedited photos
- Clear face visibility
- Diverse angles (front, 3/4, side)
- Different expressions (neutral, slight smile)
- Natural lighting (consistent across images)
- High resolution (1024x1024 preferred)
- No filters or beauty apps
- No heavy makeup that changes appearance

**❌ BAD Training Images:**
- Heavily filtered (Instagram filters, beauty apps)
- Low resolution or compressed
- Professional studio photos (too polished)
- Inconsistent lighting (some professional, some phone)
- Too similar (same angle, same expression)
- Heavy editing or retouching
- Artificial enhancements (smooth skin filters)

### RETRAINING CHECKLIST:

If retraining is necessary:
1. ✅ Collect 15-25 high-quality, diverse selfies
2. ✅ Ensure no filters or heavy editing
3. ✅ Verify all images show clear face
4. ✅ Check image resolution (at least 512x512)
5. ✅ Ensure consistent person across all images
6. ✅ Use current training parameters (steps: 1400, rank: 48, etc.)
7. ✅ Monitor training progress
8. ✅ Test with new LoRA after training completes

## 🔧 Technical Fixes Applied

1. ✅ **Super-Realism LoRA Disabled** - Now automatically disabled for authentic iPhone aesthetic
2. ✅ **User LoRA Scale Used** - Now uses database value instead of ignoring it
3. ✅ **Prompt Cleaning** - Banned words removed, authenticity keywords added

## 📊 Next Steps

1. **Verify Training Images:**
   - Check Replicate dashboard for training details
   - Review actual images used for training
   - Identify quality issues if any

2. **Test Current LoRA:**
   - Generate new images with fixes applied
   - Compare to previous results
   - If still plastic, likely training data issue

3. **If Still Plastic After Fixes:**
   - Retrain with carefully selected high-quality images
   - Follow training image guidelines above
   - Use current optimal training parameters

4. **Monitor Results:**
   - Track image quality after fixes
   - Compare before/after
   - Adjust if needed
