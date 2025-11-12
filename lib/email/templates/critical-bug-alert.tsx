interface CriticalBugAlertEmailProps {
  feedbackId: string
  severity: string
  category: string
  subject: string
  message: string
  userName: string
  userEmail: string
  likelyCause: string
  suggestedFiles: string[]
  createdAt: string
}

export default function CriticalBugAlertEmail({
  feedbackId,
  severity,
  category,
  subject,
  message,
  userName,
  userEmail,
  likelyCause,
  suggestedFiles,
  createdAt,
}: CriticalBugAlertEmailProps) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/admin/feedback`

  return (
    <html>
      <body
        style={{ fontFamily: "system-ui, -apple-system, sans-serif", backgroundColor: "#fafaf9", padding: "40px 20px" }}
      >
        <div
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #e7e5e4",
          }}
        >
          {/* Header */}
          <div style={{ backgroundColor: "#dc2626", padding: "32px", textAlign: "center" }}>
            <h1
              style={{
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: "300",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                margin: "0",
              }}
            >
              CRITICAL ISSUE
            </h1>
            <p style={{ color: "#fef2f2", fontSize: "14px", margin: "8px 0 0 0" }}>Immediate attention required</p>
          </div>

          {/* Content */}
          <div style={{ padding: "32px" }}>
            {/* Severity Badge */}
            <div style={{ marginBottom: "24px", textAlign: "center" }}>
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: "#fef2f2",
                  color: "#991b1b",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {severity} SEVERITY - {category}
              </span>
            </div>

            {/* Issue Summary */}
            <div
              style={{
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#f5f5f4",
                borderRadius: "12px",
                borderLeft: "4px solid #dc2626",
              }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#1c1917", margin: "0 0 12px 0" }}>
                Issue Summary
              </h2>
              <p style={{ fontSize: "16px", color: "#44403c", margin: "0 0 8px 0", fontWeight: "500" }}>{subject}</p>
              <p style={{ fontSize: "14px", color: "#57534e", margin: "0", lineHeight: "1.6" }}>{message}</p>
            </div>

            {/* User Info */}
            <div style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#78716c",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px 0",
                }}
              >
                Reported By
              </h3>
              <p style={{ fontSize: "14px", color: "#1c1917", margin: "0" }}>
                <strong>{userName}</strong> ({userEmail})
              </p>
              <p style={{ fontSize: "12px", color: "#78716c", margin: "4px 0 0 0" }}>
                {new Date(createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* AI Analysis */}
            <div
              style={{
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#f0fdf4",
                borderRadius: "12px",
                border: "1px solid #bbf7d0",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#166534",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px 0",
                }}
              >
                AI Analysis
              </h3>
              <p style={{ fontSize: "14px", color: "#166534", margin: "0 0 12px 0", lineHeight: "1.6" }}>
                <strong>Likely Cause:</strong> {likelyCause}
              </p>
              {suggestedFiles.length > 0 && (
                <div>
                  <p style={{ fontSize: "12px", color: "#166534", margin: "0 0 8px 0", fontWeight: "600" }}>
                    Files to Check:
                  </p>
                  <ul style={{ margin: "0", paddingLeft: "20px" }}>
                    {suggestedFiles.map((file, idx) => (
                      <li
                        key={idx}
                        style={{ fontSize: "12px", color: "#15803d", fontFamily: "monospace", marginBottom: "4px" }}
                      >
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Items */}
            <div
              style={{
                marginBottom: "24px",
                padding: "20px",
                backgroundColor: "#fffbeb",
                borderRadius: "12px",
                border: "1px solid #fde68a",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#92400e",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  margin: "0 0 12px 0",
                }}
              >
                Actions Needed
              </h3>
              <ul style={{ margin: "0", paddingLeft: "20px" }}>
                <li style={{ fontSize: "14px", color: "#92400e", marginBottom: "8px" }}>Investigate and fix the bug</li>
                <li style={{ fontSize: "14px", color: "#92400e", marginBottom: "8px" }}>Reply to user with solution</li>
                <li style={{ fontSize: "14px", color: "#92400e", marginBottom: "0" }}>Monitor for similar reports</li>
              </ul>
            </div>

            {/* CTA Button */}
            <div style={{ textAlign: "center", marginTop: "32px" }}>
              <a
                href={dashboardUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#1c1917",
                  color: "#ffffff",
                  padding: "14px 32px",
                  borderRadius: "12px",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: "600",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Reply in Dashboard
              </a>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "24px 32px",
              backgroundColor: "#fafaf9",
              borderTop: "1px solid #e7e5e4",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "12px", color: "#78716c", margin: "0" }}>
              This is an automated alert from SSELFIE Studio
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
