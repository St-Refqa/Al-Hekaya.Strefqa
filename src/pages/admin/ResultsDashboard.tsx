import React, { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  where,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Submission, UserAnswer, Question, Assessment, User } from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Search,
  History,
  Star,
  Trophy,
  Users as UsersIcon,
  X,
  MessageSquare,
  Save,
  Edit,
  Eye,
  Filter,
  ListChecks,
  ArrowUpDown,
  Info,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Church,
  Clock,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, cn, calculatePercentage } from "../../lib/utils";
import * as XLSX from "xlsx";
import { SmartImage } from "../../components/ui/SmartImage";
import { deleteDoc } from "firebase/firestore";

import { exportToCSV } from "../../lib/csv";

export default function ResultsDashboard() {
  const location = useLocation();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [participantFilter, setParticipantFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { isAdmin } = useAuth();
  const [userPhotos, setUserPhotos] = useState<Record<string, string>>({});

  // Filters
  const [statusFilter, setStatusFilter] = useState<
    "all" | "reviewed" | "pending"
  >("pending");
  const [difficultyFilter, setDifficultyFilter] = useState<
    "all" | "easy" | "medium" | "hard"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "score" | "streak">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!isAdmin) return;

    const unsubscribePhotos = onSnapshot(query(collection(db, "users"), where("role", "==", "student")), (usersSnap) => {
      const photoMap: Record<string, string> = {};
      usersSnap.forEach(doc => {
        const data = doc.data() as any;
        if (data.photoUrl) photoMap[doc.id] = data.photoUrl;
      });
      setUserPhotos(photoMap);
    }, (err) => {
      console.error("Error fetching user photos:", err);
    });

    const q = query(collection(db, "submissions"), orderBy("date", "desc"));
    const unsubscribeSubmissions = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as Submission,
        );
        setSubmissions(data);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "submissions");
      },
    );

    return () => {
      unsubscribePhotos();
      unsubscribeSubmissions();
    };
  }, [isAdmin]);

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      if (id === "all") {
        const batch = writeBatch(db);
        const q = query(collection(db, "submissions"));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      } else {
        await deleteDoc(doc(db, "submissions", id));
      }
      setDeleteConfirm(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `submissions/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const updateUserStatsAfterAdjustment = async (submission: Submission, scoreDelta: number) => {
    if (!submission.participantId) return;
    
    try {
      const userRef = doc(db, "users", submission.participantId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as User;
        await updateDoc(userRef, {
          totalPoints: (userData.totalPoints || 0) + scoreDelta,
          cumulativePoints: (userData.cumulativePoints || userData.totalPoints || 0) + scoreDelta
        });
      }
    } catch (err) {
      console.error("Failed to update user stats", err);
    }
  };

  const handleScoreUpdate = async (
    sub: Submission,
    qId: string,
    newScore: number,
    reason: string,
  ) => {
    const oldAnswer = sub.answers.find((ans) => ans.questionId === qId);
    if (!oldAnswer) return;

    const previousScore = oldAnswer.score;
    const scoreDelta = newScore - previousScore;

    const newAnswers = sub.answers.map((ans) => {
      if (ans.questionId === qId) {
        return {
          ...ans,
          score: newScore,
          isCorrect: newScore > 0,
          originalAiScore: ans.originalAiScore ?? previousScore,
          adminNote: reason,
          lastAdjustedAt: new Date().toISOString(),
        };
      }
      return ans;
    });

    const newFinalScore =
      newAnswers.reduce((acc, curr) => acc + curr.score, 0) + (sub.adminAdjustment || 0);

    const auditEntry = {
      timestamp: new Date().toISOString(),
      adminId: "current-admin",
      previousScore: sub.finalScore,
      newScore: newFinalScore,
      reason: `Manual override for question ${qId}: ${reason}`,
    };

    try {
      await updateDoc(doc(db, "submissions", sub.id!), {
        answers: newAnswers,
        finalScore: newFinalScore,
        isManuallyAdjusted: true,
        adjustmentAudit: [...(sub.adjustmentAudit || []), auditEntry],
      });
      
      await updateUserStatsAfterAdjustment(sub, scoreDelta);

      setSelectedSubmission({
        ...sub,
        answers: newAnswers,
        finalScore: newFinalScore,
        isManuallyAdjusted: true,
        adjustmentAudit: [...(sub.adjustmentAudit || []), auditEntry],
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `submissions/${sub.id}`);
    }
  };

  const handleAdminAdjustment = async (sub: Submission, amount: number, reason: string) => {
    const currentAdjust = sub.adminAdjustment || 0;
    if (currentAdjust === amount) return;
    
    const scoreDelta = amount - currentAdjust;

    const baseScore = sub.answers.reduce((acc, curr) => acc + curr.score, 0);
    const newFinalScore = baseScore + amount;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      adminId: "current-admin",
      previousScore: sub.finalScore,
      newScore: newFinalScore,
      reason: `Manual total adjustment: ${reason}`,
    };

    try {
      await updateDoc(doc(db, "submissions", sub.id!), {
        adminAdjustment: amount,
        finalScore: newFinalScore,
        isManuallyAdjusted: true,
        adjustmentAudit: [...(sub.adjustmentAudit || []), auditEntry],
      });
      
      await updateUserStatsAfterAdjustment(sub, scoreDelta);

      setSelectedSubmission({
        ...sub,
        adminAdjustment: amount,
        finalScore: newFinalScore,
        isManuallyAdjusted: true,
        adjustmentAudit: [...(sub.adjustmentAudit || []), auditEntry],
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `submissions/${sub.id}`);
    }
  };

  const handleMarkAsReviewed = async (sub: Submission) => {
    try {
      await updateDoc(doc(db, "submissions", sub.id!), {
        isReviewed: true,
      });
      setSelectedSubmission({
        ...sub,
        isReviewed: true,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `submissions/${sub.id}`);
    }
  };

  const filteredSubmissions = useMemo(() => {
    let result = submissions.filter((s) => {
      const matchesParticipant = s.participantName
        .toLowerCase()
        .includes(participantFilter.toLowerCase()) ||
        s.participantPhoneOrId.toLowerCase().includes(participantFilter.toLowerCase());
      const matchesAssessment = s.assessmentTitle
        .toLowerCase()
        .includes(assessmentFilter.toLowerCase());
      
      let matchesDate = true;
      if (dateRange.start) {
        matchesDate = matchesDate && new Date(s.date) >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        // Set to end of day for the end date filter
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(s.date) <= endDate;
      }

      return matchesParticipant && matchesAssessment && matchesDate;
    });

    if (statusFilter === "reviewed")
      result = result.filter((s) => s.isReviewed);
    if (statusFilter === "pending")
      result = result.filter((s) => !s.isReviewed);

    // Sorting
    result.sort((a, b) => {
      let valA: any, valB: any;
      if (sortBy === "date") {
        valA = a.date;
        valB = b.date;
      } else if (sortBy === "score") {
        valA = calculatePercentage(a.finalScore, a.maxScore);
        valB = calculatePercentage(b.finalScore, b.maxScore);
      } else {
        valA = a.streakCount;
        valB = b.streakCount;
      }

      if (sortOrder === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return result;
  }, [submissions, participantFilter, assessmentFilter, dateRange, statusFilter, sortBy, sortOrder]);

  const exportToExcel = async () => {
    // We need to fetch assessment questions for full text in export
    const assessmentCache: Record<string, Assessment> = {};

    const exportData = await Promise.all(
      filteredSubmissions.map(async (s) => {
        let assessment = assessmentCache[s.assessmentId];
        if (!assessment) {
          try {
            const docRef = doc(db, "assessments", s.assessmentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              assessment = { id: docSnap.id, ...docSnap.data() } as Assessment;
              assessmentCache[s.assessmentId] = assessment;
            }
          } catch (e) {
            console.error(
              "Failed to fetch assessment for export",
              s.assessmentId,
            );
          }
        }

        const baseInfo: any = {
          "اسم المشارك": s.participantName,
          الكود: s.participantPhoneOrId,
          "عنوان الاختبار": s.assessmentTitle,
          "إصدار الاختبار": s.assessmentVersion || 1,
          التاريخ: new Date(s.date).toLocaleDateString("ar-EG"),
          الوقت: new Date(s.date).toLocaleTimeString("ar-EG"),
          "وقت بداية الاختبار": new Date(new Date(s.date).getTime() - (s.readingTimeSeconds + s.answeringTimeSeconds) * 1000).toLocaleTimeString("ar-EG"),
          "وقت التسليم": new Date(s.date).toLocaleTimeString("ar-EG"),
          "نوع التسليم": s.submittedManually ? "يدوي" : "تلقائي",
          "الأسئلة غير المجابة": s.unansweredCount || 0,
          "وقت القراءة (ثانية)": s.readingTimeSeconds,
          "وقت الحل (ثانية)": s.answeringTimeSeconds,
          "الالتزام الحالي": s.streakCount,
          "درجة الذكاء الاصطناعي":
            s.answers.reduce(
              (acc, a) => acc + (a.originalAiScore ?? a.score),
              0,
            ),
          "الدرجة النهائية": s.finalScore,
          "أقصى درجة ممكنة": s.maxScore,
          "النسبة المئوية": `${calculatePercentage(s.finalScore, s.maxScore)}%`,
          "تم التعديل يدوياً": s.isManuallyAdjusted ? "نعم" : "لا",
          "ملاحظات المراجعة": s.adminReviewNotes || "",
        };

        // Add dynamic columns for each question
        s.answers.forEach((ans, idx) => {
          const prefix = `Q${idx + 1}`;
          const assessmentQ = assessment
            ? [
                ...assessment.questions.easy,
                ...assessment.questions.medium,
                ...assessment.questions.hard,
              ].find((q) => q.id === ans.questionId)
            : null;

          baseInfo[`${prefix} Difficulty`] = ans.difficulty;
          baseInfo[`${prefix} Type`] = assessmentQ?.type || "N/A";
          baseInfo[`${prefix} Full Question`] = assessmentQ?.text || "N/A";
          baseInfo[`${prefix} Choices (MCQ)`] =
            assessmentQ?.options?.join(" | ") || "";
          baseInfo[`${prefix} Participant Answer`] = ans.userAnswer;
          baseInfo[`${prefix} Correct Benchmark`] = ans.correctAnswer;
          baseInfo[`${prefix} AI Score`] = ans.originalAiScore ?? ans.score;
          baseInfo[`${prefix} Final Score`] = ans.score;
          baseInfo[`${prefix} Max Points`] = ans.maxPoints;
          baseInfo[`${prefix} AI Feedback`] = ans.feedback || "";
          baseInfo[`${prefix} Admin Note`] = ans.adminNote || "";
          baseInfo[`${prefix} Outcome`] =
            ans.score === ans.maxPoints
              ? "Correct"
              : ans.score > 0
                ? "Partial"
                : "Incorrect";
        });

        return baseInfo;
      }),
    );

    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const wscols = [
      { wch: 25 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
    ];
    ws["!cols"] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detailed Results");
    XLSX.writeFile(
      wb,
      `Intelligence_Matrix_Export_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <AnimatePresence>
        {selectedSubmission && (
          <SubmissionModal
            submission={selectedSubmission}
            userPhotos={userPhotos}
            onClose={() => setSelectedSubmission(null)}
            onUpdateScore={handleScoreUpdate}
            onAdjustTotal={handleAdminAdjustment}
            onMarkAsReviewed={handleMarkAsReviewed}
            onDelete={() => {
              setDeleteConfirm(selectedSubmission);
              setSelectedSubmission(null);
            }}
          />
        )}
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
                {deleteConfirm.id === "all" ? "مسح كل النتائج؟" : "مسح النتيجة؟"}
              </h3>
              <p className="text-brand-beige mb-8 font-bold text-center">
                {deleteConfirm.id === "all" 
                  ? "هل أنت متأكد من مسح كل نتائج الطلاب؟ لا يمكن التراجع عن هذا الإجراء."
                  : <span>هل أنت متأكد من مسح نتيجة الطالب <span className="text-brand-red">{deleteConfirm.participantName}</span>؟ لا يمكن التراجع عن هذا الإجراء.</span>}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-4 bg-brand-cream text-brand-beige rounded-2xl font-black"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm.id!)}
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

      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 mb-8">
        <Link
          to="/admin"
          className="p-4 bg-white border border-brand-beige/20 rounded-2xl hover:bg-brand-cream transition-colors shadow-sm self-start sm:self-auto"
        >
          <ArrowLeft className="w-5 h-5 text-brand-beige" />
        </Link>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-1 w-full">
          <div className="flex items-center -space-x-3">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-brand-beige/20 shadow-xl flex items-center justify-center overflow-hidden z-10">
              <SmartImage
                src="/assets/logo-red.png"
                alt="Church"
                className="w-full h-full object-cover"
                fallback={<div className="w-full h-full flex items-center justify-center bg-brand-red/5 text-brand-red font-black"><Church className="w-6 h-6" /></div>}
              />
            </div>
            <div className="w-14 h-14 rounded-full bg-white border-2 border-brand-beige/20 shadow-xl flex items-center justify-center overflow-hidden">
              <SmartImage
                src="/assets/logo-beige.png"
                alt="Brand"
                className="w-full h-full object-cover"
                fallback={<div className="w-full h-full flex items-center justify-center bg-brand-beige/5 text-brand-beige font-black">H</div>}
              />
            </div>
          </div>
          <div className="text-right flex-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-text">
              نتائج الطلاب
            </h1>
            <p className="text-brand-beige font-bold mt-1 text-sm sm:text-base">
              مراجعة يدوية وتصدير كامل لبيانات الاستيعاب.
            </p>
          </div>
          <button
             onClick={() => {
                const data = filteredSubmissions.map(s => [s.participantName, s.assessmentTitle, (s.finalScore || 0) + '%', s.status === 'completed' ? 'مكتمل' : 'مرفوض', new Date(s.date).toLocaleString()]);
                exportToCSV('results_export.csv', [['اسم الطالب', 'الاختبار', 'الدرجة', 'الحالة', 'التاريخ'], ...data]);
             }}
             className="w-full md:w-auto px-6 py-4 bg-brand-cream text-brand-text font-black rounded-[24px] hover:bg-brand-red hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 border border-brand-beige/10 shrink-0"
          >
             <Download className="w-5 h-5"/> تصدير النتائج (CSV)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <StatCard
          title="إجمالي التسليمات"
          value={submissions.length}
          icon={<History className="w-5 h-5 text-brand-beige" />}
        />
        <StatCard
          title="متوسط الدقة"
          value={
            submissions.length > 0
              ? `${(submissions.reduce((acc, s) => acc + calculatePercentage(s.finalScore, s.maxScore), 0) / submissions.length).toFixed(1)}%`
              : "0%"
          }
          icon={<Star className="w-5 h-5 text-amber-500" />}
        />
        <StatCard
          title="المتفوقين"
          value={
            submissions.filter((s) => calculatePercentage(s.finalScore, s.maxScore) >= 90).length
          }
          icon={<Trophy className="w-5 h-5 text-brand-red" />}
        />
        <StatCard
          title="في انتظار المراجعة"
          value={submissions.filter((s) => !s.isReviewed).length}
          icon={<ListChecks className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      <div className="bg-white rounded-[32px] border border-brand-beige/10 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
        <div className="p-8 border-b border-brand-beige/5 flex flex-col gap-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-beige tracking-widest mr-2">بحث بالمشارك</label>
                <div className="relative">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige" />
                  <input
                    type="text"
                    placeholder="اسم المشارك أو الكود..."
                    value={participantFilter || 'all'}
                    onChange={(e) => setParticipantFilter(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none transition-all text-xs font-bold text-right text-brand-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-beige tracking-widest mr-2">عنوان الاختبار</label>
                <div className="relative">
                  <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-beige" />
                  <input
                    type="text"
                    placeholder="ابحث بالعنوان..."
                    value={assessmentFilter || 'all'}
                    onChange={(e) => setAssessmentFilter(e.target.value)}
                    className="w-full pr-12 pl-4 py-3 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none transition-all text-xs font-bold text-right text-brand-text"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-beige tracking-widest mr-2">من تاريخ</label>
                <input
                  type="date"
                  value={dateRange.start || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-3 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none transition-all text-xs font-bold text-brand-text"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-brand-beige tracking-widest mr-2">إلى تاريخ</label>
                <input
                  type="date"
                  value={dateRange.end || ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-3 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none transition-all text-xs font-bold text-brand-text"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {(participantFilter || assessmentFilter || dateRange.start || dateRange.end) && (
                <button
                  onClick={() => {
                    setParticipantFilter("");
                    setAssessmentFilter("");
                    setDateRange({ start: "", end: "" });
                  }}
                  className="p-3.5 bg-brand-cream text-brand-beige rounded-2xl hover:text-brand-red transition-all"
                  title="مسح الفلاتر"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setDeleteConfirm({ id: "all", participantName: "الكل" } as any)}
                disabled={submissions.length === 0}
                className="px-6 py-3.5 bg-white border border-brand-beige/20 text-brand-red rounded-2xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2 font-black text-xs shadow-sm disabled:opacity-30"
              >
                <Trash2 className="w-4 h-4" />
                مسح الكل
              </button>
              <button
                onClick={exportToExcel}
                className="px-6 py-3.5 bg-brand-text text-white rounded-2xl hover:bg-brand-red transition-all flex items-center justify-center gap-2 font-black text-xs shadow-lg shadow-brand-text/10"
              >
                <Download className="w-4 h-4" />
                Raw Data
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-brand-beige/5 pt-6 justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto hide-scrollbar custom-scrollbar pb-1">
              <div className="flex items-center gap-2 bg-brand-cream/30 p-1 rounded-xl border border-brand-beige/10 flex-none">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    statusFilter === "all"
                      ? "bg-white text-brand-text shadow-sm"
                      : "text-brand-beige hover:text-brand-text",
                  )}
                >
                  الكل
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    statusFilter === "pending"
                      ? "bg-white text-brand-red shadow-sm"
                      : "text-brand-beige hover:text-brand-text",
                  )}
                >
                  في انتظار المراجعة
                </button>
                <button
                  onClick={() => setStatusFilter("reviewed")}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                    statusFilter === "reviewed"
                      ? "bg-white text-emerald-600 shadow-sm"
                      : "text-brand-beige hover:text-brand-text",
                  )}
                >
                  تمت المراجعة
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-brand-beige uppercase tracking-widest mx-2">
                  ترتيب حسب:
                </span>
                <button
                  onClick={() => setSortBy("date")}
                  className={cn(
                    "flex items-center gap-2 text-xs font-black transition-all",
                    sortBy === "date" ? "text-brand-red" : "text-brand-beige",
                  )}
                >
                  التاريخ {sortBy === "date" && <ArrowUpDown className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setSortBy("score")}
                  className={cn(
                    "flex items-center gap-2 text-xs font-black transition-all",
                    sortBy === "score" ? "text-brand-red" : "text-brand-beige",
                  )}
                >
                  الدقة{" "}
                  {sortBy === "score" && <ArrowUpDown className="w-3 h-3" />}
                </button>
              </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden overflow-x-auto">
          <table className="w-full text-right border-collapse">

          <thead>
              <tr className="bg-brand-cream/20">
                <th className="px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black text-brand-beige uppercase tracking-widest text-right">
                  المشارك
                </th>
                <th className="px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black text-brand-beige uppercase tracking-widest text-right">
                  تفاصيل الاختبار
                </th>
                <th className="px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black text-brand-beige uppercase tracking-widest text-center">
                  نسبة الاستيعاب
                </th>
                <th className="px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black text-brand-beige uppercase tracking-widest text-center">
                  الحالة
                </th>
                <th className="px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black text-brand-beige uppercase tracking-widest text-center">
                  التاريخ
                </th>
                <th className="px-4 sm:px-8 py-3.5 sm:py-4 text-[10px] font-black text-brand-beige uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-beige/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <History className="w-8 h-8 animate-spin text-brand-beige/20 mx-auto mb-4" />
                    <p className="text-brand-beige font-bold text-sm">
                      جاري تحميل البيانات...
                    </p>
                  </td>
                </tr>
              ) : filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-32 text-center">
                    <p className="text-brand-beige font-bold text-sm tracking-tight font-sans">
                      مفيش بيانات مطابقة للبحث.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSubmission(s)}
                    className="hover:bg-brand-cream/20 transition-colors group cursor-pointer relative"
                  >
                    <td className="px-4 sm:px-8 py-3.5 sm:py-5 relative">
                      <div className={cn(
                        "absolute top-0 bottom-0 right-0 w-1 transition-all group-hover:w-2",
                        s.status === 'completed' ? "bg-emerald-500" :
                        s.status === 'incomplete' ? "bg-amber-500" :
                        s.status === 'expired' ? "bg-blue-500" :
                        "bg-rose-500"
                      )} />
                      <div className="flex items-center gap-4 justify-end">
                        <div className="text-right">
                          <h4 className="font-black text-brand-text text-sm whitespace-nowrap">
                            {s.participantName}
                          </h4>
                          <p className="text-[10px] text-brand-beige font-bold mt-0.5 uppercase tracking-tighter">
                            {s.participantPhoneOrId}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-brand-cream border-2 border-white shadow-sm flex items-center justify-center text-brand-red font-black text-xs overflow-hidden">
                          {(userPhotos[s.participantId || ""] || s.participantPhotoUrl) ? (
                            <img src={userPhotos[s.participantId || ""] || s.participantPhotoUrl} alt={s.participantName} className="w-full h-full object-cover" />
                          ) : s.participantName[0]}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-3.5 sm:py-5">
                      <div className="max-w-xs text-right group/cell">
                        <div className="flex items-center justify-end gap-2">
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setAssessmentFilter(s.assessmentTitle || "");
                             }}
                             className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-brand-cream rounded transition-all text-brand-beige hover:text-brand-red"
                             title="تصفية بهذا الاختبار"
                           >
                             <Filter className="w-3 h-3" />
                           </button>
                           <Link 
                             to={`/admin/edit/${s.assessmentId}`}
                             onClick={(e) => e.stopPropagation()}
                             className="font-bold text-brand-text text-sm line-clamp-1 hover:text-brand-red transition-colors"
                           >
                            {s.assessmentTitle}
                           </Link>
                        </div>
                        <p className="text-[10px] text-brand-beige mt-0.5 font-bold uppercase tracking-widest">
                          ID: {s.assessmentId.slice(0, 8)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-3.5 sm:py-5 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-black text-brand-text">
                            {s.finalScore}
                          </span>
                          <span className="text-[10px] font-bold text-brand-beige">
                            / {s.maxScore || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                            calculatePercentage(s.finalScore, s.maxScore) >= 80 ? "bg-emerald-50 text-emerald-600" :
                            calculatePercentage(s.finalScore, s.maxScore) >= 50 ? "bg-amber-50 text-amber-600" :
                            "bg-rose-50 text-brand-red"
                          )}>
                            {calculatePercentage(s.finalScore, s.maxScore)}%
                          </span>
                        </div>
                        <div className="w-32 h-2 bg-brand-cream rounded-full overflow-hidden shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${calculatePercentage(s.finalScore, s.maxScore)}%` }}
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              calculatePercentage(s.finalScore, s.maxScore) >= 80
                                ? "bg-gradient-to-l from-emerald-400 to-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                : calculatePercentage(s.finalScore, s.maxScore) >= 50
                                  ? "bg-gradient-to-l from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                                  : "bg-gradient-to-l from-rose-400 to-brand-red shadow-[0_0_8px_rgba(224,45,60,0.3)]",
                            )}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex flex-col items-center gap-2.5">
                        {/* Submission Status */}
                        <div className="flex items-center gap-1.5">
                          {s.status === "completed" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-xl border border-emerald-100 uppercase tracking-tighter shadow-sm">
                              <CheckCircle className="w-3.5 h-3.5" />
                              مكتمل
                            </span>
                          )}
                          {s.status === "incomplete" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-xl border border-amber-100 uppercase tracking-tighter shadow-sm">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              غير مكتمل
                            </span>
                          )}
                          {s.status === "expired" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-xl border border-blue-100 uppercase tracking-tighter shadow-sm">
                              <Clock className="w-3.5 h-3.5" />
                              انتهى الوقت
                            </span>
                          )}
                          {s.status === "duplicate-blocked" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-brand-red text-[10px] font-black rounded-xl border border-brand-red/10 uppercase tracking-tighter shadow-sm">
                              <XCircle className="w-3.5 h-3.5" />
                              مكرر
                            </span>
                          )}
                        </div>

                        {/* Review Status Indicator */}
                        {s.isReviewed ? (
                          <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            تمت المراجعة
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] font-black text-brand-beige bg-brand-cream/30 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-beige/40" />
                            بانتظار المراجعة
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 sm:px-8 py-3.5 sm:py-5 text-center">
                      <p className="text-xs font-black text-brand-text">
                        {formatDate(s.date)}
                      </p>
                      <p className="text-[10px] text-brand-beige mt-0.5 uppercase font-bold">
                        {new Date(s.date).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </td>
                    <td className="px-4 sm:px-8 py-3.5 sm:py-5 text-right flex items-center justify-end gap-2">
                      <Link
                        to={`/student/review/${s.id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-brand-cream rounded-lg text-brand-beige hover:text-brand-red transition-all"
                        title="عرض المراجعة الكاملة"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(s);
                        }}
                        className="p-2 hover:bg-rose-50 rounded-lg text-brand-beige hover:text-brand-red transition-all"
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
  );
}

function SubmissionModal({
  submission,
  userPhotos,
  onClose,
  onUpdateScore,
  onAdjustTotal,
  onMarkAsReviewed,
  onDelete,
}: {
  submission: Submission;
  userPhotos: Record<string, string>;
  onClose: () => void;
  onUpdateScore: (
    sub: Submission,
    qId: string,
    newScore: number,
    reason: string,
  ) => void;
  onAdjustTotal: (sub: Submission, amount: number, reason: string) => void;
  onMarkAsReviewed: (sub: Submission) => void;
  onDelete: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"review" | "audit">("review");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="p-4 md:p-8 border-b border-brand-beige/10 flex flex-col md:flex-row md:items-center md:justify-between bg-brand-cream/30 gap-4">
          <div className="flex items-center gap-4 md:gap-6 justify-end flex-row-reverse w-full md:w-auto">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                {/* Submission Status */}
                {submission.status === "completed" && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black border border-emerald-100 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" />
                    مكتمل
                  </span>
                )}
                {submission.status === "incomplete" && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black border border-amber-100 uppercase tracking-widest flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    غير مكتمل
                  </span>
                )}
                {submission.status === "expired" && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[8px] font-black border border-blue-100 uppercase tracking-widest flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    انتهى الوقت
                  </span>
                )}
                {submission.status === "duplicate-blocked" && (
                  <span className="px-2 py-0.5 bg-rose-50 text-brand-red rounded-full text-[8px] font-black border border-brand-red/10 uppercase tracking-widest flex items-center gap-1">
                    <XCircle className="w-2.5 h-2.5" />
                    مكرر
                  </span>
                )}

                {submission.isReviewed && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black border border-emerald-100 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" />
                    تمت المراجعة
                  </span>
                )}
                {submission.isManuallyAdjusted && !submission.isReviewed && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[8px] font-black border border-amber-100 uppercase tracking-widest">
                    معدل يدوياً
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-black text-brand-text flex items-center gap-3 justify-end">
                <span className="px-3 py-1 bg-brand-beige/10 rounded-full text-[10px] text-brand-beige uppercase tracking-widest font-black">
                  {submission.participantPhoneOrId}
                </span>
                {submission.participantName}
              </h2>
              <p className="text-brand-beige font-bold">
                تقييم لـ: {submission.assessmentTitle}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-brand-cream border-2 border-white shadow-sm flex items-center justify-center text-brand-red font-black text-xl overflow-hidden">
              {(userPhotos[submission.participantId || ""] || submission.participantPhotoUrl) ? (
                <img 
                  src={userPhotos[submission.participantId || ""] || submission.participantPhotoUrl} 
                  alt={submission.participantName} 
                  className="w-full h-full object-cover" 
                />
              ) : submission.participantName[0]}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 bg-brand-cream/50 p-1.5 rounded-2xl w-full md:w-auto">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5 text-brand-beige" />
            </button>
            <button
              onClick={onDelete}
              className="p-2 hover:bg-rose-50 rounded-lg transition-colors ml-2 text-brand-red"
              title="مسح النتيجة"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onMarkAsReviewed(submission)}
              disabled={submission.isReviewed}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                submission.isReviewed
                  ? "bg-emerald-50 text-emerald-600 opacity-50 cursor-not-allowed"
                  : "bg-brand-text text-white hover:bg-emerald-600 shadow-md"
              )}
            >
              <CheckCircle className="w-4 h-4" />
              {submission.isReviewed ? "تمت المراجعة" : "تأكيد المراجعة"}
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                activeTab === "audit"
                  ? "bg-white text-brand-text shadow-sm"
                  : "text-brand-beige",
              )}
            >
              سجل التعديلات
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                activeTab === "review"
                  ? "bg-white text-brand-text shadow-sm"
                  : "text-brand-beige",
              )}
            >
              المراجعة
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-10 space-y-10">
          {activeTab === "review" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-beige text-right">
                    ملخص التقييم
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <SummaryItem
                      label="نسبة الدقة"
                      value={`${calculatePercentage(submission.finalScore, submission.maxScore)}%`}
                      sub={`${submission.finalScore} / ${submission.maxScore}`}
                    />
                    <SummaryItem
                      label="التسليم"
                      value={submission.submittedManually ? "يدوي" : "تلقائي"}
                      sub={submission.unansweredCount ? `${submission.unansweredCount} سؤال لم يُحل` : "كل الأسئلة حلت"}
                    />
                    <div className="bg-brand-cream/30 p-6 rounded-3xl border border-brand-beige/10 text-right group relative">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-beige mb-1">
                        تعديل إضافي
                      </p>
                      <div className="flex items-baseline gap-2 justify-end">
                        <span className="text-xl md:text-2xl font-black text-brand-red">
                          {submission.adminAdjustment || 0 >= 0 ? `+${submission.adminAdjustment || 0}` : submission.adminAdjustment}
                        </span>
                        <button 
                          onClick={() => {
                            const val = prompt("أدخل قيمة التعديل (موجب أو سالب):", (submission.adminAdjustment || 0).toString());
                            const reason = prompt("سبب التعديل الكلي:");
                            if (val !== null && reason !== null) {
                              onAdjustTotal(submission, Number(val), reason);
                            }
                          }}
                          className="p-1 hover:bg-white rounded-lg transition-all"
                        >
                          <Edit className="w-3 h-3 text-brand-beige" />
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-brand-beige tracking-tight truncate max-w-[150px]">
                        {submission.adminAdjustment ? "تعديل يدوي للمجموع" : "لا يوجد تعديل إضافي"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-beige text-right">
                    ملاحظات المعلم (تظهر للطالب)
                  </h3>
                  <div className="relative group">
                    <textarea
                      defaultValue={submission.adminReviewNotes || ""}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        if (val === submission.adminReviewNotes) return;
                        try {
                          await updateDoc(
                            doc(db, "submissions", submission.id!),
                            { adminReviewNotes: val, isManuallyAdjusted: true },
                          );
                        } catch (err) {
                          console.error("Failed to update notes", err);
                        }
                      }}
                      placeholder="اكتب ملاحظات للطالب هنا... (سيراها الطالب في صفحة المراجعة)"
                      className="w-full h-[120px] p-6 bg-brand-cream/20 border border-brand-beige/10 rounded-[32px] text-xs font-bold text-brand-text outline-none focus:ring-2 focus:ring-brand-red/20 text-right transition-all"
                    />
                    <div className="absolute bottom-4 left-6 flex items-center gap-1 text-[8px] font-bold text-brand-beige opacity-0 group-focus-within:opacity-100 transition-opacity">
                      <span>يتم الحفظ تلقائياً عند الخروج</span>
                      <Info className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-brand-beige text-right">
                    تعديل تحليل الذكاء الاصطناعي (يراه الطالب)
                  </h3>
                  <div className="relative group">
                    <textarea
                      defaultValue={submission.aiFeedback || ""}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        if (val === submission.aiFeedback) return;
                        try {
                          await updateDoc(
                            doc(db, "submissions", submission.id!),
                            { aiFeedback: val, isManuallyAdjusted: true },
                          );
                        } catch (err) {
                          console.error("Failed to update AI feedback", err);
                        }
                      }}
                      placeholder="تعديل التحليل العام للأداء..."
                      className="w-full h-[120px] p-6 bg-brand-text/5 border border-brand-text/5 rounded-[32px] text-xs font-bold text-brand-text outline-none focus:ring-2 focus:ring-brand-red/10 text-right transition-all"
                    />
                    <div className="absolute bottom-4 left-6 flex items-center gap-1 text-[8px] font-bold text-brand-beige opacity-0 group-focus-within:opacity-100 transition-opacity">
                      <span>يتم الحفظ تلقائياً عند الخروج</span>
                      <Info className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-brand-beige flex items-center gap-2 justify-end">
                  تفاصيل الإجابات لكل سؤال
                  <MessageSquare className="w-4 h-4 ml-2" />
                </h3>
                <div className="space-y-8">
                  {!submission.answers || submission.answers.length === 0 ? (
                    <div className="p-12 bg-brand-cream/20 rounded-[40px] border border-brand-beige/10 text-center">
                      <AlertTriangle className="w-8 h-8 text-brand-beige/30 mx-auto mb-4" />
                      <p className="text-brand-beige font-black">
                        مفيش إجابات اتسجلت للجلسة دي.
                      </p>
                      <p className="text-[10px] text-brand-beige/50 uppercase tracking-widest mt-1">
                        الحالة: {submission.status}
                      </p>
                    </div>
                  ) : (
                    (submission.answers || []).map((ans, i) => (
                      <div
                        key={ans.questionId}
                        className={cn(
                          "p-8 rounded-[32px] border transition-all text-right",
                          ans.isCorrect
                            ? "bg-emerald-50/20 border-emerald-100/50"
                            : "bg-rose-50/20 border-brand-red/10",
                        )}
                      >
                        <div className="flex justify-between items-start mb-8 flex-row-reverse">
                          <div className="flex flex-col gap-1 text-right">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-beige">
                              سؤال رقم {i + 1}
                            </span>
                            <div className="flex items-center gap-2 justify-end">
                              {ans.lastAdjustedAt && (
                                <span className="flex items-center gap-1 text-[8px] font-black text-brand-red uppercase">
                                  <Info className="w-2.5 h-2.5" />
                                  تقييم يدوي
                                </span>
                              )}
                              <span
                                className={cn(
                                  "px-2 py-0.5 text-[8px] font-black uppercase rounded",
                                  ans.difficulty === "easy"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : ans.difficulty === "medium"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-rose-100 text-brand-red",
                                )}
                              >
                                {ans.difficulty === "easy" ? "سهل" : ans.difficulty === "medium" ? "متوسط" : "صعب"}
                              </span>
                            </div>
                          </div>
                          <ScoreOverride
                            score={ans.score}
                            max={ans.maxPoints}
                            onSave={(val, reason) =>
                              onUpdateScore(
                                submission,
                                ans.questionId,
                                val,
                                reason,
                              )
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                          <div className="space-y-8 flex flex-col items-end">
                            <div className="w-full">
                              <p className="text-[10px] font-black uppercase tracking-widest text-brand-beige mb-2">
                                إجابة المشارك
                              </p>
                              <p className="text-xl font-black text-brand-text leading-tight">
                                "{ans.userAnswer}"
                              </p>
                            </div>
                            <div className="w-full bg-white/80 p-5 rounded-2xl border border-brand-beige/10 shadow-sm text-brand-text">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-bold text-brand-beige">
                                  الدرجة الأصلية:{" "}
                                  {ans.originalAiScore ?? ans.score}
                                </span>
                                <p className="text-[10px] font-black uppercase text-brand-beige tracking-widest">
                                  تحليل الذكاء الاصطناعي
                                </p>
                              </div>
                              <p className="text-xs italic leading-relaxed font-bold">
                                "{ans.feedback || "لا يوجد تعليق"}"
                              </p>
                            </div>
                          </div>
                          <div className="space-y-8">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-brand-beige mb-2">
                                الإجابة النموذجية
                              </p>
                              <p className="text-sm font-bold text-brand-beige/60 leading-relaxed italic">
                                "{ans.correctAnswer}"
                              </p>
                            </div>
                            {ans.explanation && (
                              <div className="bg-brand-cream/30 p-5 rounded-2xl border border-dashed border-brand-beige/20 text-right">
                                <p className="text-[10px] font-black uppercase text-brand-beige tracking-widest mb-1">
                                  شرح تعليمي
                                </p>
                                <p className="text-xs text-brand-beige font-bold leading-relaxed">
                                  {ans.explanation}
                                </p>
                              </div>
                            )}
                            {ans.adminNote && (
                              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 text-right">
                                <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">
                                  ملاحظة التعديل اليدوي
                                </p>
                                <p className="text-xs text-amber-700 font-bold italic">
                                  "{ans.adminNote}"
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-brand-beige text-right">
                سجل التعديلات
              </h3>
              <div className="space-y-4">
                {submission.adjustmentAudit?.length ? (
                  submission.adjustmentAudit.map((log, idx) => (
                    <div
                      key={idx}
                      className="p-6 bg-brand-cream/10 rounded-2xl border border-brand-beige/10 flex flex-row-reverse items-start gap-6"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white border border-brand-beige/10 flex items-center justify-center text-brand-red shadow-sm">
                        <History className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-right">
                        <div className="flex items-center justify-between mb-2 flex-row-reverse">
                          <p className="text-sm font-black text-brand-text">
                            تعديل رقم {submission.adjustmentAudit!.length - idx}
                          </p>
                          <span className="text-[10px] font-bold text-brand-beige">
                            {new Date(log.timestamp).toLocaleString("ar-EG")}
                          </span>
                        </div>
                        <p className="text-xs text-brand-beige font-bold leading-relaxed mb-3">
                          {log.reason}
                        </p>
                        <div className="flex items-center gap-4 justify-end">
                          <div className="flex items-center gap-2 px-2 py-1 bg-rose-50 text-brand-red rounded-md text-[10px] font-black">
                            كان: {log.previousScore}
                          </div>
                          <div className="w-2 h-px bg-brand-beige/20" />
                          <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-black">
                            بقى: {log.newScore}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center">
                    <p className="text-brand-beige font-bold text-sm">
                      مفيش أي تعديلات سجلت للجلسة دي.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-brand-cream/30 p-6 rounded-3xl border border-brand-beige/10 text-right">
      <p className="text-[10px] font-black uppercase tracking-widest text-brand-beige mb-1">
        {label}
      </p>
      <p className="text-xl md:text-2xl font-black text-brand-text mb-1 leading-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[10px] font-black text-brand-red tracking-tight">
          {sub}
        </p>
      )}
    </div>
  );
}

function ScoreOverride({
  score,
  max,
  onSave,
}: {
  score: number;
  max: number;
  onSave: (val: number, reason: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(score.toString());
  const [reason, setReason] = useState("");

  if (isEditing) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-brand-beige/20 shadow-2xl w-72 space-y-4 z-10 text-right">
        <div>
          <label className="text-[9px] font-black uppercase text-brand-beige block mb-1">
            الدرجة الجديدة (0-{max})
          </label>
          <input
            type="number"
            value={val || ''}
            onChange={(e) => setVal(e.target.value)}
            className="w-full px-4 py-3 bg-brand-cream/20 border border-brand-beige/10 rounded-xl text-sm font-black text-brand-text outline-none focus:ring-2 focus:ring-brand-red/20 text-center"
            max={max}
            min={0}
          />
        </div>
        <div>
          <label className="text-[9px] font-black uppercase text-brand-beige block mb-1">
            سبب التعديل
          </label>
          <textarea
            value={reason || ''}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً: صياغة صحيحة جزئياً..."
            className="w-full px-4 py-3 bg-brand-cream/20 border border-brand-beige/10 rounded-xl text-xs font-bold text-brand-text outline-none focus:ring-2 focus:ring-brand-red/20 h-20 resize-none text-right"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 px-3 py-2 bg-brand-cream text-brand-beige rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              if (reason.trim()) {
                onSave(Number(val), reason);
                setIsEditing(false);
              }
            }}
            disabled={!reason.trim()}
            className="flex-1 px-3 py-2 bg-brand-red text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-red/10 disabled:opacity-30"
          >
            تأكيد
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex flex-col items-start group"
    >
      <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl border border-brand-beige/10 shadow-sm group-hover:border-brand-red/20 transition-all font-sans">
        <Edit className="w-4 h-4 text-brand-beige group-hover:text-brand-red mr-2" />
        <span className="text-xs text-brand-beige font-bold">/ {max}</span>
        <div className="w-px h-6 bg-brand-beige/10" />
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-black text-brand-text tracking-tighter">
            {score}
          </span>
          <span className="text-xs text-brand-beige font-black uppercase leading-none">
            درجة
          </span>
        </div>
      </div>
      <p className="text-[9px] font-black text-brand-beige uppercase tracking-widest mt-2 group-hover:text-brand-red transition-colors ml-4">
        تعديل يدوي
      </p>
    </button>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-8 rounded-[32px] border border-brand-beige/10 shadow-sm flex items-center gap-5 justify-end">
      <div className="text-right">
        <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest mb-1">
          {title}
        </p>
        <p className="text-2xl font-black text-brand-text">{value}</p>
      </div>
      <div className="p-4 bg-brand-cream/30 rounded-2xl">{icon}</div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
