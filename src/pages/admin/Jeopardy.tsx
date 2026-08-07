import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, X, Check, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';
import { questions, levels, Question } from '../../data/markCompetition';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';

interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
  bgColor: string;
  borderColor: string;
  correctAnswers: number;
  wrongAnswers: number;
}

const TEAM_STYLES = [
  { color: 'bg-blue-500',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-300',    textColor: 'text-blue-700',    gradient: 'from-blue-500 to-blue-600' },
  { color: 'bg-purple-500',  bgColor: 'bg-purple-50',  borderColor: 'border-purple-300',  textColor: 'text-purple-700',  gradient: 'from-purple-500 to-purple-600' },
  { color: 'bg-rose-500',    bgColor: 'bg-rose-50',    borderColor: 'border-rose-300',    textColor: 'text-rose-700',    gradient: 'from-rose-500 to-rose-600' },
  { color: 'bg-teal-500',    bgColor: 'bg-teal-50',    borderColor: 'border-teal-300',    textColor: 'text-teal-700',    gradient: 'from-teal-500 to-teal-600' },
  { color: 'bg-orange-500',  bgColor: 'bg-orange-50',  borderColor: 'border-orange-300',  textColor: 'text-orange-700',  gradient: 'from-orange-500 to-orange-600' },
  { color: 'bg-cyan-500',    bgColor: 'bg-cyan-50',    borderColor: 'border-cyan-300',    textColor: 'text-cyan-700',    gradient: 'from-cyan-500 to-cyan-600' },
  { color: 'bg-green-600',   bgColor: 'bg-green-50',   borderColor: 'border-green-300',   textColor: 'text-green-700',   gradient: 'from-green-500 to-green-600' },
  { color: 'bg-pink-500',    bgColor: 'bg-pink-50',    borderColor: 'border-pink-300',    textColor: 'text-pink-700',    gradient: 'from-pink-500 to-pink-600' },
  { color: 'bg-indigo-500',  bgColor: 'bg-indigo-50',  borderColor: 'border-indigo-300',  textColor: 'text-indigo-700',  gradient: 'from-indigo-500 to-indigo-600' },
  { color: 'bg-amber-500',   bgColor: 'bg-amber-50',   borderColor: 'border-amber-300',   textColor: 'text-amber-700',   gradient: 'from-amber-500 to-amber-600' },
  { color: 'bg-red-600',     bgColor: 'bg-red-50',     borderColor: 'border-red-300',     textColor: 'text-red-700',     gradient: 'from-red-500 to-red-600' },
  { color: 'bg-violet-500',  bgColor: 'bg-violet-50',  borderColor: 'border-violet-300',  textColor: 'text-violet-700',  gradient: 'from-violet-500 to-violet-600' },
  { color: 'bg-lime-600',    bgColor: 'bg-lime-50',    borderColor: 'border-lime-300',    textColor: 'text-lime-700',    gradient: 'from-lime-500 to-lime-600' },
  { color: 'bg-sky-500',     bgColor: 'bg-sky-50',     borderColor: 'border-sky-300',     textColor: 'text-sky-700',     gradient: 'from-sky-500 to-sky-600' },
  { color: 'bg-fuchsia-500', bgColor: 'bg-fuchsia-50', borderColor: 'border-fuchsia-300', textColor: 'text-fuchsia-700', gradient: 'from-fuchsia-500 to-fuchsia-600' },
  { color: 'bg-emerald-600', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-300', textColor: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600' },
  { color: 'bg-yellow-500',  bgColor: 'bg-yellow-50',  borderColor: 'border-yellow-300',  textColor: 'text-yellow-700',  gradient: 'from-yellow-500 to-yellow-600' },
  { color: 'bg-slate-500',   bgColor: 'bg-slate-50',   borderColor: 'border-slate-300',   textColor: 'text-slate-700',   gradient: 'from-slate-500 to-slate-600' },
  { color: 'bg-pink-600',    bgColor: 'bg-pink-50',    borderColor: 'border-pink-300',    textColor: 'text-pink-800',    gradient: 'from-pink-600 to-pink-700' },
  { color: 'bg-blue-800',    bgColor: 'bg-blue-50',    borderColor: 'border-blue-400',    textColor: 'text-blue-900',    gradient: 'from-blue-700 to-blue-800' },
];

const LEVEL_STYLES = [
  { id: 1, title: 'سهل',    emoji: '🟢', points: 100, bg: 'bg-emerald-50', border: 'border-emerald-200', headerBg: 'bg-emerald-500', textColor: 'text-emerald-700', barColor: 'bg-emerald-400', badgeBg: 'bg-emerald-100' },
  { id: 2, title: 'متوسط', emoji: '🟡', points: 200, bg: 'bg-amber-50',   border: 'border-amber-200',   headerBg: 'bg-amber-500',   textColor: 'text-amber-700',   barColor: 'bg-amber-400',   badgeBg: 'bg-amber-100' },
  { id: 3, title: 'صعب',   emoji: '🔴', points: 300, bg: 'bg-red-50',     border: 'border-red-200',     headerBg: 'bg-red-500',     textColor: 'text-red-700',     barColor: 'bg-red-400',     badgeBg: 'bg-red-100' },
];

export default function Jeopardy() {
  const [setupMode, setSetupMode] = useState(true);
  const [numTeams, setNumTeams] = useState(2);
  const [teams, setTeams] = useState<Team[]>([
    { id: '1', name: 'فريق 1', score: 0, color: TEAM_STYLES[0].color, bgColor: TEAM_STYLES[0].bgColor, borderColor: TEAM_STYLES[0].borderColor, correctAnswers: 0, wrongAnswers: 0 },
    { id: '2', name: 'فريق 2', score: 0, color: TEAM_STYLES[1].color, bgColor: TEAM_STYLES[1].bgColor, borderColor: TEAM_STYLES[1].borderColor, correctAnswers: 0, wrongAnswers: 0 },
  ]);

  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [resultMessage, setResultMessage] = useState<'correct' | 'wrong' | null>(null);

  const handleNumTeamsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const num = parseInt(e.target.value);
    setNumTeams(num);
    const newTeams = Array.from({ length: num }, (_, i) => ({
      id: (i + 1).toString(),
      name: teams[i]?.name || `فريق ${i + 1}`,
      score: 0,
      color: TEAM_STYLES[i % TEAM_STYLES.length].color,
      bgColor: TEAM_STYLES[i % TEAM_STYLES.length].bgColor,
      borderColor: TEAM_STYLES[i % TEAM_STYLES.length].borderColor,
      correctAnswers: 0,
      wrongAnswers: 0,
    }));
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index: number, name: string) => {
    const newTeams = [...teams];
    newTeams[index].name = name;
    setTeams(newTeams);
  };

  const startGame = () => setSetupMode(false);

  const pickQuestion = useCallback((levelId: number) => {
    const available = questions.filter(q => q.levelId === levelId && !usedQuestionIds.has(q.id));
    if (available.length === 0) return;
    const randomIdx = Math.floor(Math.random() * available.length);
    setActiveQuestion(available[randomIdx]);
    setSelectedChoice(null);
    setAnswered(false);
    setResultMessage(null);
  }, [usedQuestionIds]);

  const handleChoiceClick = (choice: string) => {
    if (answered) return;
    setSelectedChoice(choice);
    setAnswered(true);
    const isCorrect = choice === activeQuestion?.answer;
    setResultMessage(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) {
      setTeams(prev => prev.map((t, idx) =>
        idx === currentTeamIndex
          ? { ...t, score: t.score + (activeQuestion?.points ?? 0), correctAnswers: t.correctAnswers + 1 }
          : t
      ));
    } else {
      setTeams(prev => prev.map((t, idx) =>
        idx === currentTeamIndex ? { ...t, wrongAnswers: t.wrongAnswers + 1 } : t
      ));
    }
  };

  const closeQuestion = () => {
    if (activeQuestion) setUsedQuestionIds(prev => new Set(prev).add(activeQuestion.id));
    setActiveQuestion(null);
    setSelectedChoice(null);
    setAnswered(false);
    setResultMessage(null);
    setCurrentTeamIndex(prev => (prev + 1) % teams.length);
  };

  const resetGame = () => {
    setUsedQuestionIds(new Set());
    setTeams(prev => prev.map(t => ({ ...t, score: 0, correctAnswers: 0, wrongAnswers: 0 })));
    setActiveQuestion(null);
    setSelectedChoice(null);
    setAnswered(false);
    setResultMessage(null);
    setCurrentTeamIndex(0);
  };

  const availableByLevel = (levelId: number) =>
    questions.filter(q => q.levelId === levelId && !usedQuestionIds.has(q.id)).length;

  const totalUsed = usedQuestionIds.size;
  const totalQuestions = questions.length;
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const currentTeam = teams[currentTeamIndex];
  const currentStyle = TEAM_STYLES[currentTeamIndex % TEAM_STYLES.length];

  // ── SETUP SCREEN ──────────────────────────────────────────────────
  if (setupMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-red-100/60 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-blue-100/50 blur-[80px] pointer-events-none" />

        <div className="max-w-lg w-full bg-white border border-gray-100 rounded-3xl p-8 shadow-2xl shadow-gray-200/60 relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-200 mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-800 text-center tracking-tight">مسابقة إنجيل مارمرقس</h1>
            <p className="text-gray-400 text-sm font-bold tracking-widest mt-1 text-center">الأصحاح الأول حتى الرابع</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-gray-500 text-xs font-black mb-2 tracking-widest uppercase">عدد الفرق</label>
              <select
                value={numTeams}
                onChange={handleNumTeamsChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-800 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all font-black text-base cursor-pointer"
              >
                {[...Array(19)].map((_, i) => (
                  <option key={i + 2} value={i + 2}>{i + 2} فرق</option>
                ))}
              </select>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              <label className="block text-gray-500 text-xs font-black mb-2 tracking-widest uppercase">أسماء الفرق</label>
              {teams.map((team, idx) => (
                <div key={team.id} className="flex items-center gap-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm", TEAM_STYLES[idx % TEAM_STYLES.length].color)}>
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(idx, e.target.value)}
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-gray-800 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all font-black placeholder:text-gray-300"
                    placeholder={`اسم فريق ${idx + 1}`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full py-5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-rose-600 hover:to-red-500 text-white rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-200 mt-4"
            >
              <Play className="w-6 h-6" />
              ابدأ المسابقة!
            </button>

            <Link to="/admin" className="w-full py-3 flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 font-black text-sm transition-colors">
              <ArrowRight className="w-4 h-4" />
              رجوع للقائمة الرئيسية
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative" dir="rtl">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40"
        style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

      {/* Header */}
      <header className="relative z-20 bg-white border-b border-gray-200 px-5 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-red-200">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black text-gray-800 leading-none">مسابقة مارمرقس</h1>
              <p className="text-[10px] text-gray-400 font-bold tracking-widest mt-0.5">{totalUsed}/{totalQuestions} سؤال</p>
            </div>
          </div>

          {/* Progress */}
          <div className="hidden sm:flex flex-1 max-w-xs mx-6 items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-red-500 to-rose-400 rounded-full"
                animate={{ width: `${(totalUsed / totalQuestions) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-gray-400 text-xs font-black shrink-0">{Math.round((totalUsed / totalQuestions) * 100)}%</span>
          </div>

          <button
            onClick={resetGame}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl font-black text-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            إعادة
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col xl:flex-row gap-0 relative z-10">
        {/* ── MAIN AREA ── */}
        <main className="flex-1 p-5 flex flex-col gap-5">

          {/* Current turn banner */}
          <motion.div
            key={currentTeamIndex}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "rounded-2xl border-2 p-4 flex items-center gap-4 shadow-sm",
              currentStyle.bgColor,
              currentStyle.borderColor
            )}
          >
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shrink-0", currentStyle.color)}>
              {currentTeamIndex + 1}
            </div>
            <div>
              <p className="text-gray-400 text-xs font-black tracking-widest uppercase">دور</p>
              <p className={cn("font-black text-2xl leading-none", currentStyle.textColor)}>{currentTeam?.name}</p>
            </div>
            <div className="mr-auto flex items-center gap-2">
              <motion.span
                key={currentTeam?.score}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className={cn("font-black text-3xl leading-none", currentStyle.textColor)}
              >
                {currentTeam?.score}
              </motion.span>
              <span className="text-gray-400 font-bold text-sm">نقطة</span>
            </div>
          </motion.div>

          {/* Level buttons */}
          <div>
            <p className="text-gray-400 font-black text-xs tracking-widest uppercase mb-3 text-center">
              اختر مستوى السؤال لـ {currentTeam?.name}
            </p>
            <div className="grid grid-cols-3 gap-4">
              {LEVEL_STYLES.map((level) => {
                const available = availableByLevel(level.id);
                const total = questions.filter(q => q.levelId === level.id).length;
                return (
                  <motion.button
                    key={level.id}
                    onClick={() => pickQuestion(level.id)}
                    disabled={available === 0}
                    whileHover={available > 0 ? { scale: 1.04, y: -4 } : {}}
                    whileTap={available > 0 ? { scale: 0.96 } : {}}
                    className={cn(
                      "relative group rounded-2xl p-5 sm:p-8 flex flex-col items-center justify-center gap-3 border-2 transition-all duration-300 shadow-sm",
                      available === 0
                        ? "bg-gray-100 border-gray-200 cursor-not-allowed opacity-40"
                        : cn(level.bg, level.border, "cursor-pointer hover:shadow-lg")
                    )}
                  >
                    {/* Top color bar */}
                    <div className={cn("absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl", level.headerBg)} />

                    <span className="text-4xl sm:text-5xl">{level.emoji}</span>
                    <div className="text-center">
                      <p className={cn("text-xl sm:text-2xl font-black", level.textColor)}>{level.title}</p>
                      <p className="text-gray-500 font-black text-base mt-0.5">{level.points} نقطة</p>
                    </div>

                    {/* Remaining progress bar */}
                    <div className="w-full">
                      <div className="flex justify-between text-[10px] text-gray-400 font-black mb-1">
                        <span>متبقي</span>
                        <span>{available}/{total}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", level.barColor)}
                          style={{ width: `${(available / total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Turn order */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-gray-300 text-xs font-black">ترتيب الأدوار:</span>
            {teams.map((team, idx) => {
              const s = TEAM_STYLES[idx % TEAM_STYLES.length];
              return (
                <div key={team.id} className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all",
                  idx === currentTeamIndex
                    ? cn(s.color, 'text-white border-transparent shadow-md')
                    : cn('bg-white border-gray-200 text-gray-400')
                )}>
                  {team.name}
                </div>
              );
            })}
          </div>
        </main>

        {/* ── SCOREBOARD SIDEBAR ── */}
        <aside className="xl:w-72 bg-white border-t xl:border-t-0 xl:border-r border-gray-200 p-4 flex flex-col gap-3 shadow-sm">
          <h3 className="text-gray-400 font-black text-xs tracking-[0.3em] uppercase text-center pt-1">النتيجة</h3>

          <div className="flex flex-col gap-2.5 flex-1">
            {sortedTeams.map((team, idx) => {
              const originalIdx = teams.findIndex(t => t.id === team.id);
              const s = TEAM_STYLES[originalIdx % TEAM_STYLES.length];
              const isActive = originalIdx === currentTeamIndex;
              return (
                <motion.div
                  key={team.id}
                  layout
                  className={cn(
                    "relative rounded-2xl p-4 border-2 transition-all",
                    isActive ? cn(s.bgColor, s.borderColor, 'shadow-md') : 'bg-gray-50 border-gray-100'
                  )}
                >
                  {isActive && (
                    <div className={cn("absolute top-3 left-3 w-2 h-2 rounded-full animate-pulse", s.color)} />
                  )}
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-white font-black text-sm shadow-sm", s.color)}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-black text-sm truncate", isActive ? s.textColor : 'text-gray-700')}>{team.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-emerald-500 text-[10px] font-black">✓{team.correctAnswers}</span>
                        <span className="text-red-400 text-[10px] font-black">✗{team.wrongAnswers}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <motion.p
                        key={team.score}
                        initial={{ scale: 1.4 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className={cn("font-black text-2xl leading-none", isActive ? s.textColor : 'text-gray-700')}
                      >
                        {team.score}
                      </motion.p>
                      {idx === 0 && team.score > 0 && (
                        <span className="text-yellow-500 text-[10px] font-black">🏆 متصدر</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={() => setSetupMode(true)}
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-500 hover:text-gray-700 rounded-xl font-black text-xs transition-all"
          >
            ← تعديل الفرق
          </button>
        </aside>
      </div>

      {/* ── QUESTION MODAL ── */}
      <AnimatePresence>
        {activeQuestion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 30 }}
              className="w-full max-w-3xl bg-white border border-gray-200 rounded-[2rem] shadow-[0_30px_80px_-10px_rgba(0,0,0,0.2)] overflow-hidden max-h-[95vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-7 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                <div className="flex items-center gap-3">
                  {(() => {
                    const lvl = LEVEL_STYLES.find(l => l.id === activeQuestion.levelId);
                    return (
                      <>
                        <span className="text-xl">{lvl?.emoji}</span>
                        <span className={cn("font-black text-sm", lvl?.textColor)}>{lvl?.title}</span>
                        <span className="text-gray-200">•</span>
                        <span className="text-gray-400 font-black text-sm">{activeQuestion.points} نقطة</span>
                        <span className="text-gray-200">•</span>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black", currentStyle.color)}>
                            {currentTeamIndex + 1}
                          </div>
                          <span className={cn("font-black text-sm", currentStyle.textColor)}>{currentTeam?.name}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={closeQuestion}
                  className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Question body */}
              <div className="px-7 pt-9 pb-7 overflow-y-auto flex-1 flex flex-col">
                <h2 className="text-3xl sm:text-4xl font-black text-gray-800 text-center leading-snug mb-9">
                  {activeQuestion.question}
                </h2>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {activeQuestion.choices.map((choice, idx) => {
                    const isCorrect = choice === activeQuestion.answer;
                    const isSelected = selectedChoice === choice;
                    const letters = ['أ', 'ب', 'ج', 'د'];

                    let btnCls = 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:border-gray-300 cursor-pointer';
                    let badgeCls = 'bg-gray-200 text-gray-500';

                    if (answered) {
                      if (isCorrect) {
                        btnCls = 'border-emerald-400 bg-emerald-50 text-emerald-800 cursor-default shadow-sm shadow-emerald-100';
                        badgeCls = 'bg-emerald-400 text-white';
                      } else if (isSelected) {
                        btnCls = 'border-red-300 bg-red-50 text-red-700 cursor-default';
                        badgeCls = 'bg-red-400 text-white';
                      } else {
                        btnCls = 'border-gray-100 bg-gray-50 text-gray-300 cursor-default opacity-60';
                        badgeCls = 'bg-gray-200 text-gray-300';
                      }
                    } else if (isSelected) {
                      btnCls = 'border-red-400 bg-red-50 text-red-700 cursor-pointer';
                      badgeCls = 'bg-red-400 text-white';
                    }

                    return (
                      <motion.button
                        key={idx}
                        onClick={() => handleChoiceClick(choice)}
                        disabled={answered}
                        whileHover={!answered ? { scale: 1.02 } : {}}
                        whileTap={!answered ? { scale: 0.97 } : {}}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 text-right transition-all duration-300 text-base font-black",
                          btnCls
                        )}
                      >
                        <span className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-sm transition-all", badgeCls)}>
                          {answered && isCorrect ? <Check className="w-4 h-4" /> :
                           answered && isSelected ? <X className="w-4 h-4" /> : letters[idx]}
                        </span>
                        <span className="flex-1">{choice}</span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Result banner */}
                <AnimatePresence>
                  {resultMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "rounded-2xl p-5 text-center font-black text-xl mb-4 border-2",
                        resultMessage === 'correct'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-red-50 border-red-200 text-red-600'
                      )}
                    >
                      {resultMessage === 'correct' ? (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl">🎉</span>
                          <div>
                            <p className="text-2xl text-emerald-700">إجابة صحيحة!</p>
                            <p className="text-emerald-500 text-base font-black mt-1">+{activeQuestion.points} نقطة لـ {currentTeam?.name}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-3xl">❌</span>
                          <div>
                            <p className="text-2xl text-red-600">إجابة خاطئة</p>
                            <p className="text-red-400 text-base font-black mt-1">الإجابة الصحيحة: {activeQuestion.answer}</p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Next button */}
                {answered && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={closeQuestion}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-500 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-95 shadow-lg shadow-red-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    التالي: دور {teams[(currentTeamIndex + 1) % teams.length]?.name}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
