"use client"
import { Aperture, ChevronRight, Plus, Grid, Camera } from "lucide-react"
import useSWR from "swr"
import Image from "next/image"

interface StudioScreenProps {
  user: any
  hasTrainedModel: boolean
  setActiveTab: (tab: string) => void
  onImageGenerated: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function StudioScreen({ user, hasTrainedModel, setActiveTab, onImageGenerated }: StudioScreenProps) {
  const { data: stats } = useSWR(hasTrainedModel ? "/api/studio/stats" : null, fetcher, {
    refreshInterval: 30000,
  })

  const { data: generationsData } = useSWR(hasTrainedModel ? "/api/studio/generations?limit=3" : null, fetcher, {
    refreshInterval: 30000,
  })

  const { data: sessionData } = useSWR(hasTrainedModel ? "/api/studio/session" : null, fetcher, {
    refreshInterval: 10000,
  })

  const { data: sessionsData } = useSWR(hasTrainedModel ? "/api/studio/sessions" : null, fetcher, {
    refreshInterval: 60000, // Refresh every minute
  })

  if (!hasTrainedModel) {
    return (
      <div className="space-y-6 sm:space-y-8 pb-4 overflow-x-hidden max-w-full">
        <div className="pt-4 sm:pt-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extralight tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase leading-none mb-2 sm:mb-3 px-4">
            Welcome to Studio
          </h1>
          <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-stone-400">
            Start Here
          </p>
        </div>

        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center shadow-xl shadow-stone-900/5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/70 backdrop-blur-2xl rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-white/80 shadow-lg shadow-stone-900/5">
            <Aperture size={28} className="sm:w-8 sm:h-8" strokeWidth={1.5} />
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-3 sm:mb-4 px-4">
            Train Your AI First
          </h2>

          <p className="text-sm sm:text-base font-light text-stone-500 mb-6 sm:mb-8 max-w-md mx-auto leading-relaxed px-4">
            Before you can create stunning photos you need to train your personal AI model with your selfies.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10 max-w-2xl mx-auto">
            {[
              { label: "Accurate", desc: "Photos that look like you" },
              { label: "Fast", desc: "20 minute training" },
              { label: "Professional", desc: "Gallery ready results" },
            ].map((item, i) => (
              <div
                key={i}
                className="p-5 sm:p-6 bg-white/60 backdrop-blur-3xl rounded-xl sm:rounded-2xl border border-white/70 shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-105 transition-all duration-500 group"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-stone-900 rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg shadow-stone-900/20 group-hover:scale-110 transition-transform duration-500">
                  <div className="text-base sm:text-lg font-light text-white">{i + 1}</div>
                </div>
                <div className="text-sm font-light text-stone-900 mb-2">{item.label}</div>
                <div className="text-xs font-light text-stone-500">{item.desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setActiveTab("training")}
            className="group relative bg-stone-900 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-xl sm:rounded-2xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 min-h-[52px] sm:min-h-[60px] overflow-hidden w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Training Now
              <ChevronRight
                size={14}
                strokeWidth={1.5}
                className="group-hover:translate-x-1 transition-transform duration-500"
              />
            </span>
          </button>
        </div>

        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-8 shadow-xl shadow-stone-900/5">
          <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase mb-6 sm:mb-8">
            What You Will Need
          </h3>

          <div className="space-y-4">
            {[
              { title: "10 to 20 Selfie Photos", desc: "Clear well lit photos of yourself" },
              { title: "Good Lighting", desc: "Natural window light works best" },
              { title: "Variety", desc: "Different angles and expressions" },
              { title: "20 Minutes", desc: "Time for AI training to complete" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 bg-white/60 backdrop-blur-2xl rounded-xl sm:rounded-2xl border border-white/70 shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-[1.02] transition-all duration-500"
              >
                <div className="w-8 h-8 bg-white/80 backdrop-blur-xl rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-white/70 shadow-inner shadow-stone-900/5">
                  <div className="w-1.5 h-1.5 bg-stone-600 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-light text-stone-900 mb-1">{item.title}</h4>
                  <p className="text-xs sm:text-sm font-light text-stone-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const hasActiveSession = sessionData?.session
  const hasRecentGenerations = generationsData?.generations && generationsData.generations.length > 0
  const lastGeneratedImage = generationsData?.generations?.[0]?.image_url
  const recentGenerationsCount = generationsData?.generations?.length || 0
  const lastGenerationTime = generationsData?.generations?.[0]?.created_at
    ? (() => {
        const now = new Date()
        const created = new Date(generationsData.generations[0].created_at)
        const diffMs = now.getTime() - created.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffHours < 1) return "Just now"
        if (diffHours < 24) return `${diffHours}h ago`
        return `${diffDays}d ago`
      })()
    : null

  return (
    <div className="space-y-6 sm:space-y-8 pb-8 pt-4 overflow-x-hidden max-w-full">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-extralight tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase leading-none mb-2 sm:mb-3">
          STUDIO
        </h1>
        <p className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase font-light text-stone-400">
          Creative Control Center
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {[
          { label: "Active", value: hasActiveSession ? "1" : "0", desc: "Sessions" },
          { label: "Ready", value: stats?.totalGenerated || "0", desc: "Photos" },
          { label: "Queue", value: "0", desc: "Pending" },
        ].map((item, index) => (
          <div
            key={index}
            className="group relative bg-white/50 backdrop-blur-3xl border border-white/60 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 hover:bg-white/70 hover:border-white/80 transition-all duration-500 min-h-[110px] sm:min-h-[130px] flex flex-col justify-center shadow-xl shadow-stone-900/5 hover:shadow-2xl hover:shadow-stone-900/10 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-stone-900 shadow-lg opacity-60"></div>
            <div className="text-[10px] sm:text-xs tracking-wider uppercase font-light mb-2 sm:mb-3 text-stone-500">
              {item.label}
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-extralight text-stone-900 mb-1 sm:mb-2">
              {item.value}
            </div>
            <div className="text-[10px] sm:text-xs font-light text-stone-400">{item.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-8 shadow-xl shadow-stone-900/5">
        {hasActiveSession ? (
          <>
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1 min-w-0">
                <div className="text-xs tracking-[0.15em] uppercase font-light mb-3 text-stone-400">
                  Current Session
                </div>
                <h3 className="text-2xl font-serif font-extralight tracking-[0.1em] text-stone-900 uppercase">
                  {sessionData.session.session_name || "Photo Session"}
                </h3>
                <p className="text-sm font-light mt-3 text-stone-500">Professional series</p>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <div className="w-2 h-2 bg-stone-900 rounded-full shadow-lg"></div>
                <span className="text-xs tracking-[0.1em] uppercase font-light text-stone-500">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="aspect-[4/3] bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 flex items-center justify-center group hover:bg-white/60 hover:border-white/80 transition-all duration-500 cursor-pointer shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-[1.02] overflow-hidden relative">
                {lastGeneratedImage ? (
                  <>
                    <Image
                      src={lastGeneratedImage || "/placeholder.svg"}
                      alt="Last generated"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-500"></div>
                  </>
                ) : (
                  <Camera
                    size={24}
                    className="text-stone-400 group-hover:text-stone-600 transition-colors duration-500"
                    strokeWidth={1.5}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="tracking-[0.1em] uppercase font-light text-stone-400">Progress</span>
                  <span className="font-light text-stone-500">{sessionData.session.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/60 backdrop-blur-xl rounded-full overflow-hidden border border-white/50">
                  <div
                    className="h-full bg-stone-600 rounded-full shadow-inner transition-all duration-1000 ease-out"
                    style={{ width: `${sessionData.session.progress}%` }}
                  ></div>
                </div>
                <div className="space-y-3 pt-2">
                  {sessionData.session.shots?.map((shot: any) => (
                    <div key={shot.id} className="flex items-center justify-between">
                      <span className="text-xs font-light text-stone-500">{shot.shot_name}</span>
                      <div
                        className={`w-2 h-2 rounded-full shadow-sm ${
                          shot.status === "completed" ? "bg-stone-900" : "bg-stone-300"
                        }`}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : hasRecentGenerations ? (
          <>
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1 min-w-0">
                <div className="text-xs tracking-[0.15em] uppercase font-light mb-3 text-stone-400">
                  Recent Activity
                </div>
                <h3 className="text-2xl font-serif font-extralight tracking-[0.1em] text-stone-900 uppercase">
                  Latest Generations
                </h3>
                <p className="text-sm font-light mt-3 text-stone-500">
                  {recentGenerationsCount} {recentGenerationsCount === 1 ? "photo" : "photos"} generated{" "}
                  {lastGenerationTime}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <div className="w-2 h-2 bg-stone-600 rounded-full shadow-lg"></div>
                <span className="text-xs tracking-[0.1em] uppercase font-light text-stone-500">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="aspect-[4/3] bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 flex items-center justify-center group hover:bg-white/60 hover:border-white/80 transition-all duration-500 cursor-pointer shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-[1.02] overflow-hidden relative">
                {lastGeneratedImage ? (
                  <>
                    <Image
                      src={lastGeneratedImage || "/placeholder.svg"}
                      alt="Last generated"
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-stone-900/0 group-hover:bg-stone-900/10 transition-colors duration-500"></div>
                  </>
                ) : (
                  <Camera
                    size={24}
                    className="text-stone-400 group-hover:text-stone-600 transition-colors duration-500"
                    strokeWidth={1.5}
                  />
                )}
              </div>

              <div className="space-y-6 flex flex-col justify-center">
                <div>
                  <p className="text-sm font-light text-stone-500 mb-6 leading-relaxed">
                    Continue creating stunning AI-generated images with Maya, or browse your gallery
                  </p>
                  <button
                    onClick={() => setActiveTab("maya")}
                    className="group relative bg-stone-900 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 overflow-hidden w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Plus size={16} strokeWidth={1.5} />
                      Create More Photos
                      <ChevronRight
                        size={14}
                        strokeWidth={1.5}
                        className="group-hover:translate-x-1 transition-transform duration-500"
                      />
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab("gallery")}
                    className="group relative bg-white/60 backdrop-blur-3xl border border-white/70 text-stone-900 px-8 sm:px-12 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-light tracking-wider text-sm transition-all duration-500 hover:bg-white/80 hover:border-white/90 hover:shadow-xl hover:shadow-stone-900/10 hover:scale-105 active:scale-95 overflow-hidden w-full sm:w-auto"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Grid size={16} strokeWidth={1.5} />
                      View Gallery
                    </span>
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {generationsData.generations.slice(0, 3).map((gen: any, i: number) => (
                    <div key={gen.id} className="flex items-center justify-between">
                      <span className="text-xs font-light text-stone-500 truncate">
                        {gen.category || `Generation ${i + 1}`}
                      </span>
                      <div className="w-2 h-2 rounded-full bg-stone-900 shadow-sm"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-start mb-8">
              <div className="flex-1 min-w-0">
                <div className="text-xs tracking-[0.15em] uppercase font-light mb-3 text-stone-400">
                  Current Session
                </div>
                <h3 className="text-2xl font-serif font-extralight tracking-[0.1em] text-stone-900 uppercase">
                  No Active Session
                </h3>
                <p className="text-sm font-light mt-3 text-stone-500">Ready to create</p>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                <div className="w-2 h-2 bg-stone-300 rounded-full shadow-sm"></div>
                <span className="text-xs tracking-[0.1em] uppercase font-light text-stone-400">Idle</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="aspect-[4/3] bg-white/40 backdrop-blur-2xl rounded-2xl border border-white/60 flex flex-col items-center justify-center group hover:bg-white/60 hover:border-white/80 transition-all duration-500 shadow-lg shadow-stone-900/5 hover:shadow-xl hover:shadow-stone-900/10 p-8">
                <div className="w-20 h-20 bg-white/70 backdrop-blur-2xl rounded-2xl flex items-center justify-center mb-4 border border-white/80 shadow-lg shadow-stone-900/5 group-hover:scale-110 transition-transform duration-500">
                  <Aperture size={32} className="text-stone-600" strokeWidth={1.5} />
                </div>
                <p className="text-xs tracking-[0.1em] uppercase font-light text-stone-400 text-center">
                  Session Preview
                </p>
              </div>

              <div className="space-y-6 flex flex-col justify-center">
                <div>
                  <p className="text-sm font-light text-stone-500 mb-6 leading-relaxed">
                    Start a new photo session with Maya to create stunning AI-generated images in your style
                  </p>
                  <button
                    onClick={() => setActiveTab("maya")}
                    className="group relative bg-stone-900 text-white px-8 sm:px-12 py-4 sm:py-5 rounded-2xl sm:rounded-3xl font-light tracking-wider text-sm transition-all duration-500 hover:shadow-2xl hover:shadow-stone-900/30 hover:scale-105 active:scale-95 overflow-hidden w-full sm:w-auto"
                  >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <Plus size={16} strokeWidth={1.5} />
                      Start New Session
                      <ChevronRight
                        size={14}
                        strokeWidth={1.5}
                        className="group-hover:translate-x-1 transition-transform duration-500"
                      />
                    </span>
                  </button>
                </div>

                <div className="space-y-3 pt-2">
                  {["Choose your concept", "Select your style", "Generate photos"].map((step, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs font-light text-stone-400">{step}</span>
                      <div className="w-2 h-2 rounded-full bg-stone-300 shadow-sm"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {[
          { icon: Plus, title: "New Session", desc: "Start fresh photo series", action: "maya" },
          { icon: Grid, title: "Browse Gallery", desc: "View completed work", action: "gallery" },
        ].map((action, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(action.action)}
            className="group relative bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-6 text-left hover:bg-white/70 hover:border-white/80 transition-all duration-500 min-h-[130px] flex flex-col justify-between shadow-xl shadow-stone-900/5 hover:shadow-2xl hover:shadow-stone-900/10 hover:scale-[1.02] active:scale-95 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-200/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                <action.icon size={18} className="text-white" strokeWidth={1.5} />
              </div>
              <div className="w-8 h-8 bg-white/70 backdrop-blur-2xl rounded-full flex items-center justify-center group-hover:bg-white/90 transition-all duration-500 border border-white/50">
                <ChevronRight
                  size={14}
                  className="text-stone-500 group-hover:translate-x-0.5 transition-transform duration-500"
                  strokeWidth={1.5}
                />
              </div>
            </div>
            <div className="relative z-10">
              <h4 className="text-base font-light text-stone-900 mb-2">{action.title}</h4>
              <p className="text-xs font-light text-stone-500">{action.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {hasRecentGenerations ? (
        <div className="space-y-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase">
            Recent Activity
          </h3>
          <div className="space-y-1">
            {generationsData.generations.map((gen: any) => {
              const timeAgo = gen.created_at
                ? (() => {
                    const now = new Date()
                    const created = new Date(gen.created_at)
                    const diffMs = now.getTime() - created.getTime()
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                    if (diffHours < 24) return `${diffHours}h ago`
                    return `${diffDays}d ago`
                  })()
                : "Recently"

              return (
                <div
                  key={gen.id}
                  className="flex items-center justify-between py-5 border-b border-white/40 last:border-b-0 hover:bg-white/30 transition-colors duration-500 px-6 -mx-6 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-1.5 h-1.5 bg-stone-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm font-light text-stone-900 truncate">
                      {gen.category ? `${gen.category} session completed` : "New session started"}
                    </span>
                  </div>
                  <span className="text-xs tracking-[0.1em] uppercase font-light text-stone-400 ml-4 flex-shrink-0">
                    {timeAgo}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-3xl p-8 text-center shadow-xl shadow-stone-900/5">
          <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase mb-3">
            No Recent Activity
          </h3>
          <p className="text-sm font-light text-stone-500">Your recent photo generations will appear here</p>
        </div>
      )}

      {sessionsData?.sessions && sessionsData.sessions.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg sm:text-xl md:text-2xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.3em] text-stone-900 uppercase">
            Session History
          </h3>
          <div className="grid gap-4">
            {sessionsData.sessions.map((session: any) => {
              const timeAgo = session.created_at
                ? (() => {
                    const now = new Date()
                    const created = new Date(session.created_at)
                    const diffMs = now.getTime() - created.getTime()
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                    if (diffHours < 24) return `${diffHours}h ago`
                    return `${diffDays}d ago`
                  })()
                : "Recently"

              return (
                <div
                  key={session.id}
                  className="group bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl p-6 hover:bg-white/70 hover:border-white/80 transition-all duration-500 shadow-xl shadow-stone-900/5 hover:shadow-2xl hover:shadow-stone-900/10 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-light text-stone-900 mb-1 truncate">
                        {session.session_name || "Photo Session"}
                      </h4>
                      <p className="text-xs font-light text-stone-500">{session.image_count} photos generated</p>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-light ${
                        session.status === "completed"
                          ? "bg-stone-900 text-white"
                          : session.status === "active"
                            ? "bg-white/80 text-stone-900 border border-stone-200"
                            : "bg-stone-200 text-stone-600"
                      }`}
                    >
                      {session.status}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="tracking-[0.1em] uppercase font-light text-stone-400">Created {timeAgo}</span>
                    <ChevronRight
                      size={14}
                      className="text-stone-400 group-hover:translate-x-1 transition-transform duration-500"
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
