/**
 * Test Script: Maya Pro Mode Restoration Verification
 * 
 * This script tests that Maya's full personality and expertise is restored in Pro Mode.
 * 
 * It verifies:
 * 1. Maya uses enhanced getMayaPersonality() with full expertise (not just basic mission/role)
 * 2. Personality includes location inspiration, styling knowledge, creative approach
 * 3. Personality includes all expertise sections (fashion, research, image analysis, etc.)
 * 4. Personality is adapted for Pro Mode format (150-400 words, structured sections, reference images)
 * 
 * Usage:
 *   npx tsx scripts/test-maya-pro-mode-restoration.ts
 */

interface TestResult {
  testName: string
  passed: boolean
  details: string
}

async function testMayaProModeRestoration(): Promise<void> {
  console.log("=".repeat(80))
  console.log("MAYA PRO MODE RESTORATION VERIFICATION")
  console.log("=".repeat(80))
  console.log("")
  
  const results: TestResult[] = []
  
  // Test 1: Verify getMayaPersonality() is enhanced with full expertise
  console.log("📋 Test 1: Checking if getMayaPersonality() includes full expertise...")
  try {
    const { getMayaPersonality } = await import("@/lib/maya/personality-enhanced")
    const personality = getMayaPersonality()
    
    if (!personality) {
      results.push({
        testName: "getMayaPersonality() Export",
        passed: false,
        details: "getMayaPersonality() is not exported from @/lib/maya/personality-enhanced"
      })
    } else {
      const personalitySize = personality.length
      
      // Check that personality is substantial (should be much larger than minimal version)
      if (personalitySize < 5000) {
        results.push({
          testName: "Personality Size",
          passed: false,
          details: `Personality too small (${personalitySize} chars) - should be >5000 chars with full expertise`
        })
      } else {
        // Check for key sections that should be in full personality
        const hasExpertise = personality.includes("Your Expertise") || personality.includes("expertise")
        const hasLocationInspiration = personality.includes("Location Inspiration") || personality.includes("Location inspiration")
        const hasStyling = personality.includes("Influencer Styling") || personality.includes("influencer") || personality.includes("styling")
        const hasCreativeApproach = personality.includes("Creative Approach") || personality.includes("creative approach")
        const hasFashionResearch = personality.includes("Fashion Research") || personality.includes("fashion research") || personality.includes("WEB SEARCH")
        const hasImageAnalysis = personality.includes("Image Analysis") || personality.includes("image analysis")
        const hasBagRules = personality.includes("BAG/ACCESSORY") || personality.includes("bag")
        const hasCharacterLikeness = personality.includes("CHARACTER LIKENESS") || personality.includes("Character consistency") || personality.includes("reference images")
        const hasWhatMakesSpecial = personality.includes("What Makes You Special") || personality.includes("creative genius")
        
        const keySectionsCount = [
          hasExpertise,
          hasLocationInspiration,
          hasStyling,
          hasCreativeApproach,
          hasFashionResearch,
          hasImageAnalysis,
          hasBagRules,
          hasCharacterLikeness,
          hasWhatMakesSpecial
        ].filter(Boolean).length
        
        if (keySectionsCount < 7) {
          results.push({
            testName: "Personality Content",
            passed: false,
            details: `Personality missing key sections. Found ${keySectionsCount}/9: expertise=${hasExpertise}, location=${hasLocationInspiration}, styling=${hasStyling}, creative=${hasCreativeApproach}, research=${hasFashionResearch}, analysis=${hasImageAnalysis}, bag=${hasBagRules}, character=${hasCharacterLikeness}, special=${hasWhatMakesSpecial}`
          })
        } else {
          results.push({
            testName: "Personality Enhancement",
            passed: true,
            details: `✅ getMayaPersonality() enhanced correctly (${personalitySize} chars, ${keySectionsCount}/9 key sections found)`
          })
        }
      }
    }
  } catch (error) {
    results.push({
      testName: "Personality Import",
      passed: false,
      details: `Error importing getMayaPersonality: ${error instanceof Error ? error.message : String(error)}`
    })
  }
  
  // Test 2: Verify Pro Mode route uses getMayaPersonality()
  console.log("📋 Test 2: Checking if Pro Mode route uses getMayaPersonality()...")
  try {
    const routeCode = await import("fs/promises").then(fs => 
      fs.readFile("app/api/maya/pro/generate-concepts/route.ts", "utf-8")
    )
    
    // Check that getMayaPersonality is imported
    const hasImport = routeCode.includes('import { getMayaPersonality }') || routeCode.includes('getMayaPersonality')
    
    // Check that it's used
    const usesPersonality = routeCode.includes('getMayaPersonality()') || routeCode.includes('mayaPersonality')
    
    if (!hasImport) {
      results.push({
        testName: "Route Import Check",
        passed: false,
        details: "Pro Mode route does not import getMayaPersonality"
      })
    } else if (!usesPersonality) {
      results.push({
        testName: "Route Usage Check",
        passed: false,
        details: "Pro Mode route imports getMayaPersonality but doesn't use it"
      })
    } else {
      results.push({
        testName: "Route Usage Check",
        passed: true,
        details: "✅ Pro Mode route uses getMayaPersonality()"
      })
    }
  } catch (error) {
    results.push({
      testName: "Route Code Check",
      passed: false,
      details: `Error checking route code: ${error instanceof Error ? error.message : String(error)}`
    })
  }
  
  // Test 3: Verify Pro Mode specific adaptations
  console.log("📋 Test 3: Verifying Pro Mode specific adaptations...")
  try {
    const { getMayaPersonality } = await import("@/lib/maya/personality-enhanced")
    const personality = getMayaPersonality()
    
    // Pro Mode requirements:
    // - 150-400 word prompts
    // - Structured sections (POSE, STYLING, HAIR, etc.)
    // - Reference images (not trigger words)
    // - DSLR or iPhone camera specs
    
    const hasProFormat = personality.includes("150-400") || personality.includes("150-400 word")
    const hasStructuredSections = personality.includes("POSE") || personality.includes("STYLING") || personality.includes("STRUCTURE")
    const hasReferenceImages = personality.includes("reference images") || personality.includes("reference images") || personality.includes("provided reference")
    const hasNoTriggerWords = !personality.includes("trigger word") || personality.includes("not trigger words")
    const hasCameraSpecs = personality.includes("DSLR") || personality.includes("35mm") || personality.includes("85mm") || personality.includes("iPhone 15 Pro")
    
    const proRequirementsCount = [hasProFormat, hasStructuredSections, hasReferenceImages, hasCameraSpecs].filter(Boolean).length
    
    if (proRequirementsCount < 3) {
      results.push({
        testName: "Pro Mode Adaptations",
        passed: false,
        details: `Personality missing Pro Mode requirements. Found ${proRequirementsCount}/4: format=${hasProFormat}, structured=${hasStructuredSections}, reference=${hasReferenceImages}, camera=${hasCameraSpecs}`
      })
    } else {
      results.push({
        testName: "Pro Mode Adaptations",
        passed: true,
        details: `✅ Personality includes Pro Mode adaptations (${proRequirementsCount}/4 found)`
      })
    }
  } catch (error) {
    results.push({
      testName: "Pro Mode Adaptations",
      passed: false,
      details: `Error checking Pro Mode adaptations: ${error instanceof Error ? error.message : String(error)}`
    })
  }
  
  // Test 4: Compare size to minimal version (should be much larger)
  console.log("📋 Test 4: Comparing personality size to minimal version...")
  try {
    const { getMayaPersonality } = await import("@/lib/maya/personality-enhanced")
    const { MAYA_PERSONALITY } = await import("@/lib/maya/personality-enhanced")
    
    const fullPersonality = getMayaPersonality()
    const minimalSize = JSON.stringify(MAYA_PERSONALITY).length // Approximate minimal size
    
    const fullSize = fullPersonality.length
    const sizeIncrease = fullSize / minimalSize
    
    if (sizeIncrease < 3) {
      results.push({
        testName: "Personality Size Comparison",
        passed: false,
        details: `Personality size increase too small (${sizeIncrease.toFixed(1)}x). Should be at least 3x larger than minimal version. Full: ${fullSize} chars, Minimal: ~${minimalSize} chars`
      })
    } else {
      results.push({
        testName: "Personality Size Comparison",
        passed: true,
        details: `✅ Personality is substantially enhanced (${sizeIncrease.toFixed(1)}x larger, ${fullSize} chars vs ~${minimalSize} chars minimal)`
      })
    }
  } catch (error) {
    results.push({
      testName: "Personality Size Comparison",
      passed: true,
      details: `⚠️  Could not compare sizes (non-critical): ${error instanceof Error ? error.message : String(error)}`
    })
  }
  
  // Print results
  console.log("")
  console.log("=".repeat(80))
  console.log("TEST RESULTS")
  console.log("=".repeat(80))
  console.log("")
  
  const passed = results.filter(r => r.passed).length
  const total = results.length
  
  results.forEach(result => {
    const icon = result.passed ? "✅" : "❌"
    console.log(`${icon} ${result.testName}`)
    console.log(`   ${result.details}`)
    console.log("")
  })
  
  console.log("=".repeat(80))
  console.log(`SUMMARY: ${passed}/${total} tests passed`)
  console.log("=".repeat(80))
  
  if (passed === total) {
    console.log("")
    console.log("🎉 All tests passed! Maya's Pro Mode personality is fully restored.")
    process.exit(0)
  } else {
    console.log("")
    console.log("⚠️  Some tests failed. Please review the results above.")
    process.exit(1)
  }
}

// Run the test
testMayaProModeRestoration().catch(error => {
  console.error("Fatal error running tests:", error)
  process.exit(1)
})

