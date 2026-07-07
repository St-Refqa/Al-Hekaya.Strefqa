import { createClient } from '@supabase/supabase-js';

const supabaseUrl = ({} as any).VITE_SUPABASE_URL || 'https://zzcwjfnibyvwdhfydvyw.supabase.co';
const supabaseKey = ({} as any).VITE_SUPABASE_ANON_KEY || 'sb_publishable_kbwm0AIzVeSLAAwSUGw3oQ_Pp6AZHKX';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const db = {};
export const auth = { currentUser: null };
export const adminAuth = auth;

export function initializeApp() { return {}; }
export function getFirestore() { return db; }
export function getAuth() { return auth; }
export function enableMultiTabIndexedDbPersistence() { return Promise.resolve(); }
export function setLogLevel() { /* no-op */ }

export function collection(dbInstance: any, path: string) { return { _path: path }; }
export function doc(dbInstance: any, pathOrColl: any, id?: string) {
  if (typeof pathOrColl === 'string') {
     const parts = pathOrColl.split('/');
     return { _path: parts[0], id: parts[1] || id };
  }
  return { _path: pathOrColl._path, id };
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

export async function getDocs(q: any) {
  let req = supabase.from(q._path).select('*');
  req = await applyQuery(req, q);
  const { data, error } = await req;
  if(error) throw error;
  return {
    empty: !data || data.length === 0,
    size: data ? data.length : 0,
    docs: (data||[]).map(d => ({ id: d.id, exists: () => true, data: () => d })),
    forEach: (cb: any) => (data||[]).forEach(d => cb({ id: d.id, exists: () => true, data: () => d }))
  };
}

export async function getDoc(ref: any) {
  const { data, error } = await supabase.from(ref._path).select('*').eq('id', ref.id).single();
  if(error || !data) return { exists: () => false, data: () => undefined, id: ref.id };
  return { exists: () => true, data: () => data, id: data.id };
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function addDoc(coll: any, data: any) {
  const dt = typeof data === 'function' ? data() : data;
  const id = dt.id || generateId();
  const { error } = await supabase.from(coll._path).insert({ id, ...dt });
  if (error) throw error;
  return { id };
}

export async function setDoc(ref: any, data: any, opts?: any) {
  const dt = typeof data === 'function' ? data() : data;
  const finalDt = { id: ref.id, ...dt };
  const { error } = await supabase.from(ref._path).upsert(finalDt);
  if (error) throw error;
}

export async function updateDoc(ref: any, data: any) {
  const parsedData = { ...data };
  for(const k of Object.keys(parsedData)) {
    if (parsedData[k] && parsedData[k]._isMockIncrement) {
      const { data: current, error } = await supabase.from(ref._path).select(k).eq('id', ref.id).single();
      if(!error && current) {
         parsedData[k] = (current[k] || 0) + parsedData[k].amount;
      } else {
         parsedData[k] = parsedData[k].amount;
      }
    }
  }
  const { error: err2 } = await supabase.from(ref._path).update(parsedData).eq('id', ref.id);
  if (err2) throw err2;
}

export async function deleteDoc(ref: any) {
  const { error } = await supabase.from(ref._path).delete().eq('id', ref.id);
  // Do not throw on delete if missing
}

export function onSnapshot(q: any, cb: (snap: any) => void) {
  // initial fetch
  if (q.id) {
    getDoc(q).then(cb).catch(console.error);
  } else {
    getDocs(q).then(cb).catch(console.error);
  }
  
  // setup channel wrapper
  const channelName = 'public:' + q._path + ':' + Math.random().toString(36).substring(2, 10);
  const channel = supabase.channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: q._path }, payload => {
       // Only trigger for this doc if it's a doc query
       if (q.id) {
         if (payload.new && (payload.new as any).id === q.id) {
           getDoc(q).then(cb).catch(console.error);
         } else if (payload.eventType === 'DELETE' && payload.old && (payload.old as any).id === q.id) {
           cb({ exists: () => false, data: () => undefined, id: q.id });
         }
       } else {
         getDocs(q).then(cb).catch(console.error);
       }
    })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
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
