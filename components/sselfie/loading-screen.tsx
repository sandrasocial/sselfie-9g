export default function LoadingScreen() {
  return (
    <div className="h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.1),transparent_48%),radial-gradient(circle_at_78%_82%,rgba(201,176,145,0.22),transparent_52%),linear-gradient(145deg,#0a0a0a_0%,#121212_45%,#111111_100%)]" />
        <div className="absolute top-1/4 left-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-[#d8c2a7]/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-white/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 text-center px-6 sm:px-8">
        <div className="mb-12 sm:mb-16 relative w-32 h-32 sm:w-40 sm:h-40 mx-auto">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-transparent border-t-white animate-spin"
              style={{ animationDuration: "2s" }}
            ></div>
          </div>

          {/* Inner spinning ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-transparent border-b-[#d8c2a7] animate-spin"
              style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
            ></div>
          </div>

          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2 sm:p-2.5">
              <img src="/brand/sselfie-logo-white-transparent.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-white text-4xl sm:text-5xl md:text-6xl font-serif font-extralight tracking-[0.5em] leading-none mb-2">
            SSELFIE
          </h1>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
          <p className="text-[10px] sm:text-xs font-light tracking-[0.35em] uppercase text-[#d8c2a7] mt-3 sm:mt-4">
            Luxury AI Photography
          </p>
        </div>
      </div>
    </div>
  )
}
