import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { WorkWithMeInquiryForm } from "@/components/sselfie/work-with-me-inquiry-form"
import { appendReferralParam } from "@/lib/referrals/routing"

type NavItem = {
  href: string
  label: string
}

type ProductCard = {
  title: string
  subtitle: string
  price: string
  href: string
}

type FaqItem = {
  question: string
  answer: string
}

type HeroImage = {
  src: string
  alt: string
}

const navItems: NavItem[] = [
  { href: "/starter-kit", label: "Starter Kit" },
  { href: "/masterclass", label: "Masterclass" },
  { href: "/join/studio", label: "Studio" },
  { href: "/work-with-me", label: "Work With Me" },
]

const productLadder: ProductCard[] = [
  {
    title: "Free Guide",
    subtitle: "Light, angles, edits, and what to do first.",
    price: "Free",
    href: "/selfie-guide",
  },
  {
    title: "Starter Kit",
    subtitle: "Presets, the guide, and a first result you can get today.",
    price: "$37",
    href: "/starter-kit",
  },
  {
    title: "Masterclass",
    subtitle: "The full method when you want more than a quick fix.",
    price: "$147",
    href: "/masterclass",
  },
  {
    title: "Studio",
    subtitle: "Maya, Feed Planner, and Academy once you know the look you want.",
    price: "EUR 97/mo",
    href: "/join/studio",
  },
  {
    title: "1:1 with Sandra",
    subtitle: "For the person who wants direct eyes on the whole thing.",
    price: "From $2,000",
    href: "/work-with-me",
  },
]

const starterKitItems = [
  "16 Lightroom Presets",
  "The Selfie Guide",
  "Your First Selfie Quick-Start",
]

const starterKitFaqs: FaqItem[] = [
  {
    question: "Do I need Lightroom already?",
    answer: "No. The kit shows you what to use first and how to keep it simple.",
  },
  {
    question: "Will this work on iPhone photos?",
    answer: "Yes. That is the point. Same phone. Better system.",
  },
  {
    question: "Is this for beginners?",
    answer: "Yes. It is for the person who knows how to take the photo and still does not like what happens after.",
  },
]

const masterclassFaqs: FaqItem[] = [
  {
    question: "Do I need the Starter Kit first?",
    answer: "No. But it helps if you want the fastest first win.",
  },
  {
    question: "Is this more presets?",
    answer: "No. This is the method behind the photo, the edit, and the post.",
  },
  {
    question: "How is this different from Studio?",
    answer: "The Masterclass teaches the method. Studio is the advanced AI layer after that.",
  },
]

const studioFaqs: FaqItem[] = [
  {
    question: "Who is Studio for?",
    answer: "For creators who already know the look they want and want speed, consistency, and memory inside the workflow.",
  },
  {
    question: "What is Maya inside Studio?",
    answer: "She is the AI layer. She helps with images, planning, and decisions without you starting from zero every time.",
  },
  {
    question: "Can I cancel?",
    answer: "Yes. Cancel any time from your account.",
  },
]

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export function PublicPageShell({ children }: { children: ReactNode }) {
  return <div className="public-page-shell">{children}</div>
}

export function PublicNav() {
  return (
    <header className="public-nav">
      <div className="public-container flex items-center justify-between gap-6">
        <Link href="/" className="public-brand">
          SSELFIE
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="public-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/selfie-guide" className="public-button-primary hidden md:inline-flex">
          Get the Free Guide
        </Link>
      </div>
    </header>
  )
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--stone-200)] py-10">
      <div className="public-container flex flex-col gap-4 text-sm text-[var(--stone-400)] md:flex-row md:items-center md:justify-between">
        <p>© 2026 SSELFIE Studio</p>
        <div className="flex flex-wrap gap-4">
          <Link href="/selfie-guide" className="hover:opacity-70">
            Free Guide
          </Link>
          <Link href="/starter-kit" className="hover:opacity-70">
            Starter Kit
          </Link>
          <Link href="/masterclass" className="hover:opacity-70">
            Masterclass
          </Link>
          <Link href="/join/studio" className="hover:opacity-70">
            Studio
          </Link>
        </div>
      </div>
    </footer>
  )
}

export function Section({
  eyebrow,
  title,
  children,
  surface = "plain",
  className,
}: {
  eyebrow?: string
  title?: ReactNode
  children: ReactNode
  surface?: "plain" | "alt"
  className?: string
}) {
  return (
    <section className={cx("public-section", surface === "alt" && "public-section-alt", className)}>
      <div className="public-container">
        {eyebrow ? <p className="public-eyebrow">{eyebrow}</p> : null}
        {title ? <h2 className="public-section-title">{title}</h2> : null}
        {children}
      </div>
    </section>
  )
}

function CTAGroup({
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link href={primaryHref} className="public-button-primary">
        {primaryLabel}
      </Link>
      {secondaryHref && secondaryLabel ? (
        <Link href={secondaryHref} className="public-button-secondary">
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  )
}

function Hero({
  eyebrow,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  image,
}: {
  eyebrow: string
  title: ReactNode
  body: ReactNode
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  image: HeroImage
}) {
  return (
    <section className="public-hero">
      <div className="public-container public-hero-grid">
        <div className="space-y-6">
          <p className="public-eyebrow">{eyebrow}</p>
          <h1 className="public-hero-title">{title}</h1>
          <div className="max-w-xl space-y-3 text-base leading-8 text-[var(--stone-800)] md:text-lg">
            {body}
          </div>
          <CTAGroup
            primaryHref={primaryHref}
            primaryLabel={primaryLabel}
            secondaryHref={secondaryHref}
            secondaryLabel={secondaryLabel}
          />
        </div>
        <div className="public-image-frame aspect-[4/5]">
          <Image src={image.src} alt={image.alt} fill sizes="(max-width: 768px) 100vw, 48vw" className="object-cover" priority />
        </div>
      </div>
    </section>
  )
}

function BeforeAfterProof() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="public-card p-4">
        <div className="public-proof-label">Before</div>
        <div className="relative mt-3 aspect-[4/5] overflow-hidden">
          <Image
            src="/images/selfie-guide/before-real.png"
            alt="Before editing selfie result"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
      <div className="public-card p-4">
        <div className="public-proof-label">After</div>
        <div className="relative mt-3 aspect-[4/5] overflow-hidden">
          <Image
            src="/images/selfie-guide/after-real.png"
            alt="After editing selfie result"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </div>
  )
}

function FaqGrid({ items }: { items: FaqItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <article key={item.question} className="public-card space-y-3 p-6">
          <h3 className="text-xl leading-tight text-[var(--stone-950)]">{item.question}</h3>
          <p className="text-sm leading-7 text-[var(--stone-800)]">{item.answer}</p>
        </article>
      ))}
    </div>
  )
}

export function HomePageContent({ referralCode }: { referralCode?: string | null } = {}) {
  const withReferral = (href: string) => appendReferralParam(href, referralCode)

  return (
    <PublicPageShell>
      <PublicNav />
      <Hero
        eyebrow="Selfie Education"
        title={
          <>
            You already know how to take a photo.
            <br />
            You just don&apos;t know what to do after.
          </>
        }
        body={
          <>
            <p>The free guide gets you started.</p>
            <p>The Starter Kit gives you the presets, the method, and a result you can get today.</p>
          </>
        }
        primaryHref={withReferral("/selfie-guide")}
        primaryLabel="Get the Free Guide"
        secondaryHref={withReferral("/starter-kit")}
        secondaryLabel="See the Starter Kit"
        image={{
          src: "/images/selfie-guide/window-editorial-portrait.jpg",
          alt: "Sandra-style window light selfie portrait",
        }}
      />

      <Section eyebrow="Sound familiar?" title={<>You take the photo.<br />Then you delete it.</>} className="pt-0">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
            <p>Not because you looked bad.</p>
            <p>Because the light was off. Or the edit was. Or it stopped feeling like you.</p>
            <p>That is not a confidence problem.</p>
            <p>It is a system problem.</p>
          </div>
          <div className="public-image-frame relative aspect-[4/5]">
            <Image
              src="/images/selfie-guide/face-covered-selfie.jpg"
              alt="Selfie frustration moment"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>
      </Section>

      <Section eyebrow="Starter Kit" title={<>Three things.<br />That&apos;s it.</>} surface="alt">
        <div className="grid gap-4 md:grid-cols-3">
          {starterKitItems.map((item) => (
            <article key={item} className="public-card min-h-40 p-6">
              <p className="public-eyebrow mb-5">Included</p>
              <h3 className="text-3xl leading-tight text-[var(--stone-950)]">{item}</h3>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="It works" title="Same phone. Same face. Better light. Better edit.">
        <BeforeAfterProof />
      </Section>

      <Section title={<>I almost didn&apos;t post the one that took off.</>} surface="alt">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="public-image-frame relative aspect-[4/5]">
            <Image
              src="/images/selfie-guide/black-blazer-coffee-standing.jpg"
              alt="Sandra-style portrait standing with coffee"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
            <p>I used to spend too long editing one photo.</p>
            <p>Then delete it anyway.</p>
            <p>What changed wasn&apos;t my face.</p>
            <p>It was the system behind the photo.</p>
          </div>
        </div>
      </Section>

      <Section title={<>Start with the right thing.</>} className="pb-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {productLadder.map((item) => (
            <Link
              key={item.title}
              href={withReferral(item.href)}
              className="public-card flex min-h-56 flex-col justify-between p-6 transition-opacity hover:opacity-80"
            >
              <div className="space-y-4">
                <p className="public-eyebrow">{item.price}</p>
                <h3 className="text-3xl leading-tight text-[var(--stone-950)]">{item.title}</h3>
                <p className="text-sm leading-7 text-[var(--stone-800)]">{item.subtitle}</p>
              </div>
              <span className="text-sm uppercase tracking-[0.25em] text-[var(--stone-400)]">See page</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title={<>Not ready to buy yet?<br />Start here.</>} surface="alt">
        <div className="grid gap-8 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
            <p>The free Selfie Guide gives you the basics: light, angles, edits, and what to do first.</p>
            <CTAGroup primaryHref={withReferral("/selfie-guide")} primaryLabel="Get the Free Guide" />
          </div>
          <div className="public-image-frame relative aspect-[4/5]">
            <Image
              src="/images/selfie-guide/ring-light-guide-portrait.png"
              alt="Selfie guide portrait"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
        </div>
      </Section>

      <Section title={<>Your photos are not the problem.<br />Your system is.</>}>
        <div className="max-w-3xl">
          <CTAGroup
            primaryHref={withReferral("/selfie-guide")}
            primaryLabel="Get the Free Guide"
            secondaryHref={withReferral("/starter-kit")}
            secondaryLabel="See the Starter Kit"
          />
        </div>
      </Section>

      <PublicFooter />
    </PublicPageShell>
  )
}

export function StarterKitPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />
      <Hero
        eyebrow="Starter Kit"
        title={
          <>
            Your photos will look like you took them on a good day.
            <br />
            Even when it wasn&apos;t.
          </>
        }
        body={
          <>
            <p>You keep meaning to post.</p>
            <p>Then you look at the photo and something feels off.</p>
            <p>That part is easier to fix than you think.</p>
          </>
        }
        primaryHref="/checkout/starter-kit"
        primaryLabel="Get the Starter Kit"
        secondaryHref="/selfie-guide"
        secondaryLabel="Start Free"
        image={{
          src: "/images/selfie-guide/black-blazer-seated-coffee.jpg",
          alt: "Starter kit portrait",
        }}
      />

      <Section eyebrow="Sound familiar?" title="You know when the photo is close. But not close enough." className="pt-0">
        <div className="max-w-3xl space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
          <p>You don&apos;t need a new face.</p>
          <p>You need better light. A cleaner edit. And a faster way to stop second-guessing it.</p>
        </div>
      </Section>

      <Section eyebrow="What is inside" title="The first fix." surface="alt">
        <div className="grid gap-4 md:grid-cols-3">
          {starterKitItems.map((item) => (
            <article key={item} className="public-card min-h-40 p-6">
              <h3 className="text-3xl leading-tight text-[var(--stone-950)]">{item}</h3>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Proof" title="Same photo. Better finish.">
        <BeforeAfterProof />
      </Section>

      <Section eyebrow="FAQ" title="A few things people ask." surface="alt">
        <FaqGrid items={starterKitFaqs} />
      </Section>

      <Section title="Start with the part that changes the result fastest.">
        <CTAGroup primaryHref="/checkout/starter-kit" primaryLabel="Get the Starter Kit" secondaryHref="/masterclass" secondaryLabel="See Masterclass" />
      </Section>

      <PublicFooter />
    </PublicPageShell>
  )
}

export function MasterclassPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />
      <Hero
        eyebrow="Masterclass"
        title={
          <>
            You&apos;ve got the presets.
            <br />
            Now learn the full method.
          </>
        }
        body={
          <>
            <p>The Masterclass is for the person who wants the full picture.</p>
            <p>Not just how to edit one photo. How to keep getting one you want to post.</p>
          </>
        }
        primaryHref="/checkout/masterclass"
        primaryLabel="Enroll"
        secondaryHref="/starter-kit"
        secondaryLabel="See the Kit"
        image={{
          src: "/images/selfie-guide/cloudy-mountain-guide-portrait.jpg",
          alt: "Masterclass portrait",
        }}
      />

      <Section eyebrow="Modules" title="Light. Pose. Edit. Post. Repeat." className="pt-0">
        <div className="grid gap-4 md:grid-cols-5">
          {["Light", "Pose", "Edit", "Post", "Repeat"].map((module) => (
            <article key={module} className="public-card p-6">
              <h3 className="text-3xl text-[var(--stone-950)]">{module}</h3>
            </article>
          ))}
        </div>
      </Section>

      <Section title="This is the part that took me longer to learn than I want it to take you." surface="alt">
        <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-center">
          <div className="public-image-frame relative aspect-[4/5]">
            <Image
              src="/images/selfie-guide/window-natural-guide-portrait.jpg"
              alt="Sandra-style natural window portrait"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
            <p>The method is simple once you see it.</p>
            <p>Before that, it feels random.</p>
            <p>This is the part that stops it feeling random.</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="Who it is for" title="For the person who is tired of hoping one good photo happens again.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "You post, but not as often as you want.",
            "You know your photos could feel more like you.",
            "You want a repeatable method, not more guessing.",
          ].map((line) => (
            <article key={line} className="public-card p-6">
              <p className="text-base leading-8 text-[var(--stone-800)]">{line}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="FAQ" title="A few things before you enroll." surface="alt">
        <FaqGrid items={masterclassFaqs} />
      </Section>

      <Section title="Learn the method once. Use it every time.">
        <CTAGroup primaryHref="/checkout/masterclass" primaryLabel="Enroll" secondaryHref="/join/studio" secondaryLabel="See Studio" />
      </Section>

      <PublicFooter />
    </PublicPageShell>
  )
}

export function StudioPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />
      <Hero
        eyebrow="Studio"
        title={
          <>
            The AI that already knows your brand.
            <br />
            And gets smarter every time you use it.
          </>
        }
        body={
          <>
            <p>Maya, image generation, Feed Planner, and Academy for creators who already know the look they want.</p>
          </>
        }
        primaryHref="/checkout/membership"
        primaryLabel="Join Studio"
        secondaryHref="/masterclass"
        secondaryLabel="See Masterclass"
        image={{
          src: "/images/selfie-guide/studio-black-portrait.png",
          alt: "Studio black portrait",
        }}
      />

      <Section eyebrow="Inside Studio" title="The advanced layer." className="pt-0">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { title: "Maya", body: "The AI layer that remembers what you mean." },
            { title: "Images", body: "Generation that starts from your brand, not a blank page." },
            { title: "Feed Planner", body: "Structure when the posting part keeps slipping." },
            { title: "Academy", body: "The method and references in the same place." },
          ].map((item) => (
            <article key={item.title} className="public-card p-6">
              <h3 className="text-3xl text-[var(--stone-950)]">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-[var(--stone-800)]">{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Studio comes after the basics, not before." surface="alt">
        <div className="max-w-3xl space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
          <p>The homepage used to lead with AI.</p>
          <p>The better truth is this: the education comes first. Then the speed.</p>
          <p>Studio is for the person who already knows the look she is building.</p>
        </div>
      </Section>

      <Section eyebrow="FAQ" title="A few things people ask before joining.">
        <FaqGrid items={studioFaqs} />
      </Section>

      <Section title="When you want the advanced layer, this is it." surface="alt">
        <CTAGroup primaryHref="/checkout/membership" primaryLabel="Join Studio" secondaryHref="/starter-kit" secondaryLabel="Start Smaller" />
      </Section>

      <PublicFooter />
    </PublicPageShell>
  )
}

export function WorkWithMePageContent() {
  return (
    <PublicPageShell>
      <PublicNav />
      <Hero
        eyebrow="1:1 with Sandra"
        title={
          <>
            Two or three people at a time.
            <br />
            That&apos;s all.
          </>
        }
        body={
          <>
            <p>If what&apos;s not working is bigger than one preset or one lesson, this is where we start looking at the full picture.</p>
          </>
        }
        primaryHref="#inquiry-form"
        primaryLabel="Send an inquiry"
        secondaryHref="/join/studio"
        secondaryLabel="See Studio"
        image={{
          src: "/images/selfie-guide/golden-hour-guide-portrait.jpg",
          alt: "Sandra-style golden hour portrait",
        }}
      />

      <Section title="This is for the person who wants direct eyes on the problem." className="pt-0">
        <div className="max-w-3xl space-y-4 text-base leading-8 text-[var(--stone-800)] md:text-lg">
          <p>Maybe the issue is the photos.</p>
          <p>Maybe it&apos;s the offer. Or the posting. Or the way none of it feels like you yet.</p>
          <p>That is what this is for.</p>
        </div>
      </Section>

      <Section title="Send the short version first." surface="alt" className="scroll-mt-24" >
        <div id="inquiry-form" className="grid gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div className="space-y-4">
            <p className="public-eyebrow">Inquiry</p>
            <h2 className="public-section-title">Tell me what is not working right now.</h2>
            <p className="text-base leading-8 text-[var(--stone-800)] md:text-lg">
              Keep it simple. I only need enough to know whether this is the right fit.
            </p>
          </div>
          <WorkWithMeInquiryForm />
        </div>
      </Section>

      <PublicFooter />
    </PublicPageShell>
  )
}
