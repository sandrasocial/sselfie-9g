'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminNav } from './admin-nav'

interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  mrr: number
  totalRevenue: number
  conversionRate: number
}

interface MissionControlTask {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  cursorPrompt?: string
  actionType: 'cursor' | 'alex' | 'manual'
  completed: boolean
}

export function AdminDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todaysPriorities, setTodaysPriorities] = useState<MissionControlTask[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchDashboardData()
    fetchTodaysPriorities()
  }, [])
  
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchTodaysPriorities = async () => {
    try {
      const response = await fetch('/api/admin/mission-control/daily-check', {
        method: 'POST'
      })
      const data = await response.json()
      
      // Extract high priority tasks from all agents
      const highPriorityTasks: MissionControlTask[] = []
      if (data.checks && Array.isArray(data.checks)) {
        data.checks.forEach((check: any) => {
          if (check.issues && Array.isArray(check.issues)) {
            check.issues
              .filter((issue: any) => issue.priority === 'high' && !issue.completed)
              .forEach((issue: any) => {
                highPriorityTasks.push({
                  priority: issue.priority,
                  title: issue.title,
                  description: issue.description || issue.cursorPrompt || '',
                  cursorPrompt: issue.cursorPrompt,
                  actionType: issue.actionType || 'manual',
                  completed: issue.completed || false
                })
              })
          }
        })
      }
      
      setTodaysPriorities(highPriorityTasks.slice(0, 3)) // Top 3
    } catch (error) {
      console.error('Error fetching priorities:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="flex items-center justify-center h-96">
          <p className="text-sm tracking-[0.2em] uppercase text-stone-400">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Hero Section - Today's Focus */}
        <div className="mb-16">
          <h1 className="font-['Times_New_Roman'] text-5xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-4">
            TODAY'S FOCUS
          </h1>
          <p className="text-sm text-stone-500 tracking-[0.1em] uppercase mb-12">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
          
          {/* Today's Priorities */}
          {todaysPriorities.length > 0 ? (
            <div className="space-y-4 mb-12">
              {todaysPriorities.map((task, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-stone-200 p-6 rounded-none group hover:border-stone-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`h-2 w-2 rounded-full ${
                          task.priority === 'high' ? 'bg-stone-950' : 'bg-stone-400'
                        }`} />
                        <p className="text-xs tracking-[0.2em] uppercase text-stone-400">
                          Priority {idx + 1}
                        </p>
                      </div>
                      <h3 className="text-base font-['Times_New_Roman'] text-stone-950 mb-2">
                        {task.title}
                      </h3>
                      <p className="text-sm text-stone-600 mb-4">
                        {task.description}
                      </p>
                      <Link
                        href={task.actionType === 'alex' ? '/admin/alex' : '/admin/mission-control'}
                        className="text-xs tracking-[0.2em] uppercase text-stone-950 hover:text-stone-600 transition-colors border-b border-stone-950 pb-1"
                      >
                        {task.actionType === 'alex' ? 'Ask Alex' : 
                         task.actionType === 'cursor' ? 'View Fix' : 'Take Action'}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-stone-200 p-12 text-center rounded-none mb-12">
              <p className="text-sm tracking-[0.2em] uppercase text-stone-400 mb-2">
                All Clear
              </p>
              <p className="text-xs text-stone-500">
                No high priority tasks today
              </p>
            </div>
          )}
          
          {/* Key Metrics - 4 Column Grid */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-stone-950 text-white p-8 rounded-none">
              <p className="text-4xl font-['Times_New_Roman'] font-extralight mb-2">
                ${(stats?.mrr || 0).toLocaleString()}
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-stone-300">
                Monthly Recurring Revenue
              </p>
            </div>
            
            <div className="bg-white border border-stone-200 p-8 rounded-none">
              <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
                {stats?.activeSubscriptions || 0}
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                Active Subscriptions
              </p>
            </div>
            
            <div className="bg-white border border-stone-200 p-8 rounded-none">
              <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
                {stats?.totalUsers || 0}
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                Total Users
              </p>
            </div>
            
            <div className="bg-white border border-stone-200 p-8 rounded-none">
              <p className="text-4xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-2">
                {stats?.conversionRate || 0}%
              </p>
              <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">
                Conversion Rate
              </p>
            </div>
          </div>
        </div>
        
        {/* Quick Access - Pinterest Grid */}
        <div className="mb-16">
          <h2 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-8">
            QUICK ACCESS
          </h2>
          
          <div className="grid grid-cols-3 gap-6">
            
            {/* Alex */}
            <Link href="/admin/alex" className="group">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/friendly-ai-assistant-avatar-maya.jpg"
                  alt="Alex"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white mb-2">
                    ALEX
                  </h3>
                  <p className="text-xs text-white/80 tracking-wide">
                    Your AI marketing partner
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Mission Control */}
            <Link href="/admin/mission-control" className="group">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/minimalist-desk-setup-with-pendant-light-neutral-a.jpg"
                  alt="Mission Control"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white mb-2">
                    MISSION CONTROL
                  </h3>
                  <p className="text-xs text-white/80 tracking-wide">
                    AI team intelligence
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Weekly Journal */}
            <Link href="/admin/journal" className="group">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/black-productivity-planner-with-iced-coffee-minima.jpg"
                  alt="Journal"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white mb-2">
                    JOURNAL
                  </h3>
                  <p className="text-xs text-white/80 tracking-wide">
                    Weekly updates & stories
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Maya Studio */}
            <Link href="/studio" className="group">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/minimalist-phone-with-instagram-aesthetic-white-ba.jpg"
                  alt="Studio"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white mb-2">
                    MAYA STUDIO
                  </h3>
                  <p className="text-xs text-white/80 tracking-wide">
                    Create brand photos
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Credits */}
            <Link href="/admin/credits" className="group">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/images/641-yz6rwohjtemwagcwy5xqjtsczx9lfh.png"
                  alt="Credits"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  onError={(e) => {
                    // Fallback if image doesn't exist
                    e.currentTarget.src = '/minimalist-desk-setup-with-pendant-light-neutral-a.jpg'
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white mb-2">
                    CREDITS
                  </h3>
                  <p className="text-xs text-white/80 tracking-wide">
                    Manage user credits
                  </p>
                </div>
              </div>
            </Link>
            
            {/* Analytics */}
            <Link href="/admin/stripe-insights" className="group">
              <div className="relative overflow-hidden aspect-[4/5] bg-stone-200 rounded-none">
                <img
                  src="/minimalist-desk-setup-with-pendant-light-neutral-a.jpg"
                  alt="Analytics"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8">
                  <h3 className="font-['Times_New_Roman'] text-3xl font-extralight tracking-[0.3em] uppercase text-white mb-2">
                    ANALYTICS
                  </h3>
                  <p className="text-xs text-white/80 tracking-wide">
                    Revenue & metrics
                  </p>
                </div>
              </div>
            </Link>
            
          </div>
        </div>
        
        {/* Secondary Tools */}
        <div className="border-t border-stone-200 pt-12">
          <h2 className="font-['Times_New_Roman'] text-xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-8">
            TOOLS
          </h2>
          
          <div className="grid grid-cols-4 gap-4">
            <Link 
              href="/admin/testimonials"
              className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-all rounded-none"
            >
              <p className="text-sm tracking-[0.2em] uppercase text-stone-950 mb-1">
                Testimonials
              </p>
              <p className="text-xs text-stone-400">
                Manage reviews
              </p>
            </Link>
            
            <Link 
              href="/admin/users"
              className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-all rounded-none"
            >
              <p className="text-sm tracking-[0.2em] uppercase text-stone-950 mb-1">
                Users
              </p>
              <p className="text-xs text-stone-400">
                User management
              </p>
            </Link>
            
            <Link 
              href="/admin/login-as-user"
              className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-all rounded-none"
            >
              <p className="text-sm tracking-[0.2em] uppercase text-stone-950 mb-1">
                Login As User
              </p>
              <p className="text-xs text-stone-400">
                Access accounts
              </p>
            </Link>
            
            <Link 
              href="/admin/maya-testing"
              className="bg-white border border-stone-200 p-6 hover:border-stone-400 transition-all rounded-none"
            >
              <p className="text-sm tracking-[0.2em] uppercase text-stone-950 mb-1">
                Maya Testing
              </p>
              <p className="text-xs text-stone-400">
                Test parameters
              </p>
            </Link>
          </div>
        </div>
        
      </div>
    </div>
  )
}









