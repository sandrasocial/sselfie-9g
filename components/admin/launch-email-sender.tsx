"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2, Mail, Send, Eye } from "lucide-react"

export function LaunchEmailSender() {
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [campaignResult, setCampaignResult] = useState<{
    success: boolean
    sent?: number
    failed?: number
    totalSubscribers?: number
  } | null>(null)

  const handleSendTest = async () => {
    if (!testEmail) {
      setTestResult({ success: false, message: "Please enter test email address" })
      return
    }

    setSendingTest(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/admin/email/send-test-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testEmail }),
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: data.message })
      } else {
        setTestResult({ success: false, message: data.error || "Failed to send test email" })
      }
    } catch (error) {
      setTestResult({ success: false, message: "Error sending test email" })
    } finally {
      setSendingTest(false)
    }
  }

  const handleSendCampaign = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to send the launch email to ALL 2600+ subscribers? This cannot be undone.",
    )

    if (!confirmed) return

    setSendingCampaign(true)
    setCampaignResult(null)

    try {
      const response = await fetch("/api/admin/email/send-launch-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true }),
      })

      const data = await response.json()

      if (response.ok) {
        setCampaignResult({
          success: true,
          sent: data.sent,
          failed: data.failed,
          totalSubscribers: data.totalSubscribers,
        })
      } else {
        setCampaignResult({ success: false })
      }
    } catch (error) {
      setCampaignResult({ success: false })
    } finally {
      setSendingCampaign(false)
    }
  }

  const handlePreview = () => {
    window.open("/api/admin/email/preview-launch", "_blank")
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Launch Email Campaign</CardTitle>
          <CardDescription>Send the SSELFIE Studio Beta launch email to all 2600+ subscribers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preview Button */}
          <div>
            <Button onClick={handlePreview} variant="outline" className="w-full bg-transparent">
              <Eye className="mr-2 h-4 w-4" />
              Preview Email
            </Button>
          </div>

          {/* Test Email Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Test Email Address</Label>
              <Input
                id="testEmail"
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <Button onClick={handleSendTest} disabled={sendingTest} className="w-full">
              {sendingTest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Test...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Send Campaign Section */}
          <div className="pt-6 border-t space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900 font-medium">⚠️ Warning</p>
              <p className="text-sm text-amber-800 mt-1">
                This will send the launch email to ALL subscribers in your list. Make sure you've sent and reviewed a
                test email first.
              </p>
            </div>

            <Button onClick={handleSendCampaign} disabled={sendingCampaign} className="w-full" variant="default">
              {sendingCampaign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending to All Subscribers...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to All 2600+ Subscribers
                </>
              )}
            </Button>

            {campaignResult && (
              <Alert variant={campaignResult.success ? "default" : "destructive"}>
                {campaignResult.success && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>
                  {campaignResult.success
                    ? `Campaign sent! ${campaignResult.sent}/${campaignResult.totalSubscribers} emails delivered successfully. ${campaignResult.failed} failed.`
                    : "Failed to send campaign. Please try again."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
