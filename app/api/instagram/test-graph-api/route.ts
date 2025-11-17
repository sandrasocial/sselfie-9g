import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }

    console.log('[v0] Testing Graph API with provided token')

    const results = {
      step1_user: null as any,
      step2_pages: null as any,
      step3_instagram_accounts: [] as any[],
      step4_insights: [] as any[],
      errors: [] as string[],
    }

    // Step 1: Get user info
    try {
      const userResponse = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${accessToken}`
      )
      const userData = await userResponse.json()
      
      if (userData.error) {
        results.errors.push(`User fetch error: ${userData.error.message}`)
      } else {
        results.step1_user = userData
        console.log('[v0] User fetched:', userData)
      }
    } catch (error: any) {
      results.errors.push(`User fetch failed: ${error.message}`)
    }

    // Step 2: Get Facebook Pages
    try {
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${accessToken}`
      )
      const pagesData = await pagesResponse.json()
      
      if (pagesData.error) {
        results.errors.push(`Pages fetch error: ${pagesData.error.message}`)
      } else {
        results.step2_pages = pagesData
        console.log('[v0] Pages fetched:', pagesData.data?.length || 0, 'pages')

        // Step 3: Get Instagram accounts for each page
        if (pagesData.data && pagesData.data.length > 0) {
          for (const page of pagesData.data) {
            try {
              const igResponse = await fetch(
                `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${page.access_token}`
              )
              const igData = await igResponse.json()
              
              if (igData.instagram_business_account) {
                results.step3_instagram_accounts.push({
                  page_id: page.id,
                  page_name: page.name,
                  instagram: igData.instagram_business_account,
                })
                console.log('[v0] Instagram account found:', igData.instagram_business_account.username)

                // Step 4: Get Instagram insights
                try {
                  const insightsResponse = await fetch(
                    `https://graph.facebook.com/v21.0/${igData.instagram_business_account.id}/insights?metric=impressions,reach,follower_count,profile_views&period=day&access_token=${page.access_token}`
                  )
                  const insightsData = await insightsResponse.json()
                  
                  if (insightsData.error) {
                    results.errors.push(`Insights error for ${igData.instagram_business_account.username}: ${insightsData.error.message}`)
                  } else {
                    results.step4_insights.push({
                      account: igData.instagram_business_account.username,
                      insights: insightsData.data,
                    })
                    console.log('[v0] Insights fetched for:', igData.instagram_business_account.username)
                  }
                } catch (error: any) {
                  results.errors.push(`Insights fetch failed: ${error.message}`)
                }
              }
            } catch (error: any) {
              results.errors.push(`Instagram account fetch failed for page ${page.name}: ${error.message}`)
            }
          }
        }
      }
    } catch (error: any) {
      results.errors.push(`Pages fetch failed: ${error.message}`)
    }

    // Summary
    const summary = {
      success: results.errors.length === 0,
      user_found: !!results.step1_user,
      pages_found: results.step2_pages?.data?.length || 0,
      instagram_accounts_found: results.step3_instagram_accounts.length,
      insights_fetched: results.step4_insights.length,
      total_errors: results.errors.length,
    }

    return NextResponse.json({
      summary,
      results,
      message: summary.success 
        ? 'All tests passed! Your Graph API integration is working correctly.' 
        : 'Some tests failed. Check the errors array for details.',
    })
  } catch (error: any) {
    console.error('[Graph API Test Error]:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error.message 
    }, { status: 500 })
  }
}
