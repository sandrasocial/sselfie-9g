import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { resolveProPhotoshootPrediction } from "@/lib/generation/pro-photoshoot-prediction-state"

describe("pro photoshoot reconciliation hygiene", () => {
  it("marks succeeded predictions with removed output as failed instead of pending forever", () => {
    expect(
      resolveProPhotoshootPrediction({
        status: "succeeded",
        output: undefined,
        dataRemoved: true,
      }),
    ).toEqual({
      status: "failed",
      error: "Prediction output expired before reconciliation",
    })
  })

  it("keeps succeeded predictions with an output URL as completed", () => {
    expect(
      resolveProPhotoshootPrediction({
        status: "succeeded",
        output: "https://example.com/grid.png",
      }),
    ).toEqual({
      status: "completed",
      outputUrl: "https://example.com/grid.png",
    })
  })

  it("runs the pro photoshoot reconcile cron every five minutes", () => {
    const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf8"))
    const cron = vercelConfig.crons.find((entry: { path: string }) => entry.path === "/api/cron/reconcile-pro-photoshoot-grids")

    expect(cron?.schedule).toBe("*/5 * * * *")
  })
})
