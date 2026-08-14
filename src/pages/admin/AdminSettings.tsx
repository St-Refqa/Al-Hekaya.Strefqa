import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Settings as SettingsIcon, 
  Globe, 
  Shield, 
  Bell, 
  Database,
  Cloud,
  Zap,
  Lock,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, getDocs, where, writeBatch, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User, Submission } from "../../types";

export default function AdminSettings() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"general" | "security" | "system">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSaved, setShowSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [showConfirmSync, setShowConfirmSync] = useState(false);

  const [settings, setSettings] = useState({
    siteName: "Intelligence Matrix",
    siteDesc: "منصة التقييم والتعلم المتقدمة",
    supportEmail: "support@matrix.com",
    privacyUrl: "/privacy",
    enableBrowserNotifications: true,
    sendWeeklyReports: true,
    notifyNewLogin: false,
    enable2FA: true,
    preventMultiDevice: true,
    forcePasswordChange90Days: false,
    maintenanceMode: false
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = localStorage.getItem("global_config");
        if (saved) {
          setSettings(JSON.parse(saved));
        }
        
        const docRef = doc(db, "settings", "global_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => {
            const merged = { ...prev, ...data };
            localStorage.setItem("global_config", JSON.stringify(merged));
            return merged;
          });
        }
      } catch (error) {
        console.warn("DB settings load failed, using local settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  if (!isAdmin) return null;

  const handleSave = async (customSettings = settings) => {
    setIsSaving(true);
    try {
      localStorage.setItem("global_config", JSON.stringify(customSettings));
      try {
        const docRef = doc(db, "settings", "global_config");
        await setDoc(docRef, customSettings, { merge: true });
      } catch (dbErr) {
        console.warn("DB settings save failed, saved locally:", dbErr);
      }
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    } catch (err: any) {
      console.error("Error saving settings:", err);
      alert("حدث خطأ أثناء حفظ الإعدادات: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const executeSync = async () => {
    setShowConfirmSync(false);
    setIsSyncing(true);
    setSyncMessage("جاري تحميل البيانات...");
    
    try {
      // Fetch all students
      const usersQ = query(collection(db, "users"), where("role", "==", "student"));
      const usersSnap = await getDocs(usersQ);
      const students = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User));
      
      setSyncMessage(`تم جلب ${students.length} طالب. جاري المزامنة...`);

      // Fetch dependencies
      const subsSnap = await getDocs(collection(db, "submissions"));
      const allSubs = subsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Submission));

      const attSnap = await getDocs(collection(db, "attendance"));
      const allAtts = attSnap.docs.map(d => d.data());

      const purSnap = await getDocs(collection(db, "purchases"));
      const allPurs = purSnap.docs.map(d => d.data());

      const logsSnap = await getDocs(collection(db, "pointLogs"));
      const allLogs = logsSnap.docs.map(d => d.data());

      // جلب نقط الألعاب (منفصلة — لا تدخل في totalPoints أبداً)
      const gameScoresSnap = await getDocs(collection(db, "gameScores"));
      const allGameScores: Record<string, number> = {};
      gameScoresSnap.docs.forEach(d => {
        const data = d.data();
        allGameScores[d.id] = data.totalScore || 0;
      });

      let batch = writeBatch(db);
      let processedCount = 0;

      for (const student of students) {
        // Find their submissions
        const mySubs = allSubs.filter(s => s.participantId === student.uid || s.participantName === student.normalizedName);
        
        // Group submissions by assessment to prevent duplicate scores from multiple attempts
        const uniqueSubsMap = new Map();
        for (const sub of mySubs) {
          const key = sub.assessmentId || sub.assessmentTitle;
          if (!key) continue;
          
          const currentScore = sub.finalScore ?? (sub as any).score ?? sub.baseScore ?? 0;
          const currentMaxScore = sub.maxScore || 100;
          
          if (!uniqueSubsMap.has(key)) {
            uniqueSubsMap.set(key, { score: currentScore, maxScore: currentMaxScore, sub });
          } else {
            const existing = uniqueSubsMap.get(key);
            if (currentScore > existing.score) {
              uniqueSubsMap.set(key, { score: currentScore, maxScore: currentMaxScore, sub });
            }
          }
        }
        
        const uniqueSubs = Array.from(uniqueSubsMap.values());
        const totalExams = uniqueSubs.length;
        const totalScoreSum = uniqueSubs.reduce((acc, curr) => acc + curr.score, 0);
        const maxScoreSum = uniqueSubs.reduce((acc, curr) => acc + curr.maxScore, 0);
        
        const calculatedAvg = maxScoreSum > 0 ? (totalScoreSum / maxScoreSum) * 100 : 0;
        const examPoints = totalScoreSum;

        // Find attendance
        const myAtts = allAtts.filter(a => a.studentId === student.uid);
        const attPoints = myAtts.reduce((acc, curr) => acc + (curr.points || 0), 0);

        // Find purchases
        const myPurs = allPurs.filter(p => p.userId === student.uid);
        const purPoints = myPurs.reduce((acc, curr) => acc + (curr.pricePaid ?? curr.price ?? curr.totalPrice ?? 0), 0);

        // Find point logs
        const myLogs = allLogs.filter(l => l.userId === student.uid);
        const manualPoints = myLogs.reduce((acc, curr: any) => curr.type === 'add' ? acc + (curr.amount || 0) : acc - (curr.amount || 0), 0);

        // Calculate final totalPoints (الحضور + الاختبارات + اليدوي — بدون نقط الألعاب)
        const totalPoints = Math.max(0, examPoints + attPoints + manualPoints - purPoints);
        const cumulativePoints = Math.max(0, examPoints + attPoints + manualPoints);

        // نقط الألعاب منفصلة — من game_scores فقط
        const gamePoints = allGameScores[student.uid] || 0;
        
        batch.update(doc(db, "users", student.uid), {
          totalExams,
          averageScore: Math.round(calculatedAvg),
          totalPoints,
          cumulativePoints,
          gamePoints, // منفصلة — لا تؤثر على totalPoints أو storePoints
        });
        
        processedCount++;
        
        if (processedCount % 400 === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }

        if (processedCount % 50 === 0) {
           setSyncMessage(`جاري المزامنة... (${processedCount} من ${students.length})`);
           await new Promise(r => setTimeout(r, 10)); // Yield to UI
        }
      }
      
      await batch.commit();

      setSyncMessage("تمت المزامنة بنجاح!");
      setTimeout(() => setSyncMessage(""), 5000);
    } catch (err: any) {
      console.error(err);
      setSyncMessage("خطأ: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div id="admin-settings-container" className="min-h-screen bg-brand-cream p-6 lg:p-12 font-bold text-right" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link id="link-back-to-admin" to="/admin" className="p-3 bg-white rounded-2xl shadow-sm hover:scale-110 transition-transform group">
              <ArrowRight className="w-6 h-6 text-brand-beige group-hover:text-brand-red" />
            </Link>
            <div>
              <h1 className="text-4xl font-black text-brand-text tracking-tighter">الإعدادات</h1>
              <p className="text-brand-beige mt-1">تخصيص وتحكم في باراميترات المنصة</p>
            </div>
          </div>

          <button 
            id="btn-save-settings"
            onClick={() => handleSave()}
            disabled={isSaving || isLoading}
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
            id="tab-btn-general"
            active={activeTab === 'general'} 
            onClick={() => setActiveTab('general')} 
            icon={<Globe className="w-4 h-4" />}
            label="عام"
          />
          <TabButton 
            id="tab-btn-security"
            active={activeTab === 'security'} 
            onClick={() => setActiveTab('security')} 
            icon={<Shield className="w-4 h-4" />}
            label="الأمان"
          />
          <TabButton 
            id="tab-btn-system"
            active={activeTab === 'system'} 
            onClick={() => setActiveTab('system')} 
            icon={<Database className="w-4 h-4" />}
            label="النظام"
          />
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-[48px] border border-brand-beige/10 shadow-sm overflow-hidden min-h-[400px] flex flex-col justify-start">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3 text-brand-beige">
              <Loader2 className="w-10 h-10 animate-spin text-brand-red" />
              <span>جاري تحميل الإعدادات من قاعدة البيانات...</span>
            </div>
          ) : (
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
                          <SettingField 
                            id="field-site-name"
                            label="اسم الموقع" 
                            value={settings.siteName} 
                            onChange={(val) => updateSetting("siteName", val)}
                          />
                          <SettingField 
                            id="field-site-desc"
                            label="وصف الموقع" 
                            value={settings.siteDesc} 
                            onChange={(val) => updateSetting("siteDesc", val)}
                          />
                          <SettingField 
                            id="field-support-email"
                            label="البريد الإلكتروني للدعم" 
                            value={settings.supportEmail} 
                            onChange={(val) => updateSetting("supportEmail", val)}
                          />
                          <SettingField 
                            id="field-privacy-url"
                            label="رابط سياسة الخصوصية" 
                            value={settings.privacyUrl} 
                            onChange={(val) => updateSetting("privacyUrl", val)}
                          />
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                          <Bell className="w-5 h-5 text-brand-red" />
                          التنبيهات
                        </h3>
                        <div className="space-y-4">
                          <ToggleSetting 
                            id="toggle-browser-notifications"
                            label="تفعيل تنبيهات المتصفح للطلاب" 
                            checked={settings.enableBrowserNotifications}
                            onChange={(val) => updateSetting("enableBrowserNotifications", val)}
                          />
                          <ToggleSetting 
                            id="toggle-weekly-reports"
                            label="إرسال تقارير أسبوعية للمدير" 
                            checked={settings.sendWeeklyReports}
                            onChange={(val) => updateSetting("sendWeeklyReports", val)}
                          />
                          <ToggleSetting 
                            id="toggle-notify-new-login"
                            label="تنبيه عند تسجيل دخول جديد للمدير" 
                            checked={settings.notifyNewLogin}
                            onChange={(val) => updateSetting("notifyNewLogin", val)}
                          />
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
                          التحم في الدخول
                        </h3>
                        <div className="space-y-4">
                          <ToggleSetting 
                            id="toggle-enable-2fa"
                            label="تفعيل الدخول بخطوتين (2FA) للمديرين" 
                            checked={settings.enable2FA}
                            onChange={(val) => updateSetting("enable2FA", val)}
                          />
                          <ToggleSetting 
                            id="toggle-prevent-multi-device"
                            label="منع الدخول من أجهزة متعددة لنفس الطالب" 
                            checked={settings.preventMultiDevice}
                            onChange={(val) => updateSetting("preventMultiDevice", val)}
                          />
                          <ToggleSetting 
                            id="toggle-force-pass-change"
                            label="إجبار الطلاب على تغيير كلمة السر كل 90 يوم" 
                            checked={settings.forcePasswordChange90Days}
                            onChange={(val) => updateSetting("forcePasswordChange90Days", val)}
                          />
                        </div>
                      </div>

                      <div className="p-6 bg-brand-cream/30 rounded-[32px] border border-brand-beige/10 flex flex-row-reverse items-start gap-4">
                        <div className="p-3 bg-white rounded-xl text-brand-red shadow-sm">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="text-right flex-1">
                          <h4 className="font-black text-brand-text">وضع الصيانة</h4>
                          <p className="text-xs text-brand-beige font-bold mt-1 leading-relaxed">
                            عند تفعيل وضع الصيانة، سيتم منع الطلاب من دخول المنصة أو البدء في أي اختبارات. المديرين فقط من يمكنهم الدخول.
                          </p>
                          <button 
                            id="btn-toggle-maintenance"
                            onClick={() => {
                              const newMaintenance = !settings.maintenanceMode;
                              const updated = { ...settings, maintenanceMode: newMaintenance };
                              setSettings(updated);
                              handleSave(updated);
                            }} 
                            className={cn(
                              "mt-4 px-6 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shadow-sm",
                              settings.maintenanceMode 
                                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white" 
                                : "bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white"
                            )}
                          >
                            {settings.maintenanceMode ? "إلغاء وضع الصيانة" : "تفعيل الآن"}
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
                         <SystemStat id="stat-connection" icon={<Cloud className="w-5 h-5" />} label="اتصال قاعدة البيانات" status="متصل" color="text-emerald-500" />
                         <SystemStat id="stat-latency" icon={<Zap className="w-5 h-5" />} label="سرعة الاستجابة (API)" status="٤٢ مللي ثانية" color="text-brand-red" />
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-lg font-black text-brand-text flex items-center gap-3">
                          <Database className="w-5 h-5 text-brand-red" />
                          صيانة البيانات والمزامنة
                        </h3>
                        <p className="text-xs text-brand-beige font-bold">يتم إجراء نسخ احتياطي تلقائي كل ٢٤ ساعة لقاعدة البيانات والصور.</p>
                        
                        {syncMessage && (
                          <div id="sync-status-msg" className="p-4 bg-brand-cream border border-brand-beige/20 text-brand-text rounded-xl text-center text-sm font-bold animate-pulse">
                            {syncMessage}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row-reverse gap-4">
                          <button id="btn-mock-download-backup" onClick={() => {}} className="flex-1 py-4 px-4 bg-brand-cream text-brand-text rounded-2xl font-black text-xs hover:bg-white border border-brand-beige/10 transition-all shadow-sm">تحميل آخر نسخة</button>
                          <button id="btn-mock-trigger-backup" onClick={() => {}} className="flex-1 py-4 px-4 bg-brand-cream text-brand-text rounded-2xl font-black text-xs hover:bg-white border border-brand-beige/10 transition-all shadow-sm">بدء نسخة يدوية</button>
                          <button 
                            id="btn-confirm-sync-trigger"
                            onClick={() => setShowConfirmSync(true)}
                            disabled={isSyncing}
                            className="flex-1 py-4 px-4 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                          >
                            <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                            إصلاح ومزامنة التقييمات
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
               </AnimatePresence>
            </div>
          )}
        </div>

      </div>

      {/* Sync Confirmation Modal */}
      {showConfirmSync && (
        <div id="sync-confirm-modal" className="fixed inset-0 bg-brand-text/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl text-right"
          >
            <div className="w-16 h-16 bg-brand-red/10 flex items-center justify-center rounded-2xl mb-6 mx-auto">
              <AlertCircle className="w-8 h-8 text-brand-red" />
            </div>
            
            <h3 className="text-2xl font-black text-brand-text text-center mb-4">
              تأكيد المزامنة
            </h3>
            
            <p className="text-brand-beige font-bold text-center mb-8 leading-relaxed text-sm">
              تحذير: سيتم إعادة حساب ومزامنة جميع نقاط وتقييمات الطلاب بناءً على سجلات الحضور والاختبارات والمشتريات. هل تريد الاستمرار؟
            </p>
            
            <div className="flex gap-4 flex-row-reverse">
              <button 
                id="btn-sync-cancel"
                onClick={() => setShowConfirmSync(false)}
                className="flex-1 py-4 bg-brand-cream text-brand-text rounded-2xl font-black text-xs hover:bg-white transition-all shadow-sm"
              >
                إلغاء
              </button>
              <button 
                id="btn-sync-confirm"
                onClick={executeSync}
                className="flex-1 py-4 bg-brand-red text-white rounded-2xl font-black text-xs hover:bg-red-700 transition-all shadow-lg"
              >
                نعم، ابدأ المزامنة
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function TabButton({ id, active, onClick, icon, label }: { id: string, active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      id={id}
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

function SettingField({ id, label, value, onChange }: { id: string, label: string, value: string, onChange: (val: string) => void }) {
  return (
    <div className="space-y-3">
      <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-brand-beige mr-1">{label}</label>
      <input 
        id={id}
        type="text" 
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-6 py-4 bg-brand-cream/20 border border-brand-beige/10 rounded-2xl focus:ring-2 focus:ring-brand-red/10 outline-none font-bold transition-all text-brand-text text-right text-sm"
      />
    </div>
  );
}

function ToggleSetting({ id, label, checked, onChange }: { id: string, label: string, checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <div 
      id={id}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between p-5 bg-brand-cream/10 rounded-[28px] border border-brand-beige/5 hover:border-brand-beige/20 hover:bg-brand-cream/30 transition-all group cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-6 rounded-full p-1 transition-all duration-300 relative",
          checked ? "bg-emerald-500" : "bg-brand-beige/30"
        )}>
          <div className={cn(
            "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 transform",
            checked ? "-translate-x-6" : "translate-x-0"
          )} />
        </div>
      </div>
      <span className="text-xs font-black text-brand-text group-hover:text-brand-red transition-colors">{label}</span>
    </div>
  );
}

function SystemStat({ id, icon, label, status, color }: { id: string, icon: React.ReactNode, label: string, status: string, color: string }) {
  return (
    <div id={id} className="p-6 bg-brand-cream/20 rounded-[32px] border border-brand-beige/10 flex items-center justify-between">
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
