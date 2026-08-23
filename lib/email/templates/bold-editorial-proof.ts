import { BOLD_EDITORIAL_COLORS } from "@/lib/brand/bold-editorial-tokens"
import { escapeHtml } from "./stone-email"

export interface BoldEditorialProofEmailOptions {
  ctaHref?: string
  unsubscribeHref?: string
}

export function renderBoldEditorialProofEmail({
  ctaHref = "https://www.sselfie.ai/selfie-guide",
  unsubscribeHref = "#unsubscribe",
}: BoldEditorialProofEmailOptions = {}): string {
  const colors = BOLD_EDITORIAL_COLORS
  const heroUrl = "https://www.sselfie.ai/images/selfie-guide/mirror-sunglasses-blazer.jpg"

  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>One selfie. Four useful moves.</title>
  <style>
    @media only screen and (max-width: 620px) {
      .be-outer { padding: 0 !important; }
      .be-shell { width: 100% !important; }
      .be-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .be-title { font-size: 42px !important; line-height: .88 !important; }
      .be-steps td { font-size: 9px !important; letter-spacing: .08em !important; padding: 13px 4px !important; }
      .be-hero { height: 430px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${colors.concrete};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Start with the photo already in your camera roll.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${colors.concrete};">
    <tr>
      <td class="be-outer" align="center" style="padding:34px 14px 48px;">
        <table class="be-shell" role="presentation" width="640" cellspacing="0" cellpadding="0" border="0" style="width:640px;max-width:640px;background:${colors.paper};">
          <tr>
            <td class="be-pad" style="background:${colors.ink};padding:28px 38px 24px;color:${colors.paper};font-family:Georgia,'Times New Roman',serif;font-size:25px;letter-spacing:.11em;text-transform:uppercase;">
              SSELFIE
            </td>
          </tr>
          <tr class="be-steps">
            <td style="padding:0;background:${colors.chalk};border-bottom:1px solid ${colors.silver};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding:14px 6px;border-bottom:2px solid ${colors.oxblood};font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.16em;color:${colors.ink};">TAKE</td>
                  <td align="center" style="padding:14px 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.16em;color:${colors.slate};">CREATE</td>
                  <td align="center" style="padding:14px 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.16em;color:${colors.slate};">EDIT</td>
                  <td align="center" style="padding:14px 6px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.16em;color:${colors.slate};">POST</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="be-hero" height="520" valign="bottom" background="${heroUrl}" style="height:520px;background-image:linear-gradient(to top,rgba(13,14,16,.88),rgba(13,14,16,.02) 62%),url('${heroUrl}');background-position:center 30%;background-size:cover;">
              <!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:480pt;height:390pt;"><v:fill type="frame" src="${heroUrl}" color="${colors.ink}"/><v:textbox inset="0,0,0,0"><![endif]-->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td class="be-pad" style="padding:36px 38px;color:${colors.paper};">
                    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;">THE SSELFIE METHOD · 01</p>
                    <h1 class="be-title" style="margin:0;max-width:480px;font-family:Georgia,'Times New Roman',serif;font-size:62px;font-weight:400;line-height:.86;letter-spacing:-.045em;">One selfie.<br>Four useful moves.</h1>
                  </td>
                </tr>
              </table>
              <!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
            </td>
          </tr>
          <tr>
            <td class="be-pad" style="padding:40px 38px 16px;background:${colors.paper};color:${colors.carbon};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.75;">
              <p style="margin:0 0 20px;">You do not need another complicated content system. Start with the photo already in your camera roll.</p>
              <p style="margin:0 0 28px;">Take it with intention. Create the AI version. Edit it until it still feels like you. Then turn it into something ready to post.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:${colors.oxblood};border:1px solid ${colors.oxblood};">
                    <a href="${escapeHtml(ctaHref)}" style="display:inline-block;padding:16px 25px;color:${colors.paper};font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;text-decoration:none;text-transform:uppercase;">START WITH TAKE&nbsp;&nbsp;→</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="be-pad" style="padding:30px 38px 36px;background:${colors.paper};">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr><td style="border-top:1px solid ${colors.silver};font-size:0;line-height:0;">&nbsp;</td></tr>
                <tr>
                  <td style="padding-top:24px;color:${colors.ink};font-family:Georgia,'Times New Roman',serif;font-size:24px;">Sandra x</td>
                  <td align="right" valign="bottom" style="padding-top:24px;color:${colors.slate};font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:1.6;letter-spacing:.08em;text-transform:uppercase;">
                    SSELFIE<br><a href="${escapeHtml(unsubscribeHref)}" style="color:${colors.slate};text-decoration:underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
