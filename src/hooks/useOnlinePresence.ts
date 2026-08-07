import { useEffect } from 'react';
import { supabase } from '../lib/firebase';
import { User } from '../types';

export function useOnlinePresence(user: User | null) {
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('global-online-users', {
      config: {
        presence: {
          key: user.uid,
        },
      },
    });

    channel.on('broadcast', { event: 'game-invite' }, (payload) => {
      if (payload.payload.to === user.uid) {
        if (window.confirm(`${payload.payload.fromName} يدعوك للانضمام إلى اللعب الجماعي! هل توافق؟`)) {
          window.location.href = `/student/games/lobby/${payload.payload.roomId}`;
        }
      }
    });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          uid: user.uid,
          name: user.fullName || 'بدون اسم',
          photoUrl: user.photoUrl || null,
          role: user.role,
          onlineAt: new Date().toISOString()
        });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
}
