export default function UnifiedLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-6">
        {/* Logo with spinning circle */}
        <div className="relative w-24 h-24 mx-auto">
          {/* Spinning circle */}
          <div className="absolute inset-0 border-2 border-stone-200 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-stone-900 border-t-transparent rounded-full animate-spin"></div>

          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <img src="/icon-192.png" alt="SSELFIE" className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Loading text */}
        <p className="text-sm tracking-[0.15em] uppercase font-light text-stone-600">{message}</p>
      </div>
    </div>
  )
}
