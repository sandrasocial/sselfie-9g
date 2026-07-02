// VIDEO reliability kill switch (2026-07).
//
// Member video generation failed 7/10 attempts 2026-06-17..20 when the pipeline ran on
// wan-video/wan-2.5-i2v-fast (upstream E002 on every request). The default is Kling Omni
// now and works, but if the provider breaks again this flag hides the Video tile and
// refuses new video predictions without touching image generation.
//
// Default ON. Flip by setting APP_V3_VIDEO_ENABLED="false" in Vercel (then redeploy).
export function isVideoGenerationEnabled(): boolean {
  return process.env.APP_V3_VIDEO_ENABLED?.trim().toLowerCase() !== "false"
}
