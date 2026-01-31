"use client"

import { TrendingUp, DollarSign, Users, Mail, Instagram } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-8 py-6">
        <h1 className="text-2xl font-['Times_New_Roman'] tracking-[0.2em] uppercase text-stone-950">
          Business Analytics
        </h1>
        <p className="text-xs tracking-[0.15em] uppercase text-stone-400 mt-1">
          Powered by Gumloop Agent 9
        </p>
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {/* Setup Notice */}
        <div className="bg-blue-50 border border-blue-200 p-6 mb-8">
          <h2 className="text-sm tracking-[0.15em] uppercase text-blue-950 mb-2">
            🚀 Analytics Automation Coming Soon
          </h2>
          <p className="text-xs text-blue-900">
            Once you build <strong>Agent 9 (Analytics Reporter)</strong> in Gumloop, this page will show:
          </p>
          <ul className="text-xs text-blue-800 mt-3 space-y-1 list-disc list-inside">
            <li>Daily business metrics (revenue, signups, engagement)</li>
            <li>Weekly deep-dive reports with trends</li>
            <li>Performance insights and recommendations</li>
            <li>Automated data from Stripe, Resend, Instagram, Neon</li>
          </ul>
          <p className="text-xs text-blue-900 mt-4">
            See <strong>GUMLOOP_AGENT_SETUP_GUIDE.md</strong> for Agent 9 setup instructions.
          </p>
        </div>

        {/* Placeholder Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400">Revenue (24h)</p>
            </div>
            <p className="text-2xl font-['Times_New_Roman'] text-stone-950">$--</p>
            <p className="text-[10px] text-stone-500 mt-1">Connect Agent 9 for live data</p>
          </div>

          <div className="bg-white border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400">New Signups</p>
            </div>
            <p className="text-2xl font-['Times_New_Roman'] text-stone-950">--</p>
            <p className="text-[10px] text-stone-500 mt-1">Connect Agent 9 for live data</p>
          </div>

          <div className="bg-white border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="w-5 h-5 text-purple-600" />
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400">Email Open Rate</p>
            </div>
            <p className="text-2xl font-['Times_New_Roman'] text-stone-950">--%</p>
            <p className="text-[10px] text-stone-500 mt-1">Connect Agent 9 for live data</p>
          </div>

          <div className="bg-white border border-stone-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Instagram className="w-5 h-5 text-pink-600" />
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400">IG Engagement</p>
            </div>
            <p className="text-2xl font-['Times_New_Roman'] text-stone-950">--%</p>
            <p className="text-[10px] text-stone-500 mt-1">Connect Agent 9 for live data</p>
          </div>
        </div>

        {/* Daily Report Placeholder */}
        <div className="bg-white border border-stone-200 p-8 mb-8">
          <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.15em] uppercase text-stone-950 mb-4">
            Daily Report
          </h2>
          <div className="space-y-4 text-sm text-stone-600">
            <p>☀️ Your daily report will appear here automatically once Agent 9 is connected.</p>
            <p>Agent 9 runs every morning at 7 AM and provides:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Headline summary of yesterday's performance</li>
              <li>Key wins (top 1-2 metrics that improved)</li>
              <li>Watch items (things trending down)</li>
              <li>Today's recommendation (one specific action to take)</li>
            </ul>
          </div>
        </div>

        {/* Weekly Report Placeholder */}
        <div className="bg-white border border-stone-200 p-8">
          <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.15em] uppercase text-stone-950 mb-4">
            Weekly Deep Dive
          </h2>
          <div className="space-y-4 text-sm text-stone-600">
            <p>📊 Your weekly analysis will appear here every Sunday evening.</p>
            <p>Agent 9 generates comprehensive reports including:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>7-day performance trends</li>
              <li>Revenue breakdown and forecasting</li>
              <li>Content performance analysis</li>
              <li>Subscriber growth and engagement metrics</li>
              <li>Strategic recommendations for the week ahead</li>
            </ul>
          </div>
        </div>

        {/* Setup CTA */}
        <div className="mt-8 bg-stone-950 text-white p-8 text-center">
          <h3 className="text-lg font-['Times_New_Roman'] tracking-[0.15em] uppercase mb-3">
            Ready to Automate Analytics?
          </h3>
          <p className="text-sm mb-6">
            Build Agent 9 in Gumloop and connect it to see live business metrics here.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="https://gumloop.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-200 transition-colors"
            >
              Open Gumloop →
            </a>
            <a
              href="/admin/agents"
              className="px-6 py-3 border border-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-950 transition-colors"
            >
              View All Agents
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
