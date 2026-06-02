import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read config
const configPath = path.resolve('firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  console.log("Connecting to database...");
  
  // Get active assessments
  const assessmentsSnap = await getDocs(collection(db, "assessments"));
  console.log(`\n--- Active Assessments (Total: ${assessmentsSnap.size}) ---`);
  assessmentsSnap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Title: ${data.title} | Status: ${data.status} | Expires: ${data.expiresAt}`);
  });

  // Get some users
  const usersSnap = await getDocs(query(collection(db, "users"), limit(20)));
  console.log(`\n--- Users Sample (Total: ${usersSnap.size}) ---`);
  usersSnap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id} | Name: ${data.fullName} | Code: ${data.code} | Role: ${data.role} | Password: ${data.password}`);
  });
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
