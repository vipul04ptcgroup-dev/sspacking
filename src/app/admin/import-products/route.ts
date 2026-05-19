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
      const raw = parsed[index] as ImportProduct;
      const productName = raw.product_name?.trim();

      if (!productName) {
        errors.push(`Row ${index + 1}: product_name is required.`);
        continue;
      }

      const category = raw.category?.trim() || 'uncategorized';
      const description = raw.description?.trim() || '';
      const slug = slugify(productName) || `product-${Date.now()}-${index + 1}`;
      const price = parsePrice(raw.price);
      const imageSource = raw.image_url?.trim() || raw.image_path?.trim();

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
            sku: raw.sku?.trim() || '',
            capacity: raw.size?.trim() || undefined,
            price,
          },
        ],
        tags: [],
        featured: false,
        active: true,
        hasVariants: true,
        sku: raw.sku?.trim() || '',
        price: price ?? null,
        size: raw.size?.trim() || '',
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
