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
  const [isPopulating, setIsPopulating] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    is_quick_win: false,
    estimated_minutes: 30
  })

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

  const handlePopulateTasks = async () => {
    if (!confirm('This will populate your High-Ticket Offer Launch project with 16 tasks. Continue?')) {
      return
    }

    setIsPopulating(true)
    try {
      const response = await fetch('/api/admin/populate-high-ticket-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        alert(`✅ ${data.message}`)
        window.location.reload()
      } else {
        alert(`Error: ${data.error || data.message}`)
      }
    } catch (error) {
      console.error('Error populating tasks:', error)
      alert('Failed to populate tasks. Check console for details.')
    } finally {
      setIsPopulating(false)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTask.title.trim()) {
      alert('Task title is required')
      return
    }

    // Get the High-Ticket Offer project ID
    const highTicketProject = projects.find(p => p.title === 'High-Ticket Offer Launch')
    if (!highTicketProject) {
      alert('Please populate High-Ticket tasks first, or create a project')
      return
    }

    try {
      const response = await fetch('/api/admin/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTask,
          project_id: highTicketProject.id
        })
      })

      const data = await response.json()

      if (data.success) {
        setShowAddTask(false)
        setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          is_quick_win: false,
          estimated_minutes: 30
        })
        window.location.reload()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Error adding task:', error)
      alert('Failed to add task')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 text-red-900 border-red-200'
      case 'high': return 'bg-amber-50 text-amber-900 border-amber-200'
      case 'medium': return 'bg-stone-100 text-stone-900 border-stone-300'
      case 'low': return 'bg-stone-50 text-stone-700 border-stone-200'
      case 'someday': return 'bg-stone-50 text-stone-500 border-stone-200'
      default: return 'bg-stone-100 text-stone-800 border-stone-200'
    }
  }

  return (
    <div>
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-zoom-in text-8xl">
            ✓
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8 border-b border-stone-200 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Project Tracker
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              ADHD-friendly task management system
            </p>
          </div>
          {allTasks.length === 0 && (
            <button
              onClick={handlePopulateTasks}
              disabled={isPopulating}
              className="px-4 py-2 bg-stone-950 text-stone-50 text-xs tracking-[0.15em] uppercase hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {isPopulating ? 'Loading...' : '💎 Add High-Ticket Tasks'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Today's Wins</p>
              <p className="text-3xl font-['Times_New_Roman'] text-stone-950">{stats.todayCompleted}</p>
            </div>
            <div className="text-3xl">✓</div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">This Week</p>
              <p className="text-3xl font-['Times_New_Roman'] text-stone-950">{stats.weekCompleted}</p>
            </div>
            <div className="text-3xl">∑</div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Active Tasks</p>
              <p className="text-3xl font-['Times_New_Roman'] text-stone-950">{stats.totalActive}</p>
            </div>
            <div className="text-3xl">→</div>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-6 border-b border-stone-200">
        <button
          onClick={() => setView('focus')}
          className={`px-4 py-2 text-xs tracking-[0.15em] uppercase transition-colors ${
            view === 'focus'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          Daily Focus
        </button>
        <button
          onClick={() => setView('kanban')}
          className={`px-4 py-2 text-xs tracking-[0.15em] uppercase transition-colors ${
            view === 'kanban'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          Kanban
        </button>
        <button
          onClick={() => setView('all')}
          className={`px-4 py-2 text-xs tracking-[0.15em] uppercase transition-colors ${
            view === 'all'
              ? 'text-stone-950 border-b-2 border-stone-950'
              : 'text-stone-500 hover:text-stone-950'
          }`}
        >
          All Projects
        </button>
      </div>

      {/* Daily Focus View */}
      {view === 'focus' && (
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 p-6 sm:p-8">
            <h2 className="text-xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-1">
              Today's Top 3
            </h2>
            <p className="text-xs text-stone-600 mb-6">
              Focus on what matters most
            </p>

            {todayTasks.length === 0 ? (
              <div className="text-center py-12 border border-stone-200 bg-stone-50">
                <div className="text-4xl mb-3">—</div>
                <p className="text-sm text-stone-600">
                  No tasks scheduled for today
                </p>
                <p className="text-xs text-stone-500 mt-2">
                  Time to plan or rest
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`p-4 border ${getPriorityColor(task.priority)} hover:bg-stone-50 transition-colors cursor-pointer group`}
                    onClick={() => handleToggleTask(task.id, task.status)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-5 h-5 border flex items-center justify-center ${
                          task.status === 'done' ? 'bg-stone-950 border-stone-950' : 'border-stone-300 bg-white'
                        }`}>
                          {task.status === 'done' && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{task.project_emoji}</span>
                          <span className="text-xs text-stone-500 tracking-wider uppercase">{task.project_title}</span>
                          {task.is_quick_win && (
                            <span className="px-2 py-0.5 bg-stone-200 text-stone-700 text-xs tracking-wider uppercase">
                              Quick Win
                            </span>
                          )}
                        </div>

                        <h3 className={`text-sm font-medium mb-1 ${
                          task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-950'
                        }`}>
                          {task.title}
                        </h3>

                        {task.description && (
                          <p className="text-xs text-stone-600">{task.description}</p>
                        )}

                        {task.estimated_minutes && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-stone-500">
                            <span>→</span>
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

          {/* Project Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.filter(p => p.status === 'active').map(project => (
              <div
                key={project.id}
                className="bg-white border border-stone-200 hover:border-stone-300 transition-colors"
              >
                {/* Vision Image */}
                {project.vision_image_url && (
                  <div className="h-40 overflow-hidden border-b border-stone-200">
                    <img
                      src={project.vision_image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-3xl">{project.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-['Times_New_Roman'] text-stone-950 tracking-wide mb-1">
                        {project.title}
                      </h3>
                      {project.description && (
                        <p className="text-xs text-stone-600">{project.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-stone-600 mb-2">
                      <span className="tracking-wider uppercase">Progress</span>
                      <span className="font-medium">
                        {project.total_tasks > 0
                          ? Math.round((project.tasks_completed / project.total_tasks) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="h-1 bg-stone-200 overflow-hidden">
                      <div
                        className="h-full bg-stone-950 transition-all duration-500"
                        style={{
                          width: `${project.total_tasks > 0 ? (project.tasks_completed / project.total_tasks) * 100 : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Task Count */}
                  <div className="flex gap-4 text-xs text-stone-600">
                    <div className="flex items-center gap-1">
                      <span>✓</span>
                      <span>{project.tasks_completed} done</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>→</span>
                      <span>{project.tasks_remaining} remaining</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['todo', 'in_progress', 'done'].map(status => {
            const statusTasks = allTasks.filter(t => t.status === status)
            const statusConfig = {
              todo: { title: 'To Do', bg: 'bg-stone-50' },
              in_progress: { title: 'In Progress', bg: 'bg-stone-100' },
              done: { title: 'Done', bg: 'bg-stone-200' }
            }[status] || { title: status, bg: 'bg-stone-50' }

            return (
              <div key={status} className={`p-4 ${statusConfig.bg} border border-stone-200`}>
                <h3 className="text-xs tracking-[0.15em] uppercase text-stone-950 mb-4 flex items-center justify-between">
                  {statusConfig.title}
                  <span className="text-stone-500">
                    {statusTasks.length}
                  </span>
                </h3>

                <div className="space-y-2">
                  {statusTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-3 bg-white border border-stone-200 hover:border-stone-300 transition-colors cursor-pointer"
                      onClick={() => handleToggleTask(task.id, task.status)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-lg">{task.project_emoji}</span>
                        <h4 className="text-sm font-medium text-stone-950 flex-1">
                          {task.title}
                        </h4>
                      </div>

                      <span className={`inline-block px-2 py-0.5 text-xs tracking-wider uppercase ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
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
              <div key={project.id} className="bg-white border border-stone-200 p-6">
                <div className="flex items-start gap-3 mb-6 pb-4 border-b border-stone-200">
                  <span className="text-3xl">{project.emoji}</span>
                  <div className="flex-1">
                    <h2 className="text-xl font-['Times_New_Roman'] text-stone-950 tracking-wide mb-1">
                      {project.title}
                    </h2>
                    {project.description && (
                      <p className="text-xs text-stone-600">{project.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {projectTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-3 border ${getPriorityColor(task.priority)} hover:bg-stone-50 transition-colors cursor-pointer`}
                      onClick={() => handleToggleTask(task.id, task.status)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border flex items-center justify-center ${
                          task.status === 'done' ? 'bg-stone-950 border-stone-950' : 'border-stone-300'
                        }`}>
                          {task.status === 'done' && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-950'}`}>
                          {task.title}
                        </span>
                        <span className="text-xs text-stone-500 tracking-wider uppercase">{task.priority}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Quick Add Button - Floating */}
      <button
        className="fixed bottom-8 right-8 w-12 h-12 bg-stone-950 flex items-center justify-center text-stone-50 text-2xl hover:bg-stone-800 transition-colors z-40 border border-stone-950"
        onClick={() => setShowAddTask(true)}
      >
        +
      </button>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-stone-200 max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
              <h2 className="text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                Add New Task
              </h2>
              <button
                onClick={() => setShowAddTask(false)}
                className="text-stone-500 hover:text-stone-950 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-stone-700 mb-2">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:border-stone-950"
                  placeholder="What needs to be done?"
                  required
                />
              </div>

              <div>
                <label className="block text-xs tracking-[0.15em] uppercase text-stone-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:border-stone-950"
                  placeholder="Add details..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:border-stone-950"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="someday">Someday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-700 mb-2">
                    Time (min)
                  </label>
                  <input
                    type="number"
                    value={newTask.estimated_minutes}
                    onChange={(e) => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:border-stone-950"
                    min="5"
                    step="5"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTask.is_quick_win}
                    onChange={(e) => setNewTask({ ...newTask, is_quick_win: e.target.checked })}
                    className="w-4 h-4 border border-stone-300"
                  />
                  <span className="text-xs tracking-[0.15em] uppercase text-stone-700">
                    Quick Win (under 15 min)
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-stone-950 text-stone-50 text-xs tracking-[0.15em] uppercase hover:bg-stone-800 transition-colors"
                >
                  Add Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 text-xs tracking-[0.15em] uppercase hover:border-stone-950 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
