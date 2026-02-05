Agent Report
Agent: admin-business-ops
Specialty: Admin tooling, operational risks, business controls.
Chunk ID: chunk-010
Group: .cursor
Date: 2024-06-20

Summary:
- The primary Cursor rules and business invariants governing SSELFIE Studio's autonomous AI team behavior and critical user permissions are documented in `.cursor/rules/sselfie-constitution.md`.
- The constitution outlines distinct operating modes, critical business invariants for free, paid, and subscribed users covering credits, entitlements, and access controls.
- Stop conditions enforce strict controls to prevent unauthorized edits to critical files, schema changes impacting payments, and core paid feature disruptions.
- The workspace dependency setup command is declared in `.cursor/worktrees.json` with a single step `npm install`.

Top Findings:
- The `.cursor/rules/sselfie-constitution.md` file codifies the authoritative and primary rules for Cursor AI behavior within SSELFIE Studio. (File: `.cursor/rules/sselfie-constitution.md`)
- Business invariants ensure free users get exactly 2 credits, paid users have limited access excluding membership areas, and members retain all purchased features including model training. (File: `.cursor/rules/sselfie-constitution.md`, section "Critical Business Invariants")
- Payments integration requires Stripe webhook events to consistently update entitlements and credits without failure or delay to avoid revenue or user experience loss. (File: `.cursor/rules/sselfie-constitution.md`, section "Payments")
- Stop conditions mandate explicit ask approval before modifying critical functionality related to entitlements, pricing, schema migrations, or disabling paid features. (File: `.cursor/rules/sselfie-constitution.md`, section "STOP Conditions")
- The autonomous workflow delineates a strict five-step process (OBSERVE, DIAGNOSE, IMPLEMENT, VERIFY, REPORT) with required linting, testing, build steps, and detailed reporting to Sandra as product owner. (File: `.cursor/rules/sselfie-constitution.md`, section "Autonomous Workflow")
- Required output format standards enforce comprehensive reporting with status indicators, change description, verification, testing instructions, expected behavior, and rollback plans for all autonomous changes. (File: `.cursor/rules/sselfie-constitution.md`, section "Required Output Format")
- The workspace `.cursor/worktrees.json` defines one setup command - `npm install` - indicating a Node.js ecosystem dependency installation step necessary for local environment setup. (File: `.cursor/worktrees.json`)

Risks:
- Failure to enforce STOP conditions could lead to unauthorized changes to payment or entitlement logic causing revenue leakage or user access issues.
- Incorrect credit allocation or deduction logic could result in user frustration or abuse of free and paid features, harming monetization.
- Lack of automated tests or build verification before deployment risks introducing regressions especially in critical business logic.
- Overly complex business invariants without automated enforcement may cause inconsistencies in user experience across free, paid, and members.
- Limited documentation on error or rollback processes might delay incident recovery if critical features break.

Opportunities:
- Automate testing and validation of business invariants (credits, roles, entitlements) to ensure continuous compliance.
- Integrate monitoring on Stripe webhook processing to detect and alert on failures impacting payment mappings.
- Enhance reporting templates and automation for the required output format to streamline auditing and approvals.
- Expand workspace setup commands to include tests, lint, and build scripts to improve developer DX and reduce setup errors.
- Document detailed rollback plans for known failure scenarios from payment or entitlement changes to mitigate downtime.

Recommended Actions:
- Implement automated validation scripts for critical business invariants defined in the constitution file (Effort: Medium, Impact: High).
- Set up monitoring and alerting on Stripe webhook endpoints and entitlement updates (Effort: Medium, Impact: High).
- Enhance the workspace `worktrees.json` to include commands for running lint, tests, and builds as defined in the autonomous workflow (Effort: Low, Impact: Medium).
- Create a standardized template or lightweight automation for the required output format reports to ensure consistent and complete documentation (Effort: Low, Impact: Medium).
- Establish and document detailed rollback procedures triggered on failure of critical entitlement or payment processing changes (Effort: Medium, Impact: High).

Evidence vs Inference:
- Evidence: The business invariants, stop conditions, autonomous workflow, and output requirements are explicitly documented in `.cursor/rules/sselfie-constitution.md`.
- Evidence: Workspace setup commands are explicitly listed in `.cursor/worktrees.json`.
- Inference: Risks around possible failures or inconsistent enforcement derive from the criticality of documented rules and complexity of entitlements but are not explicitly stated.
- Inference: Opportunities and recommended actions propose improvements based on best practices around the identified rules and workflow constraints.

FILES_REVIEWED: 
[
  ".cursor/rules/sselfie-constitution.md",
  ".cursor/worktrees.json"
]