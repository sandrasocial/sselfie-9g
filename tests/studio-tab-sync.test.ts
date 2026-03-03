import { describe, expect, it, vi } from "vitest"

import { scheduleStudioTabUpdate } from "@/lib/studio/tab-sync"

describe("scheduleStudioTabUpdate", () => {
  it("defers callback execution", async () => {
    const callback = vi.fn()
    scheduleStudioTabUpdate(callback)

    expect(callback).not.toHaveBeenCalled()

    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it("supports cancellation", async () => {
    const callback = vi.fn()
    const cancel = scheduleStudioTabUpdate(callback)
    cancel()

    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    expect(callback).not.toHaveBeenCalled()
  })
})
