export default function StudioLoading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFA] px-5">
      <div role="status" className="text-center">
        <span className="mx-auto block h-7 w-7 animate-spin rounded-full border-2 border-[#C5C6C8] border-t-[#0D0E10] motion-reduce:animate-none" />
        <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[#4F5052]">Opening your Studio…</p>
      </div>
    </main>
  )
}
