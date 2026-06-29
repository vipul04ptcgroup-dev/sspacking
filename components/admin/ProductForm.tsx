'use client';

import { useState, useEffect, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getAllCategories } from '@/lib/firestore';
import { CORE_PRODUCT_CATEGORIES, isProductionProductCategorySlug } from '@/lib/product-categories';
import { normalizePublicCategorySlug } from '@/lib/public-product-categories';
import { getProductUnitForCategory, getProductUnitLabel } from '@/lib/product-units';
import { uploadProductImage } from '@/lib/storage';
import { slugify } from '@/lib/utils';
import type { Category, CompatibleClosureItem, Product, SuitableForItem } from '@/types';
import Input from '@/components/ui/Input';
import { Textarea, Select } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

const pricingTierSchema = z.object({
  minQty: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1'),
  maxQty: z.coerce.number().int().min(1, 'Maximum quantity must be at least 1'),
  unitPrice: z.coerce.number().min(0, 'Unit price cannot be negative'),
});

const listItemSchema = z.object({
  value: z.string().optional(),
});

const suitableForItemSchema = z.object({
  name: z.string().optional(),
  svgUrl: z.string().optional(),
});

const compatibleClosureItemSchema = z.object({
  name: z.string().optional(),
  imageUrl: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  slug: z.string().min(2, 'Slug required'),
  categoryId: z.string().min(1, 'Category required'),
  publicCategoryName: z.string().min(1, 'Public category required'),
  publicCategorySlug: z.string().min(1, 'Public category slug required'),
  shortDescription: z.string().min(5, 'Short description required'),
  description: z.string().trim().min(1, 'Product description required'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  focusKeyword: z.string().optional(),
  secondaryKeywords: z.string().optional(),
  compatibleClosuresImage: z.string().optional(),
  compatibleClosures: z.array(compatibleClosureItemSchema),
  dimensionDiagramImage: z.string().optional(),
  customizationImage: z.string().optional(),
  scanner3dImage: z.string().optional(),
  customizationOptions: z.array(listItemSchema),
  applicationIndustries: z.array(listItemSchema),
  suitableFor: z.array(suitableForItemSchema),
  images: z.string().optional(),
  tags: z.string().optional(),
  sku: z.string().min(1, 'SKU required'),
  unit: z.enum(['kg', 'gram']),
  stockQuantity: z.coerce.number().min(0, 'Stock quantity cannot be negative'),
  lowStockLimit: z.coerce.number().min(0, 'Low stock limit cannot be negative'),
  featured: z.boolean(),
  active: z.boolean(),
  capacity: z.string().optional(),
  neckSize: z.string().optional(),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  weight: z.string().optional(),
  material: z.string().optional(),
  packagingSize: z.string().optional(),
  color: z.string().optional(),
  surfaceFinish: z.string().optional(),
  suitableForText: z.string().optional(),
  moq: z.string().optional(),
  countryOfOrigin: z.string().optional(),
  remark: z.string().optional(),
  bottle_weight_gram: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.coerce.number().int().gt(0, 'Bottle weight must be greater than 0').nullable(),
  ),
  pricingTiers: z.array(pricingTierSchema)
    .min(1, 'At least one pricing tier is required')
    .superRefine((tiers, ctx) => {
      const sorted = tiers
        .map((tier, index) => ({ ...tier, index }))
        .sort((left, right) => left.minQty - right.minQty);

      sorted.forEach((tier) => {
        if (tier.maxQty < tier.minQty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Maximum quantity must be greater than or equal to minimum quantity.',
            path: [tier.index, 'maxQty'],
          });
        }
      });

      for (let index = 1; index < sorted.length; index += 1) {
        const previousTier = sorted[index - 1];
        const currentTier = sorted[index];

        if (currentTier.minQty <= previousTier.maxQty) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Pricing tier ranges cannot overlap.',
            path: [currentTier.index, 'minQty'],
          });
        }
      }
    }),
}).superRefine((data, ctx) => {
  if (isProductionProductCategorySlug(data.categoryId) && !data.bottle_weight_gram) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Bottle weight is required for Production products.',
      path: ['bottle_weight_gram'],
    });
  }
});

type FormValues = z.input<typeof schema>;
type FormSubmitValues = z.output<typeof schema>;
type ProductFormValues = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stockStatus'>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: ProductFormValues) => Promise<void>;
}

const newPricingTier = () => ({
  minQty: 1,
  maxQty: 1,
  unitPrice: 0,
});

const newListItem = () => ({
  value: '',
});

const newSuitableForItem = () => ({
  name: '',
  svgUrl: '',
});

const newCompatibleClosureItem = () => ({
  name: '',
  imageUrl: '',
});

export default function ProductForm({ initialData, onSubmit }: ProductFormProps) {
  const router = useRouter();
  const [publicCategories, setPublicCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingCompatibleClosuresImage, setUploadingCompatibleClosuresImage] = useState(false);
  const [uploadingCompatibleClosureIndex, setUploadingCompatibleClosureIndex] = useState<number | null>(null);
  const [uploadingDimensionDiagramImage, setUploadingDimensionDiagramImage] = useState(false);
  const [uploadingCustomizationImage, setUploadingCustomizationImage] = useState(false);
  const [uploadingScanner3dImage, setUploadingScanner3dImage] = useState(false);
  const [uploadingSuitableForIndex, setUploadingSuitableForIndex] = useState<number | null>(null);

  useEffect(() => {
    getAllCategories().then(setPublicCategories);
  }, []);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues, unknown, FormSubmitValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData
      ? {
          ...initialData,
          images: (initialData.images || []).join(', '),
          tags: initialData.tags.join(', '),
          seoTitle: initialData.seoTitle || '',
          seoDescription: initialData.seoDescription || '',
          focusKeyword: initialData.focusKeyword || '',
          secondaryKeywords: initialData.secondaryKeywords.join(', '),
          compatibleClosuresImage: initialData.compatibleClosuresImage || '',
          compatibleClosures: initialData.compatibleClosures.length > 0
            ? initialData.compatibleClosures.map((item) => ({
                name: item.name,
                imageUrl: item.imageUrl,
              }))
            : [newCompatibleClosureItem()],
          dimensionDiagramImage: initialData.dimensionDiagramImage || '',
          customizationImage: initialData.customizationImage || '',
          scanner3dImage: initialData.scanner3dImage || '',
          customizationOptions: initialData.customizationOptions.length > 0
            ? initialData.customizationOptions.map((value) => ({ value }))
            : [newListItem()],
          applicationIndustries: initialData.applicationIndustries.length > 0
            ? initialData.applicationIndustries.map((value) => ({ value }))
            : [newListItem()],
          suitableFor: initialData.suitableFor.length > 0
            ? initialData.suitableFor.map((item) => ({
                name: item.name,
                svgUrl: item.svgUrl,
              }))
            : [newSuitableForItem()],
          publicCategoryName: initialData.publicCategoryName || initialData.categoryId,
          publicCategorySlug: initialData.publicCategorySlug || normalizePublicCategorySlug(initialData.publicCategoryName || initialData.categoryId),
          description: initialData.description || '',
          unit: initialData.unit || getProductUnitForCategory(initialData.categoryId),
          pricingTiers: initialData.pricingTiers.length > 0
            ? initialData.pricingTiers.map((tier) => ({
                minQty: tier.minQty,
                maxQty: tier.maxQty,
                unitPrice: tier.unitPrice,
              }))
            : [newPricingTier()],
        }
      : {
          name: '',
          slug: '',
          categoryId: '',
          publicCategoryName: '',
          publicCategorySlug: '',
          shortDescription: '',
          description: '',
          seoTitle: '',
          seoDescription: '',
          focusKeyword: '',
          secondaryKeywords: '',
          compatibleClosuresImage: '',
          compatibleClosures: [newCompatibleClosureItem()],
          dimensionDiagramImage: '',
          customizationImage: '',
          scanner3dImage: '',
          customizationOptions: [newListItem()],
          applicationIndustries: [newListItem()],
          suitableFor: [newSuitableForItem()],
          images: '',
          tags: '',
          sku: '',
          unit: 'gram',
          stockQuantity: 1,
          lowStockLimit: 1000,
          featured: false,
          active: true,
          capacity: '',
          neckSize: '',
          height: '',
          width: '',
          length: '',
          weight: '',
          material: '',
          packagingSize: '',
          color: '',
          surfaceFinish: '',
          suitableForText: '',
          moq: '',
          countryOfOrigin: '',
          remark: '',
          bottle_weight_gram: null,
          pricingTiers: [newPricingTier()],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'pricingTiers',
  });
  const {
    fields: compatibleClosureFields,
    append: appendCompatibleClosure,
    remove: removeCompatibleClosure,
  } = useFieldArray({
    control,
    name: 'compatibleClosures',
  });
  const {
    fields: customizationOptionFields,
    append: appendCustomizationOption,
    remove: removeCustomizationOption,
  } = useFieldArray({
    control,
    name: 'customizationOptions',
  });
  const {
    fields: applicationIndustryFields,
    append: appendApplicationIndustry,
    remove: removeApplicationIndustry,
  } = useFieldArray({
    control,
    name: 'applicationIndustries',
  });
  const {
    fields: suitableForFields,
    append: appendSuitableFor,
    remove: removeSuitableFor,
  } = useFieldArray({
    control,
    name: 'suitableFor',
  });

  const nameValue = watch('name');
  const slugValue = watch('slug');
  const imagesValue = watch('images');
  const compatibleClosuresImageValue = watch('compatibleClosuresImage');
  const dimensionDiagramImageValue = watch('dimensionDiagramImage');
  const customizationImageValue = watch('customizationImage');
  const scanner3dImageValue = watch('scanner3dImage');
  const pricingTiersValue = watch('pricingTiers');
  const selectedCategoryId = watch('categoryId');
  const publicCategoryNameValue = watch('publicCategoryName');
  const isProductionCategory = isProductionProductCategorySlug(selectedCategoryId || initialData?.categoryId || 'finished');
  const derivedUnit = getProductUnitForCategory(selectedCategoryId || initialData?.categoryId || 'finished');
  const derivedUnitLabel = getProductUnitLabel(derivedUnit);
  const derivedUnitUiLabel = derivedUnit === 'gram' ? 'PCS' : derivedUnitLabel;

  const toImageList = (value?: string) =>
    value ? value.split(',').map((img) => img.trim()).filter(Boolean) : [];

  const setImages = (images: string[]) => {
    setValue('images', images.join(', '), { shouldDirty: true });
  };

  const productStorageId = () => slugValue?.trim() || initialData?.id || 'new_product';

  useEffect(() => {
    if (!initialData && nameValue) setValue('slug', slugify(nameValue));
  }, [nameValue, initialData, setValue]);

  useEffect(() => {
    const selectedOption = publicCategories.find((category) => category.name === publicCategoryNameValue);
    const nextSlug = selectedOption?.slug || normalizePublicCategorySlug(publicCategoryNameValue || '');
    setValue('publicCategorySlug', nextSlug, { shouldDirty: Boolean(publicCategoryNameValue) });
  }, [publicCategoryNameValue, publicCategories, setValue]);

  useEffect(() => {
    setValue('unit', derivedUnit, { shouldDirty: Boolean(selectedCategoryId) });
  }, [derivedUnit, selectedCategoryId, setValue]);

  useEffect(() => {
    if (!isProductionCategory) {
      setValue('bottle_weight_gram', null, { shouldDirty: Boolean(selectedCategoryId) });
    }
  }, [isProductionCategory, selectedCategoryId, setValue]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingImages(true);
    try {
      const urls = await Promise.all(files.map((file) => uploadProductImage(file, productStorageId())));
      setImages([...toImageList(imagesValue), ...urls]);
      toast.success('Product image uploaded');
    } catch {
      toast.error('Failed to upload product image');
    } finally {
      setUploadingImages(false);
      event.target.value = '';
    }
  };

  const handleFormSubmit = handleSubmit(async (data: FormSubmitValues) => {
    const normalizedPricingTiers = data.pricingTiers
      .map((tier): Product['pricingTiers'][number] => ({
        minQty: Number(tier.minQty),
        maxQty: Number(tier.maxQty),
        unitPrice: Number(tier.unitPrice),
      }))
      .sort((left, right) => left.minQty - right.minQty);

    const hasInvalidTier = normalizedPricingTiers.some((tier) =>
      !Number.isFinite(tier.minQty) ||
      !Number.isFinite(tier.maxQty) ||
      !Number.isFinite(tier.unitPrice) ||
      tier.minQty < 1 ||
      tier.maxQty < 1 ||
      tier.unitPrice < 0 ||
      tier.maxQty < tier.minQty
    );

    const hasOverlappingTiers = normalizedPricingTiers.some((tier, index) => {
      if (index === 0) return false;
      return tier.minQty <= normalizedPricingTiers[index - 1].maxQty;
    });

    if (hasInvalidTier || hasOverlappingTiers) {
      toast.error('Please review the pricing tiers.');
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: data.name.trim(),
        slug: data.slug.trim(),
        categoryId: data.categoryId,
        publicCategoryName: data.publicCategoryName.trim(),
        publicCategorySlug: normalizePublicCategorySlug(data.publicCategoryName),
        shortDescription: data.shortDescription.trim(),
        description: data.description?.trim() || '',
        seoTitle: data.seoTitle?.trim() || data.name.trim(),
        seoDescription: data.seoDescription?.trim() || data.shortDescription.trim(),
        focusKeyword: data.focusKeyword?.trim() || '',
        secondaryKeywords: data.secondaryKeywords
          ? data.secondaryKeywords.split(',').map((keyword: string) => keyword.trim()).filter(Boolean)
          : [],
        compatibleClosuresImage: data.compatibleClosuresImage?.trim() || '',
        compatibleClosures: data.compatibleClosures
          .map((item): CompatibleClosureItem => ({
            name: item.name?.trim() || '',
            imageUrl: item.imageUrl?.trim() || '',
          }))
          .filter((item) => item.name && item.imageUrl),
        dimensionDiagramImage: data.dimensionDiagramImage?.trim() || '',
        customizationImage: data.customizationImage?.trim() || '',
        scanner3dImage: data.scanner3dImage?.trim() || '',
        customizationOptions: data.customizationOptions
          .map((item) => item.value?.trim() || '')
          .filter(Boolean),
        applicationIndustries: data.applicationIndustries
          .map((item) => item.value?.trim() || '')
          .filter(Boolean),
        suitableFor: data.suitableFor
          .map((item): SuitableForItem => ({
            name: item.name?.trim() || '',
            svgUrl: item.svgUrl?.trim() || '',
          }))
          .filter((item) => item.name && item.svgUrl),
        images: toImageList(data.images),
        tags: data.tags ? data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
        sku: data.sku.trim(),
        unit: derivedUnit,
        stockQuantity: Number(data.stockQuantity),
        lowStockLimit: Number(data.lowStockLimit),
        featured: data.featured,
        active: data.active,
        capacity: data.capacity?.trim() || '',
        neckSize: data.neckSize?.trim() || '',
        height: data.height?.trim() || '',
        width: data.width?.trim() || '',
        length: data.length?.trim() || '',
        weight: data.weight?.trim() || '',
        material: data.material?.trim() || '',
        packagingSize: data.packagingSize?.trim() || '',
        color: data.color?.trim() || '',
        surfaceFinish: data.surfaceFinish?.trim() || '',
        suitableForText: data.suitableForText?.trim() || '',
        moq: data.moq?.trim() || '',
        countryOfOrigin: data.countryOfOrigin?.trim() || '',
        remark: data.remark?.trim() || '',
        bottle_weight_gram: isProductionCategory ? Number(data.bottle_weight_gram) : null,
        pricingTiers: normalizedPricingTiers,
        lastStockUpdatedAt: initialData?.lastStockUpdatedAt ?? null,
        lastStockUpdatedBy: initialData?.lastStockUpdatedBy || '',
      });
    } catch {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  });

  const categoryOptions = [{ value: '', label: 'Select Category' }, ...CORE_PRODUCT_CATEGORIES.map((category) => ({
    value: category.slug,
    label: category.name,
  }))];
  const publicCategoryOptions = [
    { value: '', label: 'Select Public Category' },
    ...publicCategories.map((category) => ({
      value: category.name,
      label: category.name,
    })),
  ];

  const handleCompatibleClosuresImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCompatibleClosuresImage(true);
    try {
      const url = await uploadProductImage(file, `${productStorageId()}_compatible_closures`);
      setValue('compatibleClosuresImage', url, { shouldDirty: true });
      toast.success('Compatible closures image uploaded');
    } catch {
      toast.error('Failed to upload compatible closures image');
    } finally {
      setUploadingCompatibleClosuresImage(false);
      event.target.value = '';
    }
  };

  const handleCompatibleClosureItemUpload = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCompatibleClosureIndex(index);
    try {
      const url = await uploadProductImage(file, `${productStorageId()}_compatible_closure_${index + 1}`);
      setValue(`compatibleClosures.${index}.imageUrl`, url, { shouldDirty: true });
      toast.success('Compatible closure image uploaded');
    } catch {
      toast.error('Failed to upload compatible closure image');
    } finally {
      setUploadingCompatibleClosureIndex(null);
      event.target.value = '';
    }
  };

  const handleSingleImageUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    fieldName: 'dimensionDiagramImage' | 'customizationImage' | 'scanner3dImage',
    setUploading: (value: boolean) => void,
    storageSuffix: string,
    successMessage: string,
    failureMessage: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadProductImage(file, `${productStorageId()}_${storageSuffix}`);
      setValue(fieldName, url, { shouldDirty: true });
      toast.success(successMessage);
    } catch {
      toast.error(failureMessage);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleSuitableForSvgUpload = async (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingSuitableForIndex(index);
    try {
      const url = await uploadProductImage(file, `${productStorageId()}_suitable_for_${index + 1}`);
      setValue(`suitableFor.${index}.svgUrl`, url, { shouldDirty: true });
      toast.success('Suitable-for SVG uploaded');
    } catch {
      toast.error('Failed to upload suitable-for SVG');
    } finally {
      setUploadingSuitableForIndex(null);
      event.target.value = '';
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-stone-900">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" {...register('compatibleClosuresImage')} />
          <input type="hidden" {...register('dimensionDiagramImage')} />
          <input type="hidden" {...register('customizationImage')} />
          <input type="hidden" {...register('scanner3dImage')} />
          <input type="hidden" {...register('images')} />
          <input type="hidden" {...register('unit')} />
          <input type="hidden" {...register('publicCategorySlug')} />
          <Input label="Product Name *" id="name" placeholder="e.g. Bamboo Dropper Bottle" error={errors.name?.message} {...register('name')} className="sm:col-span-2" />
          <Input label="Slug *" id="slug" placeholder="auto-generated" error={errors.slug?.message} {...register('slug')} />
          <Select label="Admin Category *" id="categoryId" options={categoryOptions} error={errors.categoryId?.message} {...register('categoryId')} />
          <Select label="Public Category *" id="publicCategoryName" options={publicCategoryOptions} error={errors.publicCategoryName?.message} {...register('publicCategoryName')} />
          <p className="text-xs text-stone-500 sm:col-span-2">
            Admin category is used for internal stock, purchase, and production structure. Public category is only used on the website.
          </p>
          <Textarea label="Short Description *" id="shortDescription" placeholder="1-2 sentence overview" error={errors.shortDescription?.message} {...register('shortDescription')} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <Textarea
              label="Product Description *"
              id="description"
              rows={10}
              placeholder={'Add the full product description.\n\nYou can use paragraphs, line breaks, and bullet points like:\n- Food-grade material\n- Leak-resistant cap\n- Suitable for bulk packaging'}
              error={errors.description?.message}
              {...register('description')}
            />
            <p className="mt-1 text-xs text-stone-500">
              Supports paragraphs, line breaks, and bullet points.
            </p>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-medium text-stone-700">Product Images</p>
            {toImageList(imagesValue).length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {toImageList(imagesValue).map((img, index) => (
                  <div key={`${img}-${index}`} className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                    <Image src={img} alt="" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(toImageList(imagesValue).filter((_, imageIndex) => imageIndex !== index))}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
              <Upload className="h-4 w-4" />
              <span>{uploadingImages ? 'Uploading...' : 'Upload Images'}</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploadingImages} />
            </label>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-medium text-stone-700">Compatible Closures Image</p>
            <p className="text-xs text-stone-500">Upload the reference image that shows closure compatibility for this product.</p>
            {compatibleClosuresImageValue ? (
              <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="relative aspect-[16/9] w-full">
                  <Image src={compatibleClosuresImageValue} alt="Compatible closures" fill className="object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => setValue('compatibleClosuresImage', '', { shouldDirty: true })}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove compatible closures image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
              <Upload className="h-4 w-4" />
              <span>{uploadingCompatibleClosuresImage ? 'Uploading...' : compatibleClosuresImageValue ? 'Replace Compatible Closures Image' : 'Upload Compatible Closures Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCompatibleClosuresImageUpload}
                className="hidden"
                disabled={uploadingCompatibleClosuresImage}
              />
            </label>
          </div>

          <div className="space-y-4 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">Compatible Closure Items</p>
                <p className="text-xs text-stone-500">Add each closure image with its display name.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => appendCompatibleClosure(newCompatibleClosureItem())}>
                <Plus className="h-3.5 w-3.5" /> Add Closure
              </Button>
            </div>
            <div className="space-y-4">
              {compatibleClosureFields.map((field, index) => {
                const imageValue = watch(`compatibleClosures.${index}.imageUrl`);

                return (
                  <div key={field.id} className="rounded-xl border border-stone-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-700">Closure {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeCompatibleClosure(index)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove compatible closure item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Closure Name"
                        {...register(`compatibleClosures.${index}.name`)}
                        error={errors.compatibleClosures?.[index]?.name?.message}
                      />
                      <div className="space-y-3">
                        <input type="hidden" {...register(`compatibleClosures.${index}.imageUrl`)} />
                        <p className="text-sm font-medium text-stone-700">Closure Image</p>
                        {imageValue ? (
                          <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                            <div className="relative aspect-square w-full max-w-[180px]">
                              <Image src={imageValue} alt="" fill className="object-contain p-4" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setValue(`compatibleClosures.${index}.imageUrl`, '', { shouldDirty: true })}
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                              aria-label="Remove closure image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
                          <Upload className="h-4 w-4" />
                          <span>{uploadingCompatibleClosureIndex === index ? 'Uploading...' : imageValue ? 'Replace Closure Image' : 'Upload Closure Image'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => handleCompatibleClosureItemUpload(event, index)}
                            className="hidden"
                            disabled={uploadingCompatibleClosureIndex === index}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-medium text-stone-700">Dimension Diagram Image</p>
            <p className="text-xs text-stone-500">Upload the image used for the dimension diagram section.</p>
            {dimensionDiagramImageValue ? (
              <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="relative aspect-[16/9] w-full">
                  <Image src={dimensionDiagramImageValue} alt="Dimension diagram" fill className="object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => setValue('dimensionDiagramImage', '', { shouldDirty: true })}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove dimension diagram image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
              <Upload className="h-4 w-4" />
              <span>{uploadingDimensionDiagramImage ? 'Uploading...' : dimensionDiagramImageValue ? 'Replace Dimension Diagram Image' : 'Upload Dimension Diagram Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleSingleImageUpload(event, 'dimensionDiagramImage', setUploadingDimensionDiagramImage, 'dimension_diagram', 'Dimension diagram image uploaded', 'Failed to upload dimension diagram image')}
                className="hidden"
                disabled={uploadingDimensionDiagramImage}
              />
            </label>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-medium text-stone-700">Customization Image</p>
            <p className="text-xs text-stone-500">Upload the image shown beside the customization options.</p>
            {customizationImageValue ? (
              <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="relative aspect-[16/9] w-full">
                  <Image src={customizationImageValue} alt="Customization options" fill className="object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => setValue('customizationImage', '', { shouldDirty: true })}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove customization image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
              <Upload className="h-4 w-4" />
              <span>{uploadingCustomizationImage ? 'Uploading...' : customizationImageValue ? 'Replace Customization Image' : 'Upload Customization Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleSingleImageUpload(event, 'customizationImage', setUploadingCustomizationImage, 'customization', 'Customization image uploaded', 'Failed to upload customization image')}
                className="hidden"
                disabled={uploadingCustomizationImage}
              />
            </label>
          </div>

          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-medium text-stone-700">3D View Scanner Image</p>
            <p className="text-xs text-stone-500">Upload the scanner or QR image used for the bottle 3D view section.</p>
            {scanner3dImageValue ? (
              <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="relative aspect-[16/9] w-full">
                  <Image src={scanner3dImageValue} alt="3D view scanner" fill className="object-contain" />
                </div>
                <button
                  type="button"
                  onClick={() => setValue('scanner3dImage', '', { shouldDirty: true })}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove 3D view scanner image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
              <Upload className="h-4 w-4" />
              <span>{uploadingScanner3dImage ? 'Uploading...' : scanner3dImageValue ? 'Replace 3D View Scanner Image' : 'Upload 3D View Scanner Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleSingleImageUpload(event, 'scanner3dImage', setUploadingScanner3dImage, 'scanner_3d', '3D view scanner image uploaded', 'Failed to upload 3D view scanner image')}
                className="hidden"
                disabled={uploadingScanner3dImage}
              />
            </label>
          </div>

          <Input label="Tags (comma-separated)" id="tags" placeholder="bamboo, eco, bottle" {...register('tags')} className="sm:col-span-2" />
          <Input label="SKU *" id="sku" placeholder="SKU-001" error={errors.sku?.message} {...register('sku')} />
          <Input label="Inventory Unit" value={derivedUnitUiLabel} readOnly className="bg-stone-50" />
          <Input label={`Stock Quantity (${derivedUnitUiLabel}) *`} id="stockQuantity" type="number" min={0} error={errors.stockQuantity?.message} {...register('stockQuantity')} />
          <Input label={`Low Stock Limit (${derivedUnitUiLabel}) *`} id="lowStockLimit" type="number" min={0} error={errors.lowStockLimit?.message} {...register('lowStockLimit')} />
          <p className="text-xs text-stone-500 sm:col-span-2">
            Stock is stored automatically in {derivedUnitUiLabel} based on the selected category. Manual unit changes are disabled.
          </p>
          <div className="flex items-center gap-6 sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" {...register('featured')} className="h-4 w-4 accent-amber-600" />
              <span className="text-sm font-medium text-stone-700">Featured Product</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" {...register('active')} className="h-4 w-4 accent-amber-600" />
              <span className="text-sm font-medium text-stone-700">Active (Visible)</span>
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">Product Specifications</h2>
          <p className="mt-0.5 text-xs text-stone-500">Store the product details directly on the product record.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Capacity" {...register('capacity')} error={errors.capacity?.message} />
          <Input label="Neck Finish" {...register('neckSize')} error={errors.neckSize?.message} />
          <Input label="Height" {...register('height')} error={errors.height?.message} />
          <Input label="Width" {...register('width')} error={errors.width?.message} />
          <Input label="Length" {...register('length')} error={errors.length?.message} />
          <Input label={`Weight (${derivedUnitUiLabel})`} {...register('weight')} error={errors.weight?.message} />
          <Input label="Material" {...register('material')} error={errors.material?.message} />
          <Input label="Packaging" {...register('packagingSize')} error={errors.packagingSize?.message} />
          <Input label="Color" {...register('color')} error={errors.color?.message} />
          <Input label="Surface Finish" {...register('surfaceFinish')} error={errors.surfaceFinish?.message} />
          <Input label="Suitable For (Text)" {...register('suitableForText')} error={errors.suitableForText?.message} />
          <Input label="MOQ" {...register('moq')} error={errors.moq?.message} />
          <Input label="Country of Origin" {...register('countryOfOrigin')} error={errors.countryOfOrigin?.message} />
          {isProductionCategory ? (
            <Input
              label="Bottle Weight (GRAM) *"
              type="number"
              min={1}
              step={1}
              helpText="Required only for Production products."
              error={errors.bottle_weight_gram?.message}
              {...register('bottle_weight_gram')}
            />
          ) : null}
          <Input label="Remark" {...register('remark')} error={errors.remark?.message} className="lg:col-span-2" />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">Product Display Sections</h2>
          <p className="mt-0.5 text-xs text-stone-500">Manage the extra sections shown on the product detail page.</p>
        </div>

        <div className="space-y-8">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Customization Options</h3>
                <p className="text-xs text-stone-500">Add each customization point as a separate row.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => appendCustomizationOption(newListItem())}>
                <Plus className="h-3.5 w-3.5" /> Add Option
              </Button>
            </div>
            <div className="space-y-3">
              {customizationOptionFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3">
                  <Input
                    label={index === 0 ? 'Customization Option' : `Customization Option ${index + 1}`}
                    {...register(`customizationOptions.${index}.value`)}
                    error={errors.customizationOptions?.[index]?.value?.message}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomizationOption(index)}
                    className="mt-8 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove customization option"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Application Industries</h3>
                <p className="text-xs text-stone-500">Add the industries where this product is commonly used.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => appendApplicationIndustry(newListItem())}>
                <Plus className="h-3.5 w-3.5" /> Add Industry
              </Button>
            </div>
            <div className="space-y-3">
              {applicationIndustryFields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3">
                  <Input
                    label={index === 0 ? 'Application Industry' : `Application Industry ${index + 1}`}
                    {...register(`applicationIndustries.${index}.value`)}
                    error={errors.applicationIndustries?.[index]?.value?.message}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeApplicationIndustry(index)}
                    className="mt-8 rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove application industry"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Suitable For</h3>
                <p className="text-xs text-stone-500">Add an SVG/icon and a label for each suitable-for item.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => appendSuitableFor(newSuitableForItem())}>
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
            <div className="space-y-4">
              {suitableForFields.map((field, index) => {
                const svgValue = watch(`suitableFor.${index}.svgUrl`);

                return (
                  <div key={field.id} className="rounded-xl border border-stone-200 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-stone-700">Suitable For Item {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSuitableFor(index)}
                        className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove suitable-for item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        label="Name"
                        {...register(`suitableFor.${index}.name`)}
                        error={errors.suitableFor?.[index]?.name?.message}
                      />
                      <div className="space-y-3">
                        <input type="hidden" {...register(`suitableFor.${index}.svgUrl`)} />
                        <p className="text-sm font-medium text-stone-700">SVG/Icon</p>
                        {svgValue ? (
                          <div className="group relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                            <div className="relative aspect-square w-full max-w-[180px]">
                              <Image src={svgValue} alt="" fill className="object-contain p-4" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setValue(`suitableFor.${index}.svgUrl`, '', { shouldDirty: true })}
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                              aria-label="Remove suitable-for SVG"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : null}
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
                          <Upload className="h-4 w-4" />
                          <span>{uploadingSuitableForIndex === index ? 'Uploading...' : svgValue ? 'Replace SVG/Icon' : 'Upload SVG/Icon'}</span>
                          <input
                            type="file"
                            accept="image/svg+xml,image/*,.svg"
                            onChange={(event) => handleSuitableForSvgUpload(event, index)}
                            className="hidden"
                            disabled={uploadingSuitableForIndex === index}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-stone-900">SEO</h2>
          <p className="mt-0.5 text-xs text-stone-500">These values power the product page SEO and the product JSON-LD schema on the detail page.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="SEO Title"
            id="seoTitle"
            placeholder="Custom product SEO title"
            error={errors.seoTitle?.message}
            {...register('seoTitle')}
            className="sm:col-span-2"
          />
          <Textarea
            label="SEO Description"
            id="seoDescription"
            placeholder="Short search-friendly description for this product"
            error={errors.seoDescription?.message}
            {...register('seoDescription')}
            className="sm:col-span-2"
          />
          <Input
            label="Focus Keyword"
            id="focusKeyword"
            placeholder="e.g. ceramide gel moisturizer"
            error={errors.focusKeyword?.message}
            {...register('focusKeyword')}
          />
          <Input
            label="Secondary Keywords"
            id="secondaryKeywords"
            placeholder="comma-separated keyword phrases"
            error={errors.secondaryKeywords?.message}
            {...register('secondaryKeywords')}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Pricing Tiers</h2>
            <p className="mt-0.5 text-xs text-stone-500">Define unit price bands by order quantity.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => append(newPricingTier())}>
            <Plus className="h-3.5 w-3.5" /> Add Tier
          </Button>
        </div>
        <div className="mb-3 grid gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-stone-500 sm:grid-cols-3">
          <span>Min Qty</span>
          <span>Max Qty</span>
          <span>Unit Price</span>
        </div>

        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="rounded-xl border border-stone-200 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-700">Tier {index + 1}</span>
                {fields.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  label="Min Qty *"
                  type="number"
                  min={1}
                  error={errors.pricingTiers?.[index]?.minQty?.message}
                  {...register(`pricingTiers.${index}.minQty`)}
                />
                <Input
                  label="Max Qty *"
                  type="number"
                  min={Number(pricingTiersValue?.[index]?.minQty) || 1}
                  error={errors.pricingTiers?.[index]?.maxQty?.message}
                  {...register(`pricingTiers.${index}.maxQty`)}
                />
                <Input
                  label="Unit Price *"
                  type="number"
                  min={0}
                  step="0.01"
                  error={errors.pricingTiers?.[index]?.unitPrice?.message}
                  {...register(`pricingTiers.${index}.unitPrice`)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button
          type="submit"
          loading={saving}
          size="lg"
          disabled={
            uploadingImages ||
            uploadingCompatibleClosuresImage ||
            uploadingCompatibleClosureIndex !== null ||
            uploadingDimensionDiagramImage ||
            uploadingCustomizationImage ||
            uploadingScanner3dImage ||
            uploadingSuitableForIndex !== null
          }
        >
          {saving ? 'Saving...' : initialData ? 'Update Product' : 'Create Product'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/admin/products', { scroll: true })}>Cancel</Button>
      </div>
    </form>
  );
}
