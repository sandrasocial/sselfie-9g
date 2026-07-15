export function isCampaignOutcomeEnabled(): boolean {
  // Fail closed. The held release becomes customer-visible only after Sandra explicitly
  // sets CAMPAIGN_OUTCOME_DISABLED=false and approves the DRAFT copy.
  return process.env.CAMPAIGN_OUTCOME_DISABLED === "false"
}
