import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  increment,
  limit
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User, LoginLog } from '../types';
import { normalizeArabicName } from '../lib/utils';

const ADMIN_CREDENTIALS = {
  username: "admin",
  password: "20250612" // Hardcoded to match user request, ignoring potential env var mismatch
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => {
    const savedSession = localStorage.getItem('auth_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Ensure the session is valid
        if (parsed && typeof parsed === 'object' && parsed.role) {
          return parsed;
        }
      } catch (e) {
        localStorage.removeItem('auth_session');
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncUser = async (firebaseUser: FirebaseUser | null) => {
      // If we have a firebase user, we might be using firebase auth (for future expansion)
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            if (userData.status === 'disabled') {
              localStorage.removeItem('auth_session');
              setUser(null);
            } else {
              setUser(userData);
              localStorage.setItem('auth_session', JSON.stringify(userData));
            }
          }
        } catch (error: any) {
          const isOffline = !navigator.onLine || 
                            error?.message?.includes("client is offline") || 
                            error?.code === "unavailable";
          if (isOffline) {
            console.warn("User sync skipped (client is offline).");
          } else {
            console.error("User sync error:", error);
          }
        }
      } else {
        // Custom session persistence
        const savedSession = localStorage.getItem("auth_session");
        if (savedSession) {
          try {
            const userData = JSON.parse(savedSession) as User;
            
            // For admin, we don't need firestore check as it's hardcoded
            if (userData.uid === "admin-fixed-id") {
              setUser(userData);
            } else if (userData.role === "student" && userData.uid) {
              // SECURITY: Verify session against Firestore to check for disabled status or password changes
              try {
                const docSnap = await getDoc(doc(db, "users", userData.uid));
                if (docSnap.exists()) {
                  const latestData = docSnap.data() as User;
                  if (
                    latestData.status === "disabled" ||
                    latestData.password !== userData.password
                  ) {
                    localStorage.removeItem("auth_session");
                    setUser(null);
                  } else {
                    const sessionData = { ...latestData, uid: docSnap.id };
                    localStorage.setItem("auth_session", JSON.stringify(sessionData));
                    setUser(sessionData);
                  }
                } else {
                  localStorage.removeItem("auth_session");
                  setUser(null);
                }
              } catch (err: any) {
                const isOffline = !navigator.onLine || 
                                  err?.message?.includes("client is offline") || 
                                  err?.code === "unavailable";
                if (isOffline) {
                  console.warn("Session verification skipped (client is offline). Using cached session.");
                } else {
                  console.error("Session verification error:", err);
                }
                // Keep current session if firestore is down but we have valid local data
                setUser(userData);
              }
            }
          } catch {
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, syncUser);
    return () => unsubscribe();
  }, []);

  const createLoginLog = async (log: Omit<LoginLog, 'loginTime' | 'loginAt' | 'deviceInfo'>) => {
    try {
      const now = new Date();
      await addDoc(collection(db, "loginLogs"), {
        ...log,
        loginTime: now.toLocaleTimeString('ar-EG'),
        loginAt: now.toISOString(),
        deviceInfo: window.navigator.userAgent
      });
    } catch (err) {
      console.error("Failed to create login log:", err);
    }
  };

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = (identifier || "").trim();
    const cleanPass = (password || "").trim();

    // 1. Admin Logic (Case-insensitive username)
    const isAdminMatch = cleanId.toLowerCase() === ADMIN_CREDENTIALS.username.toLowerCase() && 
                         (cleanPass === ADMIN_CREDENTIALS.password || 
                          (import.meta.env.VITE_ADMIN_PASSWORD && cleanPass === import.meta.env.VITE_ADMIN_PASSWORD));

    if (isAdminMatch) {
      const adminProfile: User = {
        uid: "admin-fixed-id",
        role: 'admin',
        fullName: 'المدير',
        registrationDate: new Date().toISOString(),
        isActive: true,
        status: 'active',
        streak: 0,
        totalExams: 0,
        totalPoints: 0,
        averageScore: 0,
        xp: 0,
        level: 'مدير',
        achievements: [],
        badges: []
      };

      await createLoginLog({
        userId: "admin-fixed-id",
        name: 'المدير',
        code: 'admin',
        role: 'admin',
        status: 'ناجح'
      });

      localStorage.setItem('auth_session', JSON.stringify(adminProfile));
      setUser(adminProfile);
      return { success: true };
    }

    // 2. Student Logic (Custom Firestore search)
    try {
      const usersRef = collection(db, "users");
      const normalizedInput = normalizeArabicName(cleanId);
      
      // Try searching by code OR fullName
      let q = query(usersRef, where("code", "==", cleanId.toUpperCase()), limit(1));
      let snap = await getDocs(q);
      
      if (snap.empty) {
        // Double check lowercase just in case of transition
        q = query(usersRef, where("code", "==", cleanId.toLowerCase()), limit(1));
        snap = await getDocs(q);
      }

      if (snap.empty) {
        // Fallback to name search
        q = query(usersRef, where("normalizedName", "==", normalizedInput), limit(1));
        snap = await getDocs(q);
      }

      if (snap.empty) {
        await createLoginLog({
          code: identifier,
          role: 'unknown',
          status: 'فشل'
        });
        return { success: false, error: "هذا الحساب غير موجود، برجاء الرجوع للمسؤول" };
      }

      const targetDoc = snap.docs[0];
      const userData = { ...targetDoc.data(), uid: targetDoc.id } as User;
      
      if (userData.status === 'disabled') {
        return { success: false, error: "الحساب موقوف، برجاء الرجوع للمسؤول" };
      }

      // Check password matching (Plain text for MVP testing as requested)
      if (userData.password === cleanPass) {
        await updateDoc(doc(db, "users", userData.uid), {
          lastLoginAt: new Date().toISOString(),
          loginCount: increment(1)
        });

        await createLoginLog({
          userId: userData.uid,
          name: userData.fullName,
          code: userData.code || 'unknown',
          role: 'student',
          status: 'ناجح'
        });

        localStorage.setItem('auth_session', JSON.stringify(userData));
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, error: "كلمة المرور غير صحيحة" };
      }
    } catch (err: any) {
      console.error("Global login error:", err);
      const isOffline = !navigator.onLine || 
                        err?.message?.includes("client is offline") || 
                        err?.message?.includes("network-request-failed") ||
                        err?.code === "unavailable";
      if (isOffline) {
        return { success: false, error: "فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى." };
      }
      return { success: false, error: "حدث خطأ غير متوقع" };
    }
  };

  const register = async (
    fullName: string, 
    code: string, 
    password: string, 
    whatsappNumber?: string,
    church?: string,
    birthDate?: string,
    photoUrl?: string,
    address?: string,
    role: 'admin' | 'student' = 'student'
  ): Promise<{ success: boolean; error?: string }> => {
    // Logic for creating a student account
    try {
      const cleanCode = code.trim().toUpperCase();
      const cleanName = fullName.trim();
      const cleanPass = password.trim();
      const cleanWhatsApp = whatsappNumber?.trim() || "";
      const normalizedName = normalizeArabicName(cleanName);

      if (!cleanName || !cleanCode || !cleanPass) {
        return { success: false, error: "من فضلك املأ جميع البيانات" };
      }

      // Check if code exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("code", "==", cleanCode), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) return { success: false, error: "هذا الكود مسجل مسبقاً" };

      // Create Firestore Doc directly (No Firebase Auth)
      const newUserRef = doc(collection(db, "users"));
      const newUser: User = {
        uid: newUserRef.id,
        fullName: cleanName,
        whatsappNumber: cleanWhatsApp,
        church: church?.trim(),
        birthDate: birthDate,
        photoUrl: photoUrl,
        address: address?.trim(),
        normalizedName: normalizedName,
        code: cleanCode,
        password: cleanPass, 
        role: role,
        status: 'active',
        isActive: true,
        registrationDate: new Date().toISOString(),
        streak: 0,
        totalExams: 0,
        totalPoints: 0,
        averageScore: 0,
        xp: 0,
        level: 'مبتدئ',
        achievements: [],
        badges: [],
        loginCount: 0
      };

      await setDoc(newUserRef, newUser);
      return { success: true };
    } catch (err: any) {
      console.error("Manual creation error:", err);
      const isOffline = !navigator.onLine || 
                        err?.message?.includes("client is offline") || 
                        err?.message?.includes("network-request-failed") ||
                        err?.code === "unavailable";
      if (isOffline) {
        return { success: false, error: "فشل الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى." };
      }
      return { success: false, error: "حدث خطأ أثناء إضافة الطالب" };
    }
  };


  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('auth_session');
    setUser(null);
  };

  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!user || !user.uid || user.uid === "admin-fixed-id") {
      return { success: false, error: "لا يمكن تعديل بيانات هذا الحساب" };
    }

    try {
      // SECURITY: Prevent student from updating their own code or role
      const { code, role, ...safeUpdates } = updates as any;
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...safeUpdates,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const updatedUser = { ...user, ...safeUpdates };
      setUser(updatedUser);
      localStorage.setItem('auth_session', JSON.stringify(updatedUser));

      return { success: true };
    } catch (err: any) {
      console.error("Profile update error:", err);
      return { success: false, error: "حدث خطأ أثناء تحديث البيانات" };
    }
  };

  return { 
    user, 
    isAuthenticated: !!user, 
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
    isLoading, 
    login, 
    register,
    updateProfile,
    logout 
  };
}
