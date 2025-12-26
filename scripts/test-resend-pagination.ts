/**
 * Test script to debug Resend API pagination
 * Run with: npx tsx scripts/test-resend-pagination.ts
 */

import { Resend } from "resend"

const resendApiKey = process.env.RESEND_API_KEY
const audienceId = process.env.RESEND_AUDIENCE_ID

if (!resendApiKey || !audienceId) {
  console.error("Missing RESEND_API_KEY or RESEND_AUDIENCE_ID")
  process.exit(1)
}

const resend = new Resend(resendApiKey)

async function testPagination() {
  console.log("Testing Resend API pagination...")
  console.log(`Audience ID: ${audienceId}`)
  
  const allContacts: any[] = []
  let page = 1
  let after: string | null = null
  const limit = 100
  
  while (page <= 10) { // Test up to 10 pages
    console.log(`\n=== Page ${page} ===`)
    
    // Try direct API first
    const url = new URL(`https://api.resend.com/audiences/${audienceId}/contacts`)
    if (after) {
      url.searchParams.set("after", after)
      console.log(`Using 'after' cursor: ${after.substring(0, 30)}...`)
    }
    url.searchParams.set("limit", limit.toString())
    
    console.log(`Fetching: ${url.toString()}`)
    
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Error: ${response.status} ${errorText}`)
      break
    }
    
    const data = await response.json()
    
    console.log(`Response keys:`, Object.keys(data))
    console.log(`Has data.data:`, !!data?.data)
    console.log(`Data length:`, data?.data?.length)
    console.log(`Has total:`, !!data?.total)
    console.log(`Total:`, data?.total)
    console.log(`Has has_more:`, !!data?.has_more)
    console.log(`Has_more:`, data?.has_more)
    console.log(`Has next:`, !!data?.next)
    console.log(`Next:`, data?.next)
    console.log(`Has next_cursor:`, !!data?.next_cursor)
    console.log(`Has total_pages:`, !!data?.total_pages)
    console.log(`Total_pages:`, data?.total_pages)
    
    const pageContacts = data?.data || []
    console.log(`Fetched ${pageContacts.length} contacts`)
    
    if (pageContacts.length > 0) {
      allContacts.push(...pageContacts)
      const lastContact = pageContacts[pageContacts.length - 1]
      after = lastContact?.id || null
      console.log(`Last contact ID: ${after ? after.substring(0, 30) + '...' : 'none'}`)
      console.log(`Total accumulated: ${allContacts.length}`)
    } else {
      console.log("No contacts in this page, stopping")
      break
    }
    
    // If we got fewer than limit, we're done
    if (pageContacts.length < limit) {
      console.log(`Got ${pageContacts.length} contacts (less than limit ${limit}), stopping`)
      break
    }
    
    page++
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  
  console.log(`\n=== Final Results ===`)
  console.log(`Total contacts fetched: ${allContacts.length}`)
  console.log(`Unique emails: ${new Set(allContacts.map(c => c.email)).size}`)
}

testPagination().catch(console.error)












































