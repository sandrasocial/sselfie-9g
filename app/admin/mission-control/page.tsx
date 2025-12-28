'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminNav } from '@/components/admin/admin-nav'

interface Task {
  id: number
  agent_name: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  cursor_prompt?: string
  action_type: 'cursor' | 'manual' | 'alex'
  completed: boolean
  completed_at?: string
  created_at: string
}

interface AgentCheck {
  agent: string
  status: 'healthy' | 'warning' | 'critical'
  issues: Task[]
}

export default function MissionControlPage() {
  const [checks, setChecks] = useState<AgentCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRun, setLastRun] = useState<string>('')
  const [tasks, setTasks] = useState<Task[]>([])
  
  useEffect(() => {
    runDailyChecks()
  }, [])
  
  const runDailyChecks = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/admin/mission-control/daily-check', {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        setTasks(data.tasks || [])
        setLastRun(data.timestamp || new Date().toISOString())
        
        // Group tasks by agent and transform to checks format
        const tasksByAgent = data.tasks.reduce((acc: Record<string, Task[]>, task: Task) => {
          if (!acc[task.agent_name]) {
            acc[task.agent_name] = []
          }
          acc[task.agent_name].push(task)
          return acc
        }, {})
        
        // Transform to AgentCheck format
        const transformedChecks: AgentCheck[] = Object.entries(tasksByAgent).map(([agent, agentTasks]) => {
          const incompleteTasks = (agentTasks as Task[]).filter(t => !t.completed)
          const highPriorityCount = incompleteTasks.filter(t => t.priority === 'high').length
          
          let status: 'healthy' | 'warning' | 'critical' = 'healthy'
          if (highPriorityCount > 0) {
            status = 'critical'
          } else if (incompleteTasks.length > 0) {
            status = 'warning'
          }
          
          return {
            agent,
            status,
            issues: agentTasks as Task[]
          }
        })
        
        setChecks(transformedChecks)
      }
    } catch (error) {
      console.error('Error running daily checks:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const markCompleted = async (taskId: number, checkIdx: number, issueIdx: number) => {
    try {
      const response = await fetch('/api/admin/mission-control/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId })
      })
      
      if (response.ok) {
        // Update local state
        const updated = [...checks]
        updated[checkIdx].issues[issueIdx].completed = true
        updated[checkIdx].issues[issueIdx].completed_at = new Date().toISOString()
        setChecks(updated)
        
        // Also update tasks array
        const updatedTasks = tasks.map(t => 
          t.id === taskId ? { ...t, completed: true, completed_at: new Date().toISOString() } : t
        )
        setTasks(updatedTasks)
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }
  
  const copyCursorPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt)
    // Show toast notification (you can add a toast library if needed)
    alert('Cursor prompt copied to clipboard!')
  }
  
  const getTotalIssues = () => {
    return checks.reduce((sum, check) => sum + check.issues.filter(i => !i.completed).length, 0)
  }
  
  const getHighPriorityCount = () => {
    return checks.reduce((sum, check) => 
      sum + check.issues.filter(i => i.priority === 'high' && !i.completed).length, 0
    )
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <p className="text-base sm:text-lg font-semibold mb-2">Running daily checks...</p>
            <p className="text-xs sm:text-sm text-stone-600">Analyzing your business health</p>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-12 lg:mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-2 sm:mb-4">
                MISSION CONTROL
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase">
                Your AI team's daily intelligence report
              </p>
            </div>
            <Button onClick={runDailyChecks} size="lg" disabled={loading} className="w-full sm:w-auto min-h-[44px]">
              {loading ? 'Running...' : 'Refresh Checks'}
            </Button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Card className="p-4 sm:p-6 rounded-none">
              <p className="text-xs sm:text-sm text-stone-600 mb-1">Total Issues</p>
              <p className="text-2xl sm:text-3xl font-bold">{getTotalIssues()}</p>
            </Card>
            <Card className="p-4 sm:p-6 rounded-none">
              <p className="text-xs sm:text-sm text-stone-600 mb-1">High Priority</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{getHighPriorityCount()}</p>
            </Card>
            <Card className="col-span-2 lg:col-span-1 p-4 sm:p-6 rounded-none">
              <p className="text-xs sm:text-sm text-stone-600 mb-1">Last Check</p>
              <p className="text-sm sm:text-base lg:text-lg font-semibold">
                {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
              </p>
            </Card>
          </div>
        </div>
        
        {/* Agent Reports */}
        {checks.length === 0 ? (
          <Card className="p-6 sm:p-8 text-center rounded-none">
            <p className="text-base sm:text-lg text-stone-600 mb-4">No checks run yet</p>
            <Button onClick={runDailyChecks} className="min-h-[44px]">Run Daily Checks</Button>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {checks.map((check, checkIdx) => (
              <Card key={check.agent} className="p-4 sm:p-6 rounded-none">
                {/* Agent Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                      {check.agent}
                    </h2>
                    <Badge variant={getStatusVariant(check.status)} className="text-[10px] sm:text-xs">
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-500">
                    {check.issues.filter(i => !i.completed).length} active items
                  </p>
                </div>
                
                {/* Issues List */}
                {check.issues.length > 0 ? (
                  <div className="space-y-3">
                    {check.issues.map((issue, issueIdx) => (
                      <div 
                        key={issue.id}
                        className={`p-3 sm:p-4 border rounded-none ${
                          issue.completed 
                            ? 'bg-green-50 border-green-200' 
                            : issue.priority === 'high'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-stone-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <Badge variant={getPriorityVariant(issue.priority)} className="text-[10px]">
                              {issue.priority}
                            </Badge>
                            <h3 className={`text-sm sm:text-base font-semibold ${
                              issue.completed ? 'line-through text-stone-500' : ''
                            }`}>
                              {issue.title}
                            </h3>
                          </div>
                          <input
                            type="checkbox"
                            checked={issue.completed}
                            onChange={() => markCompleted(issue.id, checkIdx, issueIdx)}
                            className="w-5 h-5 flex-shrink-0 mt-0.5 cursor-pointer touch-manipulation"
                          />
                        </div>
                        
                        <p className="text-xs sm:text-sm text-stone-600 mb-3">{issue.description}</p>
                        
                        {/* Action Buttons */}
                        {!issue.completed && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            {issue.action_type === 'cursor' && issue.cursor_prompt && (
                              <Button
                                size="sm"
                                onClick={() => copyCursorPrompt(issue.cursor_prompt!)}
                                variant="outline"
                                className="w-full sm:w-auto text-xs min-h-[44px]"
                              >
                                Copy Cursor Prompt
                              </Button>
                            )}
                            {issue.action_type === 'alex' && (
                              <Button
                                size="sm"
                                onClick={() => window.location.href = '/admin/alex'}
                                variant="outline"
                                className="w-full sm:w-auto text-xs min-h-[44px]"
                              >
                                Ask Alex
                              </Button>
                            )}
                            {issue.action_type === 'manual' && (
                              <Badge variant="secondary" className="text-xs">Manual Action Required</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-stone-500 text-center py-4 text-sm">All clear! No issues found.</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === 'healthy') return 'default'
  if (status === 'warning') return 'secondary'
  return 'destructive'
}

function getPriorityVariant(priority: string): "default" | "secondary" | "destructive" | "outline" {
  if (priority === 'high') return 'destructive'
  if (priority === 'medium') return 'secondary'
  return 'default'
}

