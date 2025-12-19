"use client"

import { useState, useEffect, useRef } from "react"
import { Image, Plus, X } from "lucide-react"
import type { GalleryImage } from "@/lib/data/images"
import { CONCEPT_TEMPLATES, getConceptsForCategory } from "@/lib/maya/concept-templates"

interface StudioProImageUploadModuleProps {
  category?: string
  showCategoryDropdown?: boolean
  onImagesReady: (images: {
    selfies: string[]
    products: string[]
    styleRefs: string[]
    userDescription?: string
    category?: string
    concept?: string
  }) => void
  onCancel?: () => void
  onCategorySelect?: (category: string, prompt: string) => void
  // New props for pre-populating existing data
  initialSelfies?: string[]
  initialProducts?: string[]
  initialStyleRefs?: string[]
  initialCategory?: string
  initialConcept?: string
  initialDescription?: string
}

const CATEGORIES = [
  { value: "brand-content", label: "Brand Content", prompt: "I want Studio Pro outfit photos that feel like Alo Yoga — premium athletic outfits, neutral colors and natural movement." },
  { value: "beauty-self-care", label: "Beauty & Self-Care", prompt: "I want a beauty skincare routine morning glow — dewy skin, natural light, clean girl aesthetic." },
  { value: "selfie-styles", label: "Selfie Styles", prompt: "I want a clean girl selfie aesthetic — mirror selfies, golden hour, natural beauty moments." },
  { value: "travel-lifestyle", label: "Travel & Lifestyle", prompt: "I want an airport it girl travel photo — lounge or gate setting with suitcase, headphones and coffee." },
  { value: "tech-work", label: "Tech & Work", prompt: "I want tech home office productivity content — modern workspace, laptop, coffee, professional vibes." },
  { value: "fashion-editorial", label: "Fashion Editorial", prompt: "I want luxury fashion editorial photos in Chanel style — sophisticated, elegant, timeless aesthetic." },
  { value: "wellness-content", label: "Wellness Content", prompt: "I want Studio Pro wellness content in Alo Yoga style — yoga, stretching and calm movement in soft neutral environments." },
  { value: "seasonal-holiday", label: "Seasonal Holiday", prompt: "I want Christmas holiday cozy vibes — warm lighting, festive atmosphere, elegant winter aesthetic." },
  { value: "luxury-travel", label: "Luxury Travel", prompt: "I want luxury destination travel photos — Venice canals, Thailand beaches, sophisticated travel moments." },
  { value: "carousels-reels", label: "Carousels & Reels", prompt: "I want a Pinterest-style Instagram carousel, modern and minimal, that feels ready for Studio Pro." },
]

export default function StudioProImageUploadModule({
  category = "",
  showCategoryDropdown = false,
  onImagesReady,
  onCancel,
  onCategorySelect,
  initialSelfies = [],
  initialProducts = [],
  initialStyleRefs = [],
  initialCategory = "",
  initialConcept = "",
  initialDescription = "",
}: StudioProImageUploadModuleProps) {
  const [selfies, setSelfies] = useState<string[]>(initialSelfies)
  const [products, setProducts] = useState<string[]>(initialProducts)
  const [styleRefs, setStyleRefs] = useState<string[]>(initialStyleRefs)
  const [selectedCategory, setSelectedCategory] = useState<string>(category || initialCategory || "")
  const [selectedConcept, setSelectedConcept] = useState<string>(initialConcept || "")
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([])
  const [showGalleryModal, setShowGalleryModal] = useState(false)
  const [gallerySection, setGallerySection] = useState<"selfies" | "products" | "styleRefs" | null>(null)
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<Set<string>>(new Set())
  const [isUploading, setIsUploading] = useState(false)
  const [userDescription, setUserDescription] = useState(initialDescription || "")
  const totalImages = selfies.length + products.length + styleRefs.length
  
  // Track previous prop values to detect changes (only initialize once)
  const prevPropsRef = useRef<{
    initialSelfies: string[]
    initialProducts: string[]
    initialStyleRefs: string[]
    category: string
    initialCategory: string
    initialConcept: string
    initialDescription: string
  } | null>(null)
  
  // Initialize ref on first render
  if (prevPropsRef.current === null) {
    prevPropsRef.current = {
      initialSelfies: initialSelfies,
      initialProducts: initialProducts,
      initialStyleRefs: initialStyleRefs,
      category: category,
      initialCategory: initialCategory,
      initialConcept: initialConcept,
      initialDescription: initialDescription,
    }
  }
  
  // Sync state with props when they change (important for re-opening the module with existing data)
  // This ensures that when the module is reopened, it shows the previously uploaded images and selections
  useEffect(() => {
    if (!prevPropsRef.current) return
    
    const prev = prevPropsRef.current
    
    // Check if images actually changed (using deep comparison)
    const selfiesChanged = JSON.stringify(initialSelfies) !== JSON.stringify(prev.initialSelfies)
    const productsChanged = JSON.stringify(initialProducts) !== JSON.stringify(prev.initialProducts)
    const styleRefsChanged = JSON.stringify(initialStyleRefs) !== JSON.stringify(prev.initialStyleRefs)
    
    if (selfiesChanged) {
      console.log("[UPLOAD-MODULE] Syncing selfies:", initialSelfies.length, "images")
      setSelfies(initialSelfies)
      prev.initialSelfies = [...initialSelfies] // Store copy
    }
    if (productsChanged) {
      console.log("[UPLOAD-MODULE] Syncing products:", initialProducts.length, "images")
      setProducts(initialProducts)
      prev.initialProducts = [...initialProducts] // Store copy
    }
    if (styleRefsChanged) {
      console.log("[UPLOAD-MODULE] Syncing styleRefs:", initialStyleRefs.length, "images")
      setStyleRefs(initialStyleRefs)
      prev.initialStyleRefs = [...initialStyleRefs] // Store copy
    }
  }, [initialSelfies, initialProducts, initialStyleRefs])
  
  useEffect(() => {
    if (!prevPropsRef.current) return
    
    // Sync category - prefer category prop, then initialCategory
    const prev = prevPropsRef.current
    const newCategory = category || initialCategory || ""
    const prevCategory = prev.category || prev.initialCategory || ""
    
    if (newCategory && newCategory !== prevCategory) {
      console.log("[UPLOAD-MODULE] Syncing category:", newCategory)
      setSelectedCategory(newCategory)
      prev.category = category
      prev.initialCategory = initialCategory
    }
  }, [category, initialCategory])
  
  useEffect(() => {
    if (!prevPropsRef.current) return
    
    // Sync concept when it changes
    const prev = prevPropsRef.current
    if (initialConcept && initialConcept !== prev.initialConcept) {
      console.log("[UPLOAD-MODULE] Syncing concept:", initialConcept)
      setSelectedConcept(initialConcept)
      prev.initialConcept = initialConcept
    }
  }, [initialConcept])
  
  useEffect(() => {
    if (!prevPropsRef.current) return
    
    // Sync description when it changes
    const prev = prevPropsRef.current
    if (initialDescription !== undefined && initialDescription !== prev.initialDescription) {
      console.log("[UPLOAD-MODULE] Syncing description:", initialDescription.substring(0, 50))
      setUserDescription(initialDescription)
      prev.initialDescription = initialDescription
    }
  }, [initialDescription])
  
  // Get available concepts for selected category
  const availableConcepts = selectedCategory ? getConceptsForCategory(selectedCategory) : []

  // Load gallery images
  useEffect(() => {
    loadGalleryImages()
  }, [])

  const loadGalleryImages = async () => {
    try {
      const response = await fetch("/api/gallery/images", {
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        setGalleryImages(data.images || [])
      }
    } catch (error) {
      console.error("[IMAGE-UPLOAD] Failed to load gallery:", error)
    }
  }

  const handleUploadClick = (section: "selfies" | "products" | "styleRefs") => {
    if (totalImages >= 14) {
      alert("Maximum 14 images allowed total")
      return
    }
    setGallerySection(section)
    // Pre-select already selected images for this section
    const currentSectionImages = section === "selfies" ? selfies : section === "products" ? products : styleRefs
    setSelectedGalleryImages(new Set(currentSectionImages))
    setShowGalleryModal(true)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, section: "selfies" | "products" | "styleRefs") => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (totalImages + files.length > 14) {
      alert(`Maximum 14 images allowed. You can add ${14 - totalImages} more.`)
      return
    }

    setIsUploading(true)

    try {
      const uploadPromises = files.map(async (file) => {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error("Image must be smaller than 10MB")
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload image")
        }

        const { url } = await response.json()
        return url
      })

      const urls = await Promise.all(uploadPromises)

      if (section === "selfies") {
        setSelfies((prev) => [...prev, ...urls])
      } else if (section === "products") {
        setProducts((prev) => [...prev, ...urls])
      } else {
        setStyleRefs((prev) => [...prev, ...urls])
      }
    } catch (error) {
      console.error("[IMAGE-UPLOAD] Error uploading:", error)
      alert(error instanceof Error ? error.message : "Failed to upload images")
    } finally {
      setIsUploading(false)
    }
  }

  const handleGalleryToggle = (imageUrl: string) => {
    if (!gallerySection) return
    
    const currentSectionImages = gallerySection === "selfies" ? selfies : gallerySection === "products" ? products : styleRefs
    const currentCount = currentSectionImages.length
    const isCurrentlySelected = selectedGalleryImages.has(imageUrl)
    
    // Calculate how many new images would be added
    const newSelectedCount = isCurrentlySelected 
      ? selectedGalleryImages.size - 1 
      : selectedGalleryImages.size + 1
    const newTotalCount = totalImages - currentCount + newSelectedCount
    
    if (newTotalCount > 14) {
      alert(`Maximum 14 images allowed total. You can add ${14 - totalImages} more.`)
      return
    }
    
    // Toggle selection in modal
    setSelectedGalleryImages(prev => {
      const next = new Set(prev)
      if (isCurrentlySelected) {
        next.delete(imageUrl)
      } else {
        next.add(imageUrl)
      }
      return next
    })
  }
  
  const handleGalleryConfirm = () => {
    if (!gallerySection) return
    
    const selectedUrls = Array.from(selectedGalleryImages)
    const currentSectionImages = gallerySection === "selfies" ? selfies : gallerySection === "products" ? products : styleRefs
    
    // Add only new images (not already in the section)
    const newImages = selectedUrls.filter(url => !currentSectionImages.includes(url))
    
    if (gallerySection === "selfies") {
      setSelfies((prev) => [...prev, ...newImages])
    } else if (gallerySection === "products") {
      setProducts((prev) => [...prev, ...newImages])
    } else {
      setStyleRefs((prev) => [...prev, ...newImages])
    }
    
    setShowGalleryModal(false)
    setGallerySection(null)
    setSelectedGalleryImages(new Set())
  }

  const handleRemoveImage = (url: string, section: "selfies" | "products" | "styleRefs") => {
    if (section === "selfies") {
      setSelfies((prev) => prev.filter((u) => u !== url))
    } else if (section === "products") {
      setProducts((prev) => prev.filter((u) => u !== url))
    } else {
      setStyleRefs((prev) => prev.filter((u) => u !== url))
    }
  }

  const handleCreate = () => {
    if (selfies.length === 0) {
      alert("Please add at least one photo of yourself")
      return
    }
    
    if (showCategoryDropdown && !selectedCategory) {
      alert("Please select a category")
      return
    }

    onImagesReady({
      selfies,
      products,
      styleRefs,
      category: selectedCategory || category,
      concept: selectedConcept || undefined,
      userDescription: userDescription.trim() || undefined,
    })
  }

  // Get category-specific suggestions
  const getCategorySuggestions = () => {
    const cat = category.toLowerCase()
    if (cat.includes("travel") || cat.includes("airport")) {
      return {
        selfies: "3-4 photos of yourself (travel outfits, casual airport looks)",
        products: "Luggage, travel accessories, headphones, coffee cups",
        styleRefs: "Airport lounges, travel destinations, it-girl travel aesthetic",
      }
    }
    if (cat.includes("beauty") || cat.includes("skincare") || cat.includes("self-care")) {
      return {
        selfies: "3-4 photos of yourself (natural, minimal makeup looks)",
        products: "Skincare products, makeup, beauty tools",
        styleRefs: "Clean girl aesthetic, beauty routines, minimal styling",
      }
    }
    if (cat.includes("brand") || cat.includes("alo") || cat.includes("wellness")) {
      return {
        selfies: "3-4 photos of yourself (athletic, active lifestyle)",
        products: "Athletic wear, sports equipment, wellness products",
        styleRefs: "Brand aesthetic, workout settings, wellness environments",
      }
    }
    if (cat.includes("fashion") || cat.includes("editorial") || cat.includes("luxury")) {
      return {
        selfies: "3-4 photos of yourself (fashion-forward, styled looks)",
        products: "Designer items, accessories, luxury products",
        styleRefs: "Editorial style, luxury settings, fashion aesthetics",
      }
    }
    if (cat.includes("tech") || cat.includes("work")) {
      return {
        selfies: "3-4 photos of yourself (professional, casual work looks)",
        products: "Tech products, laptops, work accessories",
        styleRefs: "Home office, coffee shops, modern workspaces",
      }
    }
    // Default
    return {
      selfies: "3-4 photos of yourself",
      products: "Products you want featured",
      styleRefs: "Style inspiration and references",
    }
  }

  const suggestions = getCategorySuggestions()

  return (
    <>
      <div className="bg-white border border-stone-200/60 rounded-lg p-6 space-y-6 mt-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-serif font-light tracking-[0.15em] uppercase text-stone-900 mb-1">
              {totalImages > 0 ? "Update Your Images" : "Add Your Images"}
            </h3>
            <p className="text-xs text-stone-500 font-light">
              {totalImages > 0 
                ? "Update your images, category, or concept below. Changes will apply to new concept generations."
                : "Upload images below. I'll analyze them to create perfect concepts for you."}
            </p>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} />
            </button>
          )}
        </div>
        
        {/* Category Dropdown and Quick Prompts - Show when showCategoryDropdown is true */}
        {showCategoryDropdown && (
          <div className="space-y-4 border-t border-stone-200/60 pt-4">
            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="text-xs tracking-[0.2em] uppercase text-stone-500 font-light">
                Choose a Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  const selectedCat = CATEGORIES.find(c => c.value === e.target.value)
                  if (selectedCat) {
                    setSelectedCategory(selectedCat.value)
                    setSelectedConcept("") // Reset concept when category changes
                    if (onCategorySelect) {
                      onCategorySelect(selectedCat.value, selectedCat.prompt)
                    }
                  }
                }}
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-sm font-light text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 transition-all appearance-none cursor-pointer"
              >
                <option value="">Select a category...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Concept Dropdown - Show after category is selected */}
            {selectedCategory && availableConcepts.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs tracking-[0.2em] uppercase text-stone-500 font-light">
                  Choose a Concept
                </label>
                <select
                  value={selectedConcept}
                  onChange={(e) => {
                    setSelectedConcept(e.target.value)
                  }}
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-lg text-sm font-light text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 transition-all appearance-none cursor-pointer"
                >
                  <option value="">Select a concept...</option>
                  {availableConcepts.map((concept) => (
                    <option key={concept.value} value={concept.value}>
                      {concept.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Your Photos Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-stone-900 mb-0.5">Your Photos</p>
              <p className="text-[10px] text-stone-500 font-light">{suggestions.selfies}</p>
            </div>
            <span className="text-[10px] text-stone-500 font-light">
              {selfies.length} / 4
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUploadClick("selfies")}
              className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-light"
            >
              From Gallery
            </button>
            <button
              onClick={() => {
                if (totalImages >= 14) {
                  alert("Maximum 14 images allowed total")
                  return
                }
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"
                input.multiple = true
                input.onchange = (e) => handleFileSelect(e as any, "selfies")
                input.click()
              }}
              disabled={isUploading || totalImages >= 14}
              className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {selfies.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selfies.map((url, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img
                    src={url}
                    alt={`Selfie ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-stone-200"
                  />
                  <button
                    onClick={() => handleRemoveImage(url, "selfies")}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-stone-700 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="space-y-3 border-t border-stone-200/60 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-stone-900 mb-0.5">Products (Optional)</p>
              <p className="text-[10px] text-stone-500 font-light">{suggestions.products}</p>
            </div>
            <span className="text-[10px] text-stone-500 font-light">
              {products.length} added
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUploadClick("products")}
              className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-light"
            >
              From Gallery
            </button>
            <button
              onClick={() => {
                if (totalImages >= 14) {
                  alert("Maximum 14 images allowed total")
                  return
                }
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"
                input.multiple = true
                input.onchange = (e) => handleFileSelect(e as any, "products")
                input.click()
              }}
              disabled={isUploading || totalImages >= 14}
              className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {products.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {products.map((url, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img
                    src={url}
                    alt={`Product ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-stone-200"
                  />
                  <button
                    onClick={() => handleRemoveImage(url, "products")}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-stone-700 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Style References Section */}
        <div className="space-y-3 border-t border-stone-200/60 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-light text-stone-900 mb-0.5">Style References (Optional)</p>
              <p className="text-[10px] text-stone-500 font-light">{suggestions.styleRefs}</p>
            </div>
            <span className="text-[10px] text-stone-500 font-light">
              {styleRefs.length} added
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUploadClick("styleRefs")}
              className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-light"
            >
              From Gallery
            </button>
            <button
              onClick={() => {
                if (totalImages >= 14) {
                  alert("Maximum 14 images allowed total")
                  return
                }
                const input = document.createElement("input")
                input.type = "file"
                input.accept = "image/*"
                input.multiple = true
                input.onchange = (e) => handleFileSelect(e as any, "styleRefs")
                input.click()
              }}
              disabled={isUploading || totalImages >= 14}
              className="px-3 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs font-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          {styleRefs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {styleRefs.map((url, idx) => (
                <div key={idx} className="relative shrink-0">
                  <img
                    src={url}
                    alt={`Style ref ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-stone-200"
                  />
                  <button
                    onClick={() => handleRemoveImage(url, "styleRefs")}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-stone-700 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Description Input - Inline */}
        <div className="space-y-2 border-t border-stone-200/60 pt-4">
          <label className="text-xs font-light text-stone-900 mb-0.5">
            Additional Context (Optional)
          </label>
          <textarea
            value={userDescription}
            onChange={(e) => setUserDescription(e.target.value)}
            placeholder="e.g., 'Focus on the cream sweater from image 2', 'Match the lighting from the first photo', 'I want the Alo brand outfit to be clearly visible'"
            className="w-full h-24 px-4 py-3 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-400 focus:border-stone-400 resize-none text-sm font-light text-stone-900"
          />
          <p className="text-[10px] text-stone-500 font-light">
            Optional — leave blank to let Maya analyze and create automatically
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-stone-200/60">
          <button
            onClick={handleCreate}
            disabled={selfies.length === 0 || isUploading || (showCategoryDropdown && !selectedCategory)}
            className="w-full px-6 py-3 bg-stone-900 text-white text-xs font-light tracking-[0.2em] uppercase rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Create Concepts"}
          </button>
        </div>

        {totalImages > 0 && (
          <p className="text-[10px] text-stone-500 font-light text-center">
            {totalImages} / 14 images • {selfies.length === 0 ? "Add at least one photo of yourself to continue" : "Ready to create"}
          </p>
        )}
      </div>


      {/* Gallery Modal */}
      {showGalleryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Select from Gallery</h3>
                <p className="text-xs text-stone-600 mt-1">
                  {selectedGalleryImages.size} selected • {totalImages} / 14 total • Click images to select multiple
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGalleryModal(false)
                  setGallerySection(null)
                  setSelectedGalleryImages(new Set())
                }}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {galleryImages.map((image) => {
                  const isSelected = selectedGalleryImages.has(image.image_url)
                  const currentSectionImages = gallerySection === "selfies" ? selfies : gallerySection === "products" ? products : styleRefs
                  const isAlreadyAdded = currentSectionImages.includes(image.image_url)
                  
                  // Calculate if we can select this image
                  // If already selected, we can always deselect it
                  // If not selected, check if adding it would exceed the limit
                  const currentCount = currentSectionImages.length
                  let canSelect: boolean
                  if (isSelected) {
                    // Can always deselect a selected image
                    canSelect = true
                  } else {
                    // Check if adding this image would exceed 14 total
                    const wouldAddCount = selectedGalleryImages.size + 1
                    const newTotalCount = totalImages - currentCount + wouldAddCount
                    canSelect = newTotalCount <= 14 && !isAlreadyAdded
                  }

                  return (
                    <button
                      key={image.id}
                      onClick={() => {
                        // Always allow toggle if image is selected (to deselect) or if canSelect is true
                        if (isSelected || canSelect) {
                          handleGalleryToggle(image.image_url)
                        }
                      }}
                      disabled={!isSelected && !canSelect}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-stone-900 ring-2 ring-stone-400"
                          : isAlreadyAdded
                          ? "border-stone-200 opacity-50 cursor-not-allowed"
                          : !canSelect
                          ? "border-stone-200 opacity-30 cursor-not-allowed"
                          : "border-stone-200 hover:border-stone-400"
                      }`}
                    >
                      <img
                        src={image.image_url}
                        alt="Gallery image"
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xs text-stone-900 font-bold">✓</span>
                          </div>
                        </div>
                      )}
                      {isAlreadyAdded && (
                        <div className="absolute inset-0 bg-stone-200/60 flex items-center justify-center">
                          <span className="text-xs text-stone-600 font-light">Added</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-stone-200 flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  setShowGalleryModal(false)
                  setGallerySection(null)
                  setSelectedGalleryImages(new Set())
                }}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-light tracking-wide rounded-lg hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGalleryConfirm}
                disabled={selectedGalleryImages.size === 0}
                className="px-6 py-2 bg-stone-900 text-white text-xs font-light tracking-wide rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {selectedGalleryImages.size > 0 ? `${selectedGalleryImages.size} ` : ''}Image{selectedGalleryImages.size !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

