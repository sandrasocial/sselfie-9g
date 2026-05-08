-- Migration 56: Replace Transform presets with Edit Studio edit finishes
-- Run with: node -e "require('dotenv').config({path:'.env.local'}); const {neon}=require('@neondatabase/serverless'); const sql=neon(process.env.DATABASE_URL); sql\`...\`.then(console.log)"
-- Or paste each statement individually into the Neon console.

DELETE FROM transform_daily_prompts;

INSERT INTO transform_daily_prompts (prompt_date, title, prompt_text, style_notes) VALUES

('2026-01-01', 'Natural Clean Edit',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Improve the photo with a natural clean professional edit. Slightly brighten the face, balance exposure, soften harsh shadows, improve skin tone naturally, add subtle sharpness, clean color balance, and make the photo look polished but realistic. Keep skin texture natural. The result should look like a professional Lightroom edit, not an AI transformation.',
'Bright, clean, realistic everyday polish.'),

('2026-01-02', 'Soft Glow Edit',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a soft glow edit. Add a gentle diffused light quality to the photo. Smooth skin texture slightly while keeping it realistic. Brighten highlights softly. Reduce harsh shadows. Create a fresh, luminous, creator-ready finish. The result should look like a well-lit portrait, not an AI image.',
'Smooth light, soft skin, fresh creator finish.'),

('2026-01-03', 'Lightroom Warm Edit',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a Lightroom-style warm edit. Add warmth to the color temperature, lift shadows slightly, reduce harsh highlights, add subtle golden tones to skin, balance contrast to make the photo look polished and professional. The result should look like a skilled Lightroom preset applied to a real iPhone photo.',
'Warm tones, balanced contrast, polished iPhone-photo look.'),

('2026-01-04', 'Crisp Editorial Edit',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a crisp editorial edit. Increase sharpness and clarity slightly. Add clean defined contrast. Reduce noise. Make colors slightly more vivid but realistic. Create a professional editorial-quality finish. The result should look like a retouched photo from a brand photoshoot, not an AI image.',
'Sharper detail, clean contrast, professional finish.'),

('2026-01-05', 'Luxury Soft Contrast',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a luxury soft contrast edit. Desaturate slightly toward neutral muted tones. Add soft lifted shadows. Reduce highlights gently. Create an expensive editorial magazine feel while keeping skin tones natural and realistic. The result should look like a high-end editorial photo, not an AI transformation.',
'Neutral tones, soft shadows, expensive editorial feel.'),

('2026-01-06', 'Face Brighten Edit',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a targeted face brightening edit. Brighten the facial area naturally. Reduce under-eye darkness slightly. Balance the light on the face. Keep skin texture and pores realistic. The surrounding background and body should remain unchanged. The result should look like the face was professionally lit, not digitally altered.',
'Brightens the face while keeping the photo natural.'),

('2026-01-07', 'Skin + Light Polish',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a skin and light polish edit. Smooth skin blemishes and minor imperfections naturally while keeping pores and texture visible. Improve the quality of light on the skin. Balance highlights and shadows on the face. The result should look like professional skin retouching done in Photoshop, not AI generation.',
'Softens skin, improves light, keeps texture realistic.'),

('2026-01-08', 'Content Ready Edit',
'Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. Apply a content-ready edit optimised for Instagram and brand use. Balance exposure. Clean color grading. Slightly improve skin tone. Add subtle sharpness. Make the photo look polished, bright, and professional for social media posting. The result should look like a photo edited by a professional content creator, not an AI transformation.',
'Balanced, clean, polished for Instagram and brand content.');
