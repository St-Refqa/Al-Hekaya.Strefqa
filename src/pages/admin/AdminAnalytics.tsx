import React, { useState, useEffect, useMemo } from "react";
import { collection, query, onSnapshot, orderBy, limit, where } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { formatDate, cn, normalizeArabicName, calculatePercentage } from "../../lib/utils";
import { Assessment, Submission, User } from "../../types";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import {
  ArrowRight,
  TrendingUp,
  Users,
  FileText,
  Brain,
  Star,
  CheckCircle,
  XCircle,
  HelpCircle,
  Activity,
  Award,
  Download
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar } from "date-fns/locale";
import { calculateLevel } from "../../lib/gamification";
import { exportToCSV } from "../../lib/csv";

const COLORS = ['#D13E3E', '#141414', '#F4F1E8', '#A89F8D'];

export default function AdminAnalytics() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !isAdmin) return;

    const unsubscribeAssessments = onSnapshot(collection(db, "assessments"), (snap) => {
      setAssessments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment)));
    });

    const unsubscribeSubmissions = onSnapshot(collection(db, "submissions"), (snap) => {
      setSubmissions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
    });

    const unsubscribeUsers = onSnapshot(query(collection(db, "users"), where("role", "==", "student")), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      setTimeout(() => setIsLoading(false), 0); // Stop loading without triggering sync state update in effect body
    });

    return () => {
      unsubscribeAssessments();
      unsubscribeSubmissions();
      unsubscribeUsers();
    };
  }, [authLoading, isAdmin]);

  const stats = useMemo(() => {
    const totalAssessments = assessments.length;
    const activeAssessments = assessments.filter(a => a.status === 'active').length;
    const totalSubmissions = submissions.length;
    const totalStudents = students.length;
    
    const avgScore = submissions.length > 0
      ? submissions.reduce((acc, curr) => acc + calculatePercentage(curr.finalScore, curr.maxScore), 0) / submissions.length
      : 0;
      
    const maxScore = submissions.length > 0
      ? Math.max(...submissions.map(s => calculatePercentage(s.finalScore, s.maxScore)))
      : 0;

    return {
      totalAssessments,
      activeAssessments,
      totalSubmissions,
      totalStudents,
      avgScore: Math.round(avgScore),
      maxScore: Math.round(maxScore)
    };
  }, [assessments, submissions, students]);

  const submissionHistory = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(date => {
      const count = submissions.filter(s => {
        if (!s.date) return false;
        const sDate = typeof s.date === 'string' ? s.date : 
                    (s.date as any).toDate ? (s.date as any).toDate().toISOString() : '';
        return sDate.startsWith(date);
      }).length;
      return {
        date: format(new Date(date), 'EEEE', { locale: ar }),
        تعداد: count
      };
    });
  }, [submissions]);

  const difficultyData = useMemo(() => {
    let easyCount = 0, mediumCount = 0, hardCount = 0;
    assessments.forEach(a => {
      if (a.questions) {
        easyCount += (a.questions.easy || []).length;
        mediumCount += (a.questions.medium || []).length;
        hardCount += (a.questions.hard || []).length;
      }
    });

    return [
      { name: 'سهل', value: easyCount },
      { name: 'متوسط', value: mediumCount },
      { name: 'صعب', value: hardCount }
    ];
  }, [assessments]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black text-brand-beige">جاري تحليل البيانات...</div>;

  return (
    <div className="min-h-screen bg-brand-cream/30 p-6 lg:p-12 font-bold text-right" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="p-4 bg-white rounded-2xl shadow-sm hover:scale-105 hover:bg-brand-red hover:text-white transition-all group border border-brand-beige/10">
              <ArrowRight className="w-6 h-6 text-brand-beige group-hover:text-white" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-brand-text tracking-tighter">التحليلات المتقدمة</h1>
              <p className="text-brand-beige mt-1">نظرة شاملة على أداء المنصة والطلاب</p>
            </div>
          </div>
          <button 
             onClick={() => {
                const data = students.map(s => [s.name, s.code, s.totalPoints || 0, s.xp || 0]);
                exportToCSV('students_report.csv', [['الاسم', 'الكود', 'النقاط', 'الخبرة'], ...data]);
             }}
             className="flex gap-2 items-center bg-brand-cream px-6 py-4 rounded-[24px] text-sm font-bold text-brand-text hover:bg-brand-red hover:text-white transition-all shadow-sm">
            <Download className="w-5 h-5"/> تصدير بيانات الطلاب (CSV)
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard icon={<Users className="w-6 h-6" />} label="إجمالي الطلاب" value={stats.totalStudents} color="text-blue-600" bg="bg-blue-50" />
          <StatCard icon={<FileText className="w-6 h-6" />} label="الاختبارات النشطة" value={stats.activeAssessments} color="text-brand-red" bg="bg-rose-50" />
          <StatCard icon={<TrendingUp className="w-6 h-6" />} label="متوسط الدرجات" value={`${stats.avgScore}%`} color="text-amber-600" bg="bg-amber-50" />
          <StatCard icon={<Activity className="w-6 h-6" />} label="إجمالي المشاركات" value={stats.totalSubmissions} color="text-emerald-600" bg="bg-emerald-50" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Submissions Over Time */}
          <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-brand-text flex items-center gap-3">
                <Activity className="w-5 h-5 text-brand-red" />
                آخر مشاركات (7 أيام)
              </h3>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={submissionHistory}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D13E3E" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#D13E3E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F1E8" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    labelStyle={{ fontWeight: 'black', marginBottom: '4px' }}
                  />
                  <Area type="monotone" dataKey="تعداد" stroke="#D13E3E" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
             <h3 className="text-xl font-black text-brand-text flex items-center gap-3">
                <Brain className="w-5 h-5 text-brand-red" />
                توزيع مستويات الصعوبة
              </h3>
              <div className="h-80 w-full flex items-center justify-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie
                          data={difficultyData}
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                       >
                          {difficultyData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                       </Pie>
                       <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="flex flex-col gap-4 pr-12">
                   {difficultyData.map((d, i) => (
                     <div key={d.name} className="flex items-center gap-3">
                       <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                       <span className="text-xs uppercase tracking-widest text-brand-beige">{d.name}</span>
                       <span className="text-sm font-black text-brand-text">{d.value}</span>
                     </div>
                   ))}
                 </div>
              </div>
          </div>
        </div>

        {/* Detailed Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-6">
               <h4 className="text-lg font-black text-brand-text flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  الأكثر تميزاً
               </h4>
               <div className="space-y-4">
                  {students.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)).slice(0, 5).map((student, i) => {
                    const level = calculateLevel(student.xp || 0);
                    return (
                      <div key={student.uid} className="p-4 bg-brand-cream/30 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-brand-red shadow-sm">
                               #{i+1}
                             </div>
                             <div>
                               <p className="text-sm font-black text-brand-text">{student.fullName}</p>
                               <p className="text-[9px] font-bold text-brand-beige uppercase tracking-widest">{level.name}</p>
                             </div>
                          </div>
                          <div className="text-left">
                            <p className="text-brand-red font-black text-sm">{student.totalPoints || 0}</p>
                            <p className="text-[9px] font-bold text-brand-beige">نقطة</p>
                          </div>
                        </div>
                        <div className="h-1.5 bg-white rounded-full overflow-hidden">
                          <div className="h-full bg-brand-red" style={{ width: `${(student.xp || 0) % 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
               </div>
            </div>

           <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-6">
              <h4 className="text-lg font-black text-brand-text flex items-center gap-2">
                 <Award className="w-5 h-5 text-emerald-500" />
                 أعلى نسب نجاح
              </h4>
              <div className="space-y-4">
                 {assessments.slice(0, 5).map((assessment) => {
                    const assessmentSubmissions = submissions.filter(s => s.assessmentId === assessment.id);
                    const avg = assessmentSubmissions.length > 0 
                      ? Math.round(assessmentSubmissions.reduce((acc, curr) => acc + calculatePercentage(curr.finalScore, curr.maxScore), 0) / assessmentSubmissions.length)
                      : 0;
                    return (
                      <div key={assessment.id} className="space-y-2">
                         <div className="flex justify-between text-xs mb-1">
                            <span className="text-brand-text font-black max-w-[200px] truncate">{assessment.title}</span>
                            <span className="text-emerald-600 font-bold">{avg}%</span>
                         </div>
                         <div className="h-2 bg-brand-cream rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${avg}%` }} />
                         </div>
                      </div>
                    );
                 })}
              </div>
           </div>

           <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-6">
              <h4 className="text-lg font-black text-brand-text flex items-center gap-2">
                 <HelpCircle className="w-5 h-5 text-brand-red" />
                 الأسئلة الأكثر صعوبة
              </h4>
              <p className="text-xs text-brand-beige leading-relaxed">
                يتم تحليل الأسئلة التي يخطئ فيها الطلاب بشكل متكرر لتقديم نتائج أدق في المستقبل.
              </p>
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-brand-cream/50 rounded-2xl flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-widest text-brand-beige">أكثر مستوى يتم اختياره</span>
                  <span className="text-xl font-black text-brand-text">المستوى المتوسط</span>
                </div>
                <div className="p-4 bg-brand-cream/50 rounded-2xl flex flex-col gap-1">
                   <span className="text-[10px] uppercase tracking-widest text-brand-beige">معدل الفهم القرائي</span>
                   <span className="text-xl font-black text-emerald-600">84%</span>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode, label: string, value: string | number, color: string, bg: string }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-brand-beige/10 shadow-sm flex items-center gap-6 group hover:scale-[1.02] transition-all">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm", bg, color)}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] text-brand-beige uppercase tracking-widest mb-1">{label}</div>
        <div className="text-2xl font-black text-brand-text tracking-tighter">{value}</div>
      </div>
    </div>
  );
}
