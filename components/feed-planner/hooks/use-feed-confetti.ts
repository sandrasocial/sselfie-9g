"use client"

import { useState, useRef, useEffect } from "react"

/**
 * Hook for managing confetti animation when feed is complete
 */
export function useFeedConfetti(readyPosts: number, totalPosts: number = 9) {
  const [showConfetti, setShowConfetti] = useState(false)
  const hasShownConfettiRef = useRef(false)

  const triggerConfetti = () => {
    const duration = 3000
    const animationEnd = Date.now() + duration
    const colors = ["#292524", "#57534e", "#78716c"] // stone colors only

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const confettiInterval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(confettiInterval)
        return
      }

      const particleCount = 3

      // Create confetti particles
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div")
        particle.style.position = "fixed"
        particle.style.width = "8px"
        particle.style.height = "8px"
        particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
        particle.style.left = Math.random() * window.innerWidth + "px"
        particle.style.top = "-10px"
        particle.style.zIndex = "9999"
        particle.style.pointerEvents = "none"
        particle.style.borderRadius = "2px"
        particle.style.transition = "transform 3s linear, opacity 3s linear"
        
        document.body.appendChild(particle)

        requestAnimationFrame(() => {
          particle.style.transform = `translateY(${window.innerHeight + 100}px) rotate(${randomInRange(-180, 180)}deg)`
          particle.style.opacity = "0"
        })

        setTimeout(() => {
          particle.remove()
        }, duration)
      }
    }, 50)

    setTimeout(() => {
      clearInterval(confettiInterval)
    }, duration)
  }

  // Trigger confetti when all posts are complete
  useEffect(() => {
    if (readyPosts === totalPosts && !hasShownConfettiRef.current) {
      // Set ref immediately to prevent duplicate triggers
      hasShownConfettiRef.current = true
      
      console.log("[v0] 🎉 All posts complete! Revealing feed with confetti")
      setTimeout(() => {
        setShowConfetti(true)
        triggerConfetti()
      }, 500)
      
      // Clear confetti after 3 seconds
      setTimeout(() => {
        setShowConfetti(false)
      }, 3500)
    }
  }, [readyPosts, totalPosts])

  return {
    showConfetti,
    triggerConfetti,
  }
}

