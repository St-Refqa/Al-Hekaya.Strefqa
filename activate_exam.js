import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Read config
const configPath = path.resolve('firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const ASSESSMENT_ID = 'ynf3AQISA9kDSgONdgly'; // تكوين 22
const STUDENT_UID = 'YmxJTx820UKdAekteUVx'; // Kirolos Samy
const STUDENT_CODE = 'S001';

async function run() {
  console.log("Connecting to database...");
  
  // 1. Update the assessment to be active and not expired
  const assessmentRef = doc(db, "assessments", ASSESSMENT_ID);
  const now = new Date();
  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in future
  
  await updateDoc(assessmentRef, {
    status: 'active',
    availableFrom: now.toISOString(),
    expiresAt: future.toISOString()
  });
  console.log(`Assessment ${ASSESSMENT_ID} updated to active with availableFrom: ${now.toISOString()} and expiresAt: ${future.toISOString()}`);

  // 2. Remove existing submissions for this student on this assessment to avoid "already completed" duplicate error
  const submissionsRef = collection(db, "submissions");
  
  // Try querying by participantId === STUDENT_UID
  const q1 = query(submissionsRef, where("assessmentId", "==", ASSESSMENT_ID), where("participantId", "==", STUDENT_UID));
  const snap1 = await getDocs(q1);
  for (const docSnapshot of snap1.docs) {
    console.log(`Deleting submission ${docSnapshot.id} matching participantId: ${STUDENT_UID}`);
    await deleteDoc(doc(db, "submissions", docSnapshot.id));
  }
  
  // Try querying by participantPhoneOrId === STUDENT_CODE
  const q2 = query(submissionsRef, where("assessmentId", "==", ASSESSMENT_ID), where("participantPhoneOrId", "==", STUDENT_CODE));
  const snap2 = await getDocs(q2);
  for (const docSnapshot of snap2.docs) {
    console.log(`Deleting submission ${docSnapshot.id} matching participantPhoneOrId: ${STUDENT_CODE}`);
    await deleteDoc(doc(db, "submissions", docSnapshot.id));
  }
  
  console.log("Done preparing the test environment!");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
