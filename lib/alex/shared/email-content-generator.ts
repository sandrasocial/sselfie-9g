/**
 * Email Content Generator
 * Helper function to generate email content using Claude
 */

import { generateText } from 'ai'
import { sql, buildEmailSystemPrompt, stripHtml, generateSubjectLine } from './dependencies'

export interface GenerateEmailContentParams {
  intent: string
  emailType: string
  subjectLine?: string
  keyPoints?: string[]
  tone?: string
  previousVersion?: string
  imageUrls?: string[]
  campaignName?: string
}

export interface GeneratedEmailContent {
  html: string
  subjectLine: string
  preview: string
  readyToSend: boolean
}

export async function generateEmailContent({
  intent,
  emailType,
  subjectLine,
  keyPoints,
  tone = 'warm',
  previousVersion,
  imageUrls,
  campaignName
}: GenerateEmailContentParams): Promise<GeneratedEmailContent> {
  try {
    // 1. Get email templates for this type
    const templates = await sql`
      SELECT body_html, subject_line 
      FROM email_template_library 
      WHERE category = ${emailType} AND is_active = true
      LIMIT 1
    `

    // 2. Get campaign context for link generation
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sselfie.ai'

    const campaignSlug = campaignName
      ? campaignName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : 'email-campaign'

    // 3. Use Claude to generate/refine email content
    const systemPrompt = buildEmailSystemPrompt({
      tone,
      campaignSlug,
      siteUrl,
      imageUrls: imageUrls || [],
      templates: templates.length > 0 ? templates : [],
    })

    const editingInstructions = previousVersion ? `CRITICAL: You are EDITING an existing email. The complete previous version HTML is provided in the user prompt below.

Your task: Make ONLY the specific changes Sandra requested while keeping everything else EXACTLY the same:
- Same structure and layout
- Same brand styling and colors
- Same content (unless specifically asked to change it)
- Same images and links (unless specifically asked to change them)

For small edits (like "add a link" or "change a few words"), make MINIMAL targeted changes. Do NOT rewrite the entire email. Only modify what was explicitly requested.` : ''

    const finalSystemPrompt = editingInstructions ? `${systemPrompt}\n\n${editingInstructions}` : systemPrompt

    const userPrompt = previousVersion
      ? `Edit request: ${intent}

${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `Images to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}
PREVIOUS EMAIL HTML (make the requested changes to this):
${previousVersion}

Remember: Make ONLY the changes I requested. Keep everything else exactly the same.`
      : `${intent}\n\n${keyPoints && keyPoints.length > 0 ? `Key points: ${keyPoints.join(', ')}\n\n` : ''}${imageUrls && imageUrls.length > 0 ? `\nImages to include:\n${imageUrls.map((url, idx) => `- Image ${idx + 1}: ${url}`).join('\n')}\n\n` : ''}`

    // Generate email HTML with timeout protection
    let emailHtmlRaw: string
    let timeoutId: NodeJS.Timeout | null = null
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Email generation timed out after 30 seconds'))
        }, 30000)
      })

      const result = await Promise.race([
        generateText({
          model: "anthropic/claude-sonnet-4-20250514",
          system: finalSystemPrompt,
          prompt: userPrompt,
          maxOutputTokens: 4096,
        }),
        timeoutPromise
      ])

      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      emailHtmlRaw = result.text
    } catch (genError: any) {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      console.error("[Alex] ❌ Email generation failed:", genError)
      throw new Error(`Failed to generate email content: ${genError.message || 'Unknown error'}`)
    }

    // Clean up the HTML response
    let emailHtml = emailHtmlRaw.trim()

    if (!emailHtml || emailHtml.length < 50) {
      throw new Error('Generated email HTML is too short or empty')
    }

    // Remove markdown code blocks
    emailHtml = emailHtml.replace(/^```html\s*/i, '')
    emailHtml = emailHtml.replace(/^```\s*/, '')
    emailHtml = emailHtml.replace(/\s*```$/g, '')
    emailHtml = emailHtml.trim()

    // Ensure images are properly included if imageUrls were provided
    if (imageUrls && imageUrls.length > 0) {
      const missingImages = imageUrls.filter(url => !emailHtml.includes(url))

      if (missingImages.length > 0) {
        console.log(`[Alex] Adding ${missingImages.length} missing images to email HTML`)

        const imageRows = missingImages.map((url, idx) => {
          return `
          <tr>
            <td style="padding: ${idx === 0 ? '0' : '10px'} 0;">
              <img src="${url}" alt="Email image ${idx + 1}" style="width: 100%; max-width: 600px; height: auto; display: block;" />
            </td>
          </tr>`
        }).join('\n')

        const bodyMatch = emailHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
        if (bodyMatch) {
          const bodyContent = bodyMatch[1]
          const mainTableMatch = bodyContent.match(/(<table[^>]*role=["']presentation["'][^>]*>)/i)
          if (mainTableMatch) {
            const bodyTagEndPos = bodyMatch.index! + bodyMatch[0].indexOf('>') + 1
            const tablePosInEmailHtml = bodyTagEndPos + mainTableMatch.index!
            const tableTagEndPos = tablePosInEmailHtml + mainTableMatch[0].length

            emailHtml = emailHtml.substring(0, tableTagEndPos) + 
              imageRows + 
              emailHtml.substring(tableTagEndPos)
          } else {
            const imageTable = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          ${imageRows}
        </table>`
            emailHtml = emailHtml.replace(/<body[^>]*>/i, (match) => match + imageTable)
          }
        } else {
          const imageTable = `
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          ${imageRows}
        </table>`
          emailHtml = imageTable + emailHtml
        }
      }
    }

    // Auto-add unsubscribe link if missing
    if (!emailHtml.includes('RESEND_UNSUBSCRIBE_URL') && !emailHtml.includes('{{{RESEND_UNSUBSCRIBE_URL}}}')) {
      emailHtml += '\n\n<p style="text-align: center; font-size: 12px; color: #666;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a></p>'
    }

    // Generate subject line if not provided
    const finalSubjectLine = subjectLine || await generateSubjectLine(intent, emailType)

    // Generate preview text
    const previewText = stripHtml(emailHtml).substring(0, 200)

    return {
      html: emailHtml,
      subjectLine: finalSubjectLine,
      preview: previewText,
      readyToSend: true
    }
  } catch (error: any) {
    console.error('[Alex] Error generating email content:', error)
    throw error
  }
}

