"use client"

import type React from "react"
import { useMemo, useState } from "react"
import type {
  MayaOfferBrief,
  MayaOfferBriefAssetType,
  MayaOfferBriefField,
  MayaOfferBriefFormValues,
} from "@/lib/maya/offer-brief"

type OfferBriefFormValues = Omit<MayaOfferBrief, "assetType">

interface MayaOfferBriefFormProps {
  assetType?: MayaOfferBriefAssetType
  onSubmit: (assetType: MayaOfferBriefAssetType, values: OfferBriefFormValues) => void
  initialValues?: Partial<MayaOfferBriefFormValues>
  missingFields?: MayaOfferBriefField[]
}

const INITIAL_VALUES: OfferBriefFormValues = {
  designStyle: "",
  offerType: "",
  transformation: "",
  pricePoint: "",
  formatAndDuration: "",
  idealClient: "",
  biggestStruggle: "",
  uniqueMethod: "",
  proofPoints: "",
  callToAction: "",
}

const CORE_FIELDS: MayaOfferBriefField[] = ["offerType", "transformation", "idealClient"]
const ALL_FIELDS: MayaOfferBriefField[] = [
  "offerType",
  "transformation",
  "pricePoint",
  "formatAndDuration",
  "idealClient",
  "biggestStruggle",
  "uniqueMethod",
  "proofPoints",
  "callToAction",
]

const FIELD_LABELS: Record<MayaOfferBriefField, string> = {
  designStyle: "Design style",
  offerType: "What are you selling?",
  transformation: "Main transformation",
  pricePoint: "Price point",
  formatAndDuration: "Format / duration",
  idealClient: "Ideal client",
  biggestStruggle: "Biggest struggle",
  uniqueMethod: "Unique method / angle",
  proofPoints: "Proof points",
  callToAction: "Primary CTA",
}

const FIELD_PLACEHOLDERS: Record<MayaOfferBriefField, string> = {
  designStyle: "Scandinavian minimal, luxury editorial, bold playful...",
  offerType: "Course, service, coaching...",
  transformation: "What result do they get?",
  pricePoint: "€97, $497, etc",
  formatAndDuration: "4-week cohort, 1:1, self-paced",
  idealClient: "Who this is for",
  biggestStruggle: "What pain should the page call out?",
  uniqueMethod: "Your framework or difference",
  proofPoints: "Testimonials, outcomes, case studies",
  callToAction: "Book call, enroll now, join today",
}

const INPUT_CLASS =
  "w-full rounded-lg border border-[rgba(255,255,255,0.16)] bg-[rgba(10,10,10,0.72)] px-3 py-2 text-sm text-[#ffffff] placeholder:text-[#9a9a9a] focus:border-[rgba(255,255,255,0.32)] focus:outline-none"

const STYLE_OPTIONS = [
  { label: "Scandinavian", value: "scandinavian minimal" },
  { label: "Luxury", value: "luxury editorial" },
  { label: "Bold", value: "bold playful" },
  { label: "Moody", value: "dark moody" },
]

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim()
}

function dedupeMissingFields(fields: MayaOfferBriefField[]): MayaOfferBriefField[] {
  const deduped: MayaOfferBriefField[] = []
  for (const field of fields) {
    if (!ALL_FIELDS.includes(field)) continue
    if (!deduped.includes(field)) deduped.push(field)
  }
  return deduped
}

export default function MayaOfferBriefForm({
  assetType = "page",
  onSubmit,
  initialValues = {},
  missingFields = [],
}: MayaOfferBriefFormProps) {
  const [values, setValues] = useState<OfferBriefFormValues>({
    ...INITIAL_VALUES,
    ...initialValues,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showAllFields, setShowAllFields] = useState(false)

  const normalizedMissingFields = useMemo(() => dedupeMissingFields(missingFields), [missingFields])

  const hasCoreData = useMemo(() => {
    return CORE_FIELDS.every((field) => normalizeText(values[field]).length > 0)
  }, [values])

  const fieldsToRender = useMemo(() => {
    if (showAllFields) return ALL_FIELDS
    if (normalizedMissingFields.length === 0) return []
    return normalizedMissingFields
  }, [normalizedMissingFields, showAllFields])

  const updateField = (field: MayaOfferBriefField, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }))
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasCoreData) {
      setError(
        `I still need your offer, transformation, and ideal client before I build the ${assetType === "calendar" ? "calendar" : "page"}.`,
      )
      return
    }

    setError(null)
    setSubmitted(true)
    onSubmit(assetType, {
      designStyle: normalizeText(values.designStyle),
      offerType: normalizeText(values.offerType),
      transformation: normalizeText(values.transformation),
      pricePoint: normalizeText(values.pricePoint),
      formatAndDuration: normalizeText(values.formatAndDuration),
      idealClient: normalizeText(values.idealClient),
      biggestStruggle: normalizeText(values.biggestStruggle),
      uniqueMethod: normalizeText(values.uniqueMethod),
      proofPoints: normalizeText(values.proofPoints),
      callToAction: normalizeText(values.callToAction),
    })
  }

  const summaryRows = [
    { label: "Style", value: values.designStyle },
    { label: "Offer", value: values.offerType },
    { label: "Transformation", value: values.transformation },
    { label: "Ideal Client", value: values.idealClient },
  ].filter((row) => normalizeText(row.value).length > 0)

  return (
    <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.04)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.2em] text-[#e5e5e5]">
          {assetType === "calendar" ? "Calendar Brief" : "Page Brief"}
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#9a9a9a]">
          {normalizedMissingFields.length > 0 ? `${normalizedMissingFields.length} needed` : "Memory loaded"}
        </div>
      </div>

      <p className="mt-2 text-xs text-[#cfcfcf]">
        {normalizedMissingFields.length > 0
          ? `I already filled what I know from your profile and memory. Add the missing bits and I’ll build the ${assetType === "calendar" ? "calendar" : "page"} draft.`
          : `I already pulled your profile and memory. Use this as-is, or tweak details below before I build the ${assetType === "calendar" ? "calendar" : "page"}.`}
      </p>

      <div className="mt-3 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.25)] p-3">
        <div className="text-[11px] uppercase tracking-[0.14em] text-[#dcdcdc]">Design Direction</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STYLE_OPTIONS.map((option) => {
            const selected = normalizeText(values.designStyle).toLowerCase() === option.value
            return (
              <button
                key={option.value}
                type="button"
                disabled={submitted}
                onClick={() => updateField("designStyle", option.value)}
                className={`rounded-md border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  selected
                    ? "border-[rgba(255,255,255,0.34)] bg-[rgba(255,255,255,0.12)] text-[#ffffff]"
                    : "border-[rgba(255,255,255,0.18)] text-[#d7d7d7] hover:bg-[rgba(255,255,255,0.08)]"
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        <input
          type="text"
          value={values.designStyle}
          onChange={(event) => updateField("designStyle", event.target.value)}
          className={`${INPUT_CLASS} mt-2`}
          placeholder={FIELD_PLACEHOLDERS.designStyle}
          disabled={submitted}
        />
      </div>

      {fieldsToRender.length === 0 ? (
        <div className="mt-3 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(0,0,0,0.25)] p-3">
          {summaryRows.length > 0 ? (
            <div className="space-y-1.5">
              {summaryRows.map((row) => (
                <div key={row.label} className="text-xs text-[#d7d7d7]">
                  <span className="uppercase tracking-[0.14em] text-[#a8a8a8]">{row.label}:</span> {row.value}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#d7d7d7]">No saved offer context yet. Open details and I’ll set this up fast.</p>
          )}
        </div>
      ) : null}

      {fieldsToRender.length > 0 ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {fieldsToRender.map((field) => {
            const isLarge =
              field === "transformation" ||
              field === "idealClient" ||
              field === "biggestStruggle" ||
              field === "uniqueMethod" ||
              field === "proofPoints"
            const required = CORE_FIELDS.includes(field)

            return (
              <label key={field} className={`flex flex-col gap-1 ${isLarge ? "sm:col-span-2" : ""}`}>
                <span className="text-[11px] uppercase tracking-[0.14em] text-[#dcdcdc]">
                  {FIELD_LABELS[field]}
                  {required ? "*" : ""}
                </span>
                {isLarge ? (
                  <textarea
                    value={values[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    className={`${INPUT_CLASS} min-h-[68px] resize-y`}
                    placeholder={FIELD_PLACEHOLDERS[field]}
                    disabled={submitted}
                  />
                ) : (
                  <input
                    type="text"
                    value={values[field]}
                    onChange={(event) => updateField(field, event.target.value)}
                    className={INPUT_CLASS}
                    placeholder={FIELD_PLACEHOLDERS[field]}
                    disabled={submitted}
                  />
                )}
              </label>
            )
          })}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAllFields((prev) => !prev)}
          className="rounded-md border border-[rgba(255,255,255,0.18)] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#d7d7d7] hover:bg-[rgba(255,255,255,0.08)]"
        >
          {showAllFields ? "Hide Extra Fields" : "Edit Everything"}
        </button>
      </div>

    {error ? <p className="mt-2 text-xs text-[#f3b2b2]">{error}</p> : null}
      {submitted ? (
        <p className="mt-2 text-xs text-[#b9d8b9]">
          Saved. I’m building your {assetType === "calendar" ? "calendar" : "page"} draft now.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitted || !hasCoreData}
        className="mt-3 rounded-lg border border-[rgba(255,255,255,0.22)] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] transition-colors hover:bg-[rgba(255,255,255,0.14)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitted ? "Submitted" : assetType === "calendar" ? "Build Calendar Draft" : "Build Page Draft"}
      </button>
    </form>
  )
}
