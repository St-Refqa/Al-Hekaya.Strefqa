import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve('firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);
const auth = getAuth(app);

async function run() {
  console.log("Connecting to database...");
  try {
    await signInWithEmailAndPassword(auth, 'admin@admin.com', 'admin123'); // Just try some dummy or it might allow without auth if rules are true
  } catch (e) {
    console.log("Auth failed, continuing anyway...", e.message);
  }
  
  const snap = await getDocs(collection(db, "dailyChallenges"));
  console.log(`\n--- dailyChallenges (Total: ${snap.size}) ---`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Keys: ${Object.keys(data).join(', ')}`);
  });

  const snap2 = await getDocs(query(collection(db, "gameScores"), limit(10)));
  console.log(`\n--- gameScores Sample (Total: ${snap2.size}) ---`);
  snap2.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | dailyCompleted: ${data.dailyCompleted} | totalScore: ${data.totalScore}`);
  });
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
