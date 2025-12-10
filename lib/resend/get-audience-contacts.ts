export async function getAudienceContacts(audienceId: string) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  console.log("[v0] Fetching all contacts from Resend audience:", audienceId)

  // Use direct API with cursor-based pagination (more reliable than SDK)
  console.log("[v0] Using direct API to fetch contacts with cursor-based pagination...")
  const allContacts: any[] = []
  let pageNumber = 1
  const limit = 100
  const maxPages = 100
  let hasMore = true
    
    // Use cursor-based pagination (Resend's actual method)
    let after: string | null = null
    let totalFromAPI: number | null = null
    
    while (pageNumber <= maxPages) {
      const url = new URL(`https://api.resend.com/audiences/${audienceId}/contacts`)
      
      // Resend uses 'after' parameter with contact ID for pagination
      if (after) {
        url.searchParams.set("after", after)
      }
      url.searchParams.set("limit", limit.toString())
      
      console.log(`[v0] Fetching page ${pageNumber} via direct API${after ? ` (after: ${after.substring(0, 20)}...)` : ''}...`)
      
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Resend API error:", response.status, errorText)
        throw new Error(`Failed to fetch contacts from Resend: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      
      // Log full response structure for first page
      if (pageNumber === 1) {
        console.log(`[v0] Direct API response structure:`, JSON.stringify(data, null, 2).substring(0, 2000))
        console.log(`[v0] Response keys:`, Object.keys(data))
        totalFromAPI = data?.total || data?.count || null
        console.log(`[v0] Total contacts from API: ${totalFromAPI || 'unknown'}`)
      }
      
      let pageContacts: any[] = []
      if (Array.isArray(data)) {
        pageContacts = data
        hasMore = pageContacts.length === limit
      } else if (Array.isArray(data?.data)) {
        pageContacts = data.data
        // Update total if available
        if (data?.total && !totalFromAPI) {
          totalFromAPI = data.total
        }
        // Check multiple pagination indicators
        hasMore = pageContacts.length === limit || 
                  data?.has_more === true || 
                  data?.next !== null ||
                  data?.next_cursor !== null ||
                  (data?.total_pages && pageNumber < data.total_pages)
      } else {
        console.warn(`[v0] Unexpected response structure:`, Object.keys(data))
        console.log(`[v0] Full response:`, JSON.stringify(data, null, 2).substring(0, 2000))
        pageContacts = []
        hasMore = false
      }
      
      console.log(`[v0] Direct API fetched ${pageContacts.length} contacts from page ${pageNumber}, accumulated: ${allContacts.length + pageContacts.length}, total from API: ${totalFromAPI || 'unknown'}, hasMore: ${hasMore}`)
      
      if (pageContacts.length > 0) {
        allContacts.push(...pageContacts)
        
        // Check if we've reached the total
        if (totalFromAPI && allContacts.length >= totalFromAPI) {
          console.log(`[v0] Reached total contacts (${totalFromAPI}), stopping`)
          hasMore = false
        } else {
          // Get the last contact's ID for next page
          const lastContact = pageContacts[pageContacts.length - 1]
          after = lastContact?.id || null
          
          // Continue if:
          // 1. We got a full page (100 contacts) - likely more pages
          // 2. We have a total and haven't reached it
          // 3. We got contacts but don't have a total (keep going until we get fewer than limit)
          if (pageContacts.length === limit) {
            // Got exactly 100, definitely more pages
            hasMore = true
            console.log(`[v0] Got full page (${pageContacts.length} contacts), continuing...`)
          } else if (totalFromAPI && allContacts.length < totalFromAPI) {
            // Have total and haven't reached it
            hasMore = true
            console.log(`[v0] Only have ${allContacts.length} of ${totalFromAPI} contacts, continuing...`)
          } else if (!totalFromAPI && pageContacts.length < limit) {
            // No total and got fewer than limit - we're done
            hasMore = false
            console.log(`[v0] Got ${pageContacts.length} contacts (less than limit ${limit}) and no total, stopping`)
          } else {
            // Got some contacts but less than limit - might be last page, but continue if we have after cursor
            hasMore = !!after
            if (!hasMore) {
              console.log(`[v0] Got ${pageContacts.length} contacts and no 'after' cursor, stopping`)
            }
          }
        }
      } else {
        hasMore = false
        console.log(`[v0] Got empty page, stopping`)
      }
      
      pageNumber++
      
      if (!hasMore) {
        break
      }
      
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    
    console.log(`[v0] Direct API fetched total: ${allContacts.length} contacts`)
    
    // Deduplicate by email (in case pagination returned duplicates)
    const uniqueContacts = new Map<string, any>()
    for (const contact of allContacts) {
      if (contact.email && !uniqueContacts.has(contact.email)) {
        uniqueContacts.set(contact.email, contact)
      }
    }
    const deduplicatedContacts = Array.from(uniqueContacts.values())
    console.log(`[v0] After deduplication: ${deduplicatedContacts.length} unique contacts (removed ${allContacts.length - deduplicatedContacts.length} duplicates)`)
    
    // Filter out unsubscribed contacts
    const activeContacts = deduplicatedContacts.filter((contact: { unsubscribed: boolean }) => !contact.unsubscribed)
    console.log(`[v0] Active (subscribed) contacts: ${activeContacts.length}`)
    
    return activeContacts
}

export async function getAudienceContactCount(audienceId: string): Promise<number> {
  try {
    const contacts = await getAudienceContacts(audienceId)
    return contacts.length
  } catch (error) {
    console.error("[v0] Error fetching audience contact count:", error)
    return 0
  }
}
