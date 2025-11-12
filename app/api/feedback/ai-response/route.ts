import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const maxDuration = 30

// Knowledge base about SSELFIE features for AI context
const SSELFIE_KNOWLEDGE = `
# SSELFIE Studio - Complete User Journey & Features

## How SSELFIE Works (User Journey)
1. **Sign Up & Train Your Model** - Upload 10-20 photos of yourself to create your personal AI model (3-5 min training)
2. **Chat with Maya** - AI art director helps you create photo concepts and prompts
3. **Generate Images** - Create photos using your trained model (costs 1 credit per image)
4. **Review in Gallery** - ALL images automatically save to your gallery for review
5. **Download or Delete** - Keep what you love, delete what you don't

## Credits System - How It Works
- **1 Credit = 1 Image Generation** (saved to gallery automatically)
- **25 Credits = 1 Training Session** (create/retrain your AI model)
- **Studio Membership ($47/month)** - Unlimited credits + early access to new features
- **One-Time Packages** - Purchase credit packs: 50, 100, or 250 credits
- Credits never expire
- No refunds on generated images (since they're created instantly)

## Gallery Management
- **Auto-Save**: ALL generated images are automatically saved to your gallery
- **Why Auto-Save?**: Images are created instantly (can't preview before generation)
- **Review & Delete**: Users can delete unwanted images from gallery anytime
- **No Credit Refunds**: Since generation happens instantly, credits are used immediately
- **Best Practice**: Generate multiple variations and keep the best ones

## Training Your Model
- **Upload 10-20 photos** - Mix of angles, lighting, expressions
- **3-5 minute training** - Flux Fast Trainer processes your photos
- **Adjust Settings**: Use the sliders in chat to fine-tune generations:
  - Identity Strength: How much you look like yourself (higher = more accurate)
  - Creativity: How artistic/stylized the output is
  - Detail Level: Sharpness and clarity
- **Retrain Anytime**: Upload new photos to improve your model (costs 25 credits)

## Generation Settings (Inside Chat)
Users can adjust sliders in the chat input area:
- **Identity Strength** (0-100%): Controls facial likeness
  - Low (20-40%): More artistic, less exact match
  - Medium (50-70%): Balanced realism
  - High (80-100%): Maximum facial accuracy (best for close-ups)
- **Style Intensity**: How strongly the prompt style is applied
- **Image Quality**: Resolution and detail level

## Common Issues & Solutions

### "Close-up doesn't look like me"
- Solution: Increase Identity Strength slider to 80-100% in chat settings
- Alternative: Retrain model with more clear close-up photos
- Tip: Try generating 3-4 variations and pick the best one

### "Image went straight to gallery, didn't get to approve"
- Explanation: ALL images auto-save to gallery for review (by design)
- Why: Images generate instantly, so there's no "preview" step
- Solution: Review gallery and delete unwanted images
- Note: Credits are used when generating (no refunds for deletions)

### "Want to delete image and get credit back"
- Policy: No credit refunds (images generated instantly, like taking a photo)
- Solution: Generate new variations, adjust settings, keep favorites
- Alternative: Delete unwanted images from gallery anytime

### "Upload freezing or failing"
- Check file sizes (max 10MB per image)
- Try compressing images first
- Use 10-15 photos instead of 20
- Mobile users: Try desktop browser if issues persist

## Sandra's Communication Style
- Warm, personal, and encouraging
- Uses "xo Sandra" signature
- Reads every message personally
- Empathetic to frustrations
- Solution-focused (offers alternatives)
- Educates users about how features work
- Celebrates user successes
- Professional but friendly
- Never defensive about app limitations

## Key Phrases to Use
- "I read every message personally"
- "Let me explain how this works"
- "Here's what I recommend"
- "I totally understand your frustration"
- "You can adjust the settings in chat"
- "All images save to gallery for easy review"
- "Try adjusting the Identity Strength slider"
- "Generate a few variations and pick your favorite"

## Files by Feature (for Bug Analysis)
- Authentication: app/auth/callback/route.ts, middleware.ts
- Training: app/api/training/*, components/sselfie/training-screen.tsx
- Upload: app/api/upload/route.ts, app/api/training/upload-zip/route.ts  
- Generation: app/api/studio/generate/route.ts, app/api/maya/chat/route.ts
- Gallery: app/(protected)/gallery/page.tsx, components/sselfie/gallery-screen.tsx
- Credits: lib/credits.ts, app/api/credits/*
- Payment: app/api/stripe/*, components/pricing/*
`

async function analyzeBugSeverity(feedback: any): Promise<BugAnalysis | null> {
  // Only analyze bugs and general feedback that might be bugs
  if (feedback.type !== "bug" && feedback.type !== "general") {
    return null
  }

  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    prompt: `Analyze this user feedback for bug severity and provide structured analysis.

User Feedback:
Type: ${feedback.type}
Subject: ${feedback.subject}
Message: ${feedback.message}

${SSELFIE_KNOWLEDGE}

Analyze:
1. Is this a bug or technical issue? (yes/no)
2. Severity: critical/high/low
   - Critical: Payment failure, auth completely broken, data loss, security issue
   - High: Feature broken, poor UX affecting many, upload/generation failures
   - Low: Minor UI issues, enhancement requests, confusion
3. Category: authentication, upload, payment, generation, training, mobile, ui, other
4. Likely cause (brief technical explanation)
5. Suggested files to check (array of file paths from the knowledge base)
6. Needs admin alert? (true for critical issues only)

IMPORTANT: Respond with ONLY the JSON object, no markdown code blocks or backticks.

{
  "isBug": boolean,
  "severity": "critical" | "high" | "low",
  "category": string,
  "likelyCause": string,
  "suggestedFiles": string[],
  "needsAlert": boolean
}`,
  })

  try {
    let cleanedText = text.trim()

    // Remove markdown code block syntax if present
    if (cleanedText.startsWith("```")) {
      // Remove opening \`\`\`json or \`\`\`
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "")
      // Remove closing \`\`\`
      cleanedText = cleanedText.replace(/\n?```$/, "")
    }

    const analysis = JSON.parse(cleanedText)
    if (!analysis.isBug) return null

    return {
      severity: analysis.severity,
      category: analysis.category,
      likelyCause: analysis.likelyCause,
      suggestedFiles: analysis.suggestedFiles || [],
      needsAlert: analysis.needsAlert,
    }
  } catch (error) {
    console.error("[v0] Failed to parse bug analysis:", error)
    console.error("[v0] Raw text:", text)
    return null
  }
}

async function generateResponseDraft(
  feedback: any,
  bugAnalysis: BugAnalysis | null,
  refinementPrompt?: string,
): Promise<string> {
  const userContext = `
User: ${feedback.user_name || "Unknown"} (${feedback.user_email || "No email"})
Type: ${feedback.type}
Subject: ${feedback.subject}
Message: ${feedback.message}
${bugAnalysis ? `\nBug Analysis: ${bugAnalysis.severity} severity - ${bugAnalysis.likelyCause}` : ""}
${refinementPrompt ? `\nRefinement Request: ${refinementPrompt}` : ""}
`

  const { text } = await generateText({
    model: "openai/gpt-4o-mini",
    prompt: `You are Sandra, the founder of SSELFIE Studio. Generate a warm, personal response to this user feedback.

${userContext}

${SSELFIE_KNOWLEDGE}

Guidelines for this specific response:
- Address the user's specific concern about their experience
- If they're confused about how features work, EXPLAIN the user journey clearly
- For gallery/credit questions: Explain auto-save, review process, and no-refund policy warmly
- For generation quality: Guide them to adjust Identity Strength slider in chat (80-100% for close-ups)
- Be empathetic about frustrations but educate about how the app works
- Offer practical solutions (adjust settings, try variations, retrain model)
- Keep it 4-6 sentences (concise but complete)
- Sign off with "xo Sandra"

${refinementPrompt ? `IMPORTANT: The admin wants you to adjust the response: ${refinementPrompt}` : ""}

Generate the email response (just the body, no subject line):`,
  })

  return text.trim()
}

async function sendCriticalAlertEmail(feedback: any, bugAnalysis: BugAnalysis) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: ["ssa@ssasocial.no", "hello@sselfie.ai"],
        subject: `Critical Issue Detected: ${bugAnalysis.category.toUpperCase()}`,
        template: "critical-bug-alert",
        data: {
          feedbackId: feedback.id,
          severity: bugAnalysis.severity,
          category: bugAnalysis.category,
          subject: feedback.subject,
          message: feedback.message,
          userName: feedback.user_name || "Unknown",
          userEmail: feedback.user_email || "No email",
          likelyCause: bugAnalysis.likelyCause,
          suggestedFiles: bugAnalysis.suggestedFiles,
          createdAt: feedback.created_at,
        },
      }),
    })

    if (!response.ok) {
      console.error("[v0] Failed to send critical alert email")
    }
  } catch (error) {
    console.error("[v0] Error sending critical alert email:", error)
  }
}

interface BugAnalysis {
  severity: "critical" | "high" | "low"
  category: string
  likelyCause: string
  suggestedFiles: string[]
  needsAlert: boolean
}

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const isAdmin = user.email === process.env.ADMIN_EMAIL

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { feedbackId, refinementPrompt } = await request.json()

    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback ID required" }, { status: 400 })
    }

    console.log("[v0] Generating AI response for feedback:", feedbackId)
    if (refinementPrompt) {
      console.log("[v0] With refinement:", refinementPrompt)
    }

    const feedbackResult = await sql`
      SELECT id, user_id, user_email, user_name, type, subject, message, 
             images, status, created_at
      FROM feedback
      WHERE id = ${feedbackId}
    `

    if (feedbackResult.length === 0) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 })
    }

    const feedback = feedbackResult[0]
    console.log("[v0] Found feedback:", feedback.subject)

    // Only analyze bugs on initial generation (not refinements)
    let bugAnalysis = null
    if (!refinementPrompt) {
      console.log("[v0] Analyzing bug severity...")
      bugAnalysis = await analyzeBugSeverity(feedback)
      console.log("[v0] Bug analysis complete:", bugAnalysis)
    }

    console.log("[v0] Generating response draft...")
    const responseDraft = await generateResponseDraft(feedback, bugAnalysis, refinementPrompt)
    console.log("[v0] Response draft generated")

    // Only store on initial generation (not refinements)
    if (!refinementPrompt) {
      try {
        await sql`
          INSERT INTO feedback_ai_responses (feedback_id, ai_generated_response, tone_used)
          VALUES (${feedbackId}, ${responseDraft}, ${"warm"})
        `
        console.log("[v0] AI response stored in database")
      } catch (insertError) {
        console.error("[v0] Failed to store AI response:", insertError)
      }

      if (bugAnalysis) {
        console.log("[v0] Storing bug analysis...")
        try {
          const pgArray = `{${bugAnalysis.suggestedFiles.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(",")}}`

          await sql`
            INSERT INTO feedback_bug_analysis (
              feedback_id, severity, category, likely_cause, 
              suggested_files, admin_alerted, alert_sent_at
            )
            VALUES (
              ${feedbackId}, 
              ${bugAnalysis.severity}, 
              ${bugAnalysis.category}, 
              ${bugAnalysis.likelyCause},
              ${pgArray},
              ${bugAnalysis.needsAlert},
              ${bugAnalysis.needsAlert ? new Date().toISOString() : null}
            )
          `
          console.log("[v0] Bug analysis stored")
        } catch (analysisError) {
          console.error("[v0] Failed to store bug analysis:", analysisError)
        }

        if (bugAnalysis.needsAlert) {
          console.log("[v0] Sending critical alert email...")
          await sendCriticalAlertEmail(feedback, bugAnalysis)
        }
      }
    }

    console.log("[v0] AI response generation complete")

    return NextResponse.json({
      success: true,
      responseDraft,
      bugAnalysis,
    })
  } catch (error) {
    console.error("[v0] Error generating AI response:", error)
    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
