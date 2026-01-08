import { type NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"

export async function POST(req: NextRequest) {
  try {
    const { email, name, concepts, blueprint } = await req.json()

    if (!email || !concepts || concepts.length === 0) {
      console.error("[v0] Invalid email request:", { email: !!email, conceptCount: concepts?.length })
      return NextResponse.json({ error: "Email and concepts are required" }, { status: 400 })
    }

    console.log("[v0] Emailing full blueprint:", { email, name, conceptCount: concepts.length })

    const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Times New Roman', serif; color: #292524; background-color: #fafaf9; }
              .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; background: white; }
              h1 { font-size: 32px; font-weight: 300; letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px; }
              h2 { font-size: 24px; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase; margin: 40px 0 20px; border-bottom: 2px solid #292524; padding-bottom: 10px; }
              h3 { font-size: 18px; font-weight: 500; margin-bottom: 12px; }
              p { font-size: 14px; line-height: 1.6; color: #57534e; margin-bottom: 16px; }
              .concept { margin-bottom: 40px; border: 1px solid #e7e5e4; padding: 20px; border-radius: 8px; }
              .concept img { width: 100%; border-radius: 8px; margin-bottom: 16px; }
              .concept h3 { font-size: 18px; font-weight: 500; margin-bottom: 8px; }
              .concept p { font-size: 13px; color: #78716c; }
              .caption-template { background: #fafaf9; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #292524; }
              .caption-template h4 { font-size: 14px; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; }
              .caption-template pre { font-size: 12px; white-space: pre-wrap; word-wrap: break-word; font-family: -apple-system, sans-serif; line-height: 1.5; }
              .calendar-week { margin-bottom: 30px; }
              .calendar-day { background: #fafaf9; padding: 12px; margin-bottom: 12px; border-radius: 6px; }
              .calendar-day .day-number { font-weight: bold; color: #292524; }
              .calendar-day .day-type { display: inline-block; padding: 4px 12px; background: #292524; color: white; font-size: 10px; border-radius: 12px; margin-left: 8px; text-transform: uppercase; }
              .score-box { background: #292524; color: white; padding: 30px; text-align: center; border-radius: 8px; margin: 30px 0; }
              .score-box .score { font-size: 64px; font-weight: 300; }
              .cta { background: #292524; color: white; padding: 16px 32px; text-align: center; text-decoration: none; display: inline-block; margin-top: 30px; border-radius: 4px; font-size: 12px; letter-spacing: 0.2em; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>YOUR BRAND BLUEPRINT</h1>
              <p>Hi ${name || "there"}! 👋</p>
              <p>Your personalized brand blueprint is ready! Everything you need to stay visible and build your brand is right here.</p>
              
              ${
                blueprint?.score
                  ? `
              <div class="score-box">
                <div>YOUR BRAND SCORE</div>
                <div class="score">${blueprint.score}</div>
                <div style="font-size: 12px; margin-top: 10px;">OUT OF 100</div>
              </div>
              `
                  : ""
              }
              
              <h2>YOUR CONCEPT CARDS</h2>
              <p>Use these as inspiration for your next content photoshoot!</p>
              ${concepts
                .map(
                  (concept: any) => `
                <div class="concept">
                  <img src="${concept.imageUrl}" alt="${concept.title}" />
                  <h3>${concept.title}</h3>
                  <p>${concept.prompt}</p>
                </div>
              `,
                )
                .join("")}
              
              <h2>CAPTION TEMPLATES</h2>
              <p>Copy, paste, and personalize these proven templates:</p>
              
              ${
                blueprint?.captionTemplates
                  ? Object.entries(blueprint.captionTemplates)
                      .map(
                        ([category, templates]: [string, any]) => `
                <h3 style="margin-top: 30px; text-transform: uppercase;">${category === "cta" ? "CALL TO ACTION" : category} CAPTIONS</h3>
                ${templates
                  .map(
                    (template: any) => `
                  <div class="caption-template">
                    <h4>${template.title}</h4>
                    <pre>${template.template}</pre>
                  </div>
                `,
                  )
                  .join("")}
              `,
                      )
                      .join("")
                  : ""
              }
              
              <h2>YOUR 30-DAY CONTENT CALENDAR</h2>
              <p>No more "what should I post today?" moments. Here's your whole month planned out!</p>
              
              ${
                blueprint?.contentCalendar
                  ? Object.entries(blueprint.contentCalendar)
                      .map(
                        ([week, days]: [string, any]) => `
                <div class="calendar-week">
                  <h3>${week.replace("week", "WEEK ")}</h3>
                  ${days
                    .map(
                      (day: any) => `
                    <div class="calendar-day">
                      <span class="day-number">Day ${day.day}</span>
                      <span class="day-type">${day.type}</span>
                      <div style="margin-top: 8px;"><strong>${day.title}</strong></div>
                      <div style="font-size: 12px; color: #78716c; margin-top: 4px;">${day.caption}</div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              `,
                      )
                      .join("")
                  : ""
              }
              
              <h2>READY TO SHOW UP?</h2>
              <p>SSELFIE Studio makes implementing this strategy effortless. Get photos that look like you, automated content planning, and Maya's personalized coaching.</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/checkout/one-time" class="cta">Join SSELFIE Studio →</a>
              </p>
              
              <p style="margin-top: 40px; font-size: 12px; color: #a8a29e; text-align: center;">
                Questions? Just reply to this email - Maya (and the team) are here to help!
              </p>
            </div>
          </body>
        </html>
      `

    const emailText = `Hi ${name || "there"}! 👋\n\nYour personalized brand blueprint is ready! Everything you need to stay visible and build your brand is right here.\n\nView your blueprint online to see all your concept cards, caption templates, and 30-day content calendar.`

    const result = await sendEmail({
      from: "SSELFIE <hello@sselfie.ai>",
      to: email,
      subject: `${name ? name + ", y" : "Y"}our Brand Blueprint is Ready! 📸`,
      html: emailHtml,
      text: emailText,
      emailType: "blueprint",
    })

    if (!result.success) {
      console.error("[v0] Failed to send blueprint email:", result.error)
      
      // Handle test mode error with user-friendly message
      if (result.error?.includes("Test mode") || result.error?.includes("whitelist")) {
        return NextResponse.json(
          { 
            error: "Email sending is in test mode. Your email address needs to be whitelisted. Please contact support or try again later.",
            testMode: true,
          },
          { status: 403 },
        )
      }
      
      return NextResponse.json(
        { error: result.error || "Failed to email blueprint" },
        { status: 500 },
      )
    }

    console.log("[v0] Blueprint emailed successfully:", result.messageId)

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    console.error("[v0] Error emailing blueprint:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to email blueprint" },
      { status: 500 },
    )
  }
}
