import { useState } from 'react';
import { Question } from '../../types';
import { 
  X, 
  Save, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  Wand2,
  Tag,
  BookOpen,
  HelpCircle,
  Award,
  Layers,
  FileText,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { refineQuestion } from '../../lib/gemini';

interface QuestionEditorProps {
  question: Question;
  assessmentText: string;
  onSave: (q: Question) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  showAIAssist?: boolean; // Controls whether to show AI generation options
}

export default function QuestionEditor({ 
  question, 
  assessmentText, 
  onSave, 
  onClose, 
  onDelete, 
  onDuplicate,
  showAIAssist = false
}: QuestionEditorProps) {
  const [edited, setEdited] = useState<Question>({ 
    ...question,
    text: question.text || '',
    difficulty: question.difficulty || 'easy',
    points: question.points || 2,
    type: question.type || 'multiple-choice',
    options: question.options || (question.type === 'multiple-choice' ? ['', '', '', ''] : (question.type === 'true-false' ? ['صح', 'خطأ'] : [])),
    category: question.category || '',
    reference: question.reference || '',
  });
  const [isRefining, setIsRefining] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleOptionChange = (idx: number, val: string) => {
    const newOptions = [...(edited.options || ['', '', '', ''])];
    const oldVal = newOptions[idx];
    newOptions[idx] = val;
    
    // If the old option value was selected as the correct answer, update the correct answer text
    let newCorrect = edited.correctAnswer;
    if (edited.correctAnswer === oldVal && oldVal !== '') {
      newCorrect = val;
    }
    
    setEdited({ ...edited, options: newOptions, correctAnswer: newCorrect });
  };

  const toggleCorrectAnswer = (val: string) => {
    if (!val.trim()) return;
    setEdited({ ...edited, correctAnswer: val });
  };

  const handleRefine = async (action: 'explain' | 'harder' | 'easier') => {
    if (!assessmentText) return;
    setIsRefining(true);
    try {
      const refined = await refineQuestion(edited, assessmentText, action);
      if (refined && refined.text) {
        setEdited({ ...edited, ...refined });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefining(false);
    }
  };

  const validateAndSave = () => {
    setValidationError(null);

    // 1. Validate text
    if (!edited.text.trim()) {
      setValidationError("يرجى كتابة نص السؤال أولاً.");
      return;
    }

    // 2. Validate category
    if (!edited.category?.trim()) {
      setValidationError("يرجى تحديد تصنيف السؤال أو هويته (مثلاً: عهد جديد، عهد قديم).");
      return;
    }

    // 3. Validate correct answer / options type
    if (edited.type === 'multiple-choice') {
      const activeOptions = edited.options || [];
      const filledOptions = activeOptions.filter(o => o.trim() !== '');
      if (filledOptions.length < 2) {
        setValidationError("يرجى ملء خيارين على الأقل في السؤال ذو الاختيارات المتعددة.");
        return;
      }
      if (!edited.correctAnswer || !filledOptions.includes(edited.correctAnswer)) {
        setValidationError("يرجى تحديد الإجابة الصحيحة بالضغط على علامة الصح الخضراء بجانب الاختيار الصحيح.");
        return;
      }
    } else if (edited.type === 'true-false') {
      if (edited.correctAnswer !== 'صح' && edited.correctAnswer !== 'خطأ') {
        setValidationError("يرجى اختيار الإجابة الصحيحة (صح أو خطأ).");
        return;
      }
    } else if (edited.type === 'short-answer') {
      if (!edited.modelAnswer?.trim()) {
        setValidationError("يرجى كتابة الإجابة النموذجية للسؤال المقالي للتصحيح بناءً عليها.");
        return;
      }
    }

    onSave({ ...edited, isReviewed: true });
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-brand-text/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-6"
      dir="rtl"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto rounded-[32px] md:rounded-[40px] shadow-2xl flex flex-col border border-brand-beige/10"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-brand-beige/10 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xl z-20 flex-row">
          <div className="flex items-center gap-2 md:gap-4 flex-row">
            <button onClick={onClose} className="p-2.5 md:p-3 bg-brand-cream text-brand-beige rounded-2xl hover:text-brand-text transition-all ml-1.5 md:ml-3">
              <X className="w-5 h-5" />
            </button>
            <div className={cn(
              "px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider",
              edited.difficulty === 'easy' ? "bg-emerald-100 text-emerald-600" :
              edited.difficulty === 'medium' ? "bg-amber-100 text-amber-600" :
              "bg-brand-red/10 text-brand-red"
            )}>
              {edited.difficulty === 'easy' ? 'سهل' : edited.difficulty === 'medium' ? 'متوسط' : 'صعب'}
            </div>
            <h2 className="text-lg md:text-xl font-black text-brand-text tracking-tighter">إعداد وتعديل السؤال</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Quick Actions - Only shown to authorized roles who want AI Assist */}
            {showAIAssist && assessmentText && (
              <div className="hidden md:flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleRefine('explain')}
                  disabled={isRefining}
                  className="flex items-center gap-2 px-3 py-2 bg-brand-cream text-brand-beige hover:text-brand-red rounded-xl text-[10px] font-black transition-all"
                  title="توليد شرح تلقائي"
                >
                  {isRefining ? <Loader2 className="w-3" /> : <Wand2 className="w-3 h-3" />}
                  شرح آلي
                </button>
                <button
                  onClick={() => handleRefine('harder')}
                  disabled={isRefining}
                  className="flex items-center px-3 py-2 bg-brand-cream text-brand-beige hover:text-brand-red rounded-xl text-[10px] font-black transition-all"
                >
                  صعّبه ↗️
                </button>
                <button
                  onClick={() => handleRefine('easier')}
                  disabled={isRefining}
                  className="flex items-center px-3 py-2 bg-brand-cream text-brand-beige hover:text-brand-red rounded-xl text-[10px] font-black transition-all"
                >
                  سهّله ↘️
                </button>
              </div>
            )}
            
            <button
              onClick={() => setEdited({ ...edited, isLocked: !edited.isLocked })}
              className={cn(
                "p-2.5 md:p-3 rounded-2xl transition-all",
                edited.isLocked ? "bg-brand-red/10 text-brand-red" : "bg-brand-cream text-brand-beige hover:text-brand-text"
              )}
              title={edited.isLocked ? "السؤال مقفل (لن يتغير عند التوليد التلقائي)" : "السؤال قابل للتعديل التلقائي"}
            >
              {edited.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 md:p-8 space-y-8 md:space-y-10 text-right">
          
          {/* Validation Alert */}
          {validationError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 font-bold text-sm"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p>{validationError}</p>
            </motion.div>
          )}

          {/* Place to Write Question - نص السؤال بوضوح */}
          <div className="space-y-3">
            <label className="text-xs font-black text-brand-beige uppercase tracking-wider flex items-center justify-start gap-1.5">
              <HelpCircle className="w-4 h-4 text-brand-beige" />
              صيغة ونص السؤال
            </label>
            <textarea
              value={edited.text || ''}
              onChange={e => setEdited({ ...edited, text: e.target.value })}
              className="w-full px-5 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/20 outline-none font-bold transition-all text-brand-text min-h-[110px] text-right text-base leading-relaxed"
              placeholder="اكتب نص السؤال بوضوح للطلبة هنا..."
            />
            <div className="flex justify-between items-center text-xs text-brand-beige/80 px-1">
              <span>{edited.text?.length || 0} حرفاً</span>
              <span className="text-[10px] opacity-65">يُنصح بالحفاظ على طول متناسق للأسئلة</span>
            </div>
          </div>

          {/* Question Identity Block - تحديد هوية السؤال وتصنيفه */}
          <div className="p-5 md:p-6 bg-brand-cream/10 border border-brand-beige/20 rounded-3xl space-y-6">
            <h3 className="text-xs font-black text-brand-beige uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-4 h-4 text-brand-beige" />
              تحديد هوية السؤال وتصنيفه (جديد)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* Category / Topic - موضوع درس السؤال */}
              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#8c7a6b]">موضوع أو تصنيف السؤال (هوية التخصص)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={edited.category || ''}
                    onChange={e => setEdited({ ...edited, category: e.target.value })}
                    className="flex-1 px-5 py-3.5 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right"
                    placeholder="مثال: عهد جديد، عهد قديم، عقيدة، طقوس..."
                  />
                  <select
                    onChange={e => {
                      if (e.target.value) {
                        setEdited({ ...edited, category: e.target.value });
                      }
                    }}
                    value={['عهد قديم', 'عهد جديد', 'طقوس', 'عقيدة', 'شخصيات'].includes(edited.category || '') ? edited.category : ''}
                    className="px-3 py-3 bg-white border border-brand-beige/10 rounded-xl outline-none font-bold text-brand-text text-right max-w-[130px]"
                  >
                    <option value="">اختر سريعاً</option>
                    <option value="عهد قديم">عهد قديم</option>
                    <option value="عهد جديد">عهد جديد</option>
                    <option value="طقوس">طقوس كنسية</option>
                    <option value="عقيدة">عقيدة وتاريخ</option>
                    <option value="شخصيات">شخصيات</option>
                  </select>
                </div>
              </div>

              {/* Bible Study Reference - الشاهد الكتابي */}
              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#8c7a6b]">الشاهد الكتابي أو مرجع الدرس</label>
                <div className="relative">
                  <input
                    type="text"
                    value={edited.reference || ''}
                    onChange={e => setEdited({ ...edited, reference: e.target.value })}
                    className="w-full px-5 py-3.5 pl-10 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right"
                    placeholder="مثال: لوقا ٢: ١-١٤، خروج ٢٠"
                  />
                  <BookOpen className="w-4 h-4 text-brand-beige absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
              {/* Difficulty Level */}
              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#8c7a6b] flex items-center justify-start gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  تصنيف وتصاعد الصعوبة
                </label>
                <select
                  value={edited.difficulty || 'easy'}
                  onChange={e => {
                    const diff = e.target.value as 'easy' | 'medium' | 'hard';
                    const defaultPoints = diff === 'easy' ? 2 : diff === 'medium' ? 4 : 6;
                    setEdited({ ...edited, difficulty: diff, points: defaultPoints });
                  }}
                  className="w-full px-5 py-3.5 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right"
                >
                  <option value="easy">سهل - تذكر (٢ درجة)</option>
                  <option value="medium">متوسط - فهم واستنتاج (٤ درجات)</option>
                  <option value="hard">صعب - تحليل وتطبيق (٦ درجات)</option>
                </select>
              </div>

              {/* Exact points weight */}
              <div className="space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-widest text-[#8c7a6b] flex items-center justify-start gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  عدد درجات السؤال الفردية
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={edited.points || 0}
                  onChange={e => setEdited({ ...edited, points: parseInt(e.target.value) || 1 })}
                  className="w-full px-5 py-3.5 bg-white border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right"
                />
              </div>
            </div>
          </div>

          {/* Answer Type selection */}
          <div className="space-y-3">
            <label className="block text-xs font-black uppercase tracking-wider text-brand-beige">نوع السؤال وطريقة الإجابة</label>
            <select
              value={edited.type || 'multiple-choice'}
              onChange={e => {
                const newType = e.target.value as 'multiple-choice' | 'true-false' | 'short-answer';
                let nextOptions: string[] = [];
                let nextCorrect = "";
                if (newType === 'true-false') {
                  nextOptions = ['صح', 'خطأ'];
                  nextCorrect = 'صح';
                } else if (newType === 'multiple-choice') {
                  nextOptions = ['', '', '', ''];
                }
                setEdited({ ...edited, type: newType, options: nextOptions, correctAnswer: nextCorrect });
              }}
              className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/15 outline-none font-bold text-brand-text text-right"
            >
              <option value="multiple-choice">اختيار من متعدد (MCQ)</option>
              <option value="true-false">صح أو خطأ (True / False)</option>
              {(edited.difficulty !== 'easy' || edited.points >= 4) && (
                <option value="short-answer">سؤال مقالي (تصحيح وتطابق إجابات)</option>
              )}
            </select>
          </div>

          {/* Writing the Answer section - مكان كتابة الاجابة */}
          <div className="space-y-5 border-t border-brand-cream pt-8">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-brand-beige font-black uppercase tracking-wider leading-none">
                {edited.type === 'multiple-choice' ? 'اضبط الخيارات واضغط على الدائرة الخضراء لتحديد الإجابة الصحيحة' : 'اختر أو اكتب الإجابة الإلزامية'}
              </span>
              <label className="block text-xs font-black uppercase tracking-wider text-brand-text">ضبط وكتابة الإجابة الصحيحة</label>
            </div>
            
            {/* Answer editor fields: Choice 1, 2, 3... */}
            {edited.type === 'multiple-choice' && (
              <div className="grid grid-cols-1 gap-4">
                {(edited.options || ['', '', '', '']).map((opt, i) => (
                  <div key={i} className="flex gap-3 flex-row-reverse items-center">
                    <button
                      type="button"
                      onClick={() => toggleCorrectAnswer(opt)}
                      title="اضغط لتحديد هذا الخيار كإجابة صحيحة للسؤال"
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all border",
                        edited.correctAnswer === opt && opt.trim() !== '' 
                          ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-200 animate-pulse" 
                          : "bg-brand-cream text-brand-beige border-brand-beige/10 hover:bg-brand-beige/10"
                      )}
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={opt || ''}
                      onChange={e => handleOptionChange(i, e.target.value)}
                      className="flex-1 px-5 py-3.5 bg-brand-cream/10 border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold transition-all text-brand-text text-right"
                      placeholder={`خيار الإجابة رقم ${i + 1}`}
                    />
                    <span className="text-xs font-black text-brand-beige w-8 text-center">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Answer editor fields: True or False */}
            {edited.type === 'true-false' && (
              <div className="flex gap-4">
                {['صح', 'خطأ'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEdited({ ...edited, correctAnswer: val, options: ['صح', 'خطأ'] })}
                    className={cn(
                      "flex-1 py-4 rounded-2xl font-black transition-all border-2 text-sm",
                      edited.correctAnswer === val 
                        ? "bg-brand-red text-white border-brand-red shadow-xl shadow-brand-red/10" 
                        : "bg-white text-brand-beige border-brand-beige/10 hover:border-brand-red/20"
                    )}
                  >
                    {val === 'صح' ? '✓ إجابة صحيحة' : '✗ إجابة خاطئة'}
                  </button>
                ))}
              </div>
            )}

            {/* Answer editor fields: Short Answer */}
            {edited.type === 'short-answer' && (
              <div className="space-y-5">
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-brand-beige">الإجابة النموذجية الصحيحة</label>
                  <textarea
                    value={edited.modelAnswer || ''}
                    onChange={e => setEdited({ ...edited, modelAnswer: e.target.value, correctAnswer: e.target.value })}
                    className="w-full px-5 py-4 bg-brand-cream/10 border border-brand-beige/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-sm leading-relaxed"
                    placeholder="اكتب الإجابة الكاملة والدقيقة هنا لمقارنة إجابات الطلاب بها من قبل المصحح..."
                    rows={3}
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-brand-beige">محددات التصحيح أو الكلمات الدلالية الهامة (اختياري)</label>
                  <textarea
                    value={edited.aiRubric || ''}
                    onChange={e => setEdited({ ...edited, aiRubric: e.target.value })}
                    className="w-full px-5 py-4 bg-brand-red/5 border border-brand-red/10 rounded-xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold text-brand-text text-right text-xs"
                    placeholder="امثلة: يجب ذكر اسم النبي، أو إشارة للتضحية..."
                    rows={2}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Explanation / Verification text - تفسير الإجابة */}
          <div className="space-y-3 border-t border-brand-cream pt-8">
            <label className="text-xs font-black uppercase tracking-wider text-brand-beige flex items-center justify-start gap-1.5">
              <FileText className="w-4 h-4 text-brand-beige" />
              تفسير وتوضيح إجابة السؤال (للطالب بعد الانتهاء)
            </label>
            <textarea
              value={edited.explanation || ''}
              onChange={e => setEdited({ ...edited, explanation: e.target.value })}
              className="w-full px-5 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold transition-all text-brand-text text-right text-sm"
              placeholder="اكتب شرحاً يوضح للطلبة لماذا تعتبر الإجابة المحددة هي الإجابة الصحيحة..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 border-t border-brand-beige/10 bg-brand-cream/20 flex items-center justify-between sticky bottom-0 flex-row z-10">
          <button 
            type="button"
            onClick={validateAndSave}
            className="px-6 md:px-10 py-4.5 bg-brand-text text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-brand-text/10 hover:bg-brand-text/90 transition-all"
          >
            <Save className="w-5 h-5 ml-2" />
            حفظ التغييرات
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onDuplicate}
              className="p-3 bg-brand-beige/10 text-brand-beige rounded-2xl hover:bg-brand-beige/20 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest"
              title="تكرار السؤال لعمل نسخة مطابقة للتعديل السريع"
            >
              <Copy className="w-5 h-5" />
              تكرار
            </button>
            <button 
              type="button"
              onClick={onDelete}
              className="p-3 bg-brand-red/10 text-brand-red rounded-2xl hover:bg-brand-red/20 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest"
            >
              <Trash2 className="w-5 h-5" />
              حذف
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
