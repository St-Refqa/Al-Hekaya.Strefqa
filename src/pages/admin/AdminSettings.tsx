import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Settings, 
  Globe, 
  Shield, 
  Bell, 
  Database,
  Cloud,
  Zap,
  Lock,
  Save,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "security" | "system">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  if (!isAdmin) return null;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-brand-cream p-6 lg:p-12 font-bold text-right" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-3 bg-white rounded-2xl shadow-sm hover:scale-110 transition-transform group">
              <ArrowRight className="w-6 h-6 text-brand-beige group-hover:text-brand-red" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-brand-text tracking-tighter">الإعدادات</h1>
              <p className="text-brand-beige mt-1">تخصيص وتحكم في باراميترات المنصة</p>
            </div>
          </div>

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-8 py-4 bg-brand-red text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-red/10 hover:bg-red-700 transition-all flex items-center gap-2"
          >
            {isSaving ? (
               <Zap className="w-4 h-4 animate-pulse" />
            ) : showSaved ? (
               <CheckCircle className="w-4 h-4" />
            ) : (
               <Save className="w-4 h-4" />
            )}
            {isSaving ? "جاري الحفظ..." : showSaved ? "تم الحفظ!" : "حفظ التغييرات"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 bg-white/50 p-1.5 rounded-[24px] border border-brand-beige/10">
          <TabButton 
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')} 
            icon={<Globe className="w-4 h-4" />}
            label="عام"
          />
          <TabButton 
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')} 
            icon={<Shield className="w-4 h-4" />}
            label="الأمان"
          />
          <TabButton 
            active={activeTab === 'system'} 
            onClick={() => setActiveTab('system')} 
            icon={<Database className="w-4 h-4" />}
            label="النظام"
          />
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-[48px] border border-brand-beige/10 shadow-sm overflow-hidden">
          <div className="p-10 space-y-12">
             <AnimatePresence mode="wait">
                {activeTab === 'general' && (
                  <motion.div 
                    key="general"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                        <Globe className="w-5 h-5 text-brand-red" />
                        هوية المنصة
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SettingField label="اسم الموقع" defaultValue="Intelligence Matrix" />
                        <SettingField label="وصف الموقع" defaultValue="منصة التقييم والتعلم المتقدمة" />
                        <SettingField label="البريد الإلكتروني للدعم" defaultValue="support@matrix.com" />
                        <SettingField label="رابط سياسة الخصوصية" defaultValue="/privacy" />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                        <Bell className="w-5 h-5 text-brand-red" />
                        التنبيهات
                      </h3>
                      <div className="space-y-4">
                        <ToggleSetting label="تفعيل تنبيهات المتصفح للطلاب" defaultChecked />
                        <ToggleSetting label="إرسال تقارير أسبوعية للمدير" defaultChecked />
                        <ToggleSetting label="تنبيه عند تسجيل دخول جديد للمدير" />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div 
                    key="security"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                        <Lock className="w-5 h-5 text-brand-red" />
                        التحكم في الدخول
                      </h3>
                      <div className="space-y-4">
                        <ToggleSetting label="تفعيل الدخول بخطوتين (2FA) للمديرين" defaultChecked />
                        <ToggleSetting label="منع الدخول من أجهزة متعددة لنفس الطالب" defaultChecked />
                        <ToggleSetting label="إجبار الطلاب على تغيير كلمة السر كل 90 يوم" />
                      </div>
                    </div>

                    <div className="p-6 bg-brand-cream/30 rounded-[32px] border border-brand-beige/10 flex flex-row-reverse items-start gap-4">
                      <div className="p-3 bg-white rounded-xl text-brand-red">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <div className="text-right flex-1">
                        <h4 className="font-black text-brand-text">وضع الصيانة</h4>
                        <p className="text-xs text-brand-beige font-bold mt-1 leading-relaxed">
                          عند تفعيل وضع الصيانة، سيتم منع الطلاب من دخول المنصة أو البدء في أي اختبارات. المديرين فقط من يمكنهم الدخول.
                        </p>
                        <button className="mt-4 px-6 py-2 bg-brand-red/10 text-brand-red rounded-lg text-xs font-black uppercase tracking-wider hover:bg-brand-red hover:text-white transition-all">
                          تفعيل الآن
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'system' && (
                  <motion.div 
                    key="system"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-10"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <SystemStat icon={<Cloud className="w-5 h-5" />} label="اتصال قاعدة البيانات" status="متصل" color="text-emerald-500" />
                       <SystemStat icon={<Zap className="w-5 h-5" />} label="سرعة الاستجابة (API)" status="٤٢ مللي ثانية" color="text-brand-red" />
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                        <Database className="w-5 h-5 text-brand-red" />
                        النسخ الاحتياطي
                      </h3>
                      <p className="text-xs text-brand-beige font-bold">يتم إجراء نسخ احتياطي تلقائي كل ٢٤ ساعة لقاعدة البيانات والصور.</p>
                      <div className="flex gap-4 flex-row-reverse">
                        <button className="flex-1 py-4 bg-brand-cream text-brand-text rounded-2xl font-black text-xs hover:bg-white border border-brand-beige/10 transition-all">تحميل آخر نسخة</button>
                        <button className="flex-1 py-4 bg-brand-cream text-brand-text rounded-2xl font-black text-xs hover:bg-white border border-brand-beige/10 transition-all">بدء نسخة يدوية</button>
                      </div>
                    </div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-3 py-4 rounded-[20px] transition-all duration-500",
        active 
          ? "bg-brand-red text-white shadow-xl shadow-brand-red/20 scale-[1.02] z-10" 
          : "text-brand-beige hover:bg-white hover:text-brand-text"
      )}
    >
      {icon}
      <span className="text-xs uppercase tracking-widest font-black">{label}</span>
    </button>
  );
}

function SettingField({ label, defaultValue }: { label: string, defaultValue: string }) {
  return (
    <div className="space-y-3">
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-beige mr-1">{label}</label>
      <input 
        type="text" 
        defaultValue={defaultValue}
        className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold transition-all text-brand-text text-right text-sm"
      />
    </div>
  );
}

function ToggleSetting({ label, defaultChecked = false }: { label: string, defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between p-5 bg-brand-cream/10 rounded-[28px] border border-brand-beige/5 hover:border-brand-beige/20 transition-all group">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
          defaultChecked ? "bg-emerald-500" : "bg-brand-beige/30"
        )}>
          <div className={cn(
            "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300",
            defaultChecked ? "translate-x-6" : "translate-x-0"
          )} />
        </div>
      </div>
      <span className="text-xs font-black text-brand-text group-hover:text-brand-red transition-colors">{label}</span>
    </div>
  );
}

function SystemStat({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: string }) {
  return (
    <div className="p-6 bg-brand-cream/20 rounded-[32px] border border-brand-beige/10 flex items-center justify-between">
      <span className={cn("text-sm font-black", color)}>{status}</span>
      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-[10px] font-black text-brand-beige uppercase tracking-widest">{label}</p>
        </div>
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-red shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}
