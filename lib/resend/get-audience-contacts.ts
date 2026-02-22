import { getOrFetch, CACHE_TTL } from "@/lib/cache"

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts?: { maxRetries?: number; baseDelayMs?: number },
): Promise<Response> {
  const maxRetries = opts?.maxRetries ?? 5
  const baseDelayMs = opts?.baseDelayMs ?? 500

  let lastErr: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (res.status !== 429) return res

      // Respect Retry-After if provided; otherwise exponential backoff + jitter.
      const retryAfter = res.headers.get("retry-after")
      const retryAfterMs =
        retryAfter && !Number.isNaN(Number(retryAfter)) ? Number(retryAfter) * 1000 : null
      const backoffMs = Math.min(
        10_000,
        retryAfterMs ?? baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200),
      )

      const text = await res.text().catch(() => "")
      console.warn(`[v0] Resend rate limit (429). Retrying in ${backoffMs}ms.`, {
        attempt,
        url: url.slice(0, 120),
        body: text.slice(0, 200),
      })
      await sleep(backoffMs)
      continue
    } catch (err) {
      lastErr = err
      const backoffMs = Math.min(10_000, baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 200))
      console.warn(`[v0] Resend fetch error. Retrying in ${backoffMs}ms.`, {
        attempt,
        url: url.slice(0, 120),
        error: err instanceof Error ? err.message : String(err),
      })
      await sleep(backoffMs)
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Resend fetch failed after retries")
}

export async function getAudienceContacts(audienceId: string) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  const cacheKey = `resend:audience:${audienceId}:contacts:v1`

  return getOrFetch(
    cacheKey,
    async () => {
      console.log("[v0] Fetching all contacts from Resend audience:", audienceId)

      // Direct API approach (audience-specific)

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
          console.log(
            `[v0] Fetching page ${pageNumber} via direct API with 'after' cursor: ${after.substring(0, 30)}...`,
          )
        } else if (pageNumber > 1) {
          // Try page number for subsequent pages if no cursor
          url.searchParams.set("page", pageNumber.toString())
          console.log(
            `[v0] Fetching page ${pageNumber} via direct API using page number (no cursor available)...`,
          )
        } else {
          console.log(`[v0] Fetching page ${pageNumber} via direct API (first page)...`)
        }
        url.searchParams.set("limit", limit.toString())
      
        const response = await fetchWithRetry(
          url.toString(),
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
          },
          { maxRetries: 6, baseDelayMs: 600 },
        )
      
        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] Resend API error:", response.status, errorText)
          throw new Error(`Failed to fetch contacts from Resend: ${response.status} ${errorText}`)
        }
      
        const data = await response.json()
      
        // Log response structure for first page (trimmed)
        if (pageNumber === 1) {
          console.log(
            `[v0] Direct API response structure:`,
            JSON.stringify(data, null, 2).substring(0, 2000),
          )
          console.log(`[v0] Response keys:`, Object.keys(data))
          totalFromAPI = data?.total || data?.count || null
          console.log(`[v0] Total contacts from API: ${totalFromAPI || "unknown"}`)
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
      
        console.log(
          `[v0] Direct API fetched ${pageContacts.length} contacts from page ${pageNumber}, API has_more: ${apiHasMore}, total from API: ${totalFromAPI || "unknown"}`,
        )
      
        if (pageContacts.length > 0) {
          // Check for duplicates BEFORE adding (to detect if we're looping)
          const existingEmails = new Set(allContacts.map((c: any) => c.email))
          const newContacts = pageContacts.filter((c: any) => !existingEmails.has(c.email))
          const duplicateCount = pageContacts.length - newContacts.length
        
          if (duplicateCount > 0 && pageNumber > 1) {
            console.warn(
              `[v0] ⚠️ WARNING: Found ${duplicateCount} duplicate contacts on page ${pageNumber} (${newContacts.length} new). This suggests pagination is looping.`,
            )
            // If ANY duplicates on a page after page 1, we're looping - stop immediately!
            // (The API should never return duplicates if pagination is working)
            if (duplicateCount > 0) {
              console.warn(
                `[v0] ⚠️ Detected duplicates (${duplicateCount}/${pageContacts.length}), stopping to prevent infinite loop`,
              )
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
              console.log(
                `[v0] ⚠️ Got ${pageContacts.length} contacts (< limit ${limit}) but have cursor, trying one more page to confirm...`,
              )
            } else {
              // No cursor, we're done
              hasMore = false
              console.log(`[v0] ✅ Got ${pageContacts.length} contacts (< limit ${limit}) and no cursor, stopping`)
            }
          } else {
            // Got full page (100 contacts), definitely more pages
            hasMore = true
            console.log(
              `[v0] ✅ Got full page (${pageContacts.length} contacts), continuing to page ${pageNumber + 1}...`,
            )
          }
        } else {
          consecutiveEmptyPages++
          console.log(
            `[v0] ⚠️ Got empty page (${consecutiveEmptyPages} consecutive empty pages), API has_more: ${apiHasMore}`,
          )
        
          // If API says no more OR we get 2 empty pages, stop
          if (!apiHasMore || consecutiveEmptyPages >= 2) {
            hasMore = false
            console.log(
              `[v0] Stopping: API has_more=${apiHasMore}, consecutive empty=${consecutiveEmptyPages}`,
            )
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
          console.log(
            `[v0] ⚠️ No 'after' cursor but got ${pageContacts.length} contacts. Will try page number ${pageNumber + 1} as fallback...`,
          )
          // On next iteration, we'll try without 'after' parameter (which will use page number implicitly)
        }
      
        // Small delay between requests to respect rate limits
        // Resend enforces a strict 2 req/sec limit. Use a bit of slack to avoid 429s,
        // especially when other cron routes also hit the API around the same minute.
        await sleep(650)
      }
    
      // If we stopped early but have a total, warn
      if (totalFromAPI && allContacts.length < totalFromAPI) {
        console.warn(
          `[v0] ⚠️ WARNING: Only fetched ${allContacts.length} of ${totalFromAPI} total contacts. Pagination may have stopped early.`,
        )
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
      console.log(
        `[v0] After deduplication: ${deduplicatedContacts.length} unique contacts (removed ${duplicatesRemoved} duplicates)`,
      )
    
      // Warn if we got very few contacts - might be fetching from a segment instead of main audience
      if (deduplicatedContacts.length < 200 && pageNumber > 3) {
        console.warn(
          `[v0] ⚠️ WARNING: Only fetched ${deduplicatedContacts.length} contacts. Make sure RESEND_AUDIENCE_ID is set to the MAIN audience ID, not a segment ID.`,
        )
      }
    
      // Filter out unsubscribed contacts and return minimal fields to keep cache size smaller.
      const activeContacts = deduplicatedContacts
        .filter((contact: { unsubscribed: boolean }) => !contact.unsubscribed)
        .map((contact: any) => ({
          id: contact.id,
          email: contact.email,
          tags: contact.tags,
          unsubscribed: contact.unsubscribed,
        }))
      console.log(`[v0] Active (subscribed) contacts: ${activeContacts.length}`)
    
      return activeContacts
    },
    // Cache contact lists longer than 60s to avoid re-fetching large audiences every cron tick.
    CACHE_TTL.LONG,
  )
}

export async function getAudienceContactCount(audienceId: string): Promise<number> {
  const contacts = await getAudienceContacts(audienceId)
  return contacts.length
}
