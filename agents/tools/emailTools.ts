/**
 * Email Tools
 * Tools for email campaign generation, sending, and management
 * Used by: AdminSupervisorAgent, MarketingAutomationAgent
 */

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export const emailTools = {
  sendEmail: {
    description: "Send a real email using Resend",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        html: { type: "string" },
      },
      required: ["to", "subject", "html"],
    },
    execute: async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
      const response = await resend.emails.send({
        from: "Sandra @ SSELFIE <noreply@sselfie.app>",
        to,
        subject,
        html,
      })
      return response
    },
  },

  createEmailDraft: {
    description: "Create an email draft in Resend (not sent)",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        html: { type: "string" },
      },
      required: ["subject", "html"],
    },
    execute: async ({ subject, html }: { subject: string; html: string }) => {
      // Storing draft for now - later we will save this to DB
      return { status: "draft_created", subject, html }
    },
  },

  addToAudience: {
    description: "Add a subscriber to a Resend Audience",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
        name: { type: "string" },
      },
      required: ["email"],
    },
    execute: async ({ email, name }: { email: string; name?: string }) => {
      const response = await resend.contacts.create({
        audienceId: process.env.RESEND_AUDIENCE_ID!,
        email,
        firstName: name,
      })
      return response
    },
  },

  segmentBetaUsers: {
    description: "Return all emails in the beta segment (placeholder, real data later)",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async () => {
      return {
        segment: "beta_users",
        note: "TODO: connect to database for real segmentation",
      }
    },
  },
}
