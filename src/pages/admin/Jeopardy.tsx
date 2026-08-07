import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Users, Play, X, Check, ChevronRight, ArrowRight } from 'lucide-react';
import { questions, levels, Question } from '../../data/markCompetition';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface Team {
  id: string;
  name: string;
  score: number;
}

export default function Jeopardy() {
  const { t } = useTranslation();
  const [setupMode, setSetupMode] = useState(true);
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'فريق 1', score: 0 },
    { id: '2', name: 'فريق 2', score: 0 },
  ]);

  // Game State
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Setup Handlers
  const handleNumTeamsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = parseInt(e.target.value);
    setNumTeams(num);
    const newTeams = Array.from({ length: num }, (_, i) => ({
      id: (i + 1).toString(),
      name: teams[i]?.name || `فريق ${i + 1}`,
      score: 0
    }));
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const newTeams = [...teams];
    newTeams[index].name = name;
    setTeams(newTeams);
  };

  const startGame = () => {
    setSetupMode(false);
  };

  // Game Handlers
  const handleQuestionClick = (question: Question) => {
    if (answeredQuestions.has(question.id)) return;
    setActiveQuestion(question);
    setShowAnswer(false);
  };

  const assignPoints = (teamId: string) => {
    if (!activeQuestion) return;
    setTeams(teams.map(t => 
      t.id === teamId ? { ...t, score: t.score + activeQuestion.points } : t
    ));
    setAnsweredQuestions(prev => new Set(prev).add(activeQuestion.id));
    setActiveQuestion(null);
  };

  const closeQuestion = () => {
    if (activeQuestion) {
      setAnsweredQuestions(prev => new Set(prev).add(activeQuestion.id));
    }
    setActiveQuestion(null);
  };

  if (setupMode) {
    return (
      <div className="min-h-screen bg-brand-text p-6 flex items-center justify-center relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
           <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-brand-red/10 blur-[120px]" />
           <div className="absolute -bottom-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[120px]" />
        </div>
        
        <div className="max-w-xl w-full bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
          <div className="flex items-center gap-4 mb-8 justify-center">
            <div className="w-16 h-16 rounded-2xl bg-brand-red/20 flex items-center justify-center border border-brand-red/30">
              <Trophy className="w-8 h-8 text-brand-red" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">مسابقة إنجيل مارمرقس</h1>
              <p className="text-white/50 text-sm font-black tracking-widest mt-1">إعداد اللعبة</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-black mb-2">عدد الفرق المشاركة</label>
              <select 
                value={numTeams}
                onChange={handleNumTeamsChange}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all font-black text-lg"
              >
                {[...Array(9)].map((_, i) => (
                  <option key={i+2} value={i+2}>{i+2} فرق</option>
                ))}
              </select>
            </div>

            <div className="space-y-3">
              <label className="block text-white/70 text-sm font-black mb-2">أسماء الفرق</label>
              {teams.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/50 font-black shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:border-brand-red outline-none transition-all font-black text-lg"
                    placeholder={`اسم فريق ${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 mt-4 bg-brand-red hover:bg-brand-red/90 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-brand-red/20"
            >
              <Play className="w-5 h-5" />
              <span>ابدأ المسابقة</span>
            </button>
            <Link to="/admin" className="w-full py-3 flex items-center justify-center gap-2 text-white/50 hover:text-white font-black text-sm transition-colors">
               <ArrowRight className="w-4 h-4" />
               عودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-text flex flex-col relative">
      {/* Background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
         <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-brand-red/5 to-transparent" />
      </div>

      {/* Header & Scoreboard */}
      <header className="sticky top-0 z-40 bg-brand-text/80 backdrop-blur-md border-b border-white/10 p-4 shadow-xl">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar pb-2">
          <div className="flex items-center gap-3 shrink-0 ml-6">
            <Trophy className="w-8 h-8 text-brand-red" />
            <h1 className="text-xl font-black text-white whitespace-nowrap hidden sm:block">مسابقة مارمرقس</h1>
          </div>
          <div className="flex gap-4">
            {teams.map(team => (
              <div key={team.id} className="bg-black/40 border border-white/10 rounded-2xl px-5 py-2 flex flex-col items-center min-w-[120px]">
                <span className="text-white/60 text-xs font-black truncate w-full text-center">{team.name}</span>
                <span className="text-2xl font-black text-white">{team.score}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Board */}
      <main className="flex-1 p-6 z-10 overflow-auto">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-3 gap-4 sm:gap-6 min-w-[800px]">
            {/* Column Headers */}
            {levels.map(level => (
              <div key={level.id} className="bg-brand-red text-white py-4 px-2 rounded-2xl text-center shadow-lg border border-white/20">
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">{level.title}</h2>
              </div>
            ))}
            
            {/* Questions Grid */}
            {Array.from({ length: 10 }).map((_, rowIndex) => (
              <React.Fragment key={rowIndex}>
                {levels.map(level => {
                  // Find the question for this level at this row index
                  // Assuming exactly 10 questions per level, ordered by points
                  const levelQuestions = questions.filter(q => q.levelId === level.id);
                  const question = levelQuestions[rowIndex];
                  if (!question) return <div key={`empty-${level.id}-${rowIndex}`} />;
                  
                  const isAnswered = answeredQuestions.has(question.id);

                  return (
                    <button
                      key={question.id}
                      onClick={() => handleQuestionClick(question)}
                      disabled={isAnswered}
                      className={cn(
                        "relative aspect-[2/1] rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black transition-all duration-300",
                        isAnswered
                          ? "bg-black/20 text-white/10 border border-white/5 cursor-not-allowed"
                          : "bg-black/60 border border-white/10 text-brand-beige hover:bg-brand-red hover:text-white hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(220,38,38,0.5)] cursor-pointer"
                      )}
                    >
                      {isAnswered ? '' : question.points}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </main>

      {/* Question Modal */}
      <AnimatePresence>
        {activeQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-4xl bg-brand-text border border-white/10 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-3 text-brand-red font-black text-xl">
                   <span>الفئة: {levels.find(c => c.id === activeQuestion.levelId)?.title}</span>
                   <span className="text-white/30">•</span>
                   <span>النقاط: {activeQuestion.points}</span>
                </div>
                <button
                  onClick={closeQuestion}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 sm:p-16 flex-1 overflow-y-auto flex flex-col items-center justify-center text-center">
                <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-8">
                  {activeQuestion.question}
                </h2>

                <AnimatePresence>
                  {showAnswer ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      className="w-full"
                    >
                      <div className="py-8 border-t border-white/10 w-full mt-4">
                        <p className="text-3xl sm:text-4xl font-black text-brand-beige leading-tight">
                          {activeQuestion.answer}
                        </p>
                      </div>

                      <div className="mt-12 space-y-4 w-full max-w-2xl mx-auto">
                         <h3 className="text-white/50 font-black tracking-widest text-sm mb-4">منح النقاط للفريق المجاوب</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                           {teams.map(team => (
                             <button
                               key={team.id}
                               onClick={() => assignPoints(team.id)}
                               className="py-4 px-4 bg-white/5 hover:bg-brand-red/20 border border-white/10 hover:border-brand-red/50 text-white rounded-2xl font-black transition-all flex flex-col items-center gap-1 group"
                             >
                               <span className="text-sm text-white/70 group-hover:text-white">{team.name}</span>
                               <span className="text-brand-red group-hover:text-white text-lg">+{activeQuestion.points}</span>
                             </button>
                           ))}
                         </div>
                         <button
                           onClick={closeQuestion}
                           className="mt-6 py-4 w-full bg-white/5 hover:bg-white/10 text-white rounded-xl font-black transition-colors"
                         >
                           لا أحد أجاد / إغلاق السؤال
                         </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setShowAnswer(true)}
                      className="mt-8 px-10 py-5 bg-brand-red hover:bg-brand-red/90 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(220,38,38,0.5)]"
                    >
                      <Check className="w-6 h-6" />
                      <span>إظهار الإجابة</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
