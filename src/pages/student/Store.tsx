import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  ShoppingBag, 
  ShoppingCart,
  Star, 
  Zap, 
  Trophy, 
  Search, 
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Sparkles,
  LogIn,
} from "lucide-react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  increment,
  serverTimestamp 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { useAuth } from "../../hooks/useAuth";
import { StoreItem } from "../../types";
import { cn } from "../../lib/utils";
import { SmartImage } from "../../components/ui/SmartImage";
import { useTranslation } from "react-i18next";

export default function Store() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ item: StoreItem; quantity: number } | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "storeItems"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const item = doc.data() as StoreItem;
        const images = item.images || [(item as any).image].filter(Boolean) || [];
        return { id: doc.id, ...item, images } as StoreItem;
      });
      setItems(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "storeItems");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePurchase = (item: StoreItem) => {
    const quantity = quantities[item.id!] || 1;
    setShowConfirm({ item, quantity });
  };

  const executePurchase = async () => {
    if (!user || !showConfirm) return;
    const { item, quantity } = showConfirm;
    const totalPrice = item.price * quantity;
    
    setIsPurchasing(item.id!);
    setShowConfirm(null);
    setMessage(null);

    try {
      // 1. Create Purchase record
      await addDoc(collection(db, "purchases"), {
        userId: user.uid,
        userName: user.fullName,
        itemId: item.id,
        itemTitle: item.title,
        pricePaid: totalPrice,
        quantity: quantity,
        status: 'pending',
        purchaseDate: new Date().toISOString()
      });

      // 2. Update user points
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        totalPoints: increment(-totalPrice)
      });

      // 3. Update stock
      const itemRef = doc(db, "storeItems", item.id!);
      await updateDoc(itemRef, {
        stock: increment(-quantity)
      });

      // 4. Notify Admin
      await addDoc(collection(db, "notifications"), {
        title: "طلب جديد من المتجر",
        message: `الطالب ${user.fullName} طلب شراء ${quantity} من "${item.title}" مقابل إجمالي ${totalPrice} نقطة.`,
        type: 'system',
        targetRole: 'admin',
        createdAt: serverTimestamp(),
        readBy: []
      });

      setMessage({ type: 'success', text: t('store.success_purchase', { item: item.title }) });
    } catch (err) {
      console.error("Purchase error:", err);
      setMessage({ type: 'error', text: t('store.error_purchase') });
    } finally {
      setIsPurchasing(null);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: "all", label: t('store.category_all'), icon: Filter },
    { id: "gift", label: t('store.category_gifts'), icon: Sparkles },
    { id: "workshop", label: t('store.category_workshops'), icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-brand-cream pb-20 px-4 md:px-6 lg:px-12 pt-4 md:pt-8" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header - Refactored for global sidebar */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-12 py-4 md:py-8 lg:py-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-brand-red flex items-center justify-center text-white shadow-lg shadow-brand-red/20 transform -rotate-6 shrink-0">
                <ShoppingBag className="w-5 h-5 md:w-8 md:h-8" />
              </div>
              <div>
                <h1 className="text-xl md:text-4xl font-black text-brand-text tracking-tight">{t('store.title')}</h1>
                <p className="text-brand-beige font-bold text-xs md:text-sm mt-0.5 md:mt-1">{t('store.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 bg-white p-3 md:p-4 rounded-2xl md:rounded-[32px] border border-brand-beige/10 shadow-sm w-fit">
             <div className="flex flex-col items-end">
                <span className="text-[9px] md:text-[10px] font-black text-brand-beige uppercase tracking-widest leading-none mb-1">{t('store.balance')}</span>
                <span className="text-lg md:text-2xl font-black text-brand-text leading-none">{user?.totalPoints || 0} {t('dashboard.points_label')}</span>
             </div>
             <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                <Star className="w-4 h-4 md:w-6 md:h-6 fill-current" />
             </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(null)}
              className="absolute inset-0 bg-brand-text/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[48px] p-10 shadow-2xl text-center border border-brand-cream"
            >
              <div className="w-14 h-14 md:w-20 md:h-20 bg-brand-red/10 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6">
                <ShoppingCart className="w-7 h-7 md:w-10 md:h-10 text-brand-red" />
              </div>
              <h3 className="text-2xl font-black text-brand-text mb-2">{t('store.confirm_title')}</h3>
              <div className="flex items-center justify-center gap-2 mb-4 bg-brand-red/5 py-2 px-4 rounded-full w-fit mx-auto">
                <span className="text-brand-red font-black text-lg">{showConfirm.quantity}</span>
                <span className="text-brand-beige text-xs font-bold">{t('store.units')}</span>
              </div>
              <p className="text-brand-beige font-bold leading-relaxed mb-8">
                {t('store.confirm_msg', { item: showConfirm.item.title, price: showConfirm.item.price * showConfirm.quantity })}
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setShowConfirm(null)}
                  className="py-4 rounded-[24px] font-black text-brand-beige border-2 border-brand-cream hover:bg-brand-cream transition-all"
                >
                  {t('dashboard.cancel')}
                </button>
                <button
                  onClick={executePurchase}
                  className="py-4 rounded-[24px] font-black text-white bg-brand-red hover:bg-brand-text shadow-lg shadow-brand-red/20 transition-all"
                >
                  {t('store.confirm_title')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6 md:space-y-12">
        {/* Search and Filter */}
        <div className="flex flex-col lg:flex-row items-center gap-4 md:gap-6">
          <div className="relative w-full lg:w-96">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-brand-beige", i18n.language === 'ar' ? 'right-4 md:right-5' : 'left-4 md:left-5')} />
            <input 
              type="text"
              placeholder={t('store.search_placeholder')}
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "w-full bg-white border border-brand-beige/10 rounded-2xl md:rounded-[24px] py-3 md:py-4 outline-none focus:border-brand-red/20 transition-all font-bold text-brand-text text-sm md:text-base",
                i18n.language === 'ar' ? 'pr-11 md:pr-14 pl-5 md:pl-6' : 'pl-11 md:pl-14 pr-5 md:pr-6'
              )}
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 w-full lg:w-auto hide-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  "px-4 py-2.5 md:px-6 md:py-4 rounded-xl md:rounded-[20px] font-black text-xs md:text-sm whitespace-nowrap transition-all flex items-center gap-2 md:gap-3 border",
                  categoryFilter === cat.id 
                    ? "bg-brand-red text-white border-brand-red shadow-lg shadow-brand-red/20" 
                    : "bg-white text-brand-beige border-brand-beige/10 hover:border-brand-red/20"
                )}
              >
                <cat.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message HUD */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "p-6 rounded-[32px] flex items-center gap-4 shadow-xl border",
                message.type === 'success' 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : "bg-rose-50 text-rose-700 border-rose-100"
              )}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              <p className="font-black text-lg">{message.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-96 bg-white animate-pulse rounded-[40px] border border-brand-beige/5" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-32 text-center space-y-4">
            <div className="w-14 h-14 md:w-20 md:h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto text-brand-beige">
              <ShoppingBag className="w-7 h-7 md:w-10 md:h-10" />
            </div>
            <h3 className="text-2xl font-black text-brand-text">{t('assessments.no_results')}</h3>
            <p className="text-brand-beige font-bold">{t('assessments.no_results_subtitle')}</p>
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8", i18n.language === 'ar' ? 'text-right' : 'text-left')}>
            {filteredItems.map((item, idx) => (
              <StoreItemCard 
                key={item.id} 
                item={item} 
                idx={idx} 
                onPurchase={handlePurchase}
                isPurchasing={isPurchasing === item.id}
                userPoints={user?.totalPoints || 0}
                quantity={quantities[item.id!] || 1}
                setQuantity={(q) => setQuantities(prev => ({ ...prev, [item.id!]: q }))}
              />
            ))}
          </div>
        )}


        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mt-6 md:mt-12">
            <div className="bg-brand-red/5 p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-red/10 flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-brand-red text-white flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                    <h4 className="font-black text-base md:text-xl text-brand-text mb-0.5 md:mb-1">{t('store.info_points_title')}</h4>
                    <p className="text-brand-beige text-[11px] md:text-xs font-bold leading-relaxed">{t('store.info_points_desc')}</p>
                </div>
            </div>
            <div className="bg-[#DFC69D]/10 p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-[#DFC69D]/20 flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-[#9E8255] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                    <h4 className="font-black text-base md:text-xl text-brand-text mb-0.5 md:mb-1">{t('store.info_gifts_title')}</h4>
                    <p className="text-brand-beige text-[11px] md:text-xs font-bold leading-relaxed">{t('store.info_gifts_desc')}</p>
                </div>
            </div>
            <div className="bg-brand-text/5 p-5 md:p-8 rounded-3xl md:rounded-[40px] border border-brand-text/10 flex items-center gap-4 md:gap-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-brand-text text-white flex items-center justify-center shrink-0">
                    <Trophy className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <div>
                    <h4 className="font-black text-base md:text-xl text-brand-text mb-0.5 md:mb-1">{t('store.info_challenge_title')}</h4>
                    <p className="text-brand-beige text-[11px] md:text-xs font-bold leading-relaxed">{t('store.info_challenge_desc')}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function StoreItemCard({ 
  item, 
  idx, 
  onPurchase, 
  isPurchasing, 
  userPoints,
  quantity,
  setQuantity
}: { 
  item: StoreItem; 
  idx: number; 
  onPurchase: (item: StoreItem) => void;
  isPurchasing: boolean;
  userPoints: number;
  quantity: number;
  setQuantity: (q: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const hasMultipleImages = item.images && item.images.length > 1;

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity < item.stock) setQuantity(quantity + 1);
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const totalPrice = item.price * quantity;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group bg-white p-2 rounded-2xl md:rounded-[36px] border border-brand-beige/10 shadow-sm hover:shadow-2xl hover:shadow-brand-red/5 transition-all flex flex-col relative overflow-hidden"
    >
      {/* Subtle Gradient Overlay on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.03] via-transparent to-brand-cream/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <div className="relative h-32 sm:h-48 md:h-56 rounded-xl md:rounded-[32px] overflow-hidden bg-brand-cream mb-4 md:mb-6 z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImgIdx}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            <SmartImage 
              src={item.images?.[currentImgIdx] || (item as any).image} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              alt={item.title}
            />
          </motion.div>
        </AnimatePresence>

        {/* Image Controls */}
        {hasMultipleImages && (
          <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImgIdx(prev => (prev === 0 ? item.images!.length - 1 : prev - 1));
              }}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-brand-text shadow-xl hover:bg-brand-red hover:text-white transition-all transform hover:scale-110"
            >
              <ChevronRight className={cn("w-5 h-5", i18n.language === 'ar' ? 'rotate-180' : '')} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImgIdx(prev => (prev === item.images!.length - 1 ? 0 : prev + 1));
              }}
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-brand-text shadow-xl hover:bg-brand-red hover:text-white transition-all transform hover:scale-110"
            >
              <ChevronRight className={cn("w-5 h-5", i18n.language === 'en' ? '' : 'rotate-180')} />
            </button>
          </div>
        )}

        {/* Image Indicators */}
        {hasMultipleImages && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
            {item.images!.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-300",
                  i === currentImgIdx ? "bg-white w-4" : "bg-white/40"
                )}
              />
            ))}
          </div>
        )}

        <div className={cn("absolute top-4 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm text-xs font-black text-brand-red", i18n.language === 'ar' ? 'right-4' : 'left-4')}>
          {item.category === 'gift' ? t('store.category_gifts') : t('store.category_workshops')}
        </div>
      </div>

      <div className="px-3 pb-3 md:px-8 md:pb-8 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-base md:text-xl font-black text-brand-text mb-1.5 md:mb-2 line-clamp-1">{item.title}</h3>
          <p className="text-brand-beige text-[11px] md:text-xs font-bold leading-relaxed line-clamp-2 min-h-[3rem]">
            {item.description}
          </p>
        </div>

        <div className="mt-4 md:mt-8 pt-4 md:pt-6 border-t border-brand-cream space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-red animate-pulse" />
              <div className="flex flex-col">
                 <span className="text-brand-text font-black text-xl md:text-2xl leading-none">{totalPrice}</span>
                 {quantity > 1 && (
                    <span className="text-[9px] text-brand-beige font-bold leading-none mt-1">({item.price} {t('dashboard.points_label_short')})</span>
                 )}
              </div>
              <span className="text-brand-beige text-[9px] md:text-[10px] font-black uppercase tracking-widest">{t('dashboard.points_label')}</span>
            </div>
            <div className="text-[9px] md:text-[10px] font-black text-brand-beige">
              {t('store.stock', { count: item.stock })}
            </div>
          </div>

          {/* Quantity Selector */}
          {item.stock > 0 && (
            <div className="flex items-center justify-between bg-brand-cream/50 rounded-xl md:rounded-2xl p-1 md:p-1.5 border border-brand-beige/5">
                <button 
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white flex items-center justify-center text-brand-text shadow-sm hover:bg-brand-red hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                >
                  <ArrowRight className={cn("w-3.5 h-3.5 md:w-4 md:h-4", i18n.language === 'ar' ? '' : 'rotate-180')} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-brand-beige uppercase tracking-widest leading-none mb-0.5 md:mb-1">{t('store.quantity')}</span>
                    <span className="text-sm md:text-lg font-black text-brand-text leading-none">{quantity}</span>
                </div>
                <button 
                  onClick={handleIncrement}
                  disabled={quantity >= item.stock}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-white flex items-center justify-center text-brand-text shadow-sm hover:bg-brand-red hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                >
                  <ArrowRight className={cn("w-3.5 h-3.5 md:w-4 md:h-4", i18n.language === 'en' ? '' : 'rotate-180')} />
                </button>
            </div>
          )}

          <button
            onClick={() => onPurchase(item)}
            disabled={isPurchasing || userPoints < totalPrice || item.stock <= 0}
            className={cn(
              "w-full py-3 md:py-4 rounded-xl md:rounded-[24px] font-black transition-all flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm",
              userPoints < totalPrice || item.stock <= 0
                ? "bg-brand-cream text-brand-beige cursor-not-allowed opacity-50"
                : "bg-brand-text text-white hover:bg-brand-red active:scale-95 shadow-lg shadow-brand-text/10"
            )}
          >
            {isPurchasing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : userPoints < totalPrice ? (
              t('store.no_points')
            ) : item.stock <= 0 ? (
              t('store.out_of_stock')
            ) : (
              <>
                <LogIn className={cn("w-4 h-4", i18n.language === 'ar' ? 'rotate-180' : '')} />
                <span>{t('store.buy_now')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
