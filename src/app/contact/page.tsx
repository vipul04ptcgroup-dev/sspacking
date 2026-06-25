'use client';

import { Suspense, useState } from 'react';
import { useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { createQuoteRequest } from '@/lib/firestore';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Phone, Mail, MapPin, Clock, CheckCircle } from 'lucide-react';

const MAIN_CONTACT_EMAIL = 'customerservice.sspackaging@gmail.com';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone required'),
  company: z.string().optional(),
  productInterest: z.string().min(2, 'Please describe the product'),
  quantity: z.string().min(1, 'Quantity required'),
  message: z.string().min(5, 'Message required'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function ContactPage() {
  return (
    <Suspense fallback={<ContactPageFallback />}>
      <ContactPageContent />
    </Suspense>
  );
}

function ContactPageFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-3xl sm:text-5xl font-black text-stone-900 mb-3 sm:mb-4">Get in Touch</h1>
        <p className="text-stone-500 text-base sm:text-lg max-w-xl mx-auto">Loading contact form...</p>
      </div>
    </div>
  );
}

function ContactPageContent() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const searchParams = useSearchParams();
  const getSearchParam = (key: string) => searchParams?.get(key)?.trim() || '';

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const product = getSearchParam('product');
    const variant = getSearchParam('variant');
    const prefill = variant ? `${product} (${variant})` : product;

    if (prefill) {
      setValue('productInterest', prefill, { shouldValidate: true });
    }
  }, [searchParams, setValue]);

  const sendQuoteEmail = async (data: FormOutput, productUrl: string) => {
    const response = await fetch('/api/quote-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        productInterest: data.productInterest,
        productUrl,
        quantity: data.quantity,
        message: data.message,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.ok === false) {
      throw new Error(
        typeof result?.error === 'string' && result.error.trim()
          ? result.error
          : 'We could not send your request right now. Please try again in a moment.',
      );
    }

    return result;
  };

  const onSubmit: SubmitHandler<FormOutput> = async (data) => {
    if (loading || submitted) return;

    setLoading(true);
    setSubmitError('');

    try {
      const productUrl = getSearchParam('productUrl');

      await sendQuoteEmail(data, productUrl);

      try {
        await createQuoteRequest({
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          productInterest: data.productInterest,
          productUrl,
          quantity: data.quantity,
          message: data.message,
        });
      } catch {
        // The inquiry was already delivered through the backend contact API.
      }

      setSubmitted(true);
      reset({
        name: '',
        email: '',
        phone: '',
        company: '',
        productInterest: '',
        quantity: '',
        message: '',
      });
      toast.success('Thanks for reaching out. Your request has been sent successfully.');
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : 'We could not submit your request. Please try again.';

      setSubmitError(message);
      toast.error(message);
    }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      {/* Header */}
      <div className="text-center mb-10 sm:mb-14">
        <h1 className="text-3xl sm:text-5xl font-black text-stone-900 mb-3 sm:mb-4">Get in Touch</h1>
        <p className="text-stone-500 text-base sm:text-lg max-w-xl mx-auto">Have a question or need a custom packaging quote? We'd love to hear from you.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 sm:gap-12">
        {/* Contact info */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-stone-900 mb-5 sm:mb-6">Contact Information</h2>
            {[
              { icon: Phone, label: 'Phone', value: '+91 91208 79879', href: 'tel:+919876543210' },
              { icon: Mail, label: 'Customer Service Email', value: MAIN_CONTACT_EMAIL, href: `mailto:${MAIN_CONTACT_EMAIL}` },
              { icon: MapPin, label: 'Office Address', value: 'Office no. 201-202, Hirubhai Residency Besides Vedant Hospital, Virar (West) - 401303 Maharashtra, India.' },
              { icon: MapPin, label: 'Factory Address', value: 'Unit no. 13, Pragati Compound, Dongri Pada Road, near Jain Mandir, Poman, Vasai Bhiwandi Road, Vasai East, Palghar - 401208' },
              { icon: Clock, label: 'Hours', value: 'Mon – Sat: 9:00 AM – 6:00 PM' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-stone-800 font-medium hover:text-amber-600 transition text-sm break-words">{item.value}</a>
                  ) : (
                    <p className="text-stone-800 font-medium text-sm break-words">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 sm:p-5">
            <h3 className="font-bold text-stone-900 mb-2">Bulk Order Discounts</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              We offer special pricing for bulk orders. Contact us with your requirements and we'll provide a custom quote within 24 hours.
            </p>
          </div>
        </div>

        {/* Quote form */}
        <div className="lg:col-span-3" id="quote">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-100 shadow-sm p-5 sm:p-8">
            {submitted ? (
              <div className="text-center py-8 sm:py-12">
                <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl sm:text-2xl font-black text-stone-900 mb-2">Request Received!</h3>
                <p className="text-stone-500 mb-6">We'll get back to you within 24 hours with a detailed quote.</p>
                <Button onClick={() => setSubmitted(false)} variant="outline">Send Another Request</Button>
              </div>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900 mb-5 sm:mb-6">Request a Quote</h2>
                {submitError ? (
                  <div
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {submitError}
                  </div>
                ) : null}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Full Name *" id="name" placeholder="John Doe" error={errors.name?.message} {...register('name')} />
                    <Input label="Phone *" id="phone" placeholder="+91 91208 79879" error={errors.phone?.message} {...register('phone')} />
                    <Input label="Email *" id="email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
                    <Input label="Company (Optional)" id="company" placeholder="Your Company Ltd" {...register('company')} />
                    <Input label="Product Interest *" id="productInterest" placeholder="e.g. Bamboo Bottles, Glass Jars" error={errors.productInterest?.message} {...register('productInterest')} className="sm:col-span-2" />
                    <Input label="Required Quantity *" id="quantity" placeholder="e.g. 500 units" error={errors.quantity?.message} {...register('quantity')} />
                  </div>
                  <Textarea label="Additional Message *" id="message" placeholder="Any specific requirements, customization needs, or questions..." error={errors.message?.message} {...register('message')} />
                  <Button type="submit" loading={loading} disabled={loading || submitted} size="lg" className="w-full">
                    Send Quote Request
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
