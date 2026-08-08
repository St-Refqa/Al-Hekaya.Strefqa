import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, RotateCcw, MonitorPlay } from 'lucide-react';

const QUESTIONS = [
  {
    "id": 1,
    "question": "مَن الذين كانوا حول يسوع مع الاثني عشر وسألوه عن معنى الأمثال؟",
    "options": ["الفريسيون", "الكتبة", "الذين كانوا حوله مع الاثني عشر", "الجمع كله"],
    "correctIndex": 2
  },
  {
    "id": 2,
    "question": "مَن الذي كان نائمًا في مؤخر السفينة أثناء هياج البحر؟",
    "options": ["بطرس", "يوحنا", "أحد التلاميذ", "يسوع"],
    "correctIndex": 3
  },
  {
    "id": 3,
    "question": "مَن قال ليسوع: «يا معلم، أما يهمك أننا نهلك؟»",
    "options": ["التلاميذ", "الجمع", "الفريسيون", "أهل الناصرة"],
    "correctIndex": 0
  },
  {
    "id": 4,
    "question": "مَن قال: «من هو هذا؟ فإن الريح أيضًا والبحر يطيعانه»؟",
    "options": ["الجمع", "التلاميذ", "الفريسيون", "أصحاب السفن الأخرى"],
    "correctIndex": 1
  },
  {
    "id": 5,
    "question": "مَن الذي كان يشرح للتلاميذ معنى الأمثال عندما كانوا وحدهم؟",
    "options": ["بطرس", "يوحنا", "يسوع", "أندراوس"],
    "correctIndex": 2
  },
  {
    "id": 6,
    "question": "أين كان يسوع جالسًا عندما بدأ يعلّم الجمع؟",
    "options": ["في المجمع", "عند البحر", "في الهيكل", "على الجبل"],
    "correctIndex": 1
  },
  {
    "id": 7,
    "question": "أين جلس يسوع أثناء تعليمه للجمع؟",
    "options": ["على صخرة", "على الشاطئ", "في السفينة", "في بيت بطرس"],
    "correctIndex": 2
  },
  {
    "id": 8,
    "question": "إلى أين قال يسوع لتلاميذه أن يعبروا؟",
    "options": ["إلى أورشليم", "إلى الناصرة", "إلى الجانب الآخر", "إلى بيت صيدا"],
    "correctIndex": 2
  },
  {
    "id": 9,
    "question": "أين كان الزرع الذي لم تكن له تربة كثيرة؟",
    "options": ["بين الشوك", "على الأرض الجيدة", "على الطريق", "على الأماكن المحجرة"],
    "correctIndex": 3
  },
  {
    "id": 10,
    "question": "أين كان الزرع الذي اختنق فلم يعطِ ثمرًا؟",
    "options": ["على الطريق", "بين الشوك", "على الصخر", "في الأرض الجيدة"],
    "correctIndex": 1
  },
  {
    "id": 11,
    "question": "ماذا كان يسوع يضرب به الأمثال ليشرح ملكوت الله؟",
    "options": ["أمثال عن الملوك فقط", "أمثال عن الزرع والنبات وغيرها", "أمثال عن الحروب", "أمثال عن الهيكل"],
    "correctIndex": 1
  },
  {
    "id": 12,
    "question": "ماذا يمثل الزرع في مثل الزارع؟",
    "options": ["التلاميذ", "الملائكة", "كلمة الله", "ملكوت السماوات"],
    "correctIndex": 2
  },
  {
    "id": 13,
    "question": "ماذا حدث للزرع الذي سقط على الطريق؟",
    "options": ["نبت وأثمر", "اختنق بالشوك", "أكلته طيور السماء", "جف بسبب الشمس"],
    "correctIndex": 2
  },
  {
    "id": 14,
    "question": "ما الذي قال يسوع إنه لا يُوضع تحت المكيال أو تحت السرير؟",
    "options": ["المنارة", "السراج", "السنبل", "حبة الخردل"],
    "correctIndex": 1
  },
  {
    "id": 15,
    "question": "ماذا حدث عندما انتهر يسوع الريح وقال للبحر: «اسكت! ابكم!»؟",
    "options": ["هدأت الريح فقط", "توقف المطر", "صار هدوء عظيم", "غرقت السفينة"],
    "correctIndex": 2
  },
  {
    "id": 16,
    "question": "ما ترتيب الأماكن الأربعة التي سقط عليها الزرع؟",
    "options": ["صخر → طريق → شوك → أرض جيدة", "طريق → محجرة → شوك → أرض جيدة", "طريق → شوك → محجرة → أرض جيدة", "شوك → طريق → أرض جيدة → محجرة"],
    "correctIndex": 1
  },
  {
    "id": 17,
    "question": "ما النسب الثلاثة التي أعطتها الأرض الجيدة؟",
    "options": ["20، 40، 80", "30، 60، 100", "10، 50، 100", "40، 60، 80"],
    "correctIndex": 1
  },
  {
    "id": 18,
    "question": "ماذا يحدث للزرع في مثل الزرع الذي ينمو؟",
    "options": ["ينمو الإنسان وهو يراقبه باستمرار", "ينمو بسرعة في يوم واحد", "يطلع وينمو والإنسان لا يعلم كيف", "يحتاج إلى أن يسقيه الإنسان كل ساعة"],
    "correctIndex": 2
  },
  {
    "id": 19,
    "question": "أي ترتيب ذكره يسوع لمراحل نمو الزرع؟",
    "options": ["سنبل → نبات → قمح", "نبات → سنبل → قمح ممتلئ في السنبل", "قمح → نبات → سنبل", "سنبل → قمح → نبات"],
    "correctIndex": 1
  },
  {
    "id": 20,
    "question": "بعد أن هدأت الريح والبحر، ماذا قال يسوع لتلاميذه؟",
    "options": ["«لماذا تركتم السفينة؟»", "«أين إيمانكم؟» فقط", "«ما بالكم خائفين هكذا؟ كيف لا إيمان لكم؟»", "«لماذا لم تصلوا؟»"],
    "correctIndex": 2
  }
];

export default function Jeopardy() {
  const [completed, setCompleted] = useState<number[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [revealedOptions, setRevealedOptions] = useState<number[]>([]);

  const handleReset = () => {
    if (window.confirm("هل أنت متأكد من إعادة تعيين اللعبة؟")) {
      setCompleted([]);
      setSelectedQuestion(null);
      setRevealedOptions([]);
    }
  };

  const openQuestion = (id: number) => {
    if (completed.includes(id)) return;
    setSelectedQuestion(id);
    setRevealedOptions([]);
  };

  const closeQuestion = () => {
    if (selectedQuestion) {
      setCompleted(prev => [...prev, selectedQuestion]);
      setSelectedQuestion(null);
      setRevealedOptions([]);
    }
  };

  const handleOptionClick = (index: number) => {
    if (!revealedOptions.includes(index)) {
      setRevealedOptions(prev => [...prev, index]);
    }
  };

  const activeQ = QUESTIONS.find(q => q.id === selectedQuestion);

  return (
    <div className="min-h-screen p-8 bg-brand-cream bg-textured relative">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-brand-red flex items-center gap-3">
              <MonitorPlay className="w-10 h-10" />
              مسابقة مرقس 4
            </h1>
            <p className="text-brand-text/60 mt-2 text-lg">اختر رقماً للبدء</p>
          </div>
          <button 
            onClick={handleReset}
            className="px-6 py-3 bg-white border-2 border-brand-red text-brand-red font-bold rounded-2xl hover:bg-brand-red hover:text-white transition-all flex items-center gap-2 shadow-lg hover:shadow-brand-red/20"
          >
            <RotateCcw className="w-5 h-5" />
            إعادة تعيين
          </button>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
          {QUESTIONS.map((q) => {
            const isCompleted = completed.includes(q.id);
            return (
              <motion.button
                key={q.id}
                whileHover={!isCompleted ? { scale: 1.05, y: -5 } : {}}
                whileTap={!isCompleted ? { scale: 0.95 } : {}}
                onClick={() => openQuestion(q.id)}
                disabled={isCompleted}
                className={`
                  aspect-square rounded-[32px] text-5xl font-black shadow-xl flex items-center justify-center transition-all duration-500
                  ${isCompleted 
                    ? 'bg-slate-200 text-slate-400 opacity-50 cursor-not-allowed scale-95 shadow-none' 
                    : 'bg-gradient-to-br from-brand-red to-rose-900 text-brand-beige hover:shadow-brand-red/30 cursor-pointer border border-white/10'
                  }
                `}
              >
                {q.id}
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedQuestion && activeQ && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-text/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-brand-cream w-full max-w-5xl rounded-[40px] p-10 shadow-2xl relative overflow-hidden bg-textured border-2 border-brand-beige/50"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-beige/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
              
              <button 
                onClick={closeQuestion}
                className="absolute top-6 left-6 p-3 bg-white/50 hover:bg-white rounded-full text-brand-text/50 hover:text-brand-red transition-colors z-10 cursor-pointer"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="relative z-10 space-y-12">
                <div className="text-center">
                  <span className="inline-block px-6 py-2 bg-brand-red/10 text-brand-red rounded-full font-bold text-xl mb-6">
                    السؤال رقم {activeQ.id}
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black text-brand-text leading-tight" style={{ lineHeight: '1.4' }}>
                    {activeQ.question}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                  {activeQ.options.map((opt, idx) => {
                    const isRevealed = revealedOptions.includes(idx);
                    const isCorrect = idx === activeQ.correctIndex;
                    
                    return (
                      <motion.button
                        key={idx}
                        whileHover={!isRevealed ? { scale: 1.02 } : {}}
                        whileTap={!isRevealed ? { scale: 0.98 } : {}}
                        onClick={() => handleOptionClick(idx)}
                        className={`
                          relative p-6 rounded-3xl text-right text-2xl font-bold transition-all duration-300 border-2 overflow-hidden
                          ${isRevealed 
                            ? (isCorrect 
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700' 
                                : 'bg-red-500/10 border-red-500 text-red-700 opacity-60')
                            : 'bg-white border-brand-beige/30 hover:border-brand-red/30 hover:shadow-lg text-brand-text cursor-pointer'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="flex-1 leading-relaxed">{opt}</span>
                          {isRevealed && isCorrect && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Check className="w-8 h-8 text-emerald-600" />
                            </motion.div>
                          )}
                          {isRevealed && !isCorrect && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <X className="w-8 h-8 text-red-600" />
                            </motion.div>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
