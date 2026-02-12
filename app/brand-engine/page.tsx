"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"

export default function BrandEnginePage() {
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const totalScenes = 6

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const scrollTop = containerRef.current.scrollTop
      const sceneHeight = containerRef.current.clientHeight
      setShowStickyFooter(scrollTop > sceneHeight)
    }

    const container = containerRef.current
    if (!container) return
    container.addEventListener("scroll", handleScroll)
    return () => container.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("visible")
        }
      },
      { threshold: 0.2 },
    )

    const fadeElements = document.querySelectorAll(".fade-up")
    fadeElements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const scrollToScene = (index: number) => {
    if (!containerRef.current) return
    const sceneHeight = containerRef.current.clientHeight
    containerRef.current.scrollTo({
      top: Math.max(0, Math.min(index, totalScenes - 1)) * sceneHeight,
      behavior: "smooth",
    })
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 py-5 pt-[calc(20px+env(safe-area-inset-top))] flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto" style={{ fontFamily: "'Times New Roman', serif" }}>
          <Link href="/" className="text-xl text-white tracking-[0.05em]">
            SSELFIE
          </Link>
        </div>
        <Link
          href="/auth/login"
          className="pointer-events-auto text-[10px] uppercase tracking-[0.2em] text-white opacity-90 hover:opacity-100 transition-opacity py-2"
        >
          Login
        </Link>
      </nav>

      <main
        ref={containerRef}
        className="snap-container"
        style={{
          scrollSnapType: "y mandatory",
          overflowY: "scroll",
          height: "100vh",
          height: "100dvh",
          scrollBehavior: "smooth",
        }}
      >
        {/* 1. HERO */}
        <section className="scene hero-scene">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png')",
              backgroundPosition: "50% 25%",
            }}
          />
          <div className="absolute inset-0" style={{ background: "rgba(0, 0, 0, 0.4)" }} />
          <div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.35) 100%)" }}
          />

          <div className="content text-center flex-1 flex flex-col justify-center">
            <span className="label fade-up">Brand Engine Cohort</span>
            <h1 className="hero-title fade-up">
              Brand Engine Cohort.
              <br />
              12 women. 4 weeks.
              <br />
              We build it together.
            </h1>
            <p className="description fade-up mx-auto max-w-md">This works.</p>
            <p className="description fade-up mx-auto max-w-md">Here&apos;s what I do.</p>
            <p className="description fade-up mx-auto max-w-md">It&apos;s simple.</p>
            <div className="fade-up mt-6">
              <button
                type="button"
                onClick={() => scrollToScene(1)}
                className="btn"
              >
                See Details
              </button>
            </div>
          </div>
        </section>

        {/* 2. PROBLEM */}
        <section className="scene section-dark">
          <div className="section-wrap text-center">
            <span className="label fade-up">The Problem</span>
            <h2 className="hero-title fade-up">You don&apos;t need more tools. You need a system.</h2>
            <div className="description fade-up max-w-xl mx-auto text-left">
              <p>You&apos;re doing too much.</p>
              <ul className="list">
                <li>Too many apps</li>
                <li>No clear weekly plan</li>
                <li>Posting when you can, then disappearing</li>
                <li>Second-guessing every piece of content</li>
              </ul>
              <p>No stress. We fix that together.</p>
            </div>
          </div>
        </section>

        {/* 3. WHAT YOU GET */}
        <section className="scene section-alt">
          <div className="section-wrap text-center">
            <span className="label fade-up">What You Get</span>
            <h2 className="hero-title fade-up">Here&apos;s what we build together.</h2>
            <div className="description fade-up max-w-xl mx-auto text-left">
              <p>
                <strong>Your offer. Your funnel. Your automations.</strong>
              </p>
              <ul className="list">
                <li>A clear offer people understand fast</li>
                <li>A simple content system you can keep up with</li>
                <li>A funnel path from visibility to inquiry</li>
                <li>Weekly posting structure so you stay consistent</li>
                <li>Agent support for repeated background tasks</li>
                <li>A next-step plan you can follow after week four</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 4. TIMELINE */}
        <section className="scene section-dark">
          <div className="section-wrap text-center">
            <span className="label fade-up">Timeline</span>
            <h2 className="hero-title fade-up">4 weeks. One clear path.</h2>
            <div className="description fade-up max-w-xl mx-auto text-left">
              <ul className="list">
                <li>
                  <strong>Week 1:</strong> Message, offer, direction
                </li>
                <li>
                  <strong>Week 2:</strong> Content system setup
                </li>
                <li>
                  <strong>Week 3:</strong> Funnel and automations
                </li>
                <li>
                  <strong>Week 4:</strong> Launch week and handoff
                </li>
              </ul>
              <p>You don&apos;t need perfect. You need consistent.</p>
            </div>
          </div>
        </section>

        {/* 5. PRICE */}
        <section className="scene section-alt">
          <div className="section-wrap text-center">
            <span className="label fade-up">Price</span>
            <h2 className="hero-title fade-up">€2,497. 12 spots. March 16.</h2>
            <div className="description fade-up max-w-xl mx-auto">
              <p>No pressure.</p>
              <p>If you want, we can map your next step.</p>
            </div>
          </div>
        </section>

        {/* 6. CTA */}
        <section className="scene section-dark">
          <div className="section-wrap text-center">
            <span className="label fade-up">Your Next Step</span>
            <h2 className="hero-title fade-up">Apply here</h2>
            <div className="description fade-up max-w-xl mx-auto">
              <p>I review every application personally.</p>
              <p>You&apos;ve got this.</p>
            </div>
            <div className="fade-up mt-8">
              <a href="/apply/brand-engine" className="btn">
                Apply here
              </a>
            </div>
          </div>
        </section>
      </main>

      {showStickyFooter && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-white/20 py-4 px-5"
          style={{ backdropFilter: "blur(10px)", animation: "slideUp 0.3s ease-out" }}
        >
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Times New Roman', serif" }}>Brand Engine Cohort</div>
              <div style={{ fontSize: "12px", color: "#a8a29e" }}>€2,497. 12 spots. March 16.</div>
            </div>
            <a href="/apply/brand-engine" className="btn" style={{ fontSize: "12px", padding: "12px 24px" }}>
              Apply here
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        .scene {
          min-height: 100vh;
          min-height: 100dvh;
          width: 100vw;
          scroll-snap-align: start;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-scene {
          overflow: hidden;
        }

        .section-dark {
          background-color: #000000;
          color: white;
        }

        .section-alt {
          background-color: #1c1917;
          color: white;
        }

        .content {
          position: relative;
          z-index: 10;
          padding: 24px 20px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .section-wrap {
          max-width: 900px;
          margin: 0 auto;
          padding: 0 24px;
          width: 100%;
        }

        .label {
          font-size: 11px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: #a8a29e;
          margin-bottom: 16px;
          display: block;
        }

        .hero-title {
          font-family: "Times New Roman", serif;
          font-weight: 300;
          font-size: clamp(32px, 6vw, 62px);
          line-height: 1.2;
          letter-spacing: -0.01em;
          margin: 16px 0 24px;
          color: white;
        }

        .description {
          font-size: 16px;
          line-height: 1.7;
          color: #d6d3d1;
        }

        .description p {
          margin: 0 0 10px;
        }

        .list {
          margin: 10px 0 16px;
          padding-left: 18px;
          line-height: 1.8;
        }

        .btn {
          background-color: white;
          color: black;
          padding: 14px 28px;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s;
          display: inline-block;
          border: none;
          cursor: pointer;
        }

        .btn:hover {
          background-color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }

        .fade-up {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @media (min-width: 768px) {
          .content {
            padding: 64px;
            justify-content: center;
          }
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  )
}
