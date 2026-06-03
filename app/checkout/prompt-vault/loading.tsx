export default function PromptVaultCheckoutLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFA] px-6 py-16 text-[#0D0E10]">
      <div className="max-w-md text-center">
        <p className="mb-5 text-[10px] font-medium uppercase tracking-[0.34em] text-[#818283]">
          Secure checkout
        </p>
        <h1 className="font-['Cormorant_Garamond'] text-3xl font-light leading-tight text-[#0D0E10] sm:text-4xl">
          Preparing your Vault checkout.
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-sm font-light leading-relaxed text-[#4F5052]">
          We are opening your secure Stripe payment page. This usually takes just a moment.
        </p>
      </div>
    </main>
  )
}
