# V0 Preview Environment Limitations

## Issue: AI Features Not Working in V0 Preview

### Root Cause
**Environment variables (including API keys) are NOT accessible in the V0 preview environment** when opened in a new tab from v0.dev.

This is a known limitation documented here:
- https://community.vercel.com/t/environment-variables-not-accessible-in-staging/5839
- https://vercel.com/docs/deployments/environments

### What This Affects
- Maya AI chat (Anthropic Claude API)
- Any AI SDK features (OpenAI, Anthropic, etc.)
- Feed planner AI generation
- Concept generation
- Video generation
- Any feature requiring API keys

### Why It Works in Production
Production and Vercel preview deployments have full access to environment variables. Only the V0-specific preview (vusercontent.net domain) has this limitation.

### Solutions

#### Option 1: Deploy to Vercel (Recommended)
1. Push your code to GitHub
2. Deploy to Vercel preview or production
3. All environment variables will work correctly
4. Test AI features in a real deployment environment

#### Option 2: Test Locally
1. Run `npm run dev` locally
2. Ensure `.env.local` has all required API keys
3. Test at `http://localhost:3000`
4. All AI features will work with your local environment variables

#### Option 3: Mock AI Responses (Development Only)
For UI testing without AI functionality, you could add mock responses in development mode.

### Required Environment Variables
These variables MUST be set in your Vercel deployment:
- `ANTHROPIC_API_KEY` - For Claude AI (Maya chat, concept generation)
- `OPENAI_API_KEY` - For OpenAI features (if used)
- `REPLICATE_API_TOKEN` - For image/video generation
- `DATABASE_URL` - For Neon database
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` - For Supabase auth

### How We Handle This
The app now detects when running in V0 preview without API keys and returns a helpful error message:

\`\`\`json
{
  "error": "AI features are not available in V0 preview",
  "details": "Environment variables (API keys) are not accessible in the V0 preview environment. Please deploy to Vercel to test AI features.",
  "helpUrl": "https://vercel.com/docs/deployments/environments"
}
\`\`\`

### Recommendation
**Always test AI features in a proper Vercel deployment, not in V0 preview.**
V0 preview is excellent for UI/UX testing but has limitations for backend integrations that require environment variables.
