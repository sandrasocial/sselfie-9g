#!/usr/bin/env node

/**
 * Setup script for Project Tracker
 * Creates all necessary database tables
 *
 * Usage: node scripts/setup-project-tracker.js
 */

require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

async function setupProjectTracker() {
  console.log('🚀 Starting Project Tracker setup...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in environment variables')
    console.error('   Make sure .env.local exists with DATABASE_URL set')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    console.log('📋 Creating projects table...')
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        emoji TEXT DEFAULT '🎯',
        color TEXT DEFAULT '#8B5CF6',
        status TEXT DEFAULT 'active',
        vision_image_url TEXT,
        goal_date TIMESTAMP,
        progress INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ projects table ready')

    console.log('📋 Creating project_tasks table...')
    await sql`
      CREATE TABLE IF NOT EXISTS project_tasks (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'todo',
        is_quick_win BOOLEAN DEFAULT FALSE,
        is_deep_work BOOLEAN DEFAULT FALSE,
        energy_level TEXT DEFAULT 'medium',
        estimated_minutes INTEGER,
        actual_minutes INTEGER,
        due_date TIMESTAMP,
        scheduled_for DATE,
        completed_at TIMESTAMP,
        celebration_seen BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ project_tasks table ready')

    console.log('📋 Creating task_subtasks table...')
    await sql`
      CREATE TABLE IF NOT EXISTS task_subtasks (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT FALSE,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `
    console.log('✅ task_subtasks table ready')

    console.log('📋 Creating daily_focus table...')
    await sql`
      CREATE TABLE IF NOT EXISTS daily_focus (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
        priority_rank INTEGER DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(date, priority_rank)
      )
    `
    console.log('✅ daily_focus table ready')

    console.log('📋 Creating achievements table...')
    await sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        celebration_seen BOOLEAN DEFAULT FALSE
      )
    `
    console.log('✅ achievements table ready')

    console.log('📋 Creating indexes...')
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_project ON project_tasks(project_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON project_tasks(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON project_tasks(scheduled_for)`
    await sql`CREATE INDEX IF NOT EXISTS idx_subtasks_task ON task_subtasks(task_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_daily_focus_date ON daily_focus(date)`
    console.log('✅ indexes created')

    console.log('\n📋 Checking for High-Ticket Offer project...')
    const existing = await sql`SELECT id FROM projects WHERE title = 'High-Ticket Offer Launch'`

    if (existing.length === 0) {
      console.log('📋 Creating High-Ticket Offer project...')
      const goalDate = new Date()
      goalDate.setDate(goalDate.getDate() + 7) // 7 days from now

      await sql`
        INSERT INTO projects (title, description, emoji, color, vision_image_url, goal_date)
        VALUES (
          'High-Ticket Offer Launch',
          'Create and launch premium service offering with landing page, booking system, and checkout flow',
          '💎',
          '#EC4899',
          '/images/img-4801.jpg',
          ${goalDate.toISOString()}
        )
      `
      console.log('✅ High-Ticket Offer project created')
    } else {
      console.log('✅ High-Ticket Offer project already exists')
    }

    console.log('\n🎉 Project Tracker setup complete!')
    console.log('\n📍 Next steps:')
    console.log('   1. Visit: /admin/project-tracker')
    console.log('   2. Run: node scripts/populate-high-ticket-tasks.js')
    console.log('   3. Start crushing goals! 💪\n')

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

setupProjectTracker()
