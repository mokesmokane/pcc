import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

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

async function listCollections() {
  console.log('Listing all Firestore collections:\n');

  const collections = await db.listCollections();

  if (collections.length === 0) {
    console.log('No collections found');
    return;
  }

  for (const collection of collections) {
    const snapshot = await collection.limit(5).get();
    console.log(`Collection: ${collection.id} (${snapshot.size} docs shown, more may exist)`);

    if (!snapshot.empty) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const hasTranscription = !!(data.transcription || data.segments || data.transcript);
        console.log(`  - Doc ID: ${doc.id.substring(0, 20)}... | Has transcription: ${hasTranscription}`);
      }
    }
    console.log('');
  }
}

listCollections().catch(console.error);