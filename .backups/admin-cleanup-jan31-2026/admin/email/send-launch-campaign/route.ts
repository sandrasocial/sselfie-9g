import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const audienceId = process.env.RESEND_AUDIENCE_ID

    if (!audienceId) {
      return NextResponse.json(
        {
          error:
            "RESEND_AUDIENCE_ID not configured. Please add your Resend audience ID to environment variables in the Vars section of the sidebar.",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Creating broadcast for audience:", audienceId)

    const fromAddress = "Sandra from SSELFIE <hello@sselfie.ai>"

    console.log("[v0] Using sender address:", fromAddress)

    const broadcast = await resend.broadcasts.create({
      audienceId: audienceId,
      from: fromAddress,
      subject: "🚨 THE DOORS ARE OPEN - SSELFIE Studio Beta is LIVE",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>THE DOORS ARE OPEN 🚨</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #fafaf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          
          <!-- Hero Image -->
          <tr>
            <td style="padding: 0;">
              <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1053-fltQEJEqPNk8YEHba1hPm2R1mOHcFc-6fUsJ79dRJRnK38O9iNRmryvwMTA42.png" alt="SSELFIE Studio Beta Launch" style="width: 100%; height: auto; display: block;" />
            </td>
          </tr>
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 30px 20px; text-align: center;">
              <h1 style="margin: 0 0 16px; color: #1c1917; font-size: 32px; font-weight: 600; line-height: 1.2;">
                THE DOORS ARE OPEN. 🚨
              </h1>
              <p style="margin: 0; color: #57534e; font-size: 16px; font-weight: 300; line-height: 1.6; font-style: italic;">
                After 6 months of building... After 2 crashed launches... After crying, rebuilding, and learning more about myself than I ever expected...
              </p>
            </td>
          </tr>
          
          <!-- Main Message -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <p style="margin: 0 0 20px; color: #1c1917; font-size: 20px; font-weight: 500; text-align: center;">
                SSELFIE Studio Beta is officially LIVE.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                {{{FIRST_NAME|Hey}}}, I'm not going to make this long and salesy because honestly? If you've been following this journey, you already know what this is about.
              </p>
              
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                This is for the woman who's tired of hiding.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The entrepreneur who knows she needs to show her face but keeps putting it off.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The creator who's done using the same 5 selfies from 2 years ago.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                The coach who wants to look professional but can't afford a $2000 photoshoot.
              </p>
              
              <p style="margin: 20px 0 16px; color: #292524; font-size: 15px; font-weight: 400; line-height: 1.7;">
                This is your photography studio. Your creative team. Your content library.
              </p>
              <p style="margin: 0 0 16px; color: #292524; font-size: 15px; font-weight: 300; line-height: 1.7;">
                All powered by AI that actually understands YOUR brand.
              </p>
            </td>
          </tr>
          
          <!-- Pricing Cards -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <h2 style="margin: 0 0 24px; color: #1c1917; font-size: 20px; font-weight: 500; text-align: center;">
                Choose your Beta experience:
              </h2>
              
              <!-- One-Time Session Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                  <td style="background-color: #fafaf9; border-radius: 12px; border: 2px solid #e7e5e4; padding: 28px;">
                    <h3 style="margin: 0 0 8px; color: #1c1917; font-size: 18px; font-weight: 600;">
                      ONE-TIME SESSION
                    </h3>
                    <p style="margin: 0 0 4px; color: #1c1917; font-size: 28px; font-weight: 700;">
                      $24.50
                    </p>
                    <p style="margin: 0 0 4px; color: #a8a29e; font-size: 13px; font-weight: 300; text-decoration: line-through;">
                      Regular $49
                    </p>
                    <p style="margin: 0 0 20px; color: #78716c; font-size: 14px; font-weight: 300;">
                      Perfect for testing the basics
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.8;">
                      <li>Custom AI model trained on YOUR photos</li>
                      <li>50 professional images with Maya</li>
                      <li>Experience the SSELFIE magic before committing</li>
                    </ul>
                    <a href="https://sselfie.ai/studio?checkout=one_time" style="display: block; background-color: #1c1917; color: #fafaf9; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">
                      TRY ONCE
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Studio Membership Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background-color: #1c1917; border-radius: 12px; border: 3px solid #292524; padding: 28px; position: relative;">
                    <div style="background-color: #ef4444; color: #ffffff; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">
                      BETA SPECIAL
                    </div>
                    <h3 style="margin: 0 0 8px; color: #fafaf9; font-size: 18px; font-weight: 600;">
                      SSELFIE STUDIO
                    </h3>
                    <p style="margin: 0 0 4px; color: #fafaf9; font-size: 28px; font-weight: 700;">
                      $48.50<span style="font-size: 16px; font-weight: 400; color: #d6d3d1;">/month</span>
                    </p>
                    <p style="margin: 0 0 4px; color: #a8a29e; font-size: 13px; font-weight: 300; text-decoration: line-through;">
                      Regular $97/mo
                    </p>
                    <p style="margin: 0 0 20px; color: #d6d3d1; font-size: 14px; font-weight: 300;">
                      50% OFF FOREVER as a founding member
                    </p>
                    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #e7e5e4; font-size: 14px; font-weight: 300; line-height: 1.8;">
                      <li>Custom AI model trained on YOUR photos</li>
                      <li>200 credits monthly (~100 Pro photos OR ~200 Classic photos)</li>
                      <li>Full academy with video courses & templates</li>
                      <li>Feed Designer for content planning</li>
                      <li>Monthly drops with newest strategies</li>
                      <li>Direct access to ME for support</li>
                    </ul>
                    <a href="https://sselfie.ai/studio?checkout=studio_membership" style="display: block; background-color: #fafaf9; color: #1c1917; padding: 14px 24px; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; text-align: center;">
                      CLAIM YOUR SPOT
                    </a>
                    <p style="margin: 16px 0 0; color: #d6d3d1; font-size: 12px; font-weight: 300; text-align: center;">
                      🏆 Founding member badge included
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Personal Note -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #fafaf9; border-left: 3px solid #292524; padding: 20px; border-radius: 4px;">
                <p style="margin: 0 0 12px; color: #292524; font-size: 14px; font-weight: 300; line-height: 1.7;">
                  Beta spots are limited because I want to personally support every single person who joins. This isn't some massive faceless platform. It's my baby. And I care about YOUR success.
                </p>
                <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; font-style: italic;">
                  P.S. We already had 30 founding members join in the first 2 hours. Only 10 days left at this beta price.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #fafaf9; border-top: 1px solid #e7e5e4;">
              <h1 style="margin: 0 0 20px; color: #1c1917; font-size: 28px; font-weight: 300; letter-spacing: 0.3em; text-transform: uppercase; font-family: Georgia, serif; text-align: center;">
                S S E L F I E
              </h1>
              <p style="margin: 0 0 12px; color: #57534e; font-size: 13px; font-weight: 300; line-height: 1.6; text-align: center;">
                Questions? Just reply to this email—I read every message.
              </p>
              <p style="margin: 0; color: #57534e; font-size: 13px; font-weight: 300; text-align: center;">
                XoXo Sandra 💋
              </p>
              <p style="margin: 16px 0; color: #a8a29e; font-size: 11px; font-weight: 300; text-align: center;">
                <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: #a8a29e; text-decoration: underline;">Unsubscribe</a>
              </p>
              <p style="margin: 0; color: #a8a29e; font-size: 11px; font-weight: 300; text-align: center;">
                © ${new Date().getFullYear()} SSELFIE. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    })

    console.log("[v0] Broadcast created successfully:", broadcast)

    return NextResponse.json({
      success: true,
      broadcastId: broadcast.data?.id,
      message: `Broadcast created successfully from hello@sselfie.ai! Visit your Resend dashboard to review and send.`,
      instructions: [
        "1. Go to https://resend.com/broadcasts",
        "2. Find your broadcast (should be at the top)",
        "3. Review the email preview",
        '4. Click "Send" when ready to send to all 2,649 subscribers',
      ],
    })
  } catch (error: any) {
    console.error("[v0] Error creating broadcast:", error)

    if (error.message?.includes("domain is not verified")) {
      return NextResponse.json(
        {
          error: "Domain not verified",
          details: `Your sselfie.ai domain needs to be verified in Resend before sending broadcasts.`,
          instructions: [
            "Go to https://resend.com/domains",
            "Verify that sselfie.ai is properly configured",
            "Then try sending the broadcast again",
          ],
        },
        { status: 403 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to create broadcast",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}
