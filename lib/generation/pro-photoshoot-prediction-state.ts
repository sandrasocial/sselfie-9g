import type { NanoBananaOutput } from "@/lib/nano-banana-client"

export type ProPhotoshootPredictionResolution =
  | { status: "completed"; outputUrl: string }
  | { status: "failed"; error: string }
  | { status: "pending" }

export function resolveProPhotoshootPrediction(
  prediction: Pick<NanoBananaOutput, "status" | "output" | "error" | "dataRemoved">,
): ProPhotoshootPredictionResolution {
  const outputUrl = String(prediction.output || "").trim()

  if (prediction.status === "succeeded" && outputUrl) {
    return { status: "completed", outputUrl }
  }

  if (prediction.status === "failed") {
    return {
      status: "failed",
      error: String(prediction.error || "Generation failed"),
    }
  }

  if (prediction.status === "succeeded" && prediction.dataRemoved) {
    return {
      status: "failed",
      error: "Prediction output expired before reconciliation",
    }
  }

  return { status: "pending" }
}
