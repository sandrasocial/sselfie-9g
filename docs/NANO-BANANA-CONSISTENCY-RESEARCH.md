# Nano Banana Consistency Research

**Date:** January 2025  
**Research Topic:** How Nano Banana maintains consistency across multiple image variations

---

## Key Findings

### 1. **Explicit Instructions for What to Preserve vs Change**

Nano Banana works best when you're **VERY explicit** about what stays the same and what changes:

**Example Format:**
```
"Keep [specific elements] exactly the same. Change only [specific elements]."
```

**Best Practice:**
- "Keep face identity, hairstyle, and body proportions consistent in every image."
- "Outfit stays the same: [describe outfit]"
- "Keep everything else in the image exactly the same, preserving the original style, lighting, and composition."
- "Change only the car color to red" (ensures other aspects remain unchanged)

### 2. **Reference Images for Identity Locking**

- Nano Banana Pro supports up to 14 reference images
- Use reference images to "lock" character identity
- Explicitly instruct: "Keep the person's facial features exactly the same as Image 1"
- Reference images act as anchors for maintaining consistency

### 3. **Consistent Prompt Tokens/Phrases**

- Use the **SAME descriptive phrases** across all prompts
- Example: If you say "sharp blue eyes" and "scar on the left cheek" in prompt 1, use these exact phrases in all prompts
- Same tokens = consistent character representation

### 4. **Detailed Character Descriptions**

Start with comprehensive descriptions including:
- Age, ethnicity, facial features
- Hairstyle, eye color, skin tone
- Distinguishing marks
- Clothing details (fabric, colors, styles)

### 5. **Structured Prompt Format**

**Best Practice Structure:**
```
1. Character description (same across all)
2. Outfit description (same across all)
3. Scene/location (same across all)
4. Lighting (same across all)
5. What changes: pose, angle, expression, action
```

**Example:**
```
"Create 8 images of the same person. 
Keep face identity, hairstyle, and body proportions consistent in every image. 
Outfit stays the same: [describe outfit]. 
Scene: [describe scene - same for all]
Lighting: [describe lighting - same for all]
Produce 8 angles: front, 3/4 left, 3/4 right, profile left, profile right, back, seated pose, action pose."
```

### 6. **Specific Elements to Modify**

When creating variations, clearly specify:
- **What to change**: Expression, action, pose, angle
- **What to preserve**: Face, outfit, hairstyle, scene, lighting

**Example:**
```
"Change only their expression to look excited and surprised."
"Change only the navy blue uniform jacket to a white, formal dress uniform."
"Place the person into a bustling, futuristic cityscape at night." (changes background)
```

### 7. **Seed Values (Optional)**

- Setting a specific seed number can help maintain consistency
- Vary only minor elements while keeping the seed the same

---

## Recommendations for Our Use Case (6 Concept Cards for Animation)

### Current Approach Issues:
1. ❌ Not explicit enough about what to preserve
2. ❌ Not explicit enough about what to change
3. ❌ Variations don't use the same descriptive phrases from guide prompt
4. ❌ Structure isn't optimized for Nano Banana

### Recommended Prompt Structure for Variations:

**Format:**
```
[Image Reference] + 
[Same Outfit - EXACT description from guide prompt] + 
[Same Hair - EXACT description from guide prompt] + 
[Same Scene - EXACT description from guide prompt] + 
[Same Lighting - EXACT description from guide prompt] + 
[Only Change: New pose, new action, new angle, new expression] + 
[Camera specs - same from guide prompt]
```

### Key Principles:

1. **Use EXACT same phrases** from guide prompt for preserved elements
2. **Be EXPLICIT**: "Keep [outfit] exactly the same", "Keep [scene] exactly the same"
3. **Only vary**: pose, action, angle, expression
4. **Preserve everything else**: outfit, hair, scene, lighting, camera specs, fabric details

---

## Example: Correct Variation Structure

**Guide Prompt (Concept 1):**
```
Woman, maintaining exactly the characteristics of the woman in image 1 (face, body, skin tone, hair and visual identity), without copying the photo. 
Wearing couture mini red dress with structured bow, long black satin gloves, heels. 
Standing with straight elegant posture, sophisticated expression. 
Interior setting with illuminated white tree and presents. 
Sophisticated cinematic lighting. 
Professional photography, 85mm lens, f/2.0 depth of field.
```

**Variation (Concept 2) - CORRECT:**
```
Woman, maintaining exactly the characteristics of the woman in image 1 (face, body, skin tone, hair and visual identity), without copying the photo. 
Wearing couture mini red dress with structured bow, long black satin gloves, heels. [SAME - EXACT]
Interior setting with illuminated white tree and presents. [SAME - EXACT]
Sophisticated cinematic lighting. [SAME - EXACT]
Standing, adjusting hair, front view, gentle smile. [CHANGE - NEW POSE/ACTION]
Professional photography, 85mm lens, f/2.0 depth of field. [SAME - EXACT]
```

**Variation (Concept 2) - WRONG:**
```
Woman, maintaining exactly the characteristics of the woman in image 1...
Wearing elegant red dress... [CHANGED - lost "couture mini", "structured bow", "satin gloves"]
In cozy living room... [CHANGED - different scene]
Warm golden lighting... [CHANGED - different lighting]
Standing, adjusting hair... [OK - this should change]
```

---

## Implementation Changes Needed

1. **Extract and preserve EXACT phrases** from guide prompt (not paraphrased)
2. **Add explicit preservation instructions** in variation prompts
3. **Structure variations clearly**: Same elements first, then changed elements
4. **Use consistent tokens** across all variations

---

## Sources

1. https://www.nenobanana.com/blogs/how-nano-banana-maintains-character-consistency-across-edits
2. https://dev.to/googleai/nano-banana-pro-prompting-guide-strategies-1h9n
3. https://nanobananaz.com/consistent-characters-with-nano-banana/
4. https://flux-ai.io/blog/detail/Nano-Banana-Pro-Guide-10-Best-Image-Prompts-for-Expert-Use-Cases-551f2895890a
5. https://chilledsites.com/learn/ai/nano-banana-advanced/
6. https://www.cursor-ide.com/blog/nano-banana-best-prompts
7. https://superprompt.com/blog/google-nano-banana-ai-image-generation-complete-guide























