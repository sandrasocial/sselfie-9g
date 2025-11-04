import Link from "next/link"

export default function TermsOfService() {
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
            TERMS OF SERVICE
          </h1>
          <p className="text-sm font-light text-stone-600">Last updated: January 2025</p>
        </div>

        <div className="space-y-12 text-stone-700">
          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Agreement to Terms</h2>
            <p className="text-base font-light leading-relaxed">
              By accessing or using SSELFIE, you agree to be bound by these Terms of Service and all applicable laws and
              regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this
              service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Description of Service</h2>
            <p className="text-base font-light leading-relaxed">
              SSELFIE is an AI-powered photo generation platform that allows users to create professional brand photos
              using artificial intelligence. The service includes AI photo generation, brand profile management, content
              strategy tools, and personalized AI assistance through Maya.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">User Accounts</h2>
            <div className="space-y-4">
              <p className="text-base font-light leading-relaxed">
                To use SSELFIE, you must create an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Be responsible for all activities under your account</li>
                <li>Not share your account with others</li>
              </ul>
              <p className="text-base font-light leading-relaxed">
                You must be at least 18 years old to create an account and use our services.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Subscription and Payment</h2>
            <div className="space-y-4">
              <p className="text-base font-light leading-relaxed">
                SSELFIE operates on a subscription basis with the following terms:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
                <li>Subscriptions are billed monthly in advance</li>
                <li>Beta pricing is locked in for early users</li>
                <li>You can cancel your subscription at any time</li>
                <li>Refunds are provided on a case-by-case basis</li>
                <li>Unused credits do not roll over to the next billing period</li>
                <li>All payments are processed securely through Stripe</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Content Ownership and Usage Rights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-serif font-light mb-2">Your Content</h3>
                <p className="text-base font-light leading-relaxed">
                  You retain all ownership rights to the photos you upload to SSELFIE. By uploading photos, you grant us
                  a limited license to process and store your images solely for the purpose of generating AI photos for
                  your use.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-serif font-light mb-2">Generated Photos</h3>
                <p className="text-base font-light leading-relaxed">
                  You own the AI-generated photos created through our service and may use them for personal or
                  commercial purposes. However, you acknowledge that similar images may be generated for other users
                  based on their inputs.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-serif font-light mb-2">Prohibited Uses</h3>
                <p className="text-base font-light leading-relaxed mb-2">You agree not to use generated photos to:</p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
                  <li>Create misleading or deceptive content</li>
                  <li>Impersonate others without permission</li>
                  <li>Generate illegal, harmful, or offensive content</li>
                  <li>Violate any applicable laws or regulations</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Acceptable Use Policy</h2>
            <p className="text-base font-light leading-relaxed mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 text-base font-light leading-relaxed">
              <li>Upload photos of individuals without their consent</li>
              <li>Generate photos depicting minors</li>
              <li>Create content that is illegal, harmful, threatening, or abusive</li>
              <li>Attempt to reverse engineer or copy our AI models</li>
              <li>Use automated systems to access the service without permission</li>
              <li>Resell or redistribute our service without authorization</li>
              <li>Interfere with or disrupt the service or servers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Service Availability</h2>
            <p className="text-base font-light leading-relaxed">
              We strive to provide reliable service but do not guarantee uninterrupted access. We reserve the right to
              modify, suspend, or discontinue any part of the service at any time. We are not liable for any
              modification, suspension, or discontinuation of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Intellectual Property</h2>
            <p className="text-base font-light leading-relaxed">
              The SSELFIE platform, including its design, features, and underlying technology, is protected by
              copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or
              create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Limitation of Liability</h2>
            <p className="text-base font-light leading-relaxed">
              To the maximum extent permitted by law, SSELFIE shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages resulting from your use or inability to use the service. Our total
              liability shall not exceed the amount you paid for the service in the past 12 months.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Termination</h2>
            <p className="text-base font-light leading-relaxed">
              We reserve the right to terminate or suspend your account immediately, without prior notice, for conduct
              that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for
              any other reason at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Changes to Terms</h2>
            <p className="text-base font-light leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of any material changes by
              email or through the service. Your continued use of SSELFIE after such modifications constitutes your
              acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Governing Law</h2>
            <p className="text-base font-light leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which
              SSELFIE operates, without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-serif font-light mb-4 tracking-wide">Contact Information</h2>
            <p className="text-base font-light leading-relaxed">
              If you have any questions about these Terms of Service, please contact us at:
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
                className="text-sm font-light tracking-wider uppercase text-stone-600 hover:text-stone-950 transition-colors"
              >
                PRIVACY
              </Link>
              <Link
                href="/terms"
                className="text-sm font-light tracking-wider uppercase text-stone-950 transition-colors"
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
