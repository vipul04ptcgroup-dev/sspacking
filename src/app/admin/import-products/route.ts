import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { slugify } from '@/lib/utils';

export const runtime = 'nodejs';

type ImportProduct = {
  product_name?: string;
  sku?: string;
  category?: string;
  description?: string;
  price?: string | number;
  size?: string;
  image_path?: string;
  image_url?: string;
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

async function uploadImageFromUrl(imageUrl: string, productSlug: string): Promise<string> {
  const { adminStorage } = getFirebaseAdmin();
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Image download failed with status ${response.status}`);
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

    for (let index = 0; index < parsed.length; index += 1) {
      const row = parsed[index];
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        errors.push(`Row ${index + 1}: row must be a product object.`);
        continue;
      }

      const raw = row as ImportProduct;
      const productName = asTrimmedString(raw.product_name);

      if (!productName) {
        errors.push(`Row ${index + 1}: product_name is required.`);
        continue;
      }

      const category = asTrimmedString(raw.category) || 'uncategorized';
      const description = asTrimmedString(raw.description) || '';
      const slug = slugify(productName) || `product-${Date.now()}-${index + 1}`;
      const price = parsePrice(raw.price);
      const imageSource = asTrimmedString(raw.image_url) || asTrimmedString(raw.image_path);
      const sku = asTrimmedString(raw.sku) || '';
      const size = asTrimmedString(raw.size) || '';

      let imageUrl: string | null = null;
      if (imageSource) {
        try {
          imageUrl = await uploadImageFromUrl(imageSource, slug);
        } catch (error) {
          errors.push(
            `Row ${index + 1}: failed image import (${error instanceof Error ? error.message : 'unknown error'}).`,
          );
        }
      }

      await adminDb.collection('products').add({
        name: productName,
        slug,
        shortDescription: description || `${productName} - ${category}`,
        category,
        images: imageUrl ? [imageUrl] : [],
        variants: [
          {
            id: randomUUID(),
            sku,
            capacity: size || undefined,
            price,
          },
        ],
        tags: [],
        featured: false,
        active: true,
        hasVariants: true,
        sku,
        price: price ?? null,
        size,
        sourceImage: imageSource || '',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      imported += 1;
    }

    return NextResponse.json({
      imported,
      failed: errors.length,
      errors,
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
