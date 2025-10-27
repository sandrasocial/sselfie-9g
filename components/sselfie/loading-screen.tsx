export default function LoadingScreen() {
  return (
    <div className="h-screen bg-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-stone-100/40 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-1/4 right-1/3 w-64 sm:w-96 h-64 sm:h-96 bg-stone-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="relative z-10 text-center px-6 sm:px-8">
        <div className="mb-12 sm:mb-16 relative w-32 h-32 sm:w-40 sm:h-40 mx-auto">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-transparent border-t-stone-950 animate-spin"
              style={{ animationDuration: "2s" }}
            ></div>
          </div>

          {/* Inner spinning ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-transparent border-b-stone-400 animate-spin"
              style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
            ></div>
          </div>

          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center p-2 sm:p-2.5">
              <img src="/icon-192.png" alt="SSELFIE Logo" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <h1 className="text-stone-950 text-4xl sm:text-5xl md:text-6xl font-serif font-extralight tracking-[0.5em] leading-none mb-2">
            SSELFIE
          </h1>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <div className="w-1 h-1 bg-stone-950 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-stone-950 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-1 h-1 bg-stone-950 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
          <p className="text-[10px] sm:text-xs font-light tracking-[0.35em] uppercase text-stone-500 mt-3 sm:mt-4">
            Luxury AI Photography
          </p>
        </div>
      </div>
    </div>
  )
}
