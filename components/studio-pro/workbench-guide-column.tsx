"use client"

interface WorkbenchGuideColumnProps {
  slideCount?: number
}

export default function WorkbenchGuideColumn({ slideCount = 5 }: WorkbenchGuideColumnProps) {
  return (
    <div className="w-full sm:w-80 flex-shrink-0 bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/60">
      <div className="space-y-6">
        {/* Maya Avatar/Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-stone-950 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">M</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-stone-950 mb-1">Maya</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Here's how to create your {slideCount}-slide carousel:
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center mt-0.5">
                1
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-stone-950 mb-1">Customize Each Prompt</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Go over each prompt, customize it like you want (add or remove sections)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center mt-0.5">
                2
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-stone-950 mb-1">Add Your Images</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Add images of yourself using your gallery, or upload new selfies. Add products or go to Pinterest (add the URL) and find an outfit, mood, or style you like - add that image in box 3 and so on.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center mt-0.5">
                3
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-stone-950 mb-1">Generate Each Slide</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Click "Generate" under each prompt box to create that slide. Work through them in order (Slide 1, then Slide 2, etc.)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center mt-0.5">
                4
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium text-stone-950 mb-1">Use Generated Images</p>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Once a slide is generated, you can use it in the next slide's image boxes for consistency
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-white/60 border border-stone-200/40 rounded-xl p-4">
          <p className="text-xs font-medium text-stone-950 mb-1">💡 Pro Tip</p>
          <p className="text-xs text-stone-600 leading-relaxed">
            Keep your images consistent across slides by using the same base images in each prompt box
          </p>
        </div>
      </div>
    </div>
  )
}


