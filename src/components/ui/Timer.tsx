import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Timer({
  timeLeft,
  totalTime,
  onComplete,
  className
}: {
  timeLeft: number;
  totalTime: number;
  onComplete?: () => void;
  className?: string;
}) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = totalTime > 0 ? (timeLeft / totalTime) * 100 : 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={mins}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              className={cn(
                "text-sm font-bold font-mono tracking-tighter",
                timeLeft < 30 ? "text-rose-600" : "text-slate-700"
              )}
            >
              {mins.toString().padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
          <span className="text-slate-300 font-mono">:</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={secs}
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -5, opacity: 0 }}
              className={cn(
                "text-sm font-bold font-mono tracking-tighter",
                timeLeft < 30 ? "text-rose-600 font-black animate-pulse" : "text-slate-700"
              )}
            >
              {secs.toString().padStart(2, "0")}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">Countdown</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          animate={{ 
            width: `${progress}%`,
            backgroundColor: progress < 20 ? "#f43f5e" : "#4f46e5"
          }}
          transition={{ duration: 1, ease: "linear" }}
          className="h-full rounded-full"
        />
      </div>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
