export interface WelcomeEmailParams {
  customerName: string
  customerEmail: string
  creditsGranted: number
  packageName: string
  productType?: "one_time_session" | "sselfie_studio_membership" | "credit_topup"
}
