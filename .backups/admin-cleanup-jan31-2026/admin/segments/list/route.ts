import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function GET() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { 
          error: 'RESEND_API_KEY not configured', 
          segments: [],
          message: 'Please configure RESEND_API_KEY in your environment variables'
        },
        { status: 500 }
      )
    }

    if (!resend) {
      return NextResponse.json(
        { 
          error: 'Resend client initialization failed', 
          segments: [],
          message: 'Failed to initialize Resend client'
        },
        { status: 500 }
      )
    }

    const audienceId = process.env.RESEND_AUDIENCE_ID
    let segments: any[] = []
    let errorMessage: string | null = null
    
    try {
      // Try SDK methods first
      let segmentsResponse: any = null
      
      if ((resend as any).segments?.list) {
        try {
          segmentsResponse = await (resend as any).segments.list()
          console.log('[Segments API] ✅ SDK segments.list() succeeded')
        } catch (sdkError: any) {
          console.log('[Segments API] ⚠️ SDK segments.list() failed:', sdkError.message)
          // Try with audienceId if available
          if (audienceId) {
            try {
              segmentsResponse = await (resend as any).segments.list({ audienceId })
              console.log('[Segments API] ✅ SDK segments.list() with audienceId succeeded')
            } catch (sdkError2: any) {
              console.log('[Segments API] ⚠️ SDK segments.list() with audienceId also failed:', sdkError2.message)
            }
          }
        }
      }
      
      // Try alternative SDK method
      if (!segmentsResponse && (resend as any).segments?.getAll) {
        try {
          segmentsResponse = await (resend as any).segments.getAll()
          console.log('[Segments API] ✅ SDK segments.getAll() succeeded')
        } catch (e: any) {
          console.log('[Segments API] ⚠️ SDK segments.getAll() failed:', e.message)
        }
      }
      
      // Parse SDK response
      if (segmentsResponse?.data && Array.isArray(segmentsResponse.data)) {
        segments = segmentsResponse.data.map((seg: any) => ({
          id: seg.id,
          name: seg.name || 'Unnamed Segment',
          size: seg.contact_count || seg.size || 0,
        }))
      } else if (segmentsResponse && Array.isArray(segmentsResponse)) {
        segments = segmentsResponse.map((seg: any) => ({
          id: seg.id,
          name: seg.name || 'Unnamed Segment',
          size: seg.contact_count || seg.size || 0,
        }))
      }
      
      // If SDK didn't work, try direct API call
      if (segments.length === 0) {
        console.log('[Segments API] ⚠️ SDK methods returned no data, trying direct API...')
        
        const endpoints = [
          'https://api.resend.com/segments', // Global segments endpoint
          ...(audienceId ? [`https://api.resend.com/audiences/${audienceId}/segments`] : [])
        ]
        
        for (const segmentsUrl of endpoints) {
          try {
            console.log(`[Segments API] 🔍 Trying endpoint: ${segmentsUrl}`)
            const apiResponse = await fetch(segmentsUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
            })
            
            if (apiResponse.ok) {
              const apiData = await apiResponse.json()
              
              // Parse different response formats
              if (apiData.data && Array.isArray(apiData.data)) {
                segments = apiData.data.map((seg: any) => ({
                  id: seg.id,
                  name: seg.name || 'Unnamed Segment',
                  size: seg.contact_count || seg.size || 0,
                }))
                console.log(`[Segments API] ✅ Found ${segments.length} segments from API`)
                break
              } else if (apiData.segments && Array.isArray(apiData.segments)) {
                segments = apiData.segments.map((seg: any) => ({
                  id: seg.id,
                  name: seg.name || 'Unnamed Segment',
                  size: seg.contact_count || seg.size || 0,
                }))
                console.log(`[Segments API] ✅ Found ${segments.length} segments from API (alt format)`)
                break
              } else if (Array.isArray(apiData)) {
                segments = apiData.map((seg: any) => ({
                  id: seg.id,
                  name: seg.name || 'Unnamed Segment',
                  size: seg.contact_count || seg.size || 0,
                }))
                console.log(`[Segments API] ✅ Found ${segments.length} segments from API (array format)`)
                break
              }
            } else if (apiResponse.status === 404 || apiResponse.status === 405) {
              console.log(`[Segments API] ⚠️ Endpoint ${segmentsUrl} returned ${apiResponse.status}, trying next...`)
              continue
            } else {
              const errorText = await apiResponse.text()
              errorMessage = `API returned ${apiResponse.status}: ${errorText.substring(0, 200)}`
              console.warn(`[Segments API] ⚠️ ${errorMessage}`)
            }
          } catch (endpointError: any) {
            console.warn(`[Segments API] ⚠️ Error calling ${segmentsUrl}:`, endpointError.message)
            errorMessage = endpointError.message
            continue
          }
        }
      }
    } catch (error: any) {
      console.error('[Segments API] ❌ Failed to fetch segments:', error)
      errorMessage = error.message
    }

    if (segments.length === 0 && errorMessage) {
      return NextResponse.json({
        segments: [],
        error: errorMessage,
        message: 'No segments found. Check Resend API configuration and ensure segments exist in your Resend account.'
      })
    }

    return NextResponse.json({ 
      segments,
      count: segments.length,
      ...(errorMessage && { warning: errorMessage })
    })
  } catch (error: any) {
    console.error('[Segments API] ❌ Unexpected error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Unknown error', 
        segments: [],
        message: 'Failed to fetch segments. Check server logs for details.'
      },
      { status: 500 }
    )
  }
}

