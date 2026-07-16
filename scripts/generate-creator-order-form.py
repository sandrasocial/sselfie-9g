#!/usr/bin/env python3
"""Generate a draft SSELFIE creator partnership order form PDF.

The script intentionally requires buyer and seller legal details for a buyer-ready form.
Use --template to generate a visibly watermarked internal template with placeholders.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Sequence

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


BLACK = colors.HexColor("#0A0A0A")
SMOKE = colors.HexColor("#666666")
STONE = colors.HexColor("#8A8780")
WHISPER = colors.HexColor("#E5E5E5")
PEARL = colors.HexColor("#F5F5F5")
WHITE = colors.white


@dataclass(frozen=True)
class Offer:
    key: str
    title: str
    fee: int
    usage: str
    delivery: str
    deliverables: Sequence[str]
    not_included: str
    terms: Sequence[str]


OFFERS = {
    "tutorial-partnership": Offer(
        key="tutorial-partnership",
        title="SSELFIE Tutorial Partnership",
        fee=3000,
        usage="Published on one agreed primary platform and kept live for at least 30 days unless platform, legal, safety, or brand-compliance requirements require removal. Includes 30 consecutive days of paid amplification for that live post; start date and authorization method are confirmed in writing.",
        delivery="Within 10 business days after cleared payment, approved brief, and product access.",
        deliverables=(
            "One original 30-60 second vertical tutorial built around a problem the product genuinely helps solve",
            "Concept, script, filming, edit, and caption or on-screen call to action",
            "Publication on one agreed primary platform: Sandra's Instagram Reel or TikTok",
            "One consolidated revision round and a seven-day platform performance snapshot",
        ),
        not_included="Cross-platform reposting, extra versions, raw footage, exclusivity, extended amplification, additional revisions, and any distribution not named above.",
        terms=(
            "The buyer supplies the approved brief, product access, claims, platform, amplification requirements, and compliance guidance before production begins.",
            "The product must have a truthful role inside the tutorial. Sandra retains final editorial judgment and will not publish unsupported claims.",
            "One consolidated factual or edit revision is included. A new concept, extra version, or changed brief is additional scope.",
            "The buyer receives only the publication and amplification rights written here. All other rights remain with the creator.",
            "No audience, advertising, sales, reach, or return-on-investment result is promised.",
            "Payments are non-refundable after production begins. Buyer delays move the delivery date accordingly.",
            "Taxes are added only when legally required and will be shown on the invoice.",
            "Changes to scope, usage, timing, or payment must be agreed in writing by both parties.",
        ),
    ),
}


def register_fonts() -> tuple[str, str, str]:
    font_candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
        Path("/Library/Fonts/Arial.ttf"),
    ]
    bold_candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
        Path("/Library/Fonts/Arial Bold.ttf"),
    ]
    italic_candidates = [
        Path("/System/Library/Fonts/Supplemental/Arial Italic.ttf"),
        Path("/Library/Fonts/Arial Italic.ttf"),
    ]

    regular = next((path for path in font_candidates if path.exists()), None)
    bold = next((path for path in bold_candidates if path.exists()), None)
    italic = next((path for path in italic_candidates if path.exists()), None)
    if regular and bold and italic:
        pdfmetrics.registerFont(TTFont("SSELFIESans", str(regular)))
        pdfmetrics.registerFont(TTFont("SSELFIESans-Bold", str(bold)))
        pdfmetrics.registerFont(TTFont("SSELFIESans-Italic", str(italic)))
        return "SSELFIESans", "SSELFIESans-Bold", "SSELFIESans-Italic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"


class Rule(Flowable):
    def __init__(self, width: float, color=WHISPER, thickness: float = 0.6):
        super().__init__()
        self.width = width
        self.height = thickness
        self.color = color
        self.thickness = thickness

    def draw(self) -> None:
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 0, self.width, 0)


def money(amount: int) -> str:
    return f"EUR {amount:,}".replace(",", " ")


def build_pdf(args: argparse.Namespace) -> None:
    offer = OFFERS[args.offer]
    output = Path(args.output).expanduser().resolve()
    output.parent.mkdir(parents=True, exist_ok=True)

    regular_font, bold_font, italic_font = register_fonts()
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName=regular_font,
        fontSize=8.1,
        leading=10.4,
        textColor=BLACK,
        spaceAfter=3,
    )
    small = ParagraphStyle(
        "Small",
        parent=body,
        fontSize=7.1,
        leading=8.8,
        textColor=SMOKE,
    )
    label = ParagraphStyle(
        "Label",
        parent=body,
        fontName=bold_font,
        fontSize=7,
        leading=9,
        textColor=STONE,
        uppercase=True,
        spaceAfter=2,
    )
    section = ParagraphStyle(
        "Section",
        parent=body,
        fontName=bold_font,
        fontSize=11,
        leading=14,
        spaceBefore=5,
        spaceAfter=3,
    )
    title = ParagraphStyle(
        "Title",
        parent=body,
        fontName="Times-Bold",
        fontSize=21,
        leading=22,
        textColor=BLACK,
        spaceAfter=5,
    )
    amount_style = ParagraphStyle(
        "Amount",
        parent=body,
        fontName="Times-Bold",
        fontSize=20,
        leading=22,
        alignment=TA_LEFT,
    )
    centered = ParagraphStyle(
        "Centered",
        parent=small,
        alignment=TA_CENTER,
    )

    issued = date.fromisoformat(args.issue_date) if args.issue_date else date.today()
    valid_until = issued + timedelta(days=7)
    payment_text = (
        "Paid in full to reserve production."
        if args.payment == "full"
        else "50% to reserve production. The remaining 50% is due before final delivery."
    )

    seller_name = args.seller_legal_name
    buyer_name = args.buyer_legal_name
    if args.template:
        seller_name = seller_name or "[VERIFIED SELLER LEGAL NAME]"
        buyer_name = buyer_name or "[BUYER LEGAL NAME]"

    required = {
        "seller legal name": seller_name,
        "buyer legal name": buyer_name,
        "buyer address": args.buyer_address,
        "buyer tax id": args.buyer_tax_id,
        "buyer signatory": args.buyer_signatory,
        "invoice email": args.invoice_email,
    }
    if not args.template:
        missing = [name for name, value in required.items() if not value]
        if missing:
            raise SystemExit("Missing buyer-ready fields: " + ", ".join(missing))

    def value_or_placeholder(value: str | None, placeholder: str) -> str:
        return value or f"[{placeholder}]"

    doc = BaseDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=f"{offer.title} Order Form",
        author="Sandra Social",
        subject="Draft creator partnership order form",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")

    def page(canvas, document) -> None:
        canvas.saveState()
        canvas.setFillColor(BLACK)
        canvas.rect(0, A4[1] - 8 * mm, A4[0], 8 * mm, fill=1, stroke=0)
        canvas.setFont(regular_font, 6.8)
        canvas.setFillColor(STONE)
        canvas.drawString(18 * mm, 9 * mm, "SANDRA SOCIAL - CREATOR PARTNERSHIPS")
        canvas.drawRightString(A4[0] - 18 * mm, 9 * mm, f"PAGE {document.page}")
        if args.template:
            canvas.setFillColor(colors.Color(0.8, 0.1, 0.1, alpha=0.12))
            canvas.setFont(bold_font, 38)
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(35)
            canvas.drawCentredString(0, 0, "DRAFT TEMPLATE - DO NOT SEND")
        canvas.restoreState()

    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=page)])

    story: list[Flowable] = []
    story.append(Paragraph("DRAFT - SANDRA APPROVAL REQUIRED", label))
    story.append(Paragraph(f"{offer.title}<br/>Order Form", title))
    story.append(Paragraph("One clear scope. One clear decision.", small))
    story.append(Spacer(1, 3 * mm))

    party_data = [
        [Paragraph("SELLER", label), Paragraph("BUYER", label)],
        [Paragraph(f"<b>{seller_name}</b><br/>ssa@ssasocial.com", body), Paragraph(
            f"<b>{buyer_name}</b><br/>{value_or_placeholder(args.buyer_address, 'BUYER BILLING ADDRESS')}<br/>"
            f"Tax ID: {value_or_placeholder(args.buyer_tax_id, 'VAT OR TAX NUMBER')}<br/>"
            f"Invoice: {value_or_placeholder(args.invoice_email, 'INVOICE EMAIL')}",
            body,
        )],
    ]
    parties = Table(party_data, colWidths=[doc.width * 0.43, doc.width * 0.57])
    parties.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PEARL),
        ("BOX", (0, 0), (-1, -1), 0.6, WHISPER),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, WHISPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(parties)
    story.append(Spacer(1, 2.5 * mm))

    commercial = Table([
        [Paragraph("INVESTMENT", label), Paragraph("PAYMENT", label), Paragraph("VALID UNTIL", label)],
        [Paragraph(money(offer.fee), amount_style), Paragraph(payment_text, body), Paragraph(valid_until.isoformat(), body)],
    ], colWidths=[doc.width * 0.25, doc.width * 0.5, doc.width * 0.25])
    commercial.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.8, BLACK),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, WHISPER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    story.append(commercial)

    story.append(Paragraph("Scope", section))
    for item in offer.deliverables:
        story.append(Paragraph(f"• {item}", body))
    story.append(Spacer(1, 1 * mm))
    story.append(Paragraph(f"<b>Delivery:</b> {offer.delivery}", body))
    story.append(Paragraph(f"<b>Usage:</b> {offer.usage}", body))
    story.append(Paragraph(f"<b>Not included:</b> {offer.not_included}", body))

    story.append(Paragraph("Working terms", section))
    for term in offer.terms:
        story.append(Paragraph(f"• {term}", small))

    story.append(Spacer(1, 2 * mm))
    story.append(Rule(doc.width, BLACK, 0.8))
    story.append(Spacer(1, 2 * mm))
    approval = Table([
        [Paragraph("BUYER APPROVAL", label), Paragraph("CREATOR APPROVAL", label)],
        [Paragraph(value_or_placeholder(args.buyer_signatory, "BUYER NAME AND TITLE"), body), Paragraph("Sandra Sigurjonsdottir Aamodt", body)],
        [Paragraph("Signature: __________________________", body), Paragraph("Signature: __________________________", body)],
        [Paragraph("Date: ______________________________", body), Paragraph("Date: ______________________________", body)],
    ], colWidths=[doc.width / 2, doc.width / 2])
    approval.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    story.append(KeepTogether([approval]))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        "This is a commercial order-form template, not legal advice. Sandra must verify seller details and approve the final buyer-ready version before use.",
        centered,
    ))

    doc.build(story)
    print(output)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--offer", choices=sorted(OFFERS), default="tutorial-partnership")
    parser.add_argument("--payment", choices=("full", "split"), default="full")
    parser.add_argument("--buyer-legal-name")
    parser.add_argument("--buyer-address")
    parser.add_argument("--buyer-tax-id")
    parser.add_argument("--buyer-signatory")
    parser.add_argument("--invoice-email")
    parser.add_argument("--seller-legal-name")
    parser.add_argument("--issue-date", help="ISO date. Defaults to today.")
    parser.add_argument("--template", action="store_true", help="Allow placeholders and add a DO NOT SEND watermark.")
    parser.add_argument("--output", required=True)
    return parser.parse_args()


if __name__ == "__main__":
    build_pdf(parse_args())
