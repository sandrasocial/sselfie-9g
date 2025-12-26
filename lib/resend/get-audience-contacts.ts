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
    let after: string | null = null
    let pageNumber = 1
    const limit = 100
    const maxPages = 100
    
    while (pageNumber <= maxPages) {
      console.log(`[v0] Fetching page ${pageNumber} via SDK${after ? ` with after cursor: ${after.substring(0, 30)}...` : ''}...`)
      
      const params: any = {
        limit,
      }
      
      // Add after cursor if we have one
      if (after) {
        params.after = after
      }
      
      // Note: contacts.list() might not support audienceId parameter
      // We'll use the direct API endpoint for audience-specific contacts
      const { data, error } = await resend.contacts.list(params)
      
      if (error) {
        console.warn(`[v0] SDK error on page ${pageNumber}, falling back to direct API:`, error)
        break // Fall through to direct API
      }
      
      if (!data || !data.data) {
        console.log(`[v0] No data returned from SDK on page ${pageNumber}, stopping`)
        break
      }
      
      const pageContacts = Array.isArray(data.data) ? data.data : []
      const hasMore = data.has_more === true
      
      console.log(`[v0] SDK fetched ${pageContacts.length} contacts from page ${pageNumber}, has_more: ${hasMore}`)
      
      if (pageContacts.length === 0) {
        console.log(`[v0] No contacts on page ${pageNumber}, stopping`)
        break
      }
      
      // Check for duplicates
      const existingEmails = new Set(allContacts.map((c: any) => c.email))
      const newContacts = pageContacts.filter((c: any) => !existingEmails.has(c.email))
      const duplicateCount = pageContacts.length - newContacts.length
      
      if (duplicateCount > 0 && pageNumber > 1) {
        console.warn(`[v0] ⚠️ Detected ${duplicateCount} duplicates on page ${pageNumber}, stopping`)
        if (newContacts.length > 0) {
          allContacts.push(...newContacts)
        }
        break
      }
      
      allContacts.push(...pageContacts)
      
      // Get the last contact ID for next page
      const lastContact = pageContacts[pageContacts.length - 1]
      after = lastContact?.id || null
      
      const uniqueCount = new Set(allContacts.map((c: any) => c.email)).size
      console.log(`[v0] Accumulated: ${allContacts.length} total contacts (${uniqueCount} unique)`)
      
      if (!hasMore || !after) {
        console.log(`[v0] ✅ No more pages (has_more: ${hasMore}, after: ${after ? 'yes' : 'no'}), stopping`)
        break
      }
      
      pageNumber++
      
      // Rate limiting: Resend allows 2 requests per second (500ms minimum between requests)
      // Use 600ms to be safe and avoid hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, 600))
    }
    
    if (allContacts.length > 0) {
      console.log(`[v0] SDK successfully fetched ${allContacts.length} contacts`)
      
      // Deduplicate
      const uniqueContacts = new Map<string, any>()
      for (const contact of allContacts) {
        if (contact.email && !uniqueContacts.has(contact.email)) {
          uniqueContacts.set(contact.email, contact)
        }
      }
      const deduplicatedContacts = Array.from(uniqueContacts.values())
      
      // Filter out unsubscribed
      const activeContacts = deduplicatedContacts.filter((contact: { unsubscribed: boolean }) => !contact.unsubscribed)
      console.log(`[v0] Active (subscribed) contacts: ${activeContacts.length}`)
      
      return activeContacts
    }
  } catch (error) {
    console.warn(`[v0] SDK approach failed or doesn't support audienceId, falling back to direct API:`, error)
  }
  
  // Direct API approach (audience-specific)

  // Fallback to direct API if SDK doesn't work
  console.log("[v0] Using direct API to fetch contacts with cursor-based pagination...")
  const allContacts: any[] = []
  let pageNumber = 1
  const limit = 100
  const maxPages = 100
  let hasMore = true
    
  // Use cursor-based pagination (Resend's actual method)
  let after: string | null = null
  let totalFromAPI: number | null = null
  let consecutiveEmptyPages = 0
  
  while (pageNumber <= maxPages) {
    const url = new URL(`https://api.resend.com/audiences/${audienceId}/contacts`)
    
    // Resend uses 'after' parameter with contact ID for pagination
    // If no 'after' cursor, try using page number as fallback
    if (after) {
      url.searchParams.set("after", after)
      console.log(`[v0] Fetching page ${pageNumber} via direct API with 'after' cursor: ${after.substring(0, 30)}...`)
    } else if (pageNumber > 1) {
      // Try page number for subsequent pages if no cursor
      url.searchParams.set("page", pageNumber.toString())
      console.log(`[v0] Fetching page ${pageNumber} via direct API using page number (no cursor available)...`)
    } else {
      console.log(`[v0] Fetching page ${pageNumber} via direct API (first page)...`)
    }
    url.searchParams.set("limit", limit.toString())
      
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
      let apiHasMore = false
      
      if (Array.isArray(data)) {
        pageContacts = data
        apiHasMore = pageContacts.length === limit
      } else if (Array.isArray(data?.data)) {
        pageContacts = data.data
        // Update total if available
        if (data?.total && !totalFromAPI) {
          totalFromAPI = data.total
        }
        // CRITICAL: Use the API's has_more field as the source of truth
        apiHasMore = data?.has_more === true
      } else {
        console.warn(`[v0] Unexpected response structure:`, Object.keys(data))
        console.log(`[v0] Full response:`, JSON.stringify(data, null, 2).substring(0, 2000))
        pageContacts = []
        apiHasMore = false
      }
      
      console.log(`[v0] Direct API fetched ${pageContacts.length} contacts from page ${pageNumber}, API has_more: ${apiHasMore}, total from API: ${totalFromAPI || 'unknown'}`)
      
      if (pageContacts.length > 0) {
        // Check for duplicates BEFORE adding (to detect if we're looping)
        const existingEmails = new Set(allContacts.map((c: any) => c.email))
        const newContacts = pageContacts.filter((c: any) => !existingEmails.has(c.email))
        const duplicateCount = pageContacts.length - newContacts.length
        
        if (duplicateCount > 0 && pageNumber > 1) {
          console.warn(`[v0] ⚠️ WARNING: Found ${duplicateCount} duplicate contacts on page ${pageNumber} (${newContacts.length} new). This suggests pagination is looping.`)
          // If ANY duplicates on a page after page 1, we're looping - stop immediately!
          // (The API should never return duplicates if pagination is working)
          if (duplicateCount > 0) {
            console.warn(`[v0] ⚠️ Detected duplicates (${duplicateCount}/${pageContacts.length}), stopping to prevent infinite loop`)
            hasMore = false
            // Only add the new contacts, not duplicates
            if (newContacts.length > 0) {
              allContacts.push(...newContacts)
              console.log(`[v0] Added ${newContacts.length} new contacts before stopping`)
            }
            break
          }
        }
        
        // Add all contacts (deduplication happens at the end)
        allContacts.push(...pageContacts)
        consecutiveEmptyPages = 0
        
        // Get the last contact's ID for next page
        const lastContact = pageContacts[pageContacts.length - 1]
        after = lastContact?.id || lastContact?.contact_id || null
        
        const uniqueCount = new Set(allContacts.map((c: any) => c.email)).size
        console.log(`[v0] Accumulated: ${allContacts.length} total contacts (${uniqueCount} unique)`)
        
        // Use API's has_more as the primary indicator - if false, stop immediately
        if (!apiHasMore) {
          hasMore = false
          console.log(`[v0] ✅ API indicates no more pages (has_more: false), stopping`)
        } else if (totalFromAPI && uniqueCount >= totalFromAPI) {
          hasMore = false
          console.log(`[v0] ✅ Reached total contacts (${totalFromAPI}), stopping`)
        } else if (pageContacts.length < limit) {
          // Got fewer than 100 contacts - this is likely the last page
          // Even if has_more is true, try one more page to be sure
          if (after) {
            // We have a cursor, try one more page
            hasMore = true
            console.log(`[v0] ⚠️ Got ${pageContacts.length} contacts (< limit ${limit}) but have cursor, trying one more page to confirm...`)
          } else {
            // No cursor, we're done
            hasMore = false
            console.log(`[v0] ✅ Got ${pageContacts.length} contacts (< limit ${limit}) and no cursor, stopping`)
          }
        } else {
          // Got full page (100 contacts), definitely more pages
          hasMore = true
          console.log(`[v0] ✅ Got full page (${pageContacts.length} contacts), continuing to page ${pageNumber + 1}...`)
        }
      } else {
        consecutiveEmptyPages++
        console.log(`[v0] ⚠️ Got empty page (${consecutiveEmptyPages} consecutive empty pages), API has_more: ${apiHasMore}`)
        
        // If API says no more OR we get 2 empty pages, stop
        if (!apiHasMore || consecutiveEmptyPages >= 2) {
          hasMore = false
          console.log(`[v0] Stopping: API has_more=${apiHasMore}, consecutive empty=${consecutiveEmptyPages}`)
        } else {
          // Try one more time
          hasMore = true
          after = null // Reset cursor
        }
      }
      
      pageNumber++
      
      if (!hasMore) {
        console.log(`[v0] Stopping pagination. Total fetched: ${allContacts.length}`)
        break
      }
      
      // If we don't have an 'after' cursor but got 100+ contacts, try page-based pagination as fallback
      if (!after && pageContacts.length >= limit && pageNumber <= maxPages && hasMore) {
        console.log(`[v0] ⚠️ No 'after' cursor but got ${pageContacts.length} contacts. Will try page number ${pageNumber + 1} as fallback...`)
        // On next iteration, we'll try without 'after' parameter (which will use page number implicitly)
      }
      
      // Small delay between requests to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    
    // If we stopped early but have a total, warn
    if (totalFromAPI && allContacts.length < totalFromAPI) {
      console.warn(`[v0] ⚠️ WARNING: Only fetched ${allContacts.length} of ${totalFromAPI} total contacts. Pagination may have stopped early.`)
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
    const duplicatesRemoved = allContacts.length - deduplicatedContacts.length
    console.log(`[v0] After deduplication: ${deduplicatedContacts.length} unique contacts (removed ${duplicatesRemoved} duplicates)`)
    
    // Warn if we got very few contacts - might be fetching from a segment instead of main audience
    if (deduplicatedContacts.length < 200 && pageNumber > 3) {
      console.warn(`[v0] ⚠️ WARNING: Only fetched ${deduplicatedContacts.length} contacts. Make sure RESEND_AUDIENCE_ID is set to the MAIN audience ID, not a segment ID.`)
    }
    
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
