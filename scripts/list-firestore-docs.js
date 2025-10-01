import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const FIRESTORE_COLLECTION = process.env.FIRESTORE_COLLECTION || 'transcribed_podcasts';

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

async function listDocuments() {
  console.log(`Fetching documents from collection: ${FIRESTORE_COLLECTION}`);

  const snapshot = await db.collection(FIRESTORE_COLLECTION).get();

  if (snapshot.empty) {
    console.log('No documents found in collection');
    return;
  }

  console.log(`\nFound ${snapshot.size} documents:\n`);

  snapshot.docs.forEach((doc, index) => {
    const data = doc.data();
    const segmentField = data.transcription ? 'transcription' :
                        data.segments ? 'segments' :
                        data.transcript ? 'transcript' :
                        'unknown';
    const segmentCount = Array.isArray(data[segmentField]) ? data[segmentField].length : 0;

    console.log(`${index + 1}. ID: ${doc.id}`);
    console.log(`   Segment field: ${segmentField} (${segmentCount} segments)`);
    console.log(`   Has episode_id: ${data.episode_id ? 'Yes' : 'No'}`);

    // Show first few fields
    const fields = Object.keys(data).slice(0, 5);
    console.log(`   Fields: ${fields.join(', ')}${Object.keys(data).length > 5 ? '...' : ''}`);
    console.log('');
  });
}

listDocuments().catch(console.error);