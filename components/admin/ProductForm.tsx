'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAllCategories } from '@/lib/firestore';
import { uploadProductImage } from '@/lib/storage';
import { slugify } from '@/lib/utils';
import type { Category, Product } from '@/types';
import Input from '@/components/ui/Input';
import { Textarea, Select } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

const variantSchema = z.object({
  id: z.string(),
  size: z.string().min(1, 'Size required'),
  material: z.string().min(1, 'Material required'),
  price: z.coerce.number().min(0, 'Price required'),
  comparePrice: z.coerce.number().optional(),
  stock: z.coerce.number().min(0, 'Stock required'),
  sku: z.string().min(1, 'SKU required'),
});

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  slug: z.string().min(2, 'Slug required'),
  description: z.string().min(10, 'Description required'),
  shortDescription: z.string().min(5, 'Short description required'),
  categoryId: z.string().min(1, 'Category required'),
  tags: z.string().optional(),
  featured: z.boolean(),
  active: z.boolean(),
  variants: z.array(variantSchema).min(1, 'At least one variant required'),
});

type FormData = z.infer<typeof schema>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: any) => Promise<void>;
  productId?: string;
}

const newVariant = () => ({ id: Math.random().toString(36).slice(2), size: '', material: '', price: 0, stock: 0, sku: '', comparePrice: undefined as number | undefined });

export default function ProductForm({ initialData, onSubmit, productId }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getAllCategories().then(setCategories); }, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: initialData
      ? { ...initialData, tags: initialData.tags.join(', '), featured: initialData.featured, active: initialData.active }
      : { active: true, featured: false, variants: [newVariant()] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const nameValue = watch('name');
  useEffect(() => {
    if (!initialData && nameValue) setValue('slug', slugify(nameValue));
  }, [nameValue, initialData, setValue]);

  const categoryId = watch('categoryId');
  const selectedCategory = categories.find(c => c.id === categoryId);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const id = productId || `temp_${Date.now()}`;
      const urls = await Promise.all(files.map(f => uploadProductImage(f, id)));
      setImages(prev => [...prev, ...urls]);
      toast.success('Images uploaded!');
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); }
  };

  const handleFormSubmit: SubmitHandler<FormData> = async (data) => {
    setSaving(true);
    try {
      const tags = data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      await onSubmit({ ...data, tags, images, categoryName: selectedCategory?.name || '' });
    } catch { toast.error('Failed to save product'); }
    finally { setSaving(false); }
  };

  const catOptions = [
    { value: '', label: 'Select Category' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Info */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-5">Basic Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Product Name *" id="name" placeholder="e.g. Bamboo Dropper Bottle" error={errors.name?.message} {...register('name')} className="sm:col-span-2" />
          <Input label="Slug *" id="slug" placeholder="auto-generated" error={errors.slug?.message} {...register('slug')} />
          <Select label="Category *" id="categoryId" options={catOptions} error={errors.categoryId?.message} {...register('categoryId')} />
          <Textarea label="Short Description *" id="shortDescription" placeholder="1-2 sentence overview" error={errors.shortDescription?.message} {...register('shortDescription')} className="sm:col-span-2" />
          <Textarea label="Full Description *" id="description" placeholder="Detailed product description..." error={errors.description?.message} {...register('description')} className="sm:col-span-2" />
          <Input label="Tags (comma-separated)" id="tags" placeholder="bamboo, eco, bottle" {...register('tags')} className="sm:col-span-2" />
          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('featured')} className="w-4 h-4 accent-amber-600" />
              <span className="text-sm font-medium text-stone-700">Featured Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('active')} className="w-4 h-4 accent-amber-600" />
              <span className="text-sm font-medium text-stone-700">Active (Visible)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-5">Product Images</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          {images.map((img, i) => (
            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-stone-200 group">
              <Image src={img} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-stone-200 hover:border-amber-400 flex flex-col items-center justify-center cursor-pointer transition text-stone-400 hover:text-amber-600">
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs">{uploading ? 'Uploading...' : 'Upload'}</span>
            <input type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        <p className="text-xs text-stone-400">Upload product images (JPEG, PNG, WebP recommended)</p>
      </div>

      {/* Variants */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Variants</h2>
            <p className="text-xs text-stone-500 mt-0.5">Define sizes, materials, pricing and stock for each variant</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append(newVariant())}>
            <Plus className="w-3.5 h-3.5" /> Add Variant
          </Button>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="border border-stone-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-stone-700">Variant {index + 1}</span>
                {fields.length > 1 && (
                  <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Input label="Size *" placeholder="e.g. 100ml, 250ml" error={errors.variants?.[index]?.size?.message} {...register(`variants.${index}.size`)} />
                <Input label="Material *" placeholder="e.g. Bamboo, Glass" error={errors.variants?.[index]?.material?.message} {...register(`variants.${index}.material`)} />
                <Input label="SKU *" placeholder="e.g. BB-100-BAM" error={errors.variants?.[index]?.sku?.message} {...register(`variants.${index}.sku`)} />
                <Input label="Price (₹) *" type="number" min="0" error={errors.variants?.[index]?.price?.message} {...register(`variants.${index}.price`)} />
                <Input label="Compare Price (₹)" type="number" min="0" placeholder="Original price" {...register(`variants.${index}.comparePrice`)} />
                <Input label="Stock *" type="number" min="0" error={errors.variants?.[index]?.stock?.message} {...register(`variants.${index}.stock`)} />
              </div>
            </div>
          ))}
        </div>
        {errors.variants?.root && (
          <p className="text-xs text-red-600 mt-2">{errors.variants.root.message}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button type="submit" loading={saving} size="lg">
          {saving ? 'Saving...' : initialData ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/products')}>Cancel</Button>
      </div>
    </form>
  );
}
