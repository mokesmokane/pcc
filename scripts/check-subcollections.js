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

async function checkPath() {
  // Try the exact path from your screenshot
  const docId = '0988617f7916bb1dee074bbcd8413c9004f43c557312d456293ab7926b297912';

  // Check if document exists at root level
  console.log(`Checking for document at: transcribed_podcasts/${docId}\n`);
  const doc1 = await db.collection('transcribed_podcasts').doc(docId).get();

  if (doc1.exists) {
    console.log('Document found at root level');
    const data = doc1.data();
    console.log('Fields:', Object.keys(data));

    // Check for subcollections
    const subcollections = await doc1.ref.listCollections();
    if (subcollections.length > 0) {
      console.log('\nSubcollections found:');
      for (const sub of subcollections) {
        console.log(`  - ${sub.id}`);

        // If transcriptions subcollection exists, check its documents
        if (sub.id === 'transcriptions' || sub.id === 'transcription') {
          const subDocs = await sub.limit(5).get();
          console.log(`    Documents in ${sub.id}:`);
          for (const subDoc of subDocs.docs) {
            const subData = subDoc.data();
            const hasTranscription = !!(subData.transcription || subData.segments || subData.transcript);
            console.log(`      - ${subDoc.id}: Has transcription: ${hasTranscription}`);

            // Show sample of transcription field
            if (hasTranscription) {
              const field = subData.transcription || subData.segments || subData.transcript;
              if (Array.isArray(field) && field.length > 0) {
                console.log(`        Sample segment:`, field[0]);
              }
            }
          }
        }
      }
    }
  } else {
    console.log('Document not found at expected path');

    // Try to find any document with transcription data
    console.log('\nSearching for any document with transcription data...');

    // Check links collection (seems to have data)
    const linksSnapshot = await db.collection('links').limit(10).get();
    for (const doc of linksSnapshot.docs) {
      const data = doc.data();
      if (data.transcription || data.segments || data.transcript) {
        console.log(`\nFound transcription data in links/${doc.id}`);
        const field = data.transcription || data.segments || data.transcript;
        if (Array.isArray(field)) {
          console.log(`  Contains ${field.length} segments`);
          console.log(`  Sample segment:`, field[0]);
        }
      }
    }
  }
}

checkPath().catch(console.error);