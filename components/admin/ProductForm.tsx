'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
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
  id: z.string().optional(),
  images: z.string().optional(),
  capacity: z.string().optional(),
  neckSize: z.string().optional(),
  material: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  packagingSize: z.string().optional(),
  color: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().optional(),
  remark: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  slug: z.string().min(2, 'Slug required'),
  shortDescription: z.string().min(5, 'Short description required'),
  category: z.string().min(1, 'Category required'),
  images: z.string().optional(),
  tags: z.string().optional(),
  featured: z.boolean(),
  active: z.boolean(),
  hasVariants: z.boolean(),
  variants: z.array(variantSchema).optional(),
});

type FormInput = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;
type ProductFormValues = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductFormValues) => Promise<void>;
}

const newVariant = () => ({
  id: Math.random().toString(36).slice(2),
  images: '',
  capacity: '',
  neckSize: '',
  material: '',
  height: '',
  weight: '',
  packagingSize: '',
  color: '',
  sku: '',
  price: undefined as number | undefined,
  remark: '',
});

export default function ProductForm({ initialData, onSubmit }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingCommon, setUploadingCommon] = useState(false);
  const [uploadingVariant, setUploadingVariant] = useState<number | null>(null);
  const [hasVariants, setHasVariants] = useState((initialData?.variants?.length || 0) > 0);

  useEffect(() => {
    getAllCategories().then(setCategories);
  }, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          ...initialData,
          images: (initialData.images || []).join(', '),
          variants: (initialData.variants || []).map(v => ({
            ...v,
            images: (v.images || []).join(', '),
          })),
          tags: initialData.tags.join(', '),
          featured: initialData.featured,
          active: initialData.active,
          hasVariants: initialData.hasVariants ?? (initialData.variants?.length || 0) > 0,
        }
      : { active: true, featured: false, hasVariants: false, variants: [] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const nameValue = watch('name');
  const slugValue = watch('slug');
  const commonImagesValue = watch('images');
  const variantsValue = watch('variants');

  const toImageList = (value?: string) =>
    value ? value.split(',').map((img: string) => img.trim()).filter(Boolean) : [];

  const setCommonImages = (images: string[]) => {
    setValue('images', images.join(', '), { shouldDirty: true });
  };

  const setVariantImages = (index: number, images: string[]) => {
    setValue(`variants.${index}.images`, images.join(', '), { shouldDirty: true });
  };

  const productStorageId = () => slugValue?.trim() || initialData?.id || 'new_product';
  useEffect(() => {
    if (!initialData && nameValue) setValue('slug', slugify(nameValue));
  }, [nameValue, initialData, setValue]);

  const handleCommonImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingCommon(true);
    try {
      const urls = await Promise.all(files.map(file => uploadProductImage(file, productStorageId())));
      setCommonImages([...toImageList(commonImagesValue), ...urls]);
      toast.success('Product image uploaded');
    } catch {
      toast.error('Failed to upload product image');
    } finally {
      setUploadingCommon(false);
      e.target.value = '';
    }
  };

  const handleVariantImageUpload = async (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingVariant(index);
    try {
      const urls = await Promise.all(files.map(file => uploadProductImage(file, `${productStorageId()}_variant_${index + 1}`)));
      const current = toImageList(variantsValue?.[index]?.images);
      setVariantImages(index, [...current, ...urls]);
      toast.success(`Variant ${index + 1} image uploaded`);
    } catch {
      toast.error('Failed to upload variant image');
    } finally {
      setUploadingVariant(null);
      e.target.value = '';
    }
  };

  const handleFormSubmit: SubmitHandler<FormOutput> = async (data) => {
    setSaving(true);
    try {
      const tags = data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];
      const images = data.images ? data.images.split(',').map((img: string) => img.trim()).filter(Boolean) : [];
      await onSubmit({
        ...data,
        images,
        tags,
        hasVariants,
        variants: hasVariants
          ? (data.variants || []).map(v => ({
              ...v,
              images: v.images ? v.images.split(',').map((img: string) => img.trim()).filter(Boolean) : [],
            }))
          : [],
      });
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const catOptions = [{ value: '', label: 'Select Category' }, ...categories.map(c => ({ value: c.slug, label: c.name }))];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <h2 className="text-lg font-bold text-stone-900 mb-5">Basic Information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input type="hidden" {...register('images')} />
          <Input label="Product Name *" id="name" placeholder="e.g. Bamboo Dropper Bottle" error={errors.name?.message} {...register('name')} className="sm:col-span-2" />
          <Input label="Slug *" id="slug" placeholder="auto-generated" error={errors.slug?.message} {...register('slug')} />
          <Select label="Category *" id="category" options={catOptions} error={errors.category?.message} {...register('category')} />
          <Textarea label="Short Description *" id="shortDescription" placeholder="1-2 sentence overview" error={errors.shortDescription?.message} {...register('shortDescription')} className="sm:col-span-2" />
          <div className="sm:col-span-2 space-y-3">
            <p className="text-sm font-medium text-stone-700">Common Product Images</p>
            {toImageList(commonImagesValue).length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {toImageList(commonImagesValue).map((img, i) => (
                  <div key={`${img}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group">
                    <Image src={img} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setCommonImages(toImageList(commonImagesValue).filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/65 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
              <Upload className="w-4 h-4" />
              <span>{uploadingCommon ? 'Uploading...' : 'Upload Images'}</span>
              <input type="file" accept="image/*" multiple onChange={handleCommonImageUpload} className="hidden" disabled={uploadingCommon} />
            </label>
          </div>
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

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={hasVariants}
            onChange={(e) => {
              setHasVariants(e.target.checked);
              setValue('hasVariants', e.target.checked);
            }}
          />
          <span className="text-sm font-medium">This product has variants</span>
        </label>

        {hasVariants && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Variants</h2>
                <p className="text-xs text-stone-500 mt-0.5">Define technical specifications for each variant</p>
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
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <input type="hidden" {...register(`variants.${index}.images`)} />
                    <div className="col-span-2 sm:col-span-3 space-y-3">
                      <p className="text-sm font-medium text-stone-700">Variant Images</p>
                      {toImageList(variantsValue?.[index]?.images).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {toImageList(variantsValue?.[index]?.images).map((img, i) => (
                            <div key={`${img}-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group">
                              <Image src={img} alt="" fill className="object-cover" />
                              <button
                                type="button"
                                onClick={() => setVariantImages(index, toImageList(variantsValue?.[index]?.images).filter((_, idx) => idx !== i))}
                                className="absolute top-2 right-2 w-7 h-7 bg-black/65 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                aria-label="Remove variant image"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
                        <Upload className="w-4 h-4" />
                        <span>{uploadingVariant === index ? 'Uploading...' : `Upload Variant ${index + 1} Images`}</span>
                        <input type="file" accept="image/*" multiple onChange={(e) => handleVariantImageUpload(index, e)} className="hidden" disabled={uploadingVariant === index} />
                      </label>
                    </div>
                    <Input label="Capacity" {...register(`variants.${index}.capacity`)} error={errors.variants?.[index]?.capacity?.message} />
                    <Input label="Neck Size" {...register(`variants.${index}.neckSize`)} error={errors.variants?.[index]?.neckSize?.message} />
                    <Input label="Material" {...register(`variants.${index}.material`)} error={errors.variants?.[index]?.material?.message} />
                    <Input label="Height" {...register(`variants.${index}.height`)} error={errors.variants?.[index]?.height?.message} />
                    <Input label="Weight" {...register(`variants.${index}.weight`)} error={errors.variants?.[index]?.weight?.message} />
                    <Input label="Packaging Size" {...register(`variants.${index}.packagingSize`)} error={errors.variants?.[index]?.packagingSize?.message} />
                    <Input label="Color" {...register(`variants.${index}.color`)} error={errors.variants?.[index]?.color?.message} />
                    <Input label="SKU" {...register(`variants.${index}.sku`)} error={errors.variants?.[index]?.sku?.message} />
                    <Input label="Price (Optional)" type="number" {...register(`variants.${index}.price`)} />
                    <Input label="Remark" {...register(`variants.${index}.remark`)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => append(newVariant())}>
                <Plus className="w-3.5 h-3.5" /> Add Variant
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={saving} size="lg" disabled={uploadingCommon || uploadingVariant !== null}>
          {saving ? 'Saving...' : initialData ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/products', { scroll: true })}>Cancel</Button>
      </div>
    </form>
  );
}
