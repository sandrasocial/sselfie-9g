'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Project {
  id: number
  title: string
  description: string
  emoji: string
  color: string
  status: string
  vision_image_url?: string
  goal_date?: string
  tasks_remaining: number
  tasks_completed: number
  total_tasks: number
}

interface Task {
  id: number
  project_id: number
  title: string
  description: string
  priority: string
  status: string
  is_quick_win: boolean
  is_deep_work: boolean
  energy_level: string
  estimated_minutes: number
  completed_at?: string
  project_title: string
  project_emoji: string
  project_color: string
}

interface Props {
  initialProjects: Project[]
  initialTodayTasks: Task[]
  initialAllTasks: Task[]
  stats: {
    todayCompleted: number
    weekCompleted: number
    totalActive: number
  }
}

export function ProjectTrackerClient({
  initialProjects,
  initialTodayTasks,
  initialAllTasks,
  stats
}: Props) {
  const [view, setView] = useState<'focus' | 'kanban' | 'all'>('focus')
  const [projects, setProjects] = useState(initialProjects)
  const [todayTasks, setTodayTasks] = useState(initialTodayTasks)
  const [allTasks, setAllTasks] = useState(initialAllTasks)
  const [showCelebration, setShowCelebration] = useState(false)

  const handleToggleTask = async (taskId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'

    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update task')

      // Show celebration if marking as done
      if (newStatus === 'done') {
        setShowCelebration(true)
        setTimeout(() => setShowCelebration(false), 3000)
      }

      // Refresh data
      window.location.reload()
    } catch (error) {
      console.error('Error updating task:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-green-100 text-green-800 border-green-300'
      case 'someday': return 'bg-gray-100 text-gray-600 border-gray-300'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-zoom-in text-8xl">
            🎉✨🎊
          </div>
        </div>
      )}

      {/* Header with aesthetic gradient */}
      <div className="mb-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 p-8 text-white shadow-2xl">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="text-5xl">✨</span>
            Your Vision Board
          </h1>
          <p className="text-purple-100 text-lg">
            Stay focused, crush goals, build your empire
          </p>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full -ml-48 -mb-48" />
      </div>

      {/* Stats Cards - Pinterest style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6 bg-white rounded-2xl shadow-lg border-0 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Today's Wins</p>
              <p className="text-4xl font-bold text-green-600">{stats.todayCompleted}</p>
            </div>
            <div className="text-5xl">🎯</div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-2xl shadow-lg border-0 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">This Week</p>
              <p className="text-4xl font-bold text-purple-600">{stats.weekCompleted}</p>
            </div>
            <div className="text-5xl">🔥</div>
          </div>
        </Card>

        <Card className="p-6 bg-white rounded-2xl shadow-lg border-0 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Active Tasks</p>
              <p className="text-4xl font-bold text-blue-600">{stats.totalActive}</p>
            </div>
            <div className="text-5xl">⚡</div>
          </div>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex gap-3 mb-6">
        <Button
          onClick={() => setView('focus')}
          variant={view === 'focus' ? 'default' : 'outline'}
          className={`rounded-full ${view === 'focus' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
        >
          🎯 Daily Focus
        </Button>
        <Button
          onClick={() => setView('kanban')}
          variant={view === 'kanban' ? 'default' : 'outline'}
          className={`rounded-full ${view === 'kanban' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
        >
          📋 Kanban
        </Button>
        <Button
          onClick={() => setView('all')}
          variant={view === 'all' ? 'default' : 'outline'}
          className={`rounded-full ${view === 'all' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}`}
        >
          📂 All Projects
        </Button>
      </div>

      {/* Daily Focus View */}
      {view === 'focus' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-xl border-0">
            <h2 className="text-3xl font-bold mb-2 text-gray-900">
              Today's Top 3
            </h2>
            <p className="text-gray-500 mb-6">
              Focus on what matters most today 🌟
            </p>

            {todayTasks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎨</div>
                <p className="text-gray-500 text-lg">
                  No tasks scheduled for today!
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Time to plan your day or take a well-deserved break ✨
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`p-6 rounded-2xl border-2 ${getPriorityColor(task.priority)} hover:shadow-lg transition-all cursor-pointer group`}
                    onClick={() => handleToggleTask(task.id, task.status)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'
                        } group-hover:scale-110 transition-transform`}>
                          {task.status === 'done' && <span className="text-white text-xl">✓</span>}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">{task.project_emoji}</span>
                          <span className="text-sm text-gray-500">{task.project_title}</span>
                          {task.is_quick_win && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              ⚡ Quick Win
                            </span>
                          )}
                        </div>

                        <h3 className={`text-xl font-semibold mb-2 ${
                          task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-gray-600 text-sm">{task.description}</p>
                        )}

                        {task.estimated_minutes && (
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <span>⏱️</span>
                            <span>{task.estimated_minutes} min</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vision Board - Project Cards with Images */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.filter(p => p.status === 'active').map(project => (
              <Card
                key={project.id}
                className="overflow-hidden rounded-3xl shadow-xl border-0 hover:shadow-2xl transition-all group"
                style={{ borderTop: `6px solid ${project.color}` }}
              >
                {/* Vision Image */}
                {project.vision_image_url && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={project.vision_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-4xl">{project.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-gray-600 text-sm">{project.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span className="font-semibold">
                        {project.total_tasks > 0
                          ? Math.round((project.tasks_completed / project.total_tasks) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${project.total_tasks > 0 ? (project.tasks_completed / project.total_tasks) * 100 : 0}%`,
                          background: `linear-gradient(to right, ${project.color}, ${project.color}dd)`
                        }}
                      />
                    </div>
                  </div>

                  {/* Task Count */}
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-gray-600">{project.tasks_completed} done</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-600">○</span>
                      <span className="text-gray-600">{project.tasks_remaining} remaining</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['todo', 'in_progress', 'done'].map(status => {
            const statusTasks = allTasks.filter(t => t.status === status)
            const statusConfig = {
              todo: { title: 'To Do', emoji: '📝', bg: 'bg-gray-50', border: 'border-gray-200' },
              in_progress: { title: 'In Progress', emoji: '🚀', bg: 'bg-blue-50', border: 'border-blue-200' },
              done: { title: 'Done', emoji: '✅', bg: 'bg-green-50', border: 'border-green-200' }
            }[status] || { title: status, emoji: '○', bg: 'bg-gray-50', border: 'border-gray-200' }

            return (
              <div key={status} className={`rounded-3xl p-6 ${statusConfig.bg} border-2 ${statusConfig.border}`}>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-2xl">{statusConfig.emoji}</span>
                  {statusConfig.title}
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    {statusTasks.length}
                  </span>
                </h3>

                <div className="space-y-3">
                  {statusTasks.map(task => (
                    <Card
                      key={task.id}
                      className="p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border-0"
                      onClick={() => handleToggleTask(task.id, task.status)}
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="text-xl">{task.project_emoji}</span>
                        <h4 className="font-semibold text-gray-900 flex-1">
                          {task.title}
                        </h4>
                      </div>

                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* All Projects View */}
      {view === 'all' && (
        <div className="space-y-6">
          {projects.map(project => {
            const projectTasks = allTasks.filter(t => t.project_id === project.id)

            return (
              <Card key={project.id} className="p-8 rounded-3xl shadow-xl border-0">
                <div className="flex items-start gap-4 mb-6">
                  <span className="text-5xl">{project.emoji}</span>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {project.title}
                    </h2>
                    {project.description && (
                      <p className="text-gray-600">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {projectTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border-2 ${getPriorityColor(task.priority)} hover:shadow-md transition-all cursor-pointer`}
                      onClick={() => handleToggleTask(task.id, task.status)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}>
                          {task.status === 'done' && <span className="text-white text-sm">✓</span>}
                        </div>
                        <span className={`flex-1 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                        <span className="text-xs text-gray-500">{task.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Quick Add Button - Floating */}
      <button
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-2xl flex items-center justify-center text-white text-3xl hover:scale-110 transition-transform z-40"
        onClick={() => alert('Quick Add Task - Coming soon!')}
      >
        +
      </button>
    </div>
  )
}
