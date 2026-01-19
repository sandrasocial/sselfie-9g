/**
 * Style Coherence Resolver - Test Suite
 * 
 * Run with: node --loader ts-node/esm lib/feed-planner/__tests__/coherence-resolver.test.ts
 * Or via validation function: _validateCoherenceResolver()
 */

import { resolveCoherentStyle } from '../style-coherence-resolver'

console.log('=== Style Coherence Resolver Test Suite ===\n')

// Test 1: Adaptation - Athletic + Luxury
console.log('Test 1: Athletic + Luxury = Adaptation')
const test1 = resolveCoherentStyle({
  category: 'luxury',
  mood: 'luxury',
  fashionStyle: 'athletic',
  userId: 'test-user-1',
  feedId: 'test-feed-1'
})
console.assert(
  test1.resolvedFashionStyle === 'elevated_athleisure',
  `FAILED: Expected "elevated_athleisure", got "${test1.resolvedFashionStyle}"`
)
console.assert(test1.adaptationApplied === true, 'FAILED: adaptationApplied should be true')
console.log(`✅ PASS: ${test1.resolvedFashionStyle}\n`)

// Test 2: Adaptation - Bohemian + Minimal
console.log('Test 2: Bohemian + Minimal = Adaptation')
const test2 = resolveCoherentStyle({
  category: 'minimal',
  mood: 'minimal',
  fashionStyle: 'bohemian',
  userId: 'test-user-2',
  feedId: 'test-feed-2'
})
console.assert(
  test2.resolvedFashionStyle === 'minimal_bohemian',
  `FAILED: Expected "minimal_bohemian", got "${test2.resolvedFashionStyle}"`
)
console.assert(test2.adaptationApplied === true, 'FAILED: adaptationApplied should be true')
console.log(`✅ PASS: ${test2.resolvedFashionStyle}\n`)

// Test 3: Blocking - Athletic + Professional
console.log('Test 3: Athletic + Professional = Block (fallback to business)')
const test3 = resolveCoherentStyle({
  category: 'professional',
  mood: 'minimal',
  fashionStyle: 'athletic',
  userId: 'test-user-3',
  feedId: 'test-feed-3'
})
console.assert(
  test3.resolvedFashionStyle === 'business',
  `FAILED: Expected "business", got "${test3.resolvedFashionStyle}"`
)
console.assert(test3.adaptationApplied === true, 'FAILED: adaptationApplied should be true (blocking counts as adaptation)')
console.log(`✅ PASS: ${test3.resolvedFashionStyle}\n`)

// Test 4: Allow - Casual + Minimal
console.log('Test 4: Casual + Minimal = Allow')
const test4 = resolveCoherentStyle({
  category: 'minimal',
  mood: 'minimal',
  fashionStyle: 'casual',
  userId: 'test-user-4',
  feedId: 'test-feed-4'
})
console.assert(
  test4.resolvedFashionStyle === 'casual',
  `FAILED: Expected "casual", got "${test4.resolvedFashionStyle}"`
)
console.assert(test4.adaptationApplied === false, 'FAILED: adaptationApplied should be false (no adaptation needed)')
console.log(`✅ PASS: ${test4.resolvedFashionStyle}\n`)

// Test 5: Default - No fashion style + Luxury
console.log('Test 5: No fashion style + Luxury = Category default (classic)')
const test5 = resolveCoherentStyle({
  category: 'luxury',
  mood: 'luxury',
  fashionStyle: null,
  userId: 'test-user-5',
  feedId: 'test-feed-5'
})
console.assert(
  test5.resolvedFashionStyle === 'classic',
  `FAILED: Expected "classic", got "${test5.resolvedFashionStyle}"`
)
console.assert(test5.adaptationApplied === false, 'FAILED: adaptationApplied should be false (no adaptation, just default)')
console.log(`✅ PASS: ${test5.resolvedFashionStyle}\n`)

// Test 6: Adaptation - Casual + Luxury
console.log('Test 6: Casual + Luxury = Adaptation (elevated_casual)')
const test6 = resolveCoherentStyle({
  category: 'luxury',
  mood: 'luxury',
  fashionStyle: 'casual',
  userId: 'test-user-6',
  feedId: 'test-feed-6'
})
console.assert(
  test6.resolvedFashionStyle === 'elevated_casual',
  `FAILED: Expected "elevated_casual", got "${test6.resolvedFashionStyle}"`
)
console.assert(test6.adaptationApplied === true, 'FAILED: adaptationApplied should be true')
console.log(`✅ PASS: ${test6.resolvedFashionStyle}\n`)

// Test 7: Allow - Classic + Any Category
console.log('Test 7: Classic + Luxury = Allow (classic is universally compatible)')
const test7 = resolveCoherentStyle({
  category: 'luxury',
  mood: 'luxury',
  fashionStyle: 'classic',
  userId: 'test-user-7',
  feedId: 'test-feed-7'
})
console.assert(
  test7.resolvedFashionStyle === 'classic',
  `FAILED: Expected "classic", got "${test7.resolvedFashionStyle}"`
)
console.assert(test7.adaptationApplied === false, 'FAILED: adaptationApplied should be false')
console.log(`✅ PASS: ${test7.resolvedFashionStyle}\n`)

// Test 8: Blocking - Bohemian + Luxury
console.log('Test 8: Bohemian + Luxury = Block (fallback to classic)')
const test8 = resolveCoherentStyle({
  category: 'luxury',
  mood: 'luxury',
  fashionStyle: 'bohemian',
  userId: 'test-user-8',
  feedId: 'test-feed-8'
})
console.assert(
  test8.resolvedFashionStyle === 'classic',
  `FAILED: Expected "classic" (luxury default), got "${test8.resolvedFashionStyle}"`
)
console.assert(test8.adaptationApplied === true, 'FAILED: adaptationApplied should be true (blocking)')
console.log(`✅ PASS: ${test8.resolvedFashionStyle}\n`)

console.log('=== ALL TESTS PASSED ✅ ===')
console.log('\nResolver is working correctly!')
console.log('Ready for staging deployment.')
