"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Mail, Send, Eye, Edit, Clock, CheckCircle, Users, ArrowRight, Plus, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AdminNav } from "@/components/admin/admin-nav"
import EmailPreviewCard from "@/components/admin/email-preview-card"
import Link from "next/link"
import {
  generateWelcomeDay0,
  generateWelcomeDay3,
  generateWelcomeDay7,
} from "@/lib/email/templates/welcome-sequence"
import {
  generateNurtureDay1,
  generateNurtureDay5,
  generateNurtureDay10,
} from "@/lib/email/templates/nurture-sequence"
import {
  generateReengagementDay0,
  generateReengagementDay7,
  generateReengagementDay14,
} from "@/lib/email/templates/reengagement-sequence"
import {
  generateBlueprintFollowupDay0Email,
} from "@/lib/email/templates/blueprint-followup-day-0"
import {
  generateBlueprintFollowupDay3Email,
} from "@/lib/email/templates/blueprint-followup-day-3"
import {
  generateBlueprintFollowupDay7Email,
} from "@/lib/email/templates/blueprint-followup-day-7"
import {
  generateBlueprintFollowupDay14Email,
} from "@/lib/email/templates/blueprint-followup-day-14"
import {
  generateNurtureDay7Email,
} from "@/lib/email/templates/nurture-day-7"
import {
  generateWinBackOfferEmail,
} from "@/lib/email/templates/win-back-offer"
import {
  generateUpsellFreebieMembershipEmail,
} from "@/lib/email/templates/upsell-freebie-membership"
import {
  generateUpsellDay10Email,
} from "@/lib/email/templates/upsell-day-10"

interface ResendSegment {
  id: string
  name: string
  contactsCount: number
}

interface PredefinedSequence {
  id: string
  name: string
  description: string
  trigger: string
  targetAudience: string
  emails: Array<{
    number: number
    subject: string
    delayDays: number
    generate: (params?: any) => { html: string; text: string; subject: string }
  }>
  segmentId?: string
  segmentName?: string
  status: 'draft' | 'active' | 'scheduled'
  databaseId?: number // Database ID if sequence exists
}

export default function EmailSequencesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [sequences, setSequences] = useState<PredefinedSequence[]>([])
  const [segments, setSegments] = useState<ResendSegment[]>([])
  const [subscriberCounts, setSubscriberCounts] = useState<{
    welcome: number
    nurture: number
    reengagement: number
  }>({ welcome: 0, nurture: 0, reengagement: 0 })
  const [loading, setLoading] = useState(true)
  const [expandedSequences, setExpandedSequences] = useState<Set<string>>(new Set())
  const [activating, setActivating] = useState<string | null>(null)
  const [sequenceStatuses, setSequenceStatuses] = useState<Map<number, any>>(new Map())
  const [resendingEmails, setResendingEmails] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [segmentsData, countsData, sequencesData] = await Promise.all([
        fetch("/api/admin/email/get-resend-segments").then((r) => r.json()),
        fetch("/api/admin/email/get-subscriber-counts").then((r) => r.json()),
        fetch("/api/admin/email/get-automation-sequences").then((r) => r.json()),
      ])

      if (segmentsData.success) {
        setSegments(segmentsData.segments || [])
      }

      if (countsData.success) {
        setSubscriberCounts(countsData.counts || { welcome: 0, nurture: 0, reengagement: 0 })
      }

      // Load existing sequences from database
      const existingSequences: Map<string, { id: number; status: string; sequenceData: any }> = new Map()
      if (sequencesData.success && sequencesData.sequences) {
        sequencesData.sequences.forEach((seq: any) => {
          existingSequences.set(seq.name, {
            id: seq.id,
            status: seq.status,
            sequenceData: seq.sequenceData,
          })
        })
      }

      // Initialize sequences after data is loaded
      initializeSequences(
        segmentsData.segments || [], 
        countsData.counts || { welcome: 0, nurture: 0, reengagement: 0 },
        existingSequences
      )

      // Load status for all existing sequences
      if (sequencesData.success && sequencesData.sequences) {
        const statusPromises = sequencesData.sequences.map(async (seq: any) => {
          try {
            const statusResponse = await fetch(`/api/admin/email/get-sequence-status?sequenceId=${seq.id}`)
            const statusData = await statusResponse.json()
            if (statusData.success) {
              setSequenceStatuses((prev) => {
                const newMap = new Map(prev)
                newMap.set(seq.id, statusData)
                return newMap
              })
            }
          } catch (error) {
            console.error(`[v0] Error loading status for sequence ${seq.id}:`, error)
          }
        })
        await Promise.all(statusPromises)
      }
    } catch (error) {
      console.error("Error loading data:", error)
      // Initialize with empty data
      initializeSequences([], { welcome: 0, nurture: 0, reengagement: 0 }, new Map())
    } finally {
      setLoading(false)
    }
  }

  const initializeSequences = (
    loadedSegments: ResendSegment[] = segments, 
    counts = subscriberCounts,
    existingSequences: Map<string, { id: number; status: string; sequenceData: any }> = new Map()
  ) => {
    // Find segment IDs - try multiple matching strategies
    const betaSegment = loadedSegments.find(
      (s) =>
        s.name.toLowerCase().includes("beta") ||
        s.name.toLowerCase().includes("paid") ||
        s.name.toLowerCase().includes("customer")
    )
    const allSubscribersSegment = loadedSegments.find(
      (s) =>
        s.name.toLowerCase().includes("all subscriber") ||
        s.name.toLowerCase() === "all subscribers" ||
        s.name.toLowerCase().includes("subscriber") ||
        s.name.toLowerCase().includes("audience")
    )
    const inactiveSegment = loadedSegments.find(
      (s) =>
        s.name.toLowerCase().includes("inactive") ||
        s.name.toLowerCase().includes("cold") ||
        s.name.toLowerCase().includes("win back")
    )

    // Check if sequences exist in database and get their status
    const welcomeSequence = existingSequences.get("Welcome Sequence")
    const nurtureSequence = existingSequences.get("Nurture Sequence")
    const reengagementSequence = existingSequences.get("Re-engagement Sequence")

    const predefinedSequences: PredefinedSequence[] = [
      {
        id: "welcome-sequence",
        name: "Welcome Sequence",
        description: "Onboard new paid members with excitement and quick wins. Sent on Day 0, Day 3, and Day 7 after they join.",
        trigger: "User completes payment",
        targetAudience: `New paid SSELFIE Studio members (${subscriberCounts.welcome} potential recipients)`,
        segmentId: betaSegment?.id || process.env.NEXT_PUBLIC_RESEND_BETA_SEGMENT_ID || "",
        segmentName: betaSegment?.name || "Beta Customers",
        status: (welcomeSequence?.status === 'active' || welcomeSequence?.status === 'scheduled') ? welcomeSequence.status : "draft",
        databaseId: welcomeSequence?.id,
        emails: [
          {
            number: 1,
            subject: "You're in! Let's get you creating 🚀",
            delayDays: 0,
            generate: generateWelcomeDay0,
          },
          {
            number: 2,
            subject: "Quick check: How's it going? 💪",
            delayDays: 3,
            generate: generateWelcomeDay3,
          },
          {
            number: 3,
            subject: "One week in - you're crushing it! 🎯",
            delayDays: 7,
            generate: generateWelcomeDay7,
          },
        ],
      },
      {
        id: "nurture-sequence",
        name: "Nurture Sequence",
        description: "Convert free users to paid members. Targets ALL current subscribers (Blueprint + Freebie) who haven't purchased yet. This sequence nurtures everyone in your email list.",
        trigger: "User downloads Blueprint freebie or subscribes to freebie",
        targetAudience: `All free subscribers (${subscriberCounts.nurture} total: Blueprint + Freebie subscribers)`,
        segmentId: allSubscribersSegment?.id || "",
        segmentName: allSubscribersSegment?.name || "All Subscribers",
        status: (nurtureSequence?.status === 'active' || nurtureSequence?.status === 'scheduled') ? nurtureSequence.status : "draft",
        databaseId: nurtureSequence?.id,
        emails: [
          {
            number: 1,
            subject: "Your Blueprint is ready! (Plus something better) ✨",
            delayDays: 1,
            generate: generateNurtureDay1,
          },
          {
            number: 2,
            subject: "How Sarah went from invisible to booked solid 📈",
            delayDays: 5,
            generate: generateNurtureDay5,
          },
          {
            number: 3,
            subject: "Ready to be SEEN? (Let's make it simple) 💪",
            delayDays: 10,
            generate: generateNurtureDay10,
          },
        ],
      },
      {
        id: "reengagement-sequence",
        name: "Re-engagement Sequence",
        description: "Win back inactive users who haven't logged in for 30+ days. Soft approach with new features and comeback offers.",
        trigger: "30+ days of inactivity",
        targetAudience: `Inactive users (${subscriberCounts.reengagement} users with no login for 30+ days)`,
        segmentId: inactiveSegment?.id || "",
        segmentName: inactiveSegment?.name || "Inactive Users",
        status: (reengagementSequence?.status === 'active' || reengagementSequence?.status === 'scheduled') ? reengagementSequence.status : "draft",
        databaseId: reengagementSequence?.id,
        emails: [
          {
            number: 1,
            subject: "Haven't seen you in a while... 👀",
            delayDays: 0,
            generate: generateReengagementDay0,
          },
          {
            number: 2,
            subject: "You haven't seen what Maya can do now... 🚀",
            delayDays: 7,
            generate: generateReengagementDay7,
          },
          {
            number: 3,
            subject: "Last call: Come back to Studio (50% off) 💪",
            delayDays: 14,
            generate: generateReengagementDay14,
          },
        ],
      },
      {
        id: "blueprint-followup-sequence",
        name: "Blueprint Followup Sequence",
        description: "Follow-up emails for Blueprint subscribers. Currently uses Loops (NOT automated via Resend). Day 0, 3, 7, 14 emails.",
        trigger: "User completes Blueprint form",
        targetAudience: "Blueprint subscribers",
        segmentId: "",
        segmentName: "Blueprint Subscribers",
        status: "draft",
        emails: [
          {
            number: 1,
            subject: "Your Brand Blueprint is Ready!",
            delayDays: 0,
            generate: (params?: any) => {
              const result = generateBlueprintFollowupDay0Email({ 
                email: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "Your Brand Blueprint is Ready!" }
            },
          },
          {
            number: 2,
            subject: "3 Ways to Use Your Blueprint This Week",
            delayDays: 3,
            generate: (params?: any) => {
              const result = generateBlueprintFollowupDay3Email({ 
                email: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "3 Ways to Use Your Blueprint This Week" }
            },
          },
          {
            number: 3,
            subject: "[Name] went from 5K to 25K followers using this system",
            delayDays: 7,
            generate: (params?: any) => {
              const result = generateBlueprintFollowupDay7Email({ 
                email: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "[Name] went from 5K to 25K followers using this system" }
            },
          },
          {
            number: 4,
            subject: "Still thinking about it? Here's $10 off 💕",
            delayDays: 14,
            generate: (params?: any) => {
              const result = generateBlueprintFollowupDay14Email({ 
                email: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "Still thinking about it? Here's $10 off 💕" }
            },
          },
        ],
      },
      {
        id: "blueprint-email-sequence",
        name: "Blueprint Email Sequence",
        description: "Upsell sequence for Blueprint subscribers. Currently uses Loops (NOT automated via Resend). Day 3, 7, 10, 14 emails.",
        trigger: "Blueprint subscriber journey",
        targetAudience: "Blueprint subscribers who haven't converted",
        segmentId: "",
        segmentName: "Blueprint Subscribers",
        status: "draft",
        emails: [
          {
            number: 1,
            subject: "Ready for the Next Level?",
            delayDays: 3,
            generate: (params?: any) => {
              const result = generateUpsellFreebieMembershipEmail({ 
                recipientEmail: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "Ready for the Next Level?" }
            },
          },
          {
            number: 2,
            subject: "One Week In",
            delayDays: 7,
            generate: (params?: any) => {
              const result = generateNurtureDay7Email({ 
                recipientEmail: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "One Week In" }
            },
          },
          {
            number: 3,
            subject: "Ready for the Next Level?",
            delayDays: 10,
            generate: (params?: any) => {
              const result = generateUpsellDay10Email({ 
                recipientEmail: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "Ready for the Next Level?" }
            },
          },
          {
            number: 4,
            subject: "We Miss You - Here's Something Special",
            delayDays: 14,
            generate: (params?: any) => {
              const result = generateWinBackOfferEmail({ 
                recipientEmail: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "We Miss You - Here's Something Special" }
            },
          },
        ],
      },
      {
        id: "welcome-back-sequence",
        name: "Welcome Back Sequence",
        description: "Re-engagement sequence for returning users. Currently uses Loops (NOT automated via Resend). Day 7, 14 emails.",
        trigger: "Returning users",
        targetAudience: "Users who return after inactivity",
        segmentId: "",
        segmentName: "Returning Users",
        status: "draft",
        emails: [
          {
            number: 1,
            subject: "One Week In",
            delayDays: 7,
            generate: (params?: any) => {
              const result = generateNurtureDay7Email({ 
                recipientEmail: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "One Week In" }
            },
          },
          {
            number: 2,
            subject: "We Miss You - Here's Something Special",
            delayDays: 14,
            generate: (params?: any) => {
              const result = generateWinBackOfferEmail({ 
                recipientEmail: params?.email || "preview@example.com",
                firstName: params?.firstName
              })
              return { ...result, subject: "We Miss You - Here's Something Special" }
            },
          },
        ],
      },
    ]

    setSequences(predefinedSequences)
  }

  const toggleSequence = async (sequenceId: string) => {
    const newExpanded = new Set(expandedSequences)
    if (newExpanded.has(sequenceId)) {
      newExpanded.delete(sequenceId)
    } else {
      newExpanded.add(sequenceId)
      // Load sequence status when expanding
      await loadSequenceStatus(sequenceId)
    }
    setExpandedSequences(newExpanded)
  }

  const loadSequenceStatus = async (sequenceId: string) => {
    try {
      // Map predefined sequence IDs to names
      const sequenceNameMap: Record<string, string> = {
        'welcome-sequence': 'Welcome Sequence',
        'nurture-sequence': 'Nurture Sequence',
        'reengagement-sequence': 'Re-engagement Sequence',
      }
      
      const sequenceName = sequenceNameMap[sequenceId] || sequenceId
      
      // Try to find the sequence in database
      const response = await fetch(`/api/admin/email/get-automation-sequences`)
      const data = await response.json()
      
      if (data.success && data.sequences) {
        // Find sequence by name match
        const sequence = data.sequences.find((s: any) => 
          s.name === sequenceName || s.name.toLowerCase().includes(sequenceName.toLowerCase())
        )
        
        if (sequence) {
          const statusResponse = await fetch(`/api/admin/email/get-sequence-status?sequenceId=${sequence.id}`)
          const statusData = await statusResponse.json()
          
          if (statusData.success) {
            setSequenceStatuses((prev) => {
              const newMap = new Map(prev)
              newMap.set(sequence.id, statusData)
              return newMap
            })
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error loading sequence status:", error)
    }
  }

  const handleResendEmail = async (sequenceId: number, emailNumber: number) => {
    const resendKey = `${sequenceId}-${emailNumber}`
    try {
      setResendingEmails((prev) => new Set(prev).add(resendKey))

      const response = await fetch("/api/admin/email/resend-sequence-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequenceId,
          emailNumber,
          startTime: "now",
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Email Resent! ✅",
          description: `Email ${emailNumber} has been resent successfully.`,
        })
        
        // Reload sequence status directly using the database sequence ID
        const statusResponse = await fetch(`/api/admin/email/get-sequence-status?sequenceId=${sequenceId}`)
        const statusData = await statusResponse.json()
        
        if (statusData.success) {
          setSequenceStatuses((prev) => {
            const newMap = new Map(prev)
            newMap.set(sequenceId, statusData)
            return newMap
          })
        } else {
          console.error("[v0] Failed to reload sequence status:", statusData.error)
        }
      } else {
        throw new Error(data.error || "Failed to resend email")
      }
    } catch (error: any) {
      console.error("[v0] Error resending email:", error)
      toast({
        title: "Resend Failed",
        description: error.message || "Failed to resend email. Check console for details.",
        variant: "destructive",
      })
    } finally {
      setResendingEmails((prev) => {
        const newSet = new Set(prev)
        newSet.delete(resendKey)
        return newSet
      })
    }
  }

  const handleCreateSequence = async (sequence: PredefinedSequence) => {
    if (!sequence.segmentId) {
      toast({
        title: "Segment Required",
        description: "Please configure a segment ID for this sequence first.",
        variant: "destructive",
      })
      return
    }

    try {
      setActivating(sequence.id)

      // Generate email content for each email in the sequence
      const emails = sequence.emails.map((email) => {
        try {
          const generated = email.generate({ firstName: undefined })
          if (!generated || !generated.html) {
            throw new Error(`Failed to generate email ${email.number}: missing HTML`)
          }
          return {
            number: email.number,
            subject: generated.subject || email.subject,
            html: generated.html,
            text: generated.text || generated.html.replace(/<[^>]*>/g, ""),
            delayDays: email.delayDays || 0,
          }
        } catch (genError: any) {
          console.error(`[v0] Error generating email ${email.number}:`, genError)
          throw new Error(`Failed to generate email ${email.number}: ${genError.message}`)
        }
      })

      console.log(`[v0] Creating sequence "${sequence.name}" with ${emails.length} emails`)

      // Create sequence in database
      const response = await fetch("/api/admin/email/create-automation-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sequence.name,
          description: sequence.description,
          segmentId: sequence.segmentId,
          segmentName: sequence.segmentName,
          emails,
        }),
      })

      if (!response.ok) {
        let errorData: any = {}
        try {
          errorData = await response.json()
        } catch {
          const errorText = await response.text()
          errorData = { error: errorText }
        }
        console.error(`[v0] API error (${response.status}):`, errorData)
        
        // Handle duplicate sequence error
        if (response.status === 409 && errorData.existingSequenceId) {
          toast({
            title: "Sequence Already Exists",
            description: `Sequence "${sequence.name}" already exists (ID: ${errorData.existingSequenceId}). You can reactivate it from the sequences list.`,
            variant: "destructive",
          })
          throw new Error(`Sequence "${sequence.name}" already exists (ID: ${errorData.existingSequenceId}). ${errorData.message || "Please use a different name or activate the existing sequence."}`)
        }
        
        throw new Error(errorData.error || errorData.message || `API error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Automatically activate the sequence after creation
        const activateResponse = await fetch("/api/admin/email/activate-automation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sequenceId: data.sequenceId,
            startTime: "now",
          }),
        })

        if (!activateResponse.ok) {
          let activateErrorData: any = {}
          try {
            activateErrorData = await activateResponse.json()
          } catch {
            const errorText = await activateResponse.text()
            activateErrorData = { error: errorText }
          }
          
          // Handle duplicate activation error
          if (activateResponse.status === 409) {
            toast({
              title: "Sequence Already Active",
              description: activateErrorData.message || `This sequence is already active with ${activateErrorData.existingBroadcasts || 0} scheduled emails.`,
              variant: "destructive",
            })
          } else {
            toast({
              title: "Sequence Created (Activation Failed)",
              description: `${sequence.name} was created but activation failed: ${activateErrorData.error || activateErrorData.message || "Unknown error"}. You can activate it manually.`,
              variant: "destructive",
            })
          }
        } else {
          const activateData = await activateResponse.json()

          if (activateData.success) {
            toast({
              title: "Sequence Activated! 🚀",
              description: `${sequence.name} has been created and activated. ${activateData.scheduledEmails} emails scheduled.`,
            })
          } else {
            toast({
              title: "Sequence Created (Activation Failed)",
              description: `${sequence.name} was created but activation failed: ${activateData.error || "Unknown error"}. You can activate it manually.`,
              variant: "destructive",
            })
          }
        }
        // Reload sequences to show updated status
        await loadData()
      } else {
        throw new Error(data.error || "Failed to create sequence")
      }
    } catch (error: any) {
      console.error("[v0] Error creating sequence:", error)
      console.error("[v0] Error stack:", error.stack)
      console.error("[v0] Error details:", {
        message: error.message,
        name: error.name,
        cause: error.cause,
      })
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create sequence. Check console for details.",
        variant: "destructive",
      })
    } finally {
      setActivating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            LOADING SEQUENCES
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex-1">
              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900 mb-2">
                Email Sequences
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                Manage and activate automated email sequences for all subscribers
              </p>
            </div>
            <Link
              href="/admin/alex"
              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create Custom
            </Link>
          </div>
        </div>

        {/* Sequences List */}
        <div className="space-y-6">
          {sequences.map((sequence) => {
            const isExpanded = expandedSequences.has(sequence.id)

            return (
              <div
                key={sequence.id}
                className="bg-white rounded-lg border border-stone-200 overflow-hidden shadow-sm"
              >
                {/* Sequence Header Card */}
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-wider uppercase text-stone-900 break-words">
                          {sequence.name}
                        </h3>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border flex items-center gap-1.5 whitespace-nowrap ${
                          sequence.status === 'active' 
                            ? 'bg-green-50 text-green-700 border-green-300' 
                            : sequence.status === 'scheduled'
                            ? 'bg-blue-50 text-blue-700 border-blue-300'
                            : 'bg-stone-100 text-stone-700 border-stone-300'
                        }`}>
                          <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
                          {sequence.status === 'active' ? 'Active' : sequence.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                        </span>
                        {(sequence.id.includes("blueprint") || sequence.id === "welcome-back-sequence") && (
                          <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-medium border bg-amber-50 text-amber-800 border-amber-300 flex items-center gap-1.5 whitespace-nowrap">
                            <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="hidden sm:inline">Uses Loops (Preview Only)</span>
                            <span className="sm:hidden">Loops</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <div className="mb-4 p-3 sm:p-4 bg-stone-50 rounded-lg border border-stone-200">
                        <div className="flex items-start gap-2 mb-2">
                          <Info className="w-4 h-4 text-stone-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">{sequence.description}</p>
                        </div>
                        <div className="mt-3 space-y-1.5 text-[11px] sm:text-xs text-stone-600">
                          <div className="break-words">
                            <span className="font-medium">Trigger:</span> <span className="ml-1">{sequence.trigger}</span>
                          </div>
                          <div className="break-words">
                            <span className="font-medium">Target:</span> <span className="ml-1">{sequence.targetAudience}</span>
                          </div>
                          {sequence.segmentName && (
                            <div className="break-words">
                              <span className="font-medium">Segment:</span> <span className="ml-1">{sequence.segmentName}</span>
                              {sequence.segmentId && (
                                <span className="ml-2 text-stone-500 text-[10px] sm:text-xs">({sequence.segmentId.substring(0, 8)}...)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-stone-600 mb-4">
                        <span className="flex items-center gap-2">
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          {sequence.emails.length} emails
                        </span>
                        {sequence.segmentName && (
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-none">{sequence.segmentName}</span>
                          </span>
                        )}
                      </div>

                      {/* Email Preview Cards (when expanded) */}
                      {isExpanded && (
                        <div className="mt-4 sm:mt-6 space-y-4 border-t border-stone-200 pt-4 sm:pt-6">
                          {sequence.emails.map((email, index) => {
                            const emailContent = email.generate({ firstName: undefined })
                            const sendDate = new Date()
                            sendDate.setDate(sendDate.getDate() + (email.delayDays || 0))

                            // Get email status from sequence statuses
                            let emailStatus: any = null
                            let sequenceDbId: number | null = null
                            
                            // Find sequence status - use databaseId if available, otherwise match by name
                            if (sequence.databaseId) {
                              const status = sequenceStatuses.get(sequence.databaseId)
                              if (status) {
                                sequenceDbId = sequence.databaseId
                                emailStatus = status.emails?.find((e: any) => e.number === email.number)
                              }
                            } else {
                              // Fallback: match by sequence name
                              for (const [seqId, status] of sequenceStatuses.entries()) {
                                if (status.sequenceName === sequence.name || 
                                    status.sequenceName?.toLowerCase() === sequence.name.toLowerCase()) {
                                  sequenceDbId = seqId
                                  emailStatus = status.emails?.find((e: any) => e.number === email.number)
                                  break
                                }
                              }
                            }

                            const isNotSent = !emailStatus || emailStatus.status === 'not_sent'
                            const isFailed = emailStatus?.status === 'failed'
                            const isScheduled = emailStatus?.status === 'scheduled'
                            const isSent = emailStatus?.status === 'sent'
                            const resendKey = sequenceDbId ? `${sequenceDbId}-${email.number}` : ''
                            const isResending = resendingEmails.has(resendKey)

                            return (
                              <div
                                key={index}
                                className={`bg-stone-50 rounded-lg border p-4 ${
                                  isNotSent || isFailed 
                                    ? 'border-red-200 bg-red-50' 
                                    : isSent 
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-stone-200'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                      <span className="text-[10px] sm:text-xs font-medium text-stone-500 uppercase tracking-wider">
                                        Email {email.number} of {sequence.emails.length}
                                      </span>
                                      {emailStatus && (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                                          isSent 
                                            ? 'bg-green-100 text-green-700 border border-green-300'
                                            : isScheduled
                                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                            : isFailed || isNotSent
                                            ? 'bg-red-100 text-red-700 border border-red-300'
                                            : 'bg-stone-100 text-stone-700 border border-stone-300'
                                        }`}>
                                          {isSent ? '✓ Sent' : isScheduled ? '⏰ Scheduled' : isFailed ? '✗ Failed' : '⚠ Not Sent'}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-semibold text-sm sm:text-base text-stone-900 mb-1 break-words">{emailContent.subject || email.subject}</h4>
                                    <p className="text-[10px] sm:text-xs text-stone-600 break-words">
                                      Sends:{" "}
                                      {email.delayDays === 0
                                        ? "Immediately"
                                        : `Day ${email.delayDays}${index > 0 ? ` (${email.delayDays} days after previous)` : ""}`}
                                    </p>
                                    {emailStatus?.scheduledFor && (
                                      <p className="text-[10px] sm:text-xs text-stone-500 mt-1 break-words">
                                        Scheduled: {new Date(emailStatus.scheduledFor).toLocaleString()}
                                      </p>
                                    )}
                                    {emailStatus?.sentAt && (
                                      <p className="text-[10px] sm:text-xs text-green-600 mt-1 break-words">
                                        Sent: {new Date(emailStatus.sentAt).toLocaleString()}
                                      </p>
                                    )}
                                  </div>
                                  {(isNotSent || isFailed) && sequenceDbId && (
                                    <button
                                      onClick={() => handleResendEmail(sequenceDbId, email.number)}
                                      disabled={isResending}
                                      className="ml-4 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs font-medium uppercase tracking-wider"
                                    >
                                      <Send className="w-3 h-3" />
                                      {isResending ? "Resending..." : "Resend"}
                                    </button>
                                  )}
                                </div>

                                <EmailPreviewCard
                                  subject={emailContent.subject}
                                  preview={emailContent.html?.replace(/<[^>]*>/g, "").substring(0, 200) || ""}
                                  htmlContent={emailContent.html || ""}
                                  targetSegment={sequence.segmentName || "Segment"}
                                  targetCount={0}
                                  campaignType="resend"
                                  onEdit={() => {
                                    toast({
                                      title: "Edit Email",
                                      description: "Use Alex to edit this email sequence, or create a custom version.",
                                    })
                                  }}
                                  onApprove={() => {
                                    handleCreateSequence(sequence)
                                  }}
                                  onSchedule={() => {
                                    // Handled by create button
                                  }}
                                  isSequence={true}
                                  sequenceName={sequence.name}
                                  sequenceEmails={sequence.emails.map((e) => {
                                    const generated = e.generate({ firstName: undefined })
                                    return {
                                      number: e.number,
                                      subject: generated.subject || e.subject,
                                      html: generated.html,
                                      delayDays: e.delayDays,
                                    }
                                  })}
                                  sequenceIndex={index}
                                  sequenceTotal={sequence.emails.length}
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => toggleSequence(sequence.id)}
                        className="px-3 sm:px-4 py-2 bg-stone-100 text-stone-900 rounded-lg hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider"
                      >
                        <Eye className="w-4 h-4 flex-shrink-0" />
                        {isExpanded ? "Hide" : "Preview"}
                      </button>

                      {(sequence.id.includes("blueprint") || sequence.id === "welcome-back-sequence") ? (
                        <div className="px-3 sm:px-4 py-2 bg-stone-100 text-stone-600 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider cursor-not-allowed opacity-60">
                          <Info className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden sm:inline">Preview Only (Uses Loops)</span>
                          <span className="sm:hidden">Preview Only</span>
                        </div>
                      ) : (
                        <>
                      {sequence.id === "nurture-sequence" && !sequence.segmentId && (
                        <button
                          onClick={async () => {
                            try {
                              setActivating(sequence.id)
                              const response = await fetch("/api/admin/email/sync-all-subscribers", {
                                method: "POST",
                              })
                              const data = await response.json()

                              if (data.success) {
                                toast({
                                  title: "Subscribers Synced! ✅",
                                  description: `Synced ${data.synced} subscribers to Resend. Segment ID: ${data.segmentId.substring(0, 8)}...`,
                                })
                                // Reload to update segment info
                                window.location.reload()
                              } else {
                                throw new Error(data.error || "Failed to sync subscribers")
                              }
                            } catch (error: any) {
                              toast({
                                title: "Sync Failed",
                                description: error.message || "Failed to sync subscribers",
                                variant: "destructive",
                              })
                            } finally {
                              setActivating(null)
                            }
                          }}
                          disabled={activating === sequence.id}
                          className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider"
                        >
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden sm:inline">{activating === sequence.id ? "Syncing..." : "Sync All Subscribers"}</span>
                          <span className="sm:hidden">{activating === sequence.id ? "Syncing..." : "Sync"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleCreateSequence(sequence)}
                        disabled={activating === sequence.id || !sequence.segmentId}
                        className="px-3 sm:px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider"
                      >
                        <Send className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden sm:inline">
                            {activating === sequence.id
                            ? "Creating..."
                            : sequence.segmentId
                              ? "Create & Activate"
                              : "Configure Segment First"}
                          </span>
                          <span className="sm:hidden">
                            {activating === sequence.id
                            ? "Creating..."
                            : sequence.segmentId
                              ? "Activate"
                              : "Configure"}
                          </span>
                      </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Info Box */}
        <div className="mt-6 sm:mt-8 bg-stone-50 border border-stone-200 rounded-lg p-4 sm:p-6">
          <h3 className="font-serif text-base sm:text-lg font-extralight tracking-wider uppercase text-stone-900 mb-3">
            About These Sequences
          </h3>
          <div className="space-y-3 text-xs sm:text-sm text-stone-700">
            <p>
              <strong>Welcome Sequence:</strong> Automatically sends to new paid members via cron job. Configured to run daily at 10 AM EST.
            </p>
            <p>
              <strong>Nurture Sequence:</strong> Targets ALL current subscribers (Blueprint + Freebie). Click &quot;Sync All Subscribers&quot; to ensure everyone is in Resend and assigned to the correct segment. This sequence nurtures everyone in your email list who hasn&apos;t purchased yet.
            </p>
            <p>
              <strong>Re-engagement Sequence:</strong> Targets users who haven&apos;t logged in for 30+ days. Segment will be created automatically or use existing inactive user segment.
            </p>
            <p className="text-[10px] sm:text-xs text-stone-600 mt-4">
              💡 Tip: Use Alex to create custom sequences or modify these templates. All sequences use Sandra&apos;s authentic voice and proper UTM tracking.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
