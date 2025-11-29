"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Play, Eye } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

interface Workflow {
  id: string
  name: string
  description: string
  status: "active" | "paused"
  lastRun: string | null
  nextRun: string | null
}

interface WorkflowPreview {
  emailsToSend: number
  users: { email: string; reason: string }[]
}

export function WorkflowsPanel() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null)
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean
    workflow: Workflow | null
    preview: WorkflowPreview | null
  }>({
    open: false,
    workflow: null,
    preview: null,
  })
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    workflow: Workflow | null
  }>({
    open: false,
    workflow: null,
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    if (workflows.length === 0) {
      setLoading(true)
    }
    try {
      const response = await fetch("/api/admin/automation/workflows/list")
      if (response.ok) {
        const data = await response.json()
        setWorkflows(data.workflows || [])
      } else {
        throw new Error("Failed to fetch workflows")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workflows",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async (workflow: Workflow) => {
    setPreviewDialog({ open: true, workflow, preview: null })
    setLoadingPreview(true)

    try {
      const response = await fetch("/api/admin/automation/workflows/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreviewDialog((prev) => ({ ...prev, preview: data.preview }))
      } else {
        throw new Error("Failed to preview workflow")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workflow preview",
        variant: "destructive",
      })
      setPreviewDialog({ open: false, workflow: null, preview: null })
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleRunClick = (workflow: Workflow) => {
    setConfirmDialog({ open: true, workflow })
  }

  const handleRun = async () => {
    const workflow = confirmDialog.workflow
    if (!workflow) return

    setConfirmDialog({ open: false, workflow: null })
    setRunningWorkflow(workflow.id)

    try {
      const response = await fetch("/api/admin/automation/workflows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: workflow.id }),
      })

      if (response.ok) {
        toast({
          title: "Workflow started",
          description: `${workflow.name} is now running`,
        })
        fetchWorkflows()
      } else {
        throw new Error("Failed to run workflow")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run workflow",
        variant: "destructive",
      })
    } finally {
      setRunningWorkflow(null)
    }
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="bg-white rounded-2xl border-border">
          <div className="px-8 py-6">
            <h2 className="text-[22px] font-semibold text-stone-950 mb-2">Active Workflows</h2>
            <p className="text-muted-foreground text-sm mb-6">Automated workflows and agent tasks currently running</p>

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
                      <TableHead>Workflow Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Next Run</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-8">
                          No workflows configured yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      workflows.map((workflow) => (
                        <TableRow key={workflow.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-stone-950">{workflow.name}</p>
                              <p className="text-sm text-muted-foreground">{workflow.description}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                              {workflow.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {workflow.lastRun ? new Date(workflow.lastRun).toLocaleString() : "Never"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {workflow.nextRun ? new Date(workflow.nextRun).toLocaleString() : "Not scheduled"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handlePreview(workflow)}>
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleRunClick(workflow)}
                                disabled={runningWorkflow === workflow.id}
                              >
                                {runningWorkflow === workflow.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Play className="w-4 h-4 mr-1" />
                                    Run
                                  </>
                                )}
                              </Button>
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

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, workflow: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Run Workflow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will execute <strong>{confirmDialog.workflow?.name}</strong> immediately. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRun}>Run Workflow</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog({ open, workflow: null, preview: null })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDialog.workflow?.name}</DialogTitle>
            <DialogDescription>{previewDialog.workflow?.description}</DialogDescription>
          </DialogHeader>

          {loadingPreview ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-stone-950" />
            </div>
          ) : previewDialog.preview ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This workflow will send <strong>{previewDialog.preview.emailsToSend}</strong> emails
              </p>

              {previewDialog.preview.users.length > 0 && (
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewDialog.preview.users.map((user, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">{user.email}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
