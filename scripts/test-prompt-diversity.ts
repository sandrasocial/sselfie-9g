#!/usr/bin/env tsx
/**
 * Test Script: Prompt Diversity Checker
 * 
 * This script analyzes generated concept prompts to ensure:
 * 1. Each concept has a unique, creative title (not "Concept 1", "Variation 2")
 * 2. Descriptions tell unique stories (not copy-paste with minor changes)
 * 3. Prompts have meaningful variation (not just pose changes)
 * 4. Maya's personality and intelligence shine through
 */

interface ConceptCard {
  title: string
  description: string
  prompt: string
  category?: string
}

interface DiversityMetrics {
  uniqueTitles: boolean
  uniqueDescriptions: boolean
  meaningfulPromptVariation: boolean
  titleCreativity: number // 0-1 score
  descriptionStorytelling: number // 0-1 score
  promptSimilarity: number // 0-1 score (lower is better = more diverse)
  issues: string[]
}

function analyzePromptDiversity(concepts: ConceptCard[]): DiversityMetrics {
  const issues: string[] = []
  let titleCreativity = 0
  let descriptionStorytelling = 0
  let promptSimilarity = 0

  // Check 1: Title Uniqueness & Creativity
  const titles = concepts.map(c => c.title.toLowerCase().trim())
  const uniqueTitles = new Set(titles).size === titles.length
  if (!uniqueTitles) {
    issues.push("❌ Titles are NOT unique - some concepts share the same title")
  }

  // Check title creativity (not generic patterns)
  const genericPatterns = [
    /concept\s*\d+/i,
    /variation\s*\d+/i,
    /^concept$/i,
    /^variation$/i,
    /card\s*\d+/i,
  ]
  let creativeTitleCount = 0
  titles.forEach(title => {
    const isGeneric = genericPatterns.some(pattern => pattern.test(title))
    if (!isGeneric && title.length > 10) {
      creativeTitleCount++
    } else if (isGeneric) {
      issues.push(`❌ Generic title detected: "${title}"`)
    }
  })
  titleCreativity = creativeTitleCount / titles.length

  // Check 2: Description Uniqueness & Storytelling
  const descriptions = concepts.map(c => c.description.toLowerCase().trim())
  
  // Calculate similarity between descriptions
  let totalSimilarity = 0
  let comparisons = 0
  for (let i = 0; i < descriptions.length; i++) {
    for (let j = i + 1; j < descriptions.length; j++) {
      const similarity = calculateSimilarity(descriptions[i], descriptions[j])
      totalSimilarity += similarity
      comparisons++
      
      if (similarity > 0.85) {
        issues.push(
          `❌ Descriptions ${i + 1} and ${j + 1} are too similar (${Math.round(similarity * 100)}% match)`
        )
      }
    }
  }
  promptSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0

  // Check if descriptions tell stories (not just lists)
  let storyCount = 0
  descriptions.forEach((desc, idx) => {
    // Storytelling indicators: action verbs, emotions, moments, narrative
    const hasAction = /(?:savoring|caught|lost|glancing|heading|creating|feeling|experiencing|watching|thinking)/i.test(desc)
    const hasEmotion = /(?:peaceful|confident|excited|relaxed|contemplative|magical|intimate)/i.test(desc)
    const hasMoment = /(?:moment|as|while|when|before|after)/i.test(desc)
    const isStory = hasAction && (hasEmotion || hasMoment)
    
    if (isStory && desc.length > 50) {
      storyCount++
    } else if (desc.length < 50) {
      issues.push(`❌ Description ${idx + 1} is too short or generic: "${desc.substring(0, 100)}"`)
    }
  })
  descriptionStorytelling = storyCount / descriptions.length

  const uniqueDescriptions = promptSimilarity < 0.7 // Less than 70% average similarity

  // Check 3: Prompt Variation
  const prompts = concepts.map(c => c.prompt.toLowerCase().trim())
  let promptVariationScore = 0
  let promptComparisons = 0
  
  for (let i = 0; i < prompts.length; i++) {
    for (let j = i + 1; j < prompts.length; j++) {
      const similarity = calculateSimilarity(prompts[i], prompts[j])
      promptVariationScore += similarity
      promptComparisons++
      
      if (similarity > 0.90) {
        issues.push(
          `❌ Prompts ${i + 1} and ${j + 1} are nearly identical (${Math.round(similarity * 100)}% match)`
        )
      }
    }
  }
  
  const avgPromptSimilarity = promptComparisons > 0 ? promptVariationScore / promptComparisons : 0
  const meaningfulPromptVariation = avgPromptSimilarity < 0.80 // Less than 80% average similarity

  return {
    uniqueTitles,
    uniqueDescriptions,
    meaningfulPromptVariation,
    titleCreativity,
    descriptionStorytelling,
    promptSimilarity: avgPromptSimilarity,
    issues,
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  // Simple word-based similarity
  const words1 = new Set(str1.split(/\s+/))
  const words2 = new Set(str2.split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

function printAnalysisReport(concepts: ConceptCard[], metrics: DiversityMetrics) {
  console.log("\n" + "=".repeat(80))
  console.log("PROMPT DIVERSITY ANALYSIS REPORT")
  console.log("=".repeat(80))
  
  console.log(`\n📊 Analyzing ${concepts.length} concepts:\n`)
  
  // Print each concept
  concepts.forEach((concept, idx) => {
    console.log(`\nConcept #${idx + 1}:`)
    console.log(`  Title: "${concept.title}"`)
    console.log(`  Description: "${concept.description.substring(0, 150)}${concept.description.length > 150 ? '...' : ''}"`)
    console.log(`  Prompt length: ${concept.prompt.length} chars`)
  })
  
  // Print metrics
  console.log("\n" + "-".repeat(80))
  console.log("DIVERSITY METRICS:")
  console.log("-".repeat(80))
  console.log(`✅ Unique Titles: ${metrics.uniqueTitles ? 'YES' : 'NO'}`)
  console.log(`✅ Unique Descriptions: ${metrics.uniqueDescriptions ? 'YES' : 'NO'} (avg similarity: ${Math.round(metrics.promptSimilarity * 100)}%)`)
  console.log(`✅ Meaningful Prompt Variation: ${metrics.meaningfulPromptVariation ? 'YES' : 'NO'}`)
  console.log(`📈 Title Creativity Score: ${Math.round(metrics.titleCreativity * 100)}%`)
  console.log(`📈 Description Storytelling Score: ${Math.round(metrics.descriptionStorytelling * 100)}%`)
  console.log(`📉 Prompt Similarity: ${Math.round(metrics.promptSimilarity * 100)}% (lower is better)`)
  
  // Print issues
  if (metrics.issues.length > 0) {
    console.log("\n" + "-".repeat(80))
    console.log("❌ ISSUES FOUND:")
    console.log("-".repeat(80))
    metrics.issues.forEach(issue => console.log(`  ${issue}`))
  } else {
    console.log("\n✅ No issues found - prompts are diverse and creative!")
  }
  
  // Overall verdict
  console.log("\n" + "=".repeat(80))
  const allGood = metrics.uniqueTitles && 
                  metrics.uniqueDescriptions && 
                  metrics.meaningfulPromptVariation &&
                  metrics.titleCreativity > 0.8 &&
                  metrics.descriptionStorytelling > 0.7 &&
                  metrics.promptSimilarity < 0.75
  
  if (allGood) {
    console.log("✅ OVERALL: EXCELLENT - Prompts are diverse and creative!")
  } else if (metrics.issues.length < 3) {
    console.log("⚠️  OVERALL: GOOD - Minor issues detected")
  } else {
    console.log("❌ OVERALL: POOR - Significant issues with prompt diversity")
  }
  console.log("=".repeat(80) + "\n")
}

// Example usage for testing
async function testExampleConcepts() {
  console.log("🧪 Testing with example concepts...\n")
  
  // Example: BAD (repetitive)
  const badConcepts: ConceptCard[] = [
    {
      title: "Christmas Morning Cashmere",
      description: "Intimate Christmas morning moment: sitting cross-legged on cream linen sofa. Bottega Veneta mini jodie bag rests on marble coffee table. Soft morning light.",
      prompt: "Woman sitting cross-legged on sofa with Christmas tree, wearing cashmere sweater, soft morning light"
    },
    {
      title: "Christmas Morning Cashmere (Variation 2)",
      description: "Intimate Christmas morning moment: standing near the window. Bottega Veneta mini jodie bag rests on marble coffee table. Soft morning light.",
      prompt: "Woman standing near window with Christmas tree, wearing cashmere sweater, soft morning light"
    },
    {
      title: "Christmas Morning Cashmere (Variation 3)",
      description: "Intimate Christmas morning moment: leaning against the wall. Bottega Veneta mini jodie bag rests on marble coffee table. Soft morning light.",
      prompt: "Woman leaning against wall with Christmas tree, wearing cashmere sweater, soft morning light"
    }
  ]
  
  const badMetrics = analyzePromptDiversity(badConcepts)
  printAnalysisReport(badConcepts, badMetrics)
  
  // Example: GOOD (diverse)
  const goodConcepts: ConceptCard[] = [
    {
      title: "First Sip at the Corner Bistro",
      description: "Savoring that first perfect espresso as morning light streams through the window, lost in the quiet moment before the city wakes up, wrapped in cozy cashmere",
      prompt: "Woman in cashmere sweater at bistro, holding espresso, morning light through window, contemplative expression"
    },
    {
      title: "Mid-Stride Through SoHo",
      description: "Caught mid-step between boutiques, glancing at phone with a knowing smile, designer bag swinging at your side, heading somewhere exciting with confident energy",
      prompt: "Woman walking through SoHo, checking phone, designer bag, confident stride, urban setting"
    },
    {
      title: "Evening Wind-Down Ritual",
      description: "Curled up in a favorite reading nook as golden hour paints the room, tea steaming beside an open journal, finding peace in the transition from day to night",
      prompt: "Woman in reading nook, golden hour lighting, tea and journal, peaceful evening atmosphere"
    }
  ]
  
  const goodMetrics = analyzePromptDiversity(goodConcepts)
  printAnalysisReport(goodConcepts, goodMetrics)
}

// Run if called directly
if (require.main === module) {
  testExampleConcepts().catch(console.error)
}

export { analyzePromptDiversity, calculateSimilarity, printAnalysisReport, type ConceptCard, type DiversityMetrics }




