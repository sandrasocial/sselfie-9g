-- Email Template Library for Admin Agent

CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL, -- 'newsletter', 'campaign', 'welcome', 'announcement', etc.
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- Dynamic variables like {{firstName}}, {{productName}}, etc.
  tags JSONB,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pre-built template library (system templates)
CREATE TABLE IF NOT EXISTS email_template_library (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  subject_line TEXT NOT NULL,
  preview_text TEXT,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  tags JSONB,
  thumbnail_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_template_library_category ON email_template_library(category);
CREATE INDEX IF NOT EXISTS idx_email_template_library_active ON email_template_library(is_active);

-- Seed some default templates
INSERT INTO email_template_library (name, category, description, subject_line, preview_text, body_html, body_text, variables, tags) VALUES
(
  'Weekly Newsletter',
  'newsletter',
  'Clean, professional weekly newsletter template',
  '{{businessName}} Weekly Update - {{date}}',
  'Your weekly dose of insights and updates',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #333;">{{headline}}</h1><p style="color: #666; line-height: 1.6;">{{introText}}</p><div style="margin: 30px 0;"><h2 style="color: #333; font-size: 20px;">{{section1Title}}</h2><p style="color: #666; line-height: 1.6;">{{section1Content}}</p></div><div style="margin: 30px 0;"><h2 style="color: #333; font-size: 20px;">{{section2Title}}</h2><p style="color: #666; line-height: 1.6;">{{section2Content}}</p></div><div style="text-align: center; margin: 40px 0;"><a href="{{ctaLink}}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">{{ctaText}}</a></div><p style="color: #999; font-size: 12px; text-align: center;">{{footerText}}</p></body></html>',
  'Weekly Update\n\n{{headline}}\n\n{{introText}}\n\n{{section1Title}}\n{{section1Content}}\n\n{{section2Title}}\n{{section2Content}}\n\n{{ctaText}}: {{ctaLink}}\n\n{{footerText}}',
  '["businessName", "date", "headline", "introText", "section1Title", "section1Content", "section2Title", "section2Content", "ctaText", "ctaLink", "footerText"]',
  '["newsletter", "weekly", "updates"]'
),
(
  'Product Launch',
  'campaign',
  'Exciting product launch announcement template',
  'Introducing {{productName}} - You''re Going to Love This',
  'Something amazing is here',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;"><div style="background: #fff; padding: 40px; border-radius: 8px;"><h1 style="color: #333; text-align: center; margin-bottom: 20px;">{{productName}}</h1><p style="color: #666; line-height: 1.6; text-align: center; font-size: 18px;">{{tagline}}</p><div style="margin: 30px 0; text-align: center;"><img src="{{productImage}}" alt="{{productName}}" style="max-width: 100%; border-radius: 8px;"></div><p style="color: #666; line-height: 1.6;">{{description}}</p><div style="background: #f5f5f5; padding: 20px; border-radius: 4px; margin: 30px 0;"><h3 style="color: #333; margin-top: 0;">Key Features:</h3><ul style="color: #666; line-height: 1.8;">{{features}}</ul></div><div style="text-align: center; margin: 40px 0;"><a href="{{ctaLink}}" style="background: #000; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">{{ctaText}}</a></div></div></body></html>',
  'Introducing {{productName}}\n\n{{tagline}}\n\n{{description}}\n\nKey Features:\n{{features}}\n\n{{ctaText}}: {{ctaLink}}',
  '["productName", "tagline", "productImage", "description", "features", "ctaText", "ctaLink"]',
  '["campaign", "launch", "product"]'
),
(
  'Welcome Email',
  'welcome',
  'Warm welcome email for new subscribers',
  'Welcome to {{businessName}}, {{firstName}}!',
  'We''re so glad you''re here',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #333;">Welcome, {{firstName}}!</h1><p style="color: #666; font-size: 18px;">We''re thrilled to have you join {{businessName}}</p></div><p style="color: #666; line-height: 1.6;">{{welcomeMessage}}</p><div style="background: #f9f9f9; padding: 20px; border-radius: 4px; margin: 30px 0;"><h3 style="color: #333; margin-top: 0;">Here''s what to expect:</h3><ul style="color: #666; line-height: 1.8;">{{expectations}}</ul></div><div style="text-align: center; margin: 40px 0;"><a href="{{ctaLink}}" style="background: #000; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">{{ctaText}}</a></div><p style="color: #666; line-height: 1.6;">{{closingText}}</p></body></html>',
  'Welcome, {{firstName}}!\n\nWe''re thrilled to have you join {{businessName}}\n\n{{welcomeMessage}}\n\nHere''s what to expect:\n{{expectations}}\n\n{{ctaText}}: {{ctaLink}}\n\n{{closingText}}',
  '["firstName", "businessName", "welcomeMessage", "expectations", "ctaText", "ctaLink", "closingText"]',
  '["welcome", "onboarding", "new-subscriber"]'
),
(
  'Special Offer',
  'campaign',
  'Limited-time offer or promotion template',
  '{{discount}}% Off - Limited Time Only!',
  'Don''t miss this exclusive offer',
  '<html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; padding: 40px; text-align: center; border-radius: 8px;"><h1 style="margin: 0; font-size: 36px;">{{discount}}% OFF</h1><p style="font-size: 20px; margin: 10px 0;">{{offerTitle}}</p></div><div style="padding: 30px 0;"><p style="color: #666; line-height: 1.6; font-size: 16px;">{{offerDescription}}</p><div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;"><p style="margin: 0; color: #856404;"><strong>Hurry!</strong> Offer expires {{expiryDate}}</p></div><div style="text-align: center; margin: 40px 0;"><a href="{{ctaLink}}" style="background: #000; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 18px;">{{ctaText}}</a></div><p style="color: #999; font-size: 14px; text-align: center;">Use code: <strong style="color: #333;">{{promoCode}}</strong> at checkout</p></div></body></html>',
  '{{discount}}% OFF - {{offerTitle}}\n\n{{offerDescription}}\n\nHurry! Offer expires {{expiryDate}}\n\nUse code: {{promoCode}}\n\n{{ctaText}}: {{ctaLink}}',
  '["discount", "offerTitle", "offerDescription", "expiryDate", "promoCode", "ctaText", "ctaLink"]',
  '["campaign", "promotion", "sale", "discount"]'
);
