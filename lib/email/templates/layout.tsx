/**
 * Maya Email Layout
 * Vogue-inspired minimal design - black + white
 * Responsive, works across Gmail, Apple Mail, Outlook
 */

import React from "react"

export interface EmailLayoutProps {
  children: React.ReactNode
  previewText?: string
}

export function EmailLayout({ children, previewText }: EmailLayoutProps) {
  return (
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        {previewText && <meta name="description" content={previewText} />}
        <title>SSELFIE</title>
        <style>{`
          /* Reset */
          body, table, td, p, a, li, blockquote {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }
          img {
            -ms-interpolation-mode: bicubic;
            border: 0;
            outline: none;
            text-decoration: none;
          }
          
          /* Base Styles */
          body {
            margin: 0;
            padding: 0;
            width: 100% !important;
            height: 100% !important;
            background-color: #fafaf9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #1c1917;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Container */
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
          }
          
          /* Content */
          .email-content {
            padding: 60px 40px;
          }
          
          @media only screen and (max-width: 600px) {
            .email-content {
              padding: 40px 24px;
            }
          }
          
          /* Typography */
          h1 {
            font-size: 32px;
            font-weight: 300;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            margin: 0 0 24px 0;
            color: #1c1917;
            line-height: 1.2;
          }
          
          h2 {
            font-size: 24px;
            font-weight: 400;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            margin: 40px 0 20px 0;
            color: #1c1917;
            line-height: 1.3;
          }
          
          h3 {
            font-size: 18px;
            font-weight: 500;
            margin: 32px 0 16px 0;
            color: #1c1917;
            line-height: 1.4;
          }
          
          p {
            font-size: 16px;
            line-height: 1.7;
            color: #292524;
            margin: 0 0 20px 0;
            font-weight: 300;
          }
          
          a {
            color: #1c1917;
            text-decoration: underline;
            text-decoration-thickness: 1px;
            text-underline-offset: 2px;
          }
          
          a:hover {
            text-decoration: none;
          }
          
          /* Button */
          .button {
            display: inline-block;
            padding: 16px 32px;
            background-color: #1c1917;
            color: #ffffff;
            text-decoration: none;
            border-radius: 0;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            text-align: center;
            margin: 24px 0;
          }
          
          .button:hover {
            background-color: #292524;
          }
          
          /* Divider */
          .divider {
            height: 1px;
            background-color: #e7e5e4;
            margin: 40px 0;
            border: none;
          }
          
          /* Footer */
          .footer {
            padding: 40px;
            background-color: #fafaf9;
            border-top: 1px solid #e7e5e4;
            text-align: center;
          }
          
          .footer p {
            font-size: 13px;
            color: #78716c;
            margin: 8px 0;
          }
          
          .footer a {
            color: #78716c;
            text-decoration: underline;
          }
          
          @media only screen and (max-width: 600px) {
            .footer {
              padding: 32px 24px;
            }
          }
          
          /* Brand Header */
          .brand-header {
            text-align: center;
            padding: 40px 40px 20px;
            border-bottom: 1px solid #e7e5e4;
          }
          
          .brand-name {
            font-family: Georgia, serif;
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: #1c1917;
            margin: 0;
          }
          
          @media only screen and (max-width: 600px) {
            .brand-header {
              padding: 32px 24px 16px;
            }
            .brand-name {
              font-size: 24px;
            }
          }
        `}</style>
      </head>
      <body>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafaf9;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" border="0" width="100%">
                {/* Brand Header */}
                <tr>
                  <td class="brand-header">
                    <h1 class="brand-name">SSELFIE</h1>
                  </td>
                </tr>
                
                {/* Main Content */}
                <tr>
                  <td class="email-content">
                    {children}
                  </td>
                </tr>
                
                {/* Footer */}
                <tr>
                  <td class="footer">
                    <p>
                      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>
                    </p>
                    <p>Questions? Just reply to this email. Maya reads every message.</p>
                    <p style="margin-top: 16px; font-size: 11px; color: #a8a29e;">
                      © {new Date().getFullYear()} SSELFIE. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  )
}

