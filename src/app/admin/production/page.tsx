'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { calculateStockStatus, getAllMaterials, getAllProducts } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/auth-context';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EmptyState, Select, Spinner, Textarea } from '@/components/ui';
import { Boxes, Factory, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

type ProductOption = {
  id: string;
  name: string;
};

type MaterialOption = {
  id: string;
  name: string;
  stock: number;
};

const materialSchema = z.object({
  materialId: z.string().min(1, 'Material required'),
  qty: z.coerce.number().gt(0, 'Quantity must be greater than 0'),
});

const schema = z.object({
  productId: z.string().min(1, 'Product required'),
  productionQty: z.coerce.number().gt(0, 'Production quantity must be greater than 0'),
  productionDate: z.string().min(1, 'Production date is required'),
  notes: z.string().optional(),
  materials: z.array(materialSchema).min(1, 'Add at least one material'),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export default function AdminProductionPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: '',
      productionQty: 1,
      productionDate: new Date().toISOString().split('T')[0],
      notes: '',
      materials: [{ materialId: '', qty: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'materials',
  });

  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [productSnap, materialSnap] = await Promise.all([
          getAllProducts(),
          getAllMaterials(),
        ]);

        const nextProducts = productSnap
          .filter((product) => product.active)
          .map((product) => ({ id: product.id, name: product.name.trim() }))
          .sort((a, b) => a.name.localeCompare(b.name));

        const nextMaterials = materialSnap
          .filter((material) => material.status)
          .map((material) => ({
            id: material.id,
            name: material.name,
            stock: material.stock,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setProducts(nextProducts);
        setMaterials(nextMaterials);
      } catch (error) {
        console.error('Failed to load production form options:', error);
        toast.error('Failed to load products or materials.');
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

  const materialOptions = useMemo(
    () => [
      { value: '', label: 'Select material' },
      ...materials.map((material) => ({
        value: material.id,
        label: `${material.name} (${material.stock} in stock)`,
      })),
    ],
    [materials],
  );

  const selectedProductId = watch('productId');
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const onSubmit: SubmitHandler<FormOutput> = async (data) => {
    const product = products.find((item) => item.id === data.productId);
    if (!product) {
      toast.error('Selected product could not be found.');
      return;
    }

    const normalizedMaterials = data.materials.map((item) => {
      const material = materials.find((entry) => entry.id === item.materialId);
      if (!material) {
        throw new Error('One of the selected materials could not be found.');
      }

      return {
        materialId: item.materialId,
        materialName: material.name,
        qty: item.qty,
      };
    });

    const aggregatedMaterials = Array.from(
      normalizedMaterials.reduce<Map<string, { materialId: string; materialName: string; qty: number }>>((map, item) => {
        const existing = map.get(item.materialId);
        if (existing) {
          existing.qty += item.qty;
          return map;
        }

        map.set(item.materialId, { ...item });
        return map;
      }, new Map()).values(),
    );

    setSaving(true);
    try {
      const productionRef = doc(collection(db, 'production'));
      const inventoryRef = doc(collection(db, 'inventoryTransactions'));

      await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', product.id);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error(`${product.name} no longer exists in products.`);
        }

        const productData = productSnap.data() as Record<string, unknown>;
        const currentProductStock =
          typeof productData.stockQuantity === 'number' && Number.isFinite(productData.stockQuantity)
            ? Math.max(0, Math.floor(productData.stockQuantity))
            : 0;
        const currentLowStockLimit =
          typeof productData.lowStockLimit === 'number' && Number.isFinite(productData.lowStockLimit)
            ? Math.max(0, Math.floor(productData.lowStockLimit))
            : 0;
        const newProductStock = currentProductStock + data.productionQty;

        const stockSnapshots = await Promise.all(
          aggregatedMaterials.map(async (item) => {
            const materialRef = doc(db, 'materials', item.materialId);
            const materialSnap = await transaction.get(materialRef);

            if (!materialSnap.exists()) {
              throw new Error(`${item.materialName} no longer exists in materials.`);
            }

            const materialData = materialSnap.data() as Record<string, unknown>;
            const currentStock =
              typeof materialData.stock === 'number' && Number.isFinite(materialData.stock)
                ? Math.max(0, materialData.stock)
                : 0;

            if (currentStock < item.qty) {
              throw new Error(`${item.materialName} has only ${currentStock} in stock.`);
            }

            return {
              item,
              materialRef,
              currentStock,
            };
          }),
        );

        stockSnapshots.forEach(({ item, materialRef, currentStock }) => {
          transaction.update(materialRef, {
            stock: currentStock - item.qty,
            updatedAt: serverTimestamp(),
          });
        });

        transaction.update(productRef, {
          stockQuantity: newProductStock,
          stockStatus: calculateStockStatus(newProductStock, currentLowStockLimit),
          lastStockUpdatedAt: serverTimestamp(),
          lastStockUpdatedBy: user?.email || user?.uid || 'admin',
          updatedAt: serverTimestamp(),
        });

        transaction.set(productionRef, {
          productId: product.id,
          productName: product.name,
          productionQty: data.productionQty,
          productionDate: data.productionDate,
          notes: data.notes?.trim() || '',
          materials: normalizedMaterials,
          createdAt: serverTimestamp(),
        });

        transaction.set(inventoryRef, {
          productId: product.id,
          productName: product.name,
          type: 'IN',
          source: 'PRODUCTION',
          quantity: data.productionQty,
          previousStock: currentProductStock,
          newStock: newProductStock,
          note: `Production entry (${data.productionDate})`,
          createdAt: serverTimestamp(),
          createdBy: user?.email || user?.uid || 'admin',
        });
      });

      toast.success('Production entry saved successfully.');
      reset({
        productId: '',
        productionQty: 1,
        productionDate: new Date().toISOString().split('T')[0],
        notes: '',
        materials: [{ materialId: '', qty: 1 }],
      });
      setMaterials((current) =>
        current.map((material) => {
          const used = aggregatedMaterials.find((item) => item.materialId === material.id);
          return used
            ? { ...material, stock: Math.max(0, material.stock - used.qty) }
            : material;
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

  if (products.length === 0 || materials.length === 0) {
    return (
      <EmptyState
        icon={<Factory className="h-16 w-16" />}
        title="Production setup incomplete"
          description={
            products.length === 0
              ? 'Add active products first so production can be recorded.'
              : 'Add active materials and keep their stock updated before creating production entries.'
          }
        action={
          materials.length === 0 ? (
            <Link
              href="/admin/materials"
              className={cn(
                'inline-flex items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-amber-700 hover:shadow-md',
                'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
              )}
            >
              Add Material
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Production Entry</h1>
        <p className="mt-1 text-stone-500">Record finished goods production and the materials consumed for each batch.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Production Details</h2>
              <p className="text-sm text-stone-500">Choose the finished product and enter the batch details.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="productId"
              label="Product *"
              options={productOptions}
              error={errors.productId?.message}
              {...register('productId')}
              className="sm:col-span-2"
            />
            <Input
              id="productionQty"
              label="Production Quantity *"
              type="number"
              min={1}
              error={errors.productionQty?.message}
              {...register('productionQty')}
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
            <div className="mt-5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-stone-500">Selected Product</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{selectedProduct.name}</p>
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
                <h2 className="text-lg font-bold text-stone-900">Materials Used</h2>
                <p className="text-sm text-stone-500">Add every raw material consumed in this production batch.</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/admin/materials"
                className={cn(
                  'inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-100',
                  'focus:outline-none focus:ring-2 focus:ring-stone-300 focus:ring-offset-2',
                )}
              >
                Manage Materials
              </Link>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: '', qty: 1 })}>
                <Plus className="h-3.5 w-3.5" />
                Add Material Line
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="rounded-xl border border-stone-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-700">Material Line {index + 1}</p>
                  {fields.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={`Remove material line ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                  <Select
                    id={`materials.${index}.materialId`}
                    label="Material *"
                    options={materialOptions}
                    error={errors.materials?.[index]?.materialId?.message}
                    {...register(`materials.${index}.materialId`)}
                  />
                  <Input
                    id={`materials.${index}.qty`}
                    label="Quantity *"
                    type="number"
                    min={1}
                    error={errors.materials?.[index]?.qty?.message}
                    {...register(`materials.${index}.qty`)}
                  />
                </div>
              </div>
            ))}
          </div>

          {typeof errors.materials?.message === 'string' ? (
            <p className="mt-3 text-xs text-red-600">{errors.materials.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" loading={saving}>
            Save Production Entry
          </Button>
          <p className="text-sm text-stone-500">This saves the production batch to Firestore `production` with all selected materials.</p>
        </div>
      </form>
    </div>
  );
}
