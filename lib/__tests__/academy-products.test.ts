import { beforeEach, describe, expect, it, vi } from "vitest"

const sqlMock = vi.fn()
const neonFactoryMock = vi.fn(() => sqlMock)

vi.mock("@neondatabase/serverless", () => ({
  neon: neonFactoryMock,
}))

describe("getAcademyProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DATABASE_URL = "postgres://unit-test"
  })

  it("returns defaults when overrides table is unavailable", async () => {
    sqlMock.mockRejectedValueOnce(new Error("missing table"))

    const { getAcademyProducts } = await import("@/lib/academy-products")
    const products = await getAcademyProducts()

    expect(neonFactoryMock).toHaveBeenCalledWith("postgres://unit-test")
    expect(products).toHaveLength(3)
    expect(products.find((p) => p.id === "what_to_say")?.name).toBe("What To Say")
    expect(products.every((p) => p.active)).toBe(true)
  })

  it("applies admin overrides to display fields", async () => {
    sqlMock.mockResolvedValueOnce([
      {
        product_id: "show_up",
        name: "Show Up Live",
        tagline: "New tagline",
        description: "Updated description",
        price_cents: 2999,
        active: false,
      },
    ])

    const { getAcademyProducts } = await import("@/lib/academy-products")
    const products = await getAcademyProducts()

    const showUp = products.find((p) => p.id === "show_up")
    expect(showUp).toMatchObject({
      name: "Show Up Live",
      tagline: "New tagline",
      description: "Updated description",
      price: 2999,
      active: false,
    })
    expect(showUp?.stripePriceId).toBeDefined()
  })
})
