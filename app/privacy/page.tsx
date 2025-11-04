import Link from "next/link"

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation */}
      <nav className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-light tracking-[0.3em] uppercase text-stone-950"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            SSELFIE
          </Link>
          <Link
            href="/"
            className="text-sm font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
          >
            BACK TO HOME
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <p className="text-xs font-light tracking-[0.3em] uppercase text-stone-500 mb-4">LEGAL</p>
          <h1
            className="text-5xl md:text-6xl font-extralight tracking-[0.3em] uppercase mb-6"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            PRIVACY POLICY
          </h1>
          <p className="text-sm font-light text-stone-600">Last updated: January 2025</p>
        </div>

        <div className="space-y-12 text-stone-700">
          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Introduction</h2>
            <p className="text-base font-light leading-relaxed">
              At SSELFIE, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our AI-powered photo generation platform. Please read this
              privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access
              the site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-serif font-light mb-2">Personal Information</h3>
                <p className="text-base font-light leading-relaxed">
                  We collect information that you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside space-y-2 mt-2 ml-4 text-base font-light leading-relaxed">
                  <li>Name and email address</li>
                  <li>Account credentials</li>
                  <li>Payment information (processed securely through Stripe)</li>
                  <li>Profile information and brand preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-serif font-light mb-2">Photos and Images</h3>
                <p className="text-base font-light leading-relaxed">
                  When you upload photos to train your AI model, we store and process these images to generate your
                  personalized photos. Your photos are stored securely and are never shared with third parties or used
                  for any purpose other than generating your AI photos.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-serif font-light mb-2">Usage Information</h3>
                <p className="text-base font-light leading-relaxed">
                  We automatically collect certain information about your device and how you interact with our service,
                  including browser type, IP address, pages visited, and time spent on pages.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">How We Use Your Information</h2>
            <p className="text-base font-light leading-relaxed mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
              <li>Provide, maintain, and improve our services</li>
              <li>Generate AI photos based on your uploaded images</li>
              <li>Process your payments and manage your subscription</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address technical issues and fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Data Security</h2>
            <p className="text-base font-light leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal
              information. Your photos are encrypted in transit and at rest. However, no method of transmission over the
              internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Data Retention</h2>
            <p className="text-base font-light leading-relaxed">
              We retain your personal information and photos for as long as your account is active or as needed to
              provide you services. If you wish to delete your account and all associated data, please contact us at
              hello@sselfie.ai.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Third-Party Services</h2>
            <p className="text-base font-light leading-relaxed mb-4">
              We use trusted third-party services to operate our platform:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
              <li>Stripe for payment processing</li>
              <li>Supabase for authentication and database services</li>
              <li>Vercel for hosting and deployment</li>
              <li>Replicate for AI model processing</li>
            </ul>
            <p className="text-base font-light leading-relaxed mt-4">
              These services have their own privacy policies and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Your Rights</h2>
            <p className="text-base font-light leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
              <li>Access and receive a copy of your personal data</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data</li>
              <li>Object to or restrict processing of your data</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Children's Privacy</h2>
            <p className="text-base font-light leading-relaxed">
              Our service is not intended for children under 18 years of age. We do not knowingly collect personal
              information from children under 18. If you are a parent or guardian and believe your child has provided us
              with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Changes to This Policy</h2>
            <p className="text-base font-light leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new
              privacy policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Contact Us</h2>
            <p className="text-base font-light leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <p className="text-base font-light leading-relaxed mt-4">
              Email: hello@sselfie.ai
              <br />
              Website: www.sselfie.ai
            </p>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-stone-100 border-t border-stone-200 py-12 mt-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link
              href="/"
              className="text-xl font-extralight tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              SSELFIE
            </Link>
            <div className="flex items-center gap-8">
              <Link
                href="/privacy"
                className="text-sm font-light tracking-wider uppercase text-stone-950 transition-colors"
              >
                PRIVACY
              </Link>
              <Link
                href="/terms"
                className="text-sm font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
              >
                TERMS
              </Link>
            </div>
          </div>
          <p className="text-center mt-8 text-xs font-light text-stone-500">© 2025 SSELFIE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
