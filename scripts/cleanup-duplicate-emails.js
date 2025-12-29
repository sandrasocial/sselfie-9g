#!/usr/bin/env node

/**
 * Cleanup duplicate emails and sequences in the email library
 * Removes duplicates, keeping only the most recent version of each
 */

const { neon } = require('@neondatabase/serverless')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function cleanupDuplicates() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable not found')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  console.log('🧹 Starting duplicate email cleanup...\n')

  try {
    // 1. Clean up duplicate email drafts
    console.log('📧 Cleaning up duplicate email drafts...')
    
    // Find duplicates based on subject + content hash (first 500 chars)
    const duplicateDrafts = await sql`
      WITH ranked_drafts AS (
        SELECT 
          id,
          draft_name,
          subject_line,
          body_html,
          SUBSTRING(body_html, 1, 500) as content_hash,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY subject_line, SUBSTRING(body_html, 1, 500)
            ORDER BY created_at DESC
          ) as rn
        FROM admin_email_drafts
        WHERE is_current_version = true
          AND status != 'archived'
      )
      SELECT id, draft_name, subject_line, created_at
      FROM ranked_drafts
      WHERE rn > 1
      ORDER BY created_at DESC
    `

    console.log(`   Found ${duplicateDrafts.length} duplicate email drafts`)

    if (duplicateDrafts.length > 0) {
      const duplicateIds = duplicateDrafts.map((d) => d.id)
      
      // Archive duplicates (soft delete)
      await sql`
        UPDATE admin_email_drafts
        SET status = 'archived',
            is_current_version = false,
            updated_at = NOW()
        WHERE id = ANY(${duplicateIds})
      `

      console.log(`   ✅ Archived ${duplicateIds.length} duplicate email drafts`)
      
      // Show summary
      duplicateDrafts.slice(0, 10).forEach((draft) => {
        console.log(`      - "${draft.draft_name || draft.subject_line}" (ID: ${draft.id}, created: ${new Date(draft.created_at).toLocaleDateString()})`)
      })
      if (duplicateDrafts.length > 10) {
        console.log(`      ... and ${duplicateDrafts.length - 10} more`)
      }
    }

    // 2. Clean up duplicate automation sequences
    console.log('\n🔄 Cleaning up duplicate automation sequences...')
    
    const duplicateSequences = await sql`
      WITH ranked_sequences AS (
        SELECT 
          id,
          campaign_name,
          body_html,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY campaign_name, body_html
            ORDER BY created_at DESC
          ) as rn
        FROM admin_email_campaigns
        WHERE campaign_type = 'resend_automation_sequence'
          AND status != 'archived'
      )
      SELECT id, campaign_name, created_at
      FROM ranked_sequences
      WHERE rn > 1
      ORDER BY created_at DESC
    `

    console.log(`   Found ${duplicateSequences.length} duplicate automation sequences`)

    if (duplicateSequences.length > 0) {
      const duplicateIds = duplicateSequences.map((s) => s.id)
      
      // Archive duplicates (soft delete)
      await sql`
        UPDATE admin_email_campaigns
        SET status = 'archived',
            updated_at = NOW()
        WHERE id = ANY(${duplicateIds})
      `

      console.log(`   ✅ Archived ${duplicateIds.length} duplicate automation sequences`)
      
      // Show summary
      duplicateSequences.slice(0, 10).forEach((seq) => {
        console.log(`      - "${seq.campaign_name}" (ID: ${seq.id}, created: ${new Date(seq.created_at).toLocaleDateString()})`)
      })
      if (duplicateSequences.length > 10) {
        console.log(`      ... and ${duplicateSequences.length - 10} more`)
      }
    }

    // 3. Show final counts
    console.log('\n📊 Final counts:')
    
    const draftCount = await sql`
      SELECT COUNT(*) as count
      FROM admin_email_drafts
      WHERE is_current_version = true
        AND status != 'archived'
    `
    
    const sequenceCount = await sql`
      SELECT COUNT(*) as count
      FROM admin_email_campaigns
      WHERE campaign_type = 'resend_automation_sequence'
        AND status != 'archived'
    `

    console.log(`   Active email drafts: ${draftCount[0].count}`)
    console.log(`   Active automation sequences: ${sequenceCount[0].count}`)
    
    console.log('\n✅ Cleanup complete!')
    console.log('   Duplicates have been archived (not deleted) and can be restored if needed.')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message)
    console.error('Full error:', error)
    process.exit(1)
  }
}

cleanupDuplicates()

