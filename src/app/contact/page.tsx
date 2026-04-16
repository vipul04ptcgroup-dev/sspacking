'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createQuoteRequest } from '@/lib/firestore';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Phone, Mail, MapPin, Clock, CheckCircle } from 'lucide-react';

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(10, 'Valid phone required'),
  company: z.string().optional(),
  productInterest: z.string().min(2, 'Please describe the product'),
  quantity: z.string().min(1, 'Quantity required'),
  message: z.string().default(''),
});

type FormData = z.infer<typeof schema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    try {
      await createQuoteRequest({
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        productInterest: data.productInterest,
        quantity: data.quantity,
        message: data.message ?? '',
      });
      setSubmitted(true);
      reset();
    } catch { toast.error('Failed to send request. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="text-center mb-14">
        <h1 className="text-4xl sm:text-5xl font-black text-stone-900 mb-4">Get in Touch</h1>
        <p className="text-stone-500 text-lg max-w-xl mx-auto">Have a question or need a custom packaging quote? We'd love to hear from you.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12">
        {/* Contact info */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-xl font-black text-stone-900 mb-6">Contact Information</h2>
            {[
              { icon: Phone, label: 'Phone', value: '+91 91208 79879', href: 'tel:+919876543210' },
              { icon: Mail, label: 'Email', value: 'ptcvirar@gmail.com', href: 'mailto:ptcvirar@gmail.com' },
              { icon: MapPin, label: 'Address', value: 'Office no. 201-202, Hirubhai Residency Besides Vedant Hospital, Virar (West) - 401303 Maharashtra, India.' },
              { icon: Clock, label: 'Hours', value: 'Mon – Sat: 9:00 AM – 6:00 PM' },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-4 mb-5">
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="text-stone-800 font-medium hover:text-amber-600 transition text-sm">{item.value}</a>
                  ) : (
                    <p className="text-stone-800 font-medium text-sm">{item.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <h3 className="font-bold text-stone-900 mb-2">Bulk Order Discounts</h3>
            <p className="text-sm text-stone-600 leading-relaxed">
              We offer special pricing for bulk orders. Contact us with your requirements and we'll provide a custom quote within 24 hours.
            </p>
          </div>
        </div>

        {/* Quote form */}
        <div className="lg:col-span-3" id="quote">
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-8">
            {submitted ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-black text-stone-900 mb-2">Request Received!</h3>
                <p className="text-stone-500 mb-6">We'll get back to you within 24 hours with a detailed quote.</p>
                <Button onClick={() => setSubmitted(false)} variant="outline">Send Another Request</Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-black text-stone-900 mb-6">Request a Quote</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Full Name *" id="name" placeholder="John Doe" error={errors.name?.message} {...register('name')} />
                    <Input label="Phone *" id="phone" placeholder="+91 91208 79879" error={errors.phone?.message} {...register('phone')} />
                    <Input label="Email *" id="email" type="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
                    <Input label="Company (Optional)" id="company" placeholder="Your Company Ltd" {...register('company')} />
                    <Input label="Product Interest *" id="productInterest" placeholder="e.g. Bamboo Bottles, Glass Jars" error={errors.productInterest?.message} {...register('productInterest')} className="sm:col-span-2" />
                    <Input label="Required Quantity *" id="quantity" placeholder="e.g. 500 units" error={errors.quantity?.message} {...register('quantity')} />
                  </div>
                  <Textarea label="Additional Message" id="message" placeholder="Any specific requirements, customization needs, or questions..." {...register('message')} />
                  <Button type="submit" loading={loading} size="lg" className="w-full">
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
