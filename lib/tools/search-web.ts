export async function SearchWeb(query: string): Promise<string> {
  try {
    console.log("[v0] SearchWeb called with query:", query)

    // Use Brave Search API if available
    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY

    if (!braveApiKey) {
      console.warn("[v0] BRAVE_SEARCH_API_KEY not found, using fallback")
      return `Search results for "${query}" (API key not configured - real-time search unavailable)`
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": braveApiKey,
        },
      },
    )

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Format results for the AI
    const results = data.web?.results || []

    if (results.length === 0) {
      return `No results found for "${query}"`
    }

    const formattedResults = results
      .slice(0, 5) // Top 5 results
      .map((result: any, index: number) => {
        return `
${index + 1}. **${result.title}**
   URL: ${result.url}
   ${result.description || "No description available"}
`
      })
      .join("\n")

    return `Search results for "${query}":\n\n${formattedResults}`
  } catch (error: any) {
    console.error("[v0] SearchWeb error:", error)
    return `Error performing web search: ${error.message}`
  }
}
