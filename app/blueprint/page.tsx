"use client"

import { useState, useEffect } from "react"
import { X, Sparkles, Copy, Check } from "lucide-react"
import Link from "next/link"
import { BlueprintEmailCapture } from "@/components/blueprint/blueprint-email-capture"
import { BlueprintConceptCard } from "@/components/blueprint/blueprint-concept-card"
import { BeforeAfterSlider } from "@/components/blueprint/before-after-slider"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"

const stripePromise =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    : Promise.resolve(null as any)

export default function BrandBlueprintPage() {
  const [step, setStep] = useState(0)
  const [showEmailCapture, setShowEmailCapture] = useState(false)
  const [savedEmail, setSavedEmail] = useState("")
  const [savedName, setSavedName] = useState("")
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null)
  const [selectedCalendarWeek, setSelectedCalendarWeek] = useState(1)
  const [formData, setFormData] = useState({
    business: "",
    dreamClient: "",
    struggle: "",
    vibe: "",
    postFrequency: "",
    lightingKnowledge: "",
    angleAwareness: "",
    editingStyle: "",
    consistencyLevel: "",
    currentSelfieHabits: "",
  })
  const [animatedScore, setAnimatedScore] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [selectedFeedStyle, setSelectedFeedStyle] = useState("")
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const [concepts, setConcepts] = useState<any[]>([])
  const [isLoadingConcepts, setIsLoadingConcepts] = useState(false)
  const [generatedConceptImages, setGeneratedConceptImages] = useState<{ [key: number]: string }>({})
  const [isEmailingConcepts, setIsEmailingConcepts] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null)

  useEffect(() => {
    if (showCheckout) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [showCheckout])

  const calculateScore = () => {
    let score = 0
    if (formData.lightingKnowledge === "expert") score += 20
    else if (formData.lightingKnowledge === "good") score += 15
    else if (formData.lightingKnowledge === "basic") score += 10
    else score += 5

    if (formData.angleAwareness === "yes") score += 20
    else score += 10

    if (formData.editingStyle === "consistent") score += 20
    else if (formData.editingStyle === "sometimes") score += 15
    else score += 8

    if (formData.consistencyLevel === "daily") score += 20
    else if (formData.consistencyLevel === "weekly") score += 15
    else if (formData.consistencyLevel === "monthly") score += 10
    else score += 5

    if (formData.currentSelfieHabits === "strategic") score += 20
    else if (formData.currentSelfieHabits === "regular") score += 15
    else score += 8

    return score
  }

  useEffect(() => {
    if (step === 4) {
      const targetScore = calculateScore()
      let current = 0
      const increment = targetScore / 30
      const timer = setInterval(() => {
        current += increment
        if (current >= targetScore) {
          setAnimatedScore(targetScore)
          clearInterval(timer)
          setTimeout(() => setShowConfetti(true), 500)
        } else {
          setAnimatedScore(Math.floor(current))
        }
      }, 30)
      return () => clearInterval(timer)
    }
  }, [step])

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopiedCaption(id)
    setTimeout(() => setCopiedCaption(null), 2000)
  }

  const getIndustryExample = () => {
    const examples: Record<string, string> = {
      coach: "life coaches and wellness experts",
      "life coach": "life coaches and wellness experts",
      designer: "fashion designers and creatives",
      fashion: "fashion designers and style experts",
      wellness: "wellness practitioners and health coaches",
      consultant: "consultants and business advisors",
      entrepreneur: "entrepreneurs and founders",
    }

    const business = formData.business.toLowerCase()
    for (const [key, value] of Object.entries(examples)) {
      if (business.includes(key)) return value
    }
    return "personal brand entrepreneurs"
  }

  const getContentCalendar = () => {
    const calendars = {
      week1: [
        {
          day: 1,
          type: "selfie",
          title: "Power Authority Shot",
          caption: "Professional headshot establishing your expertise",
        },
        { day: 2, type: "selfie", title: "Behind the Scenes", caption: "Working on your craft, real and raw" },
        { day: 3, type: "flatlay", title: "Morning Routine", caption: "Tools of your trade flatlay" },
        { day: 4, type: "selfie", title: "Lifestyle Moment", caption: "Living your brand outside work" },
        { day: 5, type: "selfie", title: "Teaching Content", caption: "Educational carousel or tip" },
        { day: 6, type: "selfie", title: "Personal Story", caption: "Vulnerable share about your journey" },
        {
          day: 7,
          type: "selfie",
          title: "Inspiration Sunday",
          caption: "Aspirational image with motivational message",
        },
      ],
      week2: [
        { day: 8, type: "selfie", title: "Client Transformation", caption: "Share success story (with permission)" },
        { day: 9, type: "selfie", title: "Day in the Life", caption: "What your typical day looks like" },
        { day: 10, type: "flatlay", title: "Workspace Aesthetic", caption: "Your creative space or desk setup" },
        { day: 11, type: "selfie", title: "Hot Take", caption: "Controversial opinion in your niche" },
        { day: 12, type: "selfie", title: "Tutorial Thursday", caption: "Step-by-step how-to content" },
        { day: 13, type: "selfie", title: "Friday Feels", caption: "Casual, relaxed weekend vibes" },
        { day: 14, type: "selfie", title: "Reflection Post", caption: "Weekly wins and lessons learned" },
      ],
      week3: [
        { day: 15, type: "selfie", title: "Monday Motivation", caption: "Power quote or affirmation" },
        { day: 16, type: "selfie", title: "Process Post", caption: "How you do what you do" },
        { day: 17, type: "flatlay", title: "Product Feature", caption: "Your favorite tools or products" },
        { day: 18, type: "selfie", title: "Ask Me Anything", caption: "Interactive engagement prompt" },
        { day: 19, type: "selfie", title: "Before & After", caption: "Your transformation journey" },
        { day: 20, type: "selfie", title: "Collaboration", caption: "Partnership or feature post" },
        { day: 21, type: "selfie", title: "Weekend Lifestyle", caption: "How you recharge and reset" },
      ],
      week4: [
        { day: 22, type: "selfie", title: "New Week Energy", caption: "Fresh start, new goals" },
        { day: 23, type: "selfie", title: "Value Bomb", caption: "Your best tip this month" },
        { day: 24, type: "flatlay", title: "Essentials", caption: "Cannot live without these items" },
        { day: 25, type: "selfie", title: "Myth Busting", caption: "Common misconception in your industry" },
        { day: 26, type: "selfie", title: "Throwback", caption: "Where you started vs now" },
        { day: 27, type: "selfie", title: "Community Spotlight", caption: "Celebrate your audience" },
        { day: 28, type: "selfie", title: "Month Wrap-Up", caption: "Highlights and gratitude" },
      ],
      week5: [
        { day: 29, type: "selfie", title: "Power Selfie", caption: "Confident, bold, unapologetic" },
        { day: 30, type: "flatlay", title: "Vision Board", caption: "Goals and dreams visual" },
      ],
    }

    return calendars
  }

  const captionTemplates = {
    authority: [
      {
        id: 1,
        title: "The Truth Bomb",
        template: `Here's what nobody tells you about [topic]:\n\n[Reveal the insider secret]\n\nMost ${formData.business || "experts"} won't say this because [reason]. But you deserve to know the truth.\n\nSave this. You'll need it. ✨`,
      },
      {
        id: 2,
        title: "The Three Secrets",
        template: `3 things I wish someone told me when I started:\n\n1. [Secret one]\n2. [Secret two]  \n3. [Secret three]\n\nWhich one resonates most? Comment the number. 👇`,
      },
      {
        id: 3,
        title: "Unpopular Opinion",
        template: `Unpopular opinion:\n\n[Your controversial take]\n\nI know this goes against what everyone says. But after [X years/experience], I've learned that [why you believe this].\n\nAgree or disagree? Let's discuss.`,
      },
    ],
    engagement: [
      {
        id: 4,
        title: "This or That",
        template: `Quick question:\n\n[Option A] or [Option B]?\n\nComment A or B below!\n\nI'm team [your choice] because [brief reason]. What about you? 👇`,
      },
      {
        id: 5,
        title: "Fill in the Blank",
        template: `Fill in the blank:\n\n"The best part about being a ${formData.business || "entrepreneur"} is ___________"\n\nI'll go first: [Your answer]\n\nNow you! 💬`,
      },
      {
        id: 6,
        title: "Hot Take Poll",
        template: `Hot take that might be controversial:\n\n[Your bold statement]\n\n❤️ = Agree\n🔥 = Disagree\n💯 = Never thought about it\n\nLet's see where everyone stands!`,
      },
    ],
    story: [
      {
        id: 7,
        title: "The Transformation",
        template: `${formData.business ? "Three years ago" : "A few years ago"}, I was [your struggle].\n\nToday, I'm [your achievement].\n\nWhat changed?\n\n[The turning point or lesson]\n\nIf you're in that dark place right now, this is your sign: [encouraging message].\n\nYou've got this. ✨`,
      },
      {
        id: 8,
        title: "The Moment Everything Shifted",
        template: `There was a moment when everything shifted.\n\nI was [scene setting]. And suddenly, I realized [the revelation].\n\nThat's when I decided to [action you took].\n\nBest decision I ever made.\n\nWhat was YOUR turning point? Tell me below. 👇`,
      },
      {
        id: 9,
        title: "The Vulnerable Share",
        template: `Can I be honest for a second?\n\n[Vulnerable admission]\n\nI don't share this to get sympathy. I share it because someone needs to hear: [the message].\n\nYou're not alone in this. 💫`,
      },
    ],
    cta: [
      {
        id: 10,
        title: "Soft Sell DM",
        template: `Quick question:\n\nAre you struggling with [their pain point]?\n\nI created [your solution] specifically for ${formData.business || "people"} like you who [desire].\n\nIf you're curious, DM me "[keyword]" and I'll send you the details.\n\nNo pressure, just want to help. 💫`,
      },
      {
        id: 11,
        title: "Link in Bio",
        template: `If you're ready to [desired outcome], I put together something special for you.\n\n[Brief description of offer/freebie]\n\nLink in bio 👆 or comment "[keyword]" and I'll send it directly to you.\n\nLet's make this happen! ✨`,
      },
      {
        id: 12,
        title: "The Invitation",
        template: `I'm opening up [X] spots for [offer].\n\nThis is for you if:\n✓ [Qualifier 1]\n✓ [Qualifier 2]\n✓ [Qualifier 3]\n\nNot for you if: [Disqualifier]\n\nInterested? Drop a "🙋‍♀️" below and let's chat.`,
      },
    ],
  }

  const feedExamples = {
    luxury: {
      name: "Dark & Moody",
      colors: ["#0a0a0a", "#2d2d2d", "#4a4a4a"],
      grid: ["selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie", "selfie"],
    },
    minimal: {
      name: "Light & Minimalistic",
      colors: ["#f5f5f5", "#e5e5e5", "#d4d4d4"],
      grid: ["selfie", "selfie", "selfie", "flatlay", "selfie", "selfie", "selfie", "flatlay", "selfie"],
    },
    beige: {
      name: "Beige Aesthetic",
      colors: ["#c9b8a8", "#a89384", "#8a7968"],
      grid: ["selfie", "flatlay", "selfie", "selfie", "selfie", "selfie", "selfie", "flatlay", "selfie"],
    },
  }

  const handleEmailSuccess = (email: string, name: string, accessToken: string) => {
    setSavedEmail(email)
    setSavedName(name)
    setAccessToken(accessToken)
    setShowEmailCapture(false)
    if (step === 2) {
      setStep(3) // Move to Feed Style selection
    } else if (step === 6) {
      // If coming from step 6 (caption templates) and email capture is triggered
      emailConcepts()
    }
  }

  const generateConcepts = async () => {
    setIsLoadingConcepts(true)
    try {
      const response = await fetch("/api/blueprint/generate-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formData,
          selectedFeedStyle,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setConcepts(data.concepts)
    } catch (error) {
      console.error("[v0] Error generating concepts:", error)
    } finally {
      setIsLoadingConcepts(false)
    }
  }

  const emailConcepts = async () => {
    if (!savedEmail) {
      setShowEmailCapture(true)
      return
    }

    setIsEmailingConcepts(true)
    try {
      const conceptsWithImages = concepts
        .map((concept, idx) => ({
          ...concept,
          imageUrl: generatedConceptImages[idx] || null,
        }))
        .filter((c) => c.imageUrl)

      if (conceptsWithImages.length === 0) {
        alert("Please generate at least one concept image first!")
        setIsEmailingConcepts(false)
        return
      }

      const blueprintData = {
        formData,
        selectedFeedStyle,
        score: calculateScore(),
        captionTemplates,
        contentCalendar: getContentCalendar(),
      }

      console.log("[v0] Sending email with full blueprint:", {
        email: savedEmail,
        name: savedName,
        conceptCount: conceptsWithImages.length,
      })

      const response = await fetch("/api/blueprint/email-concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: savedEmail,
          name: savedName,
          concepts: conceptsWithImages,
          blueprint: blueprintData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error("[v0] Email error response:", data)
        throw new Error(data.error || "Failed to send email")
      }

      console.log("[v0] Email sent successfully:", data)
      alert("✓ Blueprint sent to your email! Check your inbox (and spam folder just in case).")
    } catch (error) {
      console.error("[v0] Error emailing concepts:", error)
      alert(`Failed to send email: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsEmailingConcepts(false)
    }
  }

  const handleStartCheckout = async () => {
    try {
      setShowCheckout(true)
      const clientSecret = await createLandingCheckoutSession("one_time_session")
      setCheckoutClientSecret(clientSecret)
    } catch (error) {
      console.error("[v0] Checkout error:", error)
      alert("Failed to start checkout. Please try again.")
      setShowCheckout(false)
    }
  }

  if (showEmailCapture) {
    return <BlueprintEmailCapture onSuccess={handleEmailSuccess} formData={formData} currentStep={step} />
  }

  return (
    <div className="relative min-h-screen bg-stone-50">
      <div
        className="fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: "url(/images/2-20-281-29.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="fixed inset-0 z-0 bg-stone-50/95" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-50/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href="/"
            style={{ fontFamily: "'Times New Roman', serif" }}
            className="text-lg sm:text-xl md:text-2xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950"
          >
            SSELFIE
          </Link>
          <Link
            href="/auth/sign-up"
            className="bg-stone-950 text-stone-50 px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
          >
            GET STARTED
          </Link>
        </div>
      </nav>

      {/* Progress Bar */}
      {step > 0 && step < 6 && (
        <div className="fixed top-[57px] sm:top-[73px] left-0 right-0 h-1 bg-stone-200 z-40">
          <div className="h-full bg-stone-950 transition-all duration-500" style={{ width: `${(step / 6) * 100}%` }} />
        </div>
      )}

      {/* Content */}
      <div className="pt-20 sm:pt-24 relative z-10">
        {/* Step 0: Landing */}
        {step === 0 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-3xl sm:text-5xl md:text-7xl font-extralight tracking-[0.15em] sm:tracking-[0.3em] uppercase mb-4 sm:mb-6 text-stone-950 text-balance leading-tight"
              >
                SSELFIE BRAND BLUEPRINT
              </h1>
              <p className="text-sm sm:text-base md:text-lg font-light leading-relaxed text-stone-700 mb-6 sm:mb-8 max-w-2xl mx-auto text-pretty px-4">
                Build your personal brand strategy in 10 minutes. Get a custom 30-day content calendar, caption
                templates, and your brand style guide.
              </p>
              <button
                onClick={() => setStep(1)}
                className="bg-stone-950 text-stone-50 px-6 sm:px-8 md:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                START YOUR BLUEPRINT
              </button>
              <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs font-light tracking-wider uppercase text-stone-500">
                FREE • NO CREDIT CARD • 10 MINUTES
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-2xl w-full">
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                LET'S BUILD YOUR BRAND
              </h2>
              <p className="text-xs sm:text-sm font-light text-stone-600 mb-6 sm:mb-8 leading-relaxed">
                Answer a few questions so we can create your custom blueprint.
              </p>

              <div className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    What do you do? (Your business or profession)
                  </label>
                  <input
                    type="text"
                    value={formData.business}
                    onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                    placeholder="e.g., Life Coach, Designer, Consultant..."
                    className="w-full border-b border-stone-300 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    Who is your dream client?
                  </label>
                  <input
                    type="text"
                    value={formData.dreamClient}
                    onChange={(e) => setFormData({ ...formData, dreamClient: e.target.value })}
                    placeholder="e.g., Women entrepreneurs in their 30s..."
                    className="w-full border-b border-stone-300 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    What's their biggest struggle?
                  </label>
                  <textarea
                    value={formData.struggle}
                    onChange={(e) => setFormData({ ...formData, struggle: e.target.value })}
                    placeholder="What problem do you solve for them?"
                    rows={3}
                    className="w-full border-b border-stone-300 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-stone-950 transition-colors font-light bg-transparent resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    What vibe do you want your brand to have?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                    {["Luxury", "Minimal", "Beige", "Warm", "Edgy", "Professional"].map((vibe) => (
                      <button
                        key={vibe}
                        onClick={() => setFormData({ ...formData, vibe: vibe.toLowerCase() })}
                        className={`py-3 sm:py-3 px-3 sm:px-4 text-[10px] sm:text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.vibe === vibe.toLowerCase()
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {vibe}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How often do you want to post?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {["Daily", "3-5x/week", "2-3x/week"].map((freq) => (
                      <button
                        key={freq}
                        onClick={() => setFormData({ ...formData, postFrequency: freq.toLowerCase() })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.postFrequency === freq.toLowerCase()
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                <button
                  onClick={() => setShowEmailCapture(true)}
                  className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                >
                  SAVE PROGRESS
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!formData.business || !formData.dreamClient}
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-2xl w-full">
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                YOUR SELFIE SKILLS
              </h2>
              <p className="text-xs sm:text-sm font-light text-stone-600 mb-6 sm:mb-8 leading-relaxed">
                Let's assess your current selfie game so we can give you personalized tips.
              </p>

              <div className="space-y-6 sm:space-y-8">
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How's your lighting knowledge?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "expert", label: "I know my angles & light" },
                      { value: "good", label: "Pretty good" },
                      { value: "basic", label: "Basic understanding" },
                      { value: "learning", label: "Still learning" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, lightingKnowledge: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.lightingKnowledge === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    Do you know your best angles?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "yes", label: "Yes, I've got this!" },
                      { value: "no", label: "Not really" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, angleAwareness: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.angleAwareness === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How do you edit your photos?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "consistent", label: "Consistent preset/style" },
                      { value: "sometimes", label: "Sometimes I edit" },
                      { value: "minimal", label: "Minimal editing" },
                      { value: "none", label: "No editing" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, editingStyle: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.editingStyle === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How consistent are you with posting?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "daily", label: "Daily or almost daily" },
                      { value: "weekly", label: "Few times a week" },
                      { value: "monthly", label: "Once a week or less" },
                      { value: "sporadic", label: "Very sporadic" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, consistencyLevel: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.consistencyLevel === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-700 mb-2 sm:mb-3">
                    How do you currently use selfies in your content?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {[
                      { value: "strategic", label: "Strategic & planned" },
                      { value: "regular", label: "Regular but random" },
                      { value: "occasional", label: "Occasionally" },
                      { value: "rarely", label: "Rarely or never" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, currentSelfieHabits: option.value })}
                        className={`py-3 px-4 text-xs tracking-wider uppercase border transition-all duration-200 ${
                          formData.currentSelfieHabits === option.value
                            ? "border-stone-950 bg-stone-950 text-stone-50"
                            : "border-stone-300 text-stone-700 hover:border-stone-950"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                <button
                  onClick={() => setStep(1)}
                  className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                >
                  BACK
                </button>
                <button
                  onClick={() => {
                    if (!savedEmail) {
                      setShowEmailCapture(true)
                    } else {
                      setStep(3)
                    }
                  }}
                  disabled={
                    !formData.lightingKnowledge ||
                    !formData.angleAwareness ||
                    !formData.editingStyle ||
                    !formData.consistencyLevel ||
                    !formData.currentSelfieHabits
                  }
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {savedEmail ? "CONTINUE" : "SEE MY FEED STYLE"}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-5xl mx-auto">
              <div className="mb-12 sm:mb-16">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-4xl font-light text-center mb-8 sm:mb-12 text-stone-950"
                >
                  Here's how top personal brands structure their feeds for maximum impact and aesthetic appeal
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
                  {/* 80% You */}
                  <div className="bg-white border border-stone-200 p-6 sm:p-8">
                    <div
                      style={{ fontFamily: "'Times New Roman', serif" }}
                      className="text-6xl sm:text-7xl font-light mb-4 text-stone-950"
                    >
                      80%
                    </div>
                    <h3 className="text-sm tracking-wider uppercase text-stone-700 mb-4">YOU</h3>
                    <p className="text-sm font-light leading-relaxed text-stone-600">
                      Selfies and personal brand photos that showcase your face, your story, your authority. This is
                      where connection happens.
                    </p>
                  </div>

                  {/* 20% Flatlays */}
                  <div className="bg-white border border-stone-200 p-6 sm:p-8">
                    <div
                      style={{ fontFamily: "'Times New Roman', serif" }}
                      className="text-6xl sm:text-7xl font-light mb-4 text-stone-950"
                    >
                      20%
                    </div>
                    <h3 className="text-sm tracking-wider uppercase text-stone-700 mb-4">FLATLAYS</h3>
                    <p className="text-sm font-light leading-relaxed text-stone-600">
                      Products, lifestyle shots, aesthetic imagery that adds visual variety while maintaining your brand
                      aesthetic.
                    </p>
                  </div>
                </div>

                <div className="mb-12">
                  <div className="text-center mb-6">
                    <span className="inline-block px-6 py-2 bg-stone-100 text-stone-700 text-xs tracking-wider uppercase font-medium rounded-full mb-4">
                      DRAG TO REVEAL THE TRANSFORMATION
                    </span>
                    <h3 className="text-lg font-medium text-stone-950 mb-2">From Impersonal to Personal Branding</h3>
                    <p className="text-sm font-light text-stone-600 max-w-2xl mx-auto">
                      Slide to see how showing your face creates instant recognition and connection versus generic text
                      graphics that blend into the feed.
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <BeforeAfterSlider
                      beforeImage="/images/skjermbilde-202025-11-13-20kl.png"
                      afterImage="/images/diza-20demo-20ig-20grid-202.jpeg"
                      beforeLabel="❌ GENERIC"
                      afterLabel="✓ PERSONAL"
                    />
                  </div>
                </div>

                {/* Additional After Example */}
                <div className="mt-12">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-stone-950 mb-2">Same Strategy, Different Aesthetic</h3>
                    <p className="text-sm font-light text-stone-600 max-w-2xl mx-auto mb-8">
                      Whether you prefer light & bright or dark & moody, the key is showing YOUR face consistently.
                      Here's the same personal branding approach in a luxury aesthetic:
                    </p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <img
                      src="/images/img-8335.jpg"
                      alt="Dark moody luxury aesthetic with consistent personal branding"
                      className="w-full rounded-lg border-2 border-stone-300"
                    />
                    <div className="mt-3 text-center">
                      <span className="inline-block px-4 py-1 bg-stone-950 text-stone-50 text-xs tracking-wider uppercase font-medium rounded-full">
                        Dark & Moody Luxury
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-stone-100 p-6 rounded-lg max-w-3xl mx-auto">
                  <p className="text-sm font-light leading-relaxed text-stone-700 text-center">
                    <strong>Notice the difference?</strong> Both "after" feeds use completely different aesthetics (one
                    light, one dark) but they BOTH show the person's face consistently. That's what builds your personal
                    brand. Our Feed Designer helps you create this cohesive look based on YOUR unique style.
                  </p>
                </div>
              </div>
            </div>

            <h2
              style={{ fontFamily: "'Times New Roman', serif" }}
              className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950 text-center"
            >
              CHOOSE YOUR FEED AESTHETIC
            </h2>
            <p className="text-xs sm:text-sm font-light text-stone-600 mb-8 sm:mb-12 leading-relaxed text-center px-4">
              Pick a vibe that feels like you. Don't worry, you can always switch things up later!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {Object.entries(feedExamples).map(([key, style]) => (
                <div
                  key={key}
                  onClick={() => setSelectedFeedStyle(key)}
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedFeedStyle === key ? "scale-105" : "hover:scale-102"
                  }`}
                >
                  <div className="border-2 border-stone-200 p-4 bg-white">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {style.grid.map((type, idx) => (
                        <div
                          key={idx}
                          className={`aspect-square rounded ${key === "minimal" ? "border border-stone-300" : ""}`}
                          style={{
                            backgroundColor: type === "selfie" ? style.colors[0] : style.colors[1],
                          }}
                        />
                      ))}
                    </div>
                    <h3 className="text-sm font-medium tracking-wider uppercase text-stone-950 mb-2">{style.name}</h3>
                    <div className="flex gap-2">
                      {style.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-full ${key === "minimal" ? "border border-stone-300" : "border border-stone-200"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    className={`w-full py-3 mt-4 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase border transition-all duration-200 ${
                      selectedFeedStyle === key
                        ? "border-stone-950 bg-stone-950 text-stone-50"
                        : "border-stone-300 text-stone-700 hover:border-stone-950"
                    }`}
                  >
                    {selectedFeedStyle === key ? "SELECTED" : "SELECT"}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
              >
                BACK
              </button>
              <button
                onClick={() => {
                  generateConcepts()
                  setStep(3.5)
                }}
                disabled={!selectedFeedStyle}
                className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                SEE MY CONCEPTS
              </button>
            </div>
          </div>
        )}

        {step === 3.5 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                >
                  YOUR BRAND PHOTO IDEAS
                </h2>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto px-4">
                  Based on your {selectedFeedStyle} vibe, here are 2 photo ideas you can create today. Click "Generate"
                  to see what they could look like, then save them for inspiration!
                </p>
              </div>

              {isLoadingConcepts ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"></div>
                    <div
                      className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                  <p className="text-sm text-stone-600 font-light">Creating your personalized concepts...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {concepts.map((concept, idx) => (
                      <BlueprintConceptCard
                        key={idx}
                        concept={concept}
                        onImageGenerated={(imageUrl) => {
                          setGeneratedConceptImages((prev) => ({ ...prev, [idx]: imageUrl }))
                        }}
                      />
                    ))}
                  </div>

                  <div className="text-center bg-stone-100 p-6 rounded-lg max-w-2xl mx-auto">
                    <p className="text-sm font-light leading-relaxed text-stone-700 mb-4">
                      💡 <strong>Pro tip:</strong> These concept images are just for inspiration. Use them to guide your
                      own photoshoots! Maya created these prompts based on your unique brand answers.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 sm:mt-12">
                    <button
                      onClick={() => setStep(3)}
                      className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                    >
                      BACK
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300"
                    >
                      SEE MY SCORE
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
            {/* Confetti */}
            {showConfetti && (
              <>
                {[...Array(30)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-fall"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-10px`,
                      backgroundColor: ["#292524", "#78716c", "#a8a29e"][Math.floor(Math.random() * 3)],
                      animationDuration: `${2 + Math.random() * 2}s`,
                      animationDelay: `${Math.random() * 0.5}s`,
                    }}
                  />
                ))}
              </>
            )}

            <div className="max-w-3xl w-full text-center">
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 sm:mb-6 text-stone-950" />
              <h2
                style={{ fontFamily: "'Times New Roman', serif" }}
                className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
              >
                YOUR BRAND SCORE
              </h2>

              <div className="mb-8 sm:mb-12">
                <div className="text-7xl sm:text-8xl md:text-9xl font-extralight text-stone-950 mb-3 sm:mb-4">
                  {animatedScore}
                </div>
                <div className="text-xs sm:text-sm font-light tracking-wider uppercase text-stone-600">out of 100</div>
              </div>

              {animatedScore === calculateScore() && (
                <div className="space-y-4 sm:space-y-6 text-left max-w-xl mx-auto animate-fade-in px-4">
                  {animatedScore >= 80 && (
                    <div className="bg-stone-100 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-base sm:text-lg font-medium tracking-wider uppercase text-stone-950 mb-2">
                        YOU'RE CRUSHING IT! 🌟
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-700 leading-relaxed">
                        Seriously impressive! You've got the selfie basics down. Now let's take it to the next level
                        with content that turns followers into paying clients.
                      </p>
                    </div>
                  )}
                  {animatedScore >= 50 && animatedScore < 80 && (
                    <div className="bg-stone-100 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-base sm:text-lg font-medium tracking-wider uppercase text-stone-950 mb-2">
                        YOU'RE ON THE RIGHT TRACK! ✨
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-700 leading-relaxed">
                        Honestly? You're doing better than most! A few small tweaks to your lighting and posting rhythm,
                        and you'll start seeing real results.
                      </p>
                    </div>
                  )}
                  {animatedScore < 50 && (
                    <div className="bg-stone-100 p-4 sm:p-6 rounded-lg">
                      <h3 className="text-base sm:text-lg font-medium tracking-wider uppercase text-stone-950 mb-2">
                        PERFECT TIMING! 💫
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-700 leading-relaxed">
                        This is actually exciting! You're about to learn exactly how to use selfies strategically. Your
                        blueprint will walk you through every step.
                      </p>
                    </div>
                  )}

                  <div className="bg-stone-950 text-stone-50 p-4 sm:p-6 rounded-lg">
                    <h3 className="text-xs sm:text-sm font-medium tracking-wider uppercase mb-2">
                      HERE'S WHAT TO FOCUS ON FIRST:
                    </h3>
                    <p className="text-xs sm:text-sm font-light leading-relaxed">
                      {formData.consistencyLevel === "sporadic" || formData.consistencyLevel === "monthly"
                        ? "Let's work on showing up consistently! Your calendar will make posting so much easier—no more staring at a blank screen wondering what to post."
                        : formData.lightingKnowledge === "learning" || formData.lightingKnowledge === "basic"
                          ? "Getting your lighting right will seriously level up your selfie game. Small changes = huge difference in how professional you look."
                          : "You're going to learn how to make every selfie work harder for your business. Not just pretty pics—content that actually converts."}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(5)}
                className="mt-8 sm:mt-12 bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
              >
                SHOW ME MY CALENDAR
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                >
                  YOUR 30-DAY CONTENT PLAN
                </h2>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto px-4">
                  No more "what should I post today?" moments. Here's your whole month planned out—just show up and
                  create!
                </p>
              </div>

              {/* Week Selector */}
              <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {[1, 2, 3, 4, 5].map((week) => (
                  <button
                    key={week}
                    onClick={() => setSelectedCalendarWeek(week)}
                    className={`px-4 sm:px-6 py-2 sm:py-3 text-xs tracking-wider uppercase whitespace-nowrap border transition-all duration-200 flex-shrink-0 ${
                      selectedCalendarWeek === week
                        ? "border-stone-950 bg-stone-950 text-stone-50"
                        : "border-stone-300 text-stone-700 hover:border-stone-950"
                    }`}
                  >
                    Week {week}
                  </button>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-12">
                {getContentCalendar()[`week${selectedCalendarWeek}` as keyof ReturnType<typeof getContentCalendar>].map(
                  (post) => (
                    <div key={post.day} className="bg-white border border-stone-200 p-4 sm:p-6 rounded-lg">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <span className="text-[10px] sm:text-xs font-medium tracking-wider uppercase text-stone-500">
                          Day {post.day}
                        </span>
                        <span
                          className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full ${
                            post.type === "selfie" ? "bg-stone-950 text-stone-50" : "bg-stone-200 text-stone-950"
                          }`}
                        >
                          {post.type}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-medium tracking-wide text-stone-950 mb-2">
                        {post.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">{post.caption}</p>
                    </div>
                  ),
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setStep(4)}
                  className="w-full sm:flex-1 py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
                >
                  BACK
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="w-full sm:flex-1 py-3 sm:py-4 bg-stone-950 text-stone-50 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300"
                >
                  GET CAPTION TEMPLATES
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="min-h-[calc(100vh-80px)] sm:min-h-[calc(100vh-96px)] px-4 sm:px-6 py-8 sm:py-12">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 sm:mb-12">
                <h2
                  style={{ fontFamily: "'Times New Roman', serif" }}
                  className="text-2xl sm:text-3xl md:text-5xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
                >
                  YOUR CAPTION TEMPLATES
                </h2>
                <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto mb-6 sm:mb-8 px-4">
                  Struggling with what to say? We've got you. Just copy these, fill in the blanks, and you're good to
                  go!
                </p>

                {!accessToken && (
                  <div className="bg-stone-100 p-4 sm:p-6 rounded-lg max-w-2xl mx-auto mb-8 sm:mb-12">
                    <p className="text-xs sm:text-sm font-light text-stone-700 mb-3 sm:mb-4">
                      💾 Want these templates in your inbox? Save your blueprint and we'll email everything to you!
                    </p>
                    <button
                      onClick={() => setShowEmailCapture(true)}
                      className="bg-stone-950 text-stone-50 px-6 sm:px-8 py-2 sm:py-3 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-800 transition-all duration-300"
                    >
                      YES, EMAIL ME!
                    </button>
                  </div>
                )}
              </div>

              {/* Caption Categories */}
              <div className="space-y-8 sm:space-y-12">
                {Object.entries(captionTemplates).map(([category, templates]) => (
                  <div key={category}>
                    <h3 className="text-base sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-4 sm:mb-6 border-b border-stone-200 pb-2 sm:pb-3">
                      {category === "cta" ? "Call to Action" : category} Captions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      {templates.map((template) => (
                        <div key={template.id} className="bg-white border border-stone-200 p-4 sm:p-6 rounded-lg">
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <h4 className="text-xs sm:text-sm font-medium tracking-wide text-stone-950">
                              {template.title}
                            </h4>
                            <button
                              onClick={() => copyToClipboard(template.template, template.id)}
                              className="p-2 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0"
                            >
                              {copiedCaption === template.id ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-stone-600" />
                              )}
                            </button>
                          </div>
                          <p className="text-[11px] sm:text-xs font-light text-stone-600 leading-relaxed whitespace-pre-wrap">
                            {template.template}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 sm:mt-12 text-center">
                <div className="bg-stone-950 text-stone-50 p-6 sm:p-8 rounded-lg max-w-3xl mx-auto">
                  <h3
                    style={{ fontFamily: "'Times New Roman', serif" }}
                    className="text-xl sm:text-2xl md:text-3xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4"
                  >
                    READY TO LEVEL UP?
                  </h3>
                  <p className="text-xs sm:text-sm font-light leading-relaxed mb-4 sm:mb-6 px-4">
                    SSELFIE Studio takes all this strategy and makes it easy. Get AI-powered selfies that look like you,
                    content planning that actually works, and Maya's help whenever you need it. It's like having a brand
                    strategist in your pocket!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                    <button
                      onClick={emailConcepts}
                      disabled={isEmailingConcepts || Object.keys(generatedConceptImages).length === 0}
                      className="bg-stone-50 text-stone-950 px-6 sm:px-8 py-2 sm:py-3 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-100 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {isEmailingConcepts ? "SENDING..." : "EMAIL MY BLUEPRINT"}
                    </button>
                    <button
                      onClick={handleStartCheckout}
                      className="bg-transparent border border-stone-50 text-stone-50 px-6 sm:px-8 py-2 sm:py-3 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:bg-stone-50 hover:text-stone-950 transition-all duration-300"
                    >
                      GET STARTED - $24.50
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep(5)}
                className="mt-6 sm:mt-8 w-full py-3 sm:py-4 border border-stone-300 text-stone-600 text-xs tracking-[0.2em] sm:tracking-[0.3em] uppercase font-light hover:border-stone-950 hover:text-stone-950 transition-all duration-300"
              >
                BACK TO CALENDAR
              </button>
            </div>
          </div>
        )}
      </div>

      {showCheckout && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCheckout(false)
              setCheckoutClientSecret(null)
            }
          }}
        >
          <div
            className="bg-white w-full h-[100vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-lg flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div className="flex-shrink-0 bg-white z-20 px-4 sm:px-6 py-4 border-b border-stone-200 flex items-center justify-between sticky top-0">
              <h3 className="text-sm sm:text-base font-medium tracking-wider uppercase text-stone-950">
                Complete Purchase
              </h3>
              <button
                onClick={() => {
                  setShowCheckout(false)
                  setCheckoutClientSecret(null)
                }}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0"
                aria-label="Close checkout"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain -webkit-overflow-scrolling-touch">
              <div className="p-4 sm:p-6 min-h-full">
                {checkoutClientSecret ? (
                  <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret: checkoutClientSecret }}>
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 sm:py-20 space-y-4">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"></div>
                      <div
                        className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-3 h-3 rounded-full bg-stone-950 animate-bounce"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                    <p className="text-sm text-stone-600 font-light">Loading checkout...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        /* Mobile optimization: Prevent scroll issues on iOS */
        @supports (-webkit-touch-callout: none) {
          .-webkit-overflow-scrolling-touch {
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>
    </div>
  )
}
