"use client"

import Link from "next/link"
import { DollarSign, Users, Mail, Instagram } from "lucide-react"
import { AdminNav } from "@/components/admin/admin-nav"
import { AdminMetricCard } from "@/components/admin/shared"

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10 sm:mb-14">
          <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
            ANALYTICS
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase">
            Placeholder dashboard until the analytics automation is wired to live data.
          </p>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10">
          <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-3">
            SETUP
          </h2>
          <p className="text-xs text-stone-700 leading-relaxed">
            When the analytics automation is connected, this page should show daily metrics, weekly
            reports, and conversion insights from Stripe, Resend, and your database.
          </p>
          <p className="text-[10px] tracking-[0.1em] uppercase text-stone-400 mt-4">
            Reference: GUMLOOP_AGENT_SETUP_GUIDE.md
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
          <AdminMetricCard
            label="Revenue (24h)"
            value="$--"
            icon={<DollarSign className="w-5 h-5" />}
            subtitle="Connect automation for live data"
          />
          <AdminMetricCard
            label="New Signups"
            value="--"
            icon={<Users className="w-5 h-5" />}
            subtitle="Connect automation for live data"
          />
          <AdminMetricCard
            label="Email Performance"
            value="--"
            icon={<Mail className="w-5 h-5" />}
            subtitle="Connect automation for live data"
          />
          <AdminMetricCard
            label="IG Engagement"
            value="--"
            icon={<Instagram className="w-5 h-5" />}
            subtitle="Connect automation for live data"
          />
        </div>

        <div className="bg-stone-950 text-white p-8 rounded-none text-center">
          <h3 className="font-['Times_New_Roman'] text-lg tracking-[0.15em] uppercase mb-3">
            NEXT ACTION
          </h3>
          <p className="text-sm text-stone-200 mb-6">
            Use Marketing Health to verify email sequences are delivering, then wire funnel tracking
            to measure conversion and retention.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/admin/marketing"
              className="px-6 py-3 bg-white text-stone-950 text-xs tracking-[0.2em] uppercase hover:bg-stone-200 transition-colors rounded-none"
            >
              Open Marketing Health
            </Link>
            <Link
              href="/admin/agents"
              className="px-6 py-3 border border-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-stone-950 transition-colors rounded-none"
            >
              Open Agents
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
