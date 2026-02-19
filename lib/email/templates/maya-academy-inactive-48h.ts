interface MayaAcademyInactive48hParams {
  firstName?: string
}

export function generateMayaAcademyInactive48hEmail(params: MayaAcademyInactive48hParams = {}) {
  const name = params.firstName?.trim() || "there"
  const subject = `Hey ${name} — Maya has something for you`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
      <p style="font-size: 16px; line-height: 1.6;">Hey ${name},</p>
      <p style="font-size: 16px; line-height: 1.6;">
        I noticed you haven’t been in for a bit.
      </p>
      <p style="font-size: 16px; line-height: 1.6;">
        Here’s a 3-minute tutorial that will change how you use SSELFIE.
      </p>
      <p style="margin: 24px 0;">
        <a
          href="https://sselfie.ai/studio#maya"
          style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;"
        >
          Open Maya Tutorial
        </a>
      </p>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">No pressure. You’ve got this.</p>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">Sandra & Maya</p>
    </div>
  `

  const text = `Hey ${name},

I noticed you haven't been in for a bit.
Here's a 3-minute tutorial that will change how you use SSELFIE.

Open Maya Tutorial: https://sselfie.ai/studio#maya

No pressure. You've got this.

Sandra & Maya`

  return { subject, html, text }
}
