import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';
import { 
  BookOpen, FileText, FileSpreadsheet, FileIcon, LinkIcon, 
  Trash2, Plus, Download, ExternalLink, AlertCircle, Edit 
} from 'lucide-react';

interface LibraryItem {
  id: string;
  title: string;
  type: 'pdf' | 'doc' | 'xls' | 'ppt' | 'link';
  section: 'old_testament' | 'new_testament' | 'other' | 'NT' | 'OT' | 'general';
  contentUrl: string; // link or base64
  fileName?: string;
  createdAt: any;
  uploaderId?: string;
  audience?: 'adults' | 'children';
}

export default function Library() {
  const { user, isAdmin } = useAuth();
  const { t } = useTranslation();
  
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [activeSection, setActiveSection] = useState<'old_testament' | 'new_testament' | 'other'>('old_testament');
  const [isUploading, setIsUploading] = useState(false);
  
  // Filters & Modal state
  const [activeAudience, setActiveAudience] = useState<'all' | 'adults' | 'children'>('all');
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<LibraryItem['type']>('pdf');
  const [newItemSection, setNewItemSection] = useState<LibraryItem['section']>('old_testament');
  const [newItemUrl, setNewItemUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newItemAudience, setNewItemAudience] = useState<LibraryItem['audience']>('adults');

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setNewItemTitle('');
    setNewItemSection('old_testament');
    setNewItemType('pdf');
    setNewItemUrl('');
    setSelectedFile(null);
    setNewItemAudience('adults');
  };

  const handleNewItemClick = () => {
    setEditingItem(null);
    setNewItemTitle('');
    setNewItemSection('old_testament');
    setNewItemType('pdf');
    setNewItemUrl('');
    setSelectedFile(null);
    setNewItemAudience('adults');
    setIsModalOpen(true);
  };

  const handleEdit = (item: LibraryItem) => {
    setEditingItem(item);
    setNewItemTitle(item.title);
    setNewItemSection(item.section);
    setNewItemType(item.type);
    setNewItemUrl(item.type === 'link' ? item.contentUrl : '');
    setNewItemAudience(item.audience || 'adults');
    setSelectedFile(null);
    setIsModalOpen(true);
  };

  const isLibraryManager = isAdmin || user?.isLibraryManager === true;

  // The active section effect was removed here because it's now initialized lazily in useState.

  useEffect(() => {
    const q = query(collection(db, 'library'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => {
        const data = doc.data();
        const titleRaw = data.title || '';
        const parts = titleRaw.split(' || ');
        const title = parts[0];
        const audience = parts[1] || 'adults';
        return {
          id: doc.id,
          ...data,
          title,
          audience
        } as LibraryItem;
      });
      setItems(itemsData);
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Size limit (3MB to be safe for firestore string limit although technically 1MB is limit, we will warn)
      if (file.size > 800 * 1024) {
        alert("حجم الملف كبير جداً، الحد الأقصى هو 800 كيلوبايت. يرجى استخدام (رابط خارجي) للملفات الأكبر.");
        return;
      }
      setSelectedFile(file);
      
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') setNewItemType('pdf');
      else if (['doc', 'docx'].includes(ext || '')) setNewItemType('doc');
      else if (['xls', 'xlsx', 'csv'].includes(ext || '')) setNewItemType('xls');
      else if (['ppt', 'pptx'].includes(ext || '')) setNewItemType('ppt');
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle) return;
    
    setIsUploading(true);
    let finalUrl = newItemUrl;
    let fileName = editingItem ? (editingItem.fileName || '') : '';

    try {
      if (newItemType !== 'link' && selectedFile) {
        // Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(selectedFile);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
        finalUrl = base64;
        fileName = selectedFile.name;
      } else if (editingItem && newItemType !== 'link' && !selectedFile) {
        // Keep existing file URL and name
        finalUrl = editingItem.contentUrl;
        fileName = editingItem.fileName || '';
      }

      const rawTitle = newItemTitle + (newItemAudience ? ` || ${newItemAudience}` : ' || adults');
      const itemData: any = {
        title: rawTitle,
        type: newItemType,
        section: newItemSection,
        contentUrl: finalUrl,
        fileName: fileName || '',
      };

      if (editingItem) {
        await updateDoc(doc(db, 'library', editingItem.id), itemData);
      } else {
        itemData.createdAt = serverTimestamp();
        itemData.uploaderId = user?.uid || 'unknown';
        await addDoc(collection(db, 'library'), itemData);
      }

      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الملف!');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الملف؟')) {
      await deleteDoc(doc(db, 'library', id));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xls': return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'ppt': return <FileIcon className="w-8 h-8 text-orange-500" />;
      case 'link': return <LinkIcon className="w-8 h-8 text-purple-500" />;
      default: return <FileIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const filteredItems = items.filter(item => {
    // Map old section keys to new ones so existing files aren't lost
    let itemSection = item.section as string;
    if (itemSection === 'OT') itemSection = 'old_testament';
    else if (itemSection === 'NT') itemSection = 'new_testament';
    else if (itemSection === 'general') itemSection = 'other';
    
    if (itemSection !== activeSection) return false;

    const itemAudience = item.audience || 'adults';
    if (activeAudience === 'adults') {
      return itemAudience === 'adults';
    }
    if (activeAudience === 'children') {
      return itemAudience === 'children';
    }

    return true; // if activeAudience === 'all', show everything
  });

  return (
    <div className="p-4 sm:p-6 lg:p-10 bg-brand-cream min-h-screen text-[#1C0606] max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 sm:p-8 rounded-[32px] border border-brand-beige/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-brand-red text-white rounded-2xl shadow-md transform -rotate-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-text">المكتبة الكنسية</h1>
            <p className="text-[10px] sm:text-xs text-brand-beige font-black uppercase tracking-widest mt-1">
              أبحاث، كتب، ملفات دراسية
            </p>
          </div>
        </div>

        {isLibraryManager && (
          <button
            onClick={handleNewItemClick}
            className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-black text-sm transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة للمكتبة</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-2xl p-2 shadow-sm justify-end overflow-x-auto gap-2">
        <button 
          onClick={() => setActiveSection('other')}
          className={cn(
            "px-6 py-3 font-black text-sm rounded-xl transition-all",
            activeSection === 'other' ? "bg-brand-red text-white" : "text-brand-text hover:bg-brand-cream"
          )}
        >
          موضوعات أخرى
        </button>
        <button 
          onClick={() => setActiveSection('new_testament')}
          className={cn(
            "px-6 py-3 font-black text-sm rounded-xl transition-all",
            activeSection === 'new_testament' ? "bg-brand-red text-white" : "text-brand-text hover:bg-brand-cream"
          )}
        >
          عهد جديد
        </button>
        <button 
          onClick={() => setActiveSection('old_testament')}
          className={cn(
            "px-6 py-3 font-black text-sm rounded-xl transition-all",
            activeSection === 'old_testament' ? "bg-brand-red text-white" : "text-brand-text hover:bg-brand-cream"
          )}
        >
          عهد قديم
        </button>
      </div>

      {/* Audience Filter */}
      <div className="flex justify-end">
        <div className="flex bg-white rounded-2xl p-1.5 shadow-sm overflow-x-auto gap-1 border border-brand-beige/10">
          <button 
            onClick={() => setActiveAudience('children')}
            className={cn(
              "px-5 py-2 font-black text-xs rounded-xl transition-all flex items-center gap-1.5",
              activeAudience === 'children' ? "bg-brand-red text-white shadow-sm" : "text-brand-text hover:bg-brand-cream"
            )}
          >
            <span>صغيرين 👶</span>
          </button>
          <button 
            onClick={() => setActiveAudience('adults')}
            className={cn(
              "px-5 py-2 font-black text-xs rounded-xl transition-all flex items-center gap-1.5",
              activeAudience === 'adults' ? "bg-brand-red text-white shadow-sm" : "text-brand-text hover:bg-brand-cream"
            )}
          >
            <span>كبار 👨‍🦳</span>
          </button>
          <button 
            onClick={() => setActiveAudience('all')}
            className={cn(
              "px-5 py-2 font-black text-xs rounded-xl transition-all flex items-center gap-1.5",
              activeAudience === 'all' ? "bg-brand-red text-white shadow-sm" : "text-brand-text hover:bg-brand-cream"
            )}
          >
            <span>الكل</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => window.open(item.contentUrl, '_blank')}
            className="bg-white p-6 rounded-[24px] border border-brand-beige/20 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between min-h-[12rem] h-auto group relative cursor-pointer hover:border-brand-red/30"
          >
            <div className="flex justify-between items-start text-right">
              {isLibraryManager && (
                <div className="flex gap-2 relative z-20" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => handleEdit(item)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex bg-gray-50 p-3 rounded-2xl mr-auto">
                {getIcon(item.type)}
              </div>
            </div>
            
            <div className="text-right mt-4 space-y-1">
              <h3 className="font-extrabold text-lg line-clamp-2 text-brand-text group-hover:text-brand-red transition-colors" title={item.title}>{item.title}</h3>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-brand-beige font-semibold">
                  {item.createdAt ? formatDate(item.createdAt) : 'حديث'}
                </p>
                {item.audience && (
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full",
                    item.audience === 'adults' ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-sky-50 text-sky-700 border border-sky-200"
                  )}>
                    {item.audience === 'adults' ? "كبار 👨‍🦳" : "صغيرين 👶"}
                  </span>
                )}
              </div>
            </div>
            


            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 w-full flex justify-center pointer-events-none">
              {item.type === 'link' ? (
                <div className="bg-white/90 backdrop-blur-sm border border-brand-beige shadow-xl flex items-center justify-center gap-2 px-6 py-3 rounded-full text-brand-text font-black scale-95 group-hover:scale-100 transition-transform">
                  <span>فتح الرابط</span>
                  <LinkIcon className="w-4 h-4 text-brand-red" />
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm border border-brand-beige shadow-xl flex items-center justify-center gap-2 px-6 py-3 rounded-full text-brand-text font-black scale-95 group-hover:scale-100 transition-transform">
                  <span>تحميل الملف</span>
                  <Download className="w-4 h-4 text-brand-red" />
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {filteredItems.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center justify-center opacity-50">
            <BookOpen className="w-16 h-16 mb-4 text-brand-beige" />
            <h3 className="font-black text-xl text-brand-text">المكتبة فارغة</h3>
            <p className="text-brand-beige mt-2">لم يتم إضافة ملفات في هذا القسم بعد.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form onSubmit={handleAddItem} className="bg-white p-6 sm:p-8 rounded-[32px] w-full max-w-lg shadow-2xl space-y-6 text-right">
            <h2 className="text-2xl font-black text-brand-text">
              {editingItem ? "تعديل ملف" : "إضافة للمكتبة"}
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-brand-beige">عنوان الملف</label>
                <input 
                  type="text" 
                  required
                  value={newItemTitle || ''}
                  onChange={e => setNewItemTitle(e.target.value)}
                  className="w-full bg-brand-cream border-transparent focus:bg-white focus:border-brand-red rounded-xl p-3 border-2 transition-all font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-brand-beige">فئة الملف</label>
                <select 
                  value={newItemSection || ''}
                  onChange={e => setNewItemSection(e.target.value as any)}
                  className="w-full bg-brand-cream border-transparent focus:bg-white focus:border-brand-red rounded-xl p-3 border-2 transition-all font-bold text-right"
                >
                  <option value="old_testament">عهد قديم</option>
                  <option value="new_testament">عهد جديد</option>
                  <option value="other">موضوعات أخرى</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-brand-beige">الفئة العمرية (المستهدف)</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setNewItemAudience('adults')} 
                    className={cn(
                      "p-2 rounded-xl flex-1 font-black text-sm transition-all", 
                      newItemAudience === 'adults' ? "bg-brand-red text-white" : "bg-brand-cream text-brand-text"
                    )}
                  >
                    كبار 👨‍🦳
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setNewItemAudience('children')} 
                    className={cn(
                      "p-2 rounded-xl flex-1 font-black text-sm transition-all", 
                      newItemAudience === 'children' ? "bg-brand-red text-white" : "bg-brand-cream text-brand-text"
                    )}
                  >
                    صغيرين 👶
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-brand-beige">طريقة الإضافة</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewItemType('pdf')} className={cn("p-2 rounded-xl flex-1 font-black text-sm transition-all", newItemType !== 'link' ? "bg-brand-red text-white" : "bg-brand-cream text-brand-text")}>رفع ملف مباشر</button>
                  <button type="button" onClick={() => setNewItemType('link')} className={cn("p-2 rounded-xl flex-1 font-black text-sm transition-all", newItemType === 'link' ? "bg-purple-600 text-white" : "bg-brand-cream text-brand-text")}>رابط خارجي (Drive)</button>
                </div>
              </div>

              {newItemType === 'link' ? (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-brand-beige">إرفاق الرابط</label>
                  <input 
                    type="url" 
                    required
                    value={newItemUrl || ''}
                    onChange={e => setNewItemUrl(e.target.value)}
                    className="w-full bg-brand-cream border-transparent focus:bg-white focus:border-purple-500 rounded-xl p-3 border-2 transition-all font-sans text-left"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-brand-beige">اختيار الملف</label>
                  <input 
                    type="file" 
                    required={!editingItem}
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx"
                    className="w-full bg-brand-cream border-transparent rounded-xl p-3 border-2 font-bold focus:border-brand-red"
                  />
                  <div className="flex gap-1.5 items-center text-rose-600 text-[10px] font-bold mt-2">
                    <AlertCircle className="w-3 h-3" />
                    <span>لضمان عدم توقف النظام أقصى مساحة 800 كيلوبايت. للملفات الأكبر الأفضل استخدام (رابط خارجي) بوضعها على Google Drive أو OneDrive وإضافة الرابط هنا لسهولة التحميل السريع! 💡</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-brand-beige/10">
              <button 
                type="submit" 
                disabled={isUploading || (!selectedFile && newItemType !== 'link' && !editingItem)}
                className="flex-1 bg-brand-red text-white rounded-xl py-3 font-black shadow-md hover:bg-red-700 disabled:opacity-50 transition-all font-bold"
              >
                {isUploading ? "جاري الحفظ..." : "حفظ"}
              </button>
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="bg-brand-cream text-brand-text rounded-xl py-3 px-6 font-black hover:bg-brand-beige/20 transition-all font-bold"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
