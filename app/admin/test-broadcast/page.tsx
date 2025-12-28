'use client'

import { useState, useEffect } from 'react'

interface Segment {
  id: string
  name: string
  size: number
}

export default function TestBroadcastPage() {
  const [segments, setSegments] = useState<Segment[]>([])
  const [selectedSegment, setSelectedSegment] = useState('')
  const [subjectLine, setSubjectLine] = useState('')
  const [emailHtml, setEmailHtml] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [sendTestFirst, setSendTestFirst] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingSegments, setLoadingSegments] = useState(true)
  const [segmentsError, setSegmentsError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    loadSegments()
  }, [])

  async function loadSegments() {
    setLoadingSegments(true)
    setSegmentsError(null)
    try {
      const response = await fetch('/api/admin/segments/list')
      const data = await response.json()
      
      if (data.error) {
        setSegmentsError(data.message || data.error || 'Failed to load segments')
        console.error('Segments API error:', data.error)
      }
      
      setSegments(data.segments || [])
    } catch (error: any) {
      console.error('Failed to load segments:', error)
      setSegmentsError('Failed to load segments. Please check your network connection and try again.')
    } finally {
      setLoadingSegments(false)
    }
  }

  async function sendBroadcast() {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/broadcast/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: selectedSegment,
          subjectLine,
          emailHtml,
          campaignName: `Test: ${subjectLine}`,
          scheduledAt: scheduledAt || undefined,
          sendTestFirst
        })
      })

      const data = await response.json()
      setResult(data)
    } catch (error: any) {
      setResult({ 
        success: false, 
        error: error.message || 'Failed to send broadcast'
      })
    } finally {
      setLoading(false)
    }
  }

  const canSend = selectedSegment && subjectLine.trim() && emailHtml.trim() && !loading

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-stone-900">Test Broadcast Sending</h1>
        <p className="text-stone-600 mb-8">Test sending email broadcasts to Resend segments</p>

        {/* Segment Selection */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-stone-200">
          <label className="block text-sm font-medium mb-2 text-stone-900">
            Select Segment
          </label>
          {loadingSegments ? (
            <div className="text-stone-500 text-sm">Loading segments...</div>
          ) : (
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            >
              <option value="">Choose a segment...</option>
              {segments.map(seg => (
                <option key={seg.id} value={seg.id}>
                  {seg.name} ({seg.size} contacts)
                </option>
              ))}
            </select>
          )}
          {segmentsError && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <p className="text-yellow-800 font-medium">⚠️ {segmentsError}</p>
              <button
                onClick={loadSegments}
                className="mt-2 text-yellow-700 underline hover:text-yellow-900"
              >
                Retry
              </button>
            </div>
          )}
          {segments.length === 0 && !loadingSegments && !segmentsError && (
            <p className="text-sm text-stone-500 mt-2">
              No segments found. Make sure Resend is configured and you have segments created in your Resend account.
            </p>
          )}
        </div>

        {/* Email Content */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-stone-200">
          <label className="block text-sm font-medium mb-2 text-stone-900">
            Subject Line
          </label>
          <input
            type="text"
            value={subjectLine}
            onChange={(e) => setSubjectLine(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            placeholder="Your amazing subject line..."
          />

          <label className="block text-sm font-medium mb-2 text-stone-900">
            Email HTML
          </label>
          <textarea
            value={emailHtml}
            onChange={(e) => setEmailHtml(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            rows={15}
            placeholder="<html><body><p>Your email content here...</p><p><a href='{{{RESEND_UNSUBSCRIBE_URL}}}'>Unsubscribe</a></p></body></html>"
          />
          <p className="text-xs text-stone-500 mt-2">
            Don't forget to include the unsubscribe link: <code className="bg-stone-100 px-1 rounded">{'{{{RESEND_UNSUBSCRIBE_URL}}}'}</code>
          </p>
        </div>

        {/* Scheduling */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-stone-200">
          <label className="block text-sm font-medium mb-2 text-stone-900">
            Schedule (optional)
          </label>
          <input
            type="text"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-500 focus:border-transparent"
            placeholder="Leave empty for immediate, or: 'in 5 minutes', 'tomorrow at 9am', '2025-01-15T14:00:00Z'"
          />
          <p className="text-xs text-stone-500 mt-2">
            Supports natural language or ISO format timestamps
          </p>

          <label className="flex items-center mt-4">
            <input
              type="checkbox"
              checked={sendTestFirst}
              onChange={(e) => setSendTestFirst(e.target.checked)}
              className="mr-2 w-4 h-4 text-stone-600 border-stone-300 rounded focus:ring-stone-500"
            />
            <span className="text-sm text-stone-700">Send test email to Sandra first</span>
          </label>
        </div>

        {/* Send Button */}
        <button
          onClick={sendBroadcast}
          disabled={!canSend}
          className="w-full bg-stone-900 text-white py-3 rounded-lg font-medium
                     hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-200"
        >
          {loading ? 'Sending...' : 'Send Broadcast'}
        </button>

        {/* Result */}
        {result && (
          <div className={`mt-6 p-6 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className="font-bold mb-2 text-stone-900">
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            {result.message && (
              <p className="mb-3 text-stone-700">{result.message}</p>
            )}
            <pre className="text-sm overflow-auto bg-white p-4 rounded border border-stone-200">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.resendUrl && (
              <a 
                href={result.resendUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block mt-4 text-stone-900 underline hover:text-stone-700"
              >
                View in Resend Dashboard →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

