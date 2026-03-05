import { describe, expect, it } from "vitest"

import {
  encodeMayaVideoCardMarker,
  extractMayaVideoCardMarkers,
  parseMayaVideoCardMarkerPayload,
  stripMayaVideoCardMarkers,
} from "@/lib/maya/video-card-marker"

describe("maya video card marker", () => {
  it("encodes and decodes a persisted video payload", () => {
    const marker = encodeMayaVideoCardMarker({
      videoUrl: "https://cdn.sselfie.ai/video.mp4",
      motionPrompt: "subtle camera push",
      imageUrl: "https://cdn.sselfie.ai/source.jpg",
    })

    const encodedPayload = marker.match(/\[VIDEO_CARD:([^\]]+)\]/)?.[1] || ""
    const parsed = parseMayaVideoCardMarkerPayload(encodedPayload)

    expect(parsed).toEqual({
      videoUrl: "https://cdn.sselfie.ai/video.mp4",
      motionPrompt: "subtle camera push",
      imageUrl: "https://cdn.sselfie.ai/source.jpg",
    })
  })

  it("extracts valid markers and skips invalid payloads", () => {
    const text =
      "Done.\n" +
      encodeMayaVideoCardMarker({
        videoUrl: "https://cdn.sselfie.ai/video-a.mp4",
      }) +
      "\n[VIDEO_CARD:invalid]"

    const markers = extractMayaVideoCardMarkers(text)
    expect(markers).toEqual([
      {
        videoUrl: "https://cdn.sselfie.ai/video-a.mp4",
      },
    ])
  })

  it("strips video card markers from text", () => {
    const text =
      "Your video is ready.\n" +
      encodeMayaVideoCardMarker({
        videoUrl: "https://cdn.sselfie.ai/video-b.mp4",
      })

    expect(stripMayaVideoCardMarkers(text)).toBe("Your video is ready.")
  })
})
