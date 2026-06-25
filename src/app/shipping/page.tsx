export default function ShippingPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <h1 className="text-3xl sm:text-4xl font-black text-stone-900 mb-3">Shipping Policy</h1>
      <p className="text-sm text-stone-500 mb-10">Last updated: May 27, 2026</p>

      <div className="space-y-8 text-stone-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">1. Order Processing</h2>
          <p>
            Orders are typically processed within 1-3 business days after confirmation and payment (if applicable).
            Bulk and custom orders may require additional processing time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">2. Shipping Coverage</h2>
          <p>
            We ship across India through trusted logistics partners. Delivery availability to certain pin codes may vary
            based on courier service coverage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">3. Delivery Timelines</h2>
          <p>
            Standard delivery timelines are estimates and generally range from 3-10 business days depending on location,
            order size, and product type.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">4. Shipping Charges</h2>
          <p>
            Shipping charges, if applicable, are communicated during quote or order confirmation. Charges may vary by
            destination, weight, and packaging requirements.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">5. Delays and Exceptions</h2>
          <p>
            Delivery may be delayed due to weather, transport disruptions, public holidays, or other circumstances beyond
            our control. We will keep you informed of significant delays where possible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">6. Damaged or Missing Shipments</h2>
          <p>
            If your shipment arrives damaged or incomplete, please contact us within 48 hours of delivery with order
            details and supporting photos so we can review and assist.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-stone-900 mb-2">7. Contact Us</h2>
          <p>
            For shipping-related queries, contact us at{' '}
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
