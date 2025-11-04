import { Skeleton } from "@/components/ui/skeleton"

export function StudioHeroSkeleton() {
  return (
    <div className="relative h-[30vh] sm:h-[35vh] md:h-[40vh] overflow-hidden -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6 bg-stone-100 animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-3 w-32 mx-auto bg-stone-200" />
          <Skeleton className="h-16 sm:h-20 md:h-24 w-48 sm:w-64 md:w-80 mx-auto bg-stone-200" />
          <Skeleton className="h-4 w-40 mx-auto bg-stone-200" />
        </div>
      </div>
    </div>
  )
}

export function StudioBrandProfileSkeleton() {
  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5 animate-pulse">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1 space-y-4 w-full">
          <Skeleton className="h-8 w-64 bg-stone-200" />
          <Skeleton className="h-4 w-full max-w-md bg-stone-200" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-2 flex-1 bg-stone-200 rounded-full" />
            <Skeleton className="h-4 w-12 bg-stone-200" />
          </div>
        </div>
        <Skeleton className="h-12 w-40 bg-stone-200 rounded-xl" />
      </div>
    </div>
  )
}

export function StudioGenerationsSkeleton() {
  return (
    <div className="relative bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-stone-900/5 animate-pulse">
      <Skeleton className="h-[300px] sm:h-[400px] bg-stone-200" />
      <div className="p-6 sm:p-8 space-y-6">
        <Skeleton className="h-4 w-full bg-stone-200" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square bg-stone-200 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-12 bg-stone-200 rounded-xl" />
          <Skeleton className="h-12 bg-stone-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function StudioStatsSkeleton() {
  return (
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5 animate-pulse">
      <Skeleton className="h-8 w-64 mb-6 bg-stone-200" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-10 w-20 bg-stone-200" />
            <Skeleton className="h-3 w-full bg-stone-200" />
          </div>
        ))}
      </div>
      <Skeleton className="h-4 w-full max-w-md mt-6 bg-stone-200" />
    </div>
  )
}

export function StudioActivitySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 bg-stone-200" />
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-5 border-b border-white/40 last:border-b-0 px-6 -mx-6"
          >
            <div className="flex items-center gap-4 flex-1">
              <Skeleton className="w-1.5 h-1.5 rounded-full bg-stone-200" />
              <Skeleton className="h-4 w-48 bg-stone-200" />
            </div>
            <Skeleton className="h-3 w-16 bg-stone-200" />
          </div>
        ))}
      </div>
    </div>
  )
}
