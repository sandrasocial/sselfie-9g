import { describe, expect, it, vi } from "vitest"

import {
  MayaActionExecutor,
  createMayaAction,
  mayaActionReducer,
  type MayaActionKind,
} from "@/lib/app-v3/maya/action-protocol"

const ALL_ACTION_KINDS: MayaActionKind[] = [
  "create_image",
  "create_caption",
  "create_both",
  "apply_to_post",
  "improve_caption",
  "create_grid",
  "update_grid",
  "continue_lesson",
]

function action(kind: MayaActionKind = "create_image") {
  return createMayaAction({
    id: `action-${kind}`,
    taskId: "maya-task-123",
    kind,
    title: `Test ${kind}`,
    reason: "This is the next useful step.",
    target: { feedId: 17, postId: 44, lessonId: 9 },
    creditCost: kind === "create_image" || kind === "create_both" ? 1 : 0,
    requiresConfirmation: true,
    canUndo: kind === "apply_to_post" || kind === "update_grid",
    idempotencyKey: `maya-task-123:${kind}:stable-key`,
  })
}

describe("Maya action protocol", () => {
  it("gives every supported action kind the same initial status model", () => {
    for (const kind of ALL_ACTION_KINDS) {
      const descriptor = action(kind)
      expect(descriptor.kind).toBe(kind)
      expect(descriptor.status).toBe("recommended")
      expect(descriptor.idempotencyKey).toContain(kind)
    }
  })

  it("follows recommend, preview, confirm, execute, result, and undo", () => {
    const recommended = action("apply_to_post")
    const previewing = mayaActionReducer(recommended, { type: "preview" })
    const awaiting = mayaActionReducer(previewing, { type: "request_confirmation" })
    const executing = mayaActionReducer(awaiting, { type: "execute" })
    const succeeded = mayaActionReducer(executing, { type: "succeed" })
    const undone = mayaActionReducer(succeeded, { type: "undo" })

    expect([
      recommended.status,
      previewing.status,
      awaiting.status,
      executing.status,
      succeeded.status,
      undone.status,
    ]).toEqual([
      "recommended",
      "previewing",
      "awaiting_confirmation",
      "executing",
      "succeeded",
      "undone",
    ])
  })

  it("keeps the same idempotency key through failure and retry", () => {
    const awaiting = mayaActionReducer(mayaActionReducer(action(), { type: "preview" }), {
      type: "request_confirmation",
    })
    const failed = mayaActionReducer(mayaActionReducer(awaiting, { type: "execute" }), {
      type: "fail",
    })
    const retrying = mayaActionReducer(failed, { type: "retry" })

    expect(failed.status).toBe("failed")
    expect(retrying.status).toBe("awaiting_confirmation")
    expect(retrying.idempotencyKey).toBe(awaiting.idempotencyKey)
  })

  it("does not allow undo for an action that declared it unavailable", () => {
    const succeeded = mayaActionReducer(
      mayaActionReducer(
        mayaActionReducer(mayaActionReducer(action("create_image"), { type: "preview" }), {
          type: "request_confirmation",
        }),
        { type: "execute" }
      ),
      { type: "succeed" }
    )

    expect(() => mayaActionReducer(succeeded, { type: "undo" })).toThrow("does not support undo")
  })

  it("coalesces double execution and caches a successful result", async () => {
    const executor = new MayaActionExecutor<string>()
    const execute = vi.fn().mockImplementation(async () => "finished")
    const descriptor = action("create_both")

    const [first, second] = await Promise.all([
      executor.run(descriptor, execute),
      executor.run(descriptor, execute),
    ])
    const afterReloadStyleRetry = await executor.run(descriptor, execute)

    expect([first, second, afterReloadStyleRetry]).toEqual(["finished", "finished", "finished"])
    expect(execute).toHaveBeenCalledTimes(1)
  })

  it("allows a failed execution to retry with the original key", async () => {
    const executor = new MayaActionExecutor<string>()
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("provider unavailable"))
      .mockResolvedValueOnce("recovered")
    const descriptor = action("create_image")

    await expect(executor.run(descriptor, execute)).rejects.toThrow("provider unavailable")
    await expect(executor.run(descriptor, execute)).resolves.toBe("recovered")
    expect(execute).toHaveBeenCalledTimes(2)
    expect(execute.mock.calls[0]?.[0].idempotencyKey).toBe(
      execute.mock.calls[1]?.[0].idempotencyKey
    )
  })
})
