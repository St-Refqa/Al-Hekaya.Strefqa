import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, BookOpen, X, Navigation } from 'lucide-react';
import { journeysData, JourneyLocation } from '../../lib/journeysData';
import { cn } from '../../lib/utils';

interface PaulJourneysMapProps {
  onClose: () => void;
}

export default function PaulJourneysMap({ onClose }: PaulJourneysMapProps) {
  const [activeJourneyId, setActiveJourneyId] = useState(journeysData[0].id);
  const [selectedLocation, setSelectedLocation] = useState<JourneyLocation | null>(null);

  const activeJourney = journeysData.find(j => j.id === activeJourneyId)!;

  // Path generator for SVG
  const generatePath = () => {
    if (activeJourney.locations.length === 0) return '';
    return activeJourney.locations.map((loc, index) => {
      return `${index === 0 ? 'M' : 'L'} ${loc.x} ${loc.y}`;
    }).join(' ');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black font-cairo overflow-hidden"
    >
      <div className="relative bg-[#fdf5e6] flex flex-col flex-shrink-0 w-screen h-screen portrait:w-[100vh] portrait:h-[100vw] portrait:-rotate-90 origin-center overflow-hidden">
        {/* Header - Vintage Style */}
        <div className="relative z-10 bg-[#e8d5b5] border-b-2 border-[#d4b483] px-6 py-4 flex flex-col md:flex-row justify-between items-center shadow-md">
          <div className="flex items-center gap-3 mb-4 md:mb-0">
            <div className="w-10 h-10 rounded-full bg-[#8b5a2b] flex items-center justify-center text-[#fdf5e6] shadow-inner">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#5c3a21] uppercase tracking-wide">
                رحلات بولس الرسول
              </h2>
              <p className="text-sm font-bold text-[#8b5a2b]">خريطة تفاعلية لأسفار الكرازة</p>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 md:pb-0 hide-scrollbar">
            {journeysData.map((journey) => (
              <button
                key={journey.id}
                onClick={() => {
                  setActiveJourneyId(journey.id);
                  setSelectedLocation(null);
                }}
                className={cn(
                  "px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all border-2",
                  activeJourneyId === journey.id
                    ? "bg-[#8b5a2b] text-[#fdf5e6] border-[#5c3a21] shadow-lg"
                    : "bg-[#fdf5e6] text-[#8b5a2b] border-[#d4b483] hover:bg-[#f3e3ca]"
                )}
              >
                {journey.title}
              </button>
            ))}
          </div>

          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:static w-10 h-10 rounded-full bg-[#fdf5e6] border border-[#d4b483] text-[#8b5a2b] hover:bg-brand-red hover:text-white hover:border-brand-red flex items-center justify-center transition-all z-20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Area */}
        <div className="relative flex-1 bg-[#d0e5f2] overflow-hidden">
          {/* Background Map Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-80 mix-blend-multiply"
            style={{ backgroundImage: `url('/assets/paul-map.png')` }}
          />
          
          {/* Paper Texture Overlay */}
          <div className="absolute inset-0 bg-[#e8d5b5] mix-blend-color-burn opacity-30 pointer-events-none" />

          {/* SVG Overlay for Paths */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md">
            <motion.path
              key={activeJourney.id}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, ease: "easeInOut" }}
              d={generatePath()}
              fill="none"
              stroke={activeJourney.color}
              strokeWidth="3"
              strokeDasharray="8,8"
              vectorEffect="non-scaling-stroke"
              className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
            />
          </svg>

          {/* Arabic Region Labels Overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-multiply font-cairo">
            <div className="absolute top-[35%] left-[15%] text-[#5c3a21] font-black text-xl md:text-3xl tracking-widest -rotate-12">إيطاليا</div>
            <div className="absolute top-[40%] left-[45%] text-[#5c3a21] font-black text-xl md:text-3xl tracking-widest">اليونان</div>
            <div className="absolute top-[45%] left-[65%] text-[#5c3a21] font-black text-xl md:text-3xl tracking-widest">آسيا الصغرى</div>
            <div className="absolute top-[65%] left-[88%] text-[#5c3a21] font-black text-xl md:text-3xl tracking-widest -rotate-90">سوريا وفلسطين</div>
            <div className="absolute top-[80%] left-[75%] text-[#5c3a21] font-black text-xl md:text-3xl tracking-widest">مصر</div>
            <div className="absolute top-[65%] left-[40%] text-[#2a4365] font-black text-2xl md:text-4xl tracking-[0.5em] opacity-30 italic">البحر المتوسط</div>
          </div>

          {/* Interactive Markers */}
          {activeJourney.locations.map((loc, index) => (
            <motion.button
              key={`${activeJourney.id}-${loc.id}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.2 + 0.5, type: "spring" }}
              onClick={() => setSelectedLocation(loc)}
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group z-10"
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
            >
              <div 
                className="absolute inset-0 rounded-full opacity-40 animate-ping"
                style={{ backgroundColor: activeJourney.color }}
              />
              <div 
                className="relative flex items-center justify-center w-6 h-6 rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-125 font-bold text-white text-[10px]"
                style={{ backgroundColor: activeJourney.color }}
              >
                {index + 1}
              </div>
              <span className="absolute bottom-full mb-1.5 px-2.5 py-1 bg-[#fdf5e6] border-2 border-[#8b5a2b] text-[#5c3a21] text-[10px] md:text-xs font-black rounded-md shadow-md whitespace-nowrap transition-transform group-hover:scale-110 group-hover:z-50 pointer-events-none">
                {loc.name}
              </span>
            </motion.button>
          ))}

          {/* Info Popup */}
          <AnimatePresence>
            {selectedLocation && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="absolute inset-0 flex items-center justify-center p-4 z-50 pointer-events-none"
              >
                <div className="absolute inset-0 bg-[#3a2512]/40 backdrop-blur-sm pointer-events-auto" onClick={() => setSelectedLocation(null)} />
                
                <div 
                  className="bg-[#f4ead5] w-[95%] max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border-2 border-[#d4b483] relative pointer-events-auto hide-scrollbar"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="bg-[#e8d5b5] border-b border-[#d4b483] p-4 flex justify-between items-start">
                  <div className="flex items-center gap-2 text-[#5c3a21]">
                    <MapPin className="w-5 h-5 text-brand-red" />
                    <h3 className="text-xl font-black">{selectedLocation.name}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className="p-1 hover:bg-[#d4b483] rounded-full transition-colors text-[#5c3a21] relative z-10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                {selectedLocation.image && (
                  <div className="w-full h-40 overflow-hidden border-b-2 border-[#d4b483]">
                    <img 
                      src={selectedLocation.image} 
                      alt={selectedLocation.name} 
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}
                
                <div className="p-5 space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar">
                  {selectedLocation.companions.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 text-[#8b5a2b] font-black text-sm mb-2 uppercase">
                        <Users className="w-4 h-4" />
                        الرفقاء
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedLocation.companions.map(comp => (
                          <span key={comp} className="px-2 py-1 bg-[#f3e3ca] text-[#5c3a21] text-xs font-bold rounded-md border border-[#e8d5b5]">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 text-[#8b5a2b] font-black text-sm mb-2 uppercase">
                      <BookOpen className="w-4 h-4" />
                      الأحداث
                    </div>
                    <p className="text-sm font-bold text-[#5c3a21] leading-relaxed">
                      {selectedLocation.events}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
