import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Image as ImageIcon,
  Tag,
  TrendingUp,
  Package,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { StoreItem } from "../../types";
import { cn } from "../../lib/utils";
import { SmartImage } from "../../components/ui/SmartImage";

export default function StoreManager() {
  const navigate = useNavigate();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [itemToDelete, setItemToDelete] = useState<StoreItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState<Omit<StoreItem, 'id' | 'createdAt'>>({
    title: "",
    description: "",
    price: 0,
    images: [""],
    category: "gift",
    stock: 0,
    status: 'active'
  });

  useEffect(() => {
    const q = query(collection(db, "storeItems"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data() as StoreItem;
        // Migration: convert old 'image' string to 'images' array if needed
        const images = item.images || [(item as any).image].filter(Boolean) || [];
        return { id: doc.id, ...item, images } as StoreItem;
      });
      setItems(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "storeItems");
    });
    return () => unsubscribe();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setNotification({ type: 'error', text: "يرجى اختيار ملفات صور فقط" });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_SIZE = 800; // max width/height to keep size small

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.floor(height * (MAX_SIZE / width));
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.floor(width * (MAX_SIZE / height));
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Compress to JPEG format with 0.7 quality to ensure small base64 string
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            // Check size after compression just in case, though it will almost certainly be under 400KB
            const sizeInBytes = Math.round((compressedBase64.length * 3) / 4);
            if (sizeInBytes > 600 * 1024) {
               setNotification({ type: 'error', text: "الصورة معقدة جداً وحجمها يظل كبيراً، يرجى اختيار صورة أبسط" });
               return;
            }

            setFormData(prev => ({
              ...prev,
              images: [...prev.images.filter(img => img.trim() !== ""), compressedBase64]
            }));
          }
        };
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validImages = formData.images.filter(img => img.trim() !== "");
    if (!formData.title || validImages.length === 0) return;

    try {
      const dataToSave = { ...formData, images: validImages };
      if (isEditing) {
        const itemRef = doc(db, "storeItems", isEditing);
        await updateDoc(itemRef, dataToSave);
        setNotification({ type: 'success', text: "تم تحديث المنتج بنجاح" });
      } else {
        await addDoc(collection(db, "storeItems"), {
          ...dataToSave,
          createdAt: new Date().toISOString()
        });
        setNotification({ type: 'success', text: "تم إضافة المنتج بنجاح" });
      }
      resetForm();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "storeItems");
      setNotification({ type: 'error', text: "حدث خطأ أثناء الحفظ" });
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "storeItems", itemToDelete.id!));
      setNotification({ type: 'success', text: "تم مسح المنتج بنجاح" });
      setItemToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, "storeItems");
      setNotification({ type: 'error', text: "حدث خطأ أثناء المسح" });
    } finally {
      setIsDeleting(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", price: 0, images: [""], category: "gift", stock: 0, status: 'active' });
    setIsEditing(null);
    setIsAdding(false);
    setTimeout(() => setNotification(null), 3000);
  };

  const startEdit = (item: StoreItem) => {
    setFormData({
      title: item.title,
      description: item.description,
      price: item.price || 0,
      images: item.images && item.images.length > 0 ? item.images : [""],
      category: item.category || 'gift',
      stock: item.stock || 0,
      status: item.status || 'active'
    });
    setIsEditing(item.id!);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-brand-cream/30 py-12 px-6 lg:px-24" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <AnimatePresence>
          {itemToDelete && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isDeleting && setItemToDelete(null)}
                className="absolute inset-0 bg-brand-text/60 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-[48px] p-10 shadow-2xl text-center border border-brand-cream"
              >
                <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  {isDeleting ? <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" /> : <Trash2 className="w-10 h-10 text-rose-500" />}
                </div>
                <h3 className="text-2xl font-black text-brand-text mb-4 text-center">هل أنت متأكد؟</h3>
                <p className="text-brand-beige font-bold leading-relaxed mb-8 text-center text-sm">
                  هل أنت متأكد من مسح <span className="text-brand-red">"{itemToDelete.title}"</span> من المتجر؟ لا يمكن التراجع عن هذا الفعل.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setItemToDelete(null)}
                    disabled={isDeleting}
                    className="py-4 rounded-[24px] font-black text-brand-beige border-2 border-brand-cream hover:bg-brand-cream transition-all disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="py-4 rounded-[24px] font-black text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isDeleting && <RefreshCw className="w-4 h-4 animate-spin" />}
                    نعم، امسح
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate(-1)}
              className="p-4 bg-white rounded-2xl shadow-sm hover:scale-105 hover:bg-brand-red hover:text-white transition-all group border border-brand-beige/10"
            >
              <ArrowRight className="w-6 h-6 text-brand-beige group-hover:text-white" />
            </button>
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-brand-text tracking-tighter">إدارة المتجر</h1>
              <p className="text-brand-beige font-bold">تحكم كامل في هدايا وورش عمل المنصة</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all shadow-xl",
              isAdding ? "bg-white text-brand-text border border-brand-beige/10" : "bg-brand-red text-white hover:bg-brand-red/90 shadow-brand-red/20"
            )}
          >
            {isAdding ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span className="text-[10px] uppercase tracking-widest">{isAdding ? "إلغاء العمل" : "إضافة منتج جديد"}</span>
          </button>
        </div>

        {/* Form Section */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-8 lg:p-12 rounded-[48px] border border-brand-beige/10 shadow-xl"
            >
              <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text uppercase tracking-widest block pr-4">اسم المنتج</label>
                    <input
                      type="text"
                      required
                      value={formData.title || ""}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-brand-cream rounded-[24px] px-8 py-5 outline-none border-2 border-transparent focus:border-brand-red/20 transition-all font-bold text-brand-text"
                      placeholder="مثال: كتاب حكايات من الميدان"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text uppercase tracking-widest block pr-4">الوصف</label>
                    <textarea
                      value={formData.description || ""}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-brand-cream rounded-[24px] px-8 py-5 outline-none border-2 border-transparent focus:border-brand-red/20 transition-all font-bold text-brand-text h-32"
                      placeholder="اوصف المنتج في سطرين تلاتة..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-brand-text uppercase tracking-widest block pr-4">السعر (نقط)</label>
                      <input
                        type="number"
                        required
                        value={formData.price || 0}
                        onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) })}
                        className="w-full bg-brand-cream rounded-[24px] px-8 py-5 outline-none border-2 border-transparent focus:border-brand-red/20 transition-all font-black text-brand-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-brand-text uppercase tracking-widest block pr-4">الكمية المتاحة</label>
                      <input
                        type="number"
                        required
                        value={formData.stock || 0}
                        onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                        className="w-full bg-brand-cream rounded-[24px] px-8 py-5 outline-none border-2 border-transparent focus:border-brand-red/20 transition-all font-black text-brand-text"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-brand-text uppercase tracking-widest block pr-4">الفئة</label>
                    <select
                      value={formData.category || 'gift'}
                      onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-brand-cream rounded-[24px] px-8 py-5 outline-none border-2 border-transparent focus:border-brand-red/20 transition-all font-bold text-brand-text appearance-none"
                    >
                      <option value="gift">هدية</option>
                      <option value="workshop">ورشة</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between pr-4">
                      <label className="text-xs font-black text-brand-text uppercase tracking-widest">صور المنتج (مرفقات)</label>
                      <button 
                        type="button"
                        onClick={() => document.getElementById('store-image-upload')?.click()}
                        className="text-[10px] font-black text-brand-red flex items-center gap-1 hover:underline bg-brand-red/5 px-3 py-1 rounded-full"
                      >
                        <Plus className="w-3 h-3" />
                        إرفاق صور
                      </button>
                      <input 
                        id="store-image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.images.filter(img => img.trim() !== "").map((img, idx) => (
                        <div key={idx} className="aspect-square rounded-[24px] overflow-hidden border-2 border-brand-cream relative group shadow-sm bg-brand-cream/30">
                          <SmartImage src={img} className="w-full h-full object-contain transition-transform group-hover:scale-110" alt={`Preview ${idx + 1}`} />
                          
                          <div className="absolute inset-0 bg-brand-text/40 flex flex-col items-center justify-center transition-opacity gap-2 md:opacity-0 md:group-hover:opacity-100 opacity-100">
                             <span className="text-white font-black text-[10px] bg-brand-text/50 px-2 py-0.5 rounded-full">
                               {idx === 0 ? "الصورة الأساسية" : `صورة ${idx + 1}`}
                             </span>
                             <button
                               type="button"
                               onClick={() => setFormData({ ...formData, images: formData.images.filter((_, i) => i !== idx) })}
                               className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 transition-transform"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                        </div>
                      ))}

                      {/* Placeholder for adding more */}
                      <button
                        type="button"
                        onClick={() => document.getElementById('store-image-upload')?.click()}
                        className="aspect-square rounded-[24px] border-2 border-dashed border-brand-beige/20 flex flex-col items-center justify-center text-brand-beige hover:border-brand-red/20 hover:text-brand-red transition-all gap-2"
                      >
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[10px] font-black">أضف صور</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      type="submit"
                      className="flex-1 bg-brand-text text-white py-5 rounded-[24px] font-black text-xl hover:bg-brand-red transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-text/10"
                    >
                      <Save className="w-6 h-6" />
                      <span>{isEditing ? "تعديل المنتج" : "إضافة للمتجر"}</span>
                    </button>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-8 bg-brand-cream text-brand-text rounded-[24px] font-black hover:bg-brand-beige/10 transition-all"
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items List */}
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1">
              <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-beige" />
              <input
                type="text"
                placeholder="ابحث عن منتج..."
                value={searchQuery || ''}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-brand-beige/10 rounded-[28px] px-16 py-5 outline-none focus:border-brand-red/20 font-bold"
              />
            </div>
            
            <div className="flex items-center gap-3 bg-white p-2 rounded-[28px] border border-brand-beige/10">
              {["all", "gift", "workshop"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "px-6 py-3 rounded-2xl text-xs font-black transition-all",
                    categoryFilter === cat ? "bg-brand-text text-white" : "text-brand-beige hover:bg-brand-cream"
                  )}
                >
                  {cat === 'all' ? "الكل" : 
                   cat === 'gift' ? "هدية" : "ورشة"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredItems.map(item => (
              <motion.div
                layout
                key={item.id}
                className="bg-white p-4 rounded-[40px] border border-brand-beige/5 shadow-sm hover:shadow-2xl hover:shadow-brand-red/5 transition-all group relative"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-50 p-2">
                  <SmartImage src={item.images?.[0] || (item as any).image} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700" alt={item.title} />
                  
                  <div className="absolute inset-0 bg-black/20 transition-opacity md:opacity-0 md:group-hover:opacity-100" />
                  
                  {item.images && item.images.length > 1 && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2 border border-white/10">
                      <ImageIcon className="w-3 h-3 text-white" />
                      <span className="text-[10px] font-black text-white">{item.images.length}</span>
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4 flex gap-2 transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 md:translate-y-[-10px] md:group-hover:translate-y-0 opacity-100 translate-y-0">
                    <button 
                      onClick={() => startEdit(item)}
                      className="w-10 h-10 rounded-xl bg-white shadow-xl flex items-center justify-center text-brand-text hover:bg-brand-red hover:text-white transition-all transform hover:scale-110"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      className="w-10 h-10 rounded-xl bg-white shadow-xl flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all transform hover:scale-110"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-black text-brand-text text-lg leading-tight line-clamp-1">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border",
                          item.category === 'workshop' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          {item.category === 'gift' ? "هدية" : "ورشة"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-brand-cream/50">
                    <div className="flex items-center gap-2 text-brand-red">
                       <TrendingUp className="w-4 h-4" />
                       <span className="font-black text-2xl tracking-tighter">{item.price}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest">الكمية</span>
                      <span className="font-black text-sm text-brand-text">{item.stock}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* Persistence Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn(
              "fixed bottom-12 right-12 p-6 rounded-[32px] shadow-2xl border z-[200] flex items-center gap-4",
              notification.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"
            )}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
            <span className="font-black text-lg">{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
