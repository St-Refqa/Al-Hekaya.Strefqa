const fs = require('fs');

let content = fs.readFileSync('src/components/library/PaulJourneysMap.tsx', 'utf8');

// 1. Add useAuth import
if (!content.includes("import { useAuth }")) {
  content = content.replace(
    "import { cn } from '../../lib/utils';",
    "import { cn } from '../../lib/utils';\nimport { useAuth } from '../../hooks/useAuth';"
  );
}

// 2. Add Edit Mode State
if (!content.includes("const [isEditMode")) {
  const stateInjection = `
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedLocations, setEditedLocations] = useState<Record<string, JourneyLocation[]>>({});
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);

  React.useEffect(() => {
    if (!editedLocations[activeJourneyId]) {
      setEditedLocations(prev => ({ ...prev, [activeJourneyId]: activeJourney.locations }));
    }
  }, [activeJourneyId, activeJourney.locations]);

  const currentLocations = isEditMode 
    ? (editedLocations[activeJourneyId] || activeJourney.locations) 
    : activeJourney.locations;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isEditMode || !draggingPoint) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    setEditedLocations(prev => ({
      ...prev,
      [activeJourneyId]: prev[activeJourneyId].map(loc => 
        loc.id === draggingPoint ? { ...loc, x, y } : loc
      )
    }));
  };

  const handlePointerUp = () => setDraggingPoint(null);
`;
  content = content.replace(
    "const activeJourney = journeysData.find(j => j.id === activeJourneyId)!;",
    "const activeJourney = journeysData.find(j => j.id === activeJourneyId)!;" + stateInjection
  );
}

// 3. Update generatePath
content = content.replace(
  "if (activeJourney.locations.length === 0) return '';",
  "if (currentLocations.length === 0) return '';"
);
content = content.replace(
  "return activeJourney.locations.map((loc, index) => {",
  "return currentLocations.map((loc, index) => {"
);

// 4. Update the container to support dragging and update colors "بنانو بنانا" (saturate and contrast)
content = content.replace(
  '<div className="relative bg-[#fdf5e6] flex flex-col w-full h-full overflow-hidden">',
  `<div className="relative bg-[#fdf5e6] flex flex-col w-full h-full overflow-hidden">
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
                  console.log(JSON.stringify(editedLocations, null, 2));
                  alert("تم طباعة الإحداثيات في الـ Console! تقدر تنسخها وتبعتها للمطور.");
                }}
                className="bg-green-600/90 backdrop-blur text-white px-4 py-2 rounded-full font-bold shadow-lg hover:bg-green-700 transition"
              >
                نسخ البيانات
              </button>
            )}
          </div>
        )}`
);

content = content.replace(
  '<div className="w-full h-full overflow-auto touch-pan-x touch-pan-y hide-scrollbar cursor-grab active:cursor-grabbing">',
  '<div className="w-full h-full overflow-auto touch-pan-x touch-pan-y hide-scrollbar cursor-grab active:cursor-grabbing" onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>'
);

content = content.replace(
  /className="absolute inset-0 bg-cover bg-center opacity-100 mix-blend-multiply"/,
  'className="absolute inset-0 bg-cover bg-center opacity-100 mix-blend-multiply saturate-150 contrast-110 sepia-[.15] hue-rotate-[-5deg]"'
);

// 5. Update the markers to map over currentLocations and handle drag
const oldMarkerStart = `{activeJourney.locations.map((loc, index) => (
                <motion.button`;
const newMarkerStart = `{currentLocations.map((loc, index) => (
                <motion.div
                  key={\`\${activeJourney.id}-\${loc.id}\`}
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
                  className={\`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center group z-10 \${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}\`}
                  style={{ left: \`\${loc.x}%\`, top: \`\${loc.y}%\` }}`;

content = content.replace(
  /\{activeJourney\.locations\.map\(\(loc, index\) => \([\s\S]*?onClick=\{.*?\}[\s\S]*?className="absolute w-8 h-8 -translate-x-1\/2 -translate-y-1\/2 flex items-center justify-center group z-10 cursor-pointer"[\s\S]*?style=\{\{ left: `\$\{loc\.x\}%`, top: `\$\{loc\.y\}%` \}\}/,
  newMarkerStart
);

content = content.replace(
  /<div className="relative w-4 h-4 rounded-full border-2 border-transparent group-hover:border-red-600\/80 transition-colors flex items-center justify-center bg-black\/0">/,
  `<div className="relative w-4 h-4 rounded-full border-2 border-transparent group-hover:border-red-600/80 transition-colors flex items-center justify-center bg-black/0">
                    {isEditMode && <div className="absolute inset-0 bg-red-500/40 rounded-full scale-150 animate-pulse pointer-events-none" />}`
);

// Fix closing tags from button to div
content = content.replace(
  /<\/motion\.button>/g,
  "</motion.div>"
);

fs.writeFileSync('src/components/library/PaulJourneysMap.tsx', content);
console.log('Done!');
