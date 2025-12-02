// Resend Audience Management
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)
const audienceId = process.env.RESEND_AUDIENCE_ID!

export interface ContactTags {
  source?: string // 'freebie-subscriber', 'one-time-purchase', 'membership'
  status?: string // 'lead', 'customer', 'converted'
  product?: string // 'sselfie-guide', 'one-time-session', 'studio-membership'
  journey?: string // 'nurture', 'onboarding', 'active'
  [key: string]: string | undefined
}

/**
 * Add or update a contact in Resend audience with tags
 */
export async function addOrUpdateResendContact(
  email: string,
  firstName: string | null,
  tags: ContactTags,
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log("[v0] RESEND_API_KEY not configured, skipping audience sync")
      return { success: false, error: "Resend not configured" }
    }

    if (!audienceId) {
      console.log("[v0] RESEND_AUDIENCE_ID not configured, skipping audience sync")
      return { success: false, error: "Audience not configured" }
    }

    console.log(`[v0] Adding/updating contact in Resend audience: ${email}`)
    console.log("[v0] Contact tags:", tags)

    // Format tags as array of {name, value} objects for Resend
    const formattedTags = Object.entries(tags)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([name, value]) => ({
        name,
        value: value as string,
      }))

    // Try to create the contact (will update if exists)
    const { data, error } = await resend.contacts.create({
      email,
      firstName: firstName || undefined,
      audienceId,
      // @ts-ignore - Resend types may not be up to date
      tags: formattedTags,
    })

    if (error) {
      // If contact already exists, update their tags
      if (error.message?.includes("already exists") || error.message?.includes("Contact already")) {
        console.log(`[v0] Contact exists, updating tags for ${email}`)

        // Get existing contact
        const { data: contacts } = await resend.contacts.list({
          audienceId,
        })

        const existingContact = contacts?.data?.find((c: any) => c.email === email)

        if (existingContact) {
          // Update the contact with new tags
          const { error: updateError } = await resend.contacts.update({
            id: existingContact.id,
            audienceId,
            // @ts-ignore
            tags: formattedTags,
          })

          if (updateError) {
            console.error(`[v0] Error updating Resend contact:`, updateError)
            return { success: false, error: updateError.message }
          }

          console.log(`[v0] Successfully updated Resend contact: ${email}`)
          return { success: true, contactId: existingContact.id }
        }
      }

      console.error(`[v0] Error creating Resend contact:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[v0] Successfully added contact to Resend: ${email}, ID: ${data?.id}`)
    return { success: true, contactId: data?.id }
  } catch (error) {
    console.error(`[v0] Exception adding contact to Resend:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Update tags for an existing contact (adds new tags, doesn't remove existing ones)
 */
export async function updateContactTags(
  email: string,
  newTags: ContactTags,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY || !audienceId) {
      return { success: false, error: "Resend not configured" }
    }

    console.log(`[v0] Updating tags for contact: ${email}`)
    console.log("[v0] New tags:", newTags)

    // Get existing contact
    const { data: contacts } = await resend.contacts.list({
      audienceId,
    })

    const existingContact = contacts?.data?.find((c: any) => c.email === email)

    if (!existingContact) {
      console.log(`[v0] Contact not found in Resend audience: ${email}`)
      return { success: false, error: "Contact not found" }
    }

    // Merge existing tags with new tags
    const existingTags = existingContact.tags || []
    const existingTagsMap: { [key: string]: string } = {}

    for (const tag of existingTags) {
      if (typeof tag === "object" && tag.name && tag.value) {
        existingTagsMap[tag.name] = tag.value
      }
    }

    // Merge with new tags (new tags override existing)
    const mergedTags = { ...existingTagsMap, ...newTags }

    const formattedTags = Object.entries(mergedTags)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([name, value]) => ({
        name,
        value: value as string,
      }))

    // Update the contact
    const { error } = await resend.contacts.update({
      id: existingContact.id,
      audienceId,
      // @ts-ignore
      tags: formattedTags,
    })

    if (error) {
      console.error(`[v0] Error updating contact tags:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[v0] Successfully updated tags for: ${email}`)
    return { success: true }
  } catch (error) {
    console.error(`[v0] Exception updating contact tags:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Remove a contact from the audience (for unsubscribes)
 */
export async function removeResendContact(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY || !audienceId) {
      return { success: false, error: "Resend not configured" }
    }

    console.log(`[v0] Removing contact from Resend: ${email}`)

    // Get existing contact
    const { data: contacts } = await resend.contacts.list({
      audienceId,
    })

    const existingContact = contacts?.data?.find((c: any) => c.email === email)

    if (!existingContact) {
      console.log(`[v0] Contact not found: ${email}`)
      return { success: true } // Already removed
    }

    const { error } = await resend.contacts.remove({
      id: existingContact.id,
      audienceId,
    })

    if (error) {
      console.error(`[v0] Error removing contact:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[v0] Successfully removed contact: ${email}`)
    return { success: true }
  } catch (error) {
    console.error(`[v0] Exception removing contact:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Add a contact to a specific segment
 */
export async function addContactToSegment(
  email: string,
  segmentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log("[v0] RESEND_API_KEY not configured, skipping segment addition")
      return { success: false, error: "Resend not configured" }
    }

    if (!audienceId) {
      console.log("[v0] RESEND_AUDIENCE_ID not configured, skipping segment addition")
      return { success: false, error: "Audience not configured" }
    }

    console.log(`[v0] Adding contact ${email} to segment ${segmentId}`)

    // Use the Resend API to add contact to segment
    // @ts-ignore - Resend types may not include segments.add yet
    const { error } = await resend.contacts.segments.add({
      email,
      segmentId,
      audienceId,
    })

    if (error) {
      // If contact is already in segment, consider it a success
      if (error.message?.includes("already") || error.message?.includes("duplicate")) {
        console.log(`[v0] Contact ${email} already in segment`)
        return { success: true }
      }

      console.error(`[v0] Error adding contact to segment:`, error)
      return { success: false, error: error.message }
    }

    console.log(`[v0] Successfully added ${email} to segment`)
    return { success: true }
  } catch (error) {
    console.error(`[v0] Exception adding contact to segment:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
