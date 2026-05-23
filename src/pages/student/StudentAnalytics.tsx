import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Submission, User } from "../../types";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area
} from "recharts";
import {
  TrendingUp,
  Brain,
  Star,
  Activity,
  Target,
  Sparkles,
  BarChart3,
  Flame
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { getAIInsights } from "../../lib/gemini";
import { motion } from "motion/react";
import { calculateLevel } from "../../lib/gamification";
import { cn, calculatePercentage } from "../../lib/utils";

export default function StudentAnalytics() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    async function fetchData() {
      try {
        const q = query(
          collection(db, "submissions"),
          where("participantId", "==", user.uid),
          orderBy("date", "desc")
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => doc.data() as Submission);
        setSubmissions(data);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    if (submissions.length === 0) return null;
    
    const avgScore = submissions.reduce((acc, curr) => acc + calculatePercentage(curr.finalScore, curr.maxScore), 0) / submissions.length;
    const successRate = (submissions.filter(s => calculatePercentage(s.finalScore, s.maxScore) >= 50).length / submissions.length) * 100;
    
    // Difficulty analysis
    let easyCorrect = 0, easyTotal = 0;
    let mediumCorrect = 0, mediumTotal = 0;
    let hardCorrect = 0, hardTotal = 0;

    submissions.forEach(s => {
      s.answers.forEach(a => {
        if (a.difficulty === 'easy') { easyTotal++; if (a.isCorrect) easyCorrect++; }
        if (a.difficulty === 'medium') { mediumTotal++; if (a.isCorrect) mediumCorrect++; }
        if (a.difficulty === 'hard') { hardTotal++; if (a.isCorrect) hardCorrect++; }
      });
    });

    return {
      avgScore: Math.round(avgScore),
      successRate: Math.round(successRate),
      easySuccess: easyTotal > 0 ? Math.round((easyCorrect / easyTotal) * 100) : 0,
      mediumSuccess: mediumTotal > 0 ? Math.round((mediumCorrect / mediumTotal) * 100) : 0,
      hardSuccess: hardTotal > 0 ? Math.round((hardCorrect / hardTotal) * 100) : 0,
    };
  }, [submissions]);

  const scoreData = useMemo(() => {
    return submissions.map(s => {
      const sDate = typeof s.date === 'string' ? s.date : 
                  (s.date as any).toDate ? (s.date as any).toDate().toISOString() : new Date().toISOString();
      return {
        date: format(new Date(sDate), 'MM/dd'),
        درجة: calculatePercentage(s.finalScore, s.maxScore)
      };
    }).reverse();
  }, [submissions]);

  const radarData = useMemo(() => {
    if (!stats) return [];
    return [
      { subject: 'السهل', A: stats.easySuccess, fullMark: 100 },
      { subject: 'المتوسط', A: stats.mediumSuccess, fullMark: 100 },
      { subject: 'الصعب', A: stats.hardSuccess, fullMark: 100 },
      { subject: 'الالتزام', A: (user?.streak || 0) * 5 > 100 ? 100 : (user?.streak || 0) * 5, fullMark: 100 },
      { subject: 'عدد الاختبارات', A: (submissions.length * 10) > 100 ? 100 : (submissions.length * 10), fullMark: 100 },
    ];
  }, [stats, user, submissions]);

  const fetchAiInsights = useCallback(async () => {
    if (!user || submissions.length === 0 || isAiLoading || !stats) return;
    setIsAiLoading(true);
    try {
      const insightData = {
        avgScore: stats.avgScore,
        easySuccess: stats.easySuccess,
        mediumSuccess: stats.mediumSuccess,
        hardSuccess: stats.hardSuccess,
        totalExams: submissions.length,
        streak: user.streak,
        name: user.fullName
      };

      const insights = await getAIInsights(insightData);
      setAiInsights(insights);
    } catch (err) {
      console.error("AI Insight error:", err);
      setAiInsights("حدث خطأ أثناء تحميل نصائح الذكاء الاصطناعي.");
    } finally {
      setIsAiLoading(false);
    }
  }, [user, submissions.length, isAiLoading, stats]);

  const hasFetchedInsights = useRef(false);

  useEffect(() => {
    if (submissions.length > 0 && !aiInsights && !isAiLoading && !hasFetchedInsights.current) {
      hasFetchedInsights.current = true;
      fetchAiInsights();
    }
  }, [submissions.length, aiInsights, isAiLoading, fetchAiInsights]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black text-brand-beige">جاري تحليل أدائك...</div>;

  return (
    <div className="min-h-screen bg-brand-cream p-6 lg:p-12 font-bold text-right" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-12 py-8 lg:py-0">
        
        {/* Header - Minimal version for layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-red text-white rounded-2xl flex items-center justify-center shadow-lg transform rotate-6">
              <TrendingUp className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-brand-text tracking-tighter">تحليلي الشخصي</h1>
              <p className="text-brand-beige mt-1">اكتشف نقاط قوتك والمجالات التي تحتاج لتطوير</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="bg-white px-6 py-3 rounded-2xl border border-brand-beige/10 shadow-sm flex items-center gap-3">
               <Flame className="w-5 h-5 text-orange-500" />
               <span className="text-xl font-black text-brand-text">{user?.streak || 0}</span>
               <span className="text-[10px] uppercase tracking-widest text-brand-beige">يوم متتالي</span>
             </div>
          </div>
        </div>

        {/* AI Insights Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-brand-text rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl shadow-brand-text/20"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-32 h-32" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
             <div className="w-24 h-24 bg-brand-red rounded-[32px] flex items-center justify-center text-4xl shadow-xl">
               {calculateLevel(user?.xp || 0).icon}
             </div>
             <div className="flex-1 space-y-4">
               <h2 className="text-2xl font-black flex items-center gap-3">
                 نصائح الذكاء الاصطناعي لك
                 {isAiLoading && <Activity className="w-4 h-4 animate-pulse text-brand-red" />}
               </h2>
               <div className="text-white/80 leading-relaxed font-medium whitespace-pre-line bg-white/5 p-6 rounded-3xl border border-white/10">
                 {aiInsights || (isAiLoading ? "جاري التفكير..." : "ابدأ بحل الاختبارات للحصول على نصائح مخصصة لك!")}
               </div>
             </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SmallStatCard label="متوسط الدرجات" value={`${stats?.avgScore || 0}%`} icon={<Target className="w-5 h-5" />} />
          <SmallStatCard label="إجمالي النقاط" value={user?.totalPoints || 0} icon={<Star className="w-5 h-5" />} />
          <SmallStatCard label="عدد الاختبارات" value={submissions.length} icon={<BarChart3 className="w-5 h-5" />} />
          <SmallStatCard label="معدل النجاح" value={`${stats?.successRate || 0}%`} icon={<CheckCircle2Icon className="w-5 h-5" />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Performance chart */}
           <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
              <h3 className="text-xl font-black text-brand-text flex items-center gap-3">
                 <TrendingUp className="w-5 h-5 text-brand-red" />
                 تطور الأداء
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scoreData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D13E3E" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#D13E3E" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    />
                    <Area type="monotone" dataKey="درجة" stroke="#D13E3E" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Skills radar */}
           <div className="bg-white p-8 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
              <h3 className="text-xl font-black text-brand-text flex items-center gap-3">
                 <Brain className="w-5 h-5 text-brand-red" />
                 رادار المهارات
              </h3>
              <div className="h-80 w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                       <PolarGrid stroke="#F4F1E8" />
                       <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                       <Radar name="الأداء" dataKey="A" stroke="#D13E3E" fill="#D13E3E" fillOpacity={0.6} />
                       <Tooltip />
                    </RadarChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>

        {/* Difficulty Detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <DifficultyCard label="الأسئلة السهلة" percentage={stats?.easySuccess || 0} color="emerald" />
           <DifficultyCard label="الأسئلة المتوسطة" percentage={stats?.mediumSuccess || 0} color="amber" />
           <DifficultyCard label="الأسئلة الصعبة" percentage={stats?.hardSuccess || 0} color="rose" />
        </div>
      </div>
    </div>
  );
}

function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function SmallStatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-[32px] border border-brand-beige/10 shadow-sm flex items-center justify-between group hover:scale-[1.02] transition-all">
       <div>
         <div className="text-[10px] text-brand-beige uppercase tracking-widest mb-1">{label}</div>
         <div className="text-2xl font-black text-brand-text">{value}</div>
       </div>
       <div className="p-3 bg-brand-cream rounded-2xl text-brand-red group-hover:scale-110 transition-transform">
         {icon}
       </div>
    </div>
  );
}

function DifficultyCard({ label, percentage, color }: { label: string, percentage: number, color: 'emerald' | 'amber' | 'rose' }) {
  const colorMap = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500'
  };
  const lightColorMap = {
    emerald: 'bg-emerald-50',
    amber: 'bg-amber-50',
    rose: 'bg-rose-50'
  };
  const textColorMap = {
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    rose: 'text-rose-700'
  };

  return (
    <div className={cn("p-8 rounded-[40px] border shadow-sm space-y-4", lightColorMap[color], `border-${color}-100`)}>
       <div className="flex justify-between items-center">
         <span className={cn("text-sm font-black", textColorMap[color])}>{label}</span>
         <span className={cn("text-2xl font-black", textColorMap[color])}>{percentage}%</span>
       </div>
       <div className="h-3 bg-white rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={cn("h-full", colorMap[color])}
          />
       </div>
    </div>
  );
}
