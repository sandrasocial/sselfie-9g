/**
 * Create Automation Tool
 * Generates and optionally implements automation code directly
 */

import type { Tool, ToolResult } from '../../types'
import { Anthropic, ALEX_CONSTANTS } from '../../shared/dependencies'
import * as fs from 'fs/promises'
import { join, dirname } from 'path'

interface CreateAutomationInput {
  automation_type: string
  description: string
  schedule?: string
  implement_directly?: boolean
}

export const createAutomationTool: Tool<CreateAutomationInput> = {
  name: "create_automation",
  description: `Generate AND optionally implement automation code directly. Can create cron jobs, webhooks, email sequences, etc. By default, implements the code directly into the codebase. Sandra can request 'generate only' mode if she wants to review in Cursor first.

Examples:
- "Alex, create a weekly report cron job" → Alex implements it
- "Alex, generate a payment recovery system but let me review first" → Alex provides code`,

  input_schema: {
    type: "object",
    properties: {
      automation_type: {
        type: "string",
        enum: [
          "cron_job",
          "webhook_handler", 
          "email_sequence",
          "database_cleanup",
          "analytics_reporter",
          "customer_lifecycle",
          "re_engagement",
          "payment_recovery",
          "testimonial_collection",
          "slack_notification",
          "backup_system"
        ],
        description: "Type of automation to create"
      },
      description: {
        type: "string",
        description: "What the automation should do"
      },
      schedule: {
        type: "string",
        description: "When it should run (for cron jobs). Examples: 'daily at 9am', 'every Monday at 6pm', 'every hour'"
      },
      implement_directly: {
        type: "boolean",
        description: "If true, Alex implements the code directly. If false, Alex just generates code for Sandra to review in Cursor."
      }
    },
    required: ["automation_type", "description"]
  },

  async execute({ 
    automation_type, 
    description, 
    schedule, 
    implement_directly = true 
  }: CreateAutomationInput): Promise<ToolResult> {
    console.log('[Alex] 🤖 create_automation called:', {
      automation_type,
      description,
      schedule,
      implement_directly
    })

    try {
      // Step 1: Generate the code using Claude
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      })

      const codeGeneration = await anthropic.messages.create({
        model: ALEX_CONSTANTS.MODEL,
        max_tokens: 8000,
        system: `You are generating production-ready automation code for SSELFIE Studio.

Tech stack:
- Next.js 14 App Router
- Neon PostgreSQL (@vercel/postgres)
- Resend for transactional emails
- Resend for email sending  
- Stripe for payments
- Vercel hosting

Return a JSON object with:
{
  "file_path": "app/api/cron/example/route.ts",
  "code": "... complete TypeScript code ...",
  "migration_sql": "... SQL if database changes needed ... OR null",
  "vercel_config": { "crons": [{ "path": "/api/cron/example", "schedule": "0 9 * * *" }] } OR null,
  "env_vars": ["VAR_NAME=description", ...] OR [],
  "next_steps": ["Step 1", "Step 2", ...]
}

Code requirements:
- Complete, runnable code
- Proper error handling
- Auth checks (CRON_SECRET for crons)
- Optimized queries
- Clear comments
- Environment variable usage
- Logging

For cron jobs:
- GET handler with Bearer token auth
- Return JSON with results
- Include in vercel.json crons array

For webhooks:  
- POST handler with signature verification
- Parse payload safely
- Handle errors gracefully`,
        
        messages: [{
          role: 'user',
          content: `Create ${automation_type} automation.

Description: ${description}
Schedule: ${schedule || 'N/A'}

Generate complete, production-ready code.`
        }]
      })

      // Extract text from response
      const responseText = codeGeneration.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n')

      // Parse JSON from response (might be wrapped in markdown code blocks)
      let automation: any
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
        if (jsonMatch) {
          automation = JSON.parse(jsonMatch[1])
        } else {
          // Try parsing the whole response as JSON
          automation = JSON.parse(responseText)
        }
      } catch (parseError: any) {
        console.error('[Alex] ❌ Failed to parse automation JSON:', parseError)
        return {
          success: false,
          error: `Failed to parse generated code: ${parseError.message}`,
          raw_response: responseText.substring(0, 500)
        }
      }

      if (implement_directly) {
        // Step 2: Implement directly
        const results = {
          files_created: [] as string[],
          files_updated: [] as string[],
          migrations_created: [] as string[],
          next_steps: [] as string[]
        }

        try {
          // Create the main file
          const workspaceRoot = process.cwd()
          const filePath = join(workspaceRoot, automation.file_path)
          
          // Ensure directory exists
          const dirPath = dirname(filePath)
          await fs.mkdir(dirPath, { recursive: true })
          
          // Write the file
          await fs.writeFile(filePath, automation.code, 'utf8')
          results.files_created.push(automation.file_path)
          console.log('[Alex] ✅ Created file:', automation.file_path)

          // Create migration if needed
          if (automation.migration_sql) {
            const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
            const migrationPath = `scripts/migrations/${timestamp}_${automation_type}.sql`
            const fullMigrationPath = join(workspaceRoot, migrationPath)
            
            // Ensure migrations directory exists
            const migrationDirPath = dirname(fullMigrationPath)
            await fs.mkdir(migrationDirPath, { recursive: true })
            
            await fs.writeFile(fullMigrationPath, automation.migration_sql, 'utf8')
            results.migrations_created.push(migrationPath)
            results.next_steps.push(`Run migration: psql $DATABASE_URL -f ${migrationPath}`)
            console.log('[Alex] ✅ Created migration:', migrationPath)
          }

          // Update vercel.json if needed
          if (automation.vercel_config && automation.vercel_config.crons) {
            const vercelJsonPath = join(workspaceRoot, 'vercel.json')
            const vercelJsonContent = await fs.readFile(vercelJsonPath, 'utf8')
            const currentConfig = JSON.parse(vercelJsonContent)
            
            // Merge cron configs
            if (!currentConfig.crons) {
              currentConfig.crons = []
            }
            currentConfig.crons.push(...automation.vercel_config.crons)
            
            // Write back
            await fs.writeFile(vercelJsonPath, JSON.stringify(currentConfig, null, 2) + '\n', 'utf8')
            results.files_updated.push('vercel.json')
            console.log('[Alex] ✅ Updated vercel.json')
          }

          // Prepare response
          return {
            success: true,
            mode: 'implemented',
            automation_type,
            results,
            env_vars_needed: automation.env_vars || [],
            next_steps: [
              ...(automation.next_steps || []),
              "git add .",
              `git commit -m 'Add: ${automation_type} automation'`,
              "git push",
              "Deploy to Vercel"
            ]
          }

        } catch (error: any) {
          // If implementation fails, fall back to generate-only mode
          console.error('[Alex] ❌ Implementation failed:', error)
          return {
            success: false,
            error: error.message,
            mode: 'generated_only',
            automation: automation,
            message: "Couldn't implement directly. Here's the code to review in Cursor."
          }
        }

      } else {
        // Generate-only mode
        return {
          success: true,
          mode: 'generated_only',
          automation_type,
          automation,
          message: "Code generated. Send to Cursor to implement."
        }
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error in create_automation tool:', error)
      return {
        success: false,
        error: error.message || 'Failed to create automation',
        automation_type
      }
    }
  }
}

