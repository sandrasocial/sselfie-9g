// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { MayaActionCard } from "@/components/app-v3/maya-action-card"
import { createMayaAction } from "@/lib/app-v3/maya/action-protocol"

function descriptor(canUndo = true) {
  return createMayaAction({
    id: "apply-post-44",
    taskId: "maya-task-123",
    kind: "apply_to_post",
    title: "Use this in post 4",
    reason: "It completes the post you selected.",
    target: { feedId: 17, postId: 44 },
    creditCost: 0,
    requiresConfirmation: true,
    canUndo,
    idempotencyKey: "maya-task-123:apply:post-44:asset-90",
  })
}

describe("MayaActionCard", () => {
  it("requires preview and confirmation before executing", async () => {
    const onExecute = vi.fn().mockResolvedValue(undefined)
    render(
      <MayaActionCard
        descriptor={descriptor()}
        preview="Replace the current image in post 4."
        onExecute={onExecute}
      />
    )

    expect(screen.getByText("Use this in post 4")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    expect(screen.getByText("Replace the current image in post 4.")).toBeInTheDocument()
    // 2026-07-29: the preview shows the cost and confirms in one decision — the old
    // separate "Continue" step repeated identical copy a third time.
    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(onExecute).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole("button", { name: "Confirm and apply" }))

    await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("status")).toHaveTextContent("Done")
  })

  it("cancels without executing and reports the real credit cost", () => {
    const paid = { ...descriptor(), kind: "create_both" as const, creditCost: 3 }
    const onExecute = vi.fn()
    const onCancel = vi.fn()
    render(
      <MayaActionCard
        descriptor={paid}
        preview="Create three images and the missing captions."
        onExecute={onExecute}
        onCancel={onCancel}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    expect(screen.getByText("3 credits")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onExecute).not.toHaveBeenCalled()
  })

  it("shows failure, retries safely, then exposes undo", async () => {
    const onExecute = vi
      .fn()
      .mockRejectedValueOnce(new Error("The connection dropped."))
      .mockResolvedValueOnce(undefined)
    const onUndo = vi.fn().mockResolvedValue(undefined)
    render(
      <MayaActionCard
        descriptor={descriptor()}
        preview="Apply the finished image."
        onExecute={onExecute}
        onUndo={onUndo}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    fireEvent.click(screen.getByRole("button", { name: "Confirm and apply" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("The connection dropped.")

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    await waitFor(() => expect(onExecute).toHaveBeenCalledTimes(2))
    fireEvent.click(await screen.findByRole("button", { name: "Undo" }))
    await waitFor(() => expect(onUndo).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("status")).toHaveTextContent("Undone")
  })

  it("cannot execute twice when confirm is tapped twice", async () => {
    let finish: (() => void) | undefined
    const pending = new Promise<void>(resolve => {
      finish = resolve
    })
    const onExecute = vi.fn().mockReturnValue(pending)
    render(
      <MayaActionCard
        descriptor={descriptor()}
        preview="Apply the finished image."
        onExecute={onExecute}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Preview" }))
    const confirm = screen.getByRole("button", { name: "Confirm and apply" })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(onExecute).toHaveBeenCalledTimes(1)

    finish?.()
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Done"))
  })
})
