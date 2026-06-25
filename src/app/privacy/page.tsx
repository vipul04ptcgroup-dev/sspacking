export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-3xl sm:text-4xl font-black text-stone-900 mb-3">Privacy Policy</h1>
      <p className="text-sm text-stone-500 mb-10">Last updated: May 27, 2026</p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">1. Information We Collect</h2>
          <p>
            We collect details you share with us through forms and enquiries, including your name, email, phone number,
            company details, product interest, quantity requirements, and message content.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">2. How We Use Your Information</h2>
          <p>
            Your information is used to respond to quote requests, provide customer support, improve our services,
            and communicate relevant updates regarding your enquiry or order.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">3. Data Sharing</h2>
          <p>
            We do not sell your personal information. Data may be shared only with trusted service providers or when
            required by law, and only to the extent necessary.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">4. Data Security</h2>
          <p>
            We use reasonable technical and organizational safeguards to protect your information against unauthorized
            access, misuse, or disclosure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">5. Cookies and Analytics</h2>
          <p>
            Our website may use cookies and similar technologies to improve site functionality and understand usage
            patterns. You can control cookie preferences through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">6. Your Rights</h2>
          <p>
            You may request access, correction, or deletion of your personal information by contacting us. We will
            process requests in accordance with applicable laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">7. Contact Us</h2>
          <p>
            For privacy-related questions, please contact us at{' '}
            <a href="mailto:customerservice.sspackaging@gmail.com" className="text-amber-700 font-semibold hover:text-amber-800 transition">
              customerservice.sspackaging@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
