import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { logAnalyticsEventMock, trackAnalyticsEventMock } = vi.hoisted(() => ({
  logAnalyticsEventMock: vi.fn(),
  trackAnalyticsEventMock: vi.fn(),
}))

vi.mock("@/lib/analytics/events", () => ({
  logAnalyticsEvent: logAnalyticsEventMock,
}))

vi.mock("@/lib/analytics/client", () => ({
  trackAnalyticsEvent: trackAnalyticsEventMock,
}))

import WorkWithMePage from "@/app/work-with-me/page"
import { InquiryForm } from "@/components/sselfie/public-marketing"
import { ALLOWED_ANALYTICS_EVENTS } from "@/lib/analytics/event-contract"

describe("Work With Me instrumentation", () => {
  beforeEach(() => {
    logAnalyticsEventMock.mockReset().mockResolvedValue({ ok: true })
    trackAnalyticsEventMock.mockReset().mockResolvedValue(undefined)
    vi.restoreAllMocks()
  })

  it("records the landing view on the server", async () => {
    await WorkWithMePage()

    expect(logAnalyticsEventMock).toHaveBeenCalledWith({
      eventName: "work_with_me_landing_view",
      path: "/work-with-me",
      properties: {
        source: "work_with_me_page",
      },
    })
  })

  it("records form start exactly once when fields are first touched", () => {
    render(<InquiryForm />)

    fireEvent.focus(screen.getByLabelText("Name"))
    fireEvent.focus(screen.getByLabelText("Email"))
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sandra@example.com" } })

    expect(trackAnalyticsEventMock).toHaveBeenCalledTimes(1)
    expect(trackAnalyticsEventMock).toHaveBeenCalledWith({
      event: "work_with_me_application_started",
      properties: { source: "work_with_me_form" },
    })
  })

  it("records a successful application submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    render(<InquiryForm />)

    const submit = screen.getByRole("button", { name: "Apply for the Sprint" })
    fireEvent.submit(submit.closest("form")!)

    await waitFor(() => {
      expect(screen.getByText("Your application has been sent.")).toBeInTheDocument()
    })
    expect(trackAnalyticsEventMock).toHaveBeenCalledWith({
      event: "work_with_me_application_submitted",
      properties: { source: "work_with_me_form" },
    })
  })

  it("records a failed application submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Please try again." }),
    } as Response)
    render(<InquiryForm />)

    const submit = screen.getByRole("button", { name: "Apply for the Sprint" })
    fireEvent.submit(submit.closest("form")!)

    await waitFor(() => {
      expect(screen.getByText("Please try again.")).toBeInTheDocument()
    })
    expect(trackAnalyticsEventMock).toHaveBeenCalledWith({
      event: "work_with_me_application_failed",
      properties: { source: "work_with_me_form" },
    })
  })

  it("allows all four Work With Me events through the analytics contract", () => {
    expect(ALLOWED_ANALYTICS_EVENTS).toEqual(
      expect.arrayContaining([
        "work_with_me_landing_view",
        "work_with_me_application_started",
        "work_with_me_application_submitted",
        "work_with_me_application_failed",
      ]),
    )
  })
})
