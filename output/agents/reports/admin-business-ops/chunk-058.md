Perfect! I've created the concept generation logic analysis for the chunk. Here is the detailed report:

```json
[
  "app/api/maya/generate-concepts/route.ts"
]
```

Agent Report
Agent: admin-business-ops
Specialty: Admin tooling, operational risks, business controls.
Chunk ID: chunk-058
Group: app
Date: 2024-06-08

Summary:
- This API endpoint implements complex logic for generating fashion concept prompts tailored for Classic Mode or Studio Pro Mode.
- It performs multi-layered category detection and mapping to guide concept generation using AI models via different logic paths (Prompt Authority Layer fallback to legacy, direct AI generation, or prompt constructor based on modes).
- It robustly integrates user authentication, user profile/physical preferences, image analysis, conversation context, and admin-provided prompt templates.
- There is elaborate handling of guide prompts to enforce prompt consistency and detailed fashion intelligence to enhance concept authenticity.

Top Findings:
- The route.ts file imports numerous helper modules across the maya library to support fashion intelligence, prompt building, user context, image analysis, and prompt validation (e.g., buildPromptWithFeatures, generateCompleteOutfit, getUserContextForMaya).
- User authentication is strict, and it supports admin impersonation for effective user context detection.
- There is a critical detection and prioritization of guide prompts sourced from userRequest, explicitly provided guidePrompt, or legacy conversationContext markers.
- Multi-level category detection functions analyze user text and map to universal prompt categories, then to brand library categories, to align prompt construction.
- Studio Pro Mode disables Classic Mode fashion intelligence due to incompatibility with Nano Banana's professional photography prompting.
- Vision/image analysis leverages AI (Claude model) to extract extensive image characteristics like B&W status, studio vs editorial style, and physical traits for in-prompt referencing.
- Prompt construction varies by mode: Classic Mode requires short (30-60 words), highly structured prompts with trigger words; Studio Pro Mode uses lengthy, professionally structured prompts with brand references and detailed scene descriptions.
- Extensive conditional logic ensures that if user provides a detailed guide prompt, it is used verbatim for concept #1 and variations maintain outfit/location/lighting consistency.
- Trend research dynamically augments prompts unless guide prompt overrides it; Scandinavian minimalism is default trend filtering in absence of explicit aesthetics.
- Workflow type detection supports complex use cases like carousel-slide decks, reel covers, text overlays, educational infographics, and brand scenes, tailoring prompt structure accordingly.
- Prompt post-processing removes banned words for anti-plasticity and enforces consistent phrasing for authenticity, including skin texture, lighting realism, film grain, and camera specifications.
- There is a detailed system to ensure no redundant info, no text overlays except when explicitly requested, and strict word count compliance.
- The prompt generation includes audit logging and fallback mechanisms for resilience.
- The system supports multi-image upload structures and merges guide prompts with reference images for better concept fidelity.

Risks:
- The extensive nested conditional logic and large monolithic function may lead to maintenance complexity and risk of subtle bugs.
- Reliance on regular expressions and heuristic string matching for category and concept detection may misclassify ambiguous user input, risking inappropriate prompt generation.
- Incomplete or missing user physical preferences or ethnicity data could degrade prompt accuracy or result in prompts that do not respect user characteristics.
- Potential failure points exist in external API calls (AI generation, image analysis) which rely on third-party services that may degrade prompt quality or cause downtime.
- Admin-supplied templates and guide prompts could unintentionally override or degrade user intent if not properly moderated.

Opportunities:
- Modularizing this large handler into smaller composable units could improve readability, testing, and maintainability.
- Incorporating more advanced NLP or ML-based category detection could reduce reliance on regex heuristics and improve accuracy.
- Enhancing user profile data input with richer structured data could improve physical preference fidelity and personalized prompt generation.
- Machine learning on historically successful prompt generations could help automate prompt optimization and style tuning.
- Expanding integration with external trend data sources beyond Instagram could enrich trend research for increased user satisfaction.

Recommended Actions:
- Refactor to break down the POST handler into smaller, testable helper functions for clarity and maintainability (Effort: medium, Impact: high).
- Deploy robust logging and monitoring for AI model failures or prompt validation warnings to catch and remediate generation issues early (Effort: low, Impact: medium).
- Review and tighten input sanitation and validation, especially for user physical preferences and conversation context, to minimize prompt generation errors (Effort: low-medium, Impact: medium).
- Investigate advanced semantic analysis for category detection to replace regex matching for better precision (Effort: medium-high, Impact: high).
- Establish safeguards or moderation on admin prompt templates and guide prompts usage to ensure they do not override or contradict user expectations (Effort: medium, Impact: high).

Evidence vs Inference:
- Evidence: Functions detectCategoryFromRequest, mapCategoryForBrandLibrary, detectCategoryForPromptConstructor show explicit regex pattern matching and category mapping (file: app/api/maya/generate-concepts/route.ts).
- Evidence: Guide prompt detection logic prioritizes userRequest over legacy conversationContext with detailed regex and logic checks.
- Evidence: Image analysis prompt constructed with explicit instructions to identify B&W, studio, editorial style, and other critical traits (calls generateText with Claude model).
- Evidence: Studio Pro mode conditional disables classic mode fashion intelligence and applies Nano Banana prompting rules.
- Evidence: Prompt validation checks word counts, required camera specs, lighting, and resolution keywords.
- Inference: Complex fallback logic and dynamic prompt building suggests operational complexity and risk in error scenarios.
- Inference: Regex-based category detection may misclassify ambiguous or novel user inputs.
- Inference: Improved modularization and semantic category detectors would reduce risk and complexity.

FILES_REVIEWED:
[