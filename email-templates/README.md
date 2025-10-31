# SSELFIE Email Templates

## Welcome Email Template

This is the custom welcome email template for SSELFIE, written in Maya's voice with the editorial luxury aesthetic.

### How to Add to Supabase

1. **Go to your Supabase Dashboard**
   - Navigate to: Authentication → Email Templates

2. **Select "Confirm signup" template**
   - This is the email sent when users sign up

3. **Replace the default template**
   - Copy the contents of `welcome-email.html`
   - Paste into the Supabase email template editor

4. **Supabase Variables Available**
   - `{{ .ConfirmationURL }}` - The confirmation link
   - `{{ .SiteURL }}` - Your site URL
   - `{{ .Token }}` - The confirmation token
   - `{{ .TokenHash }}` - Hashed token
   - `{{ .Email }}` - User's email address

### Email Features

**Voice & Tone:**
- Written in Maya's friendly, encouraging voice
- Simple everyday language (no jargon)
- Personal and conversational
- Focuses on transformation and empowerment

**Design:**
- Editorial luxury aesthetic (Times New Roman, stone colors)
- Clean, minimal layout
- Mobile-responsive
- Professional yet approachable

**Content Structure:**
1. Warm welcome from Maya
2. What they'll achieve together
3. Clear CTA (Confirm Email button)
4. Encouraging sign-off
5. Footer with legal links

### Testing

After uploading to Supabase:
1. Create a test account
2. Check your email
3. Verify the styling renders correctly
4. Test the confirmation link
5. Check mobile rendering

### Customization

To customize the email further:
- Update colors in the `<style>` section
- Modify copy to match your brand voice
- Add additional sections as needed
- Include images (host on your CDN first)

### Other Email Templates

You can use this same style for:
- **Password Reset** - "Hey! Let's get you back in..."
- **Magic Link** - "Your instant access link is here..."
- **Email Change** - "Confirming your new email..."

Just maintain Maya's voice and the SSELFIE aesthetic across all templates.
