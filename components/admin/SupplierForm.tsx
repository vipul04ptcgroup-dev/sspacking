'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Supplier } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui';

const schema = z.object({
  supplierName: z.string().min(2, 'Supplier name is required'),
  contactPerson: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  status: z.boolean(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;
type SupplierPayload = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

interface SupplierFormProps {
  initialData?: Supplier;
  onSubmit: (data: SupplierPayload) => Promise<void>;
}

export default function SupplierForm({ initialData, onSubmit }: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          supplierName: initialData.supplierName,
          contactPerson: initialData.contactPerson,
          mobile: initialData.mobile,
          email: initialData.email,
          address: initialData.address,
          gstNumber: initialData.gstNumber,
          status: initialData.status,
        }
      : {
          supplierName: '',
          contactPerson: '',
          mobile: '',
          email: '',
          address: '',
          gstNumber: '',
          status: true,
        },
  });

  const handleFormSubmit: SubmitHandler<FormOutput> = async (data) => {
    await onSubmit({
      supplierName: data.supplierName.trim(),
      contactPerson: data.contactPerson?.trim() || '',
      mobile: data.mobile?.trim() || '',
      email: data.email?.trim() || '',
      address: data.address?.trim() || '',
      gstNumber: data.gstNumber?.trim() || '',
      status: data.status,
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-stone-900">Supplier Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="supplierName"
            label="Supplier Name *"
            placeholder="e.g. Acme Packaging Supplies"
            error={errors.supplierName?.message}
            {...register('supplierName')}
            className="sm:col-span-2"
          />
          <Input
            id="contactPerson"
            label="Contact Person"
            placeholder="e.g. Priya Sharma"
            error={errors.contactPerson?.message}
            {...register('contactPerson')}
          />
          <Input
            id="mobile"
            label="Mobile"
            placeholder="e.g. 9876543210"
            error={errors.mobile?.message}
            {...register('mobile')}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="e.g. supplier@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            id="gstNumber"
            label="GST Number"
            placeholder="e.g. 29ABCDE1234F1Z5"
            error={errors.gstNumber?.message}
            {...register('gstNumber')}
          />
          <Textarea
            id="address"
            label="Address"
            placeholder="Full supplier address"
            error={errors.address?.message}
            {...register('address')}
            className="sm:col-span-2"
          />
          <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('status')} className="h-4 w-4 accent-amber-600" />
            <span className="text-sm font-medium text-stone-700">Active supplier</span>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isSubmitting}>
          {initialData ? 'Update Supplier' : 'Create Supplier'}
        </Button>
      </div>
    </form>
  );
}
