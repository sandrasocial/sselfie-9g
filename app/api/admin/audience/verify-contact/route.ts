import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { Resend } from "resend"
import { getAudienceContacts } from "@/lib/resend/get-audience-contacts"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"
const resend = new Resend(process.env.RESEND_API_KEY)
const audienceId = process.env.RESEND_AUDIENCE_ID!

/**
 * Verify Contact Route
 * 
 * Checks if a contact exists in Resend and shows current tags
 * 
 * GET /api/admin/audience/verify-contact?email=ssa@ssasocial.com
 */
export async function GET(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email") || ADMIN_EMAIL

    console.log(`[v0] Verifying contact in Resend: ${email}`)

    // Get all contacts from Resend using the existing helper
    let contacts
    try {
      contacts = await getAudienceContacts(audienceId)
    } catch (error: any) {
      console.error("[v0] Error fetching contacts:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to list contacts",
        details: error.message || "Unknown error",
      }, { status: 500 })
    }

    const contact = contacts.find((c: any) => c.email === email)

    if (!contact) {
      return NextResponse.json({
        success: false,
        error: "Contact not found in Resend",
        email,
        totalContacts: contacts.length || 0,
      }, { status: 404 })
    }

    // Return contact info (we already have it from getAudienceContacts)
    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        email: contact.email,
        firstName: contact.first_name || contact.firstName,
        lastName: contact.last_name || contact.lastName,
        unsubscribed: contact.unsubscribed || false,
        createdAt: contact.created_at || contact.createdAt,
        tags: contact.tags || [],
      },
      message: "Contact found in Resend",
    })
  } catch (error: any) {
    console.error("[v0] Error verifying contact:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify contact",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}

