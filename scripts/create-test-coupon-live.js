import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

async function createTestCoupon() {
  try {
    const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")

    if (isTestMode) {
      console.log("⚠️  You are in TEST MODE")
      console.log("Switch to live mode first before creating the test coupon!")
      return
    }

    console.log("🎟️  Creating 100% off test coupon in LIVE mode...\n")

    const coupon = await stripe.coupons.create({
      id: "LIVE_TEST_100",
      percent_off: 100,
      duration: "once",
      name: "Live Testing - 100% Off",
      redeem_by: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
      max_redemptions: 20,
    })

    console.log("✅ Test coupon created successfully!\n")
    console.log(`Coupon Code: ${coupon.id}`)
    console.log(`Discount: ${coupon.percent_off}% off`)
    console.log(`Max uses: ${coupon.max_redemptions}`)
    console.log(`Valid until: ${new Date(coupon.redeem_by * 1000).toLocaleDateString()}`)
    console.log('\n🧪 Use code "LIVE_TEST_100" to test live payments without charges!')
  } catch (error) {
    if (error.code === "resource_already_exists") {
      console.log('✅ Coupon "LIVE_TEST_100" already exists!')
      console.log("🧪 Use this code to test live payments without charges.")
    } else {
      console.error("❌ Error:", error.message)
    }
  }
}

createTestCoupon()
