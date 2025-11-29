"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { WorkflowsPanel } from "./components/WorkflowsPanel"
import { EmailQueue } from "./components/EmailQueue"
import { EmailDrafts } from "./components/EmailDrafts"
import { AgentActivity } from "./components/AgentActivity"
import { OfferPathwayCard } from "./components/OfferPathwayCard"

export default function AutomationCenterPage() {
  const [loading, setLoading] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 px-8 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[22px] font-semibold text-stone-950">Automation Center</h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered workflows, email automation, and agent activity
            </p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Back to Admin
          </Link>
        </div>

        <Tabs defaultValue="workflows" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8 bg-white/80 backdrop-blur-xl rounded-2xl p-2 border border-border">
            <TabsTrigger
              value="workflows"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              Workflows
            </TabsTrigger>
            <TabsTrigger
              value="email-queue"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              Email Queue
            </TabsTrigger>
            <TabsTrigger
              value="drafts"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              Drafts
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              Agent Activity
            </TabsTrigger>
            <TabsTrigger
              value="offer-pathway"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              Offer Pathway
            </TabsTrigger>
            <TabsTrigger
              value="behavior"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              Behavior Loop
            </TabsTrigger>
            <TabsTrigger
              value="experiments"
              className="data-[state=active]:bg-stone-950 data-[state=active]:text-white text-sm"
            >
              A/B Tests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <WorkflowsPanel />
          </TabsContent>

          <TabsContent value="email-queue">
            <EmailQueue />
          </TabsContent>

          <TabsContent value="drafts">
            <EmailDrafts />
          </TabsContent>

          <TabsContent value="activity">
            <AgentActivity />
          </TabsContent>

          <TabsContent value="offer-pathway">
            <OfferPathwayCard />
          </TabsContent>

          <TabsContent value="behavior">
            <div className="rounded-2xl border border-border bg-white/80 backdrop-blur-xl p-8">
              <iframe
                src="/admin/automation-center/behavior"
                className="h-[800px] w-full border-0"
                title="Behavior Loop Intelligence"
              />
            </div>
          </TabsContent>

          <TabsContent value="experiments">
            <div className="rounded-2xl border border-border bg-white/80 backdrop-blur-xl p-8">
              <iframe
                src="/admin/automation-center/experiments"
                className="h-[800px] w-full border-0"
                title="A/B Experiments"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
