'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { getAllProducts, saveProductionEntryWithInventory } from '@/lib/firestore';
import { isCoreProductCategorySlug } from '@/lib/product-categories';
import { formatQuantityWithUnit } from '@/lib/product-units';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EmptyState, Select, Spinner, Textarea } from '@/components/ui';
import { Boxes, Factory, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

type ProductOption = {
  id: string;
  name: string;
  bottleWeightGram: number;
};

type RawMaterialOption = {
  id: string;
  name: string;
  stock: number;
};

const rawMaterialSchema = z.object({
  productId: z.string().min(1, 'Raw material required'),
  qty: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
});

const schema = z.object({
  productId: z.string().min(1, 'Product required'),
  productionQty: z.coerce.number().gt(0, 'Production quantity must be greater than 0'),
  productionDate: z.string().min(1, 'Production date is required'),
  notes: z.string().optional(),
  rawMaterials: z.array(rawMaterialSchema).min(1, 'Add at least one raw material'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

function matchesCategory(categoryId: string, expectedCategoryId: 'production' | 'raw-material') {
  return isCoreProductCategorySlug(categoryId) && categoryId.trim().toLowerCase() === expectedCategoryId;
}

function formatGrams(value: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function formatKilograms(value: number): string {
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(value);
}

export default function AdminProductionPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [rawMaterialProducts, setRawMaterialProducts] = useState<RawMaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: '',
      productionQty: 1,
      productionDate: new Date().toISOString().split('T')[0],
      notes: '',
      rawMaterials: [{ productId: '', qty: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'rawMaterials',
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const productList = await getAllProducts();

        const nextProducts = productList
          .filter((product) => product.active && matchesCategory(product.categoryId, 'production'))
          .map((product) => ({
            id: product.id,
            name: product.name.trim(),
            bottleWeightGram: product.bottle_weight_gram ?? 0,
          }))
          .filter((product) => product.bottleWeightGram > 0)
          .sort((a, b) => a.name.localeCompare(b.name));

        const nextRawMaterialProducts = productList
          .filter((product) => product.active && matchesCategory(product.categoryId, 'raw-material'))
          .map((product) => ({
            id: product.id,
            name: product.name.trim(),
            stock: product.stockQuantity,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setProducts(nextProducts);
        setRawMaterialProducts(nextRawMaterialProducts);
      } catch (error) {
        console.error('Failed to load production form options:', error);
        toast.error('Failed to load products or raw materials.');
      } finally {
        setLoading(false);
      }
    };

    void loadOptions();
  }, []);

  const productOptions = useMemo(
    () => [{ value: '', label: 'Select product' }, ...products.map((product) => ({ value: product.id, label: product.name }))],
    [products],
  );

  const rawMaterialOptions = useMemo(
    () => [
      { value: '', label: 'Select raw material' },
      ...rawMaterialProducts.map((product) => ({
        value: product.id,
        label: `${product.name} (${formatQuantityWithUnit(product.stock, 'kg')} in stock)`,
      })),
    ],
    [rawMaterialProducts],
  );

  const selectedProductId = watch('productId');
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );
  const productionQtyValue = Number(watch('productionQty') || 0);
  const bottleWeightGram = selectedProduct?.bottleWeightGram ?? 0;
  const totalProductionWeightGrams = productionQtyValue > 0 && bottleWeightGram > 0
    ? productionQtyValue * bottleWeightGram
    : 0;
  const totalProductionWeightKg = totalProductionWeightGrams / 1000;
  const rawMaterialsValue = watch('rawMaterials');

  useEffect(() => {
    if (!fields.length) return;

    fields.forEach((_, index) => {
      setValue(`rawMaterials.${index}.qty`, totalProductionWeightKg, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: false,
      });
    });
  }, [fields, setValue, totalProductionWeightKg]);

  const onSubmit: SubmitHandler<FormOutput> = async (data) => {
    const product = products.find((item) => item.id === data.productId);
    if (!product) {
      toast.error('Selected product could not be found.');
      return;
    }
    if (!product.bottleWeightGram || product.bottleWeightGram <= 0) {
      toast.error('Selected production product does not have a valid bottle weight.');
      return;
    }

    const productionWeightGrams = data.productionQty * product.bottleWeightGram;
    const productionWeightKg = productionWeightGrams / 1000;

    const normalizedRawMaterials = data.rawMaterials.map((item) => {
      const rawMaterialProduct = rawMaterialProducts.find((entry) => entry.id === item.productId);
      if (!rawMaterialProduct) {
        throw new Error('One of the selected raw materials could not be found.');
      }

      return {
        productId: item.productId,
        productName: rawMaterialProduct.name,
        qty: productionWeightKg,
      };
    });

    const aggregatedRawMaterials = Array.from(
      normalizedRawMaterials.reduce<Map<string, { productId: string; productName: string; qty: number }>>((map, item) => {
        const existing = map.get(item.productId);
        if (existing) {
          existing.qty += item.qty;
          return map;
        }

        map.set(item.productId, { ...item });
        return map;
      }, new Map()).values(),
    );

    setSaving(true);
    try {
      await saveProductionEntryWithInventory({
        productId: product.id,
        productionDate: data.productionDate,
        quantityProducedBottles: data.productionQty,
        notes: data.notes,
        rawMaterials: aggregatedRawMaterials.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantityKg: item.qty,
        })),
      }, user?.email || user?.uid || 'admin');

      toast.success('Production entry saved successfully.');
      reset({
        productId: '',
        productionQty: 1,
        productionDate: new Date().toISOString().split('T')[0],
        notes: '',
        rawMaterials: [{ productId: '', qty: 0 }],
      });
      setRawMaterialProducts((current) =>
        current.map((product) => {
          const used = aggregatedRawMaterials.find((item) => item.productId === product.id);
          return used
            ? { ...product, stock: Math.max(0, product.stock - used.qty) }
            : product;
        }),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save production entry.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (products.length === 0 || rawMaterialProducts.length === 0) {
    return (
      <EmptyState
        icon={<Factory className="h-16 w-16" />}
        title="Production setup incomplete"
        description={
          products.length === 0
            ? 'Add active production products first so production can be recorded.'
            : 'Add active raw material products and keep their stock updated before creating production entries.'
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Production Entry</h1>
        <p className="mt-1 text-stone-500">Record production output and deduct stock from raw material products.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Production Details</h2>
              <p className="text-sm text-stone-500">Choose the production product, enter bottle count, and let the system calculate the total production weight.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="productId"
              label="Production Product *"
              options={productOptions}
              error={errors.productId?.message}
              {...register('productId')}
              className="sm:col-span-2"
            />
            <Input
              id="productionQty"
              label="Quantity Produced (Bottles) *"
              type="number"
              min={1}
              error={errors.productionQty?.message}
              {...register('productionQty')}
            />
            <Input
              id="bottleWeightGram"
              label="Bottle Weight (GRAM)"
              value={bottleWeightGram ? formatGrams(bottleWeightGram) : ''}
              readOnly
              className="bg-stone-50"
            />
            <Input
              id="productionDate"
              label="Production Date *"
              type="date"
              error={errors.productionDate?.message}
              {...register('productionDate')}
            />
            <Textarea
              id="notes"
              label="Notes"
              placeholder="Batch notes, operator remarks, shift details, or observations"
              error={errors.notes?.message}
              {...register('notes')}
              className="sm:col-span-2"
            />
          </div>

          {selectedProduct ? (
            <div className="mt-5 grid gap-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Selected Product</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{selectedProduct.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Bottle Weight</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{formatGrams(bottleWeightGram)} GRAM</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Production Weight</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{formatGrams(totalProductionWeightGrams)} GRAM</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-500">Production Weight</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{formatKilograms(totalProductionWeightKg)} KG</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Boxes className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Raw Materials Used</h2>
                <p className="text-sm text-stone-500">Select every raw material product consumed in this production batch. Consumption is auto-calculated from the total production weight.</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: '', qty: totalProductionWeightKg })}>
              <Plus className="h-3.5 w-3.5" />
              Add Raw Material Line
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-stone-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-700">Raw Material Line {index + 1}</p>
                  {fields.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove raw material line ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <Select
                    id={`rawMaterials.${index}.productId`}
                    label="Raw Material *"
                    options={rawMaterialOptions}
                    error={errors.rawMaterials?.[index]?.productId?.message}
                    {...register(`rawMaterials.${index}.productId`)}
                  />
                  <Input
                    id={`rawMaterials.${index}.qty`}
                    label="Consumed Quantity (KG)"
                    type="number"
                    min={0}
                    step="0.001"
                    readOnly
                    className="bg-stone-50"
                    error={errors.rawMaterials?.[index]?.qty?.message}
                    {...register(`rawMaterials.${index}.qty`)}
                  />
                </div>

                {rawMaterialsValue?.[index]?.productId ? (
                  <p className="mt-3 text-xs text-stone-500">
                    This raw material will consume {formatKilograms(totalProductionWeightKg)} KG based on {formatGrams(totalProductionWeightGrams)} grams of production output.
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {typeof errors.rawMaterials?.message === 'string' ? (
            <p className="mt-3 text-xs text-red-600">{errors.rawMaterials.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" loading={saving}>
            Save Production Entry
          </Button>
          <p className="text-sm text-stone-500">This saves the production batch and deducts stock from raw material products.</p>
        </div>
      </form>
    </div>
  );
}
