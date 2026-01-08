/**
 * Reactivation Sequence Email Templates
 * 3-Phase Reactivation Campaign for Cold Users
 * 
 * Phase 1: RECONNECT (Days 0-5)
 * Phase 2: DISCOVER (Days 7-14)
 * Phase 3: CONVERT (Days 20-25)
 */

// Phase 1: RECONNECT
export { generateReactivationDay0Email } from "./reactivation-day-0"
export { generateReactivationDay2Email } from "./reactivation-day-2"
export { generateReactivationDay5Email } from "./reactivation-day-5"

// Phase 2: DISCOVER
export { generateReactivationDay7Email } from "./reactivation-day-7"
export { generateReactivationDay10Email } from "./reactivation-day-10"
export { generateReactivationDay14Email } from "./reactivation-day-14"

// Phase 3: CONVERT
export { generateReactivationDay20Email } from "./reactivation-day-20"
export { generateReactivationDay25Email } from "./reactivation-day-25"
