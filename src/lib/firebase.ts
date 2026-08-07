import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const db: any = {};
export const auth = { currentUser: null };
export const adminAuth = auth;

export function initializeApp() { return {}; }
export function getFirestore() { return db; }
export function getAuth() { return auth; }
export function enableMultiTabIndexedDbPersistence() { return Promise.resolve(); }
export function setLogLevel() { /* no-op */ }

export function collection(dbInstance: any, path: string) { return { _path: path }; }
export function doc(...args: any[]) {
  if (args.length === 1) return { _path: args[0]._path, id: generateId() };
  const [dbInstance, pathOrColl, id] = args;
  if (typeof pathOrColl === 'string') {
     const parts = pathOrColl.split('/');
     return { _path: parts[0], id: parts[1] || id || generateId() };
  }
  return { _path: pathOrColl._path, id: id || generateId() };
}

export function query(coll: any, ...constraints: any[]) {
  return { ...coll, constraints: [...(coll.constraints||[]), ...constraints] };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function limit(n: number) {
  return { type: 'limit', value: n };
}

async function applyQuery(req: any, qObj: any) {
   if (qObj.constraints) {
      for (const c of qObj.constraints) {
         if (c.type === 'where') {
            if (c.op === '==') req = req.eq(c.field, c.value);
            if (c.op === '<') req = req.lt(c.field, c.value);
            if (c.op === '<=') req = req.lte(c.field, c.value);
            if (c.op === '>') req = req.gt(c.field, c.value);
            if (c.op === '>=') req = req.gte(c.field, c.value);
            if (c.op === 'array-contains') req = req.contains(c.field, [c.value]);
            if (c.op === 'in') req = req.in(c.field, c.value);
         }
         else if (c.type === 'orderBy') req = req.order(c.field, { ascending: c.direction === 'asc' });
         else if (c.type === 'limit') req = req.limit(c.value);
      }
   }
   return req;
}

function restoreData(data: any, path: string) {
  if (!data) return data;
  if (path === 'assessments' && data.questions && data.questions.__extras) {
    const extras = data.questions.__extras;
    for (const key of Object.keys(extras)) {
      data[key] = extras[key];
    }
  }
  if (path === 'users' && data.sidebarSettings) {
    if (data.sidebarSettings.storePoints !== undefined) {
      data.storePoints = data.sidebarSettings.storePoints;
    }
    if (data.sidebarSettings.round1Points !== undefined) {
      data.round1Points = data.sidebarSettings.round1Points;
    }
  }
  return data;
}

function getTableName(path: string): string {
  if (path === 'pointLogs') return 'point_logs';
  if (path === 'gameRooms') return 'game_rooms';
  if (path === 'gameScores') return 'game_scores';
  if (path === 'dailyChallenges') return 'daily_challenges';
  return path;
}

export async function getDocs(q: any) {
  const path = getTableName(q._path);
  let req = supabase.from(path).select('*');
  req = await applyQuery(req, q);
  const { data, error } = await req;
  if(error) throw error;
  return {
    empty: !data || data.length === 0,
    size: data ? data.length : 0,
    docs: (data||[]).map(d => {
      const restored = restoreData(d, q._path);
      return { id: d.id, exists: () => true, data: () => restored };
    }),
    forEach: (cb: any) => (data||[]).forEach(d => {
      const restored = restoreData(d, q._path);
      cb({ id: d.id, exists: () => true, data: () => restored });
    })
  };
}

export async function getDoc(ref: any) {
  const path = getTableName(ref._path);
  const { data, error } = await supabase.from(path).select('*').eq('id', ref.id).single();
  if(error || !data) return { exists: () => false, data: () => undefined, id: ref.id };
  const restored = restoreData(data, ref._path);
  return { exists: () => true, data: () => restored, id: data.id };
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function cleanData(data: any, path: string) {
  const clone = { ...data };
  delete clone.uid; // Delete uid as it's not a column, Supabase expects 'id'
  
  if (path === 'assessments') {
    const allowedKeys = [
      'id', 'updatedAt', 'status', 'fullscreenMode', 'expiresAt', 'antiCopyMode',
      'readingDuration', 'version', 'language', 'questions', 'title', 'allowReturnToText',
      'answerDuration', 'createdAt', 'hideTextDuringQuestions', 'text', 'targetGroup', 'assessmentType'
    ];
    
    const extras: any = {};
    for (const key of Object.keys(clone)) {
      if (!allowedKeys.includes(key)) {
        extras[key] = clone[key];
        delete clone[key];
      }
    }
    
    if (Object.keys(extras).length > 0) {
      if (!clone.questions) clone.questions = {};
      clone.questions.__extras = { ...(clone.questions.__extras || {}), ...extras };
    }
    return clone;
  }
  
  if (path === 'users') {
    if (clone.storePoints !== undefined || clone.round1Points !== undefined) {
      if (!clone.sidebarSettings) clone.sidebarSettings = {};
      if (clone.storePoints !== undefined) {
        clone.sidebarSettings.storePoints = clone.storePoints;
        delete clone.storePoints;
      }
      if (clone.round1Points !== undefined) {
        clone.sidebarSettings.round1Points = clone.round1Points;
        delete clone.round1Points;
      }
    }
  }

  if (path === 'submissions') {
    const allowedKeys = [
      'id', 'submittedManually', 'assessmentTitle', 'maxScore', 'bonusPoints', 'finalScore', 
      'participantId', 'baseScore', 'date', 'participantPhoneOrId', 'participantName', 
      'readingTimeSeconds', 'isReviewed', 'answers', 'assessmentId', 'unansweredCount', 
      'assessmentVersion', 'answeringTimeSeconds', 'status', 'streakCount', 'isManuallyAdjusted', 
      'adjustmentAudit'
    ];
    for (const key of Object.keys(clone)) {
      if (!allowedKeys.includes(key)) {
        delete clone[key];
      }
    }
    
    // Safely default numeric values to prevent PostgreSQL "NaN" or invalid numeric syntax errors
    const numericKeys = [
      'maxScore', 'bonusPoints', 'finalScore', 'baseScore', 
      'readingTimeSeconds', 'unansweredCount', 'assessmentVersion', 
      'answeringTimeSeconds', 'streakCount'
    ];
    for (const key of numericKeys) {
      const val = clone[key];
      if (val === undefined || val === null || (typeof val === 'number' && isNaN(val))) {
        clone[key] = 0;
      }
    }
    return clone;
  }
  if (path === 'storeItems') {
    delete clone.status;
  }
  
  // Strip any properties with value of undefined to prevent Supabase bad request / serialization failures
  for (const key of Object.keys(clone)) {
    if (clone[key] === undefined) {
      delete clone[key];
    }
  }
  
  return clone;
}

export async function addDoc(coll: any, data: any) {
  const dt = typeof data === 'function' ? data() : data;
  const id = dt.id || generateId();
  const cleanDt = cleanData(dt, coll._path);
  if (cleanDt.id) delete cleanDt.id;
  const path = getTableName(coll._path);
  const { error } = await supabase.from(path).insert({ id, ...cleanDt });
  if (error) {
    if (error.code === "23505") {
      console.info(`[Firestore Mock] Document with id ${id} already exists in ${path}. Skipping write.`);
      return { id, skipped: true };
    }
    throw error;
  }
  return { id };
}

export async function setDoc(ref: any, data: any, opts?: any) {
  const dt = typeof data === 'function' ? data() : data;
  const cleanDt = cleanData(dt, ref._path);
  const finalDt = { id: ref.id, ...cleanDt };
  const path = getTableName(ref._path);
  const { error } = await supabase.from(path).upsert(finalDt);
  if (error) throw error;
}

export async function updateDoc(ref: any, data: any) {
  const parsedData = { ...data };
  const path = getTableName(ref._path);
  for(const k of Object.keys(parsedData)) {
    if (parsedData[k] && parsedData[k]._isMockIncrement) {
      const { data: current, error } = await supabase.from(path).select(k).eq('id', ref.id).single();
      if(!error && current) {
         parsedData[k] = (current[k] || 0) + parsedData[k].amount;
      } else {
         parsedData[k] = parsedData[k].amount;
      }
    }
  }
  const cleanedData = cleanData(parsedData, ref._path);
  const { error: err2 } = await supabase.from(path).update(cleanedData).eq('id', ref.id);
  if (err2) throw err2;
}

export async function deleteDoc(ref: any) {
  const path = getTableName(ref._path);
  const { error } = await supabase.from(path).delete().eq('id', ref.id);
  // Do not throw on delete if missing
}

export function onSnapshot(q: any, cb: (snap: any) => void) {
  let isCancelled = false;
  
  const fetchState = () => {
    if (isCancelled) return;
    if (q.id) {
      getDoc(q).then(s => { if (!isCancelled) cb(s); }).catch(console.error);
    } else {
      getDocs(q).then(s => { if (!isCancelled) cb(s); }).catch(console.error);
    }
  };

  fetchState();
  const fallbackInterval = setInterval(fetchState, 2500); // Poll every 2.5 seconds for instant real-time feel
  
  const path = getTableName(q._path);
  const channelName = 'public:' + path + ':' + Math.random().toString(36).substring(2, 10);
  const channel = supabase.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: path }, payload => {
       fetchState();
    })
    .subscribe();
    
  return () => { 
    isCancelled = true;
    clearInterval(fallbackInterval);
    supabase.removeChannel(channel); 
  };
}

export const serverTimestamp = () => new Date().toISOString();
export const increment = (n: number) => ({ _isMockIncrement: true, amount: n });

export async function runTransaction(dbInstance: any, updateFunction: (tr: any) => Promise<any>) {
  const tr = {
     get: async (ref: any) => getDoc(ref),
     update: (ref: any, data: any) => updateDoc(ref, data),
     set: (ref: any, data: any) => setDoc(ref, data)
  };
  return await updateFunction(tr);
}

export function writeBatch(dbInstance: any) {
  const ops: any[] = [];
  return {
    set: (ref: any, data: any) => { ops.push(() => setDoc(ref, data)); },
    update: (ref: any, data: any) => { ops.push(() => updateDoc(ref, data)); },
    delete: (ref: any) => { ops.push(() => deleteDoc(ref)); },
    commit: async () => {
      for (const op of ops) await op();
    }
  };
}

export function createUserWithEmailAndPassword() {
  throw new Error("Mock auth not implemented - check useAuth bypass");
}
export function onAuthStateChanged(authInstance: any, cb: any) {
  cb(null);
  return () => {};
}
export function signInWithEmailAndPassword() {
  return Promise.resolve({ user: { uid: '' } });
}
export function signOut() {
  return Promise.resolve();
}
export function updatePassword() {
  return Promise.resolve();
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error("Supabase Error:", error);
}
