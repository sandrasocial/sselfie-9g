"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, Loader2, Mail, Send, Eye } from "lucide-react"

export function LaunchEmailSender({ totalSubscribers = 0 }: { totalSubscribers?: number }) {
  const [testEmail, setTestEmail] = useState("")
  const [sendingTest, setSendingTest] = useState(false)
  const [sendingCampaign, setSendingCampaign] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [campaignResult, setCampaignResult] = useState<{
    success: boolean
    sent?: number
    failed?: number
    totalSubscribers?: number
    message?: string
    instructions?: string[]
  } | null>(null)
  const [campaignStatus, setCampaignStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  useEffect(() => {
    loadCampaignStatus()
  }, [])

  const loadCampaignStatus = async () => {
    try {
      const response = await fetch("/api/admin/email/campaign-status")
      if (response.ok) {
        const data = await response.json()
        setCampaignStatus(data)
        console.log("[v0] Campaign status loaded:", data)
      }
    } catch (error) {
      console.error("[v0] Error loading campaign status:", error)
    } finally {
      setIsLoadingStatus(false)
    }
  }

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
      `This will create a broadcast in your Resend dashboard to send to all subscribers in your audience.\n\nThe broadcast will be created in draft mode. You'll need to review and click "Send" in your Resend dashboard.\n\nThis uses Resend's marketing email API (not transactional), which is the correct and cost-effective way to send campaigns.\n\nContinue?`,
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
          message: data.message,
          instructions: data.instructions,
        })
        alert(
          `✓ Broadcast Created Successfully!\n\n${data.message}\n\nNext Steps:\n${data.instructions.join("\n")}\n\nThis will send to your entire Resend audience using marketing email credits (not transactional).`,
        )
      } else {
        setCampaignResult({ success: false, message: data.error || "Failed to create broadcast" })
      }
    } catch (error: any) {
      console.error("Error creating broadcast:", error)
      setCampaignResult({ success: false, message: `Error: ${error.message}` })
    } finally {
      setSendingCampaign(false)
    }
  }

  const handlePreview = () => {
    window.open("/api/admin/email/preview-launch", "_blank")
  }

  return (
    <div className="space-y-6">
      {!isLoadingStatus && campaignStatus && campaignStatus.emailsSent > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <div className="font-semibold">Campaign Progress</div>
              <div className="text-sm">
                Sent: {campaignStatus.emailsSent.toLocaleString()} / {campaignStatus.totalSubscribers.toLocaleString()}{" "}
                ({campaignStatus.percentComplete}%)
              </div>
              {campaignStatus.emailsFailed > 0 && (
                <div className="text-sm text-destructive">Failed: {campaignStatus.emailsFailed}</div>
              )}
              {campaignStatus.remainingToSend > 0 && (
                <div className="text-sm text-muted-foreground">
                  Remaining: {campaignStatus.remainingToSend.toLocaleString()}
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Launch Email Campaign</CardTitle>
          <CardDescription>
            {isLoadingStatus
              ? "Loading subscriber count..."
              : `Send the SSELFIE Studio Beta launch email to ${totalSubscribers.toLocaleString()} subscribers`}
          </CardDescription>
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
                {isLoadingStatus
                  ? "Loading subscriber count..."
                  : campaignStatus?.remainingToSend > 0
                    ? `This will send the launch email to the remaining ${campaignStatus.remainingToSend.toLocaleString()} subscribers. No duplicates will be sent.`
                    : `This will send the launch email to ALL ${totalSubscribers.toLocaleString()} subscribers in your list. Make sure you've sent and reviewed a test email first.`}
              </p>
            </div>

            <Button
              onClick={handleSendCampaign}
              disabled={sendingCampaign || totalSubscribers === 0}
              className="w-full"
              variant="default"
            >
              {sendingCampaign ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending to Subscribers...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {campaignStatus?.remainingToSend > 0 ? "Continue Sending Campaign" : "Send to All Subscribers"}
                </>
              )}
            </Button>

            {campaignResult && (
              <Alert variant={campaignResult.success ? "default" : "destructive"}>
                {campaignResult.success && <CheckCircle2 className="h-4 w-4" />}
                <AlertDescription>
                  {campaignResult.success
                    ? campaignResult.message ||
                      `Campaign batch sent! ${campaignResult.sent} delivered, ${campaignResult.failed || 0} failed.`
                    : campaignResult.message || "Failed to send campaign. Please try again."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
