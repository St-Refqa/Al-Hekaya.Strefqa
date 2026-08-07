import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, supabase } from '../../../lib/firebase';
import { useAuth } from '../../../hooks/useAuth';
import { ArrowLeft, Users, Play, Copy, CheckCircle2, User as UserIcon, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../../lib/utils';

export default function MultiplayerLobby() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    const channel = supabase.channel('global-online-users');
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users = Object.values(state).map((presenceArray: any) => presenceArray[0]);
      setOnlineUsers(users);
    });
    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!roomId || !user) return;
    
    const roomRef = doc(db, 'gameRooms', roomId);
    const unsub = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) {
        setError('الغرفة تم إغلاقها أو لم تعد موجودة.');
        return;
      }
      const data = snap.data();
      setRoom(data);

      // If status changed to playing, redirect all players to the game screen
      if (data.status === 'playing') {
        navigate(`/student/games/play-multi/${roomId}`);
      }
    });

    return () => unsub();
  }, [roomId, user, navigate]);

  const handleCopy = () => {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = async () => {
    if (!roomId || room?.hostId !== user?.uid) return;
    
    try {
      await updateDoc(doc(db, 'gameRooms', roomId), {
        status: 'playing'
      });
    } catch (err) {
      console.error("Error starting game:", err);
    }
  };

  const handleInvite = async (targetUid: string) => {
    const channel = supabase.channel('global-online-users');
    await channel.send({
      type: 'broadcast',
      event: 'game-invite',
      payload: { 
        to: targetUid, 
        roomId, 
        fromName: user?.fullName || 'صديق'
      }
    });
    alert('تم إرسال الدعوة!');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-brand-cream py-12 px-4 flex items-center justify-center" dir="rtl">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-brand-beige/20">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-brand-text mb-4">{error}</h2>
          <Link to="/student/games" className="inline-block bg-brand-red text-white px-6 py-3 rounded-2xl font-black">
            العودة للألعاب
          </Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const players = Object.values(room.players || {}) as any[];
  const isHost = room.hostId === user?.uid;
  const isFull = players.length >= 4;

  return (
    <div className="min-h-screen bg-brand-cream py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/student/games"
            className="p-3 bg-white rounded-2xl shadow-sm border border-brand-beige/20 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brand-text" />
          </Link>
          <h1 className="text-2xl font-black text-brand-text flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-red" />
            غرفة الانتظار
          </h1>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border border-brand-beige/20 mb-6">
          <div className="text-center mb-8">
            <p className="text-brand-beige font-bold text-sm mb-2">كود الغرفة (للمشاركة)</p>
            <button 
              onClick={handleCopy}
              className="inline-flex items-center gap-3 bg-brand-cream px-6 py-3 rounded-2xl border-2 border-brand-beige/20 hover:border-brand-red/30 transition-all group"
              dir="ltr"
            >
              <span className="text-3xl font-black tracking-[0.3em] text-brand-text group-hover:text-brand-red transition-colors">
                {room.roomId}
              </span>
              {copied ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              ) : (
                <Copy className="w-5 h-5 text-brand-beige group-hover:text-brand-red" />
              )}
            </button>
            <p className="text-xs text-brand-beige mt-3 font-bold">
              {players.length} من 4 لاعبين
            </p>
          </div>

          <div className="space-y-3 mb-8">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.div
                  key={p.uid}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.1 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                    p.uid === user?.uid 
                      ? "border-brand-red/20 bg-brand-red/5" 
                      : "border-brand-beige/10 bg-white"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-cream border border-brand-beige/20 overflow-hidden flex items-center justify-center shrink-0">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-brand-beige" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-black text-brand-text text-sm truncate">
                      {p.name}
                      {p.uid === user?.uid && (
                        <span className="mr-2 text-[10px] bg-brand-red text-white px-2 py-0.5 rounded-full">أنت</span>
                      )}
                    </p>
                    {p.uid === room.hostId && (
                      <p className="text-xs text-amber-500 font-bold flex items-center gap-1 mt-0.5">
                        👑 مدير الغرفة
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {!isFull && Array.from({ length: 4 - players.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-brand-beige/20 bg-brand-cream/50 opacity-50">
                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-brand-beige/30 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-brand-beige/50" />
                </div>
                <div className="flex-1 text-right">
                  <p className="font-bold text-brand-beige/70 text-sm">في انتظار لاعب...</p>
                </div>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={players.length < 2}
              className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-lg hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-5 h-5" />
              {players.length < 2 ? 'في انتظار لاعبين آخرين...' : 'ابدأ التحدي الآن'}
            </button>
          ) : (
            <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 py-4 rounded-2xl font-black text-center flex items-center justify-center gap-2 mb-8">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              في انتظار المضيف لبدء اللعبة...
            </div>
          )}

          {/* Online Users List */}
          <div className="mt-8 pt-8 border-t border-brand-beige/10">
            <h3 className="font-black text-brand-text mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-emerald-500" />
              متواجدون الآن
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {onlineUsers.filter(u => u.uid !== user?.uid && !players.find(p => p.uid === u.uid)).length}
              </span>
            </h3>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {onlineUsers
                .filter(u => u.uid !== user?.uid && !players.find(p => p.uid === u.uid))
                .map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-brand-cream/50 rounded-xl border border-brand-beige/10">
                    <div className="w-10 h-10 rounded-xl bg-white border border-brand-beige/20 overflow-hidden flex items-center justify-center shrink-0">
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-5 h-5 text-brand-beige" />
                      )}
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-black text-brand-text text-xs">{u.name}</p>
                      <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        أونلاين
                      </p>
                    </div>
                    {isHost && !isFull && (
                      <button 
                        onClick={() => handleInvite(u.uid)}
                        className="px-3 py-1.5 bg-brand-red text-white text-[10px] font-black rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm shrink-0"
                      >
                        دعوة
                      </button>
                    )}
                  </div>
              ))}
              {onlineUsers.filter(u => u.uid !== user?.uid && !players.find(p => p.uid === u.uid)).length === 0 && (
                <p className="text-center text-sm font-bold text-brand-beige py-4">
                  مفيش حد أونلاين دلوقتي غيركم
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
