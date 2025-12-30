"use client"

import { useState, useEffect, useRef, useMemo } from 'react'
import { Mail, Eye, Send, Calendar, Edit, TestTube } from 'lucide-react'

interface EmailPreviewCardProps {
  subject: string
  preview: string
  htmlContent: string
  targetSegment: string
  targetCount: number
  campaignId?: number // Optional campaign ID if campaign already exists
  campaignType?: 'loops_campaign' | 'resend' | 'resend_campaign' // Type of email campaign
  onEdit: () => void
  onApprove: () => void
  onSchedule: () => void
  onSendTest?: (testEmail?: string) => Promise<void> // Optional test email handler
  onManualEdit?: (editedHtml: string) => Promise<void> // Optional manual HTML edit handler
  isSequence?: boolean // Whether this is part of an email sequence
  sequenceName?: string // Name of the sequence
  sequenceEmails?: Array<any> // All emails in the sequence
  sequenceIndex?: number // Index of this email in the sequence (0-based)
  sequenceTotal?: number // Total number of emails in sequence
  // Flodesk workflow status tracking
  status?: 'draft' | 'sent_flodesk' | 'archived' // Email status
  sentDate?: string | null // ISO date string when email was sent
  flodeskCampaignName?: string | null // Campaign name in Flodesk
  analytics?: {
    sent?: number
    opened?: number
    clicked?: number
    openRate?: number
    clickRate?: number
  } | null // Analytics data from Flodesk
  createdAt?: string | Date // When email was created
}

export default function EmailPreviewCard({
  subject,
  preview,
  htmlContent,
  targetSegment,
  targetCount,
  campaignId,
  campaignType = 'resend',
  onEdit,
  onApprove,
  onSchedule,
  onSendTest,
  onManualEdit,
  isSequence = false,
  sequenceName,
  sequenceEmails,
  sequenceIndex,
  sequenceTotal,
  status = 'draft',
  sentDate,
  flodeskCampaignName,
  analytics,
  createdAt
}: EmailPreviewCardProps) {
  const [showFullEmail, setShowFullEmail] = useState(false)
  const [showHTMLCode, setShowHTMLCode] = useState(false)
  const [showManualEditor, setShowManualEditor] = useState(false)
  const [editedHtml, setEditedHtml] = useState(htmlContent)
  const [isSaving, setIsSaving] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  
  // Update editedHtml when htmlContent changes
  useEffect(() => {
    setEditedHtml(htmlContent)
  }, [htmlContent])

  // Extract image URLs from HTML for preview
  const extractImageUrls = (html: string): string[] => {
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
    const urls: string[] = []
    let match
    while ((match = imgRegex.exec(html)) !== null) {
      if (match[1] && !match[1].startsWith('data:') && match[1].trim()) {
        // Clean up URL (remove any whitespace or invalid characters)
        const cleanUrl = match[1].trim()
        if (cleanUrl && (cleanUrl.startsWith('http') || cleanUrl.startsWith('//'))) {
          urls.push(cleanUrl)
        }
      }
    }
    return [...new Set(urls)] // Remove duplicates
  }

  // Process HTML to fix image URLs and add proper attributes
  const processHtmlForPreview = (html: string): string => {
    // Process all img tags to ensure they work in preview
    let processed = html.replace(
      /<img([^>]*?)>/gi,
      (match) => {
        // Extract src attribute
        const srcMatch = match.match(/src=["']([^"']+)["']/i)
        if (!srcMatch || !srcMatch[1]) {
          return match // Return as-is if no src
        }
        
        const src = srcMatch[1]
        
        // Skip data URIs
        if (src.startsWith('data:')) {
          return match
        }
        
        // Skip if already has crossorigin
        if (match.includes('crossorigin') || match.includes('crossOrigin')) {
          return match
        }
        
        // Build new img tag with proper attributes
        // Remove existing onerror if present to avoid conflicts
        let cleanMatch = match.replace(/\s+onerror=["'][^"']*["']/gi, '')
        
        // Add crossorigin and onerror handler
        // Use lowercase 'crossorigin' for better compatibility
        if (cleanMatch.endsWith('/>')) {
          return cleanMatch.replace('/>', ' crossorigin="anonymous" onerror="this.onerror=null; this.style.display=\'none\';" />')
        } else if (cleanMatch.endsWith('>')) {
          return cleanMatch.replace('>', ' crossorigin="anonymous" onerror="this.onerror=null; this.style.display=\'none\';">')
        }
        
        return match
      }
    )
    
    return processed
  }

  // Clean and process HTML content before using it (memoized to prevent dependency array issues)
  // Handle cases where HTML might be escaped or contain literal \n characters
  const cleanHtmlContent = useMemo(() => {
    let cleaned = htmlContent
    
    // CRITICAL: Validate that htmlContent is actually HTML, not plain text
    if (typeof cleaned === 'string') {
      const trimmed = cleaned.trim()
      
      // If content doesn't start with HTML tags, it's likely not HTML
      if (!trimmed.startsWith('<') && !trimmed.startsWith('<!DOCTYPE')) {
        console.error('[EmailPreviewCard] ❌ Invalid HTML content - does not start with < or <!DOCTYPE', {
          contentPreview: trimmed.substring(0, 100),
          contentLength: trimmed.length
        })
        // Return empty string to prevent rendering invalid content
        return ''
      }
      
      // Check if HTML contains literal \n characters (should be actual newlines in HTML)
      if (cleaned.includes('\\n')) {
        console.log('[EmailPreviewCard] 🔧 HTML contains literal \\n, converting to actual newlines...')
        cleaned = cleaned.replace(/\\n/g, '\n')
      }
      
      // Check if HTML is escaped (contains &lt; instead of <)
      if (cleaned.includes('&lt;') || cleaned.includes('&gt;')) {
        console.log('[EmailPreviewCard] 🔧 HTML appears to be escaped, unescaping...')
        // Unescape HTML entities manually (more reliable than DOM parsing)
        cleaned = cleaned
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&#x27;/g, "'")
      }
    } else {
      console.error('[EmailPreviewCard] ❌ htmlContent is not a string:', typeof cleaned)
      return ''
    }
    
    return cleaned
  }, [htmlContent])

  // Only process HTML if we have valid HTML content
  const processedHtml = useMemo(() => {
    if (!cleanHtmlContent || cleanHtmlContent.trim().length === 0) {
      console.warn('[EmailPreviewCard] ⚠️ No valid HTML content to process')
      return ''
    }
    return processHtmlForPreview(cleanHtmlContent)
  }, [cleanHtmlContent])
  
  const imageUrls = useMemo(() => {
    if (!cleanHtmlContent || cleanHtmlContent.trim().length === 0) {
      return []
    }
    return extractImageUrls(cleanHtmlContent)
  }, [cleanHtmlContent])
  
  const previewContainerRef = useRef<HTMLDivElement>(null)
  
  // Don't render if we don't have valid HTML
  const hasValidHtml = cleanHtmlContent && cleanHtmlContent.trim().length > 0 && 
                       (cleanHtmlContent.trim().startsWith('<') || cleanHtmlContent.trim().startsWith('<!DOCTYPE'))
  
  // Debug: Log HTML content for debugging (only depend on htmlContent to avoid dependency array issues)
  useEffect(() => {
    if (htmlContent) {
      console.log('[EmailPreviewCard] 📧 HTML content analysis:', {
        originalLength: htmlContent.length,
        cleanLength: cleanHtmlContent.length,
        processedLength: processedHtml.length,
        type: typeof htmlContent,
        startsWithHtml: cleanHtmlContent.trim().startsWith('<'),
        startsWithDoctype: cleanHtmlContent.trim().startsWith('<!DOCTYPE'),
        originalPreview: htmlContent.substring(0, 200),
        cleanPreview: cleanHtmlContent.substring(0, 200),
        hasEscapedEntities: htmlContent.includes('&lt;') || htmlContent.includes('&gt;'),
        hasLiteralNewlines: htmlContent.includes('\\n')
      })
    }
  }, [htmlContent]) // Only depend on htmlContent - cleanHtmlContent and processedHtml are derived from it

  const handleSendTest = async () => {
    if (!onSendTest) return
    
    const recipientEmail = testEmail.trim() || undefined // Use admin email if empty
    setSendingTest(true)
    try {
      await onSendTest(recipientEmail)
      setTestEmail("") // Clear input on success
    } catch (error) {
      console.error("Error sending test email:", error)
    } finally {
      setSendingTest(false)
    }
  }

  const handleApprove = async () => {
    const platformName = campaignType === 'loops_campaign' ? 'Loops' : 'Resend'
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${targetCount.toLocaleString()} recipients in "${targetSegment}"?\n\n` +
      `Subject: ${subject}\n\n` +
      `${campaignType === 'loops_campaign' 
        ? 'This email will be sent via Loops. Make sure to review and send from the Loops dashboard.' 
        : 'This will create a broadcast in Resend and send immediately.'}`
    )
    if (!confirmed) return
    onApprove()
  }

  // Handle broken images in the rendered HTML
  useEffect(() => {
    if (!showFullEmail || !previewContainerRef.current) return

    const container = previewContainerRef.current
    const images = container.querySelectorAll('img')

    const handleImageError = (img: HTMLImageElement) => {
      img.style.display = 'none'
      // Add a placeholder or error indicator
      const parent = img.parentElement
      if (parent && !parent.classList.contains('image-error')) {
        parent.classList.add('image-error')
      }
    }

    // Store event handlers in a Map so we can remove them properly
    const errorHandlers = new Map<HTMLImageElement, () => void>()
    
    images.forEach((img) => {
      // Check if image is already broken
      if (!img.complete || img.naturalHeight === 0) {
        handleImageError(img)
      } else {
        // Create a stable handler reference
        const errorHandler = () => handleImageError(img)
        errorHandlers.set(img, errorHandler)
        // Add error handler for future failures
        img.addEventListener('error', errorHandler, { once: true })
      }
    })

    return () => {
      // Remove event listeners using the same function references
      errorHandlers.forEach((handler, img) => {
        img.removeEventListener('error', handler)
      })
      errorHandlers.clear()
    }
  }, [showFullEmail, processedHtml])

  return (
    <div 
      className="bg-white border border-stone-300 rounded-xl overflow-hidden shadow-lg my-4"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
            <h3 className="text-sm sm:text-base font-semibold text-stone-900">
              {isSequence ? '📧 EMAIL SEQUENCE PREVIEW' : '✨ EMAIL PREVIEW ✨'}
            </h3>
          </div>
          {/* Status Badge */}
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            status === 'sent_flodesk' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : status === 'archived'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
              : 'bg-stone-200 text-stone-700 border border-stone-300'
          }`}>
            {status === 'sent_flodesk' ? '✓ Sent' : status === 'archived' ? 'Archived' : 'Draft'}
          </div>
        </div>
        {isSequence && sequenceName && (
          <div className="mb-2 text-xs text-stone-600">
            <span className="font-medium">Sequence:</span> {sequenceName}
            {sequenceTotal !== undefined && sequenceIndex !== undefined && (
              <span className="ml-2">
                (Email {sequenceIndex + 1} of {sequenceTotal})
              </span>
            )}
          </div>
        )}
        <div className="text-xs sm:text-sm text-stone-600 space-y-1">
          <div className="wrap-break-word"><span className="font-medium">From:</span> Sandra @ SSELFIE Studio</div>
          <div className="wrap-break-word"><span className="font-medium">To:</span> {targetSegment} ({targetCount.toLocaleString()} contacts)</div>
          <div className="wrap-break-word"><span className="font-medium">Subject:</span> {subject}</div>
          {createdAt && (
            <div className="text-xs text-stone-500">
              <span className="font-medium">Created:</span> {new Date(createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </div>
          )}
          {sentDate && (
            <div className="text-xs text-green-700 font-medium">
              <span className="font-medium">Sent:</span> {new Date(sentDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          )}
          {flodeskCampaignName && (
            <div className="text-xs text-stone-600">
              <span className="font-medium">Campaign:</span> {flodeskCampaignName}
            </div>
          )}
        </div>
        {/* Analytics Section */}
        {analytics && analytics.sent && analytics.sent > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <div className="text-xs font-medium text-stone-700 mb-2">📊 Analytics</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-stone-500">Sent</div>
                <div className="font-semibold text-stone-900">{analytics.sent.toLocaleString()}</div>
              </div>
              {analytics.opened !== undefined && (
                <div>
                  <div className="text-stone-500">Opened</div>
                  <div className="font-semibold text-stone-900">
                    {analytics.opened.toLocaleString()}
                    {analytics.openRate !== undefined && (
                      <span className="text-stone-500 ml-1">({analytics.openRate.toFixed(1)}%)</span>
                    )}
                  </div>
                </div>
              )}
              {analytics.clicked !== undefined && (
                <div>
                  <div className="text-stone-500">Clicked</div>
                  <div className="font-semibold text-stone-900">
                    {analytics.clicked.toLocaleString()}
                    {analytics.clickRate !== undefined && (
                      <span className="text-stone-500 ml-1">({analytics.clickRate.toFixed(1)}%)</span>
                    )}
                  </div>
                </div>
              )}
              {analytics.openRate !== undefined && (
                <div>
                  <div className="text-stone-500">Open Rate</div>
                  <div className="font-semibold text-stone-900">{analytics.openRate.toFixed(1)}%</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Preview Images - Always show if available */}
        {imageUrls.length > 0 && (
          <div className="mb-4">
            <label className="text-xs text-stone-600 uppercase tracking-wider mb-2 block">
              Images in Email ({imageUrls.length})
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {imageUrls.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-stone-100 border border-stone-200">
                  {/* Use regular img tag for external URLs to avoid Next.js Image restrictions */}
                  <img
                    src={url}
                    alt={`Email image ${idx + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Silently hide broken images instead of logging errors
                      const target = e.target as HTMLImageElement
                      if (target.parentElement) {
                        target.parentElement.style.display = 'none'
                      }
                    }}
                    onLoad={() => {
                      // Image loaded successfully
                    }}
                    crossOrigin="anonymous"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs text-stone-600 uppercase tracking-wider mb-1 block">
            Preview Text
          </label>
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed wrap-break-word whitespace-pre-line">
            {preview.replace(/\\n/g, '\n')}
          </p>
        </div>

        {/* Full Email Preview */}
        {showFullEmail && (
          <div className="mb-4 border border-stone-200 rounded-lg overflow-hidden">
            <div className="bg-stone-50 border-b border-stone-200 px-3 sm:px-4 py-2">
              <h4 className="text-xs uppercase tracking-wider text-stone-600">Full Email Preview</h4>
            </div>
            <div className="p-2 sm:p-4 bg-white max-h-[400px] sm:max-h-[600px] overflow-y-auto">
              {hasValidHtml && processedHtml ? (
                /* Email Preview Container - styled like email client */
                <div 
                  ref={previewContainerRef}
                  className="email-preview-container"
                  style={{
                    maxWidth: '100%',
                    margin: '0 auto',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                  }}
                  dangerouslySetInnerHTML={{ __html: processedHtml }}
                />
              ) : (
                <div className="p-4 text-center text-stone-500">
                  <p className="text-sm">Unable to display email preview. Invalid HTML content.</p>
                  <p className="text-xs mt-2">Please check the console for details.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* HTML Code View */}
        {showHTMLCode && (
          <div className="mb-4 border border-stone-200 rounded-lg overflow-hidden">
            <div className="bg-stone-50 border-b border-stone-200 px-3 sm:px-4 py-2 flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider text-stone-600">HTML Code</h4>
              {onManualEdit && (
                <button
                  onClick={() => {
                    setShowManualEditor(true)
                    setShowHTMLCode(false)
                  }}
                  className="text-xs text-stone-700 hover:text-stone-900 px-2 py-1 rounded hover:bg-stone-200 transition-colors"
                >
                  Edit HTML
                </button>
              )}
            </div>
            <pre className="p-2 sm:p-4 bg-stone-900 text-stone-100 text-xs overflow-x-auto max-h-64 sm:max-h-96 overflow-y-auto">
              <code>{htmlContent}</code>
            </pre>
          </div>
        )}

        {/* Manual HTML Editor */}
        {showManualEditor && onManualEdit && (
          <div className="mb-4 border-2 border-stone-400 rounded-lg overflow-hidden">
            <div className="bg-stone-100 border-b border-stone-300 px-3 sm:px-4 py-2 flex items-center justify-between">
              <h4 className="text-xs uppercase tracking-wider text-stone-700 font-medium">Manual HTML Editor</h4>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setIsSaving(true)
                    try {
                      await onManualEdit(editedHtml)
                      setShowManualEditor(false)
                    } catch (error) {
                      console.error('Error saving edited HTML:', error)
                      alert('Failed to save edited HTML. Please try again.')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                  className="text-xs bg-stone-900 text-white px-3 py-1.5 rounded hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setShowManualEditor(false)
                    setEditedHtml(htmlContent) // Reset to original
                  }}
                  className="text-xs bg-stone-200 text-stone-700 px-3 py-1.5 rounded hover:bg-stone-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <textarea
              value={editedHtml}
              onChange={(e) => setEditedHtml(e.target.value)}
              className="w-full p-3 sm:p-4 bg-stone-900 text-stone-100 text-xs font-mono min-h-[400px] sm:min-h-[500px] focus:outline-none focus:ring-2 focus:ring-stone-400"
              spellCheck={false}
              placeholder="Edit HTML here..."
            />
            <div className="bg-stone-50 border-t border-stone-300 px-3 sm:px-4 py-2">
              <p className="text-xs text-stone-600">
                💡 Tip: After saving, ask Alex to use this edited version as the previousVersion for further refinements.
              </p>
            </div>
          </div>
        )}

        {/* Test Email Section */}
        {onSendTest && (
          <div className="mb-4 p-3 sm:p-4 bg-stone-50 border border-stone-200 rounded-lg">
            <label className="text-xs text-stone-600 uppercase tracking-wider mb-2 block">
              Send Test Email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Your email (leave blank for admin email)"
                className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-stone-950"
                disabled={sendingTest}
              />
              <button
                onClick={handleSendTest}
                disabled={sendingTest}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm whitespace-nowrap"
              >
                <TestTube className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{sendingTest ? 'Sending...' : 'Send Test'}</span>
                <span className="sm:hidden">{sendingTest ? 'Sending...' : 'Test'}</span>
              </button>
            </div>
            <p className="text-xs text-stone-500 mt-2 wrap-break-word">
              Test the email before sending to {targetCount.toLocaleString()} recipients
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowFullEmail(!showFullEmail)
              setShowHTMLCode(false)
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-stone-700 hover:text-stone-900 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{showFullEmail ? 'Hide Preview' : 'View Preview'}</span>
            <span className="sm:hidden">{showFullEmail ? 'Hide' : 'Preview'}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowHTMLCode(!showHTMLCode)
              setShowFullEmail(false)
            }}
            className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-stone-700 hover:text-stone-900 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{showHTMLCode ? 'Hide HTML' : 'View HTML'}</span>
            <span className="sm:hidden">{showHTMLCode ? 'Hide' : 'HTML'}</span>
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-stone-50 border-t border-stone-200 px-3 sm:px-6 py-3 sm:py-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-3">
          <button
            onClick={onEdit}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm truncate">Edit</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowFullEmail(!showFullEmail)
              setShowHTMLCode(false)
            }}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm truncate">Preview</span>
          </button>
          
          <button
            onClick={onSchedule}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-white border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm truncate">Schedule</span>
          </button>
          
          <button
            onClick={handleApprove}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="text-xs sm:text-sm truncate hidden sm:inline">Approve & Send</span>
            <span className="text-xs sm:hidden truncate">Send</span>
          </button>
        </div>
        
        {/* Copy HTML and Open Preview buttons */}
        <div className="flex gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigator.clipboard.writeText(htmlContent)
            }}
            className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
          >
            Copy HTML
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              const win = window.open('', '_blank')
              if (win) {
                // Wrap email HTML in a proper HTML document structure
                const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Preview</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #fafaf9;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .email-container {
      max-width: 600px;
      width: 100%;
      background-color: white;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${htmlContent}
  </div>
</body>
</html>`
                win.document.write(fullHtml)
                win.document.close()
              }
            }}
            className="px-4 py-2 text-xs tracking-[0.2em] uppercase border border-stone-300 hover:border-stone-400 transition-colors rounded"
          >
            Open Preview
          </button>
        </div>
        <p className="text-xs text-stone-500 mt-3">
          This is a preview only. No email has been sent.
        </p>
      </div>

      {/* Add styles for email preview */}
      <style jsx global>{`
        .email-preview-container {
          width: 100%;
          max-width: 100%;
        }
        .email-preview-container img {
          max-width: 100%;
          height: auto;
          display: block;
        }
        .email-preview-container img[src=""],
        .email-preview-container img:not([src]),
        .email-preview-container .image-error {
          display: none !important;
        }
        .email-preview-container table {
          width: 100%;
          max-width: 100%;
          border-collapse: collapse;
        }
        .email-preview-container td,
        .email-preview-container th {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .email-preview-container a {
          color: #1c1917;
          text-decoration: underline;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .email-preview-container p,
        .email-preview-container div {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        /* Handle broken images gracefully */
        .email-preview-container img::before {
          content: '';
          display: block;
          width: 100%;
          height: 200px;
          background: #f5f5f4;
          border: 1px dashed #d6d3d1;
        }
        /* Mobile-specific adjustments */
        @media (max-width: 640px) {
          .email-preview-container table {
            font-size: 14px;
          }
          .email-preview-container h1 {
            font-size: 20px !important;
          }
          .email-preview-container h2 {
            font-size: 18px !important;
          }
          .email-preview-container h3 {
            font-size: 16px !important;
          }
        }
      `}</style>
    </div>
  )
}

