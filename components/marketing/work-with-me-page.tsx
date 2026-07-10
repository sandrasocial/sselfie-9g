"use client"

import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import {
  InquiryForm,
  PublicFooter,
  PublicNav,
  PublicPageShell,
} from "@/components/sselfie/public-marketing"

const COLORS = {
  ink: "var(--color-obsidian)",
  inkSoft: "var(--stone-dark)",
  cream: "var(--color-porcelain)",
  creamSoft: "var(--color-pearl)",
  onDark: "var(--color-porcelain)",
  onDarkSoft: "var(--color-whisper)",
  onDarkMuted: "var(--stone)",
  onCream: "var(--color-obsidian)",
  onCreamSoft: "var(--color-smoke)",
  onCreamMuted: "var(--stone)",
  darkLine: "color-mix(in srgb, var(--color-whisper) 16%, transparent)",
  lightLine: "color-mix(in srgb, var(--color-obsidian) 12%, transparent)",
}

const FONT = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "var(--font-inter, Inter, -apple-system, sans-serif)",
}

const IMAGES = {
  hero: "/images/work-with-me/sprint-hero-new.webp",
  founder: "/images/work-with-me/sandra-founder-new.webp",
  editorial: "/images/work-with-me/sprint-editorial-new.webp",
  howIWork: "/images/work-with-me/sandra-how-i-work-new.webp",
  application: "/images/work-with-me/sprint-application-new.webp",
}

const OUTCOMES = [
  {
    title: "You know what you are known for.",
    body: "You can explain what you do in a way that feels simple, human, and true.",
  },
  {
    title: "Your profile finally makes sense.",
    body: "People can quickly understand who you help, what you believe, and why they should stay.",
  },
  {
    title: "You know what to say.",
    body: "Your content is no longer a collection of random posts. Every piece has a reason.",
  },
  {
    title: "You have a clear offer.",
    body: "You know what someone can buy from you and why it matters.",
  },
  {
    title: "You have a system you can keep using.",
    body: "You are not left with one good week of content. You understand how to keep showing up after the sprint is over.",
  },
]

const WORK = [
  ["Message", "A clear way to explain who you are, who you help, and what you want to be known for."],
  ["Positioning", "A simple place in the market that feels true to you and easy for other people to understand."],
  ["Profile", "A profile that makes sense quickly and gives people a reason to stay."],
  ["Content", "A clear content direction with posts for reach, trust, connection, and sales."],
  ["Visual identity", "A recognizable visual world using your face, taste, story, photos, and AI where it supports the brand."],
  ["Offer", "A clear first or next paid offer that connects naturally to what you already know and what people need from you."],
] as const

const FIT = [
  ["You have experience.", "You have a skill, service, story, idea, or lived experience that could help someone."],
  ["You feel scattered online.", "Your content may look good, but it does not clearly lead anywhere."],
  ["You are tired of collecting advice.", "You do not need another folder of prompts. You need someone to connect the full picture."],
  ["You want your own income.", "Not because you need to prove anything. Because building something of your own would change how you feel about your future."],
  ["You are ready to be seen.", "Even if part of you is still scared of what people will think."],
] as const

const NOT_FOR = [
  "You only want more followers.",
  "You want someone to post for you forever.",
  "You want instant income promises.",
  "You want a business built around a version of you that is not real.",
  "You are not willing to show up, test, speak, write, or be part of the process.",
]

const PROCESS = [
  ["01", "Apply", "Tell me what you have, what feels unclear, and what you want your online presence to lead toward."],
  ["02", "Fit call", "We have a short call to make sure this is the right fit before any payment link is sent."],
  ["03", "Two weeks of prep", "I research your niche, study your current brand, and build the first version of your message, content direction, and offer."],
  ["04", "Four weeks together", "We refine everything using your real business, audience, personality, goals, and life."],
  ["05", "You leave with the system", "You leave with clarity, content direction, a stronger profile, a clear offer, and a system you understand."],
] as const

const FAQS = [
  {
    question: "What if I do not know what my offer is yet?",
    answer: [
      "That is okay.",
      "You do not need to arrive with a finished offer.",
      "You do need to have something real to work with. A skill, service, experience, idea, story, or subject people already ask you about.",
      "Part of the sprint is helping you see what can become a clear paid offer.",
    ],
  },
  {
    question: "Is this business coaching?",
    answer: [
      "Not in the traditional sense.",
      "I am not here to give you generic advice and send you away with homework.",
      "I research, write, build, organize, and create the first version with you.",
      "The work includes your message, profile, content direction, visuals, positioning, and offer.",
    ],
  },
  {
    question: "Is this mainly about AI photos?",
    answer: [
      "No.",
      "AI can support the visual side, but it is not the offer.",
      "The real work is helping people understand you, trust you, and know what they can buy from you.",
      "Your photos are part of the brand.",
      "They are not the whole brand.",
    ],
  },
  {
    question: "What if I pay and still do not use it?",
    answer: [
      "That is an honest fear.",
      "A lot of women have bought things they never finished.",
      "This is different because the work is not sitting inside a course waiting for you.",
      "I am actively building with you.",
      "But you will still need to show up, make decisions, post, test, and use what we create.",
      "I cannot do that part instead of you.",
    ],
  },
  {
    question: "Why is there an application?",
    answer: [
      "Because this is personal work.",
      "I need to understand what you already have, what feels unclear, and whether I genuinely believe I can help.",
      "I would rather say no than take your money for something that is not the right fit.",
    ],
  },
  {
    question: "Why should I trust a new offer?",
    answer: [
      "Because the offer is new.",
      "The experience behind it is not.",
      "I have built my own brand, audience, products, content systems, visual identity, and AI tools from scratch.",
      "This sprint is the closest way to work with me while I bring that full experience into your business.",
    ],
  },
]

function Paper({ dark }: { dark: boolean }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
      style={{ opacity: dark ? 0.05 : 0.16, mixBlendMode: dark ? "screen" : "multiply" }}
    >
      <rect width="100%" height="100%" filter={`url(#sa-noise-${dark ? "dark" : "cream"})`} />
    </svg>
  )
}

function Eyebrow({ children, dark }: { children: ReactNode; dark: boolean }) {
  return (
    <p
      className="mf uppercase"
      style={{
        color: dark ? COLORS.onDarkMuted : COLORS.onCreamMuted,
        fontFamily: FONT.sans,
        fontSize: "10px",
        letterSpacing: "0.42em",
      }}
    >
      {children}
    </p>
  )
}

function Heading({ children, dark, as = "h2" }: { children: ReactNode; dark: boolean; as?: "h1" | "h2" }) {
  const Tag = as
  return (
    <Tag
      className="mf text-balance"
      style={{
        color: dark ? COLORS.onDark : COLORS.onCream,
        fontFamily: FONT.serif,
        fontSize: as === "h1" ? "clamp(44px, 6.4vw, 84px)" : "clamp(34px, 5vw, 60px)",
        fontWeight: 300,
        letterSpacing: "-0.025em",
        lineHeight: as === "h1" ? 0.98 : 1.02,
        textShadow: dark
          ? "0 2px 8px color-mix(in srgb, var(--color-obsidian) 78%, transparent)"
          : "1px 2px 3px color-mix(in srgb, var(--color-porcelain) 86%, transparent)",
      }}
    >
      {children}
    </Tag>
  )
}

function Narrative({ children, dark, large = false }: { children: ReactNode; dark: boolean; large?: boolean }) {
  return (
    <div
      className="mf space-y-4 text-pretty"
      style={{
        color: dark ? COLORS.onDarkSoft : COLORS.onCreamSoft,
        fontFamily: FONT.sans,
        fontSize: large ? "clamp(16px, 1.55vw, 19px)" : "16px",
        lineHeight: 1.78,
        maxWidth: "66ch",
      }}
    >
      {children}
    </div>
  )
}

function Section({
  children,
  dark,
  id,
  className = "",
}: {
  children: ReactNode
  dark: boolean
  id?: string
  className?: string
}) {
  return (
    <section
      id={id}
      className={`relative overflow-hidden px-5 py-[clamp(72px,10vw,132px)] md:px-8 ${className}`}
      style={{ background: dark ? COLORS.ink : COLORS.cream, scrollMarginTop: "58px" }}
    >
      <Paper dark={dark} />
      <div className="relative z-[2] mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function Cta({ href, children, dark, secondary = false }: { href: string; children: ReactNode; dark: boolean; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className="wwm-button inline-flex min-h-12 items-center justify-center px-6 py-3 text-center uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
      style={{
        background: secondary ? "transparent" : dark ? COLORS.cream : COLORS.ink,
        border: `1px solid ${secondary ? (dark ? COLORS.darkLine : COLORS.lightLine) : "transparent"}`,
        color: secondary ? (dark ? COLORS.onDarkSoft : COLORS.onCreamSoft) : dark ? COLORS.ink : COLORS.cream,
        fontFamily: FONT.sans,
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  )
}

function Portrait({ src, alt, position = "50% 35%", priority = false }: { src: string; alt: string; position?: string; priority?: boolean }) {
  return (
    <div className="mf relative min-h-[520px] overflow-hidden md:min-h-[680px]">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 767px) 100vw, 50vw"
        className="object-cover"
        style={{ objectPosition: position }}
      />
    </div>
  )
}

export function WorkWithMePageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <main>
        {/* 01 · HERO */}
        <section className="relative pt-[58px]" style={{ background: COLORS.ink }}>
          <Paper dark />
          <div className="relative z-[2] mx-auto grid min-h-[calc(100dvh-58px)] max-w-[1480px] lg:grid-cols-[1.08fr_0.92fr]">
            <div className="order-2 flex items-center px-5 py-16 md:px-10 lg:order-1 lg:px-[clamp(48px,6vw,96px)] lg:py-24">
              <div className="max-w-3xl">
                <Eyebrow dark>Work with me · Private 4-week sprint</Eyebrow>
                <div className="mt-6">
                  <Heading dark as="h1">You already have something worth building.</Heading>
                </div>
                <p
                  className="mf mt-7 max-w-2xl text-pretty"
                  style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(24px,3vw,36px)", fontWeight: 300, lineHeight: 1.16 }}
                >
                  You just haven&apos;t turned it into something people can understand, remember, and buy from yet.
                </p>
                <Narrative dark large>
                  <p className="mt-8">You might have years of experience. A story people connect with. A skill you know could help someone. Maybe even an idea for what you want to sell.</p>
                  <p>But when you try to put it online, everything feels scattered. Your profile does not fully explain you. Your content does not lead anywhere. And the more you try to figure it out alone, the more complicated it becomes.</p>
                  <p>This is where I help you connect the full picture. Your story. Your message. Your content. Your offer.</p>
                  <p style={{ color: COLORS.onDark }}>So people do not just see you. They understand you.</p>
                </Narrative>
                <div className="mf mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Cta href="#inquiry" dark>Apply for the sprint</Cta>
                  <Cta href="/join/studio" dark secondary>See SSELFIE SUITE</Cta>
                </div>
                <p className="mf mt-4" style={{ color: COLORS.onDarkMuted, fontFamily: FONT.sans, fontSize: "12px" }}>
                  No payment is taken when you apply.
                </p>
              </div>
            </div>
            <div className="order-1 min-h-[58dvh] lg:order-2 lg:min-h-full">
              <Portrait
                src={IMAGES.hero}
                alt="Sandra in a black turtleneck in an editorial personal-brand portrait"
                position="54% 28%"
                priority
              />
            </div>
          </div>
        </section>

        {/* 02 · RECOGNITION */}
        <Section dark={false}>
          <div className="max-w-4xl">
            <Eyebrow dark={false}>Sound familiar?</Eyebrow>
            <div className="mt-5">
              <Heading dark={false}>
                You are not starting from zero.<br />
                <span style={{ color: COLORS.onCreamMuted }}>You are starting from unclear.</span>
              </Heading>
            </div>
            <Narrative dark={false} large>
              <p className="mt-10">You already know things. You have lived through things. People already ask for your advice. You have taste. You have ideas. You might even know there is something you could build.</p>
              <p>But online, none of it feels connected yet.</p>
              <p>So you keep changing direction. You save more ideas. You rewrite your bio. You question your niche. You tell yourself you will figure it out this weekend.</p>
              <p>Then another month goes by.</p>
              <p className="pt-4" style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(25px,3vw,36px)", lineHeight: 1.2 }}>
                The problem is not that you have nothing.<br />
                The problem is that nobody can see the full value of what is already there.
              </p>
            </Narrative>
          </div>
        </Section>

        {/* 03 · COST */}
        <Section dark>
          <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-24">
            <div>
              <Eyebrow dark>What this is really costing you</Eyebrow>
              <div className="mt-5">
                <Heading dark>It is hard to be trusted when people do not understand you.</Heading>
              </div>
            </div>
            <Narrative dark large>
              <p>A woman can be talented, experienced, thoughtful, creative, and completely capable.</p>
              <p>And still be overlooked online.</p>
              <p>Not because she is not good enough.</p>
              <p>Because her message is buried. Her content feels random. Her offer is unclear. And the woman behind it all is still half-hiding.</p>
              <p>When people cannot quickly understand what you do, they do not know what to remember you for. They do not know what to ask you about. They do not know what to buy.</p>
              <p className="pt-4" style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(26px,3vw,38px)", lineHeight: 1.16 }}>
                You do not need to become more impressive.<br />
                You need to become easier to understand.
              </p>
            </Narrative>
          </div>
        </Section>

        {/* 04 · FOUNDER STORY */}
        <Section dark={false}>
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-20">
            <Portrait
              src={IMAGES.founder}
              alt="Sandra working on her personal brand from a warm, natural setting"
              position="58% 38%"
            />
            <div className="lg:py-10">
              <Eyebrow dark={false}>I know this feeling</Eyebrow>
              <div className="mt-5"><Heading dark={false}>I thought I needed a better plan.</Heading></div>
              <Narrative dark={false} large>
                <p className="mt-9">Looking back, I did not need another niche. Another logo. Another folder of content ideas.</p>
                <p>I needed to understand what was already inside me.</p>
                <p>My story. My skills. The things I had survived. The things people trusted me with. The things I could teach.</p>
                <p>For a long time, it all felt random.</p>
                <p>Then I started connecting it.</p>
                <p>My phone became a tool. My photos became content. My story built trust. My message became clearer. And eventually, I created something people could buy.</p>
                <p>That is why I built this sprint.</p>
                <p>Because most women are not missing potential. They are missing the bridge between who they already are and how the world sees them.</p>
                <p className="pt-4" style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(26px,3vw,38px)", lineHeight: 1.16 }}>
                  You are not empty.<br />You are unorganized.<br />That is a very different problem.
                </p>
              </Narrative>
            </div>
          </div>
        </Section>

        {/* 05 · THE SHIFT */}
        <Section dark>
          <div className="max-w-5xl">
            <Eyebrow dark>The bridge</Eyebrow>
            <div className="mt-5">
              <Heading dark>
                The photo gets attention.<br />
                The message builds trust.<br />
                The offer gives it somewhere to go.
              </Heading>
            </div>
            <Narrative dark large>
              <p className="mt-10">That is the work.</p>
              <p>We connect how people see you, what they understand about you, and the first paid step they can take with you.</p>
              <p>Not a generic niche exercise. Not a content calendar full of filler. Not a fake version of you.</p>
              <p>A clear line from your face, story, skills, lived experience, and ideas to a simple offer people can recognize.</p>
            </Narrative>
            <div className="mf mt-9"><Cta href="#inquiry" dark>Apply for the sprint</Cta></div>
          </div>
        </Section>

        {/* 06 · OUTCOMES */}
        <Section dark={false}>
          <Eyebrow dark={false}>What you leave with</Eyebrow>
          <div className="mt-5"><Heading dark={false}>You stop guessing.</Heading></div>
          <div className="mt-14 border-t" style={{ borderColor: COLORS.lightLine }}>
            {OUTCOMES.map((item, index) => (
              <article key={item.title} className="mf grid gap-4 border-b py-7 md:grid-cols-[72px_0.9fr_1.1fr] md:items-baseline md:gap-8" style={{ borderColor: COLORS.lightLine }}>
                <span style={{ color: COLORS.onCreamMuted, fontFamily: FONT.sans, fontSize: "10px", letterSpacing: "0.28em" }}>0{index + 1}</span>
                <h3 style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(24px,2.6vw,34px)", fontWeight: 300, lineHeight: 1.12 }}>{item.title}</h3>
                <p style={{ color: COLORS.onCreamSoft, fontFamily: FONT.sans, fontSize: "15px", lineHeight: 1.75 }}>{item.body}</p>
              </article>
            ))}
          </div>
          <p className="mf mt-12 max-w-3xl" style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(26px,3vw,38px)", fontWeight: 300, lineHeight: 1.18 }}>
            The goal is not to make you dependent on me. It is to help you finally see the structure underneath everything you already have.
          </p>
        </Section>

        {/* 07 · HOW I WORK */}
        <Section dark>
          <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="lg:py-8">
              <Eyebrow dark>How I work</Eyebrow>
              <div className="mt-5"><Heading dark>I do not wait until our first call to start thinking.</Heading></div>
              <Narrative dark large>
                <p className="mt-9">Before we speak, I go inside your world.</p>
                <p>I study your Instagram. I research your niche. I look at how people currently understand you.</p>
                <p>I study your ideas, story, visuals, strengths, and possible offers.</p>
                <p>Then I build the first version.</p>
                <p>So our first proper session is not where we sit and stare at a blank page. It is where you react to something real.</p>
                <p>You see your message taking shape. You see your offer. You see what your content could become. You see the version of your brand that has been hiding underneath all the noise.</p>
                <p className="pt-4" style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(25px,3vw,36px)", lineHeight: 1.18 }}>
                  You are not paying for more information.<br />You are paying for someone to see the full picture and help you connect it.
                </p>
              </Narrative>
            </div>
            <Portrait
              src={IMAGES.howIWork}
              alt="Sandra in a warm café portrait bringing her personal perspective to the work"
              position="51% 31%"
            />
          </div>
        </Section>

        {/* 08 · THE WORK */}
        <Section dark={false}>
          <Eyebrow dark={false}>The work</Eyebrow>
          <div className="mt-5"><Heading dark={false}>This is where everything starts connecting.</Heading></div>
          <div className="mt-14 grid border-t md:grid-cols-2" style={{ borderColor: COLORS.lightLine }}>
            {WORK.map(([title, body], index) => (
              <article key={title} className="mf border-b py-8 md:px-8 md:first:pl-0 md:[&:nth-child(odd)]:border-r" style={{ borderColor: COLORS.lightLine }}>
                <p style={{ color: COLORS.onCreamMuted, fontFamily: FONT.sans, fontSize: "10px", letterSpacing: "0.28em" }}>0{index + 1}</p>
                <h3 className="mt-4 uppercase" style={{ color: COLORS.onCream, fontFamily: FONT.sans, fontSize: "11px", fontWeight: 600, letterSpacing: "0.28em" }}>{title}</h3>
                <p className="mt-3 max-w-lg" style={{ color: COLORS.onCreamSoft, fontFamily: FONT.sans, fontSize: "15px", lineHeight: 1.75 }}>{body}</p>
              </article>
            ))}
          </div>
          <p className="mf mt-12" style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(28px,3vw,42px)", fontWeight: 300, lineHeight: 1.15 }}>
            Not six disconnected services.<br />One connected personal brand.
          </p>
        </Section>

        {/* 09 · WHO IT IS FOR */}
        <Section dark>
          <Eyebrow dark>This is for you if</Eyebrow>
          <div className="mt-5"><Heading dark>You know there is something here.</Heading></div>
          <div className="mt-14 border-t" style={{ borderColor: COLORS.darkLine }}>
            {FIT.map(([title, body]) => (
              <article key={title} className="mf grid gap-3 border-b py-7 md:grid-cols-[0.9fr_1.1fr] md:gap-12" style={{ borderColor: COLORS.darkLine }}>
                <h3 style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(24px,2.5vw,34px)", fontWeight: 300, lineHeight: 1.14 }}>{title}</h3>
                <p style={{ color: COLORS.onDarkSoft, fontFamily: FONT.sans, fontSize: "15px", lineHeight: 1.75 }}>{body}</p>
              </article>
            ))}
          </div>
          <p className="mf mt-12 max-w-3xl" style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(26px,3vw,38px)", fontWeight: 300, lineHeight: 1.17 }}>
            You do not need to have everything figured out before you apply. That is the point of the sprint.
          </p>
        </Section>

        {/* 10 · NOT FOR */}
        <Section dark={false}>
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-24">
            <div>
              <Eyebrow dark={false}>This may not be for you if</Eyebrow>
            </div>
            <div>
              <div className="border-t" style={{ borderColor: COLORS.lightLine }}>
                {NOT_FOR.map((item) => (
                  <p key={item} className="mf border-b py-5" style={{ borderColor: COLORS.lightLine, color: COLORS.onCreamSoft, fontFamily: FONT.sans, fontSize: "16px", lineHeight: 1.65 }}>{item}</p>
                ))}
              </div>
              <p className="mf mt-10" style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(26px,3vw,38px)", fontWeight: 300, lineHeight: 1.18 }}>
                I can help you build the structure.<br />But I cannot become visible for you.
              </p>
            </div>
          </div>
        </Section>

        {/* 11 · EDITORIAL IMAGE */}
        <section className="relative h-[78dvh] min-h-[620px] overflow-hidden" style={{ background: COLORS.ink }}>
          <Image
            src={IMAGES.editorial}
            alt="Sandra using her phone in a modern editorial portrait representing visibility and creative freedom"
            fill
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "50% 42%" }}
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--color-obsidian) 80%, transparent), transparent 62%)" }} />
          <div className="absolute inset-x-0 bottom-0 z-[2] mx-auto max-w-6xl px-5 pb-12 md:px-8 md:pb-16">
            <p className="max-w-3xl" style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(38px,6vw,72px)", fontWeight: 300, lineHeight: 1.01, textShadow: "0 2px 10px color-mix(in srgb, var(--color-obsidian) 82%, transparent)" }}>
              Seen. Understood. Trusted. Paid.
            </p>
          </div>
        </section>

        {/* 12 · PROCESS */}
        <Section dark>
          <Eyebrow dark>How it works</Eyebrow>
          <div className="mt-5"><Heading dark>Simple on purpose.</Heading></div>
          <div className="mt-14 border-t" style={{ borderColor: COLORS.darkLine }}>
            {PROCESS.map(([number, title, body]) => (
              <article key={number} className="mf grid gap-4 border-b py-7 md:grid-cols-[72px_0.75fr_1.25fr] md:items-baseline md:gap-8" style={{ borderColor: COLORS.darkLine }}>
                <span style={{ color: COLORS.onDarkMuted, fontFamily: FONT.sans, fontSize: "10px", letterSpacing: "0.28em" }}>{number}</span>
                <h3 className="uppercase" style={{ color: COLORS.onDark, fontFamily: FONT.sans, fontSize: "11px", fontWeight: 600, letterSpacing: "0.25em" }}>{title}</h3>
                <p style={{ color: COLORS.onDarkSoft, fontFamily: FONT.sans, fontSize: "15px", lineHeight: 1.75 }}>{body}</p>
              </article>
            ))}
          </div>
          <Narrative dark large>
            <p className="mt-12">I read every application myself.</p>
            <p>This is personal work.</p>
            <p>I am not trying to fit as many women as possible into it. I am looking for the women I genuinely believe I can help.</p>
          </Narrative>
        </Section>

        {/* 13 · PROOF */}
        <Section dark={false}>
          <div className="max-w-4xl">
            <Eyebrow dark={false}>A quick honest note</Eyebrow>
            <div className="mt-5"><Heading dark={false}>This is a new private offer.</Heading></div>
            <Narrative dark={false} large>
              <p className="mt-10">There is no huge wall of case studies yet.</p>
              <p>I am building the first round closely with a small number of women because I want to be deeply involved in the work.</p>
              <p>But I am not new to building personal brands.</p>
              <p>I grew my own audience to more than 110,000 women.</p>
              <p>I built my business using my phone, my story, content, digital products, and AI.</p>
              <p>I have spent years learning how visuals, identity, storytelling, trust, and offers fit together.</p>
              <p>This sprint brings all of that into one room.</p>
              <p className="pt-4" style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(26px,3vw,38px)", lineHeight: 1.18 }}>
                I will never promise you income.<br />I will promise that I will look at your business honestly, think deeply, and help you make it clearer, stronger, and easier to buy from.
              </p>
            </Narrative>
          </div>
        </Section>

        {/* 14 · INVESTMENT */}
        <Section dark>
          <div className="grid items-stretch gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="flex flex-col justify-center">
              <Eyebrow dark>Investment</Eyebrow>
              <div className="mt-5"><Heading dark>Private 4-week sprint</Heading></div>
              <p className="mf mt-8" style={{ color: COLORS.onDark, fontFamily: FONT.serif, fontSize: "clamp(64px,10vw,116px)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 0.9 }}>€2,000</p>
              <p className="mf mt-4 uppercase" style={{ color: COLORS.onDarkMuted, fontFamily: FONT.sans, fontSize: "10px", letterSpacing: "0.28em" }}>2 payments of €1,100</p>
              <Narrative dark large>
                <p className="mt-9">No payment is taken when you apply.</p>
                <p>If your application looks like a fit, we have a short call first.</p>
                <p>This is not a promise of instant income.</p>
                <p>It is a focused private sprint to help you become clear on who you are, what you say, what you sell, and how your content supports it.</p>
              </Narrative>
              <div className="mf mt-9 flex flex-col gap-3 sm:flex-row">
                <Cta href="#inquiry" dark>Apply for the sprint</Cta>
                <Cta href="/join/studio" dark secondary>See SSELFIE SUITE</Cta>
              </div>
              <p className="mf mt-4" style={{ color: COLORS.onDarkMuted, fontFamily: FONT.sans, fontSize: "12px", lineHeight: 1.6 }}>
                SSELFIE Suite is the smaller next step if you are not ready for private support.
              </p>
            </div>
            <Portrait
              src={IMAGES.application}
              alt="Sandra taking a mirror portrait that reflects personal visibility and self-recognition"
              position="50% 35%"
            />
          </div>
        </Section>

        {/* 15 · FAQ */}
        <Section dark={false}>
          <Eyebrow dark={false}>FAQ</Eyebrow>
          <div className="mt-5"><Heading dark={false}>A few honest answers.</Heading></div>
          <div className="mt-14 border-t" style={{ borderColor: COLORS.lightLine }}>
            {FAQS.map((item) => (
              <details key={item.question} className="wwm-faq mf border-b" style={{ borderColor: COLORS.lightLine }}>
                <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">
                  <span style={{ color: COLORS.onCream, fontFamily: FONT.serif, fontSize: "clamp(22px,2.4vw,30px)", fontWeight: 300, lineHeight: 1.2 }}>{item.question}</span>
                  <span aria-hidden className="wwm-faq-mark shrink-0" style={{ color: COLORS.onCreamMuted, fontFamily: FONT.sans, fontSize: "24px", fontWeight: 300 }}>+</span>
                </summary>
                <div className="max-w-3xl space-y-4 pb-8 pr-10" style={{ color: COLORS.onCreamSoft, fontFamily: FONT.sans, fontSize: "15px", lineHeight: 1.75 }}>
                  {item.answer.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </details>
            ))}
          </div>
        </Section>

        {/* 16 · APPLICATION */}
        <Section id="inquiry" dark>
          <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-20">
            <div className="lg:sticky lg:top-24">
              <Eyebrow dark>Application</Eyebrow>
              <div className="mt-5"><Heading dark>Apply for Visibility To Paid</Heading></div>
              <Narrative dark large>
                <p className="mt-9">Keep it simple.</p>
                <p>Tell me what you already have, what feels unclear, and what you want your online presence to lead toward.</p>
                <p>No payment is taken here.</p>
                <p>If I think I can genuinely help, I will reply with the next step.</p>
                <p>Usually that means a short fit call first.</p>
              </Narrative>
            </div>
            <div className="mf"><InquiryForm /></div>
          </div>
        </Section>
      </main>

      <PublicFooter />

      <style jsx global>{`
        .wwm-button {
          transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease;
        }
        .wwm-button:hover { transform: translateY(-2px); opacity: 0.86; }
        .wwm-button:active { transform: translateY(1px); }
        .wwm-faq > summary::-webkit-details-marker { display: none; }
        .wwm-faq[open] .wwm-faq-mark { transform: rotate(45deg); }
        .wwm-faq-mark { transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1); }
        @media (prefers-reduced-motion: reduce) {
          .wwm-button, .wwm-faq-mark { transition: none; }
        }
      `}</style>
    </PublicPageShell>
  )
}
