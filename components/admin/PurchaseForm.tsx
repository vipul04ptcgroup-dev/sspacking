'use client';

import { useMemo } from 'react';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Product, Purchase, PurchaseItem, Supplier } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Select, Textarea } from '@/components/ui';
import { Plus, Trash2 } from 'lucide-react';

const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product required'),
  quantity: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
});

const schema = z.object({
  purchaseNumber: z.string().min(1, 'Purchase number is required'),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  supplierId: z.string().min(1, 'Supplier required'),
  remarks: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one product'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

type PurchasePayload = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalQty'> & {
  items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>;
};

interface PurchaseFormProps {
  purchaseNumber: string;
  suppliers: Supplier[];
  products: Product[];
  createdBy: string;
  initialData?: {
    purchaseDate: string;
    supplierId: string;
    remarks: string;
    items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>;
  };
  submitLabel?: string;
  onSubmit: (data: PurchasePayload) => Promise<void>;
}

export default function PurchaseForm({
  purchaseNumber,
  suppliers,
  products,
  createdBy,
  initialData,
  submitLabel = 'Save Purchase',
  onSubmit,
}: PurchaseFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const supplierOptions = useMemo(
    () => [{ value: '', label: 'Select supplier' }, ...suppliers.map((supplier) => ({
      value: supplier.id,
      label: supplier.supplierName,
    }))],
    [suppliers],
  );
  const productOptions = useMemo(
    () => [{ value: '', label: 'Select product' }, ...products.map((product) => ({
      value: product.id,
      label: product.name,
    }))],
    [products],
  );

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      purchaseNumber,
      purchaseDate: initialData?.purchaseDate || today,
      supplierId: initialData?.supplierId || '',
      remarks: initialData?.remarks || '',
      items: initialData?.items?.length ? initialData.items : [{ productId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const itemValues = watch('items');
  const totalQty = itemValues.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleFormSubmit: SubmitHandler<FormOutput> = async (data) => {
    await onSubmit({
      purchaseNumber: data.purchaseNumber.trim(),
      supplierId: data.supplierId,
      purchaseDate: new Date(`${data.purchaseDate}T00:00:00`),
      remarks: data.remarks?.trim() || '',
      createdBy,
      items: data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-stone-900">Purchase Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="purchaseNumber"
            label="Purchase Number"
            readOnly
            helpText="Generated automatically"
            {...register('purchaseNumber')}
            className="bg-stone-50"
          />
          <Input
            id="purchaseDate"
            label="Purchase Date *"
            type="date"
            error={errors.purchaseDate?.message}
            {...register('purchaseDate')}
          />
          <Select
            id="supplierId"
            label="Supplier *"
            options={supplierOptions}
            error={errors.supplierId?.message}
            {...register('supplierId')}
            className="sm:col-span-2"
          />
          <Textarea
            id="remarks"
            label="Remarks"
            placeholder="Optional notes for this purchase"
            error={errors.remarks?.message}
            {...register('remarks')}
            className="sm:col-span-2"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Products</h2>
            <p className="text-sm text-stone-500">Add one or more products for this purchase.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', quantity: 1 })}>
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-stone-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-stone-700">Line Item {index + 1}</p>
                {fields.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label={`Remove line item ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                <Select
                  id={`items.${index}.productId`}
                  label="Product *"
                  options={productOptions}
                  error={errors.items?.[index]?.productId?.message}
                  {...register(`items.${index}.productId`)}
                />
                <Input
                  id={`items.${index}.quantity`}
                  label="Quantity *"
                  type="number"
                  min={1}
                  error={errors.items?.[index]?.quantity?.message}
                  {...register(`items.${index}.quantity`)}
                />
              </div>
            </div>
          ))}
        </div>

        {typeof errors.items?.message === 'string' ? (
          <p className="mt-3 text-xs text-red-600">{errors.items.message}</p>
        ) : null}

        <div className="mt-5 rounded-xl bg-stone-50 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-stone-500">Total Quantity</p>
          <p className="mt-1 text-2xl font-black text-stone-900">{totalQty}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={isSubmitting} disabled={suppliers.length === 0 || products.length === 0}>
          {submitLabel}
        </Button>
        {(suppliers.length === 0 || products.length === 0) ? (
          <p className="text-sm text-stone-500">
            {suppliers.length === 0 ? 'Add a supplier first.' : 'Add at least one product first.'}
          </p>
        ) : null}
      </div>
    </form>
  );
}
