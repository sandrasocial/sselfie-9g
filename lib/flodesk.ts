/**
 * Flodesk API Integration
 * Used for marketing email contact management
 * 
 * Flodesk API Base: https://api.flodesk.com/v1
 * Authentication: Bearer token (API key)
 */

const FLODESK_API_KEY = process.env.FLODESK_API_KEY
const FLODESK_API_BASE = 'https://api.flodesk.com/v1'

export interface FlodeskContact {
  email: string
  first_name?: string
  last_name?: string
  custom_fields?: Record<string, any>
  segments?: string[]
  tags?: string[]
}

/**
 * Add or update contact in Flodesk
 */
export async function addFlodeskContact(contact: FlodeskContact): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!FLODESK_API_KEY) {
      console.warn('[Flodesk] API key not configured')
      return { success: false, error: 'Flodesk API key not configured' }
    }

    console.log('[Flodesk] Adding/updating contact:', contact.email)

    const response = await fetch(`${FLODESK_API_BASE}/subscribers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLODESK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: contact.email.toLowerCase().trim(),
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        custom_fields: contact.custom_fields || {},
        segments: contact.segments || [],
        tags: contact.tags || []
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Flodesk] Error adding contact:', response.status, errorText)
      
      // If contact already exists (409 or similar), that's fine - try to update
      if (response.status === 409 || response.status === 422) {
        console.log('[Flodesk] ℹ️ Contact already exists, updating:', contact.email)
        return await updateFlodeskContact(contact)
      }
      
      return { success: false, error: `Flodesk API error: ${response.status}` }
    }

    const data = await response.json()
    console.log('[Flodesk] ✅ Contact added/updated:', contact.email)

    return { 
      success: true,
      contactId: data.id || contact.email // Use email as ID if API doesn't return ID
    }

  } catch (error: any) {
    console.error('[Flodesk] Exception adding contact:', error)
    return { success: false, error: error.message || 'Failed to add contact to Flodesk' }
  }
}

/**
 * Update existing contact in Flodesk
 */
async function updateFlodeskContact(contact: FlodeskContact): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!FLODESK_API_KEY) {
      return { success: false, error: 'Flodesk API key not configured' }
    }

    console.log('[Flodesk] Updating contact:', contact.email)

    const response = await fetch(`${FLODESK_API_BASE}/subscribers/${encodeURIComponent(contact.email.toLowerCase().trim())}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${FLODESK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        custom_fields: contact.custom_fields || {},
        segments: contact.segments || [],
        tags: contact.tags || []
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Flodesk] Error updating contact:', response.status, errorText)
      return { success: false, error: `Flodesk API error: ${response.status}` }
    }

    console.log('[Flodesk] ✅ Contact updated:', contact.email)
    return { 
      success: true,
      contactId: contact.email
    }

  } catch (error: any) {
    console.error('[Flodesk] Exception updating contact:', error)
    return { success: false, error: error.message || 'Failed to update contact in Flodesk' }
  }
}

/**
 * Add contact to specific segment in Flodesk
 */
export async function addToFlodeskSegment(email: string, segmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!FLODESK_API_KEY) {
      console.warn('[Flodesk] API key not configured')
      return { success: false, error: 'Flodesk API key not configured' }
    }

    console.log('[Flodesk] Adding to segment:', email, segmentId)

    const response = await fetch(`${FLODESK_API_BASE}/subscribers/${encodeURIComponent(email.toLowerCase().trim())}/segments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLODESK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ segment_id: segmentId })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Flodesk] Error adding to segment:', response.status, errorText)
      return { success: false, error: `Flodesk API error: ${response.status}` }
    }

    console.log('[Flodesk] ✅ Added to segment:', email, segmentId)
    return { success: true }

  } catch (error: any) {
    console.error('[Flodesk] Exception adding to segment:', error)
    return { success: false, error: error.message || 'Failed to add contact to Flodesk segment' }
  }
}

/**
 * Tag contact in Flodesk (adds tags, doesn't replace)
 */
export async function tagFlodeskContact(email: string, tags: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (!FLODESK_API_KEY) {
      console.warn('[Flodesk] API key not configured')
      return { success: false, error: 'Flodesk API key not configured' }
    }

    if (!tags || tags.length === 0) {
      return { success: true } // Nothing to tag
    }

    console.log('[Flodesk] Tagging contact:', email, tags)

    // First, get existing contact to merge tags
    let existingTags: string[] = []
    try {
      const getResponse = await fetch(`${FLODESK_API_BASE}/subscribers/${encodeURIComponent(email.toLowerCase().trim())}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLODESK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (getResponse.ok) {
        const contactData = await getResponse.json()
        existingTags = contactData.tags || []
      }
    } catch (getError) {
      // Contact might not exist yet, that's okay - we'll create it with tags
      console.log('[Flodesk] Contact not found, will create with tags')
    }

    // Merge tags (avoid duplicates)
    const mergedTags = [...new Set([...existingTags, ...tags])]

    // Update contact with merged tags
    const response = await fetch(`${FLODESK_API_BASE}/subscribers/${encodeURIComponent(email.toLowerCase().trim())}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${FLODESK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags: mergedTags })
    })

    if (!response.ok) {
      // If contact doesn't exist, create it with tags
      if (response.status === 404) {
        return await addFlodeskContact({
          email,
          tags: tags
        })
      }

      const errorText = await response.text()
      console.error('[Flodesk] Error tagging contact:', response.status, errorText)
      return { success: false, error: `Flodesk API error: ${response.status}` }
    }

    console.log('[Flodesk] ✅ Tagged contact:', email, mergedTags)
    return { success: true }

  } catch (error: any) {
    console.error('[Flodesk] Exception tagging contact:', error)
    return { success: false, error: error.message || 'Failed to tag contact in Flodesk' }
  }
}

/**
 * Sync contact from database to Flodesk
 * Used for migration and ongoing sync
 * Mirrors the syncContactToLoops interface for easy replacement
 */
export async function syncContactToFlodesk(contactData: {
  email: string
  name: string
  source: string
  tags: string[]
  segments?: string[]
  customFields?: Record<string, any>
}): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!FLODESK_API_KEY) {
      console.warn('[Flodesk] API key not configured')
      return { success: false, error: 'Flodesk API key not configured' }
    }

    const nameParts = contactData.name.split(' ')
    const firstName = nameParts[0] || contactData.name
    const lastName = nameParts.slice(1).join(' ') || ''

    // Add contact with all data
    const result = await addFlodeskContact({
      email: contactData.email,
      first_name: firstName,
      last_name: lastName,
      tags: contactData.tags || [],
      segments: contactData.segments || [],
      custom_fields: {
        source: contactData.source,
        signup_date: new Date().toISOString(),
        ...contactData.customFields
      }
    })

    if (!result.success) {
      return result
    }

    // Ensure tags are set (in case they weren't included in the initial create)
    if (contactData.tags && contactData.tags.length > 0) {
      await tagFlodeskContact(contactData.email, contactData.tags)
    }

    return result

  } catch (error: any) {
    console.error('[Flodesk] ❌ Error syncing contact:', error)
    return {
      success: false,
      error: error.message || 'Failed to sync contact to Flodesk'
    }
  }
}

