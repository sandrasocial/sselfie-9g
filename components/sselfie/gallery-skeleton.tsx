import { Skeleton } from "@/components/ui/skeleton"

export function GalleryGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="w-full h-full rounded-none" />
        </div>
      ))}
    </div>
  )
}

export function GalleryAllViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/50 backdrop-blur-2xl border border-white/60 rounded-xl sm:rounded-[1.5rem] p-3 sm:p-4 min-h-[100px] sm:min-h-[120px]"
          >
            <Skeleton className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-[1rem] mx-auto mb-2 sm:mb-3" />
            <Skeleton className="h-6 sm:h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square">
            <Skeleton className="w-full h-full rounded-xl sm:rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function GalleryInstagramSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Profile section skeleton */}
      <div className="bg-stone-100/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-stone-200/40">
        <div className="flex items-center gap-4 sm:gap-6 mb-4 sm:mb-6">
          <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
            <Skeleton className="h-3 w-48 sm:w-56" />
          </div>
        </div>

        {/* Filter buttons skeleton */}
        <div className="flex gap-2 mb-4 pb-4 border-b border-stone-200/40">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 sm:h-10 w-24 sm:w-28 rounded-full" />
          ))}
        </div>

        {/* Category buttons skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 sm:h-10 w-20 sm:w-24 rounded-full flex-shrink-0" />
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <GalleryGridSkeleton />
    </div>
  )
}
