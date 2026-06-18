import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const CORE_CATEGORIES = [
  { slug: 'raw-material', name: 'Raw Material', order: 1 },
  { slug: 'production', name: 'Production', order: 2 },
  { slug: 'finished', name: 'Finished', order: 3 },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNameKey(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
}

function initializeFirebaseAdmin() {
  const envPath = path.join(process.cwd(), '.env.local');
  loadEnvFile(envPath);

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in .env.local.');
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

  return getFirestore(app);
}

async function ensureCoreCategories(db) {
  const categoriesSnap = await db.collection('categories').get();
  const existingBySlug = new Map();

  categoriesSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const slug = normalizeText(data.slug).toLowerCase();
    if (slug) existingBySlug.set(slug, docSnap);
  });

  let seeded = 0;
  let deactivated = 0;
  const batch = db.batch();

  CORE_CATEGORIES.forEach((category) => {
    const existing = existingBySlug.get(category.slug);
    const ref = existing ? existing.ref : db.collection('categories').doc();

    if (!existing) {
      seeded += 1;
      batch.set(ref, {
        name: category.name,
        slug: category.slug,
        description: '',
        image: '',
        order: category.order,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    batch.update(ref, {
      slug: category.slug,
      name: category.name,
      order: category.order,
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  categoriesSnap.docs.forEach((docSnap) => {
    const slug = normalizeText(docSnap.data().slug).toLowerCase();
    if (!CORE_CATEGORIES.some((category) => category.slug === slug)) {
      deactivated += 1;
      batch.update(docSnap.ref, {
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  await batch.commit();
  return { seeded, deactivated };
}

async function migrateProductionEntries(db) {
  const [productsSnap, productionSnap] = await Promise.all([
    db.collection('products').get(),
    db.collection('production').get(),
  ]);

  const rawMaterialProductsById = new Map();
  const rawMaterialProductsByName = new Map();

  productsSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const categorySlug = normalizeText(data.categoryId || data.category).toLowerCase();
    if (categorySlug !== 'raw-material') return;

    const product = {
      id: docSnap.id,
      name: normalizeText(data.name),
    };

    rawMaterialProductsById.set(product.id, product);

    const nameKey = normalizeNameKey(product.name);
    if (nameKey && !rawMaterialProductsByName.has(nameKey)) {
      rawMaterialProductsByName.set(nameKey, product);
    }
  });

  const batch = db.batch();
  let migrated = 0;
  let normalized = 0;

  productionSnap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const legacyMaterials = Array.isArray(data.materials) ? data.materials : [];
    const currentRawMaterials = Array.isArray(data.rawMaterials) ? data.rawMaterials : [];

    if (currentRawMaterials.length > 0) {
      normalized += 1;
      const normalizedRawMaterials = currentRawMaterials.map((item) => {
        const record = item && typeof item === 'object' ? item : {};
        const productId = normalizeText(record.productId || record.materialId);
        const productName = normalizeText(record.productName || record.materialName);
        const matchedProduct =
          rawMaterialProductsById.get(productId) ||
          rawMaterialProductsByName.get(normalizeNameKey(productName));

        return {
          productId: matchedProduct?.id || productId,
          productName: matchedProduct?.name || productName || 'Unnamed Raw Material',
          qty: Number.isFinite(record.qty) ? Number(record.qty) : 0,
        };
      });

      batch.update(docSnap.ref, {
        rawMaterials: normalizedRawMaterials,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    if (legacyMaterials.length === 0) return;

    migrated += 1;
    const normalizedRawMaterials = legacyMaterials.map((item) => {
      const record = item && typeof item === 'object' ? item : {};
      const productId = normalizeText(record.productId || record.materialId);
      const productName = normalizeText(record.productName || record.materialName);
      const matchedProduct =
        rawMaterialProductsById.get(productId) ||
        rawMaterialProductsByName.get(normalizeNameKey(productName));

      return {
        productId: matchedProduct?.id || productId,
        productName: matchedProduct?.name || productName || 'Unnamed Raw Material',
        qty: Number.isFinite(record.qty) ? Number(record.qty) : 0,
      };
    });

    batch.update(docSnap.ref, {
      rawMaterials: normalizedRawMaterials,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { migrated, normalized };
}

async function main() {
  const db = initializeFirebaseAdmin();
  const categoryResult = await ensureCoreCategories(db);
  const productionResult = await migrateProductionEntries(db);

  console.log('Materials removal migration complete.');
  console.log(`Seeded core categories: ${categoryResult.seeded}`);
  console.log(`Deactivated non-core categories: ${categoryResult.deactivated}`);
  console.log(`Migrated legacy production materials arrays: ${productionResult.migrated}`);
  console.log(`Normalized existing rawMaterials arrays: ${productionResult.normalized}`);
  console.log('Product stock quantities were not modified.');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exitCode = 1;
});
