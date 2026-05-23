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
  QrCode
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
  const [categoryFilter, setCategoryFilter] = useState<"all" | "OT" | "NT" | "K">("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
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
    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
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
    const currentCreatorsCount = users.filter(u => u.isExamCreator && u.uid !== targetUser.uid).length;
    
    if (!targetUser.isExamCreator && currentCreatorsCount >= 4) {
      setNotification({
        type: "error",
        text: "عفواً، لا يمكن تحديد أكثر من ٤ خدام لوضع الاختبارات. يرجى إلغاء أحدهم أولاً."
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

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
    const currentScannersCount = users.filter(u => u.isAttendanceScanner && u.uid !== targetUser.uid).length;
    
    if (!targetUser.isAttendanceScanner && currentScannersCount >= 4) {
      setNotification({
        type: "error",
        text: "عفواً، لا يمكن تحديد أكثر من ٤ خدام لتسجيل الحضور بالمسح (Scan). يرجى إلغاء أحدهم أولاً."
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

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

  const filteredUsers = users.filter(
    (u) => {
      if (u.role === "admin") return false;

      const categoryMatch = 
        categoryFilter === 'all' || 
        (categoryFilter === 'OT' && u.code?.toUpperCase().startsWith('H')) ||
        (categoryFilter === 'NT' && u.code?.toUpperCase().startsWith('N')) ||
        (categoryFilter === 'K' && u.code?.toUpperCase().startsWith('S'));

      const searchMatch = 
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.code?.toLowerCase().includes(searchTerm.toLowerCase());
        
      return categoryMatch && searchMatch;
    }
  );

  return (
    <div className="min-h-screen bg-brand-cream p-4 md:p-6 lg:p-12 font-bold" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white rounded-2xl shadow-sm hover:scale-110 transition-transform group">
              <ArrowRight className={cn("w-6 h-6 text-brand-beige group-hover:text-brand-red", i18n.language === 'ar' ? '' : 'rotate-180')} />
            </Link>
            <div>
              <h1 className="text-2xl md:text-4xl font-black text-brand-text tracking-tighter">{t('userManager.title')}</h1>
              <p className="text-brand-beige text-xs md:text-sm mt-1">{t('userManager.subtitle')}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 md:gap-4 w-full md:w-auto">
            <button
              onClick={() => setShowClearAllConfirm(true)}
              className="flex-1 md:flex-initial px-4 md:px-6 py-3 md:py-4 bg-white border border-brand-beige/20 text-brand-red rounded-xl md:rounded-2xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 md:gap-3 font-black text-xs md:text-sm shadow-sm"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span className="truncate">{t('userManager.clear_all')}</span>
            </button>
            <button
              onClick={exportUsers}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-white border border-brand-beige/20 text-brand-text rounded-xl md:rounded-2xl shadow-sm hover:bg-brand-cream transition-all text-xs md:text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 shrink-0" />
              <span className="truncate">{t('userManager.export')}</span>
            </button>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserName("");
                setUserWhatsApp("");
                setUserCode("");
                setUserPass("");
                setIsAddModalOpen(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-brand-red text-white rounded-xl md:rounded-2xl shadow-lg shadow-brand-red/10 hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden relative group text-xs md:text-sm font-black"
            >
              <UserPlus className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
              <span>{t('userManager.add_student')}</span>
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 bg-white p-3 md:p-4 rounded-2xl md:rounded-[28px] border border-brand-beige/10 shadow-sm">
            <div className="relative group">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-brand-beige group-focus-within:text-brand-red transition-colors", i18n.language === 'ar' ? 'right-4' : 'left-4')} />
              <input
                type="text"
                placeholder={t('userManager.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full bg-brand-cream/20 border-none rounded-xl md:rounded-2xl py-3 md:py-4 outline-none font-bold text-brand-text text-sm md:text-base",
                  i18n.language === 'ar' ? 'pr-11 pl-5 md:pr-12 md:pl-6' : 'pl-11 pr-5 md:pl-12 md:pr-6'
                )}
              />
            </div>
          </div>
          
          <div className="bg-white p-1.5 md:p-2 rounded-2xl md:rounded-[28px] border border-brand-beige/10 shadow-sm flex items-center gap-1.5 overflow-x-auto max-w-full hide-scrollbar shrink-0">
            {[
               { id: 'all', label: t('userManager.group_all') },
               { id: 'OT', label: t('userManager.group_ot') },
               { id: 'NT', label: t('userManager.group_nt') },
               { id: 'K', label: t('userManager.group_servants') }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={cn(
                  "px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase transition-all whitespace-nowrap scroll-mx-4",
                  categoryFilter === cat.id 
                    ? "bg-brand-red text-white shadow-md shadow-brand-red/15" 
                    : "text-brand-beige hover:bg-brand-cream"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
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
                  className="bg-white rounded-3xl md:rounded-[40px] border border-brand-beige/5 p-5 md:p-8 hover:shadow-2xl hover:shadow-brand-red/5 transition-all group relative overflow-hidden flex flex-col justify-between"
                >
                  {/* Status Indicator */}
                  <div className={cn(
                     "absolute top-5 left-5 md:top-8 md:left-8 w-3 h-3 rounded-full border-2 border-white shadow-sm ring-4",
                     user.status === 'active' ? "bg-emerald-500 ring-emerald-50" : "bg-rose-500 ring-rose-50"
                  )} />

                  <div>
                    <div className="flex items-center gap-4 md:gap-6 mb-6 flex-row-reverse text-right">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-[32px] bg-brand-cream flex items-center justify-center text-brand-red font-black text-2xl md:text-4xl shadow-inner overflow-hidden border-2 md:border-4 border-white">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="opacity-40">{user.fullName.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-brand-text text-base md:text-2xl line-clamp-1 tracking-tight">{user.fullName}</h3>
                        <div className="flex flex-wrap justify-end gap-1.5 mt-2 md:mt-3">
                          {user.code?.toUpperCase().startsWith('H') && (
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-50 text-blue-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-blue-100 whitespace-nowrap">عهد قديم</span>
                          )}
                          {user.code?.toUpperCase().startsWith('N') && (
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-purple-50 text-purple-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-purple-100 whitespace-nowrap">عهد جديد</span>
                          )}
                          {user.code?.toUpperCase().startsWith('S') && (
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-amber-100 whitespace-nowrap">خادم</span>
                          )}
                          {user.isExamCreator && (
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-amber-500 text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-amber-600 shadow-sm flex items-center gap-1 font-sans whitespace-nowrap">
                              <Star className="w-2 md:w-2.5 h-2 md:h-2.5 fill-white" />
                              واضع اختبارات
                            </span>
                          )}
                          {user.isAttendanceScanner && (
                            <span className="px-2 md:px-3 py-0.5 md:py-1 bg-teal-500 text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-wider border border-teal-600 shadow-sm flex items-center gap-1 font-sans whitespace-nowrap">
                              <ScanLine className="w-2 md:w-2.5 h-2 md:h-2.5" />
                              مسؤول حضور
                            </span>
                          )}
                          <span className="px-2 md:px-3 py-0.5 md:py-1 bg-brand-cream text-brand-beige rounded-full text-[8px] md:text-[9px] font-black tracking-widest border border-brand-beige/5 whitespace-nowrap">{user.code}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
                      <div className="bg-brand-cream/20 p-2.5 md:p-4 rounded-2xl md:rounded-3xl text-center border border-brand-beige/5">
                        <p className="text-[8px] md:text-[9px] text-brand-beige font-black uppercase mb-1 tracking-widest">{t('userManager.table_exams')}</p>
                        <p className="font-black text-brand-text text-sm md:text-xl tracking-tighter">{user.totalExams || 0}</p>
                      </div>
                      <div className="bg-brand-cream/20 p-2.5 md:p-4 rounded-2xl md:rounded-3xl text-center border border-brand-beige/5">
                        <p className="text-[8px] md:text-[9px] text-brand-beige font-black uppercase mb-1 tracking-widest">النقاط</p>
                        <p className="font-black text-brand-red text-sm md:text-xl tracking-tighter">{user.totalPoints || 0}</p>
                      </div>
                      <div className="bg-brand-cream/20 p-2.5 md:p-4 rounded-2xl md:rounded-3xl text-center border border-brand-beige/5">
                        <p className="text-[8px] md:text-[9px] text-brand-beige font-black uppercase mb-1 tracking-widest">الحضور</p>
                        <p className="font-black text-brand-text text-sm md:text-xl tracking-tighter">{user.loginCount || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 md:pt-6 border-t border-brand-cream/50 mt-auto">
                    {/* Row 1: Primary actions */}
                    <div className="flex items-center gap-2 md:gap-3">
                      <Link
                        to={`/admin/students/${user.uid}`}
                        className="flex-1 py-2.5 md:py-3 px-4 bg-brand-text text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm hover:bg-brand-red transition-all shadow-md hover:shadow-lg hover:shadow-brand-red/10 text-center"
                      >
                        <span>التفاصيل</span>
                      </Link>
                      {user.whatsappNumber && (
                        <a
                          href={`https://wa.me/${user.whatsappNumber.startsWith('01') ? '2' + user.whatsappNumber : user.whatsappNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 md:w-12 md:h-12 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm shrink-0"
                          title="تواصل واتساب"
                        >
                          <FaWhatsapp className="w-5 h-5 md:w-6 md:h-6" />
                        </a>
                      )}
                    </div>

                    {/* Row 2: Secondary / Admin controls */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 bg-brand-cream/30 p-1.5 rounded-xl md:rounded-2xl border border-brand-beige/5 mt-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          onClick={() => toggleStatus(user)}
                          className={cn(
                            "w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0",
                            user.status === 'active' 
                              ? "bg-rose-50 text-brand-red hover:bg-brand-red hover:text-white" 
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                          )}
                          title={user.status === 'active' ? 'تعطيل الحساب' : 'تفعيل الحساب'}
                        >
                          {user.status === 'active' ? <Ban className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                        </button>

                        <button
                          onClick={() => handleDownloadQr(user)}
                          className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all border shrink-0 bg-white hover:bg-brand-cream text-brand-text border-brand-beige/20 shadow-sm"
                          title="تحميل كارت الحضور QR"
                        >
                          <QrCode className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>

                        {user.code?.toUpperCase().startsWith('S') && (
                          <>
                            <button
                              onClick={() => handleToggleExamCreator(user)}
                              className={cn(
                                "w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all border shrink-0",
                                user.isExamCreator
                                  ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                                  : "bg-amber-50 text-amber-600 border-amber-100 hover:bg-amber-100"
                              )}
                              title={user.isExamCreator ? 'إلغاء تعيين كواضع اختبارات' : 'تعيين كواضع اختبارات (الحد الأقصى ٤)'}
                            >
                              <Star className={cn("w-3.5 h-3.5 md:w-4 md:h-4", user.isExamCreator ? "fill-white animate-pulse" : "fill-none")} />
                            </button>

                            <button
                              onClick={() => handleToggleAttendanceScanner(user)}
                              className={cn(
                                "w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all border shrink-0",
                                user.isAttendanceScanner
                                  ? "bg-teal-500 text-white border-teal-600 hover:bg-teal-600"
                                  : "bg-teal-50 text-teal-600 border-teal-100 hover:bg-teal-100"
                               )}
                               title={user.isAttendanceScanner ? 'إلغاء تعيين كمسؤول حضور' : 'تعيين كمسؤول حضور بالمسح (الحد الأقصى ٤)'}
                             >
                               <ScanLine className={cn("w-3.5 h-3.5 md:w-4 md:h-4", user.isAttendanceScanner ? "animate-pulse" : "")} />
                             </button>
                           </>
                         )}
                         
                         <button
                           onClick={() => {
                             const upperCode = user.code?.toUpperCase() || "";
                             const group = upperCode.startsWith('H') ? "OT" : upperCode.startsWith('N') ? "NT" : upperCode.startsWith('S') ? "K" : "";
                             setEditingUser(user);
                             setUserName(user.fullName);
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
                           className="w-8 h-8 md:w-9 md:h-9 bg-brand-cream text-brand-beige hover:bg-white hover:text-brand-text rounded-lg md:rounded-xl flex items-center justify-center transition-all border border-brand-beige/10 shrink-0"
                           title="تعديل"
                         >
                           <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                         </button>
                       </div>

                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setUserToDelete(user);
                         }}
                         disabled={isSubmitting}
                         className={cn(
                           "w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center transition-all shrink-0",
                           "bg-brand-cream text-brand-beige hover:bg-rose-50 hover:text-brand-red",
                           isSubmitting && "opacity-30 cursor-not-allowed"
                         )}
                         title="حذف الحساب"
                       >
                         <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                       </button>
                     </div>
                   </div>

                   {/* Admin Pass Preview on Hover */}
                   <div className="absolute top-2 right-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-text text-white px-3 py-1 rounded-full text-[9px] font-black pointer-events-none shadow-xl border border-white/10 z-10 whitespace-nowrap">
                     PASS: {user.password}
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
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.label_church')}</label>
                    <input
                      type="text"
                      value={userChurch}
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
                      value={userBirthDate}
                      onChange={(e) => setUserBirthDate(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.table_whatsapp')}</label>
                    <input
                      type="text"
                      value={userWhatsApp}
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
                      value={userCode}
                      onChange={(e) => setUserCode(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold uppercase text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.label_address')}</label>
                    <input
                      type="text"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      required
                      className="w-full bg-brand-cream rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 outline-none border-2 border-transparent focus:border-brand-red/10 font-bold text-sm md:text-base"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2 md:col-span-2">
                    <label className={cn("text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest", i18n.language === 'ar' ? 'mr-1' : 'ml-1')}>{t('userManager.table_password')}</label>
                    <input
                      type="text"
                      value={userPass}
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
