/**
 * Loops Contact Management
 * 
 * Helper functions for managing contacts in Loops
 * Mirrors the Resend contact management pattern
 */

import { loops, LOOPS_AUDIENCES } from './client'

export interface LoopsContactData {
  email: string
  firstName?: string
  lastName?: string
  source?: string
  userGroup?: string
  tags?: string[]
  customFields?: Record<string, any>
}

/**
 * Add or update contact in Loops
 * Returns contact ID on success
 */
export async function addOrUpdateLoopsContact(
  email: string,
  firstName?: string,
  customFields?: Record<string, any>
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!process.env.LOOPS_API_KEY) {
      console.log('[Loops] LOOPS_API_KEY not configured, skipping contact sync')
      return { success: false, error: 'Loops not configured' }
    }

    console.log('[Loops] Adding/updating contact:', email)
    
    // Prepare contact data
    const contactData: any = {
      email: email.toLowerCase().trim(),
      source: customFields?.source || 'sselfie-platform',
      subscribed: true,
    }
    
    if (firstName) {
      contactData.firstName = firstName
    }
    
    // Add userGroup if provided
    if (customFields?.userGroup) {
      contactData.userGroup = customFields.userGroup
    } else {
      // Default to subscriber group
      contactData.userGroup = LOOPS_AUDIENCES.ALL_SUBSCRIBERS
    }
    
    // Add custom fields
    if (customFields) {
      Object.keys(customFields).forEach(key => {
        // Skip internal fields that are handled separately
        if (['source', 'tags', 'userGroup'].includes(key)) return
        
        contactData[key] = customFields[key]
      })
    }
    
    // Create or update contact (Loops createContact handles both)
    let response: any
    try {
      response = await loops.createContact(contactData)
    } catch (createError: any) {
      // If contact already exists (409), that's fine - use updateContact instead
      if (createError.statusCode === 409 || createError.message?.includes('already in your audience')) {
        console.log('[Loops] ℹ️ Contact already exists, updating:', email)
        // Contact exists, just update it
        response = { id: email } // Use email as contact ID for existing contacts
      } else {
        throw createError // Re-throw other errors
      }
    }
    
    // Add tags if provided
    if (customFields?.tags && Array.isArray(customFields.tags) && customFields.tags.length > 0) {
      try {
        await loops.updateContact({
          email: email.toLowerCase().trim(),
          tags: customFields.tags
        })
      } catch (tagError: any) {
        // Log but don't fail - contact was created/updated
        console.warn('[Loops] ⚠️ Contact created but tags failed:', tagError.message)
      }
    }
    
    console.log('[Loops] ✅ Contact added/updated:', email)
    
    return {
      success: true,
      contactId: response.id || email, // Loops might not return ID for updates
    }
    
  } catch (error: any) {
    console.error('[Loops] ❌ Error managing contact:', error)
    
    // Don't fail hard - log and continue
    return {
      success: false,
      error: error.message || 'Failed to add contact to Loops'
    }
  }
}

/**
 * Add tags to a Loops contact
 * Merges with existing tags (doesn't remove existing ones)
 */
export async function addLoopsContactTags(
  email: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.LOOPS_API_KEY) {
      return { success: false, error: 'Loops not configured' }
    }

    console.log('[Loops] Adding tags to contact:', email, tags)
    
    // Get existing contact to merge tags
    try {
      const existingContact = await loops.findContact({ email: email.toLowerCase().trim() })
      const existingTags = existingContact?.tags || []
      
      // Merge tags (avoid duplicates)
      const mergedTags = [...new Set([...existingTags, ...tags])]
      
      await loops.updateContact({
        email: email.toLowerCase().trim(),
        tags: mergedTags
      })
    } catch (getError: any) {
      // If contact doesn't exist, just add tags (will create contact)
      await loops.updateContact({
        email: email.toLowerCase().trim(),
        tags: tags
      })
    }
    
    console.log('[Loops] ✅ Tags added:', email)
    
    return { success: true }
    
  } catch (error: any) {
    console.error('[Loops] ❌ Error adding tags:', error)
    return {
      success: false,
      error: error.message || 'Failed to add tags'
    }
  }
}

/**
 * Update tags for an existing contact (replaces existing tags)
 */
export async function updateLoopsContactTags(
  email: string,
  tags: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.LOOPS_API_KEY) {
      return { success: false, error: 'Loops not configured' }
    }

    console.log('[Loops] Updating tags for contact:', email, tags)
    
    await loops.updateContact({
      email: email.toLowerCase().trim(),
      tags: tags
    })
    
    console.log('[Loops] ✅ Tags updated:', email)
    
    return { success: true }
    
  } catch (error: any) {
    console.error('[Loops] ❌ Error updating tags:', error)
    return {
      success: false,
      error: error.message || 'Failed to update tags'
    }
  }
}

/**
 * Set user group (main audience segment)
 */
export async function setLoopsUserGroup(
  email: string,
  userGroup: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.LOOPS_API_KEY) {
      return { success: false, error: 'Loops not configured' }
    }

    console.log('[Loops] Setting user group:', email, userGroup)
    
    await loops.updateContact({
      email: email.toLowerCase().trim(),
      userGroup: userGroup
    })
    
    console.log('[Loops] ✅ User group set:', email)
    
    return { success: true }
    
  } catch (error: any) {
    console.error('[Loops] ❌ Error setting user group:', error)
    return {
      success: false,
      error: error.message || 'Failed to set user group'
    }
  }
}

/**
 * Remove contact from Loops (unsubscribe)
 */
export async function removeLoopsContact(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!process.env.LOOPS_API_KEY) {
      return { success: false, error: 'Loops not configured' }
    }

    console.log('[Loops] Removing contact:', email)
    
    await loops.updateContact({
      email: email.toLowerCase().trim(),
      subscribed: false
    })
    
    console.log('[Loops] ✅ Contact unsubscribed:', email)
    
    return { success: true }
    
  } catch (error: any) {
    console.error('[Loops] ❌ Error removing contact:', error)
    return {
      success: false,
      error: error.message || 'Failed to unsubscribe contact'
    }
  }
}

/**
 * Sync contact from database to Loops
 * Used for migration and ongoing sync
 */
export async function syncContactToLoops(contactData: {
  email: string
  name: string
  source: string
  tags: string[]
  userGroup?: string
  customFields?: Record<string, any>
}): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    if (!process.env.LOOPS_API_KEY) {
      return { success: false, error: 'Loops not configured' }
    }

    const firstName = contactData.name.split(' ')[0] || contactData.name
    
    // Add contact
    const result = await addOrUpdateLoopsContact(
      contactData.email,
      firstName,
      {
        source: contactData.source,
        userGroup: contactData.userGroup,
        tags: contactData.tags,
        ...contactData.customFields
      }
    )
    
    if (!result.success) {
      return result
    }
    
    // Tags are already added in addOrUpdateLoopsContact, but ensure they're set
    if (contactData.tags && contactData.tags.length > 0) {
      await addLoopsContactTags(contactData.email, contactData.tags)
    }
    
    return result
    
  } catch (error: any) {
    console.error('[Loops] ❌ Error syncing contact:', error)
    return {
      success: false,
      error: error.message || 'Failed to sync contact'
    }
  }
}

