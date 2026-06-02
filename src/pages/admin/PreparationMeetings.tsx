import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  setDoc,
  where
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { notificationService } from '../../lib/notificationService';
import { saturdaySchedules, ScheduleItem } from '../../data/fixedSchedules';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit,
  Clock, 
  User as UserIcon, 
  Bell, 
  Check, 
  AlertCircle,
  HelpCircle,
  Search,
  BookOpen,
  Filter,
  Sparkles,
  Grid,
  List,
  Pin,
  TrendingUp,
  Share2,
  BookmarkCheck,
  Bookmark,
  ChevronLeft,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrepMeeting {
  id: string;
  title: string;
  description: string;
  dateTime: string;
  createdAt: any;
  createdBy: string;
  reminderSent12h: boolean;
}

const isPastDateTime = (dateTimeStr: string) => {
  return new Date(dateTimeStr).getTime() < Date.now();
};

export default function PreparationMeetings() {
  const { user, isAdmin } = useAuth();
  const [meetings, setMeetings] = useState<PrepMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [now] = useState(() => Date.now());

  // Navigation: 'booklet' | 'saturday' | 'prep_servants'
  const [activeTab, setActiveTab] = useState<'booklet' | 'saturday' | 'prep_servants'>('booklet');
  const [editingMeeting, setEditingMeeting] = useState<PrepMeeting | null>(null);
  
  // Style view: 'grid' | 'table'
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid');
  
  // Topic types filters: 'all' | 'lessons' | 'exams' | 'special'
  const [filterType, setFilterType] = useState<'all' | 'lessons' | 'exams' | 'special'>('all');
  
  const [searchTerm, setSearchTerm] = useState('');

  // Form State for Custom Servant Prep meetings
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check scheduling privileges
  const canManageMeetings = isAdmin || user?.isMeetingScheduler === true;

  // Realtime subscription for user's favorites
  const [favoriteTopics, setFavoriteTopics] = useState<string[]>([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const keys = snapshot.docs.map(docSnap => docSnap.id.replace(user.uid + "_", ""));
      setFavoriteTopics(keys);
    }, (error) => {
      console.error("Error fetching favorites:", error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const getTopicKey = (type: 'saturday' | 'thursday', date: string) => {
    return `${type}_${date.trim().replace(/\s+/g, '')}`;
  };

  const isFavorite = (type: 'saturday' | 'thursday', date: string) => {
    return favoriteTopics.includes(getTopicKey(type, date));
  };

  const toggleFavorite = async (type: 'saturday' | 'thursday', item: any) => {
    if (!user?.uid) {
      triggerNotification('error', 'يرجى تسجيل الدخول أولاً لتحديد موضوعاتك المفضلة.');
      return;
    }

    const key = getTopicKey(type, item.date);
    const docId = `${user.uid}_${key}`;

    if (favoriteTopics.includes(key)) {
      try {
        await deleteDoc(doc(db, 'favorites', docId));
        triggerNotification('success', 'تم إزالة الموضوع من مفضلتك.');
      } catch (err) {
        console.error(err);
        triggerNotification('error', 'فشل في إزالة الموضوع من المفضلة.');
      }
    } else {
      try {
        await setDoc(doc(db, 'favorites', docId), {
          userId: user.uid,
          userEmail: user.email || "",
          type,
          date: item.date,
          topic1: item.topic1,
          topic2: item.topic2 || "",
          createdAt: new Date().toISOString(),
          notified: false
        });
        triggerNotification('success', 'تمت إضافة الموضوع لمفضلتك! ستحصل على تنبيه تذكيري قبل موعد المحاضرة المذكور. 🔔⭐');
      } catch (err) {
        console.error(err);
        triggerNotification('error', 'فشل في إضافة الموضوع للمفضلة.');
      }
    }
  };

  // Realtime subscription for meetings
  useEffect(() => {
    const q = query(
      collection(db, 'preparationMeetings'), 
      orderBy('dateTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as PrepMeeting[];
      setMeetings(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching meetings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const triggerNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageMeetings) {
      triggerNotification('error', 'عذراً، ليس لديك الصلاحية لجدولة الاجتماعات.');
      return;
    }

    if (!title.trim() || !dateTime || !description.trim()) {
      triggerNotification('error', 'يرجى ملء جميع الحقول المطلوبة!');
      return;
    }

    // Validate past dates only if datetime changed
    if (!editingMeeting || editingMeeting.dateTime !== dateTime) {
      if (isPastDateTime(dateTime)) {
        triggerNotification('error', 'لا يمكن جدولة اجتماع في الماضي!');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (editingMeeting) {
        const meetingRef = doc(db, 'preparationMeetings', editingMeeting.id);
        const updatedMeeting = {
          ...editingMeeting,
          title: title.trim(),
          description: description.trim(),
          dateTime,
          reminderSent12h: editingMeeting.dateTime !== dateTime ? false : (editingMeeting.reminderSent12h || false),
          immediateSent: editingMeeting.dateTime !== dateTime ? false : ((editingMeeting as any).immediateSent || false)
        };

        await setDoc(meetingRef, updatedMeeting);
        triggerNotification('success', 'تم تعديل الاجتماع بنجاح.');
        setEditingMeeting(null);
      } else {
        await addDoc(collection(db, 'preparationMeetings'), {
          title: title.trim(),
          description: description.trim(),
          dateTime,
          createdAt: new Date().toISOString(),
          createdBy: user?.fullName || 'مسؤول الخدمة',
          reminderSent12h: false
        });

        const dateFormatted = new Date(dateTime).toLocaleString('ar-EG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        await notificationService.sendNotification({
          title: `📅 اجتماع تحضيري جديد للخدمة`,
          message: `تمت جدولة اجتماع تحضيري رئيسي جديد بعنوان "${title.trim()}" يوم (${dateFormatted}). يرجى من جميع الخدام الاستعداد وتجهيز الفقرات للخدمة! ⛪📿`,
          type: 'info',
          category: 'announcements',
          targetGroups: ['servant']
        });

        triggerNotification('success', 'تم جدولة الاجتماع بنجاح وإرسال إشعار فوري لجميع الخدام! 🔔');
      }

      setTitle('');
      setDescription('');
      setDateTime('');
    } catch (err: any) {
      console.error(err);
      triggerNotification('error', 'حدث خطأ أثناء حفظ الاجتماع، يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (id: string, meetingTitle: string) => {
    if (!canManageMeetings) return;
    if (!window.confirm(`هل أنت متأكد من حذف اجتماع: "${meetingTitle}"؟`)) return;

    try {
      await deleteDoc(doc(db, 'preparationMeetings', id));
      triggerNotification('success', 'تم إلغاء وحذف الاجتماع بنجاح.');
    } catch (err) {
      console.error(err);
      triggerNotification('error', 'فشل حذف الاجتماع.');
    }
  };

  // Date Parsing Utilities to find "Next Upcoming" based on Year 2026
  const getParsedDate = (itemDate: string): Date => {
    const parts = itemDate.split('/');
    const day = parseInt(parts[0]?.trim() || '1');
    const month = parseInt(parts[1]?.trim() || '1') - 1; // 0-indexed month
    return new Date(2026, month, day, 19, 0, 0); // Saturday/Thursday approx 7 PM
  };

  // Determine if a meeting is the immediate upcoming one
  const getUpcomingItem = (items: ScheduleItem[]): ScheduleItem | null => {
    const sorted = [...items]
      .map(item => ({ ...item, dateObj: getParsedDate(item.date) }))
      .filter(item => item.dateObj.getTime() >= now)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    return sorted.length > 0 ? sorted[0] : null;
  };

  const nextSaturdayMeeting = getUpcomingItem(saturdaySchedules);

  // Apply filters on lists
  const filterSchedule = (schedule: ScheduleItem[]) => {
    return schedule.filter(item => {
      // 1. Text Search matching
      const matchesSearch = 
        item.topic1.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.topic2 && item.topic2.toLowerCase().includes(searchTerm.toLowerCase())) ||
        item.date.includes(searchTerm);
      
      if (!matchesSearch) return false;

      // 2. Type filters
      if (filterType === 'exams') {
        return item.topic1.includes('امتحان') || (item.topic2 && item.topic2.includes('امتحان'));
      }
      if (filterType === 'special') {
        return item.isSpecialEvent === true;
      }
      if (filterType === 'lessons') {
        const isExam = item.topic1.includes('امتحان') || (item.topic2 && item.topic2.includes('امتحان'));
        return !item.isSpecialEvent && !isExam;
      }

      return true;
    });
  };

  const filteredSaturdays = filterSchedule(saturdaySchedules);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 print:p-0 print:bg-white" dir="rtl">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-6 right-6 md:left-auto md:w-96 p-4 rounded-2xl shadow-xl z-50 flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50 border-rose-100 text-brand-red'
            }`}
          >
            {notification.type === 'success' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
            )}
            <p className="text-xs md:text-sm font-bold leading-relaxed">{notification.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner - hidden on print */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-text p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-2xl relative overflow-hidden text-white print:hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-red/10 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg shadow-brand-red/20 shrink-0">
            <CalendarIcon className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">جدول المناهج والاجتماعات</h1>
            <p className="text-xs md:text-sm opacity-60 font-medium mt-1">المناهج المعتمدة رسمياً والمحاضرات المقررة بالإضافة إلى مواعيد اجتماعات الخدام</p>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-10 shrink-0 self-start md:self-auto">
          <button 
            id="btn-print"
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-black transition-colors"
          >
            <Printer className="w-4 h-4 text-brand-red" />
            <span>طباعة الجدول</span>
          </button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>متصل</span>
          </div>
        </div>
      </div>

      {/* Smart Next-Up Dynamic Highlight Section - hidden on print */}
      {nextSaturdayMeeting && activeTab !== 'prep_servants' && (
        <div className="grid grid-cols-1 gap-6 print:hidden">
          <div id="next-saturday-banner" className="bg-gradient-to-br from-amber-50 to-orange-50/50 p-5 rounded-3xl border border-amber-200/60 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div className="space-y-1 flex-1">
              <span className="inline-block px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full mb-1">الدرس القادم بالمنهج الأسبوعي (السبت) 🌟</span>
              <h4 className="font-black text-brand-text text-sm leading-snug">{nextSaturdayMeeting.topic1} {nextSaturdayMeeting.topic2 ? `| ${nextSaturdayMeeting.topic2}` : ''}</h4>
              <p className="text-[11px] text-brand-beige font-bold flex items-center gap-1">
                <span>الموافق السبت {nextSaturdayMeeting.date}</span>
              </p>
            </div>
          </div>
        </div>
      )}


      {/* Modern Booklet / Saturday Navigation Panel - hidden on print */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-brand-cream/30 p-3 rounded-[28px] border border-brand-beige/12 print:hidden shadow-sm">
        <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
          <button
            id="tab-booklet"
            onClick={() => { setActiveTab('booklet'); }}
            className={`py-3 px-4 rounded-[18px] font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === 'booklet'
                ? 'bg-brand-red text-white shadow-lg'
                : 'text-brand-text hover:text-brand-red hover:bg-white/50'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>عرض الجدول الشامل 📖</span>
          </button>

          <button
            id="tab-saturday"
            onClick={() => { setActiveTab('saturday'); }}
            className={`py-3 px-4 rounded-[18px] font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === 'saturday'
                ? 'bg-brand-red text-white shadow-lg'
                : 'text-brand-text hover:text-brand-red hover:bg-white/50'
            }`}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>منهج السبت الأسبوعي</span>
          </button>

          <button
            id="tab-prep-servants"
            onClick={() => { setActiveTab('prep_servants'); }}
            className={`py-3 px-4 rounded-[18px] font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === 'prep_servants'
                ? 'bg-brand-red text-white shadow-lg'
                : 'text-brand-text hover:text-brand-red hover:bg-white/50'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>اجتماعات الخدام 👥</span>
          </button>
        </div>

        {/* Live Controls on Grid/Table view */}
        {activeTab !== 'prep_servants' && (
          <div className="flex items-center gap-3 self-center lg:self-auto border-t lg:border-t-0 pt-2 lg:pt-0 border-brand-beige/10">
            <span className="text-xs font-black text-brand-beige">طريقة العرض:</span>
            <div className="flex bg-white rounded-xl p-1 border border-brand-beige/10 shadow-sm shrink-0">
              <button
                id="btn-view-grid"
                onClick={() => setViewStyle('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewStyle === 'grid' 
                    ? 'bg-brand-cream text-brand-red' 
                    : 'text-gray-400 hover:text-brand-text'
                }`}
                title="عرض بطاقات تفاعلية"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                id="btn-view-table"
                onClick={() => setViewStyle('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewStyle === 'table' 
                    ? 'bg-brand-cream text-brand-red' 
                    : 'text-gray-400 hover:text-brand-text'
                }`}
                title="عرض جدول مدمج"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH AND QUICK GRAPHICAL FILTERS - hidden on print */}
      {activeTab !== 'prep_servants' && (
        <div className="bg-white p-5 rounded-[24px] border border-brand-beige/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 print:hidden">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-black text-brand-text ml-2 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-brand-red" />
              تصفية سريعة:
            </span>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'lessons', label: 'الموضوعات والدروس' },
                { id: 'exams', label: 'أيام الامتحانات' },
                { id: 'special', label: 'أيام النهضات والمناسبات' }
              ].map(opt => (
                <button
                  key={opt.id}
                  id={`filter-opt-${opt.id}`}
                  onClick={() => setFilterType(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    filterType === opt.id 
                      ? 'bg-brand-cream text-brand-red border border-brand-red/20' 
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Field */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-brand-beige absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-schedules"
              type="text"
              placeholder="ابحث بموضوع أو تاريخ (مثال: صموئيل)..."
              className="w-full pr-10 pl-4 py-2.5 border border-brand-cream bg-brand-cream/10 text-brand-text rounded-xl focus:border-brand-red outline-none text-xs font-bold transition-colors"
              value={searchTerm || ''}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* =========================================
          VIEW MODE 1: BOOKLET WORKSPACE (THE PRINTABLE AND CLASSIC DUAL COLUMN VIEW)
          ========================================= */}
      {activeTab === 'booklet' && (
        <div id="classical-booklet-view" className="bg-white p-6 md:p-10 rounded-[32px] shadow-sm border border-brand-beige/10 space-y-8 print:p-0 print:border-none print:shadow-none">
          <div className="flex flex-col md:flex-row items-center justify-between border-b border-gray-100 pb-4 gap-4">
            <div className="text-right">
              <span className="text-xs font-bold text-brand-red uppercase tracking-wide">النسخة الرسمية للجدول المقرر</span>
              <h2 className="text-xl md:text-2xl font-black text-brand-text flex items-center gap-2 mt-1">
                <span>الجدول الشامل لمناهج ومواعيد الاجتماعات</span>
                <span className="text-xs font-black px-2 py-0.5 bg-brand-cream text-brand-red rounded-full">العام الدراسي 2026</span>
              </h2>
            </div>
            <p className="text-xs text-brand-beige font-semibold max-w-xs text-center md:text-left leading-relaxed">
              عرض متناسق وجدول منسق يحتوي على المنهج بالكامل تسهيلاً للحفظ، والطباعة، والمتابعة.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 print:grid-cols-1">
            
            {/* Saturday Weekly Curriculum */}
            <div id="saturday-testament-side" className="space-y-4">
              <div className="flex items-center justify-between bg-brand-text text-white p-4 rounded-2xl shadow-sm">
                <span className="font-black text-sm">جدول لقاء السبت الأسبوعي المقرر ⛪📖</span>
                <span className="text-xs bg-brand-red px-2.5 py-1 rounded-lg text-white font-mono font-bold">13/6 - 3/10</span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-brand-beige/12">
                <table className="w-full border-collapse text-right text-xs">
                  <thead>
                    <tr className="bg-brand-cream/40 text-brand-text font-black border-b border-brand-beige/12">
                      <th className="p-3 text-center w-16">التاريخ</th>
                      <th className="p-3">الفقرة الأولى (الموضوع الرئيسي)</th>
                      <th className="p-3">الفقرة الثانية (التكملة والتحليل)</th>
                      <th className="p-3 text-center w-12 print:hidden">مفضّلة ⭐</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSaturdays.map((item, idx) => {
                      const isNext = nextSaturdayMeeting && nextSaturdayMeeting.date === item.date;
                      const isFav = isFavorite('saturday', item.date);
                      return (
                        <tr 
                          key={idx} 
                          className={`hover:bg-brand-cream/10 transition-colors ${
                              isNext ? 'bg-amber-50/50 font-bold border-r-4 border-r-amber-500' : ''
                          } ${item.isSpecialEvent ? 'bg-rose-50/25' : ''}`}
                        >
                          <td className="p-3 text-center font-mono font-bold text-brand-red whitespace-nowrap">
                            {item.date}
                            {isNext && <span className="block text-[8px] text-amber-600 font-bold">التالي 🌟</span>}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-brand-text">{item.topic1}</span>
                            {item.isSpecialEvent && <span className="mr-1.5 inline-block text-[9px] bg-rose-100 text-brand-red px-1.5 py-0.5 rounded">حدث خاص</span>}
                          </td>
                          <td className="p-3 text-gray-500 font-medium">
                            {item.topic2 || <span className="text-gray-400 italic font-normal">-</span>}
                          </td>
                          <td className="p-3 text-center print:hidden">
                            <button
                              onClick={() => toggleFavorite('saturday', item)}
                              className="p-1 focus:outline-none transition-transform hover:scale-125 duration-200"
                              title={isFav ? "إزالة من المفضلة" : "تفضيل لتلقي تنبيه تذكيري 🔔"}
                            >
                              {isFav ? (
                                <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                              ) : (
                                <Bookmark className="w-4 h-4 text-gray-300 hover:text-amber-500/70" />
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSaturdays.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-gray-400 font-bold">لا توجد مواعيد مطابقة لفلتر البحث حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* =========================================
          VIEW MODE 2: SATURDAY WORKSPACE
          ========================================= */}
      {activeTab === 'saturday' && (
        <div id="saturday-curriculum-view" className="space-y-6">
          {viewStyle === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {filteredSaturdays.map((item, index) => {
                  const isNext = nextSaturdayMeeting && nextSaturdayMeeting.date === item.date;
                  return (
                    <motion.div
                      key={index}
                      id={`saturday-card-${index}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`group p-5 rounded-[24px] border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                        isNext
                          ? 'bg-amber-50/40 border-amber-300 shadow-lg shadow-amber-500/5 ring-2 ring-amber-400/20'
                          : item.isSpecialEvent 
                            ? 'bg-rose-50/50 border-brand-red/15' 
                            : 'bg-white border-brand-beige/10 hover:shadow-xl hover:shadow-brand-red/5 hover:border-brand-red/15'
                      }`}
                    >
                      {item.isSpecialEvent && (
                        <div className="absolute top-0 left-0 bg-brand-red text-white text-[9px] font-black px-2.5 py-1 rounded-br-2xl uppercase tracking-wider">حدث خاص</div>
                      )}
                      
                      {isNext && (
                        <div className="absolute top-0 left-0 bg-amber-500 text-white text-[9px] font-black px-2.5 py-1 rounded-br-2xl uppercase tracking-wider">المحاضرة القادمة ✨</div>
                      )}

                      {/* Favorite Button */}
                      <div className="absolute top-4 left-4 z-10 print:hidden">
                        <button
                          onClick={() => toggleFavorite('saturday', item)}
                          className="p-1.5 rounded-full bg-brand-cream/80 hover:bg-brand-cream border border-brand-beige/10 shadow-sm active:scale-95 transition-all text-amber-500 focus:outline-none cursor-pointer"
                          title={isFavorite('saturday', item.date) ? "إزالة من المفضلة" : "تفضيل لتلقي تنبيه تذكيري 🔔"}
                        >
                          {isFavorite('saturday', item.date) ? (
                            <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5 text-brand-beige hover:text-amber-500/70" />
                          )}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                            isNext 
                              ? 'bg-amber-500 text-white border-amber-500'
                              : item.isSpecialEvent
                                ? 'bg-brand-red text-white border-brand-red'
                                : 'bg-brand-cream/40 border-brand-beige/15 text-brand-text group-hover:bg-brand-cream group-hover:text-brand-red'
                          }`}>
                            <span className="text-[9px] font-black mb-0.5">{item.dayText}</span>
                            <span className="text-base font-black font-mono leading-none">{item.date.split('/')[0].trim()}</span>
                            <span className="text-[8px] font-bold mt-0.5 opacity-80">/{item.date.split('/')[1].trim()}</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-black text-brand-beige block uppercase tracking-wider mb-0.5">التاريخ واليوم المعتمد</span>
                            <span className="text-xs font-black text-brand-text">السبت الموافق {item.date}</span>
                          </div>
                        </div>

                        {/* Topics Content */}
                        <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-100">
                          {item.isSpecialEvent ? (
                            <div className="p-3 bg-brand-cream/20 rounded-xl text-center">
                              <Sparkles className="w-5 h-5 text-brand-red mx-auto mb-1 animate-pulse" />
                              <h3 className="font-black text-brand-red text-sm">{item.topic1}</h3>
                              <p className="text-[10px] text-brand-beige font-bold mt-1">صلوات روحية وتجهيز روحي مبهج</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <span className="text-[9px] font-black px-2 py-0.5 bg-brand-cream text-brand-text rounded-md">الفقرة الأولى</span>
                                <h4 className="font-black text-brand-text text-sm leading-tight mt-1 group-hover:text-brand-red transition-colors">{item.topic1}</h4>
                              </div>
                              {item.topic2 && (
                                <div className="pt-1.5 border-t border-gray-50 mt-1">
                                  <span className="text-[9px] font-black px-2 py-0.5 bg-brand-cream text-brand-text rounded-md">الفقرة الثانية</span>
                                  <h4 className="font-black text-brand-text text-sm leading-tight mt-1">{item.topic2}</h4>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredSaturdays.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-400 space-y-4">
                  <AlertCircle className="w-12 h-12 text-brand-beige mx-auto" />
                  <p className="font-black">لا توجد نتائج مطابقة لبحثك في منهج طلاب اونلاين.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-brand-beige/10 overflow-hidden shadow-sm">
              <table className="w-full text-right text-xs md:text-sm">
                <thead>
                  <tr className="bg-brand-cream/40 border-b border-brand-beige/10 font-bold text-brand-text">
                    <th className="p-4 text-center w-20">تاريخ السبت</th>
                    <th className="p-4">الفقرة الأولى</th>
                    <th className="p-4">الفقرة الثانية</th>
                    <th className="p-4 text-center w-12 print:hidden">مفضّلة ⭐</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSaturdays.map((item, idx) => {
                    const isFav = isFavorite('saturday', item.date);
                    return (
                      <tr key={idx} className={item.isSpecialEvent ? 'bg-rose-50/20' : ''}>
                        <td className="p-4 text-center font-mono font-bold text-brand-red">{item.date}</td>
                        <td className="p-4 font-black text-brand-text">{item.topic1}</td>
                        <td className="p-4 text-gray-500">{item.topic2 || '-'}</td>
                        <td className="p-4 text-center print:hidden">
                          <button
                            onClick={() => toggleFavorite('saturday', item)}
                            className="p-1 focus:outline-none transition-transform hover:scale-125 duration-200"
                            title={isFav ? "إزالة من المفضلة" : "تفضيل لتلقي تنبيه تذكيري 🔔"}
                          >
                            {isFav ? (
                              <BookmarkCheck className="w-4 h-4 text-amber-500 fill-amber-500" />
                            ) : (
                              <Bookmark className="w-4 h-4 text-gray-300 hover:text-amber-500/70" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}




      {/* =========================================
          VIEW MODE 4: CUSTOM SERVANT MEETINGS & WORKSPACE
          ========================================= */}
      {activeTab === 'prep_servants' && (
        <div id="prep_servants_workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Scheduled Preparation Meetings list */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-brand-beige/10 pb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 border-b border-gray-100 pb-4 gap-3">
                <div className="text-right">
                  <h2 className="text-lg md:text-xl font-black text-brand-text flex items-center gap-2">
                    <span>جدول اجتماعات الخدمة والتحضير</span>
                    <span className="text-xs font-bold font-mono px-2.5 py-0.5 bg-brand-cream text-brand-red rounded-full">
                      {meetings.length}
                    </span>
                  </h2>
                  <p className="text-xs text-brand-beige font-semibold mt-1">توقيتات خاصة للمحاضرين واجتماعات الخدام</p>
                </div>

                <button 
                  id="btn-trigger-reminders"
                  onClick={() => {
                    fetch("/api/system/check-reminders", { method: "POST" })
                      .then(res => {
                        if (!res.ok) throw new Error("HTTP error " + res.status);
                        return res.json();
                      })
                      .then(() => triggerNotification('success', 'تم التحقق من تذكيرات المواعيد وبث الإشعارات بالخلفية!'))
                      .catch(e => {
                        console.error(e);
                        triggerNotification('error', 'فشل بث التحديثات.');
                      });
                  }}
                  className="text-xs font-black text-brand-red hover:underline flex items-center gap-1.5 cursor-pointer bg-brand-cream/40 px-3 py-2 rounded-xl transition-all hover:bg-brand-cream self-end sm:self-auto"
                >
                  <Bell className="w-3.5 h-3.5 animate-bounce" />
                  <span>فحص وبث التنبيهات</span>
                </button>
              </div>

              {loading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="inline-block w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-bold text-gray-400">جاري تحميل الاجتماعات...</p>
                </div>
              ) : meetings.length === 0 ? (
                <div className="py-16 text-center text-gray-400 max-w-sm mx-auto space-y-4">
                  <div className="w-16 h-16 bg-brand-cream rounded-2xl flex items-center justify-center mx-auto text-brand-red">
                    <Clock className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-brand-text text-base">لا توجد اجتماعات للمراجعة</h3>
                    <p className="text-xs leading-relaxed text-brand-beige mt-1">المحاضر واللقاءات التحضيرية يتم ترتيبها ونشرها من قبل لجنة الإشراف لتنظيم الخدمات والصلوات.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {meetings.map((meeting) => {
                    const meetingDate = new Date(meeting.dateTime);
                    const isPast = meetingDate.getTime() < now;
                    
                    const dayNum = meetingDate.getDate();
                    const monthName = meetingDate.toLocaleString('ar-EG', { month: 'long' });
                    const weekDayName = meetingDate.toLocaleString('ar-EG', { weekday: 'long' });
                    const timeStr = meetingDate.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });

                    return (
                      <motion.div
                        layout
                        key={meeting.id}
                        id={`servant-meeting-item-${meeting.id}`}
                        className={`group p-5 rounded-[24px] border transition-all duration-300 relative overflow-hidden ${
                          isPast 
                            ? 'bg-gray-50/70 border-gray-200/50 opacity-75' 
                            : 'bg-white border-brand-beige/10 hover:shadow-xl hover:shadow-brand-red/5 hover:border-brand-red/15'
                        }`}
                      >
                        {isPast && (
                          <span className="absolute left-6 top-3 bg-gray-200/60 text-gray-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">أرشيف</span>
                        )}

                        <div className="flex flex-col md:flex-row gap-5 items-start">
                          <div className={`w-16 h-20 rounded-2xl flex flex-col items-center justify-center shrink-0 border transition-all ${
                            isPast 
                              ? 'bg-gray-100 border-gray-200 text-gray-400' 
                              : 'bg-brand-cream/40 border-brand-beige/15 text-brand-red group-hover:bg-brand-red group-hover:text-white'
                          }`}>
                            <span className="text-[10px] font-black leading-none opacity-80 mb-1">{weekDayName}</span>
                            <span className="text-2xl font-black font-mono leading-none">{dayNum}</span>
                            <span className="text-[9px] font-bold leading-none mt-1 opacity-70 truncate max-w-[50px]">{monthName}</span>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div className="space-y-1">
                              <h3 className="font-black text-brand-text text-base md:text-lg group-hover:text-brand-red transition-colors">
                                {meeting.title}
                              </h3>
                              <p className="text-xs md:text-sm text-gray-500 font-medium whitespace-pre-wrap leading-relaxed">
                                {meeting.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold text-brand-text opacity-70 pt-2 border-t border-dashed border-gray-100 mt-2">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-brand-red shrink-0" />
                                <span>{timeStr}</span>
                              </span>
                              
                              <span className="flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5 text-brand-red shrink-0" />
                                <span>بواسطة: {meeting.createdBy || 'مسؤول الخدمة'}</span>
                              </span>

                              {meeting.reminderSent12h ? (
                                <span className="flex items-center gap-1 text-emerald-600 text-[10px] md:text-xs">
                                  <Check className="w-3.5 h-3.5" />
                                  المنبه نشط وبث بنجاح
                                </span>
                              ) : !isPast && (
                                <span className="flex items-center gap-1 text-purple-600 text-[10px] md:text-xs animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                  منبه الـ 12 ساعة مبرمج
                                </span>
                              )}
                            </div>
                          </div>

                          {canManageMeetings && (
                            <div className="flex gap-2 shrink-0 self-end md:self-start">
                              <button
                                id={`edit-meeting-${meeting.id}`}
                                onClick={() => {
                                  setEditingMeeting(meeting);
                                  setTitle(meeting.title);
                                  setDescription(meeting.description || '');
                                  setDateTime(meeting.dateTime);
                                  document.getElementById('meeting-form-container')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="p-2.5 bg-brand-cream/50 hover:bg-brand-red hover:text-white text-brand-text rounded-xl transition-all hover:scale-105 cursor-pointer"
                                title="تعديل الاجتماع"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              
                              <button
                                id={`delete-meeting-${meeting.id}`}
                                onClick={() => handleDeleteMeeting(meeting.id, meeting.title)}
                                className="p-2.5 bg-rose-50 hover:bg-brand-red hover:text-white text-brand-red rounded-xl transition-all hover:scale-105 cursor-pointer"
                                title="حذف الاجتماع"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Scheduled / Creator Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div id="meeting-form-container" className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-brand-beige/10">
              <h2 className="text-lg md:text-xl font-black text-brand-text mb-6 border-b border-gray-100 pb-4">
                {editingMeeting ? "تعديل اللقاء التحضيري" : "جدولة لقاء تحضيري جديد"}
              </h2>

              {canManageMeetings ? (
                <form id="form-create-prep-meeting" onSubmit={handleCreateMeeting} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-black text-brand-text">عنوان الاجتماع *</label>
                    <input
                      id="input-title"
                      type="text"
                      required
                      placeholder="مثال: تحضير نهضة العذراء مريم وتنسيق الكوادر..."
                      className="w-full p-4 border border-brand-cream bg-brand-cream/20 text-brand-text text-sm rounded-xl focus:border-brand-red outline-none transition-colors"
                      value={title || ''}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-black text-brand-text">التاريخ ووقت البدء *</label>
                    <input
                      id="input-dateTime"
                      type="datetime-local"
                      required
                      className="w-full p-4 border border-brand-cream bg-brand-cream/20 text-brand-text text-sm rounded-xl focus:border-brand-red outline-none transition-colors"
                      value={dateTime || ''}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                    <p className="text-[10px] text-brand-beige/80 leading-relaxed font-semibold">
                      تأكد من اختيار الساعة بالضبط لضمان إرسال التذكيرات الإلكترونية التلقائية للخدام.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs md:text-sm font-black text-brand-text">جدول الأعمال وتوزيع المهام *</label>
                    <textarea
                      id="input-description"
                      required
                      rows={5}
                      placeholder="اكتب الأجندة بالتفصيل وموضوعات النقاش للخدام لتحضيرها مسبقاً..."
                      className="w-full p-4 border border-brand-cream bg-brand-cream/20 text-brand-text text-sm rounded-xl focus:border-brand-red outline-none transition-colors"
                      value={description || ''}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <button
                    id="btn-submit-prep"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-brand-red text-white font-black text-sm uppercase tracking-wider flex justify-center items-center gap-2 hover:bg-brand-text transition-colors disabled:opacity-50 font-bold"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-5 h-5 pointer-events-none" />
                        <span>{editingMeeting ? "حفظ التعديلات ونشر التحديث" : "نشر الموعد وإرسال إشعارات للخدام"}</span>
                      </>
                    )}
                  </button>

                  {editingMeeting && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMeeting(null);
                        setTitle('');
                        setDescription('');
                        setDateTime('');
                      }}
                      className="w-full py-3 rounded-xl border border-brand-beige text-brand-text font-black text-sm hover:bg-brand-cream/50 transition-colors mt-2"
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </form>
              ) : (
                <div className="p-6 bg-brand-cream/40 border border-brand-beige/10 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-black text-brand-text text-xs shadow-sm pl-2">حساب غير مخصص للجدولة</h3>
                    <p className="text-[11px] text-brand-beige leading-relaxed max-w-xs">
                      أنت مسجل كخادم ولكن لا تملك صلاحية التعديل. تفضل بمراجعة المواعيد المبرمجة باليسار، أو تواصل مع الأدمن للحصول على الصلاحية الكاملة.
                    </p>
                  </div>
                  {user && (
                    <div className="text-[10px] font-black font-mono text-brand-red px-3 py-1 bg-brand-cream rounded-full">
                      كودك التعريفي: {user.code}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Smart Tips Info widget */}
            <div className="bg-brand-cream/25 p-6 rounded-[24px] border border-brand-beige/10 space-y-4">
              <h3 className="text-sm font-black text-brand-text flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-brand-red" />
                <span>دليل مواعيد تحضير الخدمة</span>
              </h3>
              <ul className="space-y-2.5 text-xs text-brand-beige leading-relaxed list-disc pr-4 font-semibold">
                <li>
                  <strong>نشر فوري:</strong> بمجرد جدولة الموعد، سيتلقى كل الخدام إشعاراً فورياً على لوحة الإشعارات وجرس التنبيه بالهاتف أو المتصفح.
                </li>
                <li>
                  <strong>تحضير الفقرات:</strong> يسهل هذا الجدول مشاركة محضر الاستعداد وطبيعة العهد المطلوب نقاشه قبل الحصص التفاعلية.
                </li>
              </ul>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
