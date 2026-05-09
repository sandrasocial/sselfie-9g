# Academy Product Architecture

*Established: 2026-05-09. Read this before building any new paid product inside SSELFIE.*

---

## The Standard: One Viewer, All Products

All paid products route through the same in-app course viewer.
No standalone access pages. No custom standalone layouts. No separate design systems.

**The viewer lives at:** `/academy/courses/[courseId]/lessons/[lessonId]`

It provides:
- App shell navigation (top nav with Maya, Gallery, Academy, etc.)
- Back button to the Academy library
- Video player (Vimeo embed)
- Tabbed content: Lesson / Action steps / Resources
- Per-lesson resource downloads (PDFs, presets, links)
- Notes saving
- Maya chat bubble for lesson questions
- Progress tracking

---

## Access Gate Pattern

Every product needs an auth + entitlement gate at `/academy/access/[product-slug]/page.tsx`.

This page does **one thing**: verify access, look up the course ID, and redirect.

```tsx
// app/academy/access/[product-slug]/page.tsx
export default async function ProductAccessPage() {
  // 1. Auth (redirect to login if not authenticated)
  const { neonUser } = await requireAcademyPageUser("/academy/access/[product-slug]")

  // 2. Entitlement check (redirect to marketing page if no access)
  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  if (!entitlementState.accessibleProductIds.includes("product_id")) {
    redirect("/product-marketing-page")
  }

  // 3. Look up the course ID from the DB
  const rows = await sql`
    SELECT id FROM academy_courses
    WHERE product_id = 'your_product_id'
      AND status = 'published'
    LIMIT 1
  `
  const course = (rows as { id: number }[])[0]
  if (!course) redirect("/product-marketing-page")

  // 4. Redirect into the course viewer
  redirect(`/academy/courses/${course.id}`)
}
```

**See the selfie guide example:** `app/academy/access/selfie-guide/page.tsx`
(It redirects to a token-based URL; other products redirect to the course viewer.)

---

## Product Types and Their Patterns

### Video Course (primary pattern)
Products with video lessons that live in `academy_courses` + `academy_lessons`.

| What | Where |
|------|-------|
| Access gate | `app/academy/access/[slug]/page.tsx` (thin redirect) |
| Course content | `academy_courses` table: `product_id`, `title`, `description`, `status` |
| Lessons | `academy_lessons` table: `course_id`, `title`, `video_url`, `lesson_type`, `content` |
| Resources | `academy_lesson_resources` or JSON in `academy_lessons.content` |
| Viewer | `/academy/courses/[courseId]` and `/academy/courses/[courseId]/lessons/[lessonId]` |
| Admin | `/academy/products` (add/edit courses, lessons, resources) |

**Current video course products:**
- `branded_by_sselfie` — Masterclass (Confidence / Brand / Content)
- `editing_masterclass` — Editing Masterclass (also used by Starter Kit buyers)

### Workbook (interactive tool)
Products that are tools/workbooks rather than video courses.

| What | Where |
|------|-------|
| Access gate | `app/academy/access/[slug]/page.tsx` (thin redirect to workbook) |
| Workbook UI | `app/academy/access/[productSlug]/page.tsx` (generic handler via `[productSlug]`) |
| Component | `components/academy/MiniProductWorkspace` or similar |

**Current workbook products:**
- `what-to-say` → `/academy/access/what-to-say`
- `show-up` → `/academy/access/show-up`
- `get-paid` → `/academy/access/get-paid`
- `ai-photo-prompts` → `/academy/access/ai-photo-prompts`

These use the generic `[productSlug]` catch-all route — no individual page files needed.

### Special products
- **Selfie Guide** — tokenized access at `/selfie-guide/access/[token]`, not a course viewer
- **Brand Strategy Pack** — generates a personal strategy at `/strategy/[accessToken]`

---

## Adding a New Product (Checklist)

### 1. Database
```sql
-- Add the course
INSERT INTO academy_courses (product_id, title, description, status, order_index)
VALUES ('your_product_id', 'Course Title', 'Description', 'published', 10);

-- Add lessons (video_url is Vimeo embed URL)
INSERT INTO academy_lessons (course_id, title, lesson_number, lesson_type, video_url, duration_minutes)
VALUES ([course_id], 'Lesson Title', 1, 'video', 'https://player.vimeo.com/video/...', 12);
```

### 2. Entitlements
Add the product to `lib/academy-entitlements.ts`:
- `ACADEMY_PRODUCTS` array (id, slug, label, deliveryKind, accessTarget)
- Entitlement logic if it bundles with other products

### 3. Access gate
Create `app/academy/access/[product-slug]/page.tsx` using the thin redirect pattern above.

### 4. Visuals
Add to `PRODUCT_VISUALS` in `components/sselfie/academy-screen.tsx`:
```ts
your_product_id: {
  image: "/academy/sselfie-minimalism/academy-[name].jpg",
  label: "Course",  // or "Workbook" / "Prompt pack"
  href: "/academy/access/[product-slug]",
},
```

Add to `FEATURED_PRODUCT_IDS` in the same file so it appears in the Academy library.

### 5. Add to PRODUCT_ACCESS_COPY if needed
For products with custom CTA text, add an entry to `PRODUCT_ACCESS_COPY` in `academy-screen.tsx`.

### 6. Resources
Add downloadable resources (PDFs, presets, links) directly to each lesson via the admin at `/academy/products`. They appear in the lesson viewer's Resources tab — no custom page needed.

---

## What NOT to Build

- **Do not** create a standalone access page with its own layout, fonts, or design system.
- **Do not** build a custom per-product dashboard outside the app shell.
- **Do not** duplicate PDF/download lists outside lesson resources — use the lesson Resources tab.
- **Do not** create custom Maya chat components per product — use the shared lesson Maya chat.
- **Do not** add new routes under `/academy/access/[product]/` for sub-pages — everything lives inside the course viewer.

---

## File Map (Canonical)

```
app/
  academy/
    access/
      [productSlug]/page.tsx     ← generic workbook handler
      masterclass/page.tsx        ← thin redirect → branded_by_sselfie course
      starter-kit/page.tsx        ← thin redirect → editing_masterclass course
      selfie-guide/page.tsx       ← thin redirect → tokenized selfie guide URL
      brand-strategy/page.tsx     ← thin redirect → brand strategy result
    courses/
      [courseId]/
        page.tsx                  ← course overview + lesson list
        lessons/
          [lessonId]/
            page.tsx              ← lesson server wrapper
            lesson-viewer-client.tsx  ← THE canonical lesson viewer (video + tabs + Maya)
    _lib/
      course-library.ts           ← requireAcademyPageUser + data fetchers
      client-utils.ts             ← shared client helpers

components/
  sselfie/
    academy-screen.tsx            ← Academy tab UI (PRODUCT_VISUALS, hrefs live here)

lib/
  academy-entitlements.ts         ← ACADEMY_PRODUCTS, getAcademyEntitlementState
  data/academy.ts                 ← DB queries for courses, lessons, progress
```
