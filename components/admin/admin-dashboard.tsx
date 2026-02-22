'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminNav } from './admin-nav'
import { AdminMetricCard, AdminLoadingState } from './shared'
import { formatCurrency, formatAdminDate } from '@/lib/admin/format-utils'
import { Users, DollarSign, TrendingUp } from 'lucide-react'

interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  activeRecurringSubscriptions?: number
  activeBlueprintEntitlements?: number
  mrr: number
  totalRevenue: number
  conversionRate: number
  stripeLive?: {
    activeSubscriptions: number
    totalSubscriptions: number
    canceledSubscriptions30d: number
    totalRevenue: number
    mrr: number
    oneTimeRevenue: number
    creditPurchaseRevenue: number
    newSubscribers30d: number
    newOneTimeBuyers30d: number
    timestamp: string
    cached: boolean
  } | null
  dbValues?: {
    mrr: number
    activeSubscriptions: number
    totalRevenue: number
  }
  conversionOps?: {
    applications90d: number
    qualified90d: number
    callsBooked90d: number
    offersSent90d: number
    closedWon90d: number
    cashCollected90dCents: number
    activeMembershipsNow: number
    newMemberships30d: number
    churnedMemberships30d: number
  }
}

interface AdminError {
  toolName: string
  count: number
  lastSeen: string
  recentErrors: Array<{
    id: number
    error_message: string
    created_at: string
  }>
}

interface CronJob {
  jobName: string
  schedule: string
  path: string
  lastRun: {
    status: string
    startedAt: string
    finishedAt: string | null
    durationMs: number | null
    summary: Record<string, any>
  } | null
  runCount24h: number
  lastError: {
    message: string
    createdAt: string
  } | null
}

export function AdminDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [adminErrors, setAdminErrors] = useState<AdminError[]>([])
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchDashboardData()
    fetchAdminErrors()
    fetchCronStatus()
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
  
  
  const fetchAdminErrors = async () => {
    try {
      const response = await fetch('/api/admin/diagnostics/errors?since=24&limit=5')
      const data = await response.json()
      if (data.success && data.tools) {
        setAdminErrors(data.tools)
      }
    } catch (error) {
      console.error('Error fetching admin errors:', error)
    }
  }
  
  const fetchCronStatus = async () => {
    try {
      const response = await fetch('/api/admin/diagnostics/cron-status?since=24')
      const data = await response.json()
      if (data.success && data.jobs) {
        setCronJobs(data.jobs)
      }
    } catch (error) {
      console.error('Error fetching cron status:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <AdminLoadingState message="Loading dashboard..." fullScreen={false} />
      </div>
    )
  }
  const hasCronIssues = cronJobs.some((job) => job.lastRun?.status === 'failed' || job.lastError)
  const hasAdminErrors = adminErrors.length > 0
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        
        <div className="mb-12 sm:mb-16">
          <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
            BUSINESS HEALTH
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase mb-8 sm:mb-12">
            {formatAdminDate(new Date(), 'full')}
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8 sm:mb-12">
            <AdminMetricCard
              label="MRR (Stripe)"
              value={formatCurrency(stats?.stripeLive?.mrr || stats?.mrr || 0)}
              icon={<DollarSign className="w-5 h-5" />}
              variant="primary"
              subtitle={stats?.stripeLive ? 'Live from Stripe' : 'Estimated from DB'}
              source={stats?.stripeLive ? 'Stripe Live' : 'DB (subscriptions)'}
            />
            <AdminMetricCard
              label="Recurring Subscriptions"
              value={stats?.activeRecurringSubscriptions || stats?.stripeLive?.activeSubscriptions || stats?.activeSubscriptions || 0}
              icon={<Users className="w-5 h-5" />}
              source={stats?.stripeLive ? 'Stripe Live' : 'DB (subscriptions)'}
            />
            <AdminMetricCard
              label="Blueprint Entitlements"
              value={stats?.activeBlueprintEntitlements || 0}
              icon={<Users className="w-5 h-5" />}
              subtitle="active paid_blueprint rows"
              source="DB (subscriptions)"
            />
            <AdminMetricCard
              label="Total Revenue"
              value={formatCurrency(stats?.stripeLive?.totalRevenue || stats?.totalRevenue || 0)}
              icon={<DollarSign className="w-5 h-5" />}
              source={stats?.stripeLive ? 'Stripe Live + DB' : 'DB (stripe_payments)'}
            />
            <AdminMetricCard
              label="Canceled (30d)"
              value={stats?.stripeLive?.canceledSubscriptions30d || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              source="Stripe Live"
            />
          </div>

          <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                Conversion Ops (90D)
              </h3>
              <Link
                href="/admin/analytics"
                className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
              >
                View →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-stone-700">
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Applications</p>
                <p className="font-mono text-[11px]">{stats?.conversionOps?.applications90d ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Qualified</p>
                <p className="font-mono text-[11px]">{stats?.conversionOps?.qualified90d ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Calls / Offers</p>
                <p className="font-mono text-[11px]">
                  {(stats?.conversionOps?.callsBooked90d ?? 0)}/{(stats?.conversionOps?.offersSent90d ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Closed Won</p>
                <p className="font-mono text-[11px]">{stats?.conversionOps?.closedWon90d ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Cash Collected</p>
                <p className="font-mono text-[11px]">€{Math.round((stats?.conversionOps?.cashCollected90dCents ?? 0) / 100)}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Active Members</p>
                <p className="font-mono text-[11px]">{stats?.conversionOps?.activeMembershipsNow ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">New (30d)</p>
                <p className="font-mono text-[11px]">{stats?.conversionOps?.newMemberships30d ?? 0}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.12em] uppercase text-stone-500 mb-1">Churned (30d)</p>
                <p className="font-mono text-[11px]">{stats?.conversionOps?.churnedMemberships30d ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 sm:mb-12">
            <Link
              href="/admin/analytics"
              className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none hover:bg-stone-50 transition-colors"
            >
              <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 mb-1 tracking-[0.1em] uppercase">
                Analytics
              </h3>
              <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase">
                Revenue, metrics, growth
              </p>
            </Link>
            <Link
              href="/admin/mission-control"
              className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none hover:bg-stone-50 transition-colors"
            >
              <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 mb-1 tracking-[0.1em] uppercase">
                Mission Control
              </h3>
              <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase">
                Daily tasks, health checks
              </p>
            </Link>
            <Link
              href="/admin/agents"
              className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none hover:bg-stone-50 transition-colors"
            >
              <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 mb-1 tracking-[0.1em] uppercase">
                AI Agents
              </h3>
              <p className="text-[10px] sm:text-xs text-stone-400 tracking-[0.1em] uppercase">
                Gumloop control center
              </p>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8 sm:mb-12">
            {/* removed in CLEANUP-01: /admin/marketing and /admin/generation */}
          </div>
        </div>

        <div className="mb-12 sm:mb-16">
          <h2 className="font-['Times_New_Roman'] text-2xl sm:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-4 sm:mb-6">
            CRITICAL ALERTS (24H)
          </h2>
          {!hasCronIssues && !hasAdminErrors ? (
            <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none">
              <p className="text-xs sm:text-sm text-stone-500">No critical alerts in the last 24 hours.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                    Cron Status
                  </h3>
                  <Link
                    href="/admin/diagnostics/system"
                    className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
                  >
                    View →
                  </Link>
                </div>
                {cronJobs.slice(0, 4).map((job) => (
                  <div key={job.jobName} className="flex items-center justify-between text-xs text-stone-600 mb-2">
                    <span className="truncate">
                      {job.jobName.replace(/-/g, ' ')}
                    </span>
                    <span className={job.lastRun?.status === 'failed' || job.lastError ? 'text-red-600' : 'text-stone-500'}>
                      {job.lastRun?.status || 'idle'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm sm:text-base font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
                    Admin Errors
                  </h3>
                  <Link
                    href="/admin/diagnostics/errors"
                    className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
                  >
                    View →
                  </Link>
                </div>
                {adminErrors.slice(0, 4).map((error) => (
                  <div key={error.toolName} className="flex items-center justify-between text-xs text-stone-600 mb-2">
                    <span className="truncate">{error.toolName}</span>
                    <span className="text-stone-500">{error.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-12 sm:mb-16">
          <h2 className="font-['Times_New_Roman'] text-2xl sm:text-3xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-4 sm:mb-6">
            GROWTH SNAPSHOT (30D)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
              <p className="text-xs text-stone-500 mb-1">Total Users</p>
              <p className="text-lg text-stone-950">{stats?.totalUsers || 0}</p>
            </div>
            <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
              <p className="text-xs text-stone-500 mb-1">Recurring Subscriptions</p>
              <p className="text-lg text-stone-950">{stats?.activeRecurringSubscriptions || stats?.stripeLive?.activeSubscriptions || stats?.activeSubscriptions || 0}</p>
            </div>
            <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
              <p className="text-xs text-stone-500 mb-1">Blueprint Entitlements</p>
              <p className="text-lg text-stone-950">{stats?.activeBlueprintEntitlements || 0}</p>
            </div>
            <div className="bg-white border border-stone-200 p-4 sm:p-6 rounded-none">
              <p className="text-xs text-stone-500 mb-1">Conversion Rate</p>
              <p className="text-lg text-stone-950">{stats?.conversionRate || 0}%</p>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 pt-8 sm:pt-12">
          <h2 className="font-['Times_New_Roman'] text-lg sm:text-xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-6 sm:mb-8">
            QUICK ACCESS
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <Link
              href="/admin/mission-control"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Mission Control
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Daily tasks + health
              </p>
            </Link>
            <Link
              href="/admin/analytics"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Analytics
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Metrics + growth
              </p>
            </Link>
            <Link
              href="/admin/credits"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Users
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                Credits + access
              </p>
            </Link>
            <Link
              href="/admin/agents"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Agents
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                AI control center
              </p>
            </Link>
            <Link
              href="/admin/maya-studio"
              className="bg-white border border-stone-200 p-4 sm:p-6 hover:border-stone-400 transition-all rounded-none min-h-[100px] sm:min-h-[120px] flex flex-col justify-between"
            >
              <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 mb-1">
                Maya Studio
              </p>
              <p className="text-[10px] sm:text-xs text-stone-400">
                AI image generation
              </p>
            </Link>
            {/* removed in CLEANUP-01: /admin/feed-styles-v2 and /admin/project-tracker */}
          </div>
        </div>
        
      </div>
    </div>
  )
}
