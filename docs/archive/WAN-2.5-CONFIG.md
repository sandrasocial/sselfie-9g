# WAN-2.5 I2V Configuration Guide

## Overview

This guide explains the configuration options for WAN-2.5 I2V video generation in the SSELFIE app.

## Environment Variables

### `WAN_25_PROMPT_EXPANSION`

Controls whether WAN-2.5 should expand/optimize motion prompts.

**Options:**
- `false` (default) - Precise motion control, Maya's prompts are used as-is
- `true` - WAN-2.5 expands prompts for richer descriptions

**When to use:**
- **`false`** (recommended): When you want precise control over motion, better character consistency
- **`true`**: When you want richer, more detailed motion descriptions (may reduce precision)

**How to set:**
```bash
# In .env.local or Vercel environment variables
WAN_25_PROMPT_EXPANSION=false
```

## Current Settings

### Seed Variation
- **Type:** Controlled random (0-999999)
- **Purpose:** Balance character consistency with motion variety
- **Behavior:** Each video gets a unique seed for reproducibility while maintaining variety

### Resolution
- **Current:** 720p
- **Options:** 720p or 1080p
- **Recommendation:** 720p for faster processing, 1080p for premium content

### Duration
- **Current:** 5 seconds
- **Options:** 5 or 10 seconds
- **Recommendation:** 5 seconds is optimal for Instagram B-roll

### Negative Prompt
Pre-configured to prevent:
- Identity drift
- Warping/morphing
- Unnatural motion
- Artifacts

## Testing Prompt Expansion

To test the impact of prompt expansion:

1. **Generate videos with expansion disabled (default):**
   ```bash
   WAN_25_PROMPT_EXPANSION=false
   ```
   - More precise motion control
   - Better adherence to Maya's motion prompts
   - Potentially more consistent character appearance

2. **Generate videos with expansion enabled:**
   ```bash
   WAN_25_PROMPT_EXPANSION=true
   ```
   - Richer motion descriptions
   - More varied camera movements
   - Potentially less precise control

3. **Compare results:**
   - Character consistency
   - Motion accuracy
   - Overall video quality

## Character Consistency Notes

**Important:** WAN-2.5 does NOT support LoRA weights natively.

Character consistency is achieved through:
1. **High-quality input images** - Use consistent, high-resolution images
2. **Precise motion prompts** - Maya's sophisticated prompt generation
3. **Controlled seeds** - Reproducible character appearance
4. **Negative prompts** - Prevents identity drift

## Best Practices

1. **Use high-quality input images** - The better the input, the better the output
2. **Trust Maya's motion prompts** - They're optimized for WAN-2.5
3. **Monitor seed values** - Log seeds for reproducibility
4. **Test prompt expansion** - Find the setting that works best for your use case
5. **Use consistent image style** - Similar lighting, angles, and quality across images

## Troubleshooting

### Character Inconsistency
- Ensure input images are high quality and consistent
- Check that motion prompts are precise (prompt expansion disabled)
- Verify negative prompt includes "identity drift" prevention

### Motion Quality Issues
- Try disabling prompt expansion for more precise control
- Review Maya's motion prompt generation
- Check that motion prompts match the input image pose

### Video Quality
- Consider upgrading to 1080p for premium content
- Ensure input images are high resolution
- Check negative prompt settings


