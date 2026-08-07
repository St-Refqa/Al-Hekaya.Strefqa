import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { ArrowLeft, Users, Trophy, Flame, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';
import { GameQuestion } from '../../../data/markQuestions';

export default function MultiplayerPlay() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [phase, setPhase] = useState<'playing' | 'done'>('playing');
  const [myScore, setMyScore] = useState(0);

  useEffect(() => {
    if (!roomId || !user) return;
    
    const roomRef = doc(db, 'gameRooms', roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) {
        navigate('/student/games');
        return;
      }
      setRoom(snap.data());
    });

    return () => unsub();
  }, [roomId, user, navigate]);

  const questions: GameQuestion[] = room?.questions || [];
  const currentQ = questions[qIndex];
  
  const players = useMemo(() => {
    if (!room) return [];
    return Object.values(room.players || {}).sort((a: any, b: any) => b.score - a.score) as any[];
  }, [room]);

  const handlePick = async (opt: string) => {
    if (selected || !roomId || !user) return;
    setSelected(opt);
    
    const isCorrect = opt === currentQ.answer;
    
    if (isCorrect) {
      setMyScore(s => s + 1);
      
      // Update my score in room
      try {
        const roomRef = doc(db, 'gameRooms', roomId);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const roomData = snap.data();
          const currentPlayers = roomData.players || {};
          const myPlayer = currentPlayers[user.uid] || {};
          await updateDoc(roomRef, {
            players: {
              ...currentPlayers,
              [user.uid]: {
                ...myPlayer,
                score: (myPlayer.score || 0) + 1
              }
            }
          });
        }
      } catch (err) {
        console.error("Error updating score:", err);
      }
    }

    setTimeout(async () => {
      if (qIndex + 1 >= questions.length) {
        setPhase('done');
        // Mark as completed
        try {
          const roomRef = doc(db, 'gameRooms', roomId);
          const snap = await getDoc(roomRef);
          if (snap.exists()) {
            const roomData = snap.data();
            const currentPlayers = roomData.players || {};
            const myPlayer = currentPlayers[user.uid] || {};
            await updateDoc(roomRef, {
              players: {
                ...currentPlayers,
                [user.uid]: {
                  ...myPlayer,
                  completed: true
                }
              }
            });
          }
          
          // No points awarded for multiplayer games
        } catch (e) {}
      } else {
        setSelected(null);
        setQIndex(i => i + 1);
      }
    }, 800);
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isAllCompleted = players.every(p => p.completed);
  const myPlayer = players.find(p => p.uid === user?.uid);
  const myRank = players.findIndex(p => p.uid === user?.uid) + 1;

  if (phase === 'done') {
    return (
      <div className="min-h-screen bg-brand-cream py-8 px-4" dir="rtl">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-brand-beige/20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -z-10" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-tr-full -z-10" />

            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-emerald-200">
              <Trophy className="w-12 h-12" />
            </div>

            <h2 className="text-3xl font-black text-brand-text mb-2">أنت انهيت التحدي!</h2>
            <p className="text-brand-beige font-bold mb-8">
              {isAllCompleted ? 'كل اللاعبين خلصوا!' : 'في انتظار باقي اللاعبين...'}
            </p>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 inline-block w-full max-w-xs">
              <span className="text-sm font-bold text-emerald-700 block mb-1">ترتيبك الحالي</span>
              <span className="text-5xl font-black text-emerald-600">المركز {myRank}</span>
              <span className="text-sm font-bold text-emerald-600 block mt-2">بنقاط: {myScore} من {questions.length}</span>
            </div>

            <div className="bg-white rounded-2xl border border-brand-beige/20 overflow-hidden shadow-sm text-right mb-8">
              {players.map((p, i) => (
                <div key={p.uid} className={cn(
                  "flex items-center gap-4 px-4 py-3 border-b border-brand-beige/10 last:border-0",
                  p.uid === user?.uid && "bg-brand-red/5"
                )}>
                  <div className="w-8 text-center font-black text-brand-beige/50">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-brand-cream border border-brand-beige/20 overflow-hidden flex items-center justify-center shrink-0">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5 text-brand-beige" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-brand-text text-sm truncate">
                      {p.name}
                      {p.uid === user?.uid && <span className="mr-2 text-[10px] bg-brand-red text-white px-2 py-0.5 rounded-full">أنت</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg font-black text-sm min-w-[3rem] text-center">
                      {p.score}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/student/games"
              className="w-full bg-brand-text text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              العودة للألعاب
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fallback if no questions
  if (!currentQ) return null;
  const opts = currentQ.options || [];

  return (
    <div className="min-h-screen bg-brand-cream py-6 px-4 md:py-10" dir="rtl">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* Leaderboard Sidebar */}
        <div className="lg:w-80 order-2 lg:order-1 flex-shrink-0">
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-brand-beige/20 sticky top-6">
            <h3 className="font-black text-brand-text mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-red" />
              اللاعبين (مباشر)
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {players.map((p, i) => (
                  <motion.div
                    key={p.uid}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all relative overflow-hidden",
                      p.uid === user?.uid 
                        ? "border-brand-red/20 bg-brand-red/5" 
                        : "border-brand-beige/10 bg-white"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-cream flex items-center justify-center text-xs font-black text-brand-beige/50 shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-black text-brand-text text-xs truncate">
                        {p.name}
                      </p>
                    </div>
                    <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl font-black text-sm shrink-0">
                      {p.score}
                    </div>
                    {p.completed && (
                      <div className="absolute top-0 right-0 w-2 h-full bg-emerald-400" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 order-1 lg:order-2">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-beige/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-brand-cream">
              <div 
                className="h-full bg-brand-red transition-all duration-300"
                style={{ width: `${((qIndex) / questions.length) * 100}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between mt-2 mb-6 text-brand-beige font-black text-sm">
              <span>السؤال {qIndex + 1} من {questions.length}</span>
              <span className="text-amber-500 bg-amber-50 px-3 py-1 rounded-full flex items-center gap-1">
                نقطتك: {myScore}
              </span>
            </div>

            <h2 className="text-xl md:text-3xl font-black text-brand-text mb-8 leading-relaxed">
              {currentQ.question}
            </h2>

            <div className="space-y-3">
              {opts.map((opt: string, i: number) => {
                const isSelected = selected === opt;
                const isCorrect = opt === currentQ.answer;
                const showStatus = selected !== null;

                let btnClass = "border-2 border-brand-beige/20 bg-white text-brand-text hover:border-brand-red hover:bg-brand-red/5";
                
                if (showStatus) {
                  if (isCorrect) {
                    btnClass = "border-2 border-emerald-500 bg-emerald-50 text-emerald-700";
                  } else if (isSelected && !isCorrect) {
                    btnClass = "border-2 border-red-500 bg-red-50 text-red-700";
                  } else {
                    btnClass = "border-2 border-brand-beige/10 bg-brand-cream/30 text-brand-beige opacity-50";
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handlePick(opt)}
                    disabled={selected !== null}
                    className={cn(
                      "w-full text-right p-4 rounded-2xl font-black text-base md:text-lg transition-all active:scale-95 disabled:cursor-not-allowed",
                      btnClass
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
