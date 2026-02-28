/**
 * Migration: Convert signed Firebase Storage URLs → permanent public URLs
 *
 * Signed URLs look like:
 *   https://storage.googleapis.com/BUCKET/path/to/file.webp?GoogleAccessId=...&Expires=...&Signature=...
 *
 * Permanent public URLs look like:
 *   https://storage.googleapis.com/BUCKET/path%2Fto%2Ffile.webp
 *
 * Run:
 *   MONGODB_URI=... MONGODB_DB_NAME=restohand FIREBASE_STORAGE_BUCKET=... \
 *     npx ts-node -r tsconfig-paths/register src/scripts/migrate-image-urls.ts
 *
 * Safe to re-run — already-migrated URLs are skipped.
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB_NAME ?? 'restohand';
const BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

if (!MONGODB_URI) throw new Error('MONGODB_URI is required');
if (!BUCKET) throw new Error('FIREBASE_STORAGE_BUCKET is required');


const GCS_ROOT = 'https://storage.googleapis.com/';

/**
 * Convert any GCS signed URL or previously-encoded URL to a clean permanent public URL.
 * Returns null if the URL is already correct (no changes needed).
 */
function toPublicUrl(url: string): string | null {
  if (!url || !url.startsWith(GCS_ROOT)) return null;

  const isSigned = url.includes('?GoogleAccessId=') || url.includes('&GoogleAccessId=');
  const isEncoded = url.includes('%2F'); // from previous migration run with encodeURIComponent

  if (!isSigned && !isEncoded) return null; // already a clean permanent URL

  // Strip query string if present
  const withoutQuery = url.split('?')[0];

  // Extract bucket and raw path
  const afterRoot = withoutQuery.slice(GCS_ROOT.length);
  const slashIdx = afterRoot.indexOf('/');
  if (slashIdx === -1) return null;

  const bucket = afterRoot.slice(0, slashIdx);
  // Decode any %2F encoding so we get plain forward-slash path
  const objectPath = decodeURIComponent(afterRoot.slice(slashIdx + 1));

  return `${GCS_ROOT}${bucket}/${objectPath}`;
}

async function migrate() {
  console.log(`Connecting to ${DB_NAME}...`);
  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  console.log('Connected.\n');

  const db = client.db(DB_NAME);
  const itemsCol = db.collection('menu_items');
  const catsCol = db.collection('menu_categories');

  // ── Menu Items ───────────────────────────────────────────────────────────────
  console.log('=== Menu Items ===');
  const items = await itemsCol
    .find({ imageUrls: { $exists: true, $not: { $size: 0 } } })
    .toArray();

  console.log(`Found ${items.length} items with imageUrls`);
  let itemsUpdated = 0;
  let itemsSkipped = 0;

  for (const item of items) {
    const oldUrls: string[] = item.imageUrls ?? [];
    const newUrls: string[] = [];
    let changed = false;

    for (const url of oldUrls) {
      const converted = toPublicUrl(url);
      if (converted) {
        newUrls.push(converted);
        changed = true;
      } else {
        // Already migrated or different bucket — keep as-is
        newUrls.push(url);
      }
    }

    if (changed) {
      await itemsCol.updateOne(
        { _id: item._id },
        { $set: { imageUrls: newUrls } },
      );
      console.log(`  ✅ ${item._id}  ${oldUrls.length} URL(s) converted`);
      itemsUpdated++;
    } else {
      itemsSkipped++;
    }
  }

  console.log(`Items: ${itemsUpdated} updated, ${itemsSkipped} already up-to-date\n`);

  // ── Menu Categories ──────────────────────────────────────────────────────────
  console.log('=== Menu Categories ===');
  const cats = await catsCol
    .find({ imageUrl: { $exists: true, $nin: [null, ''] } })
    .toArray();

  console.log(`Found ${cats.length} categories with imageUrl`);
  let catsUpdated = 0;
  let catsSkipped = 0;

  for (const cat of cats) {
    const oldUrl: string = cat.imageUrl ?? '';
    const converted = toPublicUrl(oldUrl);

    if (converted) {
      await catsCol.updateOne(
        { _id: cat._id },
        { $set: { imageUrl: converted } },
      );
      console.log(`  ✅ ${cat._id}  URL converted`);
      catsUpdated++;
    } else {
      catsSkipped++;
    }
  }

  console.log(`Categories: ${catsUpdated} updated, ${catsSkipped} already up-to-date\n`);

  await client.close();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
