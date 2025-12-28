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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Running daily checks...</p>
          <p className="text-sm text-gray-600">Analyzing your business health</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">MISSION CONTROL</h1>
              <p className="text-gray-600">Your AI team's daily intelligence report</p>
            </div>
            <Button onClick={runDailyChecks} size="lg" disabled={loading}>
              {loading ? 'Running...' : 'Refresh Checks'}
            </Button>
          </div>
          
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600">Total Issues</p>
              <p className="text-3xl font-bold">{getTotalIssues()}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-3xl font-bold text-red-600">{getHighPriorityCount()}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600">Last Check</p>
              <p className="text-lg font-semibold">
                {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
              </p>
            </Card>
          </div>
        </div>
        
        {/* Agent Reports */}
        {checks.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg text-gray-600 mb-4">No checks run yet</p>
            <Button onClick={runDailyChecks}>Run Daily Checks</Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {checks.map((check, checkIdx) => (
              <Card key={check.agent} className="p-6">
                {/* Agent Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">
                      {check.agent}
                    </h2>
                    <Badge variant={getStatusVariant(check.status)}>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {check.issues.filter(i => !i.completed).length} active items
                  </p>
                </div>
                
                {/* Issues List */}
                {check.issues.length > 0 ? (
                  <div className="space-y-3">
                    {check.issues.map((issue, issueIdx) => (
                      <div 
                        key={issue.id}
                        className={`p-4 border rounded-lg ${
                          issue.completed 
                            ? 'bg-green-50 border-green-200' 
                            : issue.priority === 'high'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={getPriorityVariant(issue.priority)}>
                              {issue.priority}
                            </Badge>
                            <h3 className={`font-semibold ${
                              issue.completed ? 'line-through text-gray-500' : ''
                            }`}>
                              {issue.title}
                            </h3>
                          </div>
                          <input
                            type="checkbox"
                            checked={issue.completed}
                            onChange={() => markCompleted(issue.id, checkIdx, issueIdx)}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{issue.description}</p>
                        
                        {/* Action Buttons */}
                        {!issue.completed && (
                          <div className="flex gap-2">
                            {issue.action_type === 'cursor' && issue.cursor_prompt && (
                              <Button
                                size="sm"
                                onClick={() => copyCursorPrompt(issue.cursor_prompt!)}
                                variant="outline"
                              >
                                Copy Cursor Prompt
                              </Button>
                            )}
                            {issue.action_type === 'alex' && (
                              <Button
                                size="sm"
                                onClick={() => window.location.href = '/admin/alex'}
                                variant="outline"
                              >
                                Ask Alex
                              </Button>
                            )}
                            {issue.action_type === 'manual' && (
                              <Badge variant="secondary">Manual Action Required</Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">All clear! No issues found.</p>
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

