# SSELFIE Video Model Comparison - 2026-06-20

Purpose: compare higher-quality image-to-video models for Maya's "Make it move" flow using the same SSELFIE source image and the same subtle luxury b-roll prompt.

## Test Setup

- Source image: `https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-app-v3/42585527/1781801808841-0.png`
- Duration: 5 seconds
- Target quality: 720p where the model supports an explicit 720p setting
- Audio: off where supported
- Motion brief: preserve the woman's identity, outfit, sunglasses, hair, body proportions, and scene; add subtle coastal breeze, soft breathing, small hand release from sunglasses, slight blink, and background palm motion.

## Results

| Model | Prediction | Output | Runtime | Price for Tested Settings | Approx 5s Cost | Notes |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `wan-video/wan-2.7-i2v` | `5w308397chrmt0cywj5ajysq8m` | https://replicate.delivery/xezq/RNPTuSfGrd2fHU9f1IhMs3t1zPfeT65B64SBqpNPyBjVoNI2C/tmpc8l3ia_j.mp4 | 67.0s | $0.10/sec at 720p | $0.50 | Fastest of the premium tests. Cinematic, realistic, good scene continuity. More face/head motion than the current subtle ideal, but usable. |
| `kwaivgi/kling-v3-omni-video` | `vwerh116hnrmr0cywj59hbf2qr` | https://replicate.delivery/xezq/T90KGFvuwQIpL9EW6zT1blkK48RpqndXk31UGmRNyGWgbQsF/tmps1mtf7t5.mp4 | 130.2s | $0.168/sec standard no-audio | $0.84 | Selected production default. Best face preservation and least cartoonish drift in Sandra's review. |
| `bytedance/seedance-2.0` | `710mnd96j5rmw0cywj5a3dbwtw` | https://replicate.delivery/xezq/mGdWfYh6EF1PKqyMgrgcZR6jo6gPs53FjwwASy9QfqrGuBxWA/tmpe8rt9ez7.mp4 | 135.4s | $0.18/sec at 720p image input | $0.90 | Smooth and polished, but more assertive hand/body motion than requested. Strong multimodal future option because it accepts reference images/videos/audio. |

Local comparison files from this run:

- `/Users/MD760HA/ACTIVE/sselfie-9g/tmp/video-model-comparison-2026-06-20/wan-2.7-i2v.mp4`
- `/Users/MD760HA/ACTIVE/sselfie-9g/tmp/video-model-comparison-2026-06-20/kling-v3-omni-video.mp4`
- `/Users/MD760HA/ACTIVE/sselfie-9g/tmp/video-model-comparison-2026-06-20/seedance-2.0.mp4`

## Pricing Tiers

### `wan-video/wan-2.7-i2v`

- 720p: $0.10/sec of output video
- 1080p: $0.15/sec of output video

### `kwaivgi/kling-v3-omni-video`

- Standard, no audio: $0.168/sec
- Standard, audio: $0.224/sec
- Pro, no audio: $0.224/sec
- Pro, audio: $0.28/sec
- 4K, no audio: $0.42/sec
- 4K, audio: $0.42/sec

### `bytedance/seedance-2.0`

- 480p, video input: $0.10/sec
- 480p, image/text input: $0.08/sec
- 720p, video input: $0.22/sec
- 720p, image/text input: $0.18/sec
- 1080p, video input: $0.55/sec
- 1080p, image/text input: $0.45/sec

## Implementation Notes

The backend now supports these model-specific input shapes behind `APP_V3_VIDEO_MODEL`:

- `wan-video/wan-2.7-i2v`: sends `first_frame`, `duration`, `resolution`, `negative_prompt`, `enable_prompt_expansion`, `seed`
- `kwaivgi/kling-v3-omni-video`: sends `start_image`, `mode`, `duration`, `generate_audio: false`
- `bytedance/seedance-2.0`: sends `image`, `duration`, `resolution`, `aspect_ratio: adaptive`, `generate_audio: false`, `seed`

Production default is now `kwaivgi/kling-v3-omni-video` in standard mode at 10 credits per 5-second video. The previous Wan defaults remain available through `APP_V3_VIDEO_MODEL` overrides for testing or rollback.

## Recommendation

Sandra selected `kwaivgi/kling-v3-omni-video` after reviewing the outputs because it preserved face identity and avoided the cartoonish drift seen in the other two tests. Use Kling Omni as the production quality default.

Price the standard 720p/no-audio 5-second output at 10 credits. Keep Seedance and Wan 2.7 as fallback/research options only.
