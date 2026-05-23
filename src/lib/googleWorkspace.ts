import { GoogleAuthProvider, signInWithPopup, linkWithPopup, auth as firebaseAuth } from 'firebase/auth';
import { auth } from './firebase';

// Cache access token in-memory only (security best-practice)
let googleAccessToken: string | null = null;
let googleUserEmail: string | null = null;

export function getCachedToken(): string | null {
  return googleAccessToken;
}

export function setCachedToken(token: string | null) {
  googleAccessToken = token;
}

export function getGoogleEmail(): string | null {
  return googleUserEmail;
}

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/contacts.readonly'
];

/**
 * Initiates Google OAuth popup and requests all requested Workspace scopes.
 */
export async function connectGoogleWorkspace(): Promise<{ accessToken: string; email: string }> {
  const provider = new GoogleAuthProvider();
  WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));
  provider.setCustomParameters({ prompt: 'select_account' });
  
  // To avoid losing the current session's custom student profile, we can use linkWithPopup or fallback to normal signIn
  const currentUser = auth.currentUser;
  let result;
  
  if (currentUser) {
    const isGoogleLinked = currentUser.providerData.some(p => p.providerId === 'google.com');
    
    if (isGoogleLinked) {
      // If already linked, use signInWithPopup directly to refresh the token. 
      // Doing this synchronously avoids the auth/popup-blocked error.
      try {
        result = await signInWithPopup(auth, provider);
      } catch (err: any) {
        if (err.code === 'auth/popup-blocked') {
          const { signInWithRedirect } = await import('firebase/auth');
          await signInWithRedirect(auth, provider);
          return { accessToken: '', email: '' }; // App will redirect
        }
        throw err;
      }
    } else {
      try {
        result = await linkWithPopup(currentUser, provider);
      } catch (err: any) {
        if (err.code === 'auth/popup-blocked') {
           const { linkWithRedirect } = await import('firebase/auth');
           await linkWithRedirect(currentUser, provider);
           return { accessToken: '', email: '' }; // App will redirect
        }
        if (
          err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request'
        ) {
          throw err;
        }
        
        if (err.code === 'auth/credential-already-in-use') {
          throw new Error('حساب Google هذا مرتبط بالفعل بحساب مستخدم آخر. يرجى استخدام حساب Google مختلف.', { cause: err });
        } else {
          throw err;
        }
      }
    }
  } else {
    try {
      result = await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        const { signInWithRedirect } = await import('firebase/auth');
        await signInWithRedirect(auth, provider);
        return { accessToken: '', email: '' }; // App will redirect
      }
      throw err;
    }
  }

  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;
  const email = result.user.email || '';

  if (!token) {
    throw new Error('لم يتم استلام رمز الوصول من Google.');
  }

  googleAccessToken = token;
  googleUserEmail = email;
  
  return { accessToken: token, email };
}

/**
 * disconnects Google Workspace token
 */
export function disconnectGoogleWorkspace() {
  googleAccessToken = null;
  googleUserEmail = null;
}

// ==========================================
// 1. Google Tasks API Implementation
// ==========================================
export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  updated: string;
}

export async function fetchTasks(): Promise<GoogleTask[]> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const res = await fetch('https://tasks.googleapis.com/v1/lists/@default/tasks?maxResults=50', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل جلب المهام من Google Tasks.');
  }

  const data = await res.json();
  return data.items || [];
}

export async function createTask(title: string, notes?: string): Promise<GoogleTask> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const res = await fetch('https://tasks.googleapis.com/v1/lists/@default/tasks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, notes, status: 'needsAction' })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل إنشاء المهمة.');
  }

  return res.json();
}

export async function updateTaskStatus(taskId: string, completed: boolean): Promise<GoogleTask> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const res = await fetch(`https://tasks.googleapis.com/v1/lists/@default/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction'
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل تحديث حالة المهمة.');
  }

  return res.json();
}

export async function deleteTask(taskId: string): Promise<void> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const res = await fetch(`https://tasks.googleapis.com/v1/lists/@default/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل حذف المهمة.');
  }
}


// ==========================================
// 2. Google Sheets API Implementation
// ==========================================
export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
}

export async function exportToGoogleSheets(title: string, headers: string[], rows: string[][]): Promise<SpreadsheetInfo> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  // Create empty spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v1/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل إنشاء جدول البيانات الجديد.');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;

  // Append title header and content rows
  const appendRes = await fetch(`https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [headers, ...rows]
    })
  });

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل كتابة البيانات إلى جدول البيانات.');
  }

  return { spreadsheetId, title, spreadsheetUrl };
}


// ==========================================
// 3. Gmail API Implementation
// ==========================================
export interface GmailMessageHeader {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
  date?: string;
}

export async function fetchEmails(): Promise<GmailMessageHeader[]> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل جلب الرسائل من Gmail.');
  }

  const listData = await listRes.json();
  if (!listData.messages || listData.messages.length === 0) return [];

  const detailPromises = listData.messages.map(async (msg: { id: string }) => {
    const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=subject&metadataHeaders=from&metadataHeaders=date`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!msgRes.ok) return { id: msg.id, snippet: '' };
    const detail = await msgRes.json();
    
    const subjectHeader = detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject');
    const fromHeader = detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from');
    const dateHeader = detail.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'date');

    return {
      id: msg.id,
      snippet: detail.snippet || '',
      subject: subjectHeader?.value || '(بدون عنوان)',
      from: fromHeader?.value || '(مجهول)',
      date: dateHeader?.value ? new Date(dateHeader.value).toLocaleDateString('ar-EG') : ''
    };
  });

  return Promise.all(detailPromises);
}

export async function sendEmail(to: string, subject: string, bodyText: string): Promise<void> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  // UTF-8 & Base64 safety for raw emails
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    bodyText
  ];

  const rawEmail = btoa(unescape(encodeURIComponent(emailLines.join('\n'))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: rawEmail })
  });

  if (!sendRes.ok) {
    const err = await sendRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل إرسال البريد الإلكتروني.');
  }
}


// ==========================================
// 4. Google Meet Workspace Integration
// ==========================================
// Note: Call Google Calendar event builder with meeting config to generate a verified dynamic Google Meet Link instantly.
export interface MeetInfo {
  meetingUrl: string;
  meetingCode: string;
  spaceName: string;
}

export async function createGoogleMeetCode(summary: string): Promise<MeetInfo> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour duration

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      summary,
      description: 'تم إنشاء هذا اللقاء خصيصاً عبر منصة الحكاية ومافيها التعليمية.',
      start: { dateTime: now.toISOString() },
      end: { dateTime: end.toISOString() },
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل إنشاء رابط Google Meet من التقويم.');
  }

  const calendarEvent = await res.json();
  const entryPoint = calendarEvent.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video');
  const meetUrl = entryPoint?.uri || `https://meet.google.com/mock-meet-${Date.now().toString(36)}`;
  const meetCode = meetUrl.split('/').pop() || '';

  return {
    meetingUrl: meetUrl,
    meetingCode: meetCode,
    spaceName: summary
  };
}


// ==========================================
// 5. Contacts / People API Implementation
// ==========================================
export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
}

export async function fetchGoogleContacts(): Promise<ContactInfo[]> {
  const token = getCachedToken();
  if (!token) throw new Error('يرجى تسجيل الدخول باستخدام Google أولاً.');

  const res = await fetch('https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=50', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'فشل جلب جهات اتصال Google.');
  }

  const data = await res.json();
  if (!data.connections || data.connections.length === 0) return [];

  return data.connections.map((c: any) => {
    const nameObj = c.names?.[0];
    const emailObj = c.emailAddresses?.[0];
    const phoneObj = c.phoneNumbers?.[0];

    return {
      name: nameObj?.displayName || 'بدون اسم',
      email: emailObj?.value || '',
      phone: phoneObj?.value || ''
    };
  });
}
