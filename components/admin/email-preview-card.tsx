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
  onEdit: () => void
  onApprove: () => void
  onSchedule: () => void
  onSendTest?: (testEmail?: string) => Promise<void> // Optional test email handler
}

export default function EmailPreviewCard({
  subject,
  preview,
  htmlContent,
  targetSegment,
  targetCount,
  campaignId,
  onEdit,
  onApprove,
  onSchedule,
  onSendTest
}: EmailPreviewCardProps) {
  const [showFullEmail, setShowFullEmail] = useState(false)
  const [showHTMLCode, setShowHTMLCode] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)

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
    const confirmed = window.confirm(
      `Are you sure you want to send this email to ${targetCount.toLocaleString()} recipients in "${targetSegment}"?\n\n` +
      `Subject: ${subject}\n\n` +
      `This will create a broadcast in Resend and send immediately.`
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
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-stone-700" />
          <h3 className="text-sm sm:text-base font-semibold text-stone-900">✨ EMAIL PREVIEW ✨</h3>
        </div>
        <div className="text-xs sm:text-sm text-stone-600 space-y-1">
          <div className="wrap-break-word"><span className="font-medium">From:</span> Sandra @ SSELFIE Studio</div>
          <div className="wrap-break-word"><span className="font-medium">To:</span> {targetSegment} ({targetCount.toLocaleString()} contacts)</div>
          <div className="wrap-break-word"><span className="font-medium">Subject:</span> {subject}</div>
        </div>
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
            <div className="bg-stone-50 border-b border-stone-200 px-3 sm:px-4 py-2">
              <h4 className="text-xs uppercase tracking-wider text-stone-600">HTML Code</h4>
            </div>
            <pre className="p-2 sm:p-4 bg-stone-900 text-stone-100 text-xs overflow-x-auto max-h-64 sm:max-h-96 overflow-y-auto">
              <code>{htmlContent}</code>
            </pre>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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

