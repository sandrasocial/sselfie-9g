"use client"

import Link from "next/link"

import { useState, useEffect, useRef } from "react"
import { motion, useInView } from "framer-motion"
import MayaStylesCarousel from "./maya-styles-carousel"

export default function InteractivePipelineShowcase() {
  const [activeStep, setActiveStep] = useState(0)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [trainingProgress, setTrainingProgress] = useState(0)
  const [showConceptCard, setShowConceptCard] = useState(false)
  const [showGeneratedImage, setShowGeneratedImage] = useState(false)
  const [feedPosts, setFeedPosts] = useState<number[]>([])
  const [showInstagramModal, setShowInstagramModal] = useState(false)

  const containerRef = useRef(null)
  const step1Ref = useRef(null)
  const step2Ref = useRef(null)
  const step3Ref = useRef(null)
  const step4Ref = useRef(null)
  const step5Ref = useRef(null)

  const step1InView = useInView(step1Ref, { once: false, amount: 0.3 })
  const step2InView = useInView(step2Ref, { once: false, amount: 0.3 })
  const step3InView = useInView(step3Ref, { once: false, amount: 0.3 })
  const step4InView = useInView(step4Ref, { once: false, amount: 0.3 })
  const step5InView = useInView(step5Ref, { once: false, amount: 0.3 })

  // Update active step based on which section is in view
  useEffect(() => {
    if (step5InView) setActiveStep(4)
    else if (step4InView) setActiveStep(3)
    else if (step3InView) setActiveStep(2)
    else if (step2InView) setActiveStep(1)
    else if (step1InView) setActiveStep(0)
  }, [step1InView, step2InView, step3InView, step4InView, step5InView])

  // Step 1: Training animation
  useEffect(() => {
    if (step1InView) {
      // Simulate upload progress
      const uploadInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(uploadInterval)
            // Start training progress
            const trainingInterval = setInterval(() => {
              setTrainingProgress((prev) => {
                if (prev >= 100) {
                  clearInterval(trainingInterval)
                  return 100
                }
                return prev + 2
              })
            }, 100)
            return 100
          }
          return prev + 10
        })
      }, 200)
      return () => clearInterval(uploadInterval)
    }
  }, [step1InView])

  // Step 2: Maya chat animation
  useEffect(() => {
    if (step2InView) {
      setTimeout(() => setShowConceptCard(true), 1500)
    }
  }, [step2InView])

  // Step 3: Image generation animation
  useEffect(() => {
    if (step3InView && showConceptCard) {
      setTimeout(() => setShowGeneratedImage(true), 2000)
    }
  }, [step3InView, showConceptCard])

  // Step 4: Feed grid animation
  useEffect(() => {
    if (step4InView) {
      setFeedPosts([])
      const interval = setInterval(() => {
        setFeedPosts((prev) => {
          if (prev.length >= 9) {
            clearInterval(interval)
            return prev
          }
          return [...prev, prev.length]
        })
      }, 300)
      return () => clearInterval(interval)
    }
  }, [step4InView])

  const feedImages = [
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/1-IP86inrx8Ccb1QW8HtjPES2BlHqALH.png", // 1: Cozy sweater with coffee
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/2-NY5xlyEXoxxXVM26b4Hd7UUfYZ6RBB.png", // 2: Routine graphic
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/3-oXi2uSEJxyrDs04KSGA6PUOUcHDLse.png", // 3: Window portrait
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/4-OgP14Fyo87mfUQwj3p2jj7jGxobU91.png", // 4: Stationery flat lay
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/5-BfY6p0yteE4YMqtAWF18r31pQxBajA.png", // 5: White blazer with product
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/6-vJWY0Em7fzDATzOgZX0nJqvr9czx9z.png", // 6: Jewelry flat lay
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/7-59IzQJy6isb8oKlR7f7kr8hGflFDVR.png", // 7: Coffee by window
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/8-ozsiGzjEb1Xr3iXYgUCJL3s786SX6n.png", // 8: Mood board flat lay
    "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/9-YFcT5cmChP2YBdQzHs9VB5TJJa92AD.png", // 9: Beige outfit portrait
  ]

  return (
    <section ref={containerRef} className="relative bg-stone-50 overflow-x-hidden">
      {/* Sticky Step Navigation */}
      <div className="sticky top-20 sm:top-24 z-40 bg-stone-50/80 backdrop-blur-sm border-b border-stone-200 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4 overflow-x-auto pb-2 sm:pb-0">
            {["TRAIN", "CHAT", "GENERATE", "DESIGN", "PREVIEW"].map((step, index) => (
              <div key={index} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] sm:text-xs transition-all duration-300 ${
                    activeStep >= index ? "bg-stone-950 text-stone-50" : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {index + 1}
                </div>
                <span
                  className={`hidden sm:block text-[10px] sm:text-xs font-light tracking-wider uppercase transition-colors ${
                    activeStep >= index ? "text-stone-950" : "text-stone-400"
                  }`}
                >
                  {step}
                </span>
                {index < 4 && (
                  <div
                    className={`hidden md:block w-6 sm:w-8 h-0.5 transition-colors ${
                      activeStep > index ? "bg-stone-950" : "bg-stone-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hero Intro */}
      <div className="py-16 sm:py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3 sm:mb-4">
            SEE HOW IT WORKS
          </p>
          <h2
            className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-light mb-4 sm:mb-6 leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Meet Maya, Your AI Photo Strategist
          </h2>
          <p className="text-sm sm:text-base md:text-lg font-light leading-relaxed text-stone-700 max-w-2xl mx-auto">
            Watch how SSELFIE transforms your selfies into professional brand photos in just 5 simple steps.
          </p>
        </div>
      </div>

      {/* Step 1: Training Your Model */}
      <div ref={step1Ref} className="py-16 sm:py-24 md:py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 max-w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={step1InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
            >
              <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3 sm:mb-4">
                STEP 1
              </p>
              <h3
                className="text-2xl sm:text-3xl md:text-5xl font-light mb-4 sm:mb-6 leading-tight"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Train Your AI Model
              </h3>
              <p className="text-sm sm:text-base font-light leading-relaxed text-stone-700 mb-6 sm:mb-8">
                Upload 10-20 selfies and let AI learn your unique features. The more variety, the better your results.
              </p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-light text-stone-600">Uploading photos</span>
                    <span className="text-sm font-light text-stone-600">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-stone-950"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
                {uploadProgress === 100 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-light text-stone-600">Training model</span>
                      <span className="text-sm font-light text-stone-600">{trainingProgress}%</span>
                    </div>
                    <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-stone-950"
                        initial={{ width: 0 }}
                        animate={{ width: `${trainingProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={step1InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="grid grid-cols-3 gap-2 sm:gap-4"
            >
              {[
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4128.JPG-PkHdLahzB5AiNT6D0DxAfnY1vTKtew.jpeg",
                  position: "object-[center_20%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_6384_jpg-6PZUthU5f9aZoGhJn2qNIWrqOcxxuL.jpg",
                  position: "object-[center_30%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/sandra%20portrait-sLCnXXBqs7oWGOYGomcJSbpMUEgde3.png",
                  position: "object-[center_35%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_4801-dkArdn6nmUmCvR19qo531JuDBZhNgJ.jpg",
                  position: "object-[center_25%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_7713_jpg.JPG-M8c6Yx8NLuRhhxXuK01LaoQcD1WOat.jpeg",
                  position: "object-[center_30%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_9591_jpg.JPG-z8ST7BzdEfSqfkPHWCMYVaSlYnVO31.jpeg",
                  position: "object-[center_25%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_9561_jpg.JPG-MsUmIknkwVtt4w7orHxJ12XNdr8zug.jpeg",
                  position: "object-[center_25%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_0407_jpg-SZsybJOPDKYnpV0cR6vKPX8aOkTVaD.jpg",
                  position: "object-[center_30%]",
                },
                {
                  src: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_0053_jpg.JPG-A06cxdgCQBj9ar6SBJUCLW8cqOSpTZ.jpeg",
                  position: "object-[center_20%]",
                },
              ].map((image, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={step1InView ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="aspect-square bg-stone-200 rounded-lg overflow-hidden"
                >
                  <img
                    src={image.src || "/placeholder.svg"}
                    alt={`Training photo ${i + 1}`}
                    className={`w-full h-full object-cover ${image.position}`}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Step 2: Chat with Maya */}
      <div ref={step2Ref} className="py-16 sm:py-24 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={step2InView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.8 }}
              className="order-2 md:order-1"
            >
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-stone-200">
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={step2InView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
                      <span className="text-stone-50 text-sm">M</span>
                    </div>
                    <div className="bg-stone-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                      <p className="text-sm font-light text-stone-800">
                        Hi! I&apos;m Maya. What kind of photos do you need for your brand today?
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={step2InView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="flex gap-3 justify-end"
                  >
                    <div className="bg-stone-950 text-stone-50 rounded-2xl rounded-tr-none px-4 py-3 max-w-[80%]">
                      <p className="text-sm font-light">
                        I need photos for my personal brand. Something confident and authentic.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={step2InView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.9 }}
                    className="flex gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-950 flex items-center justify-center flex-shrink-0">
                      <span className="text-stone-50 text-sm">M</span>
                    </div>
                    <div className="bg-stone-100 rounded-2xl rounded-tl-none px-4 py-3 max-w-[80%]">
                      <p className="text-sm font-light text-stone-800">
                        I love that! Let&apos;s create something beautiful that shows who you really are. I&apos;ll design some
                        photo concepts that capture your authentic style. ✨
                      </p>
                    </div>
                  </motion.div>

                  {showConceptCard && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="bg-stone-50 rounded-xl p-4 border border-stone-200"
                    >
                      <p className="text-xs font-light tracking-wider uppercase text-stone-500 mb-2">CONCEPT CARD</p>
                      <h4 className="text-sm font-medium mb-2">The Confident Minimalist</h4>
                      <p className="text-xs font-light text-stone-600 mb-3">
                        Soft natural light, clean backdrop, elegant neutral tones. You&apos;ll look confident and authentic.
                      </p>
                      <button className="w-full bg-stone-950 text-stone-50 px-4 py-2 rounded-lg text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors">
                        GENERATE PHOTO
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={step2InView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="order-1 md:order-2"
            >
              <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3 sm:mb-4">
                STEP 2
              </p>
              <h3
                className="text-2xl sm:text-3xl md:text-5xl font-light mb-4 sm:mb-6 leading-tight"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Chat with Maya
              </h3>
              <p className="text-sm sm:text-base font-light leading-relaxed text-stone-700">
                Tell Maya what you need. She&apos;ll understand your vision and create personalized photo concepts that
                capture your authentic style and build your personal brand.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Step 3: Generate Photos */}
      <div ref={step3Ref} className="py-16 sm:py-24 md:py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3 sm:mb-4">
              STEP 3
            </p>
            <h3
              className="text-2xl sm:text-3xl md:text-5xl font-light mb-4 sm:mb-6 leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Generate Professional Photos
            </h3>
            <p className="text-sm sm:text-base font-light leading-relaxed text-stone-700 max-w-2xl mx-auto">
              Watch your concept transform into a stunning professional photo in seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={step3InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8 }}
              className="flex flex-col"
            >
              <p className="text-xs font-light tracking-wider uppercase text-stone-500 mb-3 text-center">YOUR SELFIE</p>
              <div className="aspect-[3/4] bg-stone-200 rounded-2xl overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_0407_jpg-XpsFRLMPOAjcf9nMmvtxGAlD7awPrS.jpg"
                  alt="Your selfie"
                  className="w-full h-full object-cover object-[center_30%]"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={step3InView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex flex-col"
            >
              <p className="text-xs font-light tracking-wider uppercase text-stone-500 mb-3 text-center">
                AI GENERATED
              </p>
              <div className="aspect-[3/4] bg-stone-200 rounded-2xl overflow-hidden relative">
                {!showGeneratedImage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-stone-300 border-t-stone-950 rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-sm font-light text-stone-600">Generating...</p>
                    </div>
                  </div>
                ) : (
                  <motion.img
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png"
                    alt="AI generated photo"
                    className="w-full h-full object-cover object-[center_35%]"
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Step 4: Feed Designer */}
      <div ref={step4Ref} className="py-16 sm:py-24 md:py-32 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3 sm:mb-4">
              STEP 4
            </p>
            <h3
              className="text-2xl sm:text-3xl md:text-5xl font-light mb-4 sm:mb-6 leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Design Your Feed
            </h3>
            <p className="text-sm sm:text-base font-light leading-relaxed text-stone-700 max-w-2xl mx-auto">
              Plan your Instagram feed strategy. See how your photos work together before posting.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-lg">
              {/* Profile Header */}
              <div className="p-4 md:p-6 border-b border-stone-200">
                <div className="flex items-start gap-4 mb-4">
                  {/* Profile Picture */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={step4InView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-2 border-stone-200 flex-shrink-0"
                  >
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png"
                      alt="Profile"
                      className="w-full h-full object-cover object-[center_35%]"
                    />
                  </motion.div>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={step4InView ? { opacity: 1, x: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="flex items-center gap-3 mb-3"
                    >
                      <h2 className="text-base md:text-lg font-normal text-stone-950">@sandra.social</h2>
                      <button className="px-3 md:px-4 py-1 md:py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium text-stone-950 transition-all">
                        Edit profile
                      </button>
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={step4InView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="flex items-center gap-4 md:gap-6"
                    >
                      <div className="text-center">
                        <div className="text-sm font-semibold text-stone-950">9</div>
                        <div className="text-xs text-stone-500">posts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-stone-950">1,234</div>
                        <div className="text-xs text-stone-500">followers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-semibold text-stone-950">567</div>
                        <div className="text-xs text-stone-500">following</div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Bio */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={step4InView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mb-4"
                >
                  <div className="text-sm font-semibold text-stone-950 mb-1">Sandra</div>
                  <div className="text-sm text-stone-700 leading-relaxed">
                    Building my personal brand ✨ Sharing my journey
                  </div>
                </motion.div>

                {/* Story Highlights */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={step4InView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="flex items-center gap-4 overflow-x-auto pb-2 -mx-2 px-2"
                >
                  {[
                    {
                      title: "Brand",
                      image:
                        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/641-Yz6RWOHjtemWaGCwY5XQjtSCZX9LFH-XlXLIUPMbBwoHu6t3Cveer0IkMtj0s.png",
                    },
                    {
                      title: "Behind",
                      image:
                        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/618-TVCuZVG8V6R2Bput7pX8V06bCHRXGx-Tfoxt75X3UyvDtzbfEtkSa3qVTJZnw.png",
                    },
                    {
                      title: "Tips",
                      image:
                        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/616-nnePryg0hS2y745w8ZNU8TWvFrgude-rzHLfnuRz9hOKwAlpHhyvHsXI4qVjA.png",
                    },
                    {
                      title: "Work",
                      image:
                        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/maya_kjszrgh0nnrmc0cs60naappknc_0_1757449707221-Kv9x3iUJpIuh2hZK3lFDy0QrrvftCA.png",
                    },
                  ].map((highlight, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={step4InView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                      className="flex flex-col items-center gap-2 flex-shrink-0"
                    >
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-stone-300 overflow-hidden">
                        <img
                          src={highlight.image || "/placeholder.svg"}
                          alt={highlight.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs text-stone-600">{highlight.title}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Feed Grid */}
              <div className="grid grid-cols-3 gap-1 bg-stone-100">
                {feedImages.map((image, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={feedPosts.includes(i) ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.5 }}
                    className="aspect-[3/4] bg-stone-200 relative group cursor-pointer overflow-hidden"
                    onClick={() => i === 4 && setShowInstagramModal(true)}
                  >
                    {feedPosts.includes(i) && (
                      <>
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Feed post ${i + 1}`}
                          className="w-full h-full object-cover object-[center_30%]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <span className="text-white text-xs font-medium">View Post</span>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 5: Instagram Preview */}
      <div ref={step5Ref} className="py-16 sm:py-24 md:py-32 bg-stone-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <p className="text-[10px] sm:text-xs font-light tracking-[0.25em] sm:tracking-[0.3em] uppercase text-stone-500 mb-3 sm:mb-4">
              STEP 5
            </p>
            <h3
              className="text-2xl sm:text-3xl md:text-5xl font-light mb-4 sm:mb-6 leading-tight"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Preview on Instagram
            </h3>
            <p className="text-sm sm:text-base font-light leading-relaxed text-stone-700 max-w-2xl mx-auto">
              See exactly how your post will look on Instagram before you publish.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={step5InView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-stone-200 overflow-hidden">
              {/* Instagram Header */}
              <div className="p-3 flex items-center justify-between border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                    <img
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png"
                      alt="Profile"
                      className="w-full h-full object-cover object-[center_35%]"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-stone-950">sandra.social</div>
                  </div>
                </div>
                <button className="text-stone-950 text-xl font-bold hover:text-stone-600">✕</button>
              </div>

              {/* Instagram Post Image */}
              <div className="aspect-square bg-stone-200 overflow-hidden">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/391-F5rpvWi7mr7HKsS31u6tkCzdWUWRE4-3HemN7NocUxfYNc71LnRVUHuzmLGdi.png"
                  alt="Instagram post"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Instagram Actions */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    {/* Heart Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                    {/* Comment Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    {/* Share Icon */}
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </div>
                  {/* Bookmark Icon */}
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </div>

                {/* Likes */}
                <div className="text-sm font-semibold text-stone-950 mb-2">1,247 likes</div>

                {/* Caption */}
                <div className="text-sm text-stone-950 mb-2">
                  <span className="font-semibold">sandra.social</span>{" "}
                  <span className="font-normal">
                    Finding moments of calm in the everyday ☕️ Building a brand that feels authentic starts with showing
                    up as yourself.
                  </span>
                </div>

                {/* Hashtags */}
                <div className="text-sm text-stone-600 mb-3">
                  #personalbrand #authenticity #brandphotography #contentcreator #entrepreneur #lifestyle
                  #professionalphotos #aiheadshots
                </div>

                {/* View Comments */}
                <button className="text-sm text-stone-500 mb-3">View all 42 comments</button>

                {/* Sample Comments */}
                <div className="space-y-2 mb-3">
                  <div className="text-sm">
                    <span className="font-semibold text-stone-950">maya.ai</span>{" "}
                    <span className="text-stone-950">This turned out beautifully! 📸✨</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-stone-950">creative_studio</span>{" "}
                    <span className="text-stone-950">Love the natural lighting! 🔥</span>
                  </div>
                </div>

                {/* Timestamp */}
                <div className="text-xs text-stone-400 mb-3">2 HOURS AGO</div>

                {/* Add Comment */}
                <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                  <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 text-sm text-stone-950 placeholder:text-stone-400 outline-none bg-transparent"
                    disabled
                  />
                  <button className="text-sm font-semibold text-blue-500">Post</button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Instagram Preview Modal */}
      {showInstagramModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowInstagramModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Instagram Header */}
            <div className="p-3 flex items-center justify-between border-b border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200">
                  <img
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/128-TqmkIgnUECmiAqYOzMcxWjoCGKuVX6-Fdh9eA4Mx5KQLbAPDZ0CFLJ5TZ6bUm.png"
                    alt="Profile"
                    className="w-full h-full object-cover object-[center_35%]"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-stone-950">sandra.social</div>
                </div>
              </div>
              <button
                onClick={() => setShowInstagramModal(false)}
                className="text-stone-950 text-xl font-bold hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {/* Instagram Post Image */}
            <div className="aspect-square bg-stone-200 overflow-hidden">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/391-F5rpvWi7mr7HKsS31u6tkCzdWUWRE4-3HemN7NocUxfYNc71LnRVUHuzmLGdi.png"
                alt="Instagram post"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Instagram Actions */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </div>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>

              <div className="text-sm font-semibold text-stone-950 mb-2">1,247 likes</div>

              <div className="text-sm text-stone-950 mb-2">
                <span className="font-semibold">sandra.social</span>{" "}
                <span className="font-normal">
                  Finding moments of calm in the everyday ☕️ Building a brand that feels authentic starts with showing
                  up as yourself.
                </span>
              </div>

              <div className="text-sm text-stone-600 mb-3">
                #personalbrand #authenticity #brandphotography #contentcreator #entrepreneur #lifestyle
                #professionalphotos #aiheadshots
              </div>

              <button className="text-sm text-stone-500 mb-3">View all 42 comments</button>

              <div className="space-y-2 mb-3">
                <div className="text-sm">
                  <span className="font-semibold text-stone-950">maya.ai</span>{" "}
                  <span className="text-stone-950">This turned out beautifully! 📸✨</span>
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-stone-950">creative_studio</span>{" "}
                  <span className="text-stone-950">Love the natural lighting! 🔥</span>
                </div>
              </div>

              <div className="text-xs text-stone-400 mb-3">2 HOURS AGO</div>

              <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                <svg className="w-6 h-6 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Add a comment..."
                  className="flex-1 text-sm text-stone-950 placeholder:text-stone-400 outline-none bg-transparent"
                  disabled
                />
                <button className="text-sm font-semibold text-blue-500">Post</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* CTA Section */}
      <div className="py-16 sm:py-24 md:py-32 bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h3
            className="text-2xl sm:text-3xl md:text-5xl font-light mb-4 sm:mb-6 leading-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Ready to Create Your Photos?
          </h3>
          <p className="text-sm sm:text-base font-light leading-relaxed text-stone-700 mb-6 sm:mb-8 px-4">
            Start creating professional photos today.
          </p>
          <Link
            href="/auth/sign-up"
            className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-10 py-3 sm:py-4 rounded-lg text-xs sm:text-sm uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 min-h-[44px] flex items-center justify-center mx-auto"
          >
            GET STARTED
          </Link>
        </div>
      </div>

      {/* Maya Styles Carousel Section */}
      <MayaStylesCarousel />
    </section>
  )
}
