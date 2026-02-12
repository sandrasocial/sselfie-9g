"use client"

// Force rebuild - updated Jan 29 2026
import { useState, useEffect, useRef } from "react"
import Link from "next/link"

export default function BrandEnginePage() {
  const [activeScene, setActiveScene] = useState(0)
  const [showStickyFooter, setShowStickyFooter] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scenesRef = useRef<(HTMLDivElement | null)[]>([])

  const totalScenes = 8

  // Update active scene based on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const scrollTop = containerRef.current.scrollTop
      const sceneHeight = containerRef.current.clientHeight
      const currentScene = Math.round(scrollTop / sceneHeight)

      if (currentScene !== activeScene && currentScene >= 0 && currentScene < totalScenes) {
        setActiveScene(currentScene)
      }

      setShowStickyFooter(scrollTop > sceneHeight)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [activeScene, totalScenes])

  // Fade-up animation observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.2 }
    )

    const fadeElements = document.querySelectorAll(".fade-up")
    fadeElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  const scrollToScene = (index: number) => {
    if (containerRef.current) {
      const sceneHeight = containerRef.current.clientHeight
      containerRef.current.scrollTo({
        top: index * sceneHeight,
        behavior: "smooth",
      })
    }
  }

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Navigation */}
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

      {/* Main Snap Scroll Container */}
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
        {/* SCENE 1: HERO */}
        <section
          ref={(el) => (scenesRef.current[0] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            width: "100vw",
            position: "relative",
            scrollSnapAlign: "start",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png')",
              backgroundPosition: "50% 25%",
            }}
          />
          {/* Subtle overlay for readability */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(0, 0, 0, 0.3)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.25) 100%)",
            }}
          />

          <div className="content text-center flex-1 flex flex-col justify-center">
            <span className="label fade-up" style={{
              color: "#ffffff",
              textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              fontWeight: "400"
            }}>
              Brand Engine
            </span>
            <h1
              className="hero-title fade-up"
              style={{
                fontStyle: "normal",
                fontWeight: 300,
                textShadow: "0 2px 20px rgba(0,0,0,0.3)",
                fontFamily: "'Times New Roman', serif",
                fontSize: "clamp(36px, 7vw, 68px)",
                lineHeight: "1.1",
                letterSpacing: "-0.02em",
                marginTop: "16px",
                marginBottom: "20px"
              }}
            >
              Build Your Content and Sales System in 4 Weeks
            </h1>
            <p className="description fade-up mx-auto max-w-md" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}>
              This is the Brand Engine Cohort. Small group. Clear plan. One system that keeps you visible and helps you sell.
            </p>
            <div className="fade-up" style={{ transitionDelay: "0.2s", marginTop: "10px", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
              <a
                href="#pricing"
                onClick={(e) => {
                  e.preventDefault()
                  scrollToScene(6)
                }}
                className="btn shadow-xl"
              >
                Apply for Cohort →
              </a>
            </div>
            <p className="description fade-up mx-auto max-w-md mt-4" style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)", fontSize: "14px", marginTop: "16px" }}>
              Starts March 16, 2026. 12 seats.
            </p>
          </div>
        </section>

        {/* SCENE 2: THE PROBLEM */}
        <section
          ref={(el) => (scenesRef.current[1] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#000000",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <span className="label fade-up" style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a8a29e"
            }}>The Real Problem</span>
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                marginBottom: "32px",
                marginTop: "16px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: 300,
                lineHeight: "1.2",
                letterSpacing: "-0.01em"
              }}
            >
              You Do Not Need More Tools
            </h2>
            <div className="description fade-up text-base space-y-4" style={{ color: "#d6d3d1", maxWidth: "600px" }}>
              <p>I&apos;ll be honest.</p>
              <p>Most tools still leave you doing everything alone. You still have to:</p>
              <ul style={{ textAlign: "left", paddingLeft: "20px", marginTop: "16px", lineHeight: "1.8" }}>
                <li>Figure out what to create</li>
                <li>Rewrite content so it sounds like you</li>
                <li>Post and manage every channel manually</li>
                <li>Track what&apos;s working</li>
                <li>Start over when algorithms change</li>
              </ul>
              <p style={{ marginTop: "24px", fontWeight: "bold", color: "white" }}>
                That is why this is a system, not just content.
              </p>
            </div>
          </div>
        </section>

        {/* SCENE 3: WHAT I BUILD */}
        <section
          ref={(el) => (scenesRef.current[2] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#1c1917",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
            style={{
              maxWidth: "1280px",
              margin: "0 auto",
              padding: "0 24px",
              width: "100%",
            }}
          >
            {/* Visual Container: single image */}
            <div className="w-full md:w-1/2 fade-in-up" style={{ maxHeight: "min(500px, 60vh)" }}>
              <img
                src="https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/feed-posts/4157-2y8eKw9iheAA5WZ9nsyPJAZYoPkaqj.png"
                className="w-full h-full object-cover rounded-sm"
                alt="Brand Engine content example"
                loading="lazy"
              />
            </div>

            {/* Text Container */}
            <div
              className="w-full md:w-1/2 flex flex-col justify-center fade-in-up md:p-16"
              style={{
                padding: "24px",
              }}
            >
              <span className="label fade-up" style={{
                fontSize: "11px",
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#a8a29e"
              }}>What I Actually Build</span>
              <h2
                className="hero-title fade-up"
                style={{
                  fontSize: "clamp(28px, 5vw, 48px)",
                  marginBottom: "20px",
                  marginTop: "16px",
                  fontFamily: "'Times New Roman', serif",
                  fontWeight: 300,
                  lineHeight: "1.2",
                  letterSpacing: "-0.01em"
                }}
              >
                What You Walk Away With
              </h2>
              <div className="description fade-up text-sm md:text-base space-y-3" style={{ color: "#d6d3d1" }}>
                <p><strong>Clear offer message</strong> so people know exactly what you sell.</p>
                <p><strong>Simple content system</strong> you can keep up with every week.</p>
                <p><strong>Practical funnel path</strong> from attention to inquiry.</p>
                <p><strong>Agent-supported workflow</strong> for repeated tasks in the background.</p>
                <p><strong>Weekly plan</strong> with one clear next step at a time.</p>
                <p><strong>Ready-to-use assets</strong> so you can execute right away.</p>
              </div>
              <div className="fade-up mt-6">
                <a
                  href="#pricing"
                  onClick={(e) => {
                    e.preventDefault()
                    scrollToScene(6)
                  }}
                  className="btn"
                >
                  Apply for Cohort →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 4: HOW IT WORKS */}
        <section
          ref={(el) => (scenesRef.current[3] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#000000",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="label fade-up" style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a8a29e"
            }}>Timeline</span>
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                marginBottom: "56px",
                marginTop: "16px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: 300,
                textAlign: "center",
                lineHeight: "1.2",
                letterSpacing: "-0.01em"
              }}
            >
              Here&apos;s What We Do
            </h2>
            <div className="w-full space-y-8 fade-up">
              {/* Week 1 */}
              <div style={{ borderLeft: "2px solid white", paddingLeft: "24px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.25em", color: "#a8a29e", marginBottom: "12px" }}>
                  <span style={{ marginRight: "12px", fontWeight: "bold" }}>01</span>Week 1
                </div>
                <h3 style={{ fontSize: "28px", fontFamily: "'Times New Roman', serif", marginBottom: "12px", fontWeight: 300 }}>
                  Positioning and Offer
                </h3>
                <p style={{ color: "#d6d3d1", lineHeight: "1.6" }}>
                  We simplify your message so your audience understands you fast.
                </p>
              </div>

              {/* Week 2-3 */}
              <div style={{ borderLeft: "2px solid white", paddingLeft: "24px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.25em", color: "#a8a29e", marginBottom: "12px" }}>
                  <span style={{ marginRight: "12px", fontWeight: "bold" }}>02</span>Weeks 2-3
                </div>
                <h3 style={{ fontSize: "28px", fontFamily: "'Times New Roman', serif", marginBottom: "12px", fontWeight: 300 }}>
                  Build the Engine
                </h3>
                <p style={{ color: "#d6d3d1", lineHeight: "1.6" }}>
                  We build your content flow and conversion path so you can stay consistent without chaos.
                </p>
              </div>

              {/* Week 4 */}
              <div style={{ borderLeft: "2px solid white", paddingLeft: "24px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.25em", color: "#a8a29e", marginBottom: "12px" }}>
                  <span style={{ marginRight: "12px", fontWeight: "bold" }}>03</span>Week 4
                </div>
                <h3 style={{ fontSize: "28px", fontFamily: "'Times New Roman', serif", marginBottom: "12px", fontWeight: 300 }}>
                  Launch and Close
                </h3>
                <p style={{ color: "#d6d3d1", lineHeight: "1.6" }}>
                  You launch with support, work your lead queue, and leave with a simple weekly rhythm.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 5: WHY THIS WORKS */}
        <section
          ref={(el) => (scenesRef.current[4] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#1c1917",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <span className="label fade-up" style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a8a29e"
            }}>ROI</span>
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                marginBottom: "32px",
                marginTop: "16px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: 300,
                lineHeight: "1.2",
                letterSpacing: "-0.01em"
              }}
            >
              Why This Works
            </h2>
            <p className="description fade-up" style={{ fontSize: "20px", marginBottom: "48px" }}>
              You do not need to do everything. You need a simple system you can follow.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", width: "100%", maxWidth: "700px" }} className="fade-up">
              <div style={{ textAlign: "left" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", marginBottom: "16px" }}>
                  What Usually Happens:
                </h3>
                <div style={{ color: "#d6d3d1", lineHeight: "1.8", fontSize: "14px" }}>
                  <div>Too many tools</div>
                  <div>Inconsistent posting</div>
                  <div>No clear conversion path</div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "12px", paddingTop: "12px", fontWeight: "bold", color: "white" }}>
                    High effort. Low momentum.
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "left" }}>
                <h3 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.15em", color: "white", marginBottom: "16px" }}>
                  Inside the Cohort:
                </h3>
                <div style={{ color: "#d6d3d1", lineHeight: "1.8", fontSize: "14px" }}>
                  <div>Clear offer and message</div>
                  <div>Weekly execution structure</div>
                  <div>Content + funnel operating system</div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: "12px", paddingTop: "12px", fontWeight: "bold", fontSize: "20px", color: "white" }}>
                    Clarity. Consistency. Progress.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCENE 5.5: SOCIAL PROOF */}
        <section
          ref={(el) => (scenesRef.current[5] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#000000",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <span className="label fade-up" style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a8a29e"
            }}>Why Trust This</span>
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                marginBottom: "40px",
                marginTop: "16px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: 300,
                lineHeight: "1.2",
                letterSpacing: "-0.01em"
              }}
            >
              Built by Someone Who&apos;s Done It
            </h2>
            <div className="description fade-up text-base space-y-6" style={{ color: "#d6d3d1", maxWidth: "600px" }}>
              <p><strong style={{ color: "white" }}>180K+ followers</strong> — I know what gets seen and what gets skipped.</p>
              <p><strong style={{ color: "white" }}>SSELFIE Studio</strong> — a real product with paying users and systems that run 24/7.</p>
              <p><strong style={{ color: "white" }}>Eight months building this</strong> — tested in real life, not theory.</p>
            </div>
            <p className="fade-up mt-6" style={{ fontSize: "14px", color: "#a8a29e", fontStyle: "italic" }}>
              I built this because I needed this.
            </p>
          </div>
        </section>

        {/* SCENE 6: PRICING */}
        <section
          ref={(el) => (scenesRef.current[6] = el)}
          id="pricing"
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#000000",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span className="label fade-up" style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a8a29e"
            }}>Offer</span>
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                marginBottom: "56px",
                marginTop: "16px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: 300,
                textAlign: "center",
                lineHeight: "1.2",
                letterSpacing: "-0.01em"
              }}
            >
              Cohort First, VIP Optional
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", width: "100%", maxWidth: "860px" }} className="md:grid-cols-2">
              {/* Cohort Package */}
              <div
                style={{
                  border: "2px solid white",
                  padding: "48px 32px",
                  textAlign: "center",
                }}
                className="fade-up"
              >
                <h3 style={{ fontSize: "24px", fontFamily: "'Times New Roman', serif", marginBottom: "8px" }}>
                  Brand Engine Cohort
                </h3>
                <div style={{ fontSize: "48px", fontFamily: "'Times New Roman', serif", marginBottom: "8px" }}>
                  €2,497
                </div>
                <div style={{ fontSize: "14px", color: "#a8a29e", marginBottom: "24px" }}>
                  launch target · floor €2,000
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "24px", marginTop: "24px", textAlign: "left", fontSize: "14px", lineHeight: "1.8", color: "#d6d3d1" }}>
                  <div>✓ 4-week live cohort</div>
                  <div>✓ Starts March 16, 2026</div>
                  <div>✓ 12 seats total</div>
                  <div>✓ Offer + content + funnel system</div>
                  <div>✓ Weekly implementation support</div>
                  <div>✓ Clear next-step plan after cohort</div>
                </div>

                <div style={{ marginTop: "32px", padding: "16px", backgroundColor: "#1c1917" }}>
                  <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#a8a29e", marginBottom: "8px" }}>
                    Launch Terms
                  </div>
                  <div style={{ fontSize: "32px", fontFamily: "'Times New Roman', serif" }}>
                    12 seats
                  </div>
                  <div style={{ fontSize: "20px", fontFamily: "'Times New Roman', serif" }}>
                    starts March 16, 2026
                  </div>
                </div>

                <a
                  href="/apply/brand-engine"
                  className="btn"
                  style={{ marginTop: "32px", width: "100%" }}
                >
                  Apply for Cohort →
                </a>
                <p style={{ fontSize: "12px", color: "#a8a29e", marginTop: "12px" }}>
                  Applications reviewed within 24 hours
                </p>
                <p style={{ fontSize: "13px", color: "#d6d3d1", marginTop: "12px", maxWidth: "380px", marginLeft: "auto", marginRight: "auto" }}>
                  If it&apos;s a fit, I&apos;ll send your booking link for next step.
                </p>
              </div>

              {/* VIP Package */}
              <div
                style={{
                  border: "1px solid rgba(255,255,255,0.35)",
                  padding: "48px 32px",
                  textAlign: "center",
                }}
                className="fade-up"
              >
                <h3 style={{ fontSize: "24px", fontFamily: "'Times New Roman', serif", marginBottom: "8px" }}>
                  Brand Engine VIP
                </h3>
                <div style={{ fontSize: "48px", fontFamily: "'Times New Roman', serif", marginBottom: "8px" }}>
                  €4,997
                </div>
                <div style={{ fontSize: "14px", color: "#a8a29e", marginBottom: "24px" }}>
                  launch target · floor €3,500
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "24px", marginTop: "24px", textAlign: "left", fontSize: "14px", lineHeight: "1.8", color: "#d6d3d1" }}>
                  <div>✓ 1:1 implementation with Sandra</div>
                  <div>✓ Fast-track build path</div>
                  <div>✓ Priority support and decisions</div>
                  <div>✓ Best for founders needing speed</div>
                </div>
                <div style={{ marginTop: "32px", padding: "16px", backgroundColor: "#1c1917", fontSize: "14px", color: "#d6d3d1" }}>
                  VIP is offered after fit review.
                </div>
                <a
                  href="/apply/brand-engine"
                  className="btn"
                  style={{ marginTop: "32px", width: "100%" }}
                >
                  Apply for Cohort →
                </a>
              </div>
            </div>

            <p style={{ marginTop: "32px", fontSize: "14px", color: "#a8a29e", textAlign: "center", maxWidth: "500px" }} className="fade-up">
              Cohort is the main path. VIP is for founders who need speed.
            </p>
          </div>
        </section>

        {/* SCENE 7: STORY */}
        <section
          ref={(el) => (scenesRef.current[7] = el)}
          className="scene"
          style={{
            minHeight: "100vh",
            minHeight: "100dvh",
            backgroundColor: "#1c1917",
            color: "white",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "0 24px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <span className="label fade-up" style={{
              fontSize: "11px",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#a8a29e"
            }}>My Story</span>
            <h2
              className="hero-title fade-up"
              style={{
                fontSize: "clamp(32px, 6vw, 56px)",
                marginBottom: "32px",
                marginTop: "16px",
                fontFamily: "'Times New Roman', serif",
                fontWeight: 300,
                lineHeight: "1.2",
                letterSpacing: "-0.01em"
              }}
            >
              Why I Built This
            </h2>
            <div className="description fade-up text-base space-y-4" style={{ color: "#d6d3d1", maxWidth: "600px", textAlign: "left" }}>
              <p>I built SSELFIE from scratch in a hard season of life.</p>
              <p>I needed a way to stay visible, keep going, and create real income without burning out.</p>
              <p>This is the same system I use in my own business.</p>
              <p style={{ marginTop: "32px", fontStyle: "italic", color: "#a8a29e" }}>
                If you want support building this with me, apply for the cohort.
              </p>
            </div>

            <div className="fade-up" style={{ marginTop: "48px" }}>
              <a
                href="/apply/brand-engine"
                className="btn"
              >
                Apply for Cohort →
              </a>
            </div>

            <p style={{ marginTop: "32px", fontSize: "12px", color: "#a8a29e" }} className="fade-up">
              Each system is custom-built for your specific voice and business.<br />
              No cookie-cutter templates here.
            </p>
          </div>
        </section>

      </main>

      {/* Sticky Footer CTA */}
      {showStickyFooter && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 bg-black border-t border-white/20 py-4 px-5"
          style={{
            backdropFilter: "blur(10px)",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Times New Roman', serif" }}>
                Brand Engine
              </div>
              <div style={{ fontSize: "12px", color: "#a8a29e" }}>
                Cohort €2,000-€2,497 · Starts March 16
              </div>
            </div>
            <a
              href="/apply/brand-engine"
              className="btn"
              style={{ fontSize: "12px", padding: "12px 24px" }}
            >
              Apply for Cohort →
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        .content {
          position: relative;
          z-index: 10;
          padding: 24px 20px;
          padding-bottom: calc(32px + env(safe-area-inset-bottom));
          width: 100%;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        @media (min-width: 768px) {
          .content {
            padding: 64px;
            max-width: 800px;
            justify-content: center;
          }
        }

        .label {
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 10px;
          margin-bottom: 16px;
          opacity: 0.9;
        }

        .hero-title {
          font-size: 48px;
          line-height: 1.1;
          max-width: 800px;
          color: white;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 36px;
          }
        }

        .description {
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.9);
        }

        .btn {
          background-color: white;
          color: black;
          padding: 16px 32px;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.15em;
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

        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .scene {
          scroll-snap-align: start;
        }
      `}</style>
    </div>
  )
}
