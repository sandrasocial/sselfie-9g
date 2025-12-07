export async function getAudienceContacts(audienceId: string) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  console.log("[v0] Fetching all contacts from Resend audience:", audienceId)

  // Try using Resend SDK first (handles pagination automatically)
  try {
    const { Resend } = await import("resend")
    const resend = new Resend(resendApiKey)
    
    console.log("[v0] Using Resend SDK to fetch contacts...")
    
    const allContacts: any[] = []
    let page = 1
    const maxPages = 100 // Safety limit (100 pages * ~100 contacts = 10,000 max, enough for 2,739)
    let hasMore = true
    
    // Try to get all contacts - SDK might return all in one call or need pagination
    let response = await resend.contacts.list({
      audienceId,
    })
    
    console.log(`[v0] SDK initial response structure:`, {
      hasData: !!response.data,
      hasDataData: !!response.data?.data,
      dataLength: response.data?.data?.length,
      totalPages: response.data?.total_pages,
      total: response.data?.total,
      hasNext: !!response.data?.next,
      keys: Object.keys(response.data || {}),
    })
    
    let pageContacts = response.data?.data || []
    allContacts.push(...pageContacts)
    
    // If SDK supports pagination, continue fetching
    // Check if there's a next page indicator
    let nextCursor = response.data?.next
    let totalPages = response.data?.total_pages || 1
    
    const totalFromAPI = response.data?.total || null
    console.log(`[v0] Initial fetch: ${pageContacts.length} contacts, total from API: ${totalFromAPI || 'unknown'}, total pages: ${totalPages}, next cursor: ${nextCursor || 'none'}`)
    
    // If API says there are more contacts than we got, definitely continue
    if (totalFromAPI && allContacts.length < totalFromAPI) {
      console.log(`[v0] API indicates ${totalFromAPI} total contacts, but we only have ${allContacts.length}. Continuing to fetch...`)
    }
    
    // If we got contacts, try to fetch more pages
    // Continue as long as we're getting contacts (might be paginated)
    while (pageContacts.length > 0 && page < maxPages) {
      // Check if we've reached the total
      if (totalFromAPI && allContacts.length >= totalFromAPI) {
        console.log(`[v0] Reached total contacts (${totalFromAPI}), stopping`)
        break
      }
      // Continue if:
      // 1. We got a full page (100+ contacts) - likely more pages
      // 2. API indicates more pages (totalPages > current page)
      // 3. There's a next cursor
      // 4. We haven't reached the total from API
      const gotFullPage = pageContacts.length >= 100
      const hasMorePages = totalPages > 1 && page < totalPages
      const hasNextCursor = !!nextCursor
      const notAtTotal = totalFromAPI ? allContacts.length < totalFromAPI : true
      
      const shouldContinue = gotFullPage || hasMorePages || hasNextCursor || notAtTotal
      
      console.log(`[v0] Pagination check: gotFullPage=${gotFullPage}, hasMorePages=${hasMorePages}, hasNextCursor=${hasNextCursor}, notAtTotal=${notAtTotal}, shouldContinue=${shouldContinue}`)
      
      if (!shouldContinue) {
        console.log(`[v0] No more pages indicated (got ${pageContacts.length} contacts, totalPages: ${totalPages}, nextCursor: ${nextCursor || 'none'}, totalFromAPI: ${totalFromAPI || 'unknown'}, accumulated: ${allContacts.length})`)
        break
      }
      
      page++
      console.log(`[v0] Fetching page ${page} using SDK (totalPages: ${totalPages}, nextCursor: ${nextCursor || 'none'})...`)
      
      // Try with page parameter or cursor - Resend API might use different methods
      try {
        // Try cursor first if available
        if (nextCursor) {
          response = await resend.contacts.list({
            audienceId,
            // @ts-ignore - SDK might support cursor
            cursor: nextCursor,
          })
        } else {
          // Try page number
          response = await resend.contacts.list({
            audienceId,
            // @ts-ignore - SDK might support page
            page: page,
          })
        }
        
        pageContacts = response.data?.data || []
        nextCursor = response.data?.next
        totalPages = response.data?.total_pages || totalPages
        const currentTotal = response.data?.total || totalFromAPI
        
        console.log(`[v0] SDK page ${page}: fetched ${pageContacts.length} contacts, total: ${currentTotal || 'unknown'}, totalPages: ${totalPages}, nextCursor: ${nextCursor || 'none'}, accumulated: ${allContacts.length + pageContacts.length}`)
        
        if (pageContacts.length > 0) {
          allContacts.push(...pageContacts)
        } else {
          console.log(`[v0] Got empty page, stopping`)
          break
        }
        
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (pageError: any) {
        console.warn(`[v0] Error fetching page ${page}:`, pageError?.message || pageError)
        // If it's a "not found" or "invalid parameter" error, we're probably done
        if (pageError?.message?.includes('not found') || pageError?.message?.includes('invalid')) {
          break
        }
        // Otherwise, try one more time with different approach
        if (page === 2) {
          console.log(`[v0] Retrying with direct API approach...`)
          throw new Error('SDK pagination failed, switching to direct API')
        }
        break
      }
    }
    
    console.log(`[v0] SDK fetched total: ${allContacts.length} contacts`)
    
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
  } catch (sdkError: any) {
    console.warn(`[v0] SDK method failed, falling back to direct API:`, sdkError.message)
    
    // Fallback to direct API with manual pagination
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
          
          // If we got fewer than limit AND we don't have a total to check against, we're done
          if (pageContacts.length < limit && !totalFromAPI) {
            hasMore = false
          }
          // If we have a total and haven't reached it, continue
          else if (totalFromAPI && allContacts.length < totalFromAPI) {
            hasMore = true
            console.log(`[v0] Only have ${allContacts.length} of ${totalFromAPI} contacts, continuing...`)
          }
        }
      } else {
        hasMore = false
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
