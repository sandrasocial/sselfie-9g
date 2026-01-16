'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, Users, Mail } from 'lucide-react'
import { BetaTestimonialRequestEmail } from '@/lib/email/templates/beta-testimonial-request'

export function BetaTestimonialBroadcast() {
  const [segmentLoading, setSegmentLoading] = useState(false)
  const [segmentResult, setSegmentResult] = useState<any>(null)
  const [segmentError, setSegmentError] = useState<string | null>(null)

  const [broadcastLoading, setBroadcastLoading] = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<any>(null)
  const [broadcastError, setBroadcastError] = useState<string | null>(null)

  const handleCreateSegment = async () => {
    setSegmentLoading(true)
    setSegmentError(null)
    setSegmentResult(null)

    try {
      const response = await fetch('/api/admin/email/create-beta-segment', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create segment')
      }

      setSegmentResult(data)
    } catch (error: any) {
      setSegmentError(error.message)
    } finally {
      setSegmentLoading(false)
    }
  }

  const handleCreateBroadcast = async () => {
    setBroadcastLoading(true)
    setBroadcastError(null)
    setBroadcastResult(null)

    try {
      const response = await fetch('/api/admin/email/send-beta-testimonial', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create broadcast')
      }

      setBroadcastResult(data)
    } catch (error: any) {
      setBroadcastError(error.message)
    } finally {
      setBroadcastLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Beta Testimonial Request Campaign</h1>
        <p className="text-muted-foreground mt-2">
          Create a segment of beta customers and send them a testimonial request email
        </p>
      </div>

      {/* Step 1: Create Segment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Step 1: Create Beta Customer Segment
          </CardTitle>
          <CardDescription>
            This will tag all paying customers as &quot;status:customer&quot; (separate from freebie leads who have &quot;status:lead&quot;)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-amber-900 mb-2 text-sm">⚠️ Important: Resend Segment Configuration</h4>
            <p className="text-xs text-amber-800 mb-3">
              Your manually created Resend segment (<code className="bg-amber-100 px-1 rounded">8da5ee08-60cf-47a5-bdaa-9419c7eb5aa5</code>) 
              must be configured with the correct filter to exclude freebie subscribers:
            </p>
            <div className="bg-white border border-amber-300 rounded p-3 mb-3">
              <p className="text-xs font-medium text-amber-900 mb-2">Required Filter in Resend Dashboard:</p>
              <div className="font-mono text-xs text-amber-800">
                Tag: <strong>status</strong> equals <strong>customer</strong>
              </div>
            </div>
            <p className="text-xs text-amber-700">
              This ensures only paying customers (not the 28 freebie subscribers with &quot;status:lead&quot;) receive the testimonial request.
            </p>
          </div>

          <Button
            onClick={handleCreateSegment}
            disabled={segmentLoading || !!segmentResult}
            className="w-full sm:w-auto"
          >
            {segmentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {segmentResult ? 'Segment Created' : 'Create Beta Segment'}
          </Button>

          {segmentResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">Segment Created Successfully</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {segmentResult.message}
                  </p>
                  {segmentResult.segmentId && (
                    <div className="mt-3 p-3 bg-white border border-green-300 rounded">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        Segment Created in Resend
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-green-700">Name:</span>
                          <span className="font-mono text-green-900">{segmentResult.segmentName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Segment ID:</span>
                          <span className="font-mono text-green-900">{segmentResult.segmentId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Customers:</span>
                          <span className="font-semibold text-green-900">{segmentResult.totalTagged}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <ul className="text-sm text-green-600 mt-2 space-y-1">
                    {segmentResult.customers?.slice(0, 5).map((customer: any, i: number) => (
                      <li key={i}>• {customer.email} ({customer.product})</li>
                    ))}
                    {segmentResult.customers?.length > 5 && (
                      <li className="font-medium">... and {segmentResult.customers.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {segmentError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Error Creating Segment</h4>
                  <p className="text-sm text-red-700 mt-1">{segmentError}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Email Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Email Preview</CardTitle>
          <CardDescription>Review the email content before creating the broadcast</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
            <BetaTestimonialRequestEmail customerName="Sandra" />
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Create Broadcast */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Step 3: Create Broadcast in Resend
          </CardTitle>
          <CardDescription>
            This will create a DRAFT broadcast in Resend that you can preview and send manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleCreateBroadcast}
            disabled={broadcastLoading || !segmentResult || !!broadcastResult}
            className="w-full sm:w-auto"
          >
            {broadcastLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {broadcastResult ? 'Broadcast Created' : 'Create Broadcast Draft'}
          </Button>

          {!segmentResult && (
            <p className="text-sm text-muted-foreground">
              Complete Step 1 first to create the broadcast
            </p>
          )}

          {broadcastResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900">Broadcast Draft Created</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your testimonial request email is ready to review and send in Resend
                  </p>
                  <div className="mt-3 space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Audience:</span> {broadcastResult.audienceName}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Recipients:</span> ~{broadcastResult.recipientCount || segmentResult?.totalTagged || 0} beta
                      customers
                    </p>
                    <a
                      href="https://resend.com/broadcasts"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                    >
                      Open Resend Dashboard to Preview & Send →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {broadcastError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Error Creating Broadcast</h4>
                  <p className="text-sm text-red-700 mt-1">{broadcastError}</p>
                  {broadcastError.includes('RESEND_BETA_SEGMENT_ID') && (
                    <p className="text-xs text-red-600 mt-2">
                      Make sure to add the RESEND_BETA_SEGMENT_ID environment variable (see Step 1 above)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>Click &quot;Create Beta Segment&quot; to tag all paying customers with <code className="text-xs bg-gray-100 px-1 rounded">status:customer</code></span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>Review the email preview above</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>Add RESEND_BETA_SEGMENT_ID to environment variables (see yellow box in Step 1 after creating segment)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>Click &quot;Create Broadcast Draft&quot; to create the email campaign in Resend</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">5.</span>
              <span>Go to Resend dashboard to preview and send the broadcast to beta customers only</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
