import React, { useRef } from 'react';
import { ArrowLeft, Download, Trophy, Crown, Medal, Star, Flame, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import top10Data from '../../top10_results.json';
import { cn } from '../../lib/utils';
import html2canvas from 'html2canvas';

export default function Posters() {
  
  const handleDownloadAll = async () => {
    const ids = [
      { id: 'workshop-r1', name: 'Workshop-Round1' },
      { id: 'workshop-r2', name: 'Workshop-Round2' },
      { id: 'online-r1', name: 'Online-Round1' },
      { id: 'online-r2', name: 'Online-Round2' }
    ];
    
    for (const item of ids) {
      const el = document.getElementById(item.id);
      if (!el) continue;
      
      try {
        const canvas = await html2canvas(el, { 
          scale: 2, 
          useCORS: true, 
          backgroundColor: null,
          logging: false
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `AlHekaya-Top10-${item.name}.png`;
        link.href = dataUrl;
        link.click();
        
        // Add a small delay between downloads
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error('Error generating image for', item.id, err);
      }
    }
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-amber-200 to-yellow-500 text-yellow-950 scale-105 shadow-xl border border-yellow-300";
    if (rank === 2) return "bg-gradient-to-r from-slate-200 to-slate-400 text-slate-900 shadow-lg border border-slate-300";
    if (rank === 3) return "bg-gradient-to-r from-orange-200 to-orange-400 text-orange-950 shadow-md border border-orange-300";
    return "bg-white/50 text-brand-text border border-white/20";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-600 drop-shadow-md" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-600 drop-shadow-md" />;
    if (rank === 3) return <Trophy className="w-6 h-6 text-orange-700 drop-shadow-md" />;
    return <Star className="w-5 h-5 text-amber-500/50" />;
  };

  const PosterCard = ({ id, title, subtitle, data, roundKey, theme }: any) => (
    <div className="flex flex-col gap-4">
      {/* <div className="flex justify-end">
        <button onClick={() => handleDownload(id, id)} className="bg-brand-red text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-brand-red/90 transition-colors shadow-lg">
          <Download className="w-4 h-4" /> تحميل {title}
        </button>
      </div> */}
      <div 
        id={id}
        className={cn(
          "w-full aspect-[4/5] md:aspect-square lg:aspect-[3/4] max-w-2xl mx-auto rounded-[40px] p-8 md:p-12 relative overflow-hidden flex flex-col shadow-2xl",
          theme === 'gold' ? "bg-gradient-to-br from-brand-red to-[#992525]" :
          theme === 'blue' ? "bg-gradient-to-br from-[#1E3A8A] to-[#0F172A]" :
          theme === 'green' ? "bg-gradient-to-br from-[#047857] to-[#064E3B]" :
          "bg-gradient-to-br from-indigo-600 to-purple-900"
        )}
      >
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-black/20 blur-3xl rounded-full" />

        {/* Header */}
        <div className="text-center z-10 mb-8 md:mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-3xl mb-6 shadow-xl border border-white/20">
            {theme === 'gold' && <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />}
            {theme === 'blue' && <Sparkles className="w-12 h-12 text-blue-300 drop-shadow-[0_0_15px_rgba(147,197,253,0.5)]" />}
            {theme === 'green' && <Crown className="w-12 h-12 text-emerald-300 drop-shadow-[0_0_15px_rgba(110,231,183,0.5)]" />}
            {theme === 'purple' && <Flame className="w-12 h-12 text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]" />}
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight drop-shadow-md leading-tight">{title}</h1>
          <p className="text-xl text-white/80 font-bold tracking-wide">{subtitle}</p>
        </div>

        {/* List */}
        <div className="flex-1 flex flex-col gap-3 z-10 w-full max-w-lg mx-auto">
          {data.slice(0, 10).map((student: any, index: number) => {
            const score = student[roundKey];
            if (score === 0 && index > 4) return null; // hide zeros at bottom

            return (
              <div 
                key={index} 
                className={cn(
                  "flex items-center gap-4 p-3 md:p-4 rounded-2xl transition-all duration-500 backdrop-blur-sm",
                  getRankStyle(index + 1)
                )}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-xl bg-white/20 flex items-center justify-center text-lg md:text-xl font-black shadow-inner">
                  {index + 1}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-lg md:text-xl truncate">{student.name}</span>
                    {getRankIcon(index + 1)}
                  </div>
                  <span className="text-xs md:text-sm opacity-70 font-bold uppercase tracking-widest">{student.code}</span>
                </div>
                <div className="text-right shrink-0 bg-black/10 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border border-black/5">
                  <div className="font-black text-xl md:text-2xl leading-none">{score}</div>
                  <div className="text-[10px] uppercase font-bold opacity-70">نقطة</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center z-10">
          <p className="text-white/50 text-sm font-bold uppercase tracking-widest">Al-Hekaya Platform • 2026</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-cream/20 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="p-4 bg-white border border-brand-beige/20 rounded-2xl hover:bg-brand-cream transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5 text-brand-beige" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-brand-text">بوسترات أوائل الطلاب</h1>
              <p className="text-brand-beige mt-2">تصميمات جاهزة للسوشيال ميديا بضغطة زر</p>
            </div>
          </div>
          
          <button 
            onClick={handleDownloadAll}
            className="flex items-center justify-center gap-3 bg-brand-red text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-brand-red/20 hover:scale-105 transition-all"
          >
            <Download className="w-5 h-5" />
            تحميل الـ 4 بوسترات كصور
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <PosterCard 
            id="workshop-r1"
            title="أوائل الورشة"
            subtitle="المرحلة الأولى - Round 1"
            data={top10Data.top10WR1}
            roundKey="r1"
            theme="gold"
          />
          <PosterCard 
            id="workshop-r2"
            title="أوائل الورشة"
            subtitle="المرحلة الثانية - أغسطس"
            data={top10Data.top10WR2}
            roundKey="r2"
            theme="blue"
          />
          <PosterCard 
            id="online-r1"
            title="أوائل الأونلاين"
            subtitle="المرحلة الأولى - Round 1"
            data={top10Data.top10OR1}
            roundKey="r1"
            theme="green"
          />
          <PosterCard 
            id="online-r2"
            title="أوائل الأونلاين"
            subtitle="المرحلة الثانية - أغسطس"
            data={top10Data.top10OR2}
            roundKey="r2"
            theme="purple"
          />
        </div>
      </div>
    </div>
  );
}
