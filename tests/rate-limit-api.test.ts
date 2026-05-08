// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

const pipelineExec = vi.fn()
const pipeline = {
  zremrangebyscore: vi.fn(() => pipeline),
  zcard: vi.fn(() => pipeline),
  zadd: vi.fn(() => pipeline),
  expire: vi.fn(() => pipeline),
  exec: pipelineExec,
}
const redisConstructor = vi.fn(() => ({
  pipeline: vi.fn(() => pipeline),
}))

vi.mock("@upstash/redis", () => ({
  Redis: redisConstructor,
}))

function requestWithIp(ip = "203.0.113.10") {
  return new Request("http://localhost/api/test", {
    headers: {
      "x-forwarded-for": ip,
    },
  }) as any
}

describe("rateLimit custom API helper", () => {
  beforeEach(() => {
    vi.resetModules()
    redisConstructor.mockClear()
    pipeline.zremrangebyscore.mockClear()
    pipeline.zcard.mockClear()
    pipeline.zadd.mockClear()
    pipeline.expire.mockClear()
    pipelineExec.mockReset()
    delete process.env.UPSTASH_KV_REST_API_URL
    delete process.env.UPSTASH_KV_REST_API_TOKEN
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  it("fails open intentionally when Redis is not configured", async () => {
    const { rateLimit } = await import("@/lib/rate-limit-api")

    const result = await rateLimit(requestWithIp(), { maxRequests: 1, windowMs: 60_000 })

    expect(result).toEqual({ success: true })
    expect(redisConstructor).not.toHaveBeenCalled()
  })

  it("uses getRedis-backed Upstash client when Redis is configured", async () => {
    process.env.UPSTASH_KV_REST_API_URL = "https://redis.example"
    process.env.UPSTASH_KV_REST_API_TOKEN = "token"
    pipelineExec.mockResolvedValue([0, 0, 1, 1])
    const { rateLimit } = await import("@/lib/rate-limit-api")

    const result = await rateLimit(requestWithIp(), { maxRequests: 1, windowMs: 60_000 })

    expect(result).toEqual({ success: true })
    expect(redisConstructor).toHaveBeenCalledWith({
      url: "https://redis.example",
      token: "token",
    })
    expect(pipeline.zcard).toHaveBeenCalled()
  })

  it("blocks requests over the custom limit", async () => {
    process.env.UPSTASH_KV_REST_API_URL = "https://redis.example"
    process.env.UPSTASH_KV_REST_API_TOKEN = "token"
    pipelineExec.mockResolvedValue([0, 3, 1, 1])
    const { rateLimit } = await import("@/lib/rate-limit-api")

    const result = await rateLimit(requestWithIp(), { maxRequests: 3, windowMs: 60_000 })

    expect(result).toEqual({ success: false, retryAfter: 60 })
  })
})
