import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { ArrowLeft, Users, KeyRound, AlertCircle } from 'lucide-react';

export default function MultiplayerJoin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    const roomId = code.toUpperCase().trim();
    if (roomId.length !== 5) {
      setError('كود الغرفة لازم يكون 5 حروف أو أرقام');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const roomRef = doc(db, 'gameRooms', roomId);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        setError('عفواً، الغرفة دي مش موجودة!');
        setIsJoining(false);
        return;
      }

      const roomData = snap.data();

      if (roomData.status !== 'waiting') {
        setError('اللعبة بدأت بالفعل أو انتهت، مش هينفع تدخل دلوقتي!');
        setIsJoining(false);
        return;
      }

      const currentPlayers = roomData.players || {};
      const playersCount = Object.keys(currentPlayers).length;

      // Check if already in room
      if (!currentPlayers[user.uid]) {
        if (playersCount >= 4) {
          setError('الغرفة ممتلئة (4 لاعبين الحد الأقصى)');
          setIsJoining(false);
          return;
        }

        // Add player to room
        await updateDoc(roomRef, {
          [`players.${user.uid}`]: {
            uid: user.uid,
            name: user.fullName || 'بدون اسم',
            photoUrl: user.photoUrl || null,
            score: 0,
            completed: false
          }
        });
      }

      navigate(`/student/games/lobby/${roomId}`);
    } catch (err) {
      console.error("Error joining room:", err);
      setError('حصلت مشكلة في الدخول، جرب تاني');
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream py-8 px-4" dir="rtl">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/student/games"
            className="p-3 bg-white rounded-2xl shadow-sm border border-brand-beige/20 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brand-text" />
          </Link>
          <h1 className="text-2xl font-black text-brand-text flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-red" />
            انضم لغرفة
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-brand-beige/20 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-red/5 rounded-bl-full -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-tr-full -z-10" />

          <div className="w-20 h-20 bg-brand-cream text-brand-red rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-brand-red/10">
            <KeyRound className="w-10 h-10" />
          </div>

          <h2 className="text-2xl font-black text-brand-text mb-2">دخل كود الغرفة</h2>
          <p className="text-brand-beige font-bold mb-8">اطلب الكود من صاحب الغرفة عشان تقدروا تلعبوا مع بعض</p>

          <form onSubmit={handleJoin} className="space-y-6">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="مثال: X7B9K"
                maxLength={5}
                className="w-full text-center text-4xl font-black tracking-[0.5em] bg-brand-cream border-2 border-brand-beige/20 rounded-2xl p-4 text-brand-text focus:ring-4 focus:ring-brand-red/10 focus:border-brand-red uppercase transition-all"
                dir="ltr"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-bold border border-red-200">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-right">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isJoining || code.length !== 5}
              className="w-full bg-brand-text text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-text/20"
            >
              {isJoining ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'انضمام'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
