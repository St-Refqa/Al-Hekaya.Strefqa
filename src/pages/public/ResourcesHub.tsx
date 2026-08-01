import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Image as ImageIcon, ChevronRight, Download, BookOpen, Search, ArrowRight, X } from 'lucide-react';
import { SmartImage } from '../../components/ui/SmartImage';
import { useTranslation } from 'react-i18next';

export default function ResourcesHub() {
  const [view, setView] = useState<'main' | 'workshops'>('main');
  const [workshopImages, setWorkshopImages] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // Fetch the generated index of workshop files
    fetch('/workshops/index.json')
      .then(res => res.json())
      .then(data => setWorkshopImages(data))
      .catch(err => console.error("Failed to load workshop index", err));
  }, []);

  const filteredImages = workshopImages.filter(img => 
    img.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-brand-cream pb-20 text-[#1C0606] font-sans selection:bg-brand-red/20 selection:text-brand-red">
      
      {/* Sleek Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-brand-beige/10 sticky top-0 z-50 px-6 py-5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="w-10 h-10 bg-brand-red/5 rounded-full flex items-center justify-center">
            <SmartImage src="/assets/logo-red.png" className="w-6 h-6 object-contain" alt="" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-black text-brand-text tracking-tight">موارد الحكاية</h1>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-red mt-0.5">Resources Hub</p>
          </div>
          <div className="w-10 h-10">
            {view === 'workshops' && (
              <button 
                onClick={() => setView('main')}
                className="w-full h-full bg-brand-cream hover:bg-brand-beige/20 text-brand-text rounded-full flex items-center justify-center transition-colors"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          {view === 'main' ? (
            <motion.div
              key="main"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="text-right space-y-2 mb-10">
                <h2 className="text-3xl font-black text-brand-text">أهلاً بك! 👋</h2>
                <p className="text-brand-beige font-semibold">تصفح المكتبة أو حمل حلول الورش التفاعلية بسهولة.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Folder 1: Workshops */}
                <button 
                  onClick={() => setView('workshops')}
                  className="bg-white p-8 rounded-[32px] border border-brand-beige/20 shadow-sm hover:shadow-xl hover:border-brand-red/30 transition-all group flex flex-col items-center text-center gap-6 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 to-sky-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <Folder className="w-10 h-10" fill="currentColor" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-brand-text group-hover:text-blue-600 transition-colors">حلول الورش</h3>
                    <p className="text-brand-beige text-sm font-bold">{workshopImages.length} ملف متوفر</p>
                  </div>
                </button>

                {/* Folder 2: Library */}
                <button 
                  onClick={() => navigate('/library')}
                  className="bg-white p-8 rounded-[32px] border border-brand-beige/20 shadow-sm hover:shadow-xl hover:border-brand-red/30 transition-all group flex flex-col items-center text-center gap-6 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                  
                  <div className="w-24 h-24 bg-gradient-to-tr from-rose-100 to-brand-red/10 text-brand-red rounded-3xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                    <BookOpen className="w-10 h-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-brand-text group-hover:text-brand-red transition-colors">المكتبة الكنسية</h3>
                    <p className="text-brand-beige text-sm font-bold">أبحاث، كتب، ملفات دراسية</p>
                  </div>
                </button>

              </div>
            </motion.div>
          ) : (
            <motion.div
              key="workshops"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right">
                <div>
                  <h2 className="text-3xl font-black text-brand-text">حلول الورش 🎨</h2>
                  <p className="text-brand-beige font-semibold mt-1">اضغط على أي صورة لعرضها أو تحميلها</p>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-brand-beige" />
                  </div>
                  <input 
                    type="text"
                    placeholder="ابحث باسم الورشة..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 bg-white border border-brand-beige/20 rounded-2xl py-3 pr-12 pl-4 font-bold text-sm focus:border-brand-red outline-none shadow-sm transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredImages.map((img, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-3xl p-3 border border-brand-beige/10 shadow-sm hover:shadow-xl hover:border-brand-red/30 transition-all group flex flex-col w-full text-right"
                  >
                    <div className="w-full aspect-square rounded-2xl bg-brand-cream/50 overflow-hidden relative shadow-inner">
                      <img 
                        src={`/workshops/${img}`} 
                        alt={img} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md border border-white/30">
                          <Search className="w-5 h-5" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-center px-1">
                      <p className="text-[11px] font-black text-brand-text truncate" dir="auto">
                        {img.replace(/\.[^/.]+$/, "")}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              {filteredImages.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <ImageIcon className="w-16 h-16 text-brand-beige mx-auto mb-4" />
                  <p className="text-xl font-black text-brand-text">لم يتم العثور على نتائج</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-8" onClick={() => setSelectedImage(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-5xl w-full max-h-full flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-end items-center mb-4">
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div 
                className="bg-black/50 rounded-3xl overflow-hidden flex-1 relative flex items-center justify-center shadow-2xl border border-white/10"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img 
                  src={`/workshops/${selectedImage}`} 
                  alt={selectedImage} 
                  className="max-w-full max-h-[80vh] object-contain rounded-xl pointer-events-none select-none"
                  draggable="false"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
