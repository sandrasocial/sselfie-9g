# July 25 Deal Close Kit

Status: **DRAFT - SANDRA APPROVAL REQUIRED**

Owner: Sandra + Codex

Use only for the five warm B2B opportunities on the July 25 Cash Command Board. This kit does not authorize sending, discounting, signing, invoicing, or changing the approved offer.

**Hard exclusion:** Unlocked Foundation is excluded from outreach. Sandra already delivered a keynote collaboration for the nonprofit in 2025. Do not draft, send, or follow up with a commercial pitch.

## The closing rule

Move an interested buyer through one short path:

1. Confirm the offer and price.
2. Confirm the person who can approve scope and payment.
3. Collect the buyer's legal and billing details.
4. Return one order form and payment request the same day.
5. Reserve production only after payment clears.

Do not add a discovery workshop, custom strategy deck, free sample, rate-card menu, or long call unless the buyer's process requires it.

## Asset map

| Buyer | Offer | Decision asset |
| --- | --- | --- |
| Syntx AI | EUR 3,000 Tutorial Partnership | Public one-page PDF below, after Sandra approves and portfolio PR #3 is merged |
| Replit | EUR 3,000 Tutorial Partnership | Public one-page PDF below, after Sandra approves and portfolio PR #3 is merged |
| Hailuo AI | EUR 3,000 Tutorial Partnership | Public one-page PDF below, after Sandra approves and portfolio PR #3 is merged |
| ShiftCam | EUR 3,000 Tutorial Partnership | Public one-page PDF below, after Sandra approves and portfolio PR #3 is merged |
| SANDMARC | EUR 3,000 Tutorial Partnership | Public one-page PDF below, after Sandra approves and portfolio PR #3 is merged |

Public Tutorial Partnership scope: `https://www.ssasocial.com/selfie-partnerships`

Public one-page PDF after Sandra approves and the portfolio branch is merged: `https://www.ssasocial.com/partnerships/Sandra-Tutorial-Partnership.pdf`

Do not send the URL before the portfolio deployment is live. Before any approved send, verify that the URL returns the Tutorial Partnership PDF rather than a 404 or the retired Creator Ad Sprint.

## Reply: interested or send details

**DRAFT - SANDRA APPROVAL REQUIRED**

Hi [Name],

Glad this feels relevant.

Here is the one-page scope: [DECISION ASSET LINK OR ATTACHMENT]

Before I reserve production, can you confirm two things?

1. The EUR 3,000 fee is within the approved campaign budget.
2. You are the person approving scope and payment, or you can copy that person here.

Once that is confirmed, send the legal company name, billing address, VAT or tax number, and invoice contact. I can return the order form and payment request today.

Sandra

## Reply: approved, ready to proceed

**DRAFT - SANDRA APPROVAL REQUIRED**

Hi [Name],

Perfect. The attached order form reflects the EUR 3,000 Tutorial Partnership scope.

Paid in full is the default and reserves production. If your procurement process requires split billing, I can do 50% to reserve production and 50% before final delivery.

Please reply `approved` with any correction to the legal or billing details. I will then issue the payment request.

Production begins after the first payment clears and I have the approved brief and product access.

Sandra

## Reply: the budget is lower

**DRAFT - SANDRA APPROVAL REQUIRED**

Hi [Name],

Thank you for being clear.

I cannot discount the same scope because the useful part is the complete lesson: concept, script, filming, edit, publication to my audience, and the amplification license.

If timing is the issue rather than the total budget, I can split the payment 50% to reserve production and 50% before final delivery.

If the total approved budget is below EUR 3,000, I understand. I would rather be honest than promise this scope at a level that will not support the work.

Sandra

Do not invent a smaller package in the reply. A reduced scope needs a separate Sandra decision before it is offered.

## Reply: the brand wants extra assets or another platform

**DRAFT - SANDRA APPROVAL REQUIRED**

Hi [Name],

The EUR 3,000 Tutorial Partnership includes one live tutorial on one agreed primary platform.

Cross-platform reposting, extra versions, raw footage, longer usage, and exclusivity are separate scope because each changes the production or rights.

Tell me exactly which extra platform, asset, or right your campaign needs. I will confirm the added scope before quoting it.

Sandra

## Reply: procurement or vendor setup

**DRAFT - SANDRA APPROVAL REQUIRED**

Hi [Name],

Happy to complete vendor setup.

Please send the legal company name, billing address, VAT or tax number, purchase-order requirement, invoice contact, and any vendor form your team needs.

The agreed fee is EUR 3,000. Paid in full reserves production. If your procurement policy requires it, split billing is 50% to reserve and 50% before final delivery.

I will return the completed details and order form as soon as I receive the requirements.

Sandra

## Reply: a call is required

**DRAFT - SANDRA APPROVAL REQUIRED**

Hi [Name],

Yes. Let's keep it focused so your team can make a decision quickly.

Please send two options for a fifteen-minute call in Oslo time. I will come ready to confirm the campaign objective, scope, usage, approval owner, and payment process.

Sandra

## Fifteen-minute decision call

1. **Two minutes:** What campaign or product needs creative now?
2. **Three minutes:** Which audience, platform, and action matter?
3. **Three minutes:** Which problem can the product naturally solve inside Sandra's tutorial format?
4. **Three minutes:** Confirm the primary publishing platform, amplification duration, region, and start date.
5. **Two minutes:** Confirm budget owner, legal or procurement requirements, and payment timing.
6. **Two minutes:** Close with one next step: order form and payment request, or a clear no.

Do not offer performance guarantees, speculative concepts, unpaid samples, or an open-ended strategy call.

## Information required for the order form

Collect only what is needed:

- buyer legal company name;
- buyer billing address;
- VAT or tax number, if applicable;
- signatory name and title;
- invoice email;
- purchase-order number, if required;
- primary publishing platform;
- amplification platform, region, and thirty-day term;
- payment option: paid in full or approved 50% + 50%;
- approved brief and product-access date.

Generate the draft order form with:

```bash
python3 -m venv .venv-pdf
.venv-pdf/bin/python -m pip install --upgrade pip
.venv-pdf/bin/python -m pip install -r requirements-pdf.txt

.venv-pdf/bin/python scripts/generate-creator-order-form.py \
  --buyer-legal-name "[BUYER LEGAL NAME]" \
  --buyer-address "[BUYER BILLING ADDRESS]" \
  --buyer-tax-id "[BUYER VAT OR TAX NUMBER]" \
  --buyer-signatory "[NAME, TITLE]" \
  --invoice-email "[INVOICE EMAIL]" \
  --seller-legal-name "Sandra Sigurjonsdottir Aamodt" \
  --offer tutorial-partnership \
  --payment full \
  --output output/pdf/DRAFT-[BUYER]-Tutorial-Partnership-Order-Form.pdf
```

Seller identity was verified from the live Stripe Account on 2026-07-16: account type `individual`, legal individual name `Sandra Sigurjonsdottir Aamodt`, and business profile name `SSELFIE AI`. Use the legal name in the seller field and keep the brand name separate. Reverify against Stripe if the account identity changes.

## Approval and cash gates

- Sandra approves every outward reply, order form, commercial change, and send.
- A buyer's verbal interest is not a deal.
- An approved order form without cleared payment is not cash.
- Production does not begin before payment and the approved brief.
- Final assets are not released before the required balance clears.
- The July scoreboard changes only from buyer action and verified Stripe or bank receipts.
