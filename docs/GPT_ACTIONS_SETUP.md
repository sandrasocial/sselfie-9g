# GPT Actions API Key Setup Guide

## Overview

The `GPT_ACTIONS_API_KEY` is a **custom API key** that you generate yourself to secure access to your GPT Actions API endpoint. It's not provided by GitHub, OpenAI, or any external service - you create it and keep it secret.

---

## Step 1: Generate a Secure API Key

Generate a secure random API key using one of these methods:

### Option 1: Using OpenSSL (Recommended)

```bash
openssl rand -hex 32
```

This generates a 64-character hexadecimal string (very secure).

### Option 2: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Option 3: Online Generator

You can use a secure online tool like:
- https://randomkeygen.com/
- Use the "CodeIgniter Encryption Keys" generator (256-bit)

**Important:** Make sure the key is at least 32 characters long for security.

---

## Step 2: Store the Key Locally (Development)

Add the key to your `.env.local` file (create it if it doesn't exist):

```bash
# .env.local (DO NOT commit this file to git)
GPT_ACTIONS_API_KEY=your-generated-key-here
```

**Example:**
```bash
GPT_ACTIONS_API_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

---

## Step 3: Store the Key in Vercel (Production)

Since you're using Vercel (based on your environment setup), add it there:

1. **Go to Vercel Dashboard:**
   - https://vercel.com/sselfie-studio/v0-sselfie/settings/environment-variables

2. **Add the Environment Variable:**
   - Click "Add New"
   - Name: `GPT_ACTIONS_API_KEY`
   - Value: Your generated key
   - Environment: Select all (Production, Preview, Development)

3. **Redeploy:**
   - After adding, redeploy your application for the change to take effect

---

## Step 4: Store in GitHub Secrets (Optional - for CI/CD)

If you use GitHub Actions for CI/CD, you can also store it there:

1. **Go to Your GitHub Repository:**
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`

2. **Add New Secret:**
   - Click "New repository secret"
   - Name: `GPT_ACTIONS_API_KEY`
   - Value: Your generated key

3. **Use in GitHub Actions:**
   ```yaml
   - name: Use GPT Actions Key
     env:
       GPT_ACTIONS_API_KEY: ${{ secrets.GPT_ACTIONS_API_KEY }}
   ```

---

## Step 5: Configure ChatGPT Codex Connector

In your ChatGPT Codex Connector settings:

1. **Add the Header:**
   - Header name: `x-gpt-actions-key`
   - Header value: Your generated `GPT_ACTIONS_API_KEY`

2. **Set the API Endpoint:**
   - Base URL: `https://your-domain.com/api/gpt-actions`
   - Or for local testing: `http://localhost:3000/api/gpt-actions`

3. **Available Tools:**
   - `read_file` - Read file contents
   - `list_files` - List directory contents
   - `file_stat` - Get file metadata

---

## Security Best Practices

✅ **DO:**
- Use a long, random key (at least 32 characters)
- Store it securely (environment variables, not in code)
- Use different keys for development and production
- Rotate the key periodically (every 90 days)
- Never commit the key to git

❌ **DON'T:**
- Use simple or predictable keys
- Share the key publicly
- Commit `.env.local` to git (it's in `.gitignore`)
- Use the same key for multiple services

---

## Testing Your Setup

Test that your key works:

```bash
# Test the endpoint (replace with your key)
curl -X POST http://localhost:3000/api/gpt-actions/read_file \
  -H "x-gpt-actions-key: your-generated-key-here" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "package.json"}'
```

You should get a JSON response with the file contents if everything is configured correctly.

---

## Troubleshooting

**"Unauthorized: Invalid or missing x-gpt-actions-key header"**
- Make sure you've added `GPT_ACTIONS_API_KEY` to your environment variables
- Verify the header name is exactly `x-gpt-actions-key` (lowercase with hyphens)
- Check that the key value matches in both places

**"GPT_ACTIONS_API_KEY not configured in environment"**
- The environment variable is not set
- Restart your development server after adding it
- In production, redeploy after adding to Vercel

**Key not working in production:**
- Make sure you added it to Vercel's environment variables
- Redeploy your application after adding
- Check that it's set for the correct environment (Production/Preview/Development)

---

## Summary

1. **Generate:** Create a secure random key (64+ characters recommended)
2. **Store Locally:** Add to `.env.local` for development
3. **Store in Vercel:** Add to Vercel dashboard for production
4. **Store in GitHub:** (Optional) Add to GitHub Secrets for CI/CD
5. **Configure ChatGPT:** Add the key as `x-gpt-actions-key` header in Codex Connector

---

**Remember:** This is YOUR custom API key - generate it yourself and keep it secret! 🔐

