import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getOrCreateActiveChat, getChatMessages, loadChatById } from "@/lib/data/admin-agent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const requestedChatId = searchParams.get("chatId")

    let chat
    if (requestedChatId) {
      chat = await loadChatById(Number.parseInt(requestedChatId), user.id)
      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 })
      }
    } else {
      // Get or create active chat
      chat = await getOrCreateActiveChat(user.id)
    }

    const messages = await getChatMessages(chat.id)

    // Get all automation sequences that might be referenced in this chat
    // Look for sequences created around the same time as messages
    const automationSequences = await sql`
      SELECT 
        id,
        campaign_name,
        campaign_type,
        status,
        body_html,
        target_audience,
        created_at
      FROM admin_email_campaigns
      WHERE campaign_type = 'resend_automation_sequence'
        AND created_at >= (SELECT MIN(created_at) FROM admin_agent_messages WHERE chat_id = ${chat.id})
        AND created_at <= (SELECT MAX(created_at) FROM admin_agent_messages WHERE chat_id = ${chat.id}) + INTERVAL '1 hour'
      ORDER BY created_at ASC
    `

    const formattedMessages = messages.map((msg) => {
      const baseMessage = {
        id: msg.id.toString(),
        role: msg.role,
        createdAt: msg.created_at,
      }
      
      const content = msg.content || ""
      
      // Check if message has email_preview_data in database (preferred method, similar to Maya's concept_cards)
      // Fallback to extracting from content if email_preview_data is not available
      if (msg.email_preview_data && msg.role === 'assistant') {
        console.log('[v0] Formatting message', msg.id, 'with email_preview_data from database')
        
        try {
          const emailData = typeof msg.email_preview_data === 'string' 
            ? JSON.parse(msg.email_preview_data)
            : msg.email_preview_data
          
          if (emailData && emailData.html && emailData.subjectLine) {
            const parts: any[] = []
            
            // Add text content (everything before the HTML, if any)
            const textBeforeHtml = content.trim()
            if (textBeforeHtml && !textBeforeHtml.includes('<!DOCTYPE html') && !textBeforeHtml.includes('<html')) {
              parts.push({
                type: "text",
                text: textBeforeHtml,
              })
            }
            
            // Add tool result part with email preview data
            parts.push({
              type: "tool-result",
              toolName: "compose_email",
              toolCallId: `tool_${msg.id}`,
              result: {
                html: emailData.html,
                subjectLine: emailData.subjectLine,
                preview: emailData.preview || emailData.html.replace(/<[^>]*>/g, '').substring(0, 200) + '...',
                readyToSend: emailData.readyToSend !== false,
                // Include Flodesk workflow fields
                status: emailData.status || 'draft',
                sentDate: emailData.sentDate || null,
                flodeskCampaignName: emailData.flodeskCampaignName || null,
                analytics: emailData.analytics || null
              }
            })
            
            console.log('[v0] ✅ Formatted email preview from database:', {
              messageId: msg.id,
              htmlLength: emailData.html.length,
              subjectLine: emailData.subjectLine
            })
            
            return {
              ...baseMessage,
              parts,
              content: textBeforeHtml || content, // Keep original content for backward compatibility
            }
          }
        } catch (parseError) {
          console.error('[v0] Failed to parse email_preview_data:', parseError)
          // Fall through to content extraction
        }
      }
      
      // Fallback: Check if message contains email HTML (indicates compose_email tool was used)
      // Similar to how Maya checks for concept_cards
      const hasEmailHtml = content.includes('<!DOCTYPE html') || 
                          content.includes('<html') || 
                          (content.includes('<table') && content.includes('role="presentation"'))
      
      if (hasEmailHtml && msg.role === 'assistant') {
        console.log('[v0] Formatting message', msg.id, 'with email HTML')
        
        // Extract email HTML
        const htmlMatch = content.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>)/i)
        let emailHtml = htmlMatch ? htmlMatch[1] : null
        
        // Unescape HTML if it contains escaped newlines or quotes
        if (emailHtml) {
          emailHtml = emailHtml
            .replace(/\\n/g, '\n') // Convert \\n to actual newlines
            .replace(/\\"/g, '"') // Convert \\" to "
            .replace(/\\'/g, "'") // Convert \\' to '
            .replace(/\\t/g, '\t') // Convert \\t to tabs
        }
        
        // Extract subject line
        let subjectLine = ''
        const subjectMatch = content.match(/(?:subject|Subject)[\s:]+([^\n<]+)/i)
        if (subjectMatch) {
          subjectLine = subjectMatch[1].trim()
        } else {
          // Try to extract from HTML title tag
          if (emailHtml) {
            const titleMatch = emailHtml.match(/<title[^>]*>([^<]+)<\/title>/i)
            if (titleMatch) {
              subjectLine = titleMatch[1].trim()
            } else {
              // Fallback: use first heading
              const headingMatch = emailHtml.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/i)
              if (headingMatch) {
                subjectLine = headingMatch[1].trim()
              } else {
                subjectLine = 'Email Campaign'
              }
            }
          }
        }
        
        // Generate preview text
        const previewText = emailHtml 
          ? emailHtml.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
          : content.substring(0, 200) + '...'
        
        if (emailHtml && subjectLine) {
          // Format as tool result part (similar to Maya's tool-generateConcepts)
          const parts: any[] = []
          
          // Add text content (everything before the HTML)
          const textBeforeHtml = content.substring(0, content.indexOf(emailHtml)).trim()
          if (textBeforeHtml) {
            parts.push({
              type: "text",
              text: textBeforeHtml,
            })
          }
          
          // Add tool result part with email preview data
          // Ensure HTML is not escaped - it should be raw HTML string
          const emailHtmlClean = emailHtml.trim()
          parts.push({
            type: "tool-result",
            toolName: "compose_email",
            toolCallId: `tool_${msg.id}`,
            result: {
              html: emailHtmlClean, // Raw HTML string, not escaped
              subjectLine: subjectLine.trim(),
              preview: previewText.trim(),
              readyToSend: true
            }
          })
          
          console.log('[v0] ✅ Formatted email preview:', {
            messageId: msg.id,
            htmlLength: emailHtmlClean.length,
            htmlPreview: emailHtmlClean.substring(0, 100),
            subjectLine: subjectLine.trim()
          })
          
          return {
            ...baseMessage,
            parts,
            content: textBeforeHtml || content, // Keep original content for backward compatibility
          }
        }
      }
      
      // Check if this message mentions or references an automation sequence
      // Look for automation sequences created around the same time (±30 minutes)
      if (msg.role === 'assistant' && automationSequences.length > 0) {
        const messageTime = new Date(msg.created_at)
        
        for (const seq of automationSequences) {
          const seqTime = new Date(seq.created_at)
          const timeDiff = Math.abs(messageTime.getTime() - seqTime.getTime())
          
          // Check if sequence was created within 30 minutes of this message
          if (timeDiff <= 30 * 60 * 1000) {
            // Check if message content mentions sequence name or contains automation-related keywords
            const contentLower = content.toLowerCase()
            const seqNameLower = seq.campaign_name?.toLowerCase() || ''
            const mentionsSequence = seqNameLower && contentLower.includes(seqNameLower)
            const mentionsAutomation = contentLower.includes('automation') || 
                                      contentLower.includes('sequence') ||
                                      contentLower.includes('created!') ||
                                      contentLower.includes('ready') ||
                                      contentLower.includes('emails ready') ||
                                      contentLower.includes('photoshoot') ||
                                      contentLower.includes('studio upgrade') ||
                                      contentLower.includes('upgrade')
            
            // If message mentions automation or sequence name, OR if it's the closest message in time to the sequence, add tool result part
            // Also check if this is the only sequence and the message is within 5 minutes (likely related)
            // OR if the message was created right after the sequence (within 2 minutes) - likely the response that created it
            const isClosestMessage = timeDiff <= 5 * 60 * 1000 // Within 5 minutes
            const isOnlySequence = automationSequences.length === 1
            const isRightAfterSequence = messageTime.getTime() >= seqTime.getTime() && timeDiff <= 2 * 60 * 1000 // Message created within 2 min after sequence
            
            if (mentionsSequence || mentionsAutomation || (isClosestMessage && isOnlySequence) || isRightAfterSequence) {
              console.log('[v0] 🔍 Matching automation sequence to message:', {
                messageId: msg.id,
                sequenceId: seq.id,
                mentionsSequence,
                mentionsAutomation,
                isClosestMessage,
                isOnlySequence,
                isRightAfterSequence,
                timeDiffMinutes: Math.round(timeDiff / 1000 / 60)
              })
              try {
                // Parse sequence data from body_html
                let sequenceData = null
                try {
                  sequenceData = typeof seq.body_html === 'string' 
                    ? JSON.parse(seq.body_html)
                    : seq.body_html
                } catch (e) {
                  // If parsing fails, construct from campaign data
                  const targetAudience = seq.target_audience || {}
                  sequenceData = {
                    sequenceName: seq.campaign_name,
                    segmentId: targetAudience.resend_segment_id,
                    segmentName: targetAudience.segment_name,
                    triggerType: targetAudience.trigger_type || 'immediate',
                    emails: targetAudience.sequence_emails || [],
                    totalEmails: targetAudience.sequence_emails?.length || 0,
                    status: seq.status || 'draft'
                  }
                }

                if (sequenceData && sequenceData.emails && sequenceData.emails.length > 0) {
                  const parts: any[] = []
                  
                  // Add text content
                  if (content.trim()) {
                    parts.push({
                      type: "text",
                      text: content,
                    })
                  }
                  
                  // Add automation sequence tool result
                  parts.push({
                    type: "tool-result",
                    toolName: "create_resend_automation_sequence",
                    toolCallId: `automation_${seq.id}`,
                    result: {
                      success: true,
                      type: "resend_automation_sequence",
                      data: {
                        sequenceId: seq.id,
                        sequenceName: sequenceData.sequenceName || seq.campaign_name,
                        segmentId: sequenceData.segmentId,
                        segmentName: sequenceData.segmentName,
                        triggerType: sequenceData.triggerType,
                        emails: sequenceData.emails,
                        totalEmails: sequenceData.emails.length,
                        status: sequenceData.status || seq.status || 'draft'
                      },
                      message: `Automation sequence created! ✨ "${sequenceData.sequenceName || seq.campaign_name}" with ${sequenceData.emails.length} emails ready.`,
                      displayCard: true
                    }
                  })

                  console.log('[v0] ✅ Added automation sequence tool result to message:', {
                    messageId: msg.id,
                    sequenceId: seq.id,
                    sequenceName: sequenceData.sequenceName || seq.campaign_name,
                    emailCount: sequenceData.emails.length
                  })

                  return {
                    ...baseMessage,
                    parts,
                    content: content, // Keep original content
                  }
                }
              } catch (error) {
                console.error('[v0] Error adding automation sequence to message:', error)
                // Fall through to regular message formatting
              }
            }
          }
        }
      }
      
      // Regular message - format normally
      return {
        ...baseMessage,
        parts: [
          {
            type: "text",
            text: content,
          },
        ],
      }
    })

    return NextResponse.json({
      chatId: chat.id,
      chatTitle: chat.chat_title,
      messages: formattedMessages,
    })
  } catch (error: any) {
    console.error("[v0] Error loading admin chat:", error)
    console.error("[v0] Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json({ 
      error: "Failed to load chat",
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 })
  }
}
