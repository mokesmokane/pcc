import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

function getEnv(name, optional = false) {
  const value = process.env[name];
  if (!value && !optional) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const FIREBASE_PROJECT_ID = getEnv('FIREBASE_PROJECT_ID');
const FIREBASE_CLIENT_EMAIL = getEnv('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PRIVATE_KEY = getEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n');
const FIRESTORE_COLLECTION = getEnv('FIRESTORE_COLLECTION', true) || 'transcriptions';
const FIRESTORE_DOC_ID = getEnv('FIRESTORE_DOC_ID', true);
const EPISODE_ID = getEnv('EPISODE_ID');
const SUPABASE_URL = getEnv('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

const REPLACE_EXISTING = (process.env.REPLACE_EXISTING || 'false').toLowerCase() === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10);
const MIGRATE_ALL = (process.env.MIGRATE_ALL || 'false').toLowerCase() === 'true';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}
const db = admin.firestore();

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Helper functions
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function transformSegment(segment, episodeId) {
  const start = Number(segment.start ?? segment.start_seconds ?? 0);
  const end = Number(segment.end ?? segment.end_seconds ?? 0);
  const text = (segment.text || '').toString().trim();

  if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
    return null;
  }

  return {
    episode_id: episodeId,
    start_seconds: start,
    end_seconds: end,
    text,
  };
}

async function migrateDocument(docPath, episodeId) {
  console.log(`\nMigrating document: ${docPath}`);
  console.log(`Target episode ID: ${episodeId}`);

  // For nested structure: transcribed_podcasts/{id}/transcriptions/transcription
  // We need to navigate to the subcollection
  let snapshot;
  let data;

  if (docPath.includes('/transcriptions/')) {
    // Direct path to subcollection document
    const docRef = db.doc(docPath);
    snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error(`Document not found: ${docPath}`);
    }
    data = snapshot.data();
  } else {
    // Try to find transcription in subcollection
    const baseDocRef = db.doc(docPath);
    const transcriptionDocRef = baseDocRef.collection('transcriptions').doc('transcription');
    snapshot = await transcriptionDocRef.get();

    if (!snapshot.exists) {
      // Fallback to checking the main document
      const mainSnapshot = await baseDocRef.get();
      if (!mainSnapshot.exists) {
        throw new Error(`Document not found: ${docPath}`);
      }
      data = mainSnapshot.data();
    } else {
      data = snapshot.data();
      console.log(`Found transcription in subcollection: ${docPath}/transcriptions/transcription`);
    }
  }

  // Look for segments in common field names
  const segments = data.transcription || data.segments || data.transcript || [];

  if (!Array.isArray(segments) || segments.length === 0) {
    console.warn(`No segments found in document ${docPath}`);
    return { migrated: 0, skipped: 0 };
  }

  console.log(`Found ${segments.length} segments to migrate`);

  // Transform segments
  const rows = segments
    .map(seg => transformSegment(seg, episodeId))
    .filter(Boolean);

  if (rows.length === 0) {
    console.warn('All segments were malformed or empty');
    return { migrated: 0, skipped: segments.length };
  }

  console.log(`Prepared ${rows.length} valid segment rows`);

  // Optionally delete existing segments for this episode
  if (REPLACE_EXISTING) {
    console.log(`Deleting existing segments for episode ${episodeId}...`);
    const { error: deleteError } = await supabase
      .from('transcript_segments')
      .delete()
      .eq('episode_id', episodeId);

    if (deleteError) {
      throw new Error(`Failed to delete existing segments: ${deleteError.message}`);
    }
  }

  // Insert in batches
  const batches = chunk(rows, BATCH_SIZE);
  let inserted = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { error } = await supabase
      .from('transcript_segments')
      .insert(batch);

    if (error) {
      throw new Error(`Insert failed on batch ${i + 1}/${batches.length}: ${error.message}`);
    }

    inserted += batch.length;
    console.log(`Progress: ${inserted}/${rows.length} segments inserted`);
  }

  console.log(`✓ Successfully migrated ${inserted} segments for episode ${episodeId}`);
  return { migrated: inserted, skipped: segments.length - rows.length };
}

async function migrateAllDocuments() {
  console.log(`Fetching all documents from collection: ${FIRESTORE_COLLECTION}`);

  const snapshot = await db.collection(FIRESTORE_COLLECTION).get();

  if (snapshot.empty) {
    console.log('No documents found in collection');
    return;
  }

  console.log(`Found ${snapshot.size} documents to migrate`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const doc of snapshot.docs) {
    try {
      // Generate or use provided episode ID
      const episodeId = doc.data().episode_id || doc.id;
      const docPath = `${FIRESTORE_COLLECTION}/${doc.id}`;

      const result = await migrateDocument(docPath, episodeId);
      totalMigrated += result.migrated;
      totalSkipped += result.skipped;
      successCount++;
    } catch (error) {
      console.error(`Error migrating document ${doc.id}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== Migration Summary ===');
  console.log(`Documents processed: ${successCount + errorCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
  console.log(`Total segments migrated: ${totalMigrated}`);
  console.log(`Total segments skipped: ${totalSkipped}`);
}

async function main() {
  try {
    console.log('Starting Firestore to Supabase migration...');
    console.log(`Batch size: ${BATCH_SIZE}`);
    console.log(`Replace existing: ${REPLACE_EXISTING}`);

    if (MIGRATE_ALL) {
      await migrateAllDocuments();
    } else {
      if (!FIRESTORE_DOC_ID) {
        throw new Error('FIRESTORE_DOC_ID is required when MIGRATE_ALL is false');
      }

      const docPath = `${FIRESTORE_COLLECTION}/${FIRESTORE_DOC_ID}`;
      const result = await migrateDocument(docPath, EPISODE_ID);

      console.log('\n=== Migration Complete ===');
      console.log(`Segments migrated: ${result.migrated}`);
      console.log(`Segments skipped: ${result.skipped}`);
    }

    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

main();