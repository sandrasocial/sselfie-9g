/**
 * Blueprint Discovery Sequence Email Templates
 * 5-Email Discovery Funnel for All Subscribers (except blueprint_subscribers)
 * 
 * Flow: Blueprint → Grid → Maya → Engagement → Membership
 */

// Email 1: Entry point
export { generateBlueprintDiscovery1Email } from "./blueprint-discovery-1"

// Email 2: Post-blueprint (only if blueprint completed)
export { generateBlueprintDiscovery2Email } from "./blueprint-discovery-2"

// Email 3: Introduce Maya (only if grid generated)
export { generateBlueprintDiscovery3Email } from "./blueprint-discovery-3"

// Email 4: Social proof (only if signed up)
export { generateBlueprintDiscovery4Email } from "./blueprint-discovery-4"

// Email 5: Conversion (only if engaged with Maya)
export { generateBlueprintDiscovery5Email } from "./blueprint-discovery-5"
