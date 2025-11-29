"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface Activity {
  id: string
  event_type: string
  event_data: {
    action?: string
    details?: string
    workflow?: string
  }
  created_at: string
}

export function AgentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchActivity()
    const interval = setInterval(fetchActivity, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchActivity = async () => {
    if (activities.length === 0) {
      setLoading(true)
    }
    try {
      const response = await fetch("/api/admin/automation/activity/list")
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      } else {
        throw new Error("Failed to fetch activity")
      }
    } catch (error) {
      if (activities.length === 0) {
        toast({
          title: "Error",
          description: "Failed to load agent activity",
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case "workflow_run":
        return "default"
      case "email_sent":
        return "secondary"
      case "error":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white rounded-2xl border-border">
        <div className="px-8 py-6">
          <h2 className="text-[22px] font-semibold text-stone-950 mb-2">Agent Activity Log</h2>
          <p className="text-muted-foreground text-sm mb-6">Recent actions taken by AI agents across the platform</p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
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
                    <TableHead>Event Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground text-sm py-8">
                        No agent activity recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>
                          <Badge variant={getEventBadgeVariant(activity.event_type)}>
                            {activity.event_type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {activity.event_data.workflow && (
                              <p className="font-medium text-sm text-stone-950">{activity.event_data.workflow}</p>
                            )}
                            {activity.event_data.action && (
                              <p className="text-sm text-stone-600">{activity.event_data.action}</p>
                            )}
                            {activity.event_data.details && (
                              <p className="text-sm text-muted-foreground">{activity.event_data.details}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
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
  )
}
