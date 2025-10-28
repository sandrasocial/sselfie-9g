import { getCurrentNeonUser } from "@/lib/user-sync"

export async function POST(req: Request) {
  try {
    const user = await getCurrentNeonUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const { query } = await req.json()

    if (!query || typeof query !== "string") {
      return new Response("Invalid query", { status: 400 })
    }

    console.log("[v0] [SERVER] Researching:", query)
    console.log("[v0] [SERVER] API key present:", !!process.env.BRAVE_SEARCH_API_KEY)

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
        },
      },
    )

    console.log("[v0] [SERVER] Brave Search API response status:", response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] [SERVER] Brave Search API error:", response.status, errorText)
      return Response.json(
        {
          results: "Unable to fetch research data at this time. Using existing knowledge instead.",
        },
        { status: 200 },
      )
    }

    const searchData = await response.json()

    // Extract relevant information from search results
    const results = searchData.web?.results || []
    const summary = results
      .slice(0, 5)
      .map((result: any, index: number) => {
        return `${index + 1}. **${result.title}**\n${result.description}\n`
      })
      .join("\n")

    console.log("[v0] [SERVER] Research results extracted:", results.length, "results")

    return Response.json({
      results: summary || "No specific results found, but I can help based on my Instagram expertise.",
    })
  } catch (error) {
    console.error("[v0] [SERVER] Research error:", error)
    return Response.json(
      {
        results: "Unable to fetch research data at this time. Using existing knowledge instead.",
      },
      { status: 200 },
    )
  }
}
