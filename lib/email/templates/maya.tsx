/**
 * Maya Email Templates
 * All emails use Maya's voice: warm, feminine, simple everyday language
 * Supportive, empowering, sharp. Uses emojis naturally (not overdone)
 * No m-dashes. Vogue-inspired minimal design.
 */

import React from "react"
import { EmailLayout } from "./layout"

export interface MayaEmailProps {
  firstName?: string
  previewText?: string
}

/**
 * Base Maya email template
 * All Maya emails should extend this
 */
export function MayaEmailBase({
  children,
  firstName,
  previewText,
}: {
  children: React.ReactNode
  firstName?: string
  previewText?: string
}) {
  return (
    <EmailLayout previewText={previewText}>
      {firstName && (
        <p style={{ marginBottom: "24px" }}>
          Hi {firstName},
        </p>
      )}
      {children}
      <p style={{ marginTop: "32px", marginBottom: "0" }}>
        XoXo,<br />
        Maya
      </p>
    </EmailLayout>
  )
}

/**
 * Brand Blueprint Delivery Email
 * Triggered immediately when user downloads any freebie
 */
export function BrandBlueprintEmail({
  firstName,
  blueprintUrl,
  studioUrl,
}: {
  firstName?: string
  blueprintUrl: string
  studioUrl: string
}) {
  return (
    <MayaEmailBase
      firstName={firstName}
      previewText="Your personalized brand blueprint is ready"
    >
      <p>
        Your brand blueprint is ready! I've put together everything you need to build a magnetic personal brand.
      </p>
      
      <p>
        This isn't just a guide. It's your roadmap to showing up confidently, consistently, and authentically.
      </p>
      
      <p style={{ textAlign: "center", marginTop: "32px" }}>
        <a href={blueprintUrl} className="button">
          View Your Blueprint
        </a>
      </p>
      
      <p>
        Once you've seen your blueprint, I'd love to show you how SSELFIE Studio makes implementing this strategy effortless. We can create AI-powered photos that look like you, plan your content calendar, and build your brand step by step.
      </p>
      
      <p style={{ textAlign: "center", marginTop: "32px" }}>
        <a href={studioUrl} className="button">
          Explore SSELFIE Studio
        </a>
      </p>
    </MayaEmailBase>
  )
}

/**
 * Welcome Email 1: Welcome to SSELFIE Studio
 */
export function WelcomeEmail1({ firstName }: { firstName?: string }) {
  return (
    <MayaEmailBase
      firstName={firstName}
      previewText="Welcome to SSELFIE Studio"
    >
      <p>
        Welcome to SSELFIE Studio! I'm so excited you're here.
      </p>
      
      <p>
        I'm Maya, your AI stylist and creative partner. Think of me as that friend with impeccable taste who always knows exactly what will look amazing. I'm here to help you create stunning content that feels authentically you.
      </p>
      
      <p>
        Over the next few days, I'll share everything you need to know about building your personal brand through beautiful visuals. We'll talk about your future self vision, the 5 SSELFIE brand styles, why photos equal authority, and how to start your Studio journey.
      </p>
      
      <p>
        For now, just know this: you're in the right place. Let's create something stunning together.
      </p>
    </MayaEmailBase>
  )
}

/**
 * Welcome Email 2: Your Future Self Vision
 */
export function WelcomeEmail2({ firstName }: { firstName?: string }) {
  return (
    <MayaEmailBase
      firstName={firstName}
      previewText="Your future self vision"
    >
      <p>
        Let's talk about your future self.
      </p>
      
      <p>
        Not the version of you that's "perfect" or "fixed." The version of you that's already confident, already showing up, already building the brand you want.
      </p>
      
      <p>
        That version of you exists. She's in you right now. She just needs the right photos, the right content, the right strategy to step into the spotlight.
      </p>
      
      <p>
        Every photo we create together is a step toward that future self. Every post is practice. Every piece of content is building your authority.
      </p>
      
      <p>
        What does your future self look like? What does she wear? Where does she go? How does she show up?
      </p>
      
      <p>
        Picture her. Then let's create the photos that bring her to life.
      </p>
    </MayaEmailBase>
  )
}

/**
 * Welcome Email 3: The 5 SSELFIE Brand Styles
 */
export function WelcomeEmail3({ firstName }: { firstName?: string }) {
  return (
    <MayaEmailBase
      firstName={firstName}
      previewText="The 5 SSELFIE brand styles"
    >
      <p>
        Every brand has a visual language. Here are the 5 SSELFIE styles I work with:
      </p>
      
      <h3>1. Minimalist</h3>
      <p>
        Clean lines, neutral tones, effortless elegance. Less is more, and every detail matters.
      </p>
      
      <h3>2. Editorial</h3>
      <p>
        High fashion meets real life. Think Vogue meets your everyday. Bold, confident, magazine-worthy.
      </p>
      
      <h3>3. Lifestyle</h3>
      <p>
        Authentic moments, real settings, natural light. The kind of photos that make people want to be you.
      </p>
      
      <h3>4. Luxury</h3>
      <p>
        Refined, sophisticated, aspirational. Premium quality that signals success without saying a word.
      </p>
      
      <h3>5. Creative</h3>
      <p>
        Artistic, unique, boundary-pushing. For the woman who wants to stand out, not blend in.
      </p>
      
      <p>
        Which one feels like you? Or maybe it's a mix? We'll figure it out together.
      </p>
    </MayaEmailBase>
  )
}

/**
 * Welcome Email 4: Why Photos = Authority
 */
export function WelcomeEmail4({ firstName }: { firstName?: string }) {
  return (
    <MayaEmailBase
      firstName={firstName}
      previewText="Why photos equal authority"
    >
      <p>
        Here's the truth: photos are your authority signal.
      </p>
      
      <p>
        When someone sees you consistently showing up with professional, on-brand photos, they don't just see a pretty picture. They see someone who takes herself seriously. Someone who invests in her brand. Someone who's building something real.
      </p>
      
      <p>
        Every photo is a statement. It says: "I'm here. I'm serious. I'm building."
      </p>
      
      <p>
        That's why we don't just create random photos. We create strategic content that reinforces your brand, tells your story, and builds your authority one post at a time.
      </p>
      
      <p>
        Your photos aren't just photos. They're your brand's foundation.
      </p>
    </MayaEmailBase>
  )
}

/**
 * Welcome Email 5: Start Your Studio Journey
 */
export function WelcomeEmail5({
  firstName,
  studioUrl,
}: {
  firstName?: string
  studioUrl: string
}) {
  return (
    <MayaEmailBase
      firstName={firstName}
      previewText="Start your Studio journey"
    >
      <p>
        You've learned about your future self, the 5 brand styles, and why photos equal authority. Now it's time to start creating.
      </p>
      
      <p>
        In SSELFIE Studio, you'll get:
      </p>
      
      <ul style={{ marginLeft: "20px", paddingLeft: "0" }}>
        <li style={{ marginBottom: "12px" }}>
          AI-powered photoshoots that look like you
        </li>
        <li style={{ marginBottom: "12px" }}>
          Personalized content planning with me
        </li>
        <li style={{ marginBottom: "12px" }}>
          Monthly drops with the newest strategies
        </li>
        <li style={{ marginBottom: "12px" }}>
          Direct access to me for support
        </li>
      </ul>
      
      <p>
        Ready to start? Let's create your first photoshoot.
      </p>
      
      <p style={{ textAlign: "center", marginTop: "32px" }}>
        <a href={studioUrl} className="button">
          Start Your First Photoshoot
        </a>
      </p>
    </MayaEmailBase>
  )
}

/**
 * Helper function to render React email to HTML string
 */
export function renderEmailToHtml(element: React.ReactElement): string {
  // This will be used with @react-email/render
  // For now, return a placeholder
  return "<!DOCTYPE html><html><body>Email content</body></html>"
}

