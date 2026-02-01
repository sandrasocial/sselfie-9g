import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "AI Brand OS™ Strategy | SSELFIE",
  description: "Complete strategy and implementation guide for AI Brand OS™ high-ticket offer",
}

export default function StrategyPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin/project-tracker"
                className="text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-stone-600 transition-colors mb-2 inline-block"
              >
                ← Back to Tracker
              </Link>
              <h1 className="text-2xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-1">
                AI Brand OS™ Strategy
              </h1>
              <p className="text-xs tracking-[0.15em] uppercase text-stone-400">
                Locked In • Ready for Waitlist Launch
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">
                Year 1 Target
              </div>
              <div className="text-2xl font-['Times_New_Roman'] text-stone-950">
                $341,932
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
              Setup Price
            </div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950 mb-1">
              $7,500
            </div>
            <div className="text-xs text-stone-500">
              Beta: $4,997
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
              Monthly
            </div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950 mb-1">
              $697
            </div>
            <div className="text-xs text-stone-500">
              Beta: $497/mo
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
              Timeline
            </div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950 mb-1">
              6 weeks
            </div>
            <div className="text-xs text-stone-500">
              Full delivery
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
              Capacity
            </div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950 mb-1">
              3/month
            </div>
            <div className="text-xs text-stone-500">
              Max clients
            </div>
          </div>
        </div>

        {/* The Big Idea */}
        <div className="bg-stone-950 text-stone-50 p-12 mb-12">
          <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-4">
            The Big Idea
          </div>
          <h2 className="text-4xl font-['Times_New_Roman'] mb-6 leading-tight">
            Replace their entire content + social media team with an AI infrastructure that costs $697/mo to run.
          </h2>
          <p className="text-stone-300 text-lg leading-relaxed">
            We're not selling content. We're selling an AI marketing infrastructure that runs 24/7.
          </p>
        </div>

        {/* What We're Building */}
        <div className="bg-white border border-stone-200 p-8 mb-8">
          <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-6">
            What We're Actually Building
          </h3>
          <div className="space-y-4 text-stone-600">
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">Custom AI Content Twin</strong> — Trained on their face + voice, generates authentic content automatically
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">6-8 Gumloop Automation Workflows</strong> — Content generation, distribution, lead nurture, repurposing
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">90 Days of Content Scheduled</strong> — 150+ pieces ready to post across all platforms from day 1
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">Complete Distribution System</strong> — Auto-posting to Instagram, LinkedIn, Twitter, email with optimal timing
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">Lead Nurture Automation</strong> — Welcome sequences, segmentation, re-engagement flows
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">Content Repurposing Engine</strong> — One piece → 10 formats automatically
              </div>
            </div>
            <div className="flex gap-4">
              <span className="text-stone-950 font-bold">✓</span>
              <div>
                <strong className="text-stone-950">Monthly Management</strong> — Strategy calls, optimization, new workflows, technical support
              </div>
            </div>
          </div>
        </div>

        {/* 6-Week Delivery Timeline */}
        <div className="bg-white border border-stone-200 p-8 mb-8">
          <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-6">
            6-Week Delivery Timeline
          </h3>
          <div className="space-y-6">
            <div className="border-l-4 border-stone-950 pl-6 py-2">
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                Week 1-2
              </div>
              <div className="font-bold text-stone-950 mb-2">
                Foundation & Voice Capture
              </div>
              <div className="text-sm text-stone-600">
                90-min strategy call • Brand Voice Blueprint (15-20 pages) • Train custom AI model on their selfies • Build custom GPT + Claude Project
              </div>
            </div>

            <div className="border-l-4 border-stone-700 pl-6 py-2">
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                Week 3-4
              </div>
              <div className="font-bold text-stone-950 mb-2">
                Automation Infrastructure
              </div>
              <div className="text-sm text-stone-600">
                Build 6-8 Gumloop workflows • Set up Zapier/Make integrations • Connect social accounts • Configure scheduling tools • Set up monitoring
              </div>
            </div>

            <div className="border-l-4 border-stone-500 pl-6 py-2">
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                Week 5-6
              </div>
              <div className="font-bold text-stone-950 mb-2">
                Content Generation & Training
              </div>
              <div className="text-sm text-stone-600">
                Generate 90 days of content • Schedule 150+ pieces • Create system playbook • 3 training sessions • Launch everything live
              </div>
            </div>

            <div className="border-l-4 border-stone-300 pl-6 py-2">
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-1">
                Ongoing
              </div>
              <div className="font-bold text-stone-950 mb-2">
                Monthly Management ($697/mo)
              </div>
              <div className="text-sm text-stone-600">
                All API costs • Monthly strategy calls • Content calendar refresh • Performance monitoring • New workflows • Technical support
              </div>
            </div>
          </div>
        </div>

        {/* ROI Comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white border border-stone-200 p-8">
            <h3 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-4">
              What They're Paying Now
            </h3>
            <div className="space-y-3 text-sm text-stone-600 mb-6">
              <div className="flex justify-between">
                <span>Social media manager</span>
                <span className="font-bold text-stone-950">$1,500-3,000/mo</span>
              </div>
              <div className="flex justify-between">
                <span>Content writer</span>
                <span className="font-bold text-stone-950">$1,000-2,000/mo</span>
              </div>
              <div className="flex justify-between">
                <span>VA for scheduling</span>
                <span className="font-bold text-stone-950">$500-1,000/mo</span>
              </div>
              <div className="flex justify-between">
                <span>Graphic designer</span>
                <span className="font-bold text-stone-950">$500-1,000/mo</span>
              </div>
              <div className="border-t border-stone-200 pt-3 flex justify-between text-lg">
                <span className="font-bold text-stone-950">Total</span>
                <span className="font-bold text-stone-950">$3,500-7,000/mo</span>
              </div>
            </div>
          </div>

          <div className="bg-stone-950 text-stone-50 p-8">
            <h3 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] mb-4">
              What They Pay You
            </h3>
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between">
                <span className="text-stone-300">Setup (one-time)</span>
                <span className="font-bold">$7,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-300">Monthly management</span>
                <span className="font-bold">$697/mo</span>
              </div>
              <div className="border-t border-stone-700 pt-3">
                <div className="flex justify-between text-lg mb-3">
                  <span className="font-bold">Year 1 Total</span>
                  <span className="font-bold">$15,864</span>
                </div>
                <div className="text-xs text-stone-400">
                  Saves them $2,803-6,303/mo compared to hiring team
                </div>
              </div>
            </div>
            <div className="bg-stone-900 p-4 mt-4">
              <div className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-1">
                ROI
              </div>
              <div className="text-2xl font-['Times_New_Roman']">
                Obvious.
              </div>
            </div>
          </div>
        </div>

        {/* Ideal Client Profile */}
        <div className="bg-white border border-stone-200 p-8 mb-8">
          <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-6">
            Ideal Client Profile
          </h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-3">
                Perfect Fit
              </div>
              <div className="space-y-2 text-sm text-stone-600">
                <div>✓ Making $100k-$500k/year</div>
                <div>✓ Spending $3k-7k/mo on content team OR doing it themselves (15+ hrs/week)</div>
                <div>✓ Content is their bottleneck to growth</div>
                <div>✓ Comfortable with AI tools</div>
                <div>✓ Active on IG, LinkedIn, email</div>
                <div>✓ Ready to invest $7k-15k in infrastructure</div>
              </div>
            </div>
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-3">
                Not Right For
              </div>
              <div className="space-y-2 text-sm text-stone-600">
                <div>✗ Under $100k/year revenue</div>
                <div>✗ Don't have proven offers yet</div>
                <div>✗ Want to stay hands-on with content</div>
                <div>✗ Don't see value in automation</div>
                <div>✗ Can't invest $7k+ upfront</div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Projections */}
        <div className="bg-white border border-stone-200 p-8 mb-8">
          <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-6">
            Revenue Projections (Conservative)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-stone-200">
              <div>
                <div className="font-bold text-stone-950">Months 1-2: Beta Launch</div>
                <div className="text-xs text-stone-500">2 Founding Members @ $4,997 setup + $497/mo</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-stone-950">$10,988</div>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-stone-200">
              <div>
                <div className="font-bold text-stone-950">Months 3-6: Standard Pricing</div>
                <div className="text-xs text-stone-500">12 clients @ $7,500 + monthly recurring</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-stone-950">$112,304</div>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-stone-200">
              <div>
                <div className="font-bold text-stone-950">Months 7-12: Scaling</div>
                <div className="text-xs text-stone-500">18 clients @ $7,500 + 20 active recurring</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-stone-950">$218,640</div>
              </div>
            </div>

            <div className="flex justify-between items-center py-3 bg-stone-950 text-stone-50 px-4 mt-4">
              <div>
                <div className="font-bold text-lg">Year 1 Total</div>
                <div className="text-xs text-stone-400">32 clients delivered, 20-25 active monthly</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-3xl font-['Times_New_Roman']">$341,932</div>
              </div>
            </div>
          </div>
        </div>

        {/* Launch Timeline - TODAY */}
        <div className="bg-amber-50 border-2 border-amber-300 p-8 mb-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-4xl">🚀</div>
            <div>
              <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-2">
                Launch Plan: TODAY (Waitlist Mode)
              </h3>
              <p className="text-sm text-stone-600">
                We're not waiting. The strategy is locked. We launch waitlist TODAY and start collecting signups.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <div className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">1</div>
              <div>
                <strong className="text-stone-950">Create waitlist page</strong>
                <div className="text-stone-600">/waitlist/ai-brand-os with email capture form</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">2</div>
              <div>
                <strong className="text-stone-950">Draft social media post</strong>
                <div className="text-stone-600">Instagram + LinkedIn announcing waitlist</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">3</div>
              <div>
                <strong className="text-stone-950">Email SSELFIE Studio users</strong>
                <div className="text-stone-600">"I'm testing something (waitlist opens today)"</div>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="bg-amber-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-0.5">4</div>
              <div>
                <strong className="text-stone-950">Goal: 20-30 waitlist signups in 2 weeks</strong>
                <div className="text-stone-600">Then open applications to qualified leads</div>
              </div>
            </div>
          </div>
        </div>

        {/* The Positioning (How You Talk About It) */}
        <div className="bg-white border border-stone-200 p-8 mb-8">
          <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-6">
            How You Talk About This (In Your Voice)
          </h3>

          <div className="space-y-6">
            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
                The Simple Explanation
              </div>
              <p className="text-stone-700 leading-relaxed">
                "I built SSELFIE Studio because I needed to show up online but couldn't afford photoshoots. Now I'm taking that same system and building it FOR coaches and creators who don't have time to DIY it. Custom AI that sounds like you, looks like you, posts like you. 90 days of content, ready to go."
              </p>
            </div>

            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
                The Problem
              </div>
              <p className="text-stone-700 leading-relaxed">
                You're spending $3k-6k/mo on content teams, social media managers, and VAs. You're still writing content yourself every week, manually posting to 3-4 platforms, creating graphics and captions. Your marketing still requires YOU to run it.
              </p>
            </div>

            <div>
              <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">
                The Solution
              </div>
              <p className="text-stone-700 leading-relaxed">
                What if your marketing ran itself? Content generated automatically. Posted across all platforms. Leads nurtured on autopilot. Everything repurposed and distributed. 24/7. No team to manage. That's what I build for you.
              </p>
            </div>
          </div>
        </div>

        {/* Next Actions */}
        <div className="bg-stone-950 text-stone-50 p-8">
          <h3 className="text-xl font-['Times_New_Roman'] tracking-[0.05em] mb-6">
            Status: LOCKED IN ✅
          </h3>
          <p className="text-stone-300 mb-6">
            No more strategy. No more research. Now we build and market.
          </p>
          <div className="flex gap-4">
            <Link
              href="/admin/project-tracker"
              className="bg-white text-stone-950 px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-stone-100 transition-colors"
            >
              View Tasks
            </Link>
            <a
              href="/docs/high-ticket-offer-strategy.md"
              target="_blank"
              className="bg-stone-800 text-stone-50 px-6 py-3 text-sm tracking-[0.15em] uppercase hover:bg-stone-700 transition-colors"
            >
              Full Strategy Doc
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}
