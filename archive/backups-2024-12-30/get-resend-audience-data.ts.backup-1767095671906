/**
 * Get Resend Audience Data Tool
 * Gets live audience data from Resend including all segments and contact counts
 * This is a critical tool - ALWAYS call before send_broadcast_to_segment
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend, getAudienceContacts } from '../../shared/dependencies'
import { ALEX_CONSTANTS } from '../../constants'

interface GetResendAudienceDataInput {
  includeSegmentDetails?: boolean
}

export const getResendAudienceDataTool: Tool<GetResendAudienceDataInput> = {
  name: "get_resend_audience_data",
  description: `Get live audience data from Resend including all segments and contact counts.

ALWAYS call this BEFORE using send_broadcast_to_segment to:
1. See available segments and their IDs
2. Check how many contacts are in each segment
3. Help Sandra choose the right audience

Returns:
- Total audience size
- List of all segments with IDs and sizes
- Live data from Resend API

The segment IDs returned here are what you'll use in send_broadcast_to_segment.

WORKFLOW:
1. Sandra asks to send email
2. Call this tool to get segments
3. Show Sandra the options
4. Get approval on which segment
5. Use send_broadcast_to_segment with the segmentId`,

  input_schema: {
    type: "object",
    properties: {
      includeSegmentDetails: {
        type: "boolean",
        description: "Include detailed segment information (defaults to true if not specified)"
      }
    },
    required: []
  },

  async execute({ includeSegmentDetails = true }: GetResendAudienceDataInput): Promise<ToolResult> {
    try {
      if (!resend) {
        return { 
          success: false,
          error: "Resend client not initialized. RESEND_API_KEY not configured.",
          fallback: "I couldn't connect to Resend. Let me use database records instead."
        }
      }

      const audienceId = process.env.RESEND_AUDIENCE_ID

      if (!audienceId) {
        return { 
          success: false,
          error: "RESEND_AUDIENCE_ID not configured",
          fallback: "I couldn't fetch live data from Resend. Let me use database records instead."
        }
      }

      // Get audience details - verify connection works
      let audience: any
      try {
        console.log('[Alex] 🔗 Testing Resend connection by fetching audience:', audienceId)
        audience = await resend.audiences.get(audienceId)
        console.log('[Alex] ✅ Resend connection successful, audience:', audience.data?.name || audienceId)
      } catch (audienceError: any) {
        console.error('[Alex] ❌ Failed to fetch audience from Resend:', audienceError.message)
        throw new Error(`Resend API connection failed: ${audienceError.message}. Please verify RESEND_API_KEY and RESEND_AUDIENCE_ID are correct.`)
      }

      // Get all contacts to calculate total
      let contacts: any[] = []
      try {
        console.log('[Alex] 📊 Fetching contacts from Resend...')
        contacts = await getAudienceContacts(audienceId)
        console.log(`[Alex] ✅ Fetched ${contacts.length} contacts from Resend`)

        // CRITICAL: Wait after fetching contacts to avoid rate limiting the segments API call
        console.log('[Alex] ⏳ Waiting 1 second before fetching segments to avoid rate limits...')
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (contactsError: any) {
        console.error('[Alex] ❌ Failed to fetch contacts from Resend:', contactsError.message)
        contacts = []
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      let segments: any[] = []
      let usingFallbackData = false

      if (includeSegmentDetails) {
        // Try to get segments from Resend API
        try {
          console.log('[Alex] 📋 Fetching segments from Resend API...')
          let segmentsResponse: any = null

          if ((resend as any).segments?.list) {
            try {
              segmentsResponse = await (resend as any).segments.list()
              console.log('[Alex] ✅ SDK segments.list() succeeded')
            } catch (sdkError: any) {
              console.log('[Alex] ⚠️ SDK segments.list() failed:', sdkError.message || sdkError)
              try {
                segmentsResponse = await (resend as any).segments.list({ audienceId: audienceId })
                console.log('[Alex] ✅ SDK segments.list() with audienceId succeeded')
              } catch (sdkError2: any) {
                console.log('[Alex] ⚠️ SDK segments.list() with audienceId also failed:', sdkError2.message || sdkError2)
              }
            }
          }

          if (!segmentsResponse && (resend as any).segments?.getAll) {
            try {
              segmentsResponse = await (resend as any).segments.getAll()
              console.log('[Alex] ✅ SDK segments.getAll() succeeded')
            } catch (e: any) {
              console.log('[Alex] ⚠️ SDK segments.getAll() failed:', e.message || e)
            }
          }

          if (segmentsResponse && segmentsResponse.data && Array.isArray(segmentsResponse.data)) {
            console.log(`[Alex] ✅ Found ${segmentsResponse.data.length} segments from Resend SDK`)
            segments = segmentsResponse.data.map((seg: any) => ({
              id: seg.id,
              name: seg.name || 'Unnamed Segment',
              size: seg.contact_count || seg.size || null,
              createdAt: seg.created_at || null
            }))
          } else if (segmentsResponse && Array.isArray(segmentsResponse)) {
            console.log(`[Alex] ✅ Found ${segmentsResponse.length} segments from Resend SDK (direct array)`)
            segments = segmentsResponse.map((seg: any) => ({
              id: seg.id,
              name: seg.name || 'Unnamed Segment',
              size: seg.contact_count || seg.size || null,
              createdAt: seg.created_at || null
            }))
          } else {
            // Fallback: Try direct API call
            console.log('[Alex] ⚠️ SDK segments.list() not available or returned no data, trying direct API...')

            let retries = 3
            let retryDelay = 1000

            while (retries > 0) {
              try {
                if (retries < 3) {
                  console.log(`[Alex] ⏳ Waiting ${retryDelay}ms before retry (${4 - retries}/3)...`)
                  await new Promise((resolve) => setTimeout(resolve, retryDelay))
                  retryDelay *= 2
                }

                const endpoints = [
                  'https://api.resend.com/segments',
                  `https://api.resend.com/audiences/${audienceId}/segments`
                ]

                let apiData: any = null
                let lastError: any = null

                for (const segmentsUrl of endpoints) {
                  try {
                    console.log(`[Alex] 🔍 Trying endpoint: ${segmentsUrl}`)
                    const apiResponse = await fetch(segmentsUrl, {
                      method: 'GET',
                      headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                      },
                    })

                    if (apiResponse.ok) {
                      apiData = await apiResponse.json()
                      console.log(`[Alex] ✅ Successfully fetched from ${segmentsUrl}`)
                      break
                    } else if (apiResponse.status === 404 || apiResponse.status === 405) {
                      const errorText = await apiResponse.text()
                      console.log(`[Alex] ⚠️ Endpoint ${segmentsUrl} returned ${apiResponse.status}, trying next...`)
                      lastError = { status: apiResponse.status, message: errorText }
                      continue
                    } else if (apiResponse.status === 429) {
                      const errorText = await apiResponse.text()
                      console.warn(`[Alex] ⚠️ Rate limit hit (429) on ${segmentsUrl}, will retry`)
                      lastError = { status: 429, message: errorText }
                      break
                    } else {
                      const errorText = await apiResponse.text()
                      console.warn(`[Alex] ⚠️ Endpoint ${segmentsUrl} returned ${apiResponse.status}:`, errorText.substring(0, 200))
                      lastError = { status: apiResponse.status, message: errorText }
                      continue
                    }
                  } catch (endpointError: any) {
                    console.warn(`[Alex] ⚠️ Error calling ${segmentsUrl}:`, endpointError.message)
                    lastError = endpointError
                    continue
                  }
                }

                if (apiData) {
                  if (apiData.data && Array.isArray(apiData.data)) {
                    console.log(`[Alex] ✅ Found ${apiData.data.length} segments from Resend API (direct)`)
                    segments = apiData.data.map((seg: any) => ({
                      id: seg.id,
                      name: seg.name || 'Unnamed Segment',
                      size: seg.contact_count || seg.size || null,
                      createdAt: seg.created_at || null
                    }))
                    break
                  } else if (apiData.segments && Array.isArray(apiData.segments)) {
                    console.log(`[Alex] ✅ Found ${apiData.segments.length} segments from Resend API (direct, alt format)`)
                    segments = apiData.segments.map((seg: any) => ({
                      id: seg.id,
                      name: seg.name || 'Unnamed Segment',
                      size: seg.contact_count || seg.size || null,
                      createdAt: seg.created_at || null
                    }))
                    break
                  } else if (Array.isArray(apiData)) {
                    console.log(`[Alex] ✅ Found ${apiData.length} segments from Resend API (direct array)`)
                    segments = apiData.map((seg: any) => ({
                      id: seg.id,
                      name: seg.name || 'Unnamed Segment',
                      size: seg.contact_count || seg.size || null,
                      createdAt: seg.created_at || null
                    }))
                    break
                  } else {
                    console.warn('[Alex] ⚠️ Resend API returned unexpected format:', JSON.stringify(apiData).substring(0, 200))
                    break
                  }
                } else if (lastError?.status === 429) {
                  console.warn(`[Alex] ⚠️ Rate limit hit (429), will retry. Attempt ${4 - retries}/3`)
                  retries--
                  if (retries === 0) {
                    console.error('[Alex] ❌ Rate limit retries exhausted, falling back to database/env')
                  }
                } else {
                  console.warn(`[Alex] ⚠️ Resend segments API failed:`, lastError?.message || lastError || 'Unknown error')
                  break
                }
              } catch (apiError: any) {
                console.warn(`[Alex] ⚠️ Direct API call failed (attempt ${4 - retries}/3):`, apiError.message || apiError)
                retries--
                if (retries === 0) {
                  console.warn('[Alex] ⚠️ All retries exhausted, falling back to database/env')
                }
              }
            }
          }
        } catch (error: any) {
          console.warn('[Alex] ⚠️ Failed to fetch segments from Resend API, falling back to database/env:', error.message)
        }

        // FALLBACK: If Resend API didn't return segments, use database/env as backup
        if (segments.length === 0) {
          console.warn('[Alex] ⚠️ WARNING: Resend API did not return segments. Using fallback database/env data.')
          console.log('[Alex] 📋 Using fallback: Getting segments from database and env vars...')
          usingFallbackData = true

          const knownSegments = await sql`
            SELECT DISTINCT 
              jsonb_extract_path_text(target_audience, 'resend_segment_id') as segment_id,
              jsonb_extract_path_text(target_audience, 'segment_name') as segment_name
            FROM admin_email_campaigns
            WHERE target_audience ? 'resend_segment_id'
              AND jsonb_extract_path_text(target_audience, 'resend_segment_id') IS NOT NULL
          `

          const knownSegmentIds = [
            { id: process.env.RESEND_BETA_SEGMENT_ID, name: 'Beta Users' },
          ].filter(s => s.id)

          const allSegments = new Map()

          knownSegments.forEach((s: any) => {
            if (s.segment_id) {
              allSegments.set(s.segment_id, {
                id: s.segment_id,
                name: s.segment_name || 'Unknown Segment',
                size: null
              })
            }
          })

          knownSegmentIds.forEach(s => {
            if (s.id) {
              allSegments.set(s.id, {
                id: s.id,
                name: s.name,
                size: null
              })
            }
          })

          segments = Array.from(allSegments.values())
        }

        console.log(`[Alex] 📊 Final segments list: ${segments.length} segments`)
      }

      // Build summary with segment details
      let summary = `You have ${contacts.length} total contacts in your audience`
      if (segments.length > 0) {
        const segmentsWithSize = segments.filter(s => s.size !== null && s.size !== undefined)
        if (segmentsWithSize.length > 0) {
          const totalSegmentSize = segmentsWithSize.reduce((sum, s) => sum + (s.size || 0), 0)
          summary += ` across ${segments.length} segments (${totalSegmentSize} contacts in tracked segments)`
        } else {
          summary += ` across ${segments.length} segments`
        }
      }
      summary += '.'

      if (usingFallbackData) {
        summary += ' ⚠️ NOTE: Segment data is from database/fallback, not live Resend API. Real-time segment sizes may not be accurate.'
      }

      console.log(`[Alex] 📋 Segments found:`, segments.map(s => ({
        id: s.id,
        name: s.name,
        size: s.size
      })))

      return {
        success: true,
        audienceId: audience.data?.id || audienceId,
        audienceName: audience.data?.name || 'SSELFIE Audience',
        totalContacts: contacts.length,
        segments: segments.map(s => ({
          id: s.id,
          name: s.name,
          size: s.size,
          description: `Segment ID: ${s.id} - Use this EXACT ID in targetAudienceResendSegmentId parameter`
        })),
        summary: summary,
        isLiveData: !usingFallbackData,
        warning: usingFallbackData ? 'Segment data is from database fallback, not live Resend API. Real-time segment sizes may not be accurate.' : undefined,
        data: {
          audienceId: audience.data?.id || audienceId,
          audienceName: audience.data?.name || 'SSELFIE Audience',
          totalContacts: contacts.length,
          segments: segments
        }
      }

    } catch (error: any) {
      console.error('[Admin Agent] ❌ Error fetching Resend audience:', error)
      console.error('[Admin Agent] Error details:', {
        message: error.message,
        stack: error.stack,
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasAudienceId: !!process.env.RESEND_AUDIENCE_ID,
        resendInitialized: !!resend
      })

      return {
        success: false,
        error: error.message || "Failed to fetch audience data from Resend API",
        fallback: "I couldn't fetch live data from Resend. Let me use database records instead.",
        isLiveData: false,
        warning: `⚠️ CRITICAL: Could not connect to Resend API. Error: ${error.message}. Please check RESEND_API_KEY and RESEND_AUDIENCE_ID environment variables.`
      }
    }
  }
}

