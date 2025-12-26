#!/usr/bin/env node

/**
 * Verify prompt guide updates
 * Usage: node verify-guide-updates.js [guideId or searchTerm]
 * Example: node verify-guide-updates.js 1
 * Example: node verify-guide-updates.js christmas
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

(async () => {
  try {
    const searchTerm = process.argv[2] || 'christmas';
    const isNumeric = !isNaN(parseInt(searchTerm));
    
    console.log(`🔍 Checking guide: ${searchTerm}\n`);
    
    let guides;
    
    if (isNumeric) {
      // Search by ID
      guides = await sql`
        SELECT 
          pg.id,
          pg.title,
          pg.description,
          pg.category,
          pg.status,
          pg.updated_at as guide_updated_at,
          pp.slug,
          pp.welcome_message,
          pp.upsell_link,
          pp.upsell_text,
          pp.email_capture_type,
          pp.email_list_tag,
          pp.created_at as page_created_at
        FROM prompt_guides pg
        LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
        WHERE pg.id = ${parseInt(searchTerm)}
      `;
    } else {
      // Search by term
      guides = await sql`
        SELECT 
          pg.id,
          pg.title,
          pg.description,
          pg.category,
          pg.status,
          pg.updated_at as guide_updated_at,
          pp.slug,
          pp.welcome_message,
          pp.upsell_link,
          pp.upsell_text,
          pp.email_capture_type,
          pp.email_list_tag,
          pp.created_at as page_created_at
        FROM prompt_guides pg
        LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
        WHERE pg.title ILIKE ${'%' + searchTerm + '%'} 
           OR pg.category ILIKE ${'%' + searchTerm + '%'} 
           OR pg.description ILIKE ${'%' + searchTerm + '%'}
           OR pp.slug ILIKE ${'%' + searchTerm + '%'}
        ORDER BY pg.created_at DESC
        LIMIT 5
      `;
    }
    
    if (guides.length === 0) {
      console.log(`❌ No guides found matching: ${searchTerm}`);
      process.exit(1);
    }
    
    console.log(`✅ Found ${guides.length} guide(s):\n`);
    
    guides.forEach((g, i) => {
      console.log(`${'='.repeat(60)}`);
      console.log(`Guide ${i + 1}: ${g.title || 'Untitled'} (ID: ${g.id})`);
      console.log('='.repeat(60));
      console.log(`Category: ${g.category || 'N/A'}`);
      console.log(`Status: ${g.status || 'N/A'}`);
      console.log(`Slug: ${g.slug || 'N/A'}`);
      console.log(`\n📝 Welcome Message:`);
      console.log(g.welcome_message || 'N/A');
      console.log(`\n💰 Upsell Text:`);
      console.log(g.upsell_text || 'N/A');
      console.log(`\n🔗 Upsell Link:`);
      console.log(g.upsell_link || 'N/A');
      console.log(`\n📧 Email Capture Type: ${g.email_capture_type || 'N/A'}`);
      console.log(`📋 Email List Tag: ${g.email_list_tag || 'N/A'}`);
      console.log(`\n🕐 Guide Last Updated: ${g.guide_updated_at || 'N/A'}`);
      console.log(`🕐 Page Created: ${g.page_created_at || 'N/A'}`);
      
      // Check for modern conversion-optimized elements
      console.log(`\n✅ Conversion Optimization Check:`);
      const hasModernUpsell = g.upsell_text && (
        g.upsell_text.includes('⚡') ||
        g.upsell_text.includes('🔥') ||
        g.upsell_text.includes('2,700+') ||
        g.upsell_text.includes('Generate These Photos') ||
        g.upsell_text.includes('unlimited') ||
        g.upsell_text.includes('creators')
      );
      const hasUTMParams = g.upsell_link && (
        g.upsell_link.includes('utm_source') ||
        g.upsell_link.includes('utm_medium') ||
        g.upsell_link.includes('utm_campaign')
      );
      const hasActionOriented = g.upsell_text && (
        g.upsell_text.includes('Join') ||
        g.upsell_text.includes('Generate') ||
        g.upsell_text.includes('Get')
      );
      
      console.log(`  Modern upsell text: ${hasModernUpsell ? '✅ YES' : '❌ NO'}`);
      console.log(`  UTM parameters: ${hasUTMParams ? '✅ YES' : '❌ NO'}`);
      console.log(`  Action-oriented: ${hasActionOriented ? '✅ YES' : '❌ NO'}`);
      
      if (hasModernUpsell && hasUTMParams && hasActionOriented) {
        console.log(`\n🎉 Guide is fully optimized!`);
      } else {
        console.log(`\n⚠️  Guide needs optimization`);
        if (!hasModernUpsell) console.log(`   - Update upsell text with emoji, social proof, and action`);
        if (!hasUTMParams) console.log(`   - Add UTM parameters to upsell link`);
        if (!hasActionOriented) console.log(`   - Make upsell text more action-oriented`);
      }
      
      if (g.slug) {
        console.log(`\n🌐 Public URL: https://sselfie.ai/prompt-guides/${g.slug}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();


