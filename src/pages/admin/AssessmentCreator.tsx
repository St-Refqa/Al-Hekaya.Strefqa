import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { generateQuestions } from "../../lib/gemini";
import { Assessment, Question } from "../../types";
import {
  ArrowLeft,
  Save,
  Sparkles,
  Clock,
  Settings,
  Shield,
  Globe,
  Loader2,
  AlertCircle,
  FileText,
  Trash2,
  Lock,
  Plus,
  ArrowUp,
  ArrowDown,
  Church,
  PenTool,
  BookOpen,
  HelpCircle,
  Tag,
  Award,
  CheckCircle,
  PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, cn, toLocalDatetimeString } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import QuestionEditor from "../../components/admin/QuestionEditor";
import { SmartImage } from "../../components/ui/SmartImage";
import { notificationService } from "../../lib/notificationService";

export default function AssessmentCreator() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const isExamCreator = user?.isExamCreator === true;
  const isAuthorizedCreator = isAdmin || isExamCreator;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
    onSecondary?: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    show: false,
    title: "",
    message: "",
    confirmText: "",
    onConfirm: () => {},
  });
  const [participantCounts, setParticipantCounts] = useState({ OT: 0, NT: 0, servant: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<{
    q: Question;
    diff: string;
  } | null>(null);

  const [manualQuestion, setManualQuestion] = useState({
    text: "",
    type: "multiple-choice" as "multiple-choice" | "true-false" | "short-answer",
    options: ["", "", "", ""],
    correctAnswer: "",
    difficulty: "easy" as "easy" | "medium" | "hard",
    category: "",
    reference: "",
    explanation: "",
    modelAnswer: "",
    aiRubric: "",
  });
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const [creatorMode, setCreatorMode] = useState<"ai" | "manual">(isAuthorizedCreator ? "ai" : "manual");

  const handleAddManualQuestion = () => {
    setManualError(null);
    setManualSuccess(null);

    if (!manualQuestion.text.trim()) {
      setManualError("يرجى كتابة نص السؤال أولاً.");
      return;
    }

    if (!manualQuestion.category?.trim()) {
      setManualError("يرجى تحديد تصنيف السؤال أو هويته (مثلاً: طلاب الورشة، طلاب اونلاين).");
      return;
    }

    const diff = manualQuestion.difficulty;
    const defaultPoints = diff === "easy" ? 2 : diff === "medium" ? 4 : 6;

    let finalCorrect = manualQuestion.correctAnswer;
    let finalOptions = [...manualQuestion.options];

    if (manualQuestion.type === "multiple-choice") {
      const activeOptions = manualQuestion.options.filter(o => o.trim() !== "");
      if (activeOptions.length < 2) {
        setManualError("يرجى ملء خيارين على الأقل في السؤال ذو الاختيارات المتعددة.");
        return;
      }
      if (!manualQuestion.correctAnswer || !activeOptions.includes(manualQuestion.correctAnswer)) {
        setManualError("يرجى تحديد الإجابة الصحيحة بالضغط على علامة الصح بجانب الخيار الصحيح.");
        return;
      }
    } else if (manualQuestion.type === "true-false") {
      finalOptions = ["صح", "خطأ"];
      if (finalCorrect !== "صح" && finalCorrect !== "خطأ") {
        finalCorrect = "صح"; // default
      }
    } else if (manualQuestion.type === "short-answer") {
      finalOptions = [];
      if (!manualQuestion.modelAnswer?.trim()) {
        setManualError("يرجى كتابة الإجابة النموذجية للسؤال المقالي.");
        return;
      }
      finalCorrect = manualQuestion.modelAnswer.trim();
    }

    const qLength = formData.questions?.[diff]?.length || 0;
    const textLen = manualQuestion.text.length;
    const titleLen = formData.title?.length || 0;

    const newQ: Question = {
      id: `manual-${diff}-${qLength}-${textLen}-${titleLen}-${qLength + 1}`,
      text: manualQuestion.text.trim(),
      type: manualQuestion.type,
      options: finalOptions,
      correctAnswer: finalCorrect,
      difficulty: diff,
      points: defaultPoints,
      category: manualQuestion.category.trim(),
      reference: manualQuestion.reference?.trim() || "",
      explanation: manualQuestion.explanation?.trim() || "",
      isLocked: true,
      isReviewed: true,
    };
    
    if (manualQuestion.type === "short-answer") {
      newQ.modelAnswer = manualQuestion.modelAnswer.trim();
      newQ.aiRubric = manualQuestion.aiRubric?.trim() || "";
    }

    const newQuestions = { ...formData.questions };
    if (!newQuestions[diff]) {
      newQuestions[diff] = [];
    }
    newQuestions[diff] = [...newQuestions[diff], newQ];

    setFormData({ ...formData, questions: newQuestions });
    
    // Clear form but keep category & reference so consecutive questions are fast to enter
    setManualQuestion({
      ...manualQuestion,
      text: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      explanation: "",
      modelAnswer: "",
      aiRubric: "",
    });

    setManualSuccess("تمت إضافة السؤال بنجاح إلى قائمة الأسئلة بالأسفل!");
    // Scroll to the added question briefly if possible
    setTimeout(() => setManualSuccess(null), 4000);
  };
 
  const [formData, setFormData] = useState<Partial<Assessment>>({
    title: "",
    text: "",
    language: "Arabic",
    readingDuration: 5,
    answerDuration: 5,
    hideTextDuringQuestions: true,
    allowReturnToText: false,
    fullscreenMode: true,
    antiCopyMode: true,
    status: "draft",
    targetGroup: "all",
    questions: { easy: [], medium: [], hard: [] },
    assessmentType: "reading-questions",
  });
 
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const q = query(collection(db, "users"));
        const snapshot = await getDocs(q);
        const counts = { OT: 0, NT: 0, servant: 0, total: 0 };
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.role === 'student') {
             counts.total++;
             const upperCode = data.code?.toUpperCase() || "";
             if (upperCode.startsWith('H')) counts.OT++;
             else if (upperCode.startsWith('N')) counts.NT++;
             else if (upperCode.startsWith('S')) counts.servant++;
          }
        });
        setParticipantCounts(counts);
      } catch (err) {
        console.error("Error fetching user counts:", err);
      }
    };
    fetchCounts();
  }, []);

  useEffect(() => {
    if (!isAuthorizedCreator) return;

    if (id) {
      const fetchAssessment = async () => {
        try {
          const docRef = doc(db, "assessments", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Assessment;
            if (data.questions) {
              const updatedQuestions = { ...data.questions };
              Object.keys(updatedQuestions).forEach((diff) => {
                updatedQuestions[diff as keyof typeof updatedQuestions] =
                  updatedQuestions[diff as keyof typeof updatedQuestions].map((q) => ({
                    ...q,
                    isReviewed: true,
                  }));
              });
              data.questions = updatedQuestions;
            }
            setFormData({ id: docSnap.id, ...data });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `assessments/${id}`);
        }
      };
      fetchAssessment();
    }
  }, [id, isAuthorizedCreator]);

  const updateQuestion = (
    diff: keyof Assessment["questions"],
    updatedQ: Question,
  ) => {
    const newQuestions = { ...formData.questions! };
    const idx = newQuestions[diff].findIndex((q) => q.id === updatedQ.id);
    if (idx !== -1) {
      newQuestions[diff][idx] = updatedQ;
    } else {
      newQuestions[diff].push(updatedQ);
    }
    setFormData({ ...formData, questions: newQuestions });
    setEditingQuestion(null);
  };

  const deleteQuestion = (diff: keyof Assessment["questions"], qId: string) => {
    setConfirmModal({
      show: true,
      title: "حذف السؤال",
      message: "هل أنت متأكد من رغبتك في حذف هذا السؤال؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmText: "حذف الآن",
      cancelText: "إلغاء",
      type: "danger",
      onConfirm: () => {
        const newQuestions = { ...formData.questions! };
        newQuestions[diff] = newQuestions[diff].filter((q) => q.id !== qId);
        setFormData({ ...formData, questions: newQuestions });
        setEditingQuestion(null);
        setConfirmModal(prev => ({ ...prev, show: false }));
      }
    });
  };

  const duplicateQuestion = (
    diff: keyof Assessment["questions"],
    q: Question,
  ) => {
    const newQuestions = { ...formData.questions! };
    const duplicated: Question = {
      ...q,
      id: `${q.id}-copy-${Date.now()}`,
      isLocked: false,
      isReviewed: false,
    };
    newQuestions[diff].push(duplicated);
    setFormData({ ...formData, questions: newQuestions });
    setEditingQuestion({ q: duplicated, diff });
  };

  const handleAIQuestions = async () => {
    if (!formData.text || formData.text.length < 50) {
      setError(
        "Please provide a longer reading text (at least 50 chars) for AI generation.",
      );
      return;
    }

    const startGeneration = async () => {
      setIsGenerating(true);
      setError(null);
      setConfirmModal((prev) => ({ ...prev, show: false }));
      try {
        const generated = await generateQuestions(
          formData.text!,
          formData.language || "English",
        );

        const structured: {
          easy: Question[];
          medium: Question[];
          hard: Question[];
        } = {
          easy: [...(formData.questions?.easy?.filter((q) => q.isLocked) || [])],
          medium: [
            ...(formData.questions?.medium?.filter((q) => q.isLocked) || []),
          ],
          hard: [...(formData.questions?.hard?.filter((q) => q.isLocked) || [])],
        };

        generated.forEach((q) => {
          const diff = q.difficulty as keyof typeof structured;
          if (structured[diff].length < 3) {
            const question: Question = {
              ...q,
              id: `q-${diff}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              points: diff === "easy" ? 2 : diff === "medium" ? 4 : 6,
              isLocked: false,
              isReviewed: false,
            };
            structured[diff].push(question);
          }
        });

        setFormData((prev) => ({ ...prev, questions: structured }));
      } catch (err: any) {
        console.error(err);
        setError(err.message || "AI Question Generation failed. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };

    const hasUnlockedQuestions = Object.values(formData.questions || {}).some(
      (arr) => arr.some((q) => !q.isLocked),
    );

    if (hasUnlockedQuestions) {
      setConfirmModal({
        show: true,
        title: "توليد أسئلة جديدة",
        message:
          "توليد الأسئلة هيمسح كل الأسئلة اللي مش مقفولة (Unlocked). هل عايز تكمل؟",
        confirmText: "توليد الآن",
        cancelText: "إلغاء",
        type: "warning",
        onConfirm: startGeneration,
      });
    } else {
      startGeneration();
    }
  };

  const handleSave = async (e: React.FormEvent, publish: boolean = false) => {
    e?.preventDefault();
    const isQuestionsOnly = formData.assessmentType === 'questions-only';
    if (!formData.title || (!isQuestionsOnly && !formData.text)) {
      setError(isQuestionsOnly ? "اسم الاختبار مطلوب." : "اسم الاختبار والنص مطلوبان.");
      return;
    }

    const allQuestions = Object.values(formData.questions || {}).flat();
    if (allQuestions.length === 0) {
      setError("Please generate or add questions before saving.");
      return;
    }

    if (publish) {
      // Auto-validate questions or simply skip the check since user wants to publish immediately
      allQuestions.forEach(q => q.isReviewed = true);
    }

    const executeSave = async (finalId?: string, finalVersion: number = 1) => {
      setIsSaving(true);
      setError(null);
      setConfirmModal(prev => ({ ...prev, show: false }));
      
      try {
        const cleanQuestions = JSON.parse(JSON.stringify({
          easy: formData.questions?.easy || [],
          medium: formData.questions?.medium || [],
          hard: formData.questions?.hard || [],
        }));
        cleanQuestions.easy = cleanQuestions.easy.map((q: any) => ({
          ...q,
          points: 2,
          difficulty: "easy" as const,
          isReviewed: q.isReviewed ?? false,
        }));
        cleanQuestions.medium = cleanQuestions.medium.map((q: any) => ({
          ...q,
          points: 4,
          difficulty: "medium" as const,
          isReviewed: q.isReviewed ?? false,
        }));
        cleanQuestions.hard = cleanQuestions.hard.map((q: any) => ({
          ...q,
          points: 6,
          difficulty: "hard" as const,
          isReviewed: q.isReviewed ?? false,
        }));

        const { id: _, ...rest } = formData;
        const initialData = {
          ...rest,
          questions: cleanQuestions,
          version: finalVersion,
          status: publish ? "active" : "draft",
          createdAt: formData.createdAt || new Date().toISOString(),
          expiresAt:
            formData.expiresAt ||
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
        
        const data = JSON.parse(JSON.stringify(initialData));
        data.updatedAt = serverTimestamp();

        if (finalId) {
          await setDoc(doc(db, "assessments", finalId), data);
        } else {
          await addDoc(collection(db, "assessments"), data);
        }

        if (publish) {
          await notificationService.sendNotification({
            title: "اختبار جديد متاح! 🚀",
            message: `تم نشر اختبار جديد: ${formData.title}. ابدأ الحل دلوقتي وزود نقاطك!`,
            type: "success",
            category: "assessments",
            targetRole: "student",
            targetGroups: formData.targetGroup ? [formData.targetGroup] : ["all"]
          });
        }

        navigate(isAuthorizedCreator ? "/admin/assessments" : "/student");
      } catch (err: any) {
        console.error(err);
        handleFirestoreError(err, OperationType.WRITE, "assessments");
        setError("Failed to save assessment: " + (err.message || String(err)));
      } finally {
        setIsSaving(false);
      }
    };

    const prepareSave = async () => {
      const finalId = id;
      const finalVersion = formData.version || 1;

      if (id) {
        const subQ = query(
          collection(db, "submissions"),
          where("assessmentId", "==", id),
        );
        const subSnap = await getDocs(subQ);

        if (!subSnap.empty) {
          setConfirmModal({
            show: true,
            title: "تحديث الاختبار",
            message: "هذا الاختبار له مشاركون بالفعل. ماذا تريد أن تفعل؟",
            confirmText: "إنشاء نسخة جديدة (v" + (finalVersion + 1) + ")",
            cancelText: "إلغاء",
            type: "warning",
            onConfirm: () => executeSave(undefined, finalVersion + 1),
            onSecondary: () => executeSave(id, finalVersion),
          });
          // We need a custom way to handle the "Modify direct" option since it's a 3-way choice conceptually (Cancel modal, Action 1, Action 2)
          // Actually, let's make it simpler: Confirm = New Version, Cancel = Modify Direct, X = Close/Abort.
          // But that's confusing. Let's add a custom component for this choice or use 2 buttons.
          // I will use a custom message or just stick to the 2 buttons for now.
          return;
        }
      }
      executeSave(finalId, finalVersion);
    };

    if (publish) {
      setConfirmModal({
        show: true,
        title: "نشر الاختبار",
        message: "هل أنت متأكد من نشر الاختبار؟ سيتمكن الطلاب من البدء في الحل فوراً.",
        confirmText: "نشر الآن",
        cancelText: "إلغاء",
        type: "info",
        onConfirm: prepareSave,
      });
    } else {
      prepareSave();
    }
  };

  const moveQuestion = (
    diff: keyof Assessment["questions"],
    index: number,
    direction: "up" | "down",
  ) => {
    const newQuestions = { ...formData.questions! };
    const list = [...newQuestions[diff]];
    const newIndex = direction === "up" ? index - 1 : index + 1;

    if (newIndex >= 0 && newIndex < list.length) {
      [list[index], list[newIndex]] = [list[newIndex], list[index]];
      newQuestions[diff] = list;
      setFormData({ ...formData, questions: newQuestions });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 rtl" dir="rtl">
      {!isAdmin && isExamCreator && (
        <div className="mb-8 p-6 bg-gradient-to-br from-white to-brand-cream/40 border-r-4 border-l border-t border-b border-r-brand-red border-brand-beige/10 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 text-right shadow-sm shadow-brand-beige/5">
          <div className="flex items-center gap-4">
            <span className="w-12 h-12 rounded-2xl bg-brand-red/10 text-brand-red flex items-center justify-center shrink-0 text-xl shadow-inner">
              ✨
            </span>
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-brand-text font-black text-sm tracking-tight">بوابة واضعي الاختبارات والخدام 📋</p>
                <button
                  onClick={() => navigate("/student")}
                  className="bg-transparent text-brand-red hover:underline text-xs font-black transition-all flex items-center gap-1 whitespace-nowrap mr-auto"
                >
                  <span>بوابة الطلاب للرجوع ↩️</span>
                </button>
              </div>
              <p className="text-brand-beige/80 text-[11px] font-semibold mt-1 leading-relaxed max-w-2xl">
                مرحباً بك يا خادم! يتيح لك هذا النظام صياغة وإضافة اختبار رائع ومسابقات تفاعلية لأبنائك وبناتك الطلاب. اضغط للرجوع وبدء المشاركة وحل الاختبارات في أي وقت.
              </p>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {confirmModal.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-brand-text/40 backdrop-blur-md z-[200] flex items-center justify-center p-6 rtl"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-brand-beige/10 p-8 text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6",
                confirmModal.type === 'danger' ? "bg-rose-50 text-rose-500" :
                confirmModal.type === 'warning' ? "bg-amber-50 text-amber-500" :
                "bg-blue-50 text-blue-500"
              )}>
                {confirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> :
                 confirmModal.type === 'warning' ? <AlertCircle className="w-8 h-8" /> :
                 <Globe className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-black text-brand-text mb-2">{confirmModal.title}</h3>
              <p className="text-brand-beige font-bold text-sm leading-relaxed mb-8">
                {confirmModal.message}
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmModal.onConfirm}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all",
                    confirmModal.type === 'danger' ? "bg-rose-500 text-white shadow-rose-200 hover:bg-rose-600" :
                    confirmModal.type === 'warning' ? "bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600" :
                    "bg-brand-red text-white shadow-brand-red/20 hover:bg-red-700"
                  )}
                >
                  {confirmModal.confirmText}
                </button>

                {/* Handle Versioning specific second choice if needed, otherwise standard cancel */}
                {confirmModal.title === "تحديث الاختبار" && confirmModal.onSecondary ? (
                   <button
                    onClick={confirmModal.onSecondary}
                    className="w-full py-4 bg-brand-cream text-brand-beige rounded-2xl font-black text-xs hover:bg-brand-beige/10 transition-all"
                  >
                    تعديل النسخة الحالية
                  </button>
                ) : null}

                <button
                  onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
                  className="w-full py-4 bg-transparent text-brand-beige rounded-2xl font-black text-xs hover:bg-brand-cream transition-all"
                >
                  {confirmModal.cancelText || "إلغاء"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingQuestion && (
          <QuestionEditor
            question={editingQuestion.q}
            assessmentText={formData.text || ""}
            onClose={() => setEditingQuestion(null)}
            onSave={(q) => updateQuestion(editingQuestion.diff as any, q)}
            onDelete={() =>
              deleteQuestion(editingQuestion.diff as any, editingQuestion.q.id)
            }
            onDuplicate={() =>
              duplicateQuestion(editingQuestion.diff as any, editingQuestion.q)
            }
            showAIAssist={isAuthorizedCreator}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate(isAuthorizedCreator ? "/admin/assessments" : "/student")}
            className="p-3 bg-transparent text-brand-beige hover:text-brand-text rounded-2xl transition-colors shrink-0"
          >
            <ArrowLeft className="w-6 h-6 rotate-180" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center -space-x-4">
              <div className="w-16 h-16 rounded-full bg-white border-2 border-brand-beige/20 shadow-xl flex items-center justify-center overflow-hidden z-10">
                <SmartImage
                  src="/assets/logo-red.png"
                  alt="Church"
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center bg-brand-red/5 text-brand-red font-black"><Church className="w-8 h-8" /></div>}
                />
              </div>
              <div className="w-16 h-16 rounded-full bg-white border-2 border-brand-beige/20 shadow-xl flex items-center justify-center overflow-hidden">
                <SmartImage
                  src="/assets/logo-beige.png"
                  alt="Brand"
                  className="w-full h-full object-cover"
                  fallback={<div className="w-full h-full flex items-center justify-center bg-brand-beige/5 text-brand-beige font-black">H</div>}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tighter text-brand-text">
                  {id ? "تعديل الاختبار" : "اختبار جديد"}
                </h1>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    formData.status === "draft"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-600",
                  )}
                >
                  {formData.status === "draft" ? "مسودة" : "نشط"}
                </span>
              </div>
              <p className="text-brand-beige font-bold mt-1">
                صمم تجربة التقييم القرائي الخاصة بك.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => handleSave(e as any, false)}
            disabled={isSaving}
            className="px-6 py-4 bg-transparent text-brand-beige font-black text-xs uppercase tracking-widest hover:text-brand-text transition-all flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            حفظ كمسودة
          </button>
          <button
            onClick={(e) => handleSave(e as any, true)}
            disabled={isSaving}
            className="px-8 py-4 bg-brand-red text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-red/10 hover:bg-red-700 transition-all flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <Globe className="w-4 h-4 ml-2" />}
            نشر الاختبار
          </button>
        </div>
      </div>

      <form onSubmit={(e) => handleSave(e, false)} className="space-y-10 pb-24">
        {/* Core Info */}
        <section className="bg-white p-10 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
          <div className="flex items-center gap-2 justify-end">
            <h2 className="text-lg font-black uppercase tracking-widest text-brand-beige">
              الإعدادات العامة
            </h2>
            <Settings className="w-5 h-5 text-brand-red" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 text-right">
                اسم الاختبار
              </label>
              <input
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold transition-all text-brand-text text-right"
                placeholder="مثلاً: مسابقة سفر أعمال الرسل ٢٠٢٤"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 text-right">
                اللغة الأساسية
              </label>
              <select
                value={formData.language || "Arabic"}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold appearance-none text-brand-text text-right"
              >
                <option value="Arabic">العربية</option>
                <option value="English">الإنجليزية</option>
              </select>
            </div>

            <div className="text-right">
              <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 text-right">
                تاريخ النشر (متى يظهر للطلاب)
              </label>
              <input
                type="datetime-local"
                value={
                  formData.availableFrom
                    ? toLocalDatetimeString(formData.availableFrom)
                    : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    availableFrom: e.target.value ? new Date(e.target.value).toISOString() : "",
                  })
                }
                className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right"
              />
            </div>

            <div className="text-right">
              <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 text-right">
                تاريخ الانتهاء
              </label>
              <input
                type="datetime-local"
                value={
                  formData.expiresAt
                    ? toLocalDatetimeString(formData.expiresAt)
                    : ""
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expiresAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                  })
                }
                className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right"
              />
            </div>

            {/* نوع الاختبار (Format Selector) */}
            <div className="md:col-span-2 space-y-4">
              <label className="block text-[11px] font-black tracking-widest text-brand-beige mb-3 text-right">
                شكل ونظام الاختبار 📋
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assessmentType: 'reading-questions' })}
                  className={cn(
                    "p-6 rounded-3xl border text-right transition-all flex flex-col justify-between min-h-[170px]",
                    (formData.assessmentType || 'reading-questions') === 'reading-questions'
                      ? "border-brand-red bg-brand-red/5 text-brand-text shadow-lg shadow-brand-red/5"
                      : "border-brand-beige/10 bg-brand-cream/10 hover:bg-brand-cream/20 text-brand-beige"
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      (formData.assessmentType || 'reading-questions') === 'reading-questions' ? "bg-brand-red text-white" : "bg-white/10 text-brand-beige"
                    )}>
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <span className={cn(
                      "text-[9px] px-2.5 py-1 rounded-full font-black",
                      (formData.assessmentType || 'reading-questions') === 'reading-questions' ? "bg-brand-red/10 text-brand-red" : "bg-white/5 text-brand-beige/60"
                    )}>
                      المرحلتين
                    </span>
                  </div>
                  <div className="mt-4">
                    <h4 className={cn("text-sm font-black mb-1", (formData.assessmentType || 'reading-questions') === 'reading-questions' ? "text-brand-text" : "text-brand-text/80")}>
                      قراءة وأسئلة 📖✍️
                    </h4>
                    <p className="text-[10px] font-semibold opacity-70 leading-relaxed text-right">
                      يقرأ الطالب النص أولاً بوقت محدد، ثم يغلق النص ويبدأ بحل الأسئلة المخصصة.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assessmentType: 'questions-only' })}
                  className={cn(
                    "p-6 rounded-3xl border text-right transition-all flex flex-col justify-between min-h-[170px]",
                    formData.assessmentType === 'questions-only'
                      ? "border-brand-red bg-brand-red/5 text-brand-text shadow-lg shadow-brand-red/5"
                      : "border-brand-beige/10 bg-brand-cream/10 hover:bg-brand-cream/20 text-brand-beige"
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center",
                      formData.assessmentType === 'questions-only' ? "bg-brand-red text-white" : "bg-white/10 text-brand-beige"
                    )}>
                      <Clock className="w-5 h-5" />
                    </span>
                    <span className={cn(
                      "text-[9px] px-2.5 py-1 rounded-full font-black",
                      formData.assessmentType === 'questions-only' ? "bg-brand-red/10 text-brand-red" : "bg-white/5 text-brand-beige/60"
                    )}>
                      مرحلة واحدة
                    </span>
                  </div>
                  <div className="mt-4">
                    <h4 className={cn("text-sm font-black mb-1", formData.assessmentType === 'questions-only' ? "text-brand-text" : "text-brand-text/80")}>
                      أسئلة فقط بوقت محدد ⏱️❓
                    </h4>
                    <p className="text-[10px] font-semibold opacity-70 leading-relaxed text-right">
                      يدخل الطالب مباشرةً على حل الأسئلة مع وجود مؤقت زمني تنازلي لكامل الاختبار.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 text-right">
                نشر الاختبار إلى:
              </label>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { id: 'all', label: 'الجميع', count: participantCounts.total, icon: <Globe className="w-4 h-4" /> },
                  { id: 'OT', label: 'طلاب اونلاين', count: participantCounts.OT, icon: <Church className="w-4 h-4" /> },
                  { id: 'NT', label: 'طلاب الورشة', count: participantCounts.NT, icon: <Sparkles className="w-4 h-4" /> },
                  { id: 'servant', label: 'الخدام', count: participantCounts.servant, icon: <Shield className="w-4 h-4" /> },
                ].map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, targetGroup: group.id as any })}
                    className={cn(
                      "p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group relative overflow-hidden",
                      formData.targetGroup === group.id 
                        ? "bg-brand-red border-brand-red text-white shadow-xl shadow-brand-red/20 scale-[1.02]" 
                        : "bg-white border-brand-beige/10 hover:border-brand-red/30 text-brand-text hover:bg-brand-cream/20"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                      formData.targetGroup === group.id ? "bg-white/20 rotate-12" : "bg-brand-cream group-hover:scale-110"
                    )}>
                      {group.icon}
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest mb-1">{group.label}</p>
                      <div className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                        formData.targetGroup === group.id ? "bg-white/20 text-white" : "bg-brand-cream text-brand-beige"
                      )}>
                        {group.count} مشترك
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reading Text */}
        <section className="bg-white p-10 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 justify-end w-full">
              <h2 className="text-lg font-black uppercase tracking-widest text-brand-beige">
                {formData.assessmentType === 'questions-only' ? "نص مرجعي أو تعليمات (اختياري)" : "محتوى الاختبار القراءي (مطلوب)"}
              </h2>
              <FileText className="w-5 h-5 text-brand-red" />
            </div>
          </div>

          <textarea
            value={formData.text || ""}
            onChange={(e) => setFormData({ ...formData, text: e.target.value })}
            className="w-full h-80 px-8 py-8 bg-brand-cream/20 border border-brand-beige/10 rounded-3xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-xl leading-relaxed transition-all resize-none text-right placeholder:text-brand-beige/30"
            placeholder={formData.assessmentType === 'questions-only' ? "اختياري: يمكنك وضع آيات مرجعية أو إرشادات حل إضافية للطلاب هنا..." : "مطلوب: اكتب أو انسخ النص الذي تريد بناء مسابقة حل الأسئلة عليه هنا..."}
            required={formData.assessmentType !== 'questions-only'}
          />

          {isAuthorizedCreator && (
            <div className="flex items-center gap-3 mb-6 bg-brand-cream/10 p-2 rounded-2xl w-fit mr-0 ml-auto mr-2">
              <button
                type="button"
                onClick={() => setCreatorMode('manual')}
                className={cn("px-6 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider", creatorMode === 'manual' ? "bg-white text-brand-text shadow-sm" : "text-brand-beige hover:text-brand-text")}
              >
                إضافة يدوية
              </button>
              <button
                type="button"
                onClick={() => setCreatorMode('ai')}
                className={cn("px-6 py-2.5 rounded-xl font-bold text-xs uppercase transition-all tracking-wider", creatorMode === 'ai' ? "bg-white text-brand-text shadow-sm" : "text-brand-beige hover:text-brand-text")}
              >
                توليد بالذكاء الاصطناعي
              </button>
            </div>
          )}

          {isAuthorizedCreator && creatorMode === 'ai' ? (
            <>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAIQuestions}
                disabled={isGenerating}
                className="w-full py-6 bg-brand-text text-white rounded-[32px] font-black flex items-center justify-center gap-4 shadow-2xl shadow-brand-text/20 disabled:opacity-50 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    جاري تحليل النص وتوليد الأسئلة...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6 text-brand-beige" />
                    توليد الأسئلة بالذكاء الاصطناعي (Gemini)
                  </>
                )}
              </motion.button>
              <p className="text-[10px] text-center text-brand-beige font-bold uppercase tracking-wider">
                الأسئلة المقفولة مش هتتغير لما تطلب توليد أسئلة جديدة.
              </p>
            </>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-amber-500/5 border border-amber-500/15 text-amber-900 rounded-[32px] text-right flex flex-col items-end gap-2.5">
                <span className="font-black text-amber-600 text-lg flex items-center gap-2">
                  وضع كتابة الأسئلة يدوياً للخدام
                  <PenTool className="w-5 h-5 text-amber-600" />
                </span>
                <p className="font-bold text-sm text-brand-text/70 leading-relaxed text-right">
                  بصفتك خادماً ومعداً للاختبار، يرجى تعبئة بيانات السؤال أدناه بشكل كامل، ثم الضغط على زر <span className="text-emerald-600 font-black">"إضافة هذا السؤال للاختبار"</span> لإضافته فوراً للمستوى المطلوب.
                </p>
              </div>

              {/* Instant Manual Question Form */}
              <div className="bg-brand-cream/10 p-6 md:p-8 rounded-[36px] border border-brand-beige/20 text-right space-y-6">
                <h3 className="text-sm font-black text-brand-text flex items-center justify-end gap-2 text-right">
                  منطقة إعداد وبناء سؤال جديد
                  <PlusCircle className="w-5 h-5 text-brand-red animate-pulse" />
                </h3>

                {manualError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl font-bold text-xs text-right animate-bounce">
                    ⚠️ {manualError}
                  </div>
                )}

                {manualSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-bold text-xs text-right flex items-center justify-end gap-2">
                    {manualSuccess}
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Category of question */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige">تصنيف أو هوية درس السؤال</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={manualQuestion.category || ''}
                        onChange={e => setManualQuestion({ ...manualQuestion, category: e.target.value })}
                        className="flex-1 px-4 py-3 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs"
                        placeholder="مثال: طلاب الورشة، طلاب اونلاين، طقوس..."
                      />
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            setManualQuestion({ ...manualQuestion, category: e.target.value });
                          }
                        }}
                        value={['طلاب اونلاين', 'طلاب الورشة', 'طقوس', 'عقيدة', 'شخصيات'].includes(manualQuestion.category) ? manualQuestion.category : ''}
                        className="px-2 py-3 bg-white border border-brand-beige/10 rounded-xl outline-none font-bold text-brand-text text-right text-xs max-w-[120px]"
                      >
                        <option value="">سريع</option>
                        <option value="طلاب اونلاين">طلاب اونلاين</option>
                        <option value="طلاب الورشة">طلاب الورشة</option>
                        <option value="طقوس">طقوس</option>
                        <option value="عقيدة">عقيدة</option>
                        <option value="شخصيات">شخصيات</option>
                      </select>
                    </div>
                  </div>

                  {/* Bible / study info Reference */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige">الشاهد الكتابي أو مرجع الدرس</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={manualQuestion.reference || ''}
                        onChange={e => setManualQuestion({ ...manualQuestion, reference: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs"
                        placeholder="مثال: لوقا ٢: ١-١٤، خروج ٢٠"
                      />
                      <BookOpen className="w-3.5 h-3.5 text-brand-beige absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Difficulty selector with points indicator */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige">المستوى ودرجات الحل</label>
                    <select
                      value={manualQuestion.difficulty || 'easy'}
                      onChange={e => setManualQuestion({ ...manualQuestion, difficulty: e.target.value as any })}
                      className="w-full px-4 py-3 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs"
                    >
                      <option value="easy">المستوى الأول: سهل - تذكر (٢ درجة)</option>
                      <option value="medium">المستوى الثاني: متوسط - استنتاج (٤ درجات)</option>
                      <option value="hard">المستوى الثالث: صعب - تحليل (٦ درجات)</option>
                    </select>
                  </div>

                  {/* Answer Question type */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige">نوع وطريقة إجابة السؤال</label>
                    <select
                      value={manualQuestion.type || 'multiple-choice'}
                      onChange={e => {
                        const t = e.target.value as any;
                        let defaultOpts = ["", "", "", ""];
                        let defaultCorrect = "";
                        if (t === "true-false") {
                          defaultOpts = ["صح", "خطأ"];
                          defaultCorrect = "صح";
                        }
                        setManualQuestion({ ...manualQuestion, type: t, options: defaultOpts, correctAnswer: defaultCorrect });
                      }}
                      className="w-full px-4 py-3 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs"
                    >
                      <option value="multiple-choice">سؤال اختياري (MCQ)</option>
                      <option value="true-false">صح أو خطأ (True / False)</option>
                      <option value="short-answer">سؤال مقالي (Short Answer)</option>
                    </select>
                  </div>
                </div>

                {/* Text Of the Question */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-brand-beige">صيغة ونص السؤال</label>
                  <textarea
                    value={manualQuestion.text || ''}
                    onChange={e => setManualQuestion({ ...manualQuestion, text: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs leading-relaxed"
                    placeholder="اكتب هنا صيغة السؤال الموجه للطلبة..."
                    rows={2}
                  />
                </div>

                {/* Custom Options and Answers according to type */}
                <div className="border-t border-brand-beige/10 pt-4 space-y-4">
                  <span className="block text-[11px] font-black uppercase tracking-widest text-brand-beige">تجهيز وكتابة الإجابة الصحيحة</span>

                  {manualQuestion.type === "multiple-choice" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {manualQuestion.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2 items-center flex-row-reverse bg-white/40 p-2.5 rounded-xl border border-brand-beige/5">
                          <button
                            type="button"
                            onClick={() => {
                              if (opt.trim()) setManualQuestion({ ...manualQuestion, correctAnswer: opt });
                            }}
                            title="تحديد كإجابة صحيحة"
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center border transition-all text-xs shrink-0",
                              manualQuestion.correctAnswer === opt && opt.trim() !== ""
                                ? "bg-emerald-500 text-white border-emerald-600 animate-pulse font-black"
                                : "bg-brand-cream text-brand-beige border-brand-beige/10 hover:bg-brand-cream/80"
                            )}
                          >
                            ✓
                          </button>
                          <input
                            type="text"
                            value={opt || ''}
                            onChange={e => {
                              const nextOpts = [...manualQuestion.options];
                              const oldCorrect = manualQuestion.correctAnswer;
                              nextOpts[idx] = e.target.value;
                              let nextCorrect = manualQuestion.correctAnswer;
                              if (oldCorrect === opt && opt !== "") {
                                nextCorrect = e.target.value;
                              }
                              setManualQuestion({ ...manualQuestion, options: nextOpts, correctAnswer: nextCorrect });
                            }}
                            className="flex-1 px-3 py-2 bg-white border border-brand-beige/10 rounded-lg outline-none font-bold text-brand-text text-right text-xs"
                            placeholder={`خيار ${idx + 1}`}
                          />
                          <span className="text-[10px] font-bold text-brand-beige">{idx + 1}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {manualQuestion.type === "true-false" && (
                    <div className="flex gap-3">
                      {["صح", "خطأ"].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setManualQuestion({ ...manualQuestion, correctAnswer: val })}
                          className={cn(
                            "flex-1 py-3 text-xs font-black rounded-xl border-2 transition-all",
                            manualQuestion.correctAnswer === val
                              ? "bg-brand-red text-white border-brand-red shadow-lg"
                              : "bg-white text-brand-beige border-brand-beige/10 hover:border-brand-red/10"
                          )}
                        >
                          {val === "صح" ? "صح ✓" : "خطأ ✗"}
                        </button>
                      ))}
                    </div>
                  )}

                  {manualQuestion.type === "short-answer" && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-[#8c7a6b]">الإجابة النموذجية الصحيحة</label>
                        <textarea
                          value={manualQuestion.modelAnswer || ''}
                          onChange={e => setManualQuestion({ ...manualQuestion, modelAnswer: e.target.value, correctAnswer: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-brand-beige/10 rounded-xl outline-none font-bold text-brand-text text-right text-xs leading-relaxed"
                          placeholder="اكتب الإجابة الكاملة..."
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-black text-[#8c7a6b]">محددات التصحيح أو الكلمات الدلالية الهامة (اختياري)</label>
                        <input
                          type="text"
                          value={manualQuestion.aiRubric || ''}
                          onChange={e => setManualQuestion({ ...manualQuestion, aiRubric: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-brand-beige/10 rounded-xl outline-none font-bold text-brand-text text-right text-xs"
                          placeholder="مثال: يذكر العشور، اسم الملك، إلخ..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Explanation text */}
                <div className="space-y-2 border-t border-brand-beige/10 pt-4">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-[#8c7a6b]">توضيح وتفسير الإجابة (تظهر بعد انتهاء الاختبار)</label>
                  <input
                    type="text"
                    value={manualQuestion.explanation || ''}
                    onChange={e => setManualQuestion({ ...manualQuestion, explanation: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs"
                    placeholder="شرح مبسط للإجابة الصحيحة للطلاب..."
                  />
                </div>

                {/* Submit button for custom question adding */}
                <div className="pt-2 flex justify-end">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleAddManualQuestion}
                    className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-100 transition-all"
                  >
                    <Plus className="w-4 h-4 ml-1" />
                    إضافة هذا السؤال للاختبار
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Timers & Behavior */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-10 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
            <div className="flex items-center gap-2 justify-end">
              <h2 className="text-lg font-black uppercase tracking-widest text-brand-beige">
                توزيع الوقت
              </h2>
              <Clock className="w-5 h-5 text-brand-red" />
            </div>
            <div className="space-y-8">
              {formData.assessmentType !== 'questions-only' && (
                <div>
                  <label className="flex justify-between text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 ml-1">
                    <span className="text-brand-red text-right">
                      {formData.readingDuration}:00 دقيقة
                    </span>
                    <span>وقت القراءة</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={formData.readingDuration || 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        readingDuration: parseInt(e.target.value),
                      })
                    }
                    className="w-full h-2 bg-brand-cream rounded-lg appearance-none cursor-pointer accent-brand-red scale-x-[-1]"
                  />
                </div>
              )}
              <div>
                <label className="flex justify-between text-[11px] font-black uppercase tracking-widest text-brand-beige mb-3 ml-1">
                  <span className="text-brand-red text-right">
                    {formData.answerDuration}:00 دقيقة
                  </span>
                  <span>{formData.assessmentType === 'questions-only' ? "الوقت الكلي المتاح لحل الاختبار" : "وقت حل الأسئلة"}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={formData.answerDuration || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      answerDuration: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-2 bg-brand-cream rounded-lg appearance-none cursor-pointer accent-brand-red scale-x-[-1]"
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-10 rounded-[40px] border border-brand-beige/10 shadow-sm space-y-8">
            <div className="flex items-center gap-2 justify-end">
              <h2 className="text-lg font-black uppercase tracking-widest text-brand-beige">
                إعدادات الأمان
              </h2>
              <Shield className="w-5 h-5 text-brand-red" />
            </div>
            <div className="grid grid-cols-1 gap-4">
              <Toggle
                label="إخفاء النص أثناء الحل"
                value={formData.hideTextDuringQuestions!}
                onChange={(val) =>
                  setFormData({ ...formData, hideTextDuringQuestions: val })
                }
              />
              <Toggle
                label="السماح بالعودة للنص"
                value={formData.allowReturnToText!}
                onChange={(val) =>
                  setFormData({ ...formData, allowReturnToText: val })
                }
              />
              <Toggle
                label="إجبار ملء الشاشة (Fullscreen)"
                value={formData.fullscreenMode!}
                onChange={(val) =>
                  setFormData({ ...formData, fullscreenMode: val })
                }
              />
              <Toggle
                label="منع نسخ المحتوى"
                value={formData.antiCopyMode!}
                onChange={(val) =>
                  setFormData({ ...formData, antiCopyMode: val })
                }
              />
            </div>
          </section>
        </div>

        {/* Questions Preview */}
        {Object.values(formData.questions || {}).some(
          (arr) => arr.length > 0,
        ) && (
          <section className="bg-brand-text rounded-[48px] p-12 text-white space-y-10">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div className="flex items-center gap-4 text-right justify-end w-full">
                <div className="text-right mr-4">
                  <h2 className="text-2xl font-black">الأسئلة المتاحة</h2>
                  <p className="text-brand-beige/50 text-sm font-bold">
                    تم إنشاء{" "}
                    {Object.values(formData.questions || {}).flat().length} سؤال
                    عبر المستويات المختلفة.
                  </p>
                </div>
                <Sparkles className="w-8 h-8 text-brand-beige" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <DifficultyColumn
                title="المستوى 1: تذكر"
                points={2}
                questions={formData.questions?.easy || []}
                color="bg-emerald-500/10 text-emerald-400"
                border="border-emerald-500/10"
                onEdit={(q) => setEditingQuestion({ q, diff: "easy" })}
                onReview={(q) => updateQuestion("easy", { ...q, isReviewed: true })}
                onAdd={() =>
                  setEditingQuestion({
                    q: {
                      id: `manual-easy-${Date.now()}`,
                      text: "",
                      type: "multiple-choice",
                      correctAnswer: "",
                      difficulty: "easy",
                      points: 2,
                      isLocked: true,
                    },
                    diff: "easy",
                  })
                }
                onMove={(idx, dir) => moveQuestion("easy", idx, dir)}
              />
              <DifficultyColumn
                title="المستوى 2: استنتاج"
                points={4}
                questions={formData.questions?.medium || []}
                color="bg-amber-500/10 text-amber-400"
                border="border-amber-500/10"
                onEdit={(q) => setEditingQuestion({ q, diff: "medium" })}
                onReview={(q) => updateQuestion("medium", { ...q, isReviewed: true })}
                onAdd={() =>
                  setEditingQuestion({
                    q: {
                      id: `manual-medium-${Date.now()}`,
                      text: "",
                      type: "multiple-choice",
                      correctAnswer: "",
                      difficulty: "medium",
                      points: 4,
                      isLocked: true,
                    },
                    diff: "medium",
                  })
                }
                onMove={(idx, dir) => moveQuestion("medium", idx, dir)}
              />
              <DifficultyColumn
                title="المستوى 3: تحليل"
                points={6}
                questions={formData.questions?.hard || []}
                color="bg-rose-500/10 text-rose-400"
                border="border-rose-500/10"
                onEdit={(q) => setEditingQuestion({ q, diff: "hard" })}
                onReview={(q) => updateQuestion("hard", { ...q, isReviewed: true })}
                onAdd={() =>
                  setEditingQuestion({
                    q: {
                      id: `manual-hard-${Date.now()}`,
                      text: "",
                      type: "short-answer",
                      correctAnswer: "",
                      difficulty: "hard",
                      points: 6,
                      isLocked: true,
                    },
                    diff: "hard",
                  })
                }
                onMove={(idx, dir) => moveQuestion("hard", idx, dir)}
              />
            </div>
          </section>
        )}

        {error && (
          <div className="flex items-center gap-3 p-6 bg-rose-50 border border-rose-100 rounded-[24px] text-rose-800">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-bold text-sm tracking-tight">{error}</p>
          </div>
        )}

        {/* Global Save */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-2xl border-t border-brand-beige/10 p-6 z-50">
          <div className="max-w-5xl mx-auto flex flex-row-reverse gap-4">
            <button
              type="button"
              onClick={() => navigate(isAuthorizedCreator ? "/admin/assessments" : "/student")}
              className="flex-1 py-4 bg-brand-cream text-brand-beige rounded-2xl font-black hover:bg-brand-beige/10 transition-all text-xs uppercase tracking-widest"
            >
              إلغاء التغييرات
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-4 bg-white border border-brand-beige/20 text-brand-text rounded-2xl font-black hover:bg-brand-cream transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              حفظ كمسودة
            </button>
            <button
              type="button"
              onClick={() => handleSave(null as any, true)}
              disabled={isSaving}
              className="flex-[2] py-4 bg-brand-red text-white rounded-2xl font-black shadow-xl shadow-brand-red/10 hover:bg-red-700 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 ml-2" />
              )}
              {isSaving ? "جاري النشر..." : "نشر الاختبار للطلاب"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center justify-between p-4 bg-brand-cream/10 rounded-2xl hover:bg-brand-cream/30 transition-colors text-right w-full"
    >
      <div
        className={cn(
          "w-12 h-6 rounded-full transition-all relative px-1 flex items-center",
          value ? "bg-brand-red" : "bg-brand-beige/30",
        )}
      >
        <div
          className={cn(
            "w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
            value ? "translate-x-0" : "translate-x-6",
          )}
        />
      </div>
      <span className="text-xs font-black text-brand-text">{label}</span>
    </button>
  );
}

function DifficultyColumn({
  title,
  questions,
  color,
  border,
  onEdit,
  onAdd,
  onMove,
  onReview,
}: {
  title: string;
  points: number;
  questions: Question[];
  color: string;
  border: string;
  onEdit: (q: Question) => void;
  onAdd: () => void;
  onMove: (idx: number, dir: "up" | "down") => void;
  onReview: (q: Question) => void;
}) {
  return (
    <div className={cn("rounded-[32px] p-6 border text-right", border)}>
      <div className="flex items-center justify-between mb-6 flex-row-reverse">
        <span
          className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
            color,
          )}
        >
          {title}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-brand-beige hover:text-white"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-[10px] text-brand-beige/40 italic font-black uppercase tracking-widest text-center mt-8">
            مفيش أسئلة لسه
          </p>
        ) : (
          questions.map((q, i) => (
            <div
              key={q.id}
              className="bg-white/5 p-5 rounded-2xl group relative overflow-hidden border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="space-y-3 relative z-10 text-right">
                <div className="flex items-center justify-between flex-row-reverse">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-lg uppercase font-black text-brand-beige">
                      {q.type === "multiple-choice" ? "اختياري" : "مقالي"}
                    </span>
                    {q.isLocked && (
                      <span title="مقفول من التعديل التلقائي">
                        <Lock className="w-3 h-3 text-brand-beige" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onMove(i, "up")}
                      disabled={i === 0}
                      className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-20 text-brand-beige"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(i, "down")}
                      disabled={i === questions.length - 1}
                      className="p-1.5 hover:bg-white/10 rounded-lg disabled:opacity-20 text-brand-beige"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-xs font-bold leading-relaxed line-clamp-3 text-brand-cream">
                  {q.text}
                </p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all flex-row-reverse">
                  <div className="flex flex-row-reverse gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(q)}
                      className="py-1 px-3 bg-white/10 hover:bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all text-right"
                    >
                      تعديل
                    </button>
                    {!q.isReviewed && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onReview(q); }}
                         className="py-1 px-3 bg-brand-red hover:bg-red-700 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all text-right shadow-sm shadow-brand-red/20"
                      >
                        اعتماد
                      </button>
                    )}
                  </div>
                  {!q.isReviewed && (
                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-brand-red animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      محتاج مراجعة
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
