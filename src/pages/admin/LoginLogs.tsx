import { useState, useEffect, useMemo } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  deleteDoc, 
  doc, 
  writeBatch, 
  getDocs
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { LoginLog } from "../../types";
import { 
  FileSpreadsheet, 
  Search, 
  Calendar as CalendarIcon,
  Monitor,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
  AlertTriangle,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { handleFirestoreError, OperationType } from "../../lib/firebase";
import { motion, AnimatePresence } from "motion/react";

export default function LoginLogs() {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | "all" | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, "loginLogs"),
      orderBy("loginAt", "desc"),
      limit(500)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoginLog));
      setLogs(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || log.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, logs]);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "loginLogs", id));
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `loginLogs/${id}`);
    }
  };

  const handleClearAll = async () => {
    setIsDeleting(true);
    try {
      const q = query(collection(db, "loginLogs"));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "loginLogs");
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredLogs.map(log => ({
      'الاسم': log.name || 'غير معروف',
      'الكود': log.code || '-',
      'نوع الحساب': log.role === 'admin' ? 'مدير' : 'طالب',
      'تاريخ الدخول': format(new Date(log.loginAt), 'yyyy-MM-dd'),
      'وقت الدخول': log.loginTime,
      'حالة الدخول': log.status,
      'الجهاز': log.deviceInfo
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Login Logs");
    XLSX.writeFile(wb, `سجل_الدخول_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-brand-cream p-6 lg:p-12 font-bold" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white rounded-2xl shadow-sm hover:scale-110 transition-transform group">
              <ArrowRight className="w-6 h-6 text-brand-beige group-hover:text-brand-red" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-brand-text">سجل الدخول</h1>
              <p className="text-brand-beige mt-1">متابعة حركة الدخول للمنصة</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setDeleteConfirm("all")}
              disabled={logs.length === 0}
              className="flex items-center gap-3 px-6 py-4 bg-white border border-brand-beige/20 text-brand-red rounded-2xl shadow-sm hover:bg-rose-50 transition-all disabled:opacity-30"
            >
              <Trash2 className="w-5 h-5" />
              <span>مسح كل السجلات</span>
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-6 h-6" />
              <span>تصدير سجل الدخول</span>
            </button>
          </div>
        </div>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-text/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6 text-right"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl"
              >
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-brand-red mb-6 mx-auto">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-brand-text mb-4 text-center">
                  {deleteConfirm === "all" ? "مسح كل السجلات؟" : "مسح السجل؟"}
                </h3>
                <p className="text-brand-beige mb-8 font-bold text-center">
                  {deleteConfirm === "all" 
                    ? "هل أنت متأكد من مسح كل سجلات الدخول؟ لا يمكن التراجع عن هذا الإجراء." 
                    : "هل أنت متأكد من مسح هذا السجل؟"}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-4 bg-brand-cream text-brand-beige rounded-2xl font-black"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => deleteConfirm === "all" ? handleClearAll() : handleDelete(deleteConfirm)}
                    disabled={isDeleting}
                    className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black shadow-lg shadow-brand-red/10"
                  >
                    {isDeleting ? "جاري المسح..." : "تأكيد المسح"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige group-focus-within:text-brand-red transition-colors" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الكود..."
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border-2 border-transparent focus:border-brand-red/20 rounded-2xl py-4 pr-12 pl-6 outline-none shadow-sm transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
            <select
              value={statusFilter || 'all'}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border-2 border-transparent focus:border-brand-red/20 rounded-2xl py-4 pr-12 pl-6 outline-none shadow-sm transition-all appearance-none cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="ناجح">ناجح</option>
              <option value="فشل">فشل</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-[32px] overflow-hidden shadow-xl shadow-brand-red/5 border border-brand-beige/10">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-brand-cream/50 text-brand-beige text-xs uppercase tracking-[0.2em]">
                  <th className="px-8 py-6">رقم</th>
                  <th className="px-8 py-6">الاسم</th>
                  <th className="px-8 py-6">الكود</th>
                  <th className="px-8 py-6">نوع الحساب</th>
                  <th className="px-8 py-6">التاريخ والوقت</th>
                  <th className="px-8 py-6">الحالة</th>
                  <th className="px-8 py-6">الجهاز</th>
                  <th className="px-8 py-6 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-cream">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={8} className="px-8 py-6">
                        <div className="h-4 bg-brand-cream rounded-full w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-8 py-12 text-center text-brand-beige">
                      لا يوجد نتائج للبحث
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <tr key={log.id} className="hover:bg-brand-cream/20 transition-colors group">
                      <td className="px-8 py-6 text-brand-beige">{filteredLogs.length - index}</td>
                      <td className="px-8 py-6 text-brand-text">
                        {log.name || (log.role === 'admin' ? 'المدير' : 'غير معروف')}
                      </td>
                      <td className="px-8 py-6 font-mono text-sm tracking-widest text-brand-beige">
                        {log.code || '-'}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-xs font-black ${
                          log.role === 'admin' 
                            ? 'bg-amber-100 text-amber-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {log.role === 'admin' ? 'مدير' : 'طالب'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="text-brand-text">{log.loginTime}</span>
                          <span className="text-xs text-brand-beige">
                            {format(new Date(log.loginAt), 'd MMMM yyyy', { locale: ar })}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-2 font-black ${
                          log.status === 'ناجح' ? 'text-emerald-600' : 'text-brand-red'
                        }`}>
                          {log.status === 'ناجح' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          <span>{log.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 transition-opacity opacity-40 group-hover:opacity-100">
                        <div className="flex items-center gap-2 text-xs">
                          <Monitor className="w-4 h-4" />
                          <span className="truncate max-w-[150px]" title={log.deviceInfo}>
                            {log.deviceInfo.split(')')[0] + ')'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button
                          onClick={() => setDeleteConfirm(log.id!)}
                          className="p-3 hover:bg-rose-50 rounded-xl text-brand-beige hover:text-brand-red transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
