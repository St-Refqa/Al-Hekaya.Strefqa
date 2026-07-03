import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Fetching submissions...");
  const snap = await getDocs(collection(db, 'submissions'));
  const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const testName = 'متي'; // or specific name
  const matchingSubs = subs.filter(s => s.assessmentTitle && (s.assessmentTitle.includes('متي 6') || s.assessmentTitle.includes('متى 6')));
  
  console.log(`Found ${matchingSubs.length} submissions for Matthew 6 & 7`);

  const grouped = {};
  matchingSubs.forEach(s => {
    const key = s.participantId + '_' + s.assessmentId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  
  const duplicates = Object.values(grouped).filter(arr => arr.length > 1);
  console.log('Duplicates found for test:', duplicates.length);
  
  let toDelete = [];
  duplicates.forEach(arr => {
    console.log('Participant:', arr[0].participantName, 'Count:', arr.length);
    // Sort so we keep the newest or the one with the highest score
    arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    arr.forEach((s, idx) => {
        console.log('  ', s.id, s.date, s.finalScore, idx === 0 ? '(KEEP)' : '(DELETE)');
        if (idx !== 0) {
            toDelete.push(s);
        }
    });
  });

  console.log(`Will delete ${toDelete.length} duplicates.`);
  
  // Also, we need to subtract the finalScore of the deleted submissions from the user's totalPoints/cumulativePoints!
  // Wait, I will just delete them first and see what happens. If I need to fix users, I will do it.
}

run();
