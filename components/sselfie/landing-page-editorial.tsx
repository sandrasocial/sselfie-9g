"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import Lenis from "lenis";
import {
  trackCTAClick,
  trackCheckoutStart,
  trackLandingView,
  trackPricingView,
  trackSelfieGuideEntryClick,
} from "@/lib/analytics";
import { startEmbeddedCheckout } from "@/lib/start-embedded-checkout";
import { handleCheckoutFailure } from "@/lib/checkout-failure";
import { formatPriceFromCents, getProductById } from "@/lib/products";
import { appendReferralParam, buildReferralLoginHref, persistReferralCode } from "@/lib/referrals/routing";

gsap.registerPlugin(ScrollTrigger, TextPlugin);

/** Remote assets (same CDN as legacy landing; avoids bundling multi‑MB PNGs). */
const ASSETS = {
  heroBg:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png",
  lookbookInterior: "/landing/lookbook-lifestyle-interior.png",
  lookbookCity:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png",
  lookbookVilla: "/landing/lookbook-on-location.png",
  lookbookShelving:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png",
  publicationQuality:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png",
  rawshot:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/8227-Y8Hi0TmnDBrZmgOGBbRXt1jk4eigZR.png",
  afterGrid: "/landing/grid-after.png",
  beforeGrid: "/landing/grid-before.png",
  /** “What SSELFIE creates” mosaic — 03–04 uploads; 05 = lookbook Instagram-ready; 06 = former 07 asset; 07 = local portrait. */
  featAgentIntro:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png",
  featHeadshot:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png",
  featOpenHouse: "/landing/creates-upload-1.png",
  featMarket: "/landing/creates-upload-2.png",
  featAgent2:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png",
  featInterior: "/landing/creates-upload-4.png",
  featProperty: "/landing/creates-slot-07.png",
  finalCta:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png",
} as const;

// ─── WebGL grain overlay ──────────────────────────────────────────────────────
const VERT = `attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `precision mediump float;
uniform float t; uniform vec2 r;
float h(vec2 q){q=fract(q*vec2(127.1,311.7));q+=dot(q,q+74.2);return fract(q.x*q.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/r;
  float g=h(uv*800.+t*.4);
  gl_FragColor=vec4(vec3(g*.03),1.);
}`;

function GrainCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: true });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERT);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vertex || !fragment) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const tU = gl.getUniformLocation(program, "t");
    const rU = gl.getUniformLocation(program, "r");
    const start = performance.now();
    let raf = 0;
    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = window.innerWidth * d;
      canvas.height = window.innerHeight * d;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    const draw = () => {
      gl.uniform1f(tU, (performance.now() - start) * 0.001);
      gl.uniform2f(rU, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = window.requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    draw();
    return () => { window.cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-[400]"
      style={{ width: "100vw", height: "100vh", opacity: 0.04, mixBlendMode: "overlay" }}
    />
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is this the same Maya as inside the app?",
    a: "Yes. SSELFIE Studio is where Maya lives — brand memory, generation, Feed Planner, and Academy. What you see here is the same product.",
  },
  {
    q: "How many selfies do I need?",
    a: "Three clear photos is enough to start. More angles and lighting help Maya match you more faithfully, but you can begin with what you already have.",
  },
  {
    q: "Will I recognise myself?",
    a: "That is the point. Maya uses identity-preserving generation tuned for likeness, not a generic avatar.",
  },
  {
    q: "What if I only want the Selfie Guide first?",
    a: "You can start with the Selfie Guide — it is a one-time purchase. When you are ready for Maya, Feed Planner, and the full system, upgrade to Studio.",
  },
  {
    q: "What makes this different from Canva or ChatGPT?",
    a: "Maya is wired into your brand profile, your uploads, and your grid — not a blank canvas every time.",
  },
  {
    q: "Can I cancel Studio?",
    a: "Yes. Membership is cancel-anytime from your account. No lock-in.",
  },
];

// ─── 3D Intro Screen ──────────────────────────────────────────────────────────
const INTRO_LETTERS = ["S", "S", "E", "L", "F", "I", "E"];

function IntroScreen({ onDone }: { onDone: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const lettersRef = useRef<(HTMLSpanElement | null)[]>([]);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const letters = lettersRef.current.filter(Boolean) as HTMLSpanElement[];
    const tagline = taglineRef.current;
    const line = lineRef.current;
    const overlay = overlayRef.current;
    if (!letters.length || !overlay) return;

    // Initial state — letters arrive from depth, no pre-rotation so they settle cleanly
    gsap.set(letters, { opacity: 0, y: 28, filter: "blur(8px)" });
    gsap.set([tagline, line].filter(Boolean), { opacity: 0 });

    let exited = false;
    const exit = () => {
      if (exited) return;
      exited = true;
      mainTl.pause();

      const exitTl = gsap.timeline({ onComplete: onDone });
      exitTl.to([tagline, line].filter(Boolean), { opacity: 0, duration: 0.3, ease: "power2.in" }, 0);
      exitTl.to(letters, {
        opacity: 0,
        filter: "blur(18px)",
        y: -18,
        duration: 0.65,
        ease: "power3.in",
        stagger: { each: 0.03, from: "center" },
      }, 0.1);
      exitTl.to(overlay, { opacity: 0, duration: 0.35, ease: "power2.in" }, 0.55);
    };

    const mainTl = gsap.timeline({
      onComplete: () => {
        // Auto-reveal after intro settles — no interaction required
        setTimeout(exit, 1800);
      },
    });

    // 1 — Letters rise softly into place
    mainTl.to(letters, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 1.4,
      ease: "expo.out",
      stagger: 0.065,
    }, 0.3);

    // 2 — Tagline fades in beneath
    mainTl.to(tagline, { opacity: 1, duration: 1.1, ease: "power2.out" }, 1.3);

    // 3 — Thin rule appears under tagline
    mainTl.to(line, { opacity: 1, scaleX: 1, duration: 0.8, ease: "expo.out" }, 1.8);

    return () => { mainTl.kill(); };
  }, [onDone]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{
        background: "#0F0D0B",
        zIndex: 350,
        cursor: "default",
        overflow: "hidden",
      }}
    >
      {/* Paper noise texture — same system as cream section */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "320px 320px",
          opacity: 0.06,
          mixBlendMode: "screen",
          pointerEvents: "none",
        }}
      />

      {/* Very soft radial glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(196,181,160,0.06) 0%, transparent 75%)",
          pointerEvents: "none",
        }}
      />

      {/* Letters — letterpress on dark: pressed-in shadow */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.28em" }}>
        {INTRO_LETTERS.map((letter, i) => (
          <span
            key={`${letter}-${i}`}
            ref={(el) => { lettersRef.current[i] = el; }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(3.2rem, 10vw, 11rem)",
              fontWeight: 300,
              fontStyle: "normal",
              color: "#F4F0E6",
              display: "inline-block",
              lineHeight: 0.88,
              letterSpacing: "0.05em",
              userSelect: "none",
              textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.07), 1px 1px 0 rgba(0,0,0,0.5)",
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Tagline */}
      <p
        ref={taglineRef}
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontSize: "clamp(0.95rem, 2vw, 1.55rem)",
          fontWeight: 300,
          color: "rgba(244,240,230,0.38)",
          marginTop: "2rem",
          letterSpacing: "0.03em",
          textAlign: "center",
          maxWidth: "30rem",
          lineHeight: 1.3,
          textShadow: "0 1px 4px rgba(0,0,0,0.5)",
        }}
      >
        Brand photos, feed plans, captions — without the chaos.
      </p>

      {/* Thin decorative rule */}
      <div
        ref={lineRef}
        style={{
          width: "3rem",
          height: 1,
          marginTop: "1.75rem",
          background: "rgba(244,240,230,0.18)",
          transformOrigin: "center",
          transform: "scaleX(0)",
          boxShadow: "0 1px 0 rgba(0,0,0,0.4)",
        }}
      />
    </div>
  );
}

function splitWords(words: string[]) {
  return words.map((word, i) => (
    <span key={`${word}-${i}`} className="hero-word">{word}</span>
  ));
}

export default function LandingPageEditorial({ referralCode }: { referralCode?: string | null }) {
  const navRef = useRef<HTMLElement>(null);

  // Hero
  const heroRef = useRef<HTMLElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const heroLineOneRef = useRef<HTMLDivElement>(null);
  const heroLineTwoRef = useRef<HTMLDivElement>(null);
  const heroLineThreeRef = useRef<HTMLDivElement>(null);

  // Demo
  const demoRef = useRef<HTMLElement>(null);
  const demoPromptRef = useRef<HTMLDivElement>(null);
  const demoAttachRef = useRef<HTMLDivElement>(null);
  const demoThinkingRef = useRef<HTMLDivElement>(null);
  const demoResponseRef = useRef<HTMLDivElement>(null);
  const demoCardRef = useRef<HTMLDivElement>(null);
  const demoCaptionRef = useRef<HTMLDivElement>(null);
  const demoActionsRef = useRef<HTMLDivElement>(null);

  // Comparison slider
  const [sliderPos, setSliderPos] = useState(50);
  const sliderDragging = useRef(false);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [introVisible, setIntroVisible] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIntroVisible(false);
    }
  }, []);

  const selfieGuideProduct = getProductById("selfie_guide");
  const membershipProduct = getProductById("sselfie_studio_membership");
  const selfieGuidePrice = selfieGuideProduct ? formatPriceFromCents(selfieGuideProduct.priceInCents) : "€17";
  const membershipPrice = membershipProduct ? formatPriceFromCents(membershipProduct.priceInCents) : "€97";
  const loginHref = buildReferralLoginHref({ returnTo: "/studio", referralCode });
  const selfieGuideHref = appendReferralParam("/selfie-guide", referralCode);

  useEffect(() => {
    trackLandingView();
  }, []);

  useEffect(() => {
    persistReferralCode(referralCode);
  }, [referralCode]);

  useEffect(() => {
    const pricingSection = document.getElementById("pricing");
    if (!pricingSection) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackPricingView();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 },
    );
    observer.observe(pricingSection);
    return () => observer.disconnect();
  }, []);

  const handleStartCheckout = async (tierId: string) => {
    try {
      setCheckoutLoading(tierId);
      const productNames: Record<string, string> = {
        sselfie_studio_membership: "Studio Membership",
      };
      trackCheckoutStart(tierId, undefined);
      trackCTAClick("pricing", productNames[tierId] ?? tierId, "/checkout");
      const clientSecret = await startEmbeddedCheckout(tierId);
      window.location.href = `/checkout?client_secret=${clientSecret}`;
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Checkout error:", error);
      }
      handleCheckoutFailure({
        error,
        source: "landing_editorial_pricing",
        productId: tierId,
        fallbackPath: "/checkout/membership",
      });
      setCheckoutLoading(null);
    }
  };

  // ── Lenis smooth scroll (disabled when user prefers reduced motion) ───────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    const update = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(update);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  // ── Nav glass on scroll ───────────────────────────────────────────────────
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const trigger = ScrollTrigger.create({
      start: "72px top",
      onEnter: () => { nav.style.background = "rgba(15,13,11,0.84)"; nav.style.backdropFilter = "blur(24px)"; },
      onLeaveBack: () => { nav.style.background = "transparent"; nav.style.backdropFilter = "none"; },
    });
    return () => trigger.kill();
  }, []);

  // ── Hero entrance: eyebrow, headline words, subhead, CTAs ────────────────
  useEffect(() => {
    const eyebrow = document.querySelector<HTMLElement>(".hero-eyebrow");
    const subhead = document.querySelector<HTMLElement>(".hero-subhead");
    const ctas = document.querySelector<HTMLElement>(".hero-ctas");
    const words = [heroLineOneRef.current, heroLineTwoRef.current, heroLineThreeRef.current]
      .flatMap((line) => line ? Array.from(line.querySelectorAll<HTMLElement>(".hero-word")) : []);

    if (eyebrow) gsap.fromTo(eyebrow, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: "expo.out", delay: 0.08 });
    if (words.length) gsap.fromTo(words, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1.25, ease: "expo.out", stagger: 0.07, delay: 0.2 });
    if (subhead) gsap.fromTo(subhead, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", delay: 0.72 });
    if (ctas) gsap.fromTo(ctas, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", delay: 0.92 });
  }, []);

  // ── Hero: natural parallax (no pin) + card 3D entrance ───────────────────
  useEffect(() => {
    const hero = heroRef.current;
    const bg = heroBgRef.current;
    if (!hero || !bg) return;
    const ctx = gsap.context(() => {
      gsap.to(bg, {
        yPercent: 16,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
    }, hero);
    return () => ctx.revert();
  }, []);

  // ── Stats count-up ────────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      document.querySelectorAll<HTMLElement>("[data-count-to]").forEach((el) => {
        const to = parseFloat(el.dataset.countTo || "0");
        const counter = { val: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: "top 82%",
          once: true,
          onEnter: () => {
            gsap.to(counter, {
              val: to,
              duration: 2,
              ease: "power3.out",
              onUpdate() { el.textContent = Math.round(counter.val).toString(); },
            });
          },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  // ── Maya demo: autoplay chat sequence ─────────────────────────────────────
  useEffect(() => {
    const section = demoRef.current;
    const prompt = demoPromptRef.current;
    const attach = demoAttachRef.current;
    const thinking = demoThinkingRef.current;
    const response = demoResponseRef.current;
    const card = demoCardRef.current;
    const caption = demoCaptionRef.current;
    const actions = demoActionsRef.current;
    if (!section || !prompt || !attach || !thinking || !response || !card || !caption || !actions) return;

    const dots = Array.from(thinking.querySelectorAll<HTMLElement>(".thinking-dot"));
    const btns = Array.from(actions.children) as HTMLElement[];

    // Instant reset — called only while elements are invisible
    const reset = () => {
      gsap.set(prompt, { opacity: 0, y: 0, text: { value: "" } });
      gsap.set(attach, { opacity: 0, y: 14, scale: 0.96 });
      gsap.set(thinking, { opacity: 0 });
      gsap.set(response, { opacity: 0, y: 12 });
      gsap.set(card, { opacity: 0, scale: 0.95, filter: "blur(24px)" });
      gsap.set(caption, { opacity: 0, y: 12 });
      gsap.set(btns, { opacity: 0, y: 10 });
    };

    const play = () => {
      const tl = gsap.timeline({
        defaults: { ease: "power2.out" },
      });

      // Beat 1 — user message types in (slow, readable)
      tl.to(prompt, { opacity: 1, duration: 0.15 }, 0);
      tl.to(prompt, {
        duration: 2.6,
        text: {
          value:
            "Launch week for my new offer. I attached a raw phone photo — need a polished brand shot and a caption that sounds like me, not generic AI.",
          delimiter: "",
        },
        ease: "none",
      }, 0.18);

      // Beat 2 — raw photo attachment rises up (pause after typing finishes)
      tl.to(attach, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out" }, 3.05);

      // Beat 3 — Maya thinking (she is reviewing the photo — longer hold)
      tl.to(thinking, { opacity: 1, duration: 0.2 }, 4.0);
      tl.to(dots, { opacity: 1, scale: 1.3, yoyo: true, repeat: 7, stagger: 0.12, duration: 0.2 }, 4.15);
      tl.to(thinking, { opacity: 0, duration: 0.2 }, 5.85);

      // Beat 4 — Maya response text
      tl.to(response, { opacity: 1, y: 0, duration: 0.5 }, 6.1);

      // Beat 5 — publication quality image materialises blur → sharp (dramatic)
      tl.to(card, {
        opacity: 1,
        scale: 1,
        filter: "blur(0px)",
        duration: 1.0,
        ease: "power3.out",
      }, 7.0);

      // Beat 6 — caption slides in (give the image a moment to breathe first)
      tl.to(caption, { opacity: 1, y: 0, duration: 0.5 }, 8.2);

      // Beat 7 — action buttons appear
      tl.to(btns, { opacity: 1, y: 0, duration: 0.35, stagger: 0.14 }, 8.8);
    };

    const ctx = gsap.context(() => {
      reset();
      ScrollTrigger.create({
        trigger: section,
        start: "top 65%",
        once: true,
        onEnter: () => play(),
      });
    }, section);

    return () => ctx.revert();
  }, []);

  // ── Comparison slider drag ────────────────────────────────────────────────
  useEffect(() => {
    const container = sliderContainerRef.current;
    if (!container) return;
    const calcPos = (clientX: number) => {
      const rect = container.getBoundingClientRect();
      return Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 4), 96);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!sliderDragging.current) return;
      setSliderPos(calcPos(e.clientX));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!sliderDragging.current) return;
      setSliderPos(calcPos(e.touches[0].clientX));
    };
    const onUp = () => { sliderDragging.current = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  // ── Comparison slider entrance animation ──────────────────────────────────
  useEffect(() => {
    const container = sliderContainerRef.current;
    if (!container) return;
    const counter = { pos: 88 };
    ScrollTrigger.create({
      trigger: container,
      start: "top 62%",
      once: true,
      onEnter: () => {
        gsap.to(counter, {
          pos: 50,
          duration: 1.6,
          ease: "expo.out",
          onUpdate: () => setSliderPos(counter.pos),
        });
      },
    });
  }, []);

  // ── Gallery removed ───────────────────────────────────────────────────────
  useEffect(() => {
    return () => {};
  }, []);

  // ── Universal scroll-reveal ───────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        gsap.fromTo(el, { y: 48, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.95, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <>
      <style>{`
        :root { color-scheme: dark; }
        html, body { overflow-x: hidden; }
        .hero-word { display: inline-block; margin-right: 0.15em; }
        .section-shell { padding: 5rem 1.25rem; }
        .eyebrow {
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-family: var(--font-body);
        }
        .editorial-title {
          font-family: var(--font-display);
          font-size: clamp(2.8rem, 8vw, 7.5rem);
          font-weight: 300;
          line-height: 0.92;
          letter-spacing: -0.042em;
        }
        .stat-num {
          font-family: var(--font-display);
          font-size: clamp(4.5rem, 11vw, 9.5rem);
          font-weight: 300;
          line-height: 0.88;
          letter-spacing: -0.045em;
          color: #1A1714;
          text-shadow: 1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.1);
        }
        .gallery-card {
          width: 240px;
          height: 380px;
          border-radius: 0;
          overflow: hidden;
          transform-style: preserve-3d;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45);
        }
        .gallery-track::-webkit-scrollbar { display: none; }
        button, a { -webkit-tap-highlight-color: transparent; }
        .scroll-indicator {
          width: 1px;
          height: 52px;
          background: linear-gradient(to bottom, rgba(244,240,230,0.55), transparent);
          animation: scrollPulse 2.5s ease-in-out infinite;
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.55) translateY(-6px); transform-origin: top; }
          55% { opacity: 1; transform: scaleY(1) translateY(0); transform-origin: top; }
        }
        .proof-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.55rem 0.95rem;
          border-radius: 0;
          font-size: 0.7rem;
          font-weight: 400;
          letter-spacing: 0.03em;
          font-family: var(--font-body);
          line-height: 1.5;
        }
        /* ── Lookbook grid ── */
        .lookbook-grid {
          display: grid;
          grid-template-columns: 1fr 1.28fr;
          grid-template-rows: 54vh 46vh;
          gap: 5px;
        }
        .lookbook-card {
          position: relative;
          overflow: hidden;
        }
        .lookbook-card img {
          transition: transform 1.1s cubic-bezier(0.25, 0.1, 0.25, 1);
        }
        .lookbook-card:hover img {
          transform: scale(1.055);
        }
        .lookbook-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1.75rem 1.5rem 1.35rem;
          background: linear-gradient(0deg, rgba(10,9,8,0.68) 0%, rgba(10,9,8,0) 100%);
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.42s ease, transform 0.42s ease;
        }
        .lookbook-card:hover .lookbook-caption {
          opacity: 1;
          transform: translateY(0);
        }
        @media (max-width: 767px) {
          .lookbook-grid {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 48vw 48vw;
            gap: 3px;
          }
        }
        /* ── Statement quote ── */
        .statement-quote {
          font-family: var(--font-display);
          font-style: italic;
          font-weight: 300;
          font-size: clamp(1.8rem, 5vw, 4rem);
          line-height: 1.1;
          letter-spacing: -0.025em;
          color: rgba(244,240,230,0.72);
        }
        .statement-quote em { font-style: normal; color: #F4F0E6; }
        @media (min-width: 480px) {
          .editorial-title { font-size: clamp(3.2rem, 8.5vw, 7.5rem); }
        }
        @media (min-width: 768px) {
          .section-shell { padding: 9rem 3.5rem; }
          .gallery-card { width: 320px; height: 500px; }
        }
        @media (min-width: 1024px) {
          .gallery-card { width: 340px; height: 520px; }
        }
      `}</style>

      <GrainCanvas />

      {/* ── SSELFIE 3D Intro ─────────────────────────────────────────── */}
      {introVisible && <IntroScreen onDone={() => setIntroVisible(false)} />}

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav
        ref={navRef}
        className="fixed inset-x-0 top-0 z-[100] flex items-center justify-between px-5 py-4 transition-all duration-300 md:px-10"
      >
        <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.3rem" }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 300, fontStyle: "normal", letterSpacing: "0.32em", color: "#F4F0E6", lineHeight: 1, display: "block", textShadow: "0 1px 4px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.05)" }}>
            SSELFIE
          </span>
          <div style={{ height: "0.5px", width: "100%", background: "rgba(244,240,230,0.28)", boxShadow: "0 1px 0 rgba(0,0,0,0.35)" }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.46rem", letterSpacing: "0.45em", textTransform: "uppercase", color: "rgba(244,240,230,0.35)", display: "block" }}>
            STUDIO
          </span>
        </Link>
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href={loginHref}
            className="eyebrow hidden sm:inline-flex"
            style={{ color: "rgba(244,240,230,0.44)", padding: "0.6rem 0.85rem" }}
            onClick={() => trackCTAClick("nav", "Login", loginHref)}
          >
            Login
          </Link>
          <Link
            href="#pricing"
            className="eyebrow nav-cta-btn"
            style={{ borderRadius: 0, background: "#F4F0E6", color: "#0F0D0B", padding: "0.75rem 1.25rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.12), 0 4px 18px rgba(0,0,0,0.32)", textShadow: "0 1px 1px rgba(0,0,0,0.1)", whiteSpace: "nowrap", letterSpacing: "0.2em" }}
            onClick={() => trackCTAClick("nav", "Get started", "#pricing")}
          >
            Get started
          </Link>
        </div>
      </nav>

      <main style={{ background: "#0F0D0B" }}>

        {/* ══════════════════════════════════════════════════════════════════
            S1 — HERO
            3-layer parallax: bg 0.3x, card 0.6x, text fixed
            Full-screen parallax hero
        ══════════════════════════════════════════════════════════════════ */}
        <section ref={heroRef} className="relative min-h-screen overflow-hidden" style={{ background: "#0F0D0B" }}>

          {/* Layer 1: Background — parallax 0.3x */}
          <div ref={heroBgRef} className="absolute inset-0">
            <Image
              src={ASSETS.heroBg}
                  alt=""
                  fill
                  priority
                  sizes="100vw"
              className="object-cover"
              style={{ objectPosition: "center 55%" }}
            />
            {/* Base dark veil — keeps image visible but text legible */}
            <div
              className="absolute inset-0"
              style={{ background: "rgba(10,9,8,0.48)" }}
            />
            {/* Directional gradient — darker at top (nav area) and bottom (text area) */}
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, rgba(10,9,8,0.38) 0%, rgba(10,9,8,0.0) 38%, rgba(10,9,8,0.0) 52%, rgba(10,9,8,0.72) 100%)" }}
            />
          </div>

          {/* Layer 2: Hero text — foreground */}
          <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col justify-end px-5 pb-14 pt-28 md:px-10 md:pb-20">
            <div className="max-w-[52rem]">
              <p className="hero-eyebrow eyebrow mb-6" style={{ color: "rgba(244,240,230,0.38)" }}>
                For women rebuilding their visibility
              </p>
              <div ref={heroLineOneRef} className="editorial-title" style={{ color: "#F4F0E6" }}>
                {splitWords(["Stay visible,"])}
              </div>
              <div ref={heroLineTwoRef} className="editorial-title" style={{ color: "#F4F0E6" }}>
                {splitWords(["even when you"])}
                <span className="hero-word" style={{ color: "transparent", WebkitTextStroke: "1.5px #F4F0E6" }}>
                  &apos;re
                </span>
              </div>
              <div ref={heroLineThreeRef} className="editorial-title mb-7" style={{ color: "#F4F0E6" }}>
                {splitWords(["running on empty."])}
              </div>
              <p
                className="hero-subhead max-w-[29rem] text-[0.96rem] leading-[1.9]"
                style={{ color: "rgba(244,240,230,0.56)" }}
              >
                Some seasons make you disappear a little. Not because you stopped caring. Because showing your face,
                finding the words, and staying consistent gets heavy. SSELFIE gives you a way back in.
              </p>
              <div className="hero-ctas mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={selfieGuideHref}
                  className="eyebrow inline-flex items-center justify-center"
                  style={{ borderRadius: 0, background: "#F4F0E6", color: "#0F0D0B", padding: "1rem 1.9rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.12), 0 12px 40px rgba(0,0,0,0.4)", textShadow: "0 1px 1px rgba(0,0,0,0.1)" }}
                  onClick={() => trackSelfieGuideEntryClick("hero_editorial")}
                >
                  Start with the Selfie Guide
                </Link>
                <Link
                  href="#demo"
                  className="eyebrow inline-flex items-center justify-center"
                  style={{ borderRadius: 0, border: "1px solid rgba(244,240,230,0.18)", color: "rgba(244,240,230,0.54)", padding: "1rem 1.9rem" }}
                  onClick={() => trackCTAClick("hero", "See how Studio works", "#demo")}
                >
                  See how Studio works
                </Link>
              </div>
            </div>
            {/* Scroll indicator */}
            <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center">
              <div className="scroll-indicator" />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S2 — DATA CONVICTION STRIP
            4 animated stats on cream — count-up on viewport entry
        ══════════════════════════════════════════════════════════════════ */}
        <section className="section-shell" style={{ background: "#EDE9E2", position: "relative", overflow: "hidden" }}>
          {/* Paper texture — multiply on cream */}
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.18, mixBlendMode: "multiply", pointerEvents: "none", zIndex: 0 }} />
          <div className="relative z-[1] mx-auto max-w-[1320px]">
            <p className="eyebrow mb-12 text-center" style={{ color: "rgba(26,23,20,0.36)" }} data-reveal>
              Why speed and consistency matter online
            </p>
            <div className="grid grid-cols-2 gap-10 md:grid-cols-4 md:divide-x md:divide-[rgba(26,23,20,0.1)]">

              <div className="flex flex-col items-center text-center md:px-8" data-reveal>
                <div className="stat-num">
                  <span data-count-to="3">0</span>
                </div>
                <p className="eyebrow mt-4 max-w-[8.5rem] leading-[1.75]" style={{ color: "rgba(26,23,20,0.42)" }}>
                  selfies to start training Maya on your face
                </p>
              </div>

              <div className="flex flex-col items-center text-center md:px-8" data-reveal>
                <div className="stat-num">
                  <span data-count-to="90">0</span>
                  <span style={{ fontSize: "clamp(2.2rem,5vw,5rem)" }}>s</span>
                </div>
                <p className="eyebrow mt-4 max-w-[8.5rem] leading-[1.75]" style={{ color: "rgba(26,23,20,0.42)" }}>
                  from a clear brief to a usable visual direction
                </p>
              </div>

              <div className="flex flex-col items-center text-center md:px-8" data-reveal>
                <div className="stat-num">
                  <span data-count-to="180">0</span>
                  <span style={{ fontSize: "clamp(2.2rem,5vw,5rem)" }}>K</span>
                  <span>+</span>
                </div>
                <p className="eyebrow mt-4 max-w-[8.5rem] leading-[1.75]" style={{ color: "rgba(26,23,20,0.42)" }}>
                  people in Sandra&apos;s community learning out loud
                </p>
              </div>

              <div className="flex flex-col items-center text-center md:px-8" data-reveal>
                <div className="stat-num">
                  <span data-count-to="9">0</span>
                </div>
                <p className="eyebrow mt-4 max-w-[8.5rem] leading-[1.75]" style={{ color: "rgba(26,23,20,0.42)" }}>
                  grid posts planned at once in Feed Planner
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S3 — VISUAL PROOF: THE LOOKBOOK
            Short editorial intro + full-bleed luxury image grid
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ background: "#0F0D0B", position: "relative", overflow: "hidden" }}>
          {/* Paper texture — screen on dark */}
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.05, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />

          {/* Short intro */}
          <div className="relative z-[1] px-5 pt-20 pb-10 md:px-10 md:pt-24 md:pb-12">
            <div className="mx-auto max-w-[1320px] flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="eyebrow mb-4" style={{ color: "rgba(244,240,230,0.24)" }} data-reveal>
                  Why the feed still feels hard
                </p>
                <h2
                  data-reveal
                  className="editorial-title"
                  style={{ color: "#F4F0E6", fontSize: "clamp(2.6rem,6.5vw,5.2rem)", maxWidth: "26rem" }}
                >
                  Most personal brands look interchangeable.
                </h2>
              </div>
              <p
                data-reveal
                className="eyebrow pb-1"
                style={{ color: "rgba(244,240,230,0.2)", letterSpacing: "0.28em", flexShrink: 0 }}
              >
                Visual proof / The lookbook
              </p>
            </div>
          </div>

          {/* Full-bleed lookbook grid */}
          <div className="relative z-[1] lookbook-grid">

            {/* A — top-left: Lifestyle interior (warm, editorial) */}
            <div className="lookbook-card">
              <Image
                src={ASSETS.lookbookInterior}
                alt="Lifestyle interior — Sandra in a bright modern space"
                fill
                className="object-cover"
                style={{ objectPosition: "center center" }}
              />
              <div className="lookbook-caption">
                <span className="eyebrow" style={{ color: "rgba(244,240,230,0.78)", fontSize: "0.6rem" }}>
                  Lifestyle interior
                </span>
              </div>
            </div>

            {/* B — top-right: Agent city portrait (MLS hero) */}
            <div className="lookbook-card">
              <Image
                src={ASSETS.lookbookCity}
                alt="Portrait in the city"
                fill
                className="object-cover"
                style={{ objectPosition: "center 18%" }}
              />
              <div className="lookbook-caption">
                <span className="eyebrow" style={{ color: "rgba(244,240,230,0.78)", fontSize: "0.6rem" }}>
                  City portrait
                </span>
              </div>
            </div>

            {/* C — bottom-left: Agent at villa (agent at property) */}
            <div className="lookbook-card">
              <Image
                src={ASSETS.lookbookVilla}
                alt="On location — professional portrait"
                fill
                className="object-cover"
                style={{ objectPosition: "center 30%" }}
              />
              <div className="lookbook-caption">
                <span className="eyebrow" style={{ color: "rgba(244,240,230,0.78)", fontSize: "0.6rem" }}>
                  On location
                </span>
              </div>
            </div>

            {/* D — bottom-right: Arched shelving (Instagram-ready content) */}
            <div className="lookbook-card">
              <Image
                src={ASSETS.lookbookShelving}
                alt="Instagram-ready interior content"
                fill
                className="object-cover"
                style={{ objectPosition: "center center" }}
              />
              <div className="lookbook-caption">
                <span className="eyebrow" style={{ color: "rgba(244,240,230,0.78)", fontSize: "0.6rem" }}>
                  Instagram-ready content
                </span>
              </div>
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S3.5 — STATEMENT BREAK
            Single powerful editorial statement — maximum negative space
        ══════════════════════════════════════════════════════════════════ */}
        <section
          style={{ background: "#0F0D0B", borderTop: "1px solid rgba(244,240,230,0.05)", borderBottom: "1px solid rgba(244,240,230,0.05)", position: "relative", overflow: "hidden" }}
        >
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.05, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />
          <div
            className="relative z-[1] mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-28"
          >
            <p
              data-reveal
              className="statement-quote max-w-[56rem]"
            >
              People decide in seconds. <em>Always.</em> The question is whether your grid makes them stay.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S4 — MAYA DEMO
            Left: publication quality output  Right: autoplay chat sequence
            Raw photo → Maya → publication result + caption
        ══════════════════════════════════════════════════════════════════ */}
        <section
          id="demo"
          ref={demoRef}
          className="relative overflow-hidden"
          style={{ background: "#0F0D0B" }}
        >
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.05, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />
          <div className="relative z-[1] grid md:grid-cols-2" style={{ minHeight: "100svh" }}>

            {/* Left: the finished result — what Maya creates */}
            <div className="relative hidden md:block">
              <Image
                src={ASSETS.publicationQuality}
                alt="Publication-quality image generated by Maya"
                fill
                className="object-cover"
                style={{ objectPosition: "center 18%" }}
              />
              {/* Gradient toward the chat panel */}
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(90deg, rgba(15,13,11,0) 52%, rgba(15,13,11,0.85) 100%)" }}
              />
              {/* Label — "Maya output" bottom left */}
              <div
                className="absolute bottom-6 left-6 flex items-center gap-2 px-3 py-2"
                style={{ borderRadius: 0, background: "rgba(15,13,11,0.72)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(244,240,230,0.1)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#7EE8A2" }} />
                <span className="eyebrow" style={{ color: "rgba(244,240,230,0.78)", fontSize: "0.58rem" }}>
                  Maya output
                </span>
              </div>
            </div>

            {/* Right: chat */}
            <div
              className="relative flex flex-col justify-center px-5 py-14 md:px-10 md:py-20"
              style={{ background: "#0F0D0B" }}
            >
              <p className="eyebrow mb-8" style={{ color: "rgba(244,240,230,0.26)" }}>
                Brief her like you would text a colleague
              </p>

              <div className="flex flex-col gap-3">

                {/* User message + raw photo attachment */}
                <div className="flex flex-col items-end gap-2">
                  {/* Text bubble */}
                  <div
                    ref={demoPromptRef}
                    className="max-w-[88%] px-4 py-3.5 text-[0.92rem] leading-7"
                    style={{ borderRadius: 0, background: "rgba(244,240,230,0.1)", color: "rgba(244,240,230,0.88)", minHeight: "3.5rem" }}
                  />
                  {/* Raw photo thumbnail — slides up after text */}
                  <div
                    ref={demoAttachRef}
                    className="overflow-hidden"
                    style={{ width: "58%", maxWidth: "220px", borderRadius: 0 }}
                  >
                    <div className="relative" style={{ aspectRatio: "4/3" }}>
                      <Image
                        src={ASSETS.rawshot}
                        alt="Raw property photo uploaded by agent"
                        fill
                        className="object-cover"
                        style={{ objectPosition: "center 40%" }}
                      />
                    </div>
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ background: "rgba(244,240,230,0.07)", borderTop: "1px solid rgba(244,240,230,0.05)" }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(244,240,230,0.3)", flexShrink: 0, display: "inline-block" }} />
                      <span className="eyebrow" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>
                        raw photo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Maya thinking */}
                <div
                  ref={demoThinkingRef}
                  className="inline-flex w-fit items-center gap-2 border border-[rgba(196,181,160,0.15)] bg-[rgba(196,181,160,0.07)] px-3 py-2 text-xs uppercase tracking-[0.24em]"
                  style={{ borderRadius: 0, color: "rgba(244,240,230,0.32)" }}
                >
                  Maya is working
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#C4B5A0] opacity-40" />
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#C4B5A0] opacity-40" />
                  <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[#C4B5A0] opacity-40" />
                </div>

                {/* Maya response text */}
                <div
                  ref={demoResponseRef}
                  className="max-w-[88%] px-4 py-3.5 text-[0.92rem] leading-7"
                  style={{ borderRadius: 0, background: "rgba(244,240,230,0.06)", color: "rgba(244,240,230,0.7)" }}
                >
                  Got it. I will match your lighting, keep your face true to reference, and give you a caption in your voice — ready to post.
                </div>

                {/* Publication quality result materialises */}
                <div
                  ref={demoCardRef}
                  className="overflow-hidden"
                  style={{ borderRadius: 0, width: "70%" }}
                >
                  <Image
                    src={ASSETS.publicationQuality}
                    alt="Publication-quality image by Maya"
                    width={960}
                    height={1200}
                    className="h-auto w-full object-cover"
                    style={{ objectPosition: "center top" }}
                  />
                </div>

                {/* Maya-voice caption */}
                <div
                  ref={demoCaptionRef}
                  className="max-w-[88%] px-4 py-3.5 text-[0.87rem] leading-7"
                  style={{
                    borderRadius: 0,
                    background: "rgba(244,240,230,0.06)",
                    color: "rgba(244,240,230,0.52)",
                    borderTop: "1px solid rgba(196,181,160,0.2)",
                  }}
                >
                  Caption: Quiet confidence beats loud posting. Here is the version I would put on the feed today — tweak the CTA if you want it softer.
                </div>

                {/* Actions */}
                <div ref={demoActionsRef} className="flex flex-wrap gap-2.5 pt-1">
                  {["Download", "Copy caption"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      className="eyebrow px-4 py-3"
                      style={
                        label === "Download"
                          ? { borderRadius: 0, background: "#F4F0E6", color: "#0F0D0B", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -2px 0 rgba(0,0,0,0.12)", textShadow: "0 1px 1px rgba(0,0,0,0.1)" }
                          : { borderRadius: 0, border: "1px solid rgba(244,240,230,0.16)", color: "rgba(244,240,230,0.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S5 — TRANSFORMATION: BEFORE AND AFTER
            Full-width drag-slider Instagram profile comparison
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ background: "#0F0D0B", position: "relative", overflow: "hidden" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.05, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />

          {/* Section header */}
          <div className="relative z-[1] px-5 pt-20 pb-10 md:px-10 md:pt-24 md:pb-12">
            <div className="mx-auto max-w-[1320px]">
              <p className="eyebrow mb-4" data-reveal style={{ color: "rgba(244,240,230,0.24)" }}>
                Transformation. Before and after.
              </p>
              <h2
                data-reveal
                className="editorial-title"
                style={{ color: "#F4F0E6", fontSize: "clamp(2.6rem,6.5vw,5.2rem)" }}
              >
                Your grid decides
                <br />
                <span style={{ color: "transparent", WebkitTextStroke: "1.2px rgba(244,240,230,0.42)" }}>if they trust you.</span>
              </h2>
              <p data-reveal className="eyebrow mt-6" style={{ color: "rgba(244,240,230,0.2)" }}>
                Drag to compare
              </p>
            </div>
          </div>

          {/* Drag-slider comparison — centered phone-width, full natural height */}
          <div className="relative z-[1] px-5 pb-20 md:px-10">
            <div
              ref={sliderContainerRef}
              className="relative mx-auto overflow-hidden"
              style={{
                maxWidth: 560,
                cursor: "ew-resize",
                userSelect: "none",
                touchAction: "none",
                borderRadius: 0,
                boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(244,240,230,0.06)",
              }}
              onMouseDown={() => { sliderDragging.current = true; }}
              onTouchStart={() => { sliderDragging.current = true; }}
            >

              {/* ── AFTER (base layer — sets natural height) ── */}
              <Image
                src={ASSETS.afterGrid}
                alt="Your grid after — cohesive brand feed"
                width={576}
                height={1024}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
              />

              {/* ── BEFORE (absolute overlay with clip-path) ── */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
              >
                <Image
                  src={ASSETS.beforeGrid}
                  alt="Your grid before — mixed casual posts"
                  width={576}
                  height={1024}
                  style={{ width: "100%", height: "auto", display: "block" }}
                  priority
                />
              </div>

              {/* ── Drag slider handle ── */}
              <div
                className="absolute top-0 bottom-0"
                style={{ left: `${sliderPos}%`, transform: "translateX(-50%)", width: 2, pointerEvents: "none" }}
              >
                <div className="absolute inset-0" style={{ background: "rgba(244,240,230,0.95)", boxShadow: "0 0 16px rgba(0,0,0,0.5)" }} />
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    top: "38%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#F4F0E6",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    <div style={{ width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderRight: "6px solid rgba(26,23,20,0.55)" }} />
                    <div style={{ width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "6px solid rgba(26,23,20,0.55)" }} />
                  </div>
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-4 left-4 pointer-events-none">
                <span className="eyebrow px-3 py-1.5" style={{ borderRadius: 0, background: "rgba(255,255,255,0.88)", color: "rgba(26,23,20,0.6)", fontSize: "0.58rem", backdropFilter: "blur(8px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.1)" }}>
                  Your grid before
                </span>
              </div>
              <div className="absolute top-4 right-4 pointer-events-none">
                <span className="eyebrow px-3 py-1.5" style={{ borderRadius: 0, background: "rgba(15,13,11,0.78)", color: "rgba(244,240,230,0.85)", fontSize: "0.58rem", backdropFilter: "blur(8px)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.3)" }}>
                  Your grid after
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S6 — FEATURES: EVERYTHING YOU NEED
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ background: "#EDE9E2", position: "relative", overflow: "hidden" }}>

          {/* Stucco / paper noise texture overlay */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "320px 320px",
              opacity: 0.22,
              mixBlendMode: "multiply",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />

          <div className="relative z-[1] mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-28">

            {/* Header */}
            <div className="mb-16 md:mb-20">
              <p className="eyebrow mb-5" data-reveal style={{ color: "rgba(50,60,50,0.42)" }}>
                What Maya gives you
              </p>
              <h2
                data-reveal
                className="editorial-title"
                style={{ color: "#1C1F1A", fontSize: "clamp(2.6rem,6.5vw,5.2rem)", maxWidth: "18ch" }}
              >
                Everything you need
                <br />
                <span style={{ color: "transparent", WebkitTextStroke: "1.2px rgba(50,60,50,0.32)" }}>to show up daily.</span>
              </h2>
              <p
                data-reveal
                className="mt-6 text-[1.05rem] leading-[1.85]"
                style={{ color: "rgba(40,50,40,0.52)", maxWidth: "42ch" }}
              >
                Maya doesn&apos;t just create content.
                She makes sure you show up, every day, without thinking about it.
              </p>
            </div>

            {/* 2×2 feature grid */}
            <div
              className="grid gap-px md:grid-cols-2"
              style={{
                border: "1px solid rgba(255,255,255,0.72)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
                outline: "1px solid rgba(90,100,88,0.1)",
                outlineOffset: "-1px",
              }}
            >
              {[
                {
                  n: "01",
                  label: "No creative department required",
                  title: "You do not need a team on retainer",
                  body: "Maya handles the visual direction, the caption, and the next post idea. You approve and publish.",
                },
                {
                  n: "02",
                  label: "Something worth posting",
                  title: "Never start from a blank grid again",
                  body: "Brand shots, carousels, launch assets, refresh portraits — generated in your style, not a generic template.",
                },
                {
                  n: "03",
                  label: "Stay visible between launches",
                  title: "Show up even when life is loud",
                  body: "Feed Planner keeps the arc coherent so you do not disappear the week things get busy.",
                },
                {
                  n: "04",
                  label: "A profile that feels considered",
                  title: "Look like you have a studio behind you",
                  body: "When people land on your page they see intention — not random quotes and stock moods.",
                },
              ].map((item) => (
                <div
                  key={item.n}
                  data-reveal
                  className="relative flex flex-col justify-between gap-6 p-8 md:p-12"
                  style={{ background: "#EDE9E2", minHeight: "18rem" }}
                >
                  {/* Ghost number — embossed */}
                  <div
                    className="absolute top-6 right-8 leading-none select-none pointer-events-none"
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(4rem,8vw,7rem)",
                      fontWeight: 300,
                      color: "rgba(90,100,88,0.18)",
                      lineHeight: 1,
                      textShadow: "1px 2px 3px rgba(255,255,255,0.92), -1px -1px 2px rgba(60,70,58,0.1)",
                    }}
                  >
                    {item.n}
                  </div>

                  {/* Content */}
                  <div>
                    <p
                      className="eyebrow mb-4"
                      style={{ color: "rgba(26,23,20,0.35)", fontSize: "0.62rem" }}
                    >
                      {item.label}
                    </p>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "clamp(1.5rem,2.8vw,2.2rem)",
                        fontWeight: 400,
                        color: "#1A1714",
                        lineHeight: 1.18,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="mt-4 text-[0.96rem] leading-[1.85]"
                      style={{ color: "rgba(26,23,20,0.5)", maxWidth: "36ch" }}
                    >
                      {item.body}
                    </p>
                  </div>

                  {/* Bottom rule — embossed */}
                  <div style={{ height: 1, background: "rgba(60,70,58,0.1)", boxShadow: "0 1px 0 rgba(255,255,255,0.75)" }} />
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S7 — WHAT SSELFIE CREATES
            Editorial asymmetric lookbook grid
        ══════════════════════════════════════════════════════════════════ */}
        <section style={{ background: "#0F0D0B", position: "relative", overflow: "hidden" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.05, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />

          {/* Section header */}
          <div className="relative z-[1] mx-auto max-w-[1320px] px-5 pt-20 pb-12 md:px-10 md:pt-28 md:pb-16">
            <p className="eyebrow mb-5" data-reveal style={{ color: "rgba(244,240,230,0.22)" }}>
              What SSELFIE creates
            </p>
            <h2
              data-reveal
              className="editorial-title"
              style={{ color: "#F4F0E6", fontSize: "clamp(2.8rem,6.8vw,5.6rem)" }}
            >
              Everything done
              <br />
              <span style={{ color: "transparent", WebkitTextStroke: "1.2px rgba(244,240,230,0.36)" }}>for you.</span>
            </h2>
            <p
              data-reveal
              className="mt-6 text-[1.05rem] leading-[1.85]"
              style={{ color: "rgba(244,240,230,0.38)", maxWidth: "38ch" }}
            >
              Your photos. Your content. Your posts.
              <br />
              Ready when you need them.
            </p>
          </div>

          {/* Lookbook grid — top: asymmetric 6-col | bottom: 4-col equal */}
          <div className="relative z-[1]" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div className="grid grid-cols-2 gap-[2px] md:grid-cols-6">

            {/* 01 — HERO: agent-intro, spans 4 cols + 2 rows → square at 4/6 width */}
            <div
              className="group relative col-span-2 overflow-hidden md:col-span-4 md:row-span-2"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featAgentIntro}
                alt="Brand photo — campaign ready"
                fill
                sizes="(max-width: 768px) 100vw, 67vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center 25%" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.85) 0%, rgba(15,13,11,0.08) 48%, transparent 100%)" }} />
              <div className="absolute bottom-7 left-7">
                <p className="eyebrow mb-2" style={{ color: "rgba(244,240,230,0.38)", fontSize: "0.58rem" }}>01</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem,2.6vw,2.6rem)", color: "#F4F0E6", lineHeight: 1.1, fontWeight: 400 }}>
                  Brand photos
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.76rem,1.1vw,0.9rem)", color: "rgba(244,240,230,0.52)", marginTop: 6 }}>
                  Clean. On-brief. Ready to post.
                </p>
              </div>
            </div>

            {/* 02 — RIGHT TOP: headshot portrait */}
            <div
              className="group relative col-span-1 overflow-hidden md:col-span-2"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featHeadshot}
                alt="Editorial headshot"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center 12%" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.82) 0%, transparent 58%)" }} />
              <div className="absolute bottom-5 left-5">
                <p className="eyebrow mb-1.5" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>02</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,1.6vw,1.6rem)", color: "#F4F0E6", lineHeight: 1.12, fontWeight: 400 }}>
                  Headshots
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem,0.9vw,0.8rem)", color: "rgba(244,240,230,0.48)", marginTop: 4 }}>
                  Always look current.
                </p>
              </div>
            </div>

            {/* 03 — RIGHT BOTTOM: open-house at villa entrance */}
            <div
              className="group relative col-span-1 overflow-hidden md:col-span-2"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featOpenHouse}
                alt="You in the scene"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center 15%" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.82) 0%, transparent 58%)" }} />
              <div className="absolute bottom-5 left-5">
                <p className="eyebrow mb-1.5" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>03</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,1.6vw,1.6rem)", color: "#F4F0E6", lineHeight: 1.12, fontWeight: 400 }}>
                  You in the story
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem,0.9vw,0.8rem)", color: "rgba(244,240,230,0.48)", marginTop: 4 }}>
                  Same face. New contexts.
                </p>
              </div>
            </div>

          </div>{/* end top 6-col grid */}

          {/* Bottom: 4 equal 1:1 cards */}
          <div className="grid grid-cols-2 gap-[2px] md:grid-cols-4">

            {/* 04 — market-update, Lifestyle content */}
            <div
              className="group relative col-span-1 overflow-hidden md:col-span-1"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featMarket}
                alt="Lifestyle content"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center 30%" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.78) 0%, transparent 55%)" }} />
              <div className="absolute bottom-5 left-5">
                <p className="eyebrow mb-1.5" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>04</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,1.6vw,1.6rem)", color: "#F4F0E6", lineHeight: 1.12, fontWeight: 400 }}>
                  Lifestyle content
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem,0.9vw,0.8rem)", color: "rgba(244,240,230,0.48)", marginTop: 4 }}>
                  Mood, light, and texture — on brand.
                </p>
              </div>
            </div>

            {/* 05 — agent2, Ready-to-post content */}
            <div
              className="group relative col-span-1 overflow-hidden md:col-span-1"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featAgent2}
                alt="Instagram-ready content"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center center" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.8) 0%, transparent 55%)" }} />
              <div className="absolute bottom-5 left-5">
                <p className="eyebrow mb-1.5" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>05</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,1.6vw,1.6rem)", color: "#F4F0E6", lineHeight: 1.12, fontWeight: 400 }}>
                  Ready-to-post content
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem,0.9vw,0.8rem)", color: "rgba(244,240,230,0.48)", marginTop: 4 }}>
                  Download. Post. Done.
                </p>
              </div>
            </div>

            {/* 06 — Details & interior shots */}
            <div
              className="group relative col-span-1 overflow-hidden md:col-span-1"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featInterior}
                alt="Campaign-ready scene"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center 38%" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.82) 0%, transparent 55%)" }} />
              <div className="absolute bottom-5 left-5">
                <p className="eyebrow mb-1.5" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>06</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,1.6vw,1.6rem)", color: "#F4F0E6", lineHeight: 1.12, fontWeight: 400 }}>
                  Details & interior
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem,0.9vw,0.8rem)", color: "rgba(244,240,230,0.48)", marginTop: 4 }}>
                  Make every room look considered.
                </p>
              </div>
            </div>

            {/* 07 — BOTTOM RIGHT: luxury property exterior */}
            <div
              className="group relative col-span-1 overflow-hidden md:col-span-1"
              style={{ aspectRatio: "1/1" }}
            >
              <Image
                src={ASSETS.featProperty}
                alt="Professional portrait — launch and momentum posts"
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                style={{ objectPosition: "center 25%" }}
              />
              <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,13,11,0.78) 0%, transparent 55%)" }} />
              <div className="absolute bottom-5 left-5">
                <p className="eyebrow mb-1.5" style={{ color: "rgba(244,240,230,0.36)", fontSize: "0.54rem" }}>07</p>
                <p style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1rem,1.6vw,1.6rem)", color: "#F4F0E6", lineHeight: 1.12, fontWeight: 400 }}>
                  Launch & momentum posts
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "clamp(0.68rem,0.9vw,0.8rem)", color: "rgba(244,240,230,0.48)", marginTop: 4 }}>
                  Stay visible between big moments.
                </p>
              </div>
            </div>

          </div>{/* end bottom 4-col grid */}
          </div>{/* end outer flex wrapper */}

          {/* Closing line */}
          <div className="py-14 text-center">
            <p
              data-reveal
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.1rem,2vw,1.5rem)",
                color: "rgba(244,240,230,0.28)",
                fontWeight: 300,
                letterSpacing: "0.02em",
                fontStyle: "italic",
              }}
            >
              A softer way back into visibility.
            </p>
          </div>

        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S8 — PRICING
            Clean, confident — Starter + Suite
        ══════════════════════════════════════════════════════════════════ */}
        <section id="pricing" className="section-shell" style={{ background: "#0F0D0B", position: "relative", overflow: "hidden" }}>
          {/* Paper noise on dark — screen blend keeps it subtle */}
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.07, mixBlendMode: "screen", pointerEvents: "none", zIndex: 0 }} />
          <div className="relative z-[1] mx-auto max-w-[1100px]">
            <div data-reveal className="mb-10">
              <p className="eyebrow mb-4" style={{ color: "rgba(244,240,230,0.28)" }}>Pricing</p>
              <h2 className="editorial-title" style={{ color: "#F4F0E6", fontSize: "clamp(2.5rem,7vw,5.8rem)" }}>
                Start small.
                <br />
                Build from there.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Selfie Guide */}
              <div data-reveal className="border border-[rgba(244,240,230,0.09)] p-8" style={{ borderRadius: 0 }}>
                <p className="eyebrow mb-4" style={{ color: "rgba(244,240,230,0.28)" }}>Selfie Guide</p>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,8vw,4.8rem)", fontWeight: 300, lineHeight: 1, letterSpacing: "-0.04em", color: "#F4F0E6" }}>
                  {selfieGuidePrice}
                </div>
                <p className="mt-1.5 text-sm" style={{ color: "rgba(244,240,230,0.26)" }}>one-time, no subscription</p>
                <p className="mt-6 text-[0.95rem] leading-[1.9]" style={{ color: "rgba(244,240,230,0.44)" }}>
                  Start here when showing your face still feels like the hard part.
                </p>
                <ul className="mt-6 space-y-3 text-[0.95rem]" style={{ color: "rgba(244,240,230,0.5)" }}>
                  {[
                    "7-day structure you can do at your own pace",
                    "Instant access after checkout",
                    "A gentle first yes before the full system",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span style={{ color: "rgba(244,240,230,0.24)", marginTop: "0.12em", flexShrink: 0 }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={selfieGuideHref}
                  className="eyebrow mt-8 inline-flex items-center justify-center px-5 py-4"
                  style={{ borderRadius: 0, border: "1px solid rgba(244,240,230,0.2)", color: "rgba(244,240,230,0.58)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3)", textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
                  onClick={() => trackSelfieGuideEntryClick("pricing_editorial")}
                >
                  Get the Guide
                </Link>
              </div>

              {/* Studio membership */}
              <div data-reveal className="relative bg-[#F4F0E6] p-8" style={{ color: "#1A1714", borderRadius: 0 }}>
                <span
                  className="eyebrow absolute right-5 top-5 px-3 py-2"
                  style={{ borderRadius: 0, background: "#C4B5A0", color: "#1A1714", fontSize: "0.58rem", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.1)" }}
                >
                  Full system
                </span>
                <p className="eyebrow mb-4" style={{ color: "rgba(26,23,20,0.36)" }}>Studio membership</p>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(3rem,8vw,4.8rem)", fontWeight: 300, lineHeight: 1, letterSpacing: "-0.04em", color: "#1A1714" }}>
                  {membershipPrice}
                </div>
                <p className="mt-1.5 text-sm" style={{ color: "rgba(26,23,20,0.3)" }}>per month, cancel anytime</p>
                <p className="mt-6 text-[0.95rem] leading-[1.9]" style={{ color: "rgba(26,23,20,0.54)" }}>
                  Come here when you want the full system to hold the weight with you. Maya remembers your brand,
                  helps with the words, the visuals, and the staying consistent part.
                </p>
                <ul className="mt-6 space-y-3 text-[0.95rem]" style={{ color: "rgba(26,23,20,0.62)" }}>
                  {[
                    "Maya with brand memory",
                    "Brand photos + planning + captions",
                    "Academy included",
                    "Cancel from account settings",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span style={{ color: "rgba(26,23,20,0.26)", marginTop: "0.12em", flexShrink: 0 }}>+</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="eyebrow mt-8 inline-flex w-full items-center justify-center px-5 py-4"
                  style={{ borderRadius: 0, background: "#1A1714", color: "#F4F0E6", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.4), 0 8px 24px rgba(26,23,20,0.28)", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                  disabled={checkoutLoading === "sselfie_studio_membership"}
                  onClick={() => handleStartCheckout("sselfie_studio_membership")}
                >
                  {checkoutLoading === "sselfie_studio_membership" ? "Loading…" : "Join Studio"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S9 — FAQ
        ══════════════════════════════════════════════════════════════════ */}
        <section id="faq" className="section-shell" style={{ background: "#EDE9E2", color: "#1A1714", position: "relative", overflow: "hidden" }}>
          {/* Paper noise — multiply on cream */}
          <div aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: "repeat", backgroundSize: "320px 320px", opacity: 0.2, mixBlendMode: "multiply", pointerEvents: "none", zIndex: 0 }} />
          <div className="relative z-[1] mx-auto max-w-[860px]">
            <div data-reveal className="mb-10">
              <p className="eyebrow mb-4" style={{ color: "rgba(26,23,20,0.34)" }}>Questions</p>
              <h2 className="editorial-title" style={{ color: "#1A1714", fontSize: "clamp(2.3rem,6vw,5rem)" }}>
                Your questions,
                <br />
                answered.
              </h2>
            </div>
            <div className="border-t border-[rgba(26,23,20,0.09)]">
              {FAQS.map((faq, index) => (
                <div key={faq.q} data-reveal className="border-b border-[rgba(26,23,20,0.09)]">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="flex w-full items-start justify-between gap-5 py-6 text-left"
                  >
                    <span className="text-[1rem] font-medium tracking-[-0.01em]" style={{ color: "#1A1714" }}>
                      {faq.q}
                    </span>
                    <span
                      style={{
                        color: "rgba(26,23,20,0.3)",
                        fontSize: "1.5rem",
                        lineHeight: 1,
                        flexShrink: 0,
                        transform: openFaq === index ? "rotate(45deg)" : "rotate(0deg)",
                        transition: "transform 220ms ease",
                      }}
                    >
                      +
                    </span>
                  </button>
                  <div style={{
                    display: "grid",
                    gridTemplateRows: openFaq === index ? "1fr" : "0fr",
                    transition: "grid-template-rows 280ms cubic-bezier(0.23,1,0.32,1)",
                    overflow: "hidden",
                  }}>
                    <div style={{ minHeight: 0 }}>
                      <p className="pb-6 text-[0.95rem] leading-[1.9]" style={{ color: "rgba(26,23,20,0.54)" }}>
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            S10 — FINAL CTA
            Full-bleed image, agent mid-action, text lower-third left
        ══════════════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden"
          style={{ minHeight: "min(90vh, 820px)", display: "flex", alignItems: "flex-end" }}
        >
          {/* Full-bleed background image */}
          <Image
            src={ASSETS.finalCta}
            alt="SSELFIE Studio — brand photography"
            fill
            className="object-cover"
            style={{ objectPosition: "center 20%" }}
            priority
          />

          {/* Dark gradient — heavier at bottom for text legibility */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(15,13,11,0.92) 0%, rgba(15,13,11,0.45) 45%, rgba(15,13,11,0.1) 80%, transparent 100%)" }}
          />

          {/* Text — lower third, left-aligned */}
          <div className="relative z-10 w-full px-8 pb-16 md:px-16 md:pb-20">
            <div className="max-w-[1320px] mx-auto">
              <h2
                data-reveal
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.8rem,6.5vw,5.8rem)",
                  color: "#F4F0E6",
                  fontWeight: 300,
                  lineHeight: 1.08,
                  letterSpacing: "-0.02em",
                  maxWidth: "18ch",
                }}
              >
                See your next launch
                <br />
                <span style={{ color: "transparent", WebkitTextStroke: "1.4px rgba(244,240,230,0.5)" }}>like this.</span>
              </h2>

              <p
                data-reveal
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: "clamp(0.9rem,1.4vw,1.1rem)",
                  color: "rgba(244,240,230,0.55)",
                  marginTop: "1.2rem",
                  letterSpacing: "0.01em",
                }}
              >
                Start with one clear selfie.
              </p>

              <div data-reveal className="mt-8 flex items-center gap-5">
                <Link
                  href="#pricing"
                  className="eyebrow inline-flex items-center justify-center px-7 py-4"
                  style={{
                    border: "1px solid rgba(244,240,230,0.55)",
                    color: "#F4F0E6",
                    background: "transparent",
                    borderRadius: 0,
                    transition: "background 0.3s, border-color 0.3s, opacity 0.3s",
                    letterSpacing: "0.2em",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 8px rgba(0,0,0,0.4)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(244,240,230,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,230,0.85)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(244,240,230,0.55)"; }}
                  onClick={() => trackCTAClick("footer_cta", "Get started", "#pricing")}
                >
                  Get started
                </Link>
                <Link
                  href="#demo"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "0.84rem",
                    color: "rgba(244,240,230,0.45)",
                    letterSpacing: "0.04em",
                    transition: "color 0.3s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.85)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.45)"; }}
                >
                  See it work
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ════════════════════════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{ background: "#0F0D0B", borderTop: "1px solid rgba(244,240,230,0.07)" }}>
        <div className="mx-auto max-w-[1320px] px-5 py-14 md:px-10 md:py-16">

          {/* Top row: brand + social */}
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">

            {/* Brand */}
            <div>
              <Link href="/" style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.3rem" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", fontWeight: 300, fontStyle: "normal", letterSpacing: "0.32em", color: "#F4F0E6", lineHeight: 1, display: "block", textShadow: "0 1px 4px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.05)" }}>
                  SSELFIE
                </span>
                <div style={{ height: "0.5px", width: "100%", background: "rgba(244,240,230,0.28)", boxShadow: "0 1px 0 rgba(0,0,0,0.35)" }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.46rem", letterSpacing: "0.45em", textTransform: "uppercase", color: "rgba(244,240,230,0.35)", display: "block" }}>
                  STUDIO
                </span>
              </Link>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "rgba(244,240,230,0.3)", marginTop: 10, maxWidth: "28ch", lineHeight: 1.7 }}>
                Brand photos, feed plans, and captions — with Maya, your AI inside Studio.
              </p>
              <a
                href="mailto:hello@sselfie.ai"
                style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "rgba(244,240,230,0.35)", display: "block", marginTop: 8, letterSpacing: "0.02em", transition: "color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.7)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.35)"; }}
              >
                hello@sselfie.ai
              </a>
            </div>

            {/* Social links */}
            <div className="flex flex-col gap-2.5">
              <p className="eyebrow mb-1" style={{ color: "rgba(244,240,230,0.22)", fontSize: "0.56rem" }}>Follow</p>
              {[
                { label: "Instagram", href: "https://instagram.com/sandra.social" },
                { label: "TikTok", href: "https://tiktok.com/@sandra.social" },
                { label: "LinkedIn", href: "https://linkedin.com/in/sandra-aamodt-919734253" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "rgba(244,240,230,0.36)", letterSpacing: "0.02em", transition: "color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.75)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.36)"; }}
                >
                  {label}
                </a>
              ))}
            </div>

          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(244,240,230,0.06)", margin: "2.5rem 0" }} />

          {/* Bottom row: copyright + legal */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.74rem", color: "rgba(244,240,230,0.2)", letterSpacing: "0.02em" }}>
              &copy; {new Date().getFullYear()} SSELFIE Studio. All rights reserved.
            </p>
            <div className="flex gap-5">
              {[
                { label: "Terms", href: "/terms" },
                { label: "Privacy", href: "/privacy" },
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  style={{ fontFamily: "var(--font-body)", fontSize: "0.74rem", color: "rgba(244,240,230,0.22)", letterSpacing: "0.03em", transition: "color 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.55)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(244,240,230,0.22)"; }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      </footer>

    </>
  );
}
