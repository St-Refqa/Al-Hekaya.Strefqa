import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, BookOpen, X, Navigation, ZoomIn, ZoomOut, ChevronRight, ChevronLeft } from 'lucide-react';
import { journeysData, JourneyLocation } from '../../lib/journeysData';
import { cn } from '../../lib/utils';
import { useAuth } from '../../hooks/useAuth';

interface PaulJourneysMapProps {
  onClose: () => void;
}

export default function PaulJourneysMap({ onClose }: PaulJourneysMapProps) {
  const [activeJourneyId, setActiveJourneyId] = useState(journeysData[0].id);
  const [selectedLocation, setSelectedLocation] = useState<JourneyLocation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLegendOpen, setIsLegendOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 768 : false);

  const activeJourney = journeysData.find(j => j.id === activeJourneyId)!;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedLocations, setEditedLocations] = useState<Record<string, JourneyLocation[]>>({});
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const [draggingControlPoint, setDraggingControlPoint] = useState<string | null>(null);
  React.useEffect(() => {
    if (!editedLocations[activeJourneyId]) {
      setEditedLocations(prev => ({ ...prev, [activeJourneyId]: activeJourney.locations }));
    }
  }, [activeJourneyId, activeJourney.locations]);

  const currentLocations = isEditMode 
    ? (editedLocations[activeJourneyId] || activeJourney.locations) 
    : activeJourney.locations;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    if (!draggingPoint && !draggingControlPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    if (draggingPoint) {
      setEditedLocations(prev => ({
        ...prev,
        [activeJourneyId]: prev[activeJourneyId].map(loc => 
          loc.id === draggingPoint ? { ...loc, x, y } : loc
        )
      }));
    } else if (draggingControlPoint) {
      setEditedLocations(prev => ({
        ...prev,
        [activeJourneyId]: prev[activeJourneyId].map(loc => 
          loc.id === draggingControlPoint ? { ...loc, cx: x, cy: y } : loc
        )
      }));
    }
  };

  const handlePointerUp = () => {
    setDraggingPoint(null);
    setDraggingControlPoint(null);
  };


  const getLabelPositionClasses = (pos?: string) => {
    switch (pos) {
      case 'top': return 'bottom-full mb-3 left-1/2 -translate-x-1/2';
      case 'bottom': return 'top-full mt-3 left-1/2 -translate-x-1/2';
      case 'left': return 'right-full mr-3 top-1/2 -translate-y-1/2';
      case 'right': return 'left-full ml-3 top-1/2 -translate-y-1/2';
      case 'top-right': return 'bottom-full mb-2 left-full ml-2';
      case 'bottom-right': return 'top-full mt-2 left-full ml-2';
      case 'bottom-left': return 'top-full mt-2 right-full mr-2';
      case 'top-left': return 'bottom-full mb-2 right-full mr-2';
      default: return 'bottom-full mb-3 left-1/2 -translate-x-1/2'; // default top
    }
  };

  // Path generator for SVG
  const generatePath = () => {
    if (currentLocations.length === 0) return '';
    return currentLocations.map((loc, index) => {
      if (index === 0) return `M ${loc.x} ${loc.y}`;
      
      const prevLoc = currentLocations[index - 1];
      const hasControl = loc.cx !== undefined && loc.cy !== undefined;
      
      if (hasControl) {
        return `Q ${loc.cx} ${loc.cy} ${loc.x} ${loc.y}`;
      } else {
        return `L ${loc.x} ${loc.y}`;
      }
    }).join(' ');
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black font-cairo overflow-hidden"
    >
      <div className="relative bg-[#fdf5e6] flex flex-col w-full h-full overflow-hidden">
        {isAdmin && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex gap-2">
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className="bg-purple-600/90 backdrop-blur text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-purple-700 transition"
            >
              {isEditMode ? 'إغلاق التعديل' : 'تعديل الإحداثيات (أدمن)'}
            </button>
            {isEditMode && (
              <button 
                onClick={() => {
                  const dataString = JSON.stringify(editedLocations, null, 2);
                  console.log(dataString);
                  navigator.clipboard.writeText(dataString)
                    .then(() => alert("تم نسخ الإحداثيات بنجاح! تقدر تعملها Paste دلوقتي في الرسالة."))
                    .catch(() => alert("حصل مشكلة في النسخ، بس الإحداثيات لسة مطبوعة في الـ Console."));
                }}
                className="bg-green-600/90 backdrop-blur text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-green-700 transition"
              >
                نسخ البيانات
              </button>
            )}
          </div>
        )}
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
          {/* Scrollable Container */}
          <div className="w-full h-full overflow-auto touch-pan-x touch-pan-y hide-scrollbar cursor-grab active:cursor-grabbing" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
            {/* Inner Map Container */}
            <div 
              className="relative flex-shrink-0 origin-top-left transition-all duration-300 ease-out"
              style={{ width: `${1324 * zoom}px`, height: `${800 * zoom}px` }}
            >
              {/* Background Map Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${activeJourney.mapImage || '/assets/paul-map.png'})` }}
              />

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
                  strokeWidth="4"
                  strokeDasharray="10,10"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.6)]"
                />
              </svg>

              {/* Interactive Markers */}
              {currentLocations.map((loc, index) => (
                <motion.div
                  key={`${activeJourney.id}-${loc.id}`}
                  initial={isEditMode ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: isEditMode ? 0 : index * 0.2 + 0.5, type: "spring" }}
                  onPointerDown={(e) => {
                    if (isEditMode) {
                      e.stopPropagation();
                      e.preventDefault();
                      setDraggingPoint(loc.id);
                    } else {
                      setSelectedLocation(loc);
                    }
                  }}
                  className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group z-10 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                  style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                >
                  <div 
                    className="relative w-4 h-4 rounded-full border-[1.5px] border-white shadow-md flex items-center justify-center transition-transform group-hover:scale-150"
                    style={{ backgroundColor: activeJourney.color }}
                  >
                    {isEditMode && <div className="absolute inset-0 bg-white/50 rounded-full scale-150 animate-pulse pointer-events-none" />}
                    <div className="absolute inset-0 rounded-full opacity-50 animate-ping" style={{ backgroundColor: activeJourney.color }} />
                  </div>

                  {/* Permanent Label */}
                  <div 
                    className={`absolute ${getLabelPositionClasses(loc.labelPosition)} whitespace-nowrap z-20 ${isEditMode ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`}
                    onPointerDown={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        // Cycle label position
                        const positions = ['top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left', 'top-left'];
                        const currentIdx = positions.indexOf(loc.labelPosition || 'top');
                        const nextPos = positions[(currentIdx + 1) % positions.length];
                        setEditedLocations(prev => ({
                          ...prev,
                          [activeJourneyId]: prev[activeJourneyId].map(l => l.id === loc.id ? { ...l, labelPosition: nextPos as any } : l)
                        }));
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        const newName = prompt("تعديل اسم المدينة:", loc.name);
                        if (newName) {
                          setEditedLocations(prev => ({
                            ...prev,
                            [activeJourneyId]: prev[activeJourneyId].map(l => l.id === loc.id ? { ...l, name: newName } : l)
                          }));
                        }
                      }
                    }}
                  >
                    <div className="bg-[#fdf5e6]/80 text-[#5c3a21] px-2 py-1 rounded shadow-sm backdrop-blur-sm border border-[#d4b483]/50 font-cairo text-xs font-bold transition-colors hover:bg-[#e8d5b5]">
                      {loc.name}
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Control Points rendering for Edit Mode */}
              {isEditMode && currentLocations.map((loc, index) => {
                if (index === 0) return null;
                const prevLoc = currentLocations[index - 1];
                
                // If control point doesn't exist, calculate the midpoint to show a handle
                const isDefault = loc.cx === undefined || loc.cy === undefined;
                const renderCx = isDefault ? (prevLoc.x + loc.x) / 2 : loc.cx;
                const renderCy = isDefault ? (prevLoc.y + loc.y) / 2 : loc.cy;

                return (
                  <div
                    key={`cp-${activeJourney.id}-${loc.id}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setDraggingControlPoint(loc.id);
                    }}
                    className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-grab active:cursor-grabbing z-30"
                    style={{ left: `${renderCx}%`, top: `${renderCy}%` }}
                  >
                    <div className="w-3 h-3 rounded bg-purple-500 border border-white shadow shadow-purple-900/50 hover:scale-150 transition-transform" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-2 z-40">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.25, 2.5))}
              className="w-10 h-10 bg-[#fdf5e6]/90 backdrop-blur-sm border-2 border-[#d4b483] rounded-full flex items-center justify-center text-[#8b5a2b] shadow-md hover:bg-[#e8d5b5] transition-colors"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
              className="w-10 h-10 bg-[#fdf5e6]/90 backdrop-blur-sm border-2 border-[#d4b483] rounded-full flex items-center justify-center text-[#8b5a2b] shadow-md hover:bg-[#e8d5b5] transition-colors"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
          </div>

          {/* Map Legend (Sidebar) */}
          <div 
            dir="rtl" 
            className={cn(
              "absolute top-2 left-2 md:top-4 md:left-4 bg-[#fdf5e6]/90 backdrop-blur-sm border-2 border-[#d4b483] rounded-xl shadow-xl overflow-hidden pointer-events-auto z-40 font-cairo transition-all duration-300 flex flex-col",
              isLegendOpen ? "w-48 md:w-64 bottom-2 md:bottom-4" : "w-12 h-12"
            )}
          >
            {/* Toggle Button */}
            <button 
              onClick={() => setIsLegendOpen(!isLegendOpen)}
              className={cn(
                "w-full flex items-center justify-center p-2 bg-[#fdf5e6] text-[#8b5a2b] hover:bg-[#e8d5b5] transition-colors",
                isLegendOpen ? "border-b-2 border-[#d4b483]" : "h-full"
              )}
            >
              {isLegendOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
            </button>

            <AnimatePresence>
              {isLegendOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex-1 overflow-y-auto hide-scrollbar flex flex-col"
                >
                  <div className="sticky top-0 bg-[#fdf5e6] border-b-2 border-[#d4b483] p-2 md:p-3 text-center">
                    <h3 className="font-black text-[#5c3a21] text-[10px] md:text-base">مفتاح الخريطة</h3>
                    <p className="text-[8px] md:text-xs text-[#8b5a2b] font-bold">{activeJourney.title}</p>
                  </div>
                  <div className="p-2 md:p-3 flex flex-col gap-1.5 md:gap-2">
                    {activeJourney.locations.map((loc, index) => (
                      <button
                        key={`legend-${loc.id}`}
                        onClick={() => setSelectedLocation(loc)}
                        className="flex items-center gap-1.5 md:gap-2 hover:bg-[#e8d5b5]/50 p-1 md:p-2 rounded-lg transition-colors text-right"
                      >
                        <div 
                          className="flex-shrink-0 flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full text-white text-[8px] md:text-[10px] font-bold shadow-md"
                          style={{ backgroundColor: activeJourney.color }}
                        >
                          {index + 1}
                        </div>
                        <span className="text-[9px] md:text-sm font-bold text-[#5c3a21] line-clamp-1">
                          {loc.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>


          {/* Info Popup */}
          <AnimatePresence>
            {selectedLocation && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex flex-col md:items-center md:justify-center z-50 pointer-events-none"
              >
                {/* Backdrop */}
                <div 
                  className="absolute inset-0 bg-[#3a2512]/60 backdrop-blur-sm pointer-events-auto transition-opacity" 
                  onClick={() => setSelectedLocation(null)} 
                />
                
                {/* Popup Container (Bottom Sheet on Mobile, Centered Modal on Desktop) */}
                <motion.div 
                  initial={{ y: "100%", opacity: 0, scale: 0.95 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: "100%", opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="bg-[#fdf5e6] w-full md:w-[90%] md:max-w-lg mt-auto md:mt-0 rounded-t-3xl md:rounded-2xl shadow-2xl border-t-4 md:border-4 border-[#d4b483] relative pointer-events-auto flex flex-col overflow-hidden max-h-[85vh] font-cairo"
                  onClick={e => e.stopPropagation()}
                  dir="rtl"
                >
                  {/* Close Button - Floating */}
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full transition-colors z-20"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {/* Header / Image Area */}
                  {selectedLocation.image ? (
                    <div className="relative w-full h-48 md:h-64 bg-[#e8d5b5] flex-shrink-0">
                      <img 
                        src={selectedLocation.image} 
                        alt={selectedLocation.name} 
                        className="w-full h-full object-contain p-2"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fdf5e6] to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full h-12 bg-[#e8d5b5] flex-shrink-0" />
                  )}
                  
                  {/* Content Area */}
                  <div className="px-5 pb-6 pt-2 overflow-y-auto custom-scrollbar flex-1">
                    {/* Title */}
                    <div className="flex items-center gap-3 text-[#5c3a21] mb-6 -mt-8 relative z-10">
                      <div className="w-12 h-12 bg-[#fdf5e6] rounded-full flex items-center justify-center shadow-md border-2 border-[#d4b483] flex-shrink-0 text-brand-red font-black text-xl">
                        {activeJourney.locations.findIndex(l => l.id === selectedLocation.id) + 1}
                      </div>
                      <h3 className="text-xl md:text-2xl font-black drop-shadow-sm mt-4">{selectedLocation.name}</h3>
                    </div>

                    <div className="space-y-4">
                      {/* Companions */}
                      {selectedLocation.companions.length > 0 && (
                        <div className="bg-[#e8d5b5]/30 rounded-xl p-4 border border-[#d4b483]/50">
                          <div className="flex items-center gap-2 text-[#8b5a2b] font-black text-sm mb-3">
                            <Users className="w-5 h-5" />
                            الرفقاء
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedLocation.companions.map(comp => (
                              <span key={comp} className="px-3 py-1 bg-[#fdf5e6] text-[#5c3a21] text-xs font-bold rounded-lg shadow-sm border border-[#d4b483]">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Events */}
                      <div className="bg-[#e8d5b5]/30 rounded-xl p-4 border border-[#d4b483]/50">
                        <div className="flex items-center gap-2 text-[#8b5a2b] font-black text-sm mb-3">
                          <BookOpen className="w-5 h-5" />
                          الأحداث
                        </div>
                        <p className="text-sm md:text-base font-bold text-[#5c3a21] leading-loose">
                          {selectedLocation.events}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
