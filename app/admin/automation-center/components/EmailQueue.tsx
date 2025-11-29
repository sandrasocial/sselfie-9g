"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Check, Send } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface QueuedEmail {
  id: string
  user_id: string
  email: string
  subject: string
  html: string
  status: "queued" | "approved" | "sent" | "failed"
  scheduled_for: string | null
  created_at: string
}

export function EmailQueue() {
  const [queue, setQueue] = useState<QueuedEmail[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    email: QueuedEmail | null
    action: "approve" | "send" | null
  }>({
    open: false,
    email: null,
    action: null,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchQueue = async () => {
    if (queue.length === 0) {
      setLoading(true)
    }
    try {
      const response = await fetch("/api/admin/automation/email/queue")
      if (response.ok) {
        const data = await response.json()
        setQueue(data.queue || [])
      } else {
        throw new Error("Failed to fetch queue")
      }
    } catch (error) {
      if (queue.length === 0) {
        toast({
          title: "Error",
          description: "Failed to load email queue",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApproveClick = (email: QueuedEmail) => {
    setConfirmDialog({ open: true, email, action: "approve" })
  }

  const handleSendClick = (email: QueuedEmail) => {
    setConfirmDialog({ open: true, email, action: "send" })
  }

  const handleConfirm = async () => {
    const { email, action } = confirmDialog
    if (!email || !action) return

    setConfirmDialog({ open: false, email: null, action: null })
    setProcessingId(email.id)

    try {
      const endpoint = action === "approve" ? "/api/admin/automation/email/approve" : "/api/admin/automation/email/send"
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: email.id }),
      })

      if (response.ok) {
        const newStatus = action === "approve" ? "approved" : "sent"
        setQueue((prev) => prev.map((e) => (e.id === email.id ? { ...e, status: newStatus as const } : e)))
        toast({
          title: action === "approve" ? "Email approved" : "Email sent",
          description: `Email to ${email.email} has been ${action === "approve" ? "approved" : "sent"}`,
        })
      } else {
        throw new Error(`Failed to ${action} email`)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${action} email`,
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="bg-white rounded-2xl border-border">
          <div className="px-8 py-6">
            <h2 className="text-[22px] font-semibold text-stone-950 mb-2">Marketing Email Queue</h2>
            <p className="text-muted-foreground text-sm mb-6">Scheduled and pending email campaigns</p>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Scheduled For</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queue.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                          No emails in queue
                        </TableCell>
                      </TableRow>
                    ) : (
                      queue.map((email) => (
                        <TableRow key={email.id}>
                          <TableCell className="font-mono text-sm">{email.email}</TableCell>
                          <TableCell>
                            <p className="font-medium text-stone-950 truncate max-w-xs">{email.subject}</p>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                email.status === "sent"
                                  ? "default"
                                  : email.status === "approved"
                                    ? "secondary"
                                    : email.status === "failed"
                                      ? "destructive"
                                      : "outline"
                              }
                            >
                              {email.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {email.scheduled_for ? new Date(email.scheduled_for).toLocaleString() : "ASAP"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {email.status === "queued" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApproveClick(email)}
                                  disabled={processingId === email.id}
                                >
                                  {processingId === email.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Approve
                                    </>
                                  )}
                                </Button>
                              )}
                              {email.status === "approved" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleSendClick(email)}
                                  disabled={processingId === email.id}
                                >
                                  {processingId === email.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="w-4 h-4 mr-1" />
                                      Send
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ open, email: null, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.action === "approve" ? "Approve Email?" : "Send Email?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === "approve" ? (
                <>
                  This will approve the email to <strong>{confirmDialog.email?.email}</strong>. It will be ready to
                  send.
                </>
              ) : (
                <>
                  This will immediately send the email to <strong>{confirmDialog.email?.email}</strong>. This action
                  cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {confirmDialog.action === "approve" ? "Approve" : "Send Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
