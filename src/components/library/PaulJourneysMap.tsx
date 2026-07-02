import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Users, BookOpen, X, Navigation, ZoomIn, ZoomOut, ChevronRight, ChevronLeft, Play, StopCircle, ArrowLeft, ArrowRight } from 'lucide-react';
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

  const [isPresenting, setIsPresenting] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(-1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeJourney = journeysData.find(j => j.id === activeJourneyId)!;
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedLocations, setEditedLocations] = useState<Record<string, JourneyLocation[]>>({});
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const [draggingControlPoint, setDraggingControlPoint] = useState<string | null>(null);
  const [draggingLabel, setDraggingLabel] = useState<string | null>(null);
  React.useEffect(() => {
    if (!editedLocations[activeJourneyId]) {
      setEditedLocations(prev => ({ ...prev, [activeJourneyId]: activeJourney.locations }));
    }
  }, [activeJourneyId, activeJourney.locations]);

  const currentLocations = isEditMode 
    ? (editedLocations[activeJourneyId] || activeJourney.locations) 
    : activeJourney.locations;

  const scrollToLocation = (loc: JourneyLocation) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const targetX = (loc.x / 100) * (1324 * 1.8) - container.clientWidth / 2;
    const targetY = (loc.y / 100) * (800 * 1.8) - container.clientHeight / 2;
    container.scrollTo({ left: Math.max(0, targetX), top: Math.max(0, targetY), behavior: 'smooth' });
  };

  const startPresentation = () => {
    setIsPresenting(true);
    setPresentationIndex(0);
    const firstLoc = activeJourney.locations[0];
    setSelectedLocation(firstLoc);
    setIsLegendOpen(false);
    setIsEditMode(false);
    setZoom(1.8);
    setTimeout(() => scrollToLocation(firstLoc), 100);
  };

  const endPresentation = () => {
    setIsPresenting(false);
    setPresentationIndex(-1);
    setSelectedLocation(null);
    setZoom(1);
  };

  const goToNextSlide = () => {
    if (presentationIndex >= activeJourney.locations.length - 1 || isTransitioning) return;
    setIsTransitioning(true);
    const nextIndex = presentationIndex + 1;
    const nextLoc = activeJourney.locations[nextIndex];
    setPresentationIndex(nextIndex);
    setSelectedLocation(nextLoc);
    scrollToLocation(nextLoc);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToPrevSlide = () => {
    if (presentationIndex <= 0 || isTransitioning) return;
    setIsTransitioning(true);
    const prevIndex = presentationIndex - 1;
    const prevLoc = activeJourney.locations[prevIndex];
    setPresentationIndex(prevIndex);
    setSelectedLocation(prevLoc);
    scrollToLocation(prevLoc);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditMode) return;
    if (!draggingPoint && !draggingControlPoint && !draggingLabel) return;
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
    } else if (draggingLabel) {
      setEditedLocations(prev => ({
        ...prev,
        [activeJourneyId]: prev[activeJourneyId].map(loc => 
          loc.id === draggingLabel ? { ...loc, labelX: x, labelY: y } : loc
        )
      }));
    }
  };

  const handlePointerUp = () => {
    setDraggingPoint(null);
    setDraggingControlPoint(null);
    setDraggingLabel(null);
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
        {/* Progress Bar (Visible only in presentation mode) */}
        {isPresenting && (
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/10 z-[70]">
            <motion.div 
              className="h-full"
              style={{ backgroundColor: activeJourney.color }}
              initial={{ width: 0 }}
              animate={{ width: `${((presentationIndex + 1) / activeJourney.locations.length) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
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

          <div className="absolute top-4 right-4 md:static flex items-center gap-2 z-20">
            {!isPresenting && (
              <button 
                onClick={startPresentation}
                className="px-4 h-10 rounded-full bg-[#8b5a2b] text-[#fdf5e6] font-bold text-sm hover:bg-[#5c3a21] transition-all shadow-md flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                بدء الرحلة
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-[#fdf5e6] border border-[#d4b483] text-[#8b5a2b] hover:bg-brand-red hover:text-white hover:border-brand-red flex items-center justify-center transition-all shadow-sm"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Area */}
        {/* Presentation Controls */}
        <AnimatePresence>
          {isPresenting && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#fdf5e6]/95 backdrop-blur-md border-2 border-[#d4b483] rounded-2xl shadow-2xl p-3 flex items-center gap-4 font-cairo"
            >
              <button 
                onClick={endPresentation}
                className="w-10 h-10 rounded-full bg-brand-red text-white flex items-center justify-center hover:bg-red-700 transition shadow-md"
                title="إنهاء العرض"
              >
                <StopCircle className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2" dir="ltr">
                <button 
                  onClick={goToPrevSlide}
                  disabled={presentationIndex <= 0 || isTransitioning}
                  className="w-10 h-10 rounded-full bg-[#e8d5b5] text-[#5c3a21] flex items-center justify-center hover:bg-[#d4b483] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-inner"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="text-[#5c3a21] font-black text-sm w-16 text-center">
                  {presentationIndex + 1} / {activeJourney.locations.length}
                </div>
                <button 
                  onClick={goToNextSlide}
                  disabled={presentationIndex >= activeJourney.locations.length - 1 || isTransitioning}
                  className="w-10 h-10 rounded-full bg-[#8b5a2b] text-[#fdf5e6] flex items-center justify-center hover:bg-[#5c3a21] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Storytelling Card */}
        <AnimatePresence mode="wait">
          {isPresenting && presentationIndex >= 0 && (
            <motion.div 
              key={`story-card-${presentationIndex}`}
              initial={{ x: "120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "120%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-24 md:top-28 right-6 md:right-10 max-w-sm w-[90%] md:w-full bg-[#fdf5e6]/95 backdrop-blur-md rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-r-4 border-[#d4b483] pointer-events-auto flex flex-col overflow-hidden z-[60] font-cairo"
              dir="rtl"
            >
              {/* Card Header */}
              <div className="bg-[#e8d5b5]/50 px-6 py-4 border-b border-[#d4b483]/30 flex items-center gap-4">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md flex-shrink-0"
                  style={{ backgroundColor: activeJourney.color }}
                >
                  {presentationIndex + 1}
                </div>
                <h3 className="text-2xl font-black text-[#5c3a21] drop-shadow-sm leading-tight">
                  {currentLocations[presentationIndex].name}
                </h3>
              </div>
              
              <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto custom-scrollbar">
                {currentLocations[presentationIndex].companions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-[#8b5a2b] font-bold text-sm mb-3">
                      <Users className="w-4 h-4" />
                      الرفقاء
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentLocations[presentationIndex].companions.map(comp => (
                        <span key={comp} className="px-3 py-1 bg-[#fdf5e6] text-[#5c3a21] text-sm font-bold rounded-lg shadow-sm border border-[#d4b483]">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div>
                  <div className="flex items-center gap-2 text-[#8b5a2b] font-bold text-sm mb-3">
                    <BookOpen className="w-4 h-4" />
                    الأحداث
                  </div>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-base md:text-lg font-semibold text-[#5c3a21] leading-relaxed"
                  >
                    {currentLocations[presentationIndex].events}
                  </motion.p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative flex-1 bg-[#d0e5f2] overflow-hidden">
          {/* Scrollable Container */}
          <div ref={containerRef} className="w-full h-full overflow-auto touch-pan-x touch-pan-y hide-scrollbar cursor-grab active:cursor-grabbing" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
            {/* Inner Map Container */}
            <div 
              className="relative flex-shrink-0 origin-top-left transition-all duration-300 ease-out"
              style={{ width: `${1324 * zoom}px`, height: `${800 * zoom}px` }}
            >
              {/* Background Map Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
                style={{ 
                  backgroundImage: `url(${activeJourney.mapImage || '/assets/paul-map.png'})`,
                  opacity: isPresenting ? 0.75 : 1
                }}
              />

              {/* SVG Overlay for Paths */}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none drop-shadow-md">
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={activeJourney.color} />
                  </marker>
                </defs>
                {currentLocations.map((loc, index) => {
                  if (index === 0) return null;
                  if (isPresenting && index > presentationIndex && presentationIndex !== -1) return null;
                  const prevLoc = currentLocations[index - 1];
                  const hasControl = loc.cx !== undefined && loc.cy !== undefined;
                  const d = hasControl 
                    ? `M ${prevLoc.x} ${prevLoc.y} Q ${loc.cx} ${loc.cy} ${loc.x} ${loc.y}`
                    : `M ${prevLoc.x} ${prevLoc.y} L ${loc.x} ${loc.y}`;
                  
                  // Calculate midpoint for the arrow
                  const midX = hasControl ? (0.25 * prevLoc.x + 0.5 * loc.cx + 0.25 * loc.x) : (prevLoc.x + loc.x) / 2;
                  const midY = hasControl ? (0.25 * prevLoc.y + 0.5 * loc.cy + 0.25 * loc.y) : (prevLoc.y + loc.y) / 2;
                  
                  // Note: for a quadratic bezier curve, the tangent at t=0.5 is exactly parallel to the chord from P0 to P2!
                  // So we can use the simple angle calculation for both lines and curves.
                  // However, because the viewBox stretches non-uniformly (width != height), angles in viewBox space 
                  // don't perfectly match visual angles on screen unless we account for the aspect ratio.
                  // To fix this accurately, we compute the angle using the actual pixel dimensions:
                  const actualDx = (loc.x - prevLoc.x) * 13.24; // 1324 / 100
                  const actualDy = (loc.y - prevLoc.y) * 8.00;  // 800 / 100
                  const visualAngle = Math.atan2(actualDy, actualDx) * (180 / Math.PI);

                  const delay = isPresenting ? 0 : index * 0.2;

                  return (
                    <g key={`segment-${activeJourney.id}-${index}`}>
                      <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut", delay }}
                        d={d}
                        fill="none"
                        stroke={activeJourney.color}
                        strokeWidth="2.5"
                        strokeDasharray="5,5"
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
                        className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.6)]"
                      />
                      <motion.g
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: delay + 0.75 }}
                        style={{ originX: 0, originY: 0 }}
                      >
                        {/* We render the polygon inside a non-scaling <g> or scale it manually to prevent aspect ratio distortion */}
                        <svg x={`${midX}%`} y={`${midY}%`} width="20" height="20" overflow="visible">
                          <polygon 
                            points="-8,-6 8,0 -8,6" 
                            fill={activeJourney.color} 
                            transform={`rotate(${visualAngle})`}
                            className="drop-shadow-md"
                          />
                        </svg>
                      </motion.g>
                    </g>
                  );
                })}
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
                  onContextMenu={(e) => {
                    if (isEditMode && loc.hideLabel) {
                      e.stopPropagation();
                      e.preventDefault();
                      const show = window.confirm("إظهار اسم البلد؟");
                      if (show) {
                        setEditedLocations(prev => ({
                          ...prev,
                          [activeJourneyId]: prev[activeJourneyId].map(l => l.id === loc.id ? { ...l, hideLabel: false } : l)
                        }));
                      }
                    }
                  }}
                  className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group z-10 ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                  style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                >
                  <div 
                    className={cn(
                      "relative w-4 h-4 rounded-full border-[1.5px] border-white shadow-md flex items-center justify-center transition-all duration-300 group-hover:scale-150",
                      isPresenting && presentationIndex === index && "scale-[2] ring-4 ring-white/50 z-20"
                    )}
                    style={{ backgroundColor: activeJourney.color }}
                  >
                    {isEditMode && <div className="absolute inset-0 bg-white/50 rounded-full scale-150 animate-pulse pointer-events-none" />}
                    <div className="absolute inset-0 rounded-full opacity-50 animate-ping" style={{ backgroundColor: activeJourney.color }} />
                    {isPresenting && presentationIndex === index && (
                      <div className="absolute -inset-4 rounded-full opacity-40 animate-pulse pointer-events-none" style={{ backgroundColor: activeJourney.color }} />
                    )}
                  </div>

                  {/* Tooltip on Hover */}
                  {(!loc.hideLabel) && (
                    <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                      <div className="bg-[#2a4365]/90 text-white px-2 py-1 rounded shadow-lg backdrop-blur-sm border border-white/20 font-cairo text-xs">
                        {loc.name}
                      </div>
                    </div>
                  )}

                </motion.div>
              ))}

              {/* Free-form Permanent Labels */}
              {currentLocations.map((loc) => {
                if (loc.hideLabel) return null;
                
                // If labelX/Y aren't set, we fall back to the point's x/y with an offset
                const renderX = loc.labelX !== undefined ? loc.labelX : loc.x;
                const renderY = loc.labelY !== undefined ? loc.labelY : (loc.y - 4); // slightly above by default
                
                return (
                  <div
                    key={`label-${activeJourney.id}-${loc.id}`}
                    onPointerDown={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingLabel(loc.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        // Cycle rotation by 15 degrees on right click
                        const currentRot = loc.labelRotation || 0;
                        setEditedLocations(prev => ({
                          ...prev,
                          [activeJourneyId]: prev[activeJourneyId].map(l => 
                            l.id === loc.id ? { ...l, labelRotation: (currentRot + 15) % 360 } : l
                          )
                        }));
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (isEditMode) {
                        e.stopPropagation();
                        e.preventDefault();
                        const newName = prompt("تعديل اسم المدينة (امسح الكلام خالص لو عايز تخفي الاسم):", loc.name);
                        if (newName !== null) {
                          if (newName.trim() === '') {
                            setEditedLocations(prev => ({
                              ...prev,
                              [activeJourneyId]: prev[activeJourneyId].map(l => l.id === loc.id ? { ...l, hideLabel: true } : l)
                            }));
                          } else {
                            setEditedLocations(prev => ({
                              ...prev,
                              [activeJourneyId]: prev[activeJourneyId].map(l => l.id === loc.id ? { ...l, name: newName, hideLabel: false } : l)
                            }));
                          }
                        }
                      }
                    }}
                    className={`absolute whitespace-nowrap z-20 ${isEditMode ? 'cursor-grab active:cursor-grabbing pointer-events-auto' : 'pointer-events-none'}`}
                    style={{ 
                      left: `${renderX}%`, 
                      top: `${renderY}%`,
                      transform: `translate(-50%, -50%) rotate(${loc.labelRotation || 0}deg)`
                    }}
                  >
                    <div className="bg-[#fdf5e6]/80 text-[#5c3a21] px-2 py-1 rounded shadow-sm backdrop-blur-sm border border-[#d4b483]/50 font-cairo text-xs font-bold transition-colors hover:bg-[#e8d5b5] select-none">
                      {loc.name}
                    </div>
                  </div>
                );
              })}
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
                  className="bg-[#fdf5e6] w-full md:w-[95%] md:max-w-4xl mt-auto md:mt-0 rounded-t-3xl md:rounded-2xl shadow-2xl border-t-4 md:border-4 border-[#d4b483] relative pointer-events-auto flex flex-col md:flex-row overflow-hidden max-h-[85vh] font-cairo"
                  onClick={e => e.stopPropagation()}
                  dir="rtl"
                >
                  {/* Close Button - Floating */}
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full transition-colors z-20 shadow-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Header / Image Area */}
                  {selectedLocation.image ? (
                    <div className="relative w-full md:w-5/12 h-64 md:h-auto bg-[#e8d5b5] flex-shrink-0 flex items-center justify-center p-4">
                      <img 
                        src={selectedLocation.image} 
                        alt={selectedLocation.name} 
                        className="w-full h-full object-contain filter drop-shadow-lg"
                      />
                      {/* Fade for mobile */}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fdf5e6] to-transparent md:hidden" />
                      {/* Fade for desktop (left edge fade out for RTL) */}
                      <div className="hidden md:block absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#fdf5e6] to-transparent" />
                    </div>
                  ) : (
                    <div className="w-full md:w-4 h-12 md:h-auto bg-[#e8d5b5] flex-shrink-0" />
                  )}
                  
                  {/* Content Area */}
                  <div className="px-6 pb-8 pt-4 md:p-10 overflow-y-auto custom-scrollbar flex-1 flex flex-col justify-center">
                    {/* Title */}
                    <div className="flex items-center gap-4 text-[#5c3a21] mb-8 md:mb-10 relative z-10 -mt-8 md:mt-0">
                      <div className="w-14 h-14 md:w-16 md:h-16 bg-[#fdf5e6] rounded-full flex items-center justify-center shadow-lg border-2 border-[#d4b483] flex-shrink-0 text-brand-red font-black text-2xl md:text-3xl">
                        {activeJourney.locations.findIndex(l => l.id === selectedLocation.id) + 1}
                      </div>
                      <h3 className="text-3xl md:text-5xl font-black drop-shadow-sm">{selectedLocation.name}</h3>
                    </div>

                    <div className="space-y-6 md:space-y-8">
                      {/* Companions */}
                      {selectedLocation.companions.length > 0 && (
                        <div className="bg-[#e8d5b5]/30 rounded-2xl p-5 md:p-6 border border-[#d4b483]/50">
                          <div className="flex items-center gap-2 text-[#8b5a2b] font-black text-base md:text-lg mb-4">
                            <Users className="w-6 h-6" />
                            الرفقاء
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {selectedLocation.companions.map(comp => (
                              <span key={comp} className="px-4 py-1.5 md:py-2 bg-[#fdf5e6] text-[#5c3a21] text-sm md:text-base font-bold rounded-xl shadow-sm border border-[#d4b483]">
                                {comp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Events */}
                      <div className="bg-[#e8d5b5]/30 rounded-2xl p-5 md:p-6 border border-[#d4b483]/50">
                        <div className="flex items-center gap-2 text-[#8b5a2b] font-black text-base md:text-lg mb-4">
                          <BookOpen className="w-6 h-6" />
                          الأحداث
                        </div>
                        <p className="text-base md:text-xl font-bold text-[#5c3a21] leading-relaxed md:leading-loose">
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
