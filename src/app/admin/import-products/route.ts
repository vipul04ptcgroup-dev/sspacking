import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { access, readFile } from 'node:fs/promises';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';

type ImportProduct = {
  product_name?: string;
  name?: string;
  sku?: string;
  category?: string;
  description?: string;
  shortDescription?: string;
  price?: string | number;
  size?: string;
  capacity?: string;
  variant_size?: string;
  image_path?: string;
  image_url?: string;
  image?: string;
  images?: string[] | string;
  product_url?: string;
};

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function parsePrice(value: string | number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toImageSourceList(raw: ImportProduct): string[] {
  const list: string[] = [];
  const candidates: unknown[] = [raw.image_url, raw.image_path, raw.image, raw.images];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const value = asTrimmedString(item);
        if (value) list.push(value);
      }
      continue;
    }

    const value = asTrimmedString(candidate);
    if (!value) continue;

    if (value.includes(',')) {
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => list.push(part));
      continue;
    }

    list.push(value);
  }

  return Array.from(new Set(list));
}

function toAbsoluteImageUrl(imageSource: string): string | null {
  if (/^https?:\/\//i.test(imageSource)) return imageSource;
  const base = process.env.IMPORT_IMAGE_BASE_URL?.trim();
  if (!base) return null;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = imageSource.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

async function uploadImageFromUrl(imageUrl: string, productSlug: string): Promise<string> {
  const { adminStorage } = getFirebaseAdmin();
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(imageUrl);
    if (response.ok) break;
    if (response.status !== 429 || attempt === 2) break;
    const retryAfterHeader = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const waitMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(500, retryAfterSeconds * 1000)
      : 1000 * (attempt + 1);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, waitMs));
  }

  if (!response || !response.ok) {
    const status = response?.status ?? 'unknown';
    throw new Error(`Image download failed with status ${status}`);
  }

  const contentType = response.headers.get('content-type') || 'application/octet-stream';
  const extension = extname(new URL(imageUrl).pathname) || '.jpg';
  const filename = `${Date.now()}_${randomUUID()}${extension}`;
  const filePath = `products/${productSlug}/${filename}`;
  const token = randomUUID();
  const fileBuffer = Buffer.from(await response.arrayBuffer());

  const bucket = adminStorage.bucket();
  const file = bucket.file(filePath);
  await file.save(fileBuffer, {
    resumable: false,
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function uploadImageFromBuffer(buffer: Buffer, sourceName: string, productSlug: string): Promise<string> {
  const { adminStorage } = getFirebaseAdmin();
  const extension = extname(sourceName) || '.jpg';
  const filename = `${Date.now()}_${randomUUID()}${extension}`;
  const filePath = `products/${productSlug}/${filename}`;
  const token = randomUUID();
  const bucket = adminStorage.bucket();
  const file = bucket.file(filePath);

  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: 'application/octet-stream',
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

async function importLocalImageIfAvailable(imageSource: string, productSlug: string): Promise<string | null> {
  const normalized = imageSource.replace(/\\/g, '/').replace(/^\/+/, '');
  const cwd = process.cwd();

  const candidates = [
    resolve(cwd, normalized),
    resolve(cwd, 'public', normalized),
  ];

  for (const filePath of candidates) {
    if (await pathExists(filePath)) {
      const buffer = await readFile(filePath);
      return uploadImageFromBuffer(buffer, filePath, productSlug);
    }
  }

  // If file exists under public path as URL path, return it directly.
  const publicRelativePath = join(cwd, 'public', normalized);
  if (await pathExists(publicRelativePath)) {
    return `/${normalized}`;
  }

  return null;
}

function extractFirstMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match?.[1] || null;
}

async function getImageFromProductPage(pageUrl: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(pageUrl)) return null;

  const response = await fetch(pageUrl);
  if (!response.ok) return null;

  const html = await response.text();
  // Common metadata used by WordPress / WooCommerce product pages.
  const ogImage =
    extractFirstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractFirstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i);
  if (ogImage) return ogImage;

  const twitterImage =
    extractFirstMatch(html, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i) ||
    extractFirstMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i);
  if (twitterImage) return twitterImage;

  const featuredImage = extractFirstMatch(
    html,
    /<img[^>]+class=["'][^"']*wp-post-image[^"']*["'][^>]+src=["']([^"']+)["'][^>]*>/i,
  );
  if (featuredImage) return featuredImage;

  return null;
}

export async function POST(request: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing JSON file in "file" field.' }, { status: 400 });
    }

    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;

    if (!Array.isArray(parsed)) {
      return NextResponse.json({ error: 'JSON must be an array of products.' }, { status: 400 });
    }

    let imported = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let index = 0; index < parsed.length; index += 1) {
      const row = parsed[index];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        errors.push(`Row ${index + 1}: row must be a product object.`);
        continue;
      }

      const raw = row as ImportProduct;
      const productName = asTrimmedString(raw.product_name) || asTrimmedString(raw.name);

      if (!productName) {
        errors.push(`Row ${index + 1}: product_name (or name) is required.`);
        continue;
      }

      const category = asTrimmedString(raw.category) || 'uncategorized';
      const description = asTrimmedString(raw.description) || asTrimmedString(raw.shortDescription) || '';
      const slug = slugify(productName) || `product-${Date.now()}-${index + 1}`;
      const price = parsePrice(raw.price);
      const imageSources = toImageSourceList(raw);
      const productUrl = asTrimmedString(raw.product_url);
      const sku = asTrimmedString(raw.sku) || '';
      const size = asTrimmedString(raw.size) || asTrimmedString(raw.capacity) || asTrimmedString(raw.variant_size) || '';

      if (imageSources.length === 0 && productUrl) {
        try {
          const extracted = await getImageFromProductPage(productUrl);
          if (extracted) {
            imageSources.push(extracted);
          } else {
            errors.push(`Row ${index + 1}: no image found on product_url metadata.`);
          }
        } catch (error) {
          errors.push(
            `Row ${index + 1}: failed to fetch product_url image (${error instanceof Error ? error.message : 'unknown error'}).`,
          );
        }
      }

      const savedImages: string[] = [];
      for (const imageSource of imageSources) {
        const sourceAsUrl = toAbsoluteImageUrl(imageSource);
        if (!sourceAsUrl) {
          const localImported = await importLocalImageIfAvailable(imageSource, slug);
          if (localImported) {
            savedImages.push(localImported);
          }
          continue;
        }

        try {
          const uploadedUrl = await uploadImageFromUrl(sourceAsUrl, slug);
          savedImages.push(uploadedUrl);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'unknown error';
          if (message.includes('status 429')) {
            warnings.push(`Row ${index + 1}: image source rate-limited (429), image left blank.`);
          } else {
            warnings.push(`Row ${index + 1}: image copy failed, image left blank (${message}).`);
          }
        }
      }

      // If provided image sources did not produce a usable image, try product page metadata fallback.
      if (savedImages.length === 0 && productUrl) {
        try {
          const extracted = await getImageFromProductPage(productUrl);
          if (extracted) {
            if (/^https?:\/\//i.test(extracted)) {
              try {
                const uploadedUrl = await uploadImageFromUrl(extracted, slug);
                savedImages.push(uploadedUrl);
              } catch (error) {
                const message = error instanceof Error ? error.message : 'unknown error';
                warnings.push(`Row ${index + 1}: product_url fallback image fetch failed, image left blank (${message}).`);
              }
            } else {
              savedImages.push(extracted);
            }
          }
        } catch {
          // Keep silent here since initial parsing already collected row-level image warnings.
        }
      }

      try {
        const variant: Record<string, unknown> = {
          id: randomUUID(),
          sku,
          images: savedImages,
        };
        if (size) variant.capacity = size;
        if (typeof price === 'number') variant.price = price;

        await adminDb.collection('products').add({
          name: productName,
          slug,
          shortDescription: description || `${productName} - ${category}`,
          category,
          images: savedImages,
          variants: [variant],
          tags: [],
          featured: false,
          active: true,
          hasVariants: true,
          sku,
          price: price ?? null,
          size,
          sourceImage: imageSources[0] || productUrl || '',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        imported += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'unknown Firestore error';
        errors.push(`Row ${index + 1}: failed to save product (${message}).`);
      }
    }

    if (imported === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Import failed. No products were saved.',
          imported,
          failed: errors.length,
          errors,
          warnings,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      imported,
      failed: errors.length,
      errors,
      warnings,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON format.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    );
  }
}
