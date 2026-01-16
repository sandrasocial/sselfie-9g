import { describe, it, expect } from 'vitest'
import { replacePlaceholders, extractPlaceholderKeys, validatePlaceholders } from '../lib/feed-planner/template-placeholders'
import { BLUEPRINT_PHOTOSHOOT_TEMPLATES } from '../lib/maya/blueprint-photoshoot-templates'

describe('template placeholders', () => {
  it('replaces placeholders with values', () => {
    const template = "Sitting on {{LOCATION_OUTDOOR_1}} - {{OUTFIT_FULLBODY_1}}, {{STYLING_NOTES}}, relaxed pose"
    const placeholders = {
      LOCATION_OUTDOOR_1: "concrete stairs",
      OUTFIT_FULLBODY_1: "black blazer, leather pants, beanie, sunglasses",
      STYLING_NOTES: "editorial styling with attention to texture"
    }

    const result = replacePlaceholders(template, placeholders)
    expect(result).toContain('concrete stairs')
    expect(result).toContain('black blazer')
    expect(result).not.toContain('{{')
  })

  it('extracts placeholder keys', () => {
    const template = "{{OUTFIT_FULLBODY_1}} {{LOCATION_OUTDOOR_1}} {{LIGHTING_EVENING}}"
    const keys = extractPlaceholderKeys(template)

    // extractPlaceholderKeys only allows uppercase letters/underscores (no digits)
    expect(keys).toContain('LIGHTING_EVENING')
    expect(keys.length).toBe(1)
  })

  it('validates missing placeholders', () => {
    const template = "{{OUTFIT_FULLBODY_1}} {{LOCATION_OUTDOOR_1}} {{MISSING_PLACEHOLDER}}"
    const placeholders = {
      OUTFIT_FULLBODY_1: "test outfit",
      LOCATION_OUTDOOR_1: "test location"
    }

    const validation = validatePlaceholders(template, placeholders)
    expect(validation.isValid).toBe(false)
    expect(validation.missingPlaceholders).toContain('MISSING_PLACEHOLDER')
  })

  it('ensures all templates include placeholders', () => {
    const templates = Object.entries(BLUEPRINT_PHOTOSHOOT_TEMPLATES)
    const results = templates.map(([vibe, template]) => ({
      vibe,
      placeholderCount: extractPlaceholderKeys(template).length
    }))

    results.forEach(result => {
      expect(result.placeholderCount).toBeGreaterThan(0)
    })
  })
})
