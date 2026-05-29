import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { Submission, Assessment, Question } from "../../types";
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Brain,
  MessageSquare,
  Trophy,
  Activity,
  Award,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, calculatePercentage } from "../../lib/utils";
import ReactMarkdown from "react-markdown";
import { useTranslation } from "react-i18next";

export default function PostExamReview() {
  const { t, i18n } = useTranslation();
  const { submissionId } = useParams<{ submissionId: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!submissionId) return;
      try {
        const sSnap = await getDoc(doc(db, "submissions", submissionId));
        if (sSnap.exists()) {
          const sData = sSnap.data() as Submission;
          setSubmission(sData);
          
          const aSnap = await getDoc(doc(db, "assessments", sData.assessmentId));
          if (aSnap.exists()) {
            setAssessment(aSnap.data() as Assessment);
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `submissions/${submissionId}`);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [submissionId]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-black text-brand-beige">{t('assessments.review_loading')}</div>;
  if (!submission || !assessment) return <div className="min-h-screen flex items-center justify-center font-black text-brand-beige">{t('assessments.review_not_found')}</div>;

  const scorePercentage = calculatePercentage(submission.finalScore, submission.maxScore);

  return (
    <div className={cn("min-h-screen bg-brand-cream p-6 lg:p-12 font-bold", i18n.language === 'ar' ? 'text-right' : 'text-left')} dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link to="/student" className="p-3 bg-white rounded-2xl shadow-sm hover:scale-110 transition-transform group">
              <ArrowRight className={cn("w-6 h-6 text-brand-beige group-hover:text-brand-red", i18n.language === 'en' ? 'rotate-180' : '')} />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-brand-text tracking-tighter">{t('assessments.review_title')}</h1>
              <p className="text-brand-beige mt-1">{assessment.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white px-8 py-4 rounded-[28px] border border-brand-beige/10 shadow-sm relative group">
             <div className="bg-brand-cream p-3 rounded-2xl text-brand-red">
               <Trophy className="w-6 h-6" />
             </div>
             <div className="flex flex-col">
               <span className="text-[10px] text-brand-beige uppercase tracking-widest leading-none mb-1">{t('assessments.total_score')} ({scorePercentage}%)</span>
               <div className="flex items-baseline gap-1">
                 <span className="text-3xl font-black text-brand-text">{submission.finalScore}</span>
                 <span className="text-brand-beige">/ {submission.maxScore}</span>
               </div>
             </div>

             {/* Score Breakdown Tooltip-like Info */}
             <div className="absolute top-full mt-2 left-0 right-0 bg-white p-4 rounded-2xl shadow-xl border border-brand-beige/10 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                <div className="space-y-2 text-xs">
                   <div className={cn("flex justify-between items-center font-bold", i18n.language === 'ar' ? 'flex-row-reverse' : 'flex-row')}>
                      <span className="text-brand-beige">{t('assessments.answers_score')}:</span>
                      <span className="text-brand-text">{submission.answers.reduce((acc, a) => acc + a.score, 0)}</span>
                   </div>
                   {submission.adminAdjustment !== 0 && submission.adminAdjustment !== undefined && (
                     <div className={cn(
                       "flex justify-between items-center font-bold",
                       submission.adminAdjustment > 0 ? "text-emerald-600" : "text-brand-red",
                       i18n.language === 'ar' ? 'flex-row-reverse' : 'flex-row'
                     )}>
                        <span className="text-brand-beige">{t('assessments.admin_adj')}:</span>
                        <span>{submission.adminAdjustment > 0 ? `+${submission.adminAdjustment}` : submission.adminAdjustment}</span>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>

        {/* Global Feedback Card */}
        {(submission.aiFeedback || submission.adminReviewNotes) && (
          <div className="space-y-6">
            {submission.adminReviewNotes && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-red rounded-[40px] p-8 text-white relative overflow-hidden shadow-xl shadow-brand-red/10"
              >
                <div className="absolute top-0 left-0 p-4 md:p-6 opacity-10">
                  <Award className="w-16 h-16 md:w-24 md:h-24" />
                </div>
                <div className="relative z-10 space-y-4">
                  <h3 className="text-xl font-black flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    ملاحظات المعلم
                  </h3>
                  <div className="text-white/90 leading-relaxed font-bold bg-white/10 p-6 rounded-3xl border border-white/20">
                    <p className="whitespace-pre-wrap">{submission.adminReviewNotes}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {submission.aiFeedback && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-text rounded-[40px] p-8 text-white relative overflow-hidden"
              >
                 <div className="absolute top-0 right-0 p-6 opacity-10">
                   <Brain className="w-16 h-16 md:w-24 md:h-24" />
                 </div>
                 <div className="relative z-10 space-y-4">
                    <h3 className={cn("text-xl font-black flex items-center gap-3", i18n.language === 'en' ? 'flex-row' : 'flex-row-reverse')}>
                      <Brain className="w-5 h-5 text-brand-red" />
                      {t('assessments.ai_analysis')}
                    </h3>
                    <div className="text-white/80 leading-relaxed font-medium bg-white/5 p-6 rounded-3xl border border-white/10 markdown-body">
                       <ReactMarkdown>{submission.aiFeedback}</ReactMarkdown>
                    </div>
                 </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Questions Review */}
        <div className="space-y-6">
            <h3 className={cn("text-2xl font-black text-brand-text flex items-center gap-3", i18n.language === 'en' ? 'flex-row' : 'flex-row-reverse')}>
              <HelpCircle className="w-6 h-6 text-brand-red" />
              {t('assessments.detailed_review')}
            </h3>

           <div className="space-y-4">
              {submission.answers.map((answer, index) => {
                const question = [...assessment.questions.easy, ...assessment.questions.medium, ...assessment.questions.hard].find(q => q.id === answer.questionId);
                if (!question) return null;
                const isExpanded = expandedId === answer.questionId;

                return (
                  <div 
                    key={answer.questionId}
                    className={cn(
                      "bg-white rounded-[32px] border transition-all overflow-hidden",
                      answer.isCorrect ? "border-emerald-100" : "border-rose-100"
                    )}
                  >
                    <button 
                      onClick={() => setExpandedId(isExpanded ? null : answer.questionId)}
                      className={cn("w-full p-8 flex items-start gap-6 hover:bg-brand-cream/10 transition-colors", i18n.language === 'ar' ? 'text-right' : 'text-left')}
                    >
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                         answer.isCorrect ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-brand-red"
                       )}>
                         {answer.isCorrect ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                       </div>
                       
                       <div className="flex-1 space-y-2 text-right">
                          <div className="flex justify-between items-start">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              question.difficulty === 'easy' ? "bg-emerald-50 text-emerald-600" :
                              question.difficulty === 'medium' ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-brand-red"
                            )}>
                              {question.difficulty === 'easy' ? 'سهل' : question.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                            </span>
                            <span className="text-brand-beige text-xs font-bold">السؤال {index + 1}</span>
                          </div>
                          <h4 className="text-lg font-black text-brand-text leading-relaxed">
                            {question.text}
                          </h4>
                       </div>

                       <div className="mt-2 text-brand-beige">
                         {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                       </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-brand-cream/20 border-t border-brand-beige/10 overflow-hidden"
                        >
                           <div className="p-8 space-y-8">
                             <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest">إجابتك</label>
                                   <div className={cn(
                                     "p-4 rounded-2xl font-black",
                                     answer.isCorrect ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-brand-red border border-rose-100"
                                   )}>
                                     {answer.userAnswer || "(بدون إجابة)"}
                                   </div>
                                </div>
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black text-brand-beige uppercase tracking-widest">الإجابة الصحيحة</label>
                                   <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl font-black">
                                     {answer.correctAnswer}
                                   </div>
                                </div>
                             </div>

                             {question.explanation && (
                                <div className="space-y-3 bg-white p-6 rounded-3xl border border-brand-beige/5">
                                   <h5 className="text-sm font-black text-brand-text flex items-center gap-2">
                                     <MessageSquare className="w-4 h-4 text-brand-red" />
                                     شرح الإجابة:
                                   </h5>
                                   <p className="text-brand-beige font-medium leading-relaxed">
                                     {question.explanation}
                                   </p>
                                </div>
                             )}

                             {answer.feedback && (
                                <div className="space-y-3 bg-brand-text/5 p-6 rounded-3xl border border-brand-text/10">
                                   <h5 className="text-sm font-black text-brand-text flex items-center gap-2">
                                     <Brain className="w-4 h-4 text-brand-red" />
                                     تقييم AI:
                                   </h5>
                                   <div className="text-brand-text font-medium leading-relaxed markdown-body">
                                     <ReactMarkdown>{answer.feedback}</ReactMarkdown>
                                   </div>
                                </div>
                             )}
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    </div>
  );
}
