import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BookOpen, Plus, Trash2, Save, Download, Filter, User, HelpCircle, FileText, CheckSquare } from 'lucide-react';
import { exportToCSV } from '../../lib/csv';
import { useAuth } from '../../hooks/useAuth';

export default function QuestionBank() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState({
    type: 'multiple-choice', // 'multiple-choice', 'true-false', 'short-answer'
    text: '',
    correctAnswer: '',
    options: ['', '', ''],
    category: 'طلاب الورشة'
  });
  const [filterCategory, setFilterCategory] = useState<string>('الكل');
  const [filterType, setFilterType] = useState<string>('الكل');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'questionBank'), (snap) => {
      setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!newQuestion.text || !newQuestion.correctAnswer) return;

    const dataToSave: any = {
      type: newQuestion.type,
      text: newQuestion.text,
      correctAnswer: newQuestion.correctAnswer,
      category: newQuestion.category,
      difficulty: 'medium',
      createdAt: new Date().toISOString(),
      createdBy: user?.fullName || 'مجهول',
      creatorId: user?.uid || ''
    };

    if (newQuestion.type === 'multiple-choice') {
      dataToSave.options = newQuestion.options.filter(opt => opt.trim() !== '');
    } else if (newQuestion.type === 'true-false') {
      dataToSave.options = ['صح', 'خطأ'];
    } else {
      dataToSave.options = [];
    }

    await addDoc(collection(db, 'questionBank'), dataToSave);
    
    setNewQuestion({
      type: newQuestion.type,
      text: '',
      correctAnswer: newQuestion.type === 'true-false' ? 'صح' : '',
      options: ['', '', ''],
      category: newQuestion.category
    });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("حذف هذا السؤال؟")) return;
    await deleteDoc(doc(db, 'questionBank', id));
  };

  const handleExport = () => {
    exportToCSV('question_bank', questions.map(q => [
      q.text, 
      q.type === 'multiple-choice' ? 'اختيار من متعدد' : q.type === 'true-false' ? 'صح أو خطأ' : 'إجابة قصيرة/مقالية',
      q.correctAnswer, 
      ...(q.options || [])
    ]));
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-brand-beige/10 gap-4">
        <div className="flex items-center gap-4">
          <BookOpen className="w-10 h-10 text-brand-red" />
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-brand-text">بنك الأسئلة المتكامل</h1>
            <p className="text-xs text-brand-beige">قم بإضافة وتصنيف الأسئلة بأشكالها المتعددة لدعم الاختبارات</p>
          </div>
        </div>
        <button onClick={handleExport} className="w-full md:w-auto flex gap-2 items-center justify-center bg-brand-cream px-5 py-3 rounded-xl text-sm font-black text-brand-text border border-brand-beige/20 hover:bg-brand-cream/80 transition-all">
          <Download className="w-4 h-4"/> تصدير CSV
        </button>
      </div>
      
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-brand-beige/10">
        <h2 className="text-lg md:text-xl font-black mb-6 text-brand-text border-b border-brand-cream pb-3">إضافة سؤال جديد</h2>
        <div className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text">فئة السؤال:</label>
              <select 
                className="w-full p-4 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand-red/20 font-bold"
                value={newQuestion.category || ''}
                onChange={e => setNewQuestion({...newQuestion, category: e.target.value})}
              >
                <option value="طلاب الورشة">طلاب الورشة</option>
                <option value="طلاب اونلاين">طلاب اونلاين</option>
                <option value="طقوس">طقوس وعقيدة</option>
                <option value="عام">ثقافة عامة</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-brand-text">شكل ونوع السؤال:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'multiple-choice', label: 'اختيار من متعدد', icon: CheckSquare },
                  { id: 'true-false', label: 'صح أو خطأ', icon: HelpCircle },
                  { id: 'short-answer', label: 'إجابة مقالية', icon: FileText }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNewQuestion({
                      ...newQuestion, 
                      type: item.id,
                      correctAnswer: item.id === 'true-false' ? 'صح' : ''
                    })}
                    className={`py-3 px-2 rounded-xl text-[10px] md:text-xs font-black border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${newQuestion.type === item.id ? 'bg-brand-red text-white border-brand-red shadow-sm' : 'bg-brand-cream/20 text-brand-text border-transparent hover:border-brand-cream'}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-brand-text">نص السؤال:</label>
            <textarea 
              className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 text-sm font-bold animate-fade-in" 
              placeholder="اكتب نص السؤال بوضوح هنا..." 
              value={newQuestion.text || ''} 
              onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} 
            />
          </div>

          {/* Render inputs dynamically based on type */}
          {newQuestion.type === 'multiple-choice' && (
            <div className="space-y-3 bg-brand-cream/10 p-4 rounded-2xl border border-brand-beige/5">
              <span className="text-xs font-black text-brand-text block mb-1">الخيارات والإجابات:</span>
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute right-3 top-3.5 text-xs text-emerald-600 font-black">الإجابة الصحيحة:</span>
                  <input 
                    className="w-full p-3 pr-24 border border-emerald-200 bg-emerald-50/30 text-emerald-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-bold" 
                    placeholder="الإجابة النموذجية الصحيحة..." 
                    value={newQuestion.correctAnswer || ''} 
                    onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value})} 
                  />
                </div>
                {newQuestion.options.map((opt, i) => (
                  <div className="relative" key={i}>
                    <span className="absolute right-3 top-3.5 text-xs text-rose-600 font-black">إجابة خاطئة {i+1}:</span>
                    <input 
                      className="w-full p-3 pr-24 border border-rose-100 bg-rose-50/10 text-rose-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/10 text-sm font-medium" 
                      placeholder={`البديل الخاطئ ${i+1}...`} 
                      value={opt || ''} 
                      onChange={e => {
                        const updated = [...newQuestion.options];
                        updated[i] = e.target.value;
                        setNewQuestion({...newQuestion, options: updated});
                      }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {newQuestion.type === 'true-false' && (
            <div className="space-y-3 bg-brand-cream/10 p-4 rounded-2xl border border-brand-beige/5">
              <label className="text-xs font-black text-brand-text block mb-1">حدد الإجابة الصحيحة:</label>
              <div className="flex gap-4">
                {['صح', 'خطأ'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setNewQuestion({...newQuestion, correctAnswer: val})}
                    className={`flex-1 py-4 rounded-xl text-sm font-black transition-all border-2 ${newQuestion.correctAnswer === val ? (val === 'صح' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-rose-500 border-rose-600 text-white') : 'bg-white border-gray-200 text-brand-text hover:bg-gray-50'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {newQuestion.type === 'short-answer' && (
            <div className="space-y-3 bg-brand-cream/10 p-4 rounded-2xl border border-brand-beige/5">
              <label className="text-xs font-black text-brand-text block mb-1 font-sans">الإجابة المقالية النموذجية (الاسترشادية لتصحيح المعلم أو الذكاء الاصطناعي):</label>
              <input 
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-red/20 text-sm font-bold" 
                placeholder="اكتب الإجابة النموذجية الصحيحة هنا..." 
                value={newQuestion.correctAnswer || ''} 
                onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value})} 
              />
            </div>
          )}

          <button onClick={handleCreate} className="w-full md:w-auto px-10 py-4 bg-brand-red text-white font-black rounded-xl flex gap-2 items-center justify-center hover:scale-[1.01] active:scale-[0.99] transition-all">
            <Plus className="w-5 h-5"/> إضافة السؤال لبنك الأسئلة
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-brand-cream/30 p-4 rounded-2xl border border-brand-beige/10">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-brand-beige" />
            <span className="text-xs font-black text-brand-text">تصفية حسب القسم:</span>
            {['الكل', 'طلاب الورشة', 'طلاب اونلاين', 'طقوس', 'عام'].map(cat => (
              <button 
                key={cat} 
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${filterCategory === cat ? 'bg-brand-red text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-black text-brand-text">حسب شكل السؤال:</span>
            {[
              { id: 'الكل', label: 'الكل' },
              { id: 'multiple-choice', label: 'اختيار من متعدد' },
              { id: 'true-false', label: 'صح أو خطأ' },
              { id: 'short-answer', label: 'مقالي/قصير' }
            ].map(typeItem => (
              <button 
                key={typeItem.id} 
                onClick={() => setFilterType(typeItem.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${filterType === typeItem.id ? 'bg-brand-text text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
              >
                {typeItem.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-gray-400">جاري تحميل الأسئلة...</p>
          </div>
        ) : questions.length === 0 ? (
          <p className="text-center font-bold text-gray-400 py-16 bg-white rounded-3xl border border-gray-100">البنك فارغ حالياً</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {questions
              .filter(q => filterCategory === 'الكل' || q.category === filterCategory)
              .filter(q => filterType === 'الكل' || q.type === filterType)
              .map(q => (
                <div key={q.id} className="bg-white p-6 rounded-[32px] border border-brand-beige/10 flex flex-col justify-between group hover:shadow-xl hover:shadow-brand-red/5 transition-all">
                  <div>
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-3">
                      <div className="flex gap-1.5">
                        <span className="bg-brand-cream/50 text-brand-text px-3 py-1 rounded-lg text-xs font-black">{q.category || 'غير محدد'}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          q.type === 'multiple-choice' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          q.type === 'true-false' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {q.type === 'multiple-choice' ? 'اختيار من متعدد' : 
                           q.type === 'true-false' ? 'صح أو خطأ' : 'إجابة مقالية'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                        <User className="w-3 h-3" />
                        <span>بواسطة: {q.createdBy || 'مجهول'}</span>
                      </div>
                    </div>
                    <p className="font-extrabold text-brand-text mb-4 text-base md:text-lg leading-relaxed">{q.text}</p>
                    
                    <div className="space-y-2 bg-gray-50/70 p-4 rounded-2xl border border-gray-100">
                      <p className="text-xs font-black text-brand-beige">الإجابة النموذجية الصحيحة:</p>
                      <p className="text-sm font-black text-emerald-600 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs">✓</span>
                        {q.correctAnswer}
                      </p>
                      {q.type === 'multiple-choice' && q.options?.map((opt: string, i: number) => opt && (
                        <p key={i} className="text-sm text-gray-500 font-medium flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">✗</span>
                          {opt}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4 pt-4 border-t border-brand-cream/50">
                    <button onClick={() => handleDelete(q.id)} className="text-brand-red flex items-center gap-2 bg-rose-50 px-4 py-2 hover:bg-rose-100 transition-colors rounded-xl text-xs font-black">
                      <Trash2 className="w-4 h-4" /> حذف السؤال
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
