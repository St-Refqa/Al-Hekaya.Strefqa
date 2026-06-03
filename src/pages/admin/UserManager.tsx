import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  setDoc, 
  getDocs, 
  where, 
  updateDoc,
  getDoc,
  writeBatch
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth, handleFirestoreError, OperationType } from "../../lib/firebase";
import { User } from "../../types";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { 
  Plus,
  User as UserIcon,
  Trash2,
  Search,
  UserPlus,
  Shield,
  Ban,
  CheckCircle,
  X,
  Edit,
  FileSpreadsheet,
  ArrowRight,
  RefreshCw,
  AlertCircle as AlertIcon,
  Church,
  Camera,
  Star,
  ScanLine,
  QrCode,
  ShoppingBag,
  Calendar,
  BookOpen,
  Trophy
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, cn, normalizeArabicName, compressImage } from "../../lib/utils";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { useTranslation } from "react-i18next";

export default function UserManager() {
  const { t, i18n } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"OT" | "NT" | "servants" | "pending">("OT");
  const [rolePermissionFilter, setRolePermissionFilter] = useState<"all" | "examCreator" | "attendanceScanner" | "storeManager" | "meetingScheduler" | "libraryManager">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [editingPointsUser, setEditingPointsUser] = useState<User | null>(null);
  const [newTotalPoints, setNewTotalPoints] = useState<number>(0);
  const [newCumulativePoints, setNewCumulativePoints] = useState<number>(0);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setNow(Date.now());
    }, 50);
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 15000); // refresh every 15s to keep status fresh and pure
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  const isOnlineUser = (targetUser: User) => {
    if (!targetUser.lastActive) return false;
    const lastActiveTime = new Date(targetUser.lastActive).getTime();
    return (now - lastActiveTime) < 120000; // active in last 2 minutes
  };

  const getStudentMeetingCount = (studentId: string) => {
    return attendanceLogs.filter(log => log.studentId === studentId && log.points !== undefined).length;
  };
  
  // Form State
  const [userName, setUserName] = useState("");
  const [userWhatsApp, setUserWhatsApp] = useState("");
  const [userChurch, setUserChurch] = useState("");
  const [userBirthDate, setUserBirthDate] = useState("");
  const [userAddress, setUserAddress] = useState("");
  const [userPhotoUrl, setUserPhotoUrl] = useState("");
  const [userCode, setUserCode] = useState("");
  const [userPass, setUserPass] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"OT" | "NT" | "K" | "">("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isAdmin, register } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDownloadQr = async (user: User) => {
    if (!user.code) {
      alert("هذا المستخدم ليس لديه كود");
      return;
    }
    try {
      const payload = `alhekaya:presence:${user.uid}:${user.code.toUpperCase()}`;
      const url = await QRCode.toDataURL(payload, {
        margin: 2,
        width: 400,
        color: {
          dark: '#1C0606', // Brand text
          light: '#FFFDF6' // Brand cream
        }
      });
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `QR_${user.code}_${user.fullName}.png`;
      link.click();
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      alert("حدث خطأ أثناء إنشاء كود الغياب");
    }
  };

  const generateNextCode = async (group: "OT" | "NT" | "K") => {
    setSelectedGroup(group);
    let prefix = "";
    if (group === "OT") prefix = "H";
    else if (group === "NT") prefix = "N";
    else if (group === "K") prefix = "S";

    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "student"),
        orderBy("code", "desc")
      );
      const snapshot = await getDocs(q);
      const existingCodes = snapshot.docs
        .map(doc => doc.data().code as string)
        .filter(code => code && code.startsWith(prefix))
        .map(code => {
           const numPart = code.substring(1);
           return parseInt(numPart);
        })
        .filter(num => !isNaN(num));

      const nextNum = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
      const formattedCode = `${prefix}${nextNum.toString().padStart(3, '0')}`;
      setUserCode(formattedCode);
    } catch (err) {
      console.error("Error generating code:", err);
      const fallback = `${prefix}${Math.floor(Math.random() * 899 + 100)}`;
      setUserCode(fallback);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, "users"),
      orderBy("registrationDate", "desc"),
    );
    const unsubscribeUsers = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ uid: doc.id, ...doc.data() } as User),
        );
        setUsers(data);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "users");
      },
    );

    const unsubscribeAttendance = onSnapshot(
      collection(db, "attendance"),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAttendanceLogs(data);
      },
      (error) => {
        console.error("Error reading attendance:", error);
      }
    );

    return () => {
      unsubscribeUsers();
      unsubscribeAttendance();
    };
  }, [isAdmin]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setUserPhotoUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const cleanCode = userCode.trim().toUpperCase();
      const cleanName = userName.trim();
      const cleanPass = userPass.trim();
      const cleanWhatsApp = userWhatsApp.trim();
      const normalizedName = normalizeArabicName(cleanName);

      if (cleanCode.length < 3) throw new Error("الكود لازم يكون ٣ حروف على الأقل");
      if (cleanPass.length < 6) throw new Error("كلمة المرور لازم تكون ٦ حروف على الأقل");

      if (editingUser) {
        const oldCode = editingUser.code?.trim().toUpperCase();
        const finalCode = userCode.trim().toUpperCase();
        
        await updateDoc(doc(db, "users", editingUser.uid), {
          fullName: cleanName,
          whatsappNumber: cleanWhatsApp,
          church: userChurch.trim(),
          birthDate: userBirthDate,
          photoUrl: userPhotoUrl,
          address: userAddress.trim(),
          normalizedName: normalizedName,
          code: finalCode,
          role: 'student',
          password: cleanPass
        });

        // If code changed, we need to migrate the participant record (streaks)
        if (oldCode && oldCode !== finalCode) {
          try {
            const oldPartRef = doc(db, "participants", oldCode);
            const oldPartSnap = await getDoc(oldPartRef);
            if (oldPartSnap.exists()) {
              const partData = oldPartSnap.data();
              // Create new record
              await setDoc(doc(db, "participants", finalCode), {
                ...partData,
                phoneOrId: finalCode
              });
              // Delete old record
              await deleteDoc(oldPartRef);
              console.log(`Migrated participant record from ${oldCode} to ${finalCode}`);
            }
          } catch (migrateErr) {
            console.error("Migration error:", migrateErr);
            // Non-fatal, student just loses streak if migration fails
          }
        }

        setEditingUser(null);
        setIsAddModalOpen(false);
      } else {
        const result = await register(
          cleanName, 
          cleanCode, 
          cleanPass, 
          cleanWhatsApp,
          userChurch,
          userBirthDate,
          userPhotoUrl,
          userAddress,
          'student'
        );
        if (!result.success) {
          throw new Error(result.error || "حدث خطأ أثناء إضافة الطالب");
        }
        setIsAddModalOpen(false);
      }
      
      setUserName("");
      setUserWhatsApp("");
      setUserChurch("");
      setUserBirthDate("");
      setUserAddress("");
      setUserPhotoUrl("");
      setUserCode("");
      setUserPass("");
      setSelectedGroup("");
    } catch (err: any) {
      console.error("Manual user creation error:", err);
      setFormError(err.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (user: User) => {
    try {
      const newStatus = user.status === 'active' ? 'disabled' : 'active';
      await updateDoc(doc(db, "users", user.uid), {
        status: newStatus,
        isActive: newStatus === 'active'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleToggleExamCreator = async (targetUser: User) => {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      const newStatus = !targetUser.isExamCreator;
      await updateDoc(userRef, { isExamCreator: newStatus });
      setNotification({
        type: "success",
        text: newStatus 
          ? `تم تعيين الخادم/الخادمة (${targetUser.fullName}) واضع اختبارات` 
          : `تم إلغاء تعيين (${targetUser.fullName}) كواضع اختبارات`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleToggleAttendanceScanner = async (targetUser: User) => {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      const newStatus = !targetUser.isAttendanceScanner;
      await updateDoc(userRef, { isAttendanceScanner: newStatus });
      setNotification({
        type: "success",
        text: newStatus 
          ? `تم تعيين الخادم/الخادمة (${targetUser.fullName}) لتسجيل الحضور بالمسح` 
          : `تم إلغاء تعيين (${targetUser.fullName}) من تسجيل الحضور بالمسح`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleToggleStoreManager = async (targetUser: User) => {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      const newStatus = !targetUser.isStoreManager;
      await updateDoc(userRef, { isStoreManager: newStatus });
      setNotification({
        type: "success",
        text: newStatus 
          ? `تم تعيين (${targetUser.fullName}) كمسئول للمتجر` 
          : `تم إلغاء تعيين (${targetUser.fullName}) من مسئولية المتجر`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleToggleLibraryManager = async (targetUser: User) => {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      const newStatus = !targetUser.isLibraryManager;
      await updateDoc(userRef, { isLibraryManager: newStatus });
      setNotification({
        type: "success",
        text: newStatus 
          ? `تم تعيين (${targetUser.fullName}) كمسئول للمكتبة` 
          : `تم إلغاء تعيين (${targetUser.fullName}) من مسئولية المكتبة`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleToggleMeetingScheduler = async (targetUser: User) => {
    try {
      const userRef = doc(db, "users", targetUser.uid);
      const newStatus = !targetUser.isMeetingScheduler;
      await updateDoc(userRef, { 
        isMeetingScheduler: newStatus,
        isMeetingManager: newStatus
      });
      setNotification({
        type: "success",
        text: newStatus 
          ? `تم تفويض (${targetUser.fullName}) لترتيب المواعيد والاجتماعات` 
          : `تم إلغاء تفويض (${targetUser.fullName}) من ترتيب المواعيد والاجتماعات`
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    const user = userToDelete;
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete user profile
      batch.delete(doc(db, "users", user.uid));
      
      // 2. Delete participant record (streaks) if exists
      if (user.code) {
        batch.delete(doc(db, "participants", user.code.toLowerCase()));
      }

      // 3. Delete submissions
      const subQ = query(collection(db, "submissions"), where("participantId", "==", user.uid));
      const subSnap = await getDocs(subQ);
      subSnap.forEach(d => batch.delete(d.ref));

      // 4. Delete login logs
      const logQ = query(collection(db, "loginLogs"), where("code", "==", user.code || ""));
      const logSnap = await getDocs(logQ);
      logSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      setUserToDelete(null); // Close modal only after success
      setNotification({ type: 'success', text: "تم حذف الطالب بنجاح" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Delete error:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearAllUsers = async () => {
    try {
      const q = query(collection(db, "users"), where("role", "==", "student"));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      for (const userDoc of snapshot.docs) {
        const u = userDoc.data() as User;
        batch.delete(userDoc.ref);
        if (u.code) {
          batch.delete(doc(db, "participants", u.code.toLowerCase()));
        }
      }

      // Also clear all submissions and logs to be thorough
      const subSnap = await getDocs(query(collection(db, "submissions")));
      subSnap.forEach(d => batch.delete(d.ref));
      
      const logSnap = await getDocs(query(collection(db, "loginLogs")));
      logSnap.forEach(d => batch.delete(d.ref));

      await batch.commit();
      setNotification({ type: 'success', text: "تم مسح جميع بيانات الطلاب بنجاح" });
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "users/all");
    }
  };

  const handleUpdatePoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPointsUser) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, "users", editingPointsUser.uid), {
        totalPoints: Number(newTotalPoints),
        cumulativePoints: Number(newCumulativePoints)
      });
      
      setNotification({ type: 'success', text: `تم تحديث نقاط الطالب ${editingPointsUser.fullName} بنجاح!` });
      setTimeout(() => setNotification(null), 3000);
      setEditingPointsUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${editingPointsUser.uid}`);
      setNotification({ type: 'error', text: 'فشل في تحديث نقاط الطالب.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportUsers = () => {
    const data = filteredUsers.map((u, idx) => ({
      'رقم': idx + 1,
      'الاسم بالكامل': u.fullName,
      'رقم الواتساب': u.whatsappNumber || '-',
      'الكود': u.code || '-',
      'كلمة المرور الحالية': u.password || '-',
      'الحالة': u.status === 'active' ? 'نشط' : 'معطل',
      'تاريخ إنشاء الحساب': format(new Date(u.registrationDate), 'yyyy-MM-dd'),
      'آخر تسجيل دخول': u.lastLoginAt ? format(new Date(u.lastLoginAt), 'yyyy-MM-dd HH:mm') : 'لم يدخل بعد',
      'عدد مرات الدخول': u.loginCount || 0,
      'عدد الاختبارات المكتملة': u.totalExams || 0,
      'إجمالي النقاط': u.totalPoints || 0
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `كشف_الطلاب_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const onlineStudentsCount = useMemo(() => {
    return users.filter(u => {
      if (u.role !== 'student' || !u.lastActive) return false;
      const lastActiveTime = new Date(u.lastActive).getTime();
      return (now - lastActiveTime) < 120000;
    }).length;
  }, [users, now]);

  const offlineStudentsCount = useMemo(() => {
    return users.filter(u => {
      if (u.role !== 'student') return false;
      if (!u.lastActive) return true;
      const lastActiveTime = new Date(u.lastActive).getTime();
      return (now - lastActiveTime) >= 120000;
    }).length;
  }, [users, now]);

  const filteredUsers = users.filter(
    (u) => {
      if (u.role === "admin") return false;

      const isServant = (u.role as string) === "servant" || u.code?.toUpperCase().startsWith('S');
      const isStudent = !isServant;

      const normalizedSearch = normalizeArabicName(searchTerm).toLowerCase();
      const searchMatch = 
        normalizeArabicName(u.fullName).toLowerCase().includes(normalizedSearch) ||
        u.code?.toLowerCase().includes(normalizedSearch);

      if (!searchMatch) return false;

      if (categoryFilter === "OT") {
        return isStudent && u.code?.toUpperCase().startsWith('H');
      } else if (categoryFilter === "NT") {
        return isStudent && u.code?.toUpperCase().startsWith('N');
      } else if (categoryFilter === "pending") {
        return isStudent && u.code?.toUpperCase().startsWith('P');
      } else {
        // categoryFilter === "servants"
        if (!isServant) return false;

        const permissionMatch =
          rolePermissionFilter === 'all' ||
          (rolePermissionFilter === 'examCreator' && u.isExamCreator) ||
          (rolePermissionFilter === 'attendanceScanner' && u.isAttendanceScanner) ||
          (rolePermissionFilter === 'storeManager' && u.isStoreManager) ||
          (rolePermissionFilter === 'meetingScheduler' && u.isMeetingScheduler) ||
          (rolePermissionFilter === 'libraryManager' && u.isLibraryManager);

        return permissionMatch;
      }
    }
  );

  return (
    <div className="min-h-screen bg-brand-cream p-4 md:p-6 lg:p-12 font-bold" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-right">
            <Link to="/admin" className="p-3.5 bg-white rounded-[20px] shadow-sm hover:scale-110 transition-transform group border border-brand-beige/10">
              <ArrowRight className={cn("w-6 h-6 text-brand-beige group-hover:text-brand-red transition-colors", i18n.language === 'ar' ? '' : 'rotate-180')} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-brand-text tracking-tighter">{t('userManager.title')}</h1>
              <p className="text-brand-beige text-xs md:text-sm mt-1">{t('userManager.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 md:gap-4 w-full lg:w-auto">
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="flex-1 lg:flex-initial px-5 py-3.5 bg-white border border-brand-beige/25 text-brand-red rounded-2xl hover:bg-rose-50 hover:border-brand-red/20 active:scale-95 transition-all flex items-center justify-center gap-2 font-black text-xs md:text-sm shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span className="truncate">{t('userManager.clear_all')}</span>
            </button>
            <button
              onClick={exportUsers}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-brand-beige/25 text-brand-text rounded-2xl shadow-sm hover:bg-brand-cream hover:border-brand-beige/40 active:scale-95 transition-all text-xs md:text-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 shrink-0" />
              <span className="truncate">{t('userManager.export')}</span>
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserName("");
                setUserWhatsApp("");
                setUserChurch("");
                setUserBirthDate("");
                setUserAddress("");
                setUserPhotoUrl("");
                setUserCode("");
                setUserPass("");
                setSelectedGroup("");
                setIsAddModalOpen(true);
              }}
              className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-brand-red text-white rounded-2xl shadow-lg shadow-brand-red/15 hover:scale-[1.02] active:scale-[0.98] hover:bg-brand-text transition-all text-xs md:text-sm font-black cursor-pointer"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span>{t('userManager.add_student')}</span>
            </button>
          </div>
        </div>

        {/* Real-time Online Presence Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in text-right">
          {/* Stats Card: Online Now */}
          <div className="lg:col-start-2 bg-white p-5 md:p-6 rounded-[32px] border border-brand-beige/12 hover:shadow-xl hover:shadow-brand-red/5 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative">
              <span className="text-[9px] md:text-[10px] text-brand-beige font-black uppercase tracking-widest block">متصل الآن بالمنصة</span>
              <h4 className="text-xl md:text-3xl font-black text-emerald-600 mt-1 leading-none flex items-center gap-1.5">
                <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                {onlineStudentsCount}
                <span className="text-[10px] md:text-sm text-brand-beige font-bold mr-0.5">نشط</span>
              </h4>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100/35 group-hover:scale-105 transition-transform duration-300">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
          </div>

          {/* Stats Card: Absent/Offline */}
          <div className="bg-white p-5 md:p-6 rounded-[32px] border border-brand-beige/12 hover:shadow-xl hover:shadow-brand-red/5 hover:-translate-y-1 transition-all duration-300 flex items-center justify-between relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative">
              <span className="text-[9px] md:text-[10px] text-brand-beige font-black uppercase tracking-widest block">غير متصل حالياً</span>
              <h4 className="text-xl md:text-3xl font-black text-gray-400 mt-1 leading-none flex items-center gap-1.5">
                <span className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-gray-300" />
                {offlineStudentsCount}
                <span className="text-[10px] md:text-sm text-brand-beige font-black mr-0.5">غائب</span>
              </h4>
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-gray-50 text-gray-500 flex items-center justify-center shadow-inner border border-gray-200/35 group-hover:scale-105 transition-transform duration-300">
              <Ban className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        {/* Main Switcher: Online Students vs Workshop Students vs Servants vs Pending */}
        <div className="bg-white p-1.5 rounded-[24px] border border-brand-beige/12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shadow-sm text-center">
          <button
            onClick={() => {
              setCategoryFilter("OT");
            }}
            className={cn(
              "py-4 px-4 text-center font-black text-sm md:text-base rounded-[18px] transition-all flex items-center justify-center gap-2 cursor-pointer",
              categoryFilter === "OT"
                ? "bg-brand-red text-white shadow-lg shadow-brand-red/20"
                : "text-brand-beige hover:text-brand-text bg-transparent hover:bg-brand-cream/30"
            )}
          >
            <span>طلاب اونلاين 🌐</span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all",
              categoryFilter === "OT" 
                ? "bg-white/20 text-white" 
                : "bg-brand-cream text-brand-red"
            )}>
              {users.filter(u => u.role !== 'admin' && !((u.role as string) === 'servant' || u.code?.toUpperCase().startsWith('S')) && u.code?.toUpperCase().startsWith('H')).length}
            </span>
          </button>

          <button
            onClick={() => {
              setCategoryFilter("NT");
            }}
            className={cn(
              "py-4 px-4 text-center font-black text-sm md:text-base rounded-[18px] transition-all flex items-center justify-center gap-2 cursor-pointer",
              categoryFilter === "NT"
                ? "bg-brand-red text-white shadow-lg shadow-brand-red/20"
                : "text-brand-beige hover:text-brand-text bg-transparent hover:bg-brand-cream/30"
            )}
          >
            <span>طلاب الورشة 🏫</span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all",
              categoryFilter === "NT" 
                ? "bg-white/20 text-white" 
                : "bg-brand-cream text-brand-red"
            )}>
              {users.filter(u => u.role !== 'admin' && !((u.role as string) === 'servant' || u.code?.toUpperCase().startsWith('S')) && u.code?.toUpperCase().startsWith('N')).length}
            </span>
          </button>
          
          <button
            onClick={() => {
              setCategoryFilter("servants");
              setRolePermissionFilter("all");
            }}
            className={cn(
              "py-4 px-4 text-center font-black text-sm md:text-base rounded-[18px] transition-all flex items-center justify-center gap-2 cursor-pointer",
              categoryFilter === "servants"
                ? "bg-brand-red text-white shadow-lg shadow-brand-red/20"
                : "text-brand-beige hover:text-brand-text bg-transparent hover:bg-brand-cream/30"
            )}
          >
            <span>خدام 🛡️</span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all",
              categoryFilter === "servants" 
                ? "bg-white/20 text-white" 
                : "bg-brand-cream text-brand-red"
            )}>
              {users.filter(u => (u.role as string) === 'servant' || u.code?.toUpperCase().startsWith('S')).length}
            </span>
          </button>

          <button
            onClick={() => {
              setCategoryFilter("pending");
            }}
            className={cn(
              "py-4 px-4 text-center font-black text-sm md:text-base rounded-[18px] transition-all flex items-center justify-center gap-2 cursor-pointer",
              categoryFilter === "pending"
                ? "bg-brand-red text-white shadow-lg shadow-brand-red/20"
                : "text-brand-beige hover:text-brand-text bg-transparent hover:bg-brand-cream/30"
            )}
          >
            <span>طلاب معلقين ⏳</span>
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all",
              categoryFilter === "pending" 
                ? "bg-white/20 text-white" 
                : "bg-brand-cream text-brand-red"
            )}>
              {users.filter(u => u.role !== 'admin' && u.code?.toUpperCase().startsWith('P')).length}
            </span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className={cn(
            "bg-white p-2 rounded-[24px] border border-brand-beige/10 shadow-sm flex items-center justify-between",
            categoryFilter !== "servants" ? "lg:col-span-3" : "lg:col-span-2"
          )}>
            <div className="relative w-full flex items-center flex-row-reverse text-right">
              <Search className="w-5 h-5 text-brand-beige ml-3 shrink-0" />
              <input
                type="text"
                placeholder={t('userManager.search_placeholder')}
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none py-2.5 px-2 outline-none font-bold text-brand-text text-sm md:text-base placeholder-brand-beige/50 text-right"
                dir="rtl"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="p-1 px-2.5 hover:bg-brand-cream rounded-xl text-brand-beige transition-colors text-xs font-black mr-2 select-none"
                >
                  مسح ✕
                </button>
              )}
            </div>
          </div>
          
          {categoryFilter === "servants" && (
            <div className="bg-white/60 p-1.5 rounded-[24px] border border-brand-beige/10 shadow-sm flex items-center gap-1 overflow-x-auto w-full justify-between">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'examCreator', label: 'الاختبارات 📝' },
                { id: 'attendanceScanner', label: 'الحضور 📅' },
                { id: 'storeManager', label: 'المتجر 🪙' },
                { id: 'meetingScheduler', label: 'المواعيد ⏰' },
                { id: 'libraryManager', label: 'المكتبة 📚' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setRolePermissionFilter(item.id as any)}
                  className={cn(
                    "flex-1 px-3 py-2.5 rounded-[16px] text-[9px] md:text-[10px] font-black transition-all whitespace-nowrap cursor-pointer",
                    rolePermissionFilter === item.id 
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/15" 
                      : "text-brand-beige hover:bg-brand-cream bg-transparent"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl md:rounded-[40px] shadow-2xl shadow-brand-red/5 border border-brand-beige/10 p-2 overflow-hidden">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-8">
               {Array.from({ length: 6 }).map((_, i) => (
                 <div key={i} className="h-64 bg-brand-cream animate-pulse rounded-2xl md:rounded-[32px] opacity-50" />
               ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-16 md:py-24 text-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                  <Search className="w-8 h-8 md:w-10 md:h-10 text-brand-beige" />
                </div>
                <p className="text-brand-beige font-black text-lg md:text-xl">{t('userManager.no_users')}</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-4 md:p-8">
              {filteredUsers.map((user) => (
                <motion.div
                  layout
                  key={user.uid}
                  className="bg-white rounded-[32px] md:rounded-[40px] border border-brand-beige/12 p-6 md:p-8 hover:shadow-2xl hover:shadow-brand-red/5 hover:-translate-y-1 transition-all duration-300 group relative flex flex-col justify-between overflow-hidden"
                >
                  <div className="relative">
                    {/* Account Status and Password Headers */}
                    <div className="flex items-center justify-between gap-2 mb-4 flex-row-reverse">
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-[8.5px] md:text-[9.5px] font-black tracking-wide border shadow-sm",
                        user.status === 'active' 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {user.status === 'active' ? 'الحساب مفعل ●' : 'الحساب معطل ●'}
                      </div>
                      
                      <span className="text-[10px] font-mono font-bold text-brand-beige bg-brand-cream/40 px-2.5 py-1 rounded-lg">
                        رقم المرور: {user.password}
                      </span>
                    </div>

                    {/* Profile & Avatar Details */}
                    <div className="flex items-center gap-4 md:gap-5 mb-5 flex-row-reverse text-right">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[24px] bg-brand-cream flex items-center justify-center text-brand-red font-black text-2xl md:text-3xl shadow-inner overflow-hidden border-2 md:border-3 border-white ring-2 ring-brand-cream transition-transform group-hover:scale-105 duration-300">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="opacity-40">{user.fullName.charAt(0)}</span>
                          )}
                        </div>
                        {/* Real-time online/offline dot native overlap */}
                        <div 
                          className={cn(
                            "absolute -bottom-1 -left-1 w-4 h-4 rounded-full border-2 border-white shadow-md z-10 transition-colors",
                            isOnlineUser(user) ? "bg-emerald-500 animate-pulse" : "bg-gray-300"
                          )} 
                          title={isOnlineUser(user) ? "متصل الآن بالمنصة" : "غير متصل حالياً"} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-brand-text text-base md:text-xl line-clamp-1 tracking-tight group-hover:text-brand-red transition-colors duration-200">{user.fullName}</h3>
                        
                        <div className="flex flex-wrap justify-end gap-1 mt-2">
                          {user.code?.toUpperCase().startsWith('H') && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-blue-100 whitespace-nowrap">طلاب اونلاين</span>
                          )}
                          {user.code?.toUpperCase().startsWith('N') && (
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-purple-100 whitespace-nowrap">طلاب الورشة</span>
                          )}
                          {user.code?.toUpperCase().startsWith('S') && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-amber-100 whitespace-nowrap">خادم</span>
                          )}
                          {user.code?.toUpperCase().startsWith('P') && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-rose-100 whitespace-nowrap">معلق ⏳</span>
                          )}
                          <span className="px-2 py-0.5 bg-brand-cream text-brand-beige rounded-full text-[8px] md:text-[9px] font-black tracking-widest border border-brand-beige/5 whitespace-nowrap">{user.code}</span>
                        </div>

                        {/* Special Role indicators if set */}
                        {(user.isExamCreator || user.isAttendanceScanner || user.isStoreManager || user.isLibraryManager) && (
                          <div className="flex flex-wrap justify-end gap-1 mt-2 border-t border-dashed border-brand-cream/50 pt-1.5">
                            {user.isExamCreator && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[7.5px] md:text-[8px] font-black uppercase tracking-wide flex items-center gap-0.5">
                                <Star className="w-2 h-2 fill-white" />
                                واضع اختبارات
                              </span>
                            )}
                            {user.isAttendanceScanner && (
                              <span className="px-1.5 py-0.5 bg-teal-500 text-white rounded-full text-[7.5px] md:text-[8px] font-black uppercase tracking-wide flex items-center gap-0.5">
                                <ScanLine className="w-2 h-2" />
                                مدير حضور
                              </span>
                            )}
                            {user.isStoreManager && (
                              <span className="px-1.5 py-0.5 bg-blue-500 text-white rounded-full text-[7.5px] md:text-[8px] font-black uppercase tracking-wide flex items-center gap-0.5">
                                <ShoppingBag className="w-2 h-2" />
                                مدير المتجر
                              </span>
                            )}
                            {user.isLibraryManager && (
                              <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-[7.5px] md:text-[8px] font-black uppercase tracking-wide flex items-center gap-0.5">
                                <BookOpen className="w-2 h-2" />
                                مسئول مكتبة
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-brand-cream/50 mt-auto">
                    {/* Row 1: Profile full link and WhatsApp button */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={'/admin/students/' + user.uid}
                        className="flex-1 py-2 px-3 bg-brand-text text-white rounded-xl font-black text-[10px] md:text-xs hover:bg-brand-red active:scale-95 transition-all shadow-sm hover:shadow-md hover:shadow-brand-red/10 text-center"
                      >
                        التفاصيل
                      </Link>
                      {user.whatsappNumber && (
                        <a
                          href={'https://wa.me/' + (user.whatsappNumber.startsWith('01') ? '2' + user.whatsappNumber : user.whatsappNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 md:w-9 md:h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm shrink-0 active:scale-95"
                          title="تواصل واتساب"
                        >
                          <FaWhatsapp className="w-4 h-4 md:w-5 md:h-5" />
                        </a>
                      )}
                    </div>

                    {/* Row 2: Super Clean Admin Controls docking bar */}
                    <div className="flex items-center justify-between gap-1.5 bg-brand-cream/35 p-1.5 md:p-2 rounded-[14px] border border-brand-beige/5">
                      <div className="flex items-center gap-1.5">
                        {/* Ban / Activate student account button */}
                        <button
                          onClick={() => toggleStatus(user)}
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 border shadow-sm",
                            user.status === 'active' 
                              ? "bg-rose-50 border-rose-100 text-brand-red hover:bg-brand-red hover:border-brand-red hover:text-white" 
                              : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white"
                          )}
                          title={user.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                          {user.status === 'active' ? <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        </button>

                        {/* Download attendance QR card */}
                        <button
                          onClick={() => handleDownloadQr(user)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0 bg-white hover:bg-brand-cream text-brand-text border-brand-beige/20 shadow-sm"
                          title="تحميل كارت الحضور QR"
                        >
                          <QrCode className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>

                        {/* Special roles toggles for servants */}
                        {user.code?.toUpperCase().startsWith('S') && (
                          <div className="flex items-center gap-1.5 border-r border-brand-cream/80 pr-1.5 mr-0.5">
                            <button
                              onClick={() => handleToggleExamCreator(user)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0",
                                user.isExamCreator
                                  ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                                  : "bg-white text-amber-600 border-brand-beige/20 shadow-sm hover:bg-amber-50 hover:border-amber-100"
                              )}
                              title={user.isExamCreator ? 'إلغاء تعيين كواضع اختبارات' : 'تعيين كواضع اختبارات (الحد الأقصى ٤)'}
                            >
                              <Star className={cn("w-4 h-4", user.isExamCreator ? "fill-white animate-pulse" : "fill-none")} />
                            </button>

                            <button
                              onClick={() => handleToggleAttendanceScanner(user)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0",
                                user.isAttendanceScanner
                                  ? "bg-teal-500 text-white border-teal-600 hover:bg-teal-600"
                                  : "bg-white text-teal-600 border-brand-beige/20 shadow-sm hover:bg-teal-50 hover:border-teal-100"
                              )}
                              title={user.isAttendanceScanner ? 'إلغاء تعيين كمسؤول حضور' : 'تعيين كمسؤول حضور بالمسح (الحد الأقصى ٤)'}
                            >
                              <ScanLine className={cn("w-3.5 h-3.5 md:w-4 md:h-4", user.isAttendanceScanner ? "animate-pulse" : "")} />
                            </button>

                            <button
                              onClick={() => handleToggleStoreManager(user)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0",
                                user.isStoreManager
                                  ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600"
                                  : "bg-white text-blue-600 border-brand-beige/20 shadow-sm hover:bg-blue-50 hover:border-blue-100"
                              )}
                              title={user.isStoreManager ? 'إلغاء تعيين كمسؤول متجر' : 'تعيين كمسؤول متجر'}
                            >
                              <ShoppingBag className={cn("w-3.5 h-3.5 md:w-4 md:h-4", user.isStoreManager ? "animate-pulse" : "")} />
                            </button>

                            <button
                              onClick={() => handleToggleMeetingScheduler(user)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0",
                                user.isMeetingScheduler
                                  ? "bg-purple-500 text-white border-purple-600 hover:bg-purple-600"
                                  : "bg-white text-purple-600 border-brand-beige/20 shadow-sm hover:bg-purple-50 hover:border-purple-100"
                              )}
                              title={user.isMeetingScheduler ? 'إلغاء تفويض ترتيب المواعيد' : 'تفويض وترتيب المواعيد للخدام'}
                            >
                              <Calendar className={cn("w-3.5 h-3.5 md:w-4 md:h-4", user.isMeetingScheduler ? "animate-pulse" : "")} />
                            </button>

                            <button
                              onClick={() => handleToggleLibraryManager(user)}
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center transition-all border shrink-0",
                                user.isLibraryManager
                                  ? "bg-fuchsia-500 text-white border-fuchsia-600 hover:bg-fuchsia-600"
                                  : "bg-white text-fuchsia-600 border-brand-beige/20 shadow-sm hover:bg-fuchsia-50 hover:border-fuchsia-100"
                              )}
                              title={user.isLibraryManager ? 'إلغاء تعيين كمسؤول مكتبة' : 'تعيين كمسؤول مكتبة'}
                            >
                              <BookOpen className={cn("w-3.5 h-3.5 md:w-4 md:h-4", user.isLibraryManager ? "animate-pulse" : "")} />
                            </button>
                          </div>
                        )}
                        
                        {/* Edit User General Dialog */}
                        <button
                          onClick={() => {
                            const upperCode = user.code?.toUpperCase() || "";
                            const group = upperCode.startsWith('H') ? "OT" : upperCode.startsWith('N') ? "NT" : upperCode.startsWith('S') ? "K" : "";
                            setEditingUser(user);
                            setUserName(user.fullName || "");
                            setUserWhatsApp(user.whatsappNumber || "");
                            setUserCode(user.code || "");
                            setUserPass(user.password || "");
                            setUserChurch(user.church || "");
                            setUserBirthDate(user.birthDate || "");
                            setUserAddress(user.address || "");
                            setUserPhotoUrl(user.photoUrl || "");
                            setSelectedGroup(group as any);
                            setIsAddModalOpen(true);
                          }}
                          className="w-8 h-8 bg-white hover:bg-brand-cream text-brand-text rounded-lg flex items-center justify-center transition-all border border-brand-beige/20 shadow-sm shrink-0"
                          title="تعديل"
                        >
                          <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>

                        {/* Edit Student Points (Only for Students, not servants) */}
                        {!user.code?.toUpperCase().startsWith('S') && (
                          <button
                            onClick={() => {
                              setEditingPointsUser(user);
                              setNewTotalPoints(user.totalPoints || 0);
                              setNewCumulativePoints(user.cumulativePoints || user.totalPoints || 0);
                            }}
                            className="w-8 h-8 bg-white hover:bg-brand-cream text-amber-600 rounded-lg flex items-center justify-center transition-all border border-brand-beige/20 shadow-sm shrink-0"
                            title="تعديل النقاط"
                          >
                            <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                          </button>
                        )}
                      </div>

                      {/* Hard Delete user account */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToDelete(user);
                        }}
                        disabled={isSubmitting}
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 border shadow-sm",
                          "bg-white border-brand-beige/15 text-brand-beige hover:bg-rose-50 hover:text-brand-red hover:border-rose-100",
                          isSubmitting && "opacity-30 cursor-not-allowed"
                        )}
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
           )}
         </div>
       </div>
      {/* Add/Edit Modal */}
      <AnimatePresence>
      {/* Deletion Confirmation Modal */}
        {userToDelete && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setUserToDelete(null)}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl text-center border border-brand-cream"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                {isSubmitting ? <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" /> : <Trash2 className="w-10 h-10 text-rose-500" />}
              </div>
              <h3 className="text-2xl font-black text-brand-text mb-4">حذف حساب الطالب</h3>
              <p className="text-brand-beige font-bold leading-relaxed mb-8">
                هل أنت متأكد من حذف الطالب <span className="text-brand-red">"{userToDelete.fullName}"</span>؟ سيتم مسح جميع بياناته ونتائجه نهائياً.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setUserToDelete(null)}
                  disabled={isSubmitting}
                  className="py-4 rounded-[24px] font-black text-brand-beige border-2 border-brand-cream hover:bg-brand-cream transition-all disabled:opacity-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="py-4 rounded-[24px] font-black text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  تأكيد الحذف
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showClearAllConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearAllConfirm(false)}
              className="absolute inset-0 bg-brand-text/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl text-center border border-brand-cream"
            >
              <div className="w-20 h-20 bg-brand-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand-red/40">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-brand-text mb-4">مسح جميع الطلاب؟</h3>
              <div className="p-4 bg-rose-50 rounded-2xl mb-8 border border-rose-100">
                <p className="text-brand-red font-black text-sm leading-relaxed">
                  تحذير: سيتم حذف جميع حسابات الطلاب، نتائج الاختبارات، وسجلات الحضور نهائياً. لا يمكن التراجع عن هذا الفعل!
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  className="py-4 rounded-[24px] font-black text-brand-beige border-2 border-brand-cream hover:bg-brand-cream transition-all"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    handleClearAllUsers();
                    setShowClearAllConfirm(false);
                  }}
                  className="py-4 rounded-[24px] font-black text-white bg-brand-red hover:bg-brand-text shadow-lg shadow-brand-red/20 transition-all"
                >
                  نعم، امسح الكل
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingPointsUser && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setEditingPointsUser(null)}
              className="absolute inset-0 bg-brand-text/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl md:rounded-[40px] p-6 md:p-10 shadow-2xl border border-brand-cream text-right flex flex-col z-10 animate-fade-in"
            >
              <div className="flex items-center justify-between mb-8 flex-row-reverse">
                <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-brand-text">تعديل نقاط الطالب</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setEditingPointsUser(null)} 
                  disabled={isSubmitting}
                  className="p-2 hover:bg-brand-cream rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-brand-beige" />
                </button>
              </div>

              <div className="p-4 bg-brand-cream/40 rounded-2xl mb-6 text-center">
                <p className="font-black text-brand-text text-base">{editingPointsUser.fullName}</p>
                <p className="text-xs text-brand-beige font-bold mt-1">كود الطالب: {editingPointsUser.code}</p>
              </div>

              <form onSubmit={handleUpdatePoints} className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2 text-right">إجمالي النقاط الحالي</label>
                  <input
                    type="number"
                    value={newTotalPoints}
                    onChange={e => setNewTotalPoints(Number(e.target.value))}
                    className="w-full px-5 py-3 bg-brand-cream border border-brand-beige/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-red/20 font-bold text-center text-brand-text"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest block mb-2 text-right">النقاط التراكمية (المجموع الكلي)</label>
                  <input
                    type="number"
                    value={newCumulativePoints}
                    onChange={e => setNewCumulativePoints(Number(e.target.value))}
                    className="w-full px-5 py-3 bg-brand-cream border border-brand-beige/10 rounded-xl outline-none focus:ring-2 focus:ring-brand-red/20 font-bold text-center text-brand-text"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingPointsUser(null)}
                    disabled={isSubmitting}
                    className="py-4 rounded-[24px] font-black text-brand-beige border-2 border-brand-cream hover:bg-brand-cream transition-all disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-4 rounded-[24px] font-black text-white bg-brand-red hover:bg-brand-red/90 shadow-lg shadow-brand-red/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    حفظ التغييرات
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4 md:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-2xl md:rounded-[40px] p-6 md:p-10 max-w-md w-full max-h-[90vh] md:max-h-[85vh] shadow-2xl relative overflow-hidden flex flex-col"
            >
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                  setUserName("");
                  setUserWhatsApp("");
                  setUserChurch("");
                  setUserBirthDate("");
                  setUserAddress("");
                  setUserPhotoUrl("");
                  setUserCode("");
                  setUserPass("");
                  setSelectedGroup("");
                }}
                className="absolute top-4 md:top-6 left-4 md:left-6 p-1.5 md:p-2 hover:bg-brand-cream rounded-xl text-brand-beige transition-colors z-10"
              >
                <X className="w-5 md:w-6 h-5 md:h-6" />
              </button>

              <div className="flex flex-col items-center mb-6 md:mb-10 shrink-0">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-brand-cream rounded-[16px] md:rounded-[24px] flex items-center justify-center mb-3 md:mb-6">
                  {editingUser ? <Edit className="w-6 h-6 md:w-8 md:h-8 text-brand-red" /> : <UserPlus className="w-6 h-6 md:w-8 md:h-8 text-brand-red" />}
                </div>
                <h2 className="text-xl md:text-3xl font-black text-brand-text text-center">
                  {editingUser ? t('userManager.edit_student') : t('userManager.add_student')}
                </h2>
              </div>

              <form onSubmit={handleCreateOrUpdate} className="space-y-6 md:space-y-10 overflow-y-auto px-1 flex-1 custom-scrollbar">
                {/* Photo Upload Section */}
                <div className="flex flex-col items-center mb-2 md:mb-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative group cursor-pointer"
                  >
                    <div className="w-18 h-18 md:w-24 md:h-24 rounded-full bg-brand-cream border-2 border-dashed border-brand-red/30 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-red">
                      {userPhotoUrl ? (
                        <img src={userPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 md:w-8 md:h-8 text-brand-red/40" />
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-8 md:h-8 bg-brand-red text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <Plus className="w-3 h-3 md:w-4 md:h-4" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <p className="text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest mt-1.5 md:mt-2">{t('userManager.student_photo')}</p>
                </div>

                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", i18n.language === 'ar' ? 'text-right' : 'text-left')}>
                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.table_name')}</label>
                    <input
                      type="text"
                      value={userName || ""}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.label_church')}</label>
                    <input
                      type="text"
                      value={userChurch || ""}
                      onChange={(e) => setUserChurch(e.target.value)}
                      required
                      placeholder={t('userManager.placeholder_church')}
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.label_birth_date')}</label>
                    <input
                      type="date"
                      value={userBirthDate || ""}
                      onChange={(e) => setUserBirthDate(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.table_whatsapp')}</label>
                    <input
                      type="text"
                      value={userWhatsApp || ""}
                      onChange={(e) => setUserWhatsApp(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest block", i18n.language === 'ar' ? 'mr-1 text-right' : 'ml-1 text-left')}>{t('userManager.select_group_msg')}</label>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                       <button 
                        type="button"
                        onClick={() => generateNextCode("OT")}
                        className={cn(
                          "py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] transition-all border-2",
                          selectedGroup === "OT" ? "bg-brand-red text-white border-brand-red" : "bg-brand-cream text-brand-beige border-transparent hover:border-brand-red/20"
                        )}
                       >
                         {t('userManager.group_ot')}
                       </button>
                       <button 
                        type="button"
                        onClick={() => generateNextCode("NT")}
                        className={cn(
                          "py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] transition-all border-2",
                          selectedGroup === "NT" ? "bg-brand-red text-white border-brand-red" : "bg-brand-cream text-brand-beige border-transparent hover:border-brand-red/20"
                        )}
                       >
                         {t('userManager.group_nt')}
                       </button>
                       <button 
                        type="button"
                        onClick={() => generateNextCode("K")}
                        className={cn(
                          "py-2.5 md:py-3 rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] transition-all border-2",
                          selectedGroup === "K" ? "bg-brand-red text-white border-brand-red" : "bg-brand-cream text-brand-beige border-transparent hover:border-brand-red/20"
                        )}
                       >
                         {t('userManager.group_servant')}
                       </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.table_code')}</label>
                    <input
                      type="text"
                      value={userCode || ""}
                      onChange={(e) => setUserCode(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold uppercase text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.label_address')}</label>
                    <input
                      type="text"
                      value={userAddress || ""}
                      onChange={(e) => setUserAddress(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.table_password')}</label>
                    <input
                      type="text"
                      value={userPass || ""}
                      onChange={(e) => setUserPass(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>
                </div>

                {formError && (
                  <div className="p-3 md:p-4 bg-red-50 text-red-600 rounded-xl md:rounded-2xl text-[11px] md:text-xs font-bold border border-red-100 flex items-center gap-2 shrink-0">
                    <AlertIcon className="w-3.5 md:w-4 h-3.5 md:h-4 shrink-0" />
                    <span className="truncate">{formError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 md:py-5 bg-brand-red text-white text-base md:text-xl font-black rounded-2xl md:rounded-3xl shadow-xl shadow-brand-red/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shrink-0 mt-4"
                >
                  {isSubmitting ? t('userManager.saving') : editingUser ? t('userManager.save_changes') : t('userManager.add_student_btn')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistence Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "fixed bottom-12 right-12 p-6 rounded-[32px] shadow-2xl border z-[400] flex items-center gap-4",
              notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
            )}
          >
            {notification.type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertIcon className="w-6 h-6" />}
            <span className="font-black text-lg">{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
