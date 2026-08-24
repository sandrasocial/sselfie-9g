import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAuthenticatedUser: vi.fn(),
  getEffectiveNeonUser: vi.fn(),
  sql: vi.fn(),
  del: vi.fn(),
}))

vi.mock("@/lib/auth-helper", () => ({
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}))

vi.mock("@/lib/simple-impersonation", () => ({
  getEffectiveNeonUser: mocks.getEffectiveNeonUser,
}))

vi.mock("@/lib/db/client", () => ({
  sql: mocks.sql,
}))

vi.mock("@vercel/blob", () => ({
  del: mocks.del,
}))

beforeEach(() => {
  vi.resetModules()
  mocks.getAuthenticatedUser.mockReset()
  mocks.getEffectiveNeonUser.mockReset()
  mocks.sql.mockReset()
  mocks.del.mockReset()
  mocks.getAuthenticatedUser.mockResolvedValue({ user: { id: "auth-user-1" }, error: null })
  mocks.getEffectiveNeonUser.mockResolvedValue({ id: "neon-user-1" })
})

describe("app v3 gallery mutations", () => {
  it("favorites an owned ai image asset", async () => {
    mocks.sql.mockResolvedValueOnce([{ id: 123 }])

    const { POST } = await import("@/app/api/app-v3/gallery/favorite/route")
    const response = await POST(
      new Request("http://localhost/api/app-v3/gallery/favorite", {
        method: "POST",
        body: JSON.stringify({ assetId: "ai_123", isFavorite: true }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(String(mocks.sql.mock.calls[0][0])).toContain("UPDATE ai_images")
    expect(String(mocks.sql.mock.calls[0][0])).toContain("AND user_id =")
  })

  it("rejects video favorites until video favorite storage exists", async () => {
    const { POST } = await import("@/app/api/app-v3/gallery/favorite/route")
    const response = await POST(
      new Request("http://localhost/api/app-v3/gallery/favorite", {
        method: "POST",
        body: JSON.stringify({ assetId: "video_123", isFavorite: true }),
      })
    )

    expect(response.status).toBe(400)
    expect(mocks.sql).not.toHaveBeenCalled()
  })

  it("bulk deletes owned image and video assets", async () => {
    mocks.sql
      .mockResolvedValueOnce([{ is_referenced: false }])
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ video_url: "https://blob.vercel-storage.com/video.mp4" }])
      .mockResolvedValueOnce([{ id: 2 }])
    mocks.del.mockResolvedValue(undefined)

    const { DELETE } = await import("@/app/api/app-v3/gallery/assets/route")
    const response = await DELETE(
      new Request("http://localhost/api/app-v3/gallery/assets", {
        method: "DELETE",
        body: JSON.stringify({ assetIds: ["ai_1", "video_2"] }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, deleted: ["ai_1", "video_2"] })
    expect(mocks.del).toHaveBeenCalledWith("https://blob.vercel-storage.com/video.mp4")
    expect(String(mocks.sql.mock.calls[0][0])).toContain("app_v3_maya_edit_requests")
    expect(String(mocks.sql.mock.calls[1][0])).toContain("DELETE FROM ai_images")
    expect(String(mocks.sql.mock.calls[3][0])).toContain("DELETE FROM generated_videos")
  })

  it("deletes an unreferenced Maya image normally", async () => {
    mocks.sql.mockResolvedValueOnce([{ is_referenced: false }]).mockResolvedValueOnce([{ id: 42 }])

    const { DELETE } = await import("@/app/api/app-v3/gallery/assets/route")
    const response = await DELETE(
      new Request("http://localhost/api/app-v3/gallery/assets", {
        method: "DELETE",
        body: JSON.stringify({ assetIds: ["ai_42"] }),
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true, deleted: ["ai_42"] })
    const referenceQuery = String(mocks.sql.mock.calls[0][0])
    expect(referenceQuery).toContain("request.source_image_id")
    expect(referenceQuery).toContain("request.root_image_id")
    expect(referenceQuery).toContain("request.result_image_id")
    expect(String(mocks.sql.mock.calls[1][0])).toContain("DELETE FROM ai_images")
  })

  it("preserves a Maya edit source image and returns a clear conflict", async () => {
    mocks.sql.mockResolvedValueOnce([{ is_referenced: true }])

    const { DELETE } = await import("@/app/api/app-v3/gallery/assets/route")
    const response = await DELETE(
      new Request("http://localhost/api/app-v3/gallery/assets", {
        method: "DELETE",
        body: JSON.stringify({ assetIds: ["ai_42"] }),
      })
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({
      error:
        "This photo is part of your Maya edit history. Keep it in your gallery so the original and edited versions stay available.",
      code: "MAYA_EDIT_HISTORY_REFERENCE",
      blockedAssetIds: ["ai_42"],
    })
    expect(mocks.sql).toHaveBeenCalledTimes(1)
    expect(String(mocks.sql.mock.calls[0][0])).not.toContain("DELETE FROM ai_images")
  })

  it("converts a concurrent Maya history reference into the same safe conflict", async () => {
    const foreignKeyError = Object.assign(new Error("foreign key violation"), { code: "23503" })
    mocks.sql
      .mockResolvedValueOnce([{ is_referenced: false }])
      .mockRejectedValueOnce(foreignKeyError)
      .mockResolvedValueOnce([{ is_referenced: true }])

    const { DELETE } = await import("@/app/api/app-v3/gallery/assets/route")
    const response = await DELETE(
      new Request("http://localhost/api/app-v3/gallery/assets", {
        method: "DELETE",
        body: JSON.stringify({ assetIds: ["ai_42"] }),
      })
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      code: "MAYA_EDIT_HISTORY_REFERENCE",
      blockedAssetIds: ["ai_42"],
    })
    expect(mocks.sql).toHaveBeenCalledTimes(3)
  })
})
