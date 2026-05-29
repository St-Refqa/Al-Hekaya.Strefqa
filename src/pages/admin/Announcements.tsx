import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Bell, Plus, Trash2, Megaphone, Search, Users } from 'lucide-react';
import { formatDate } from '../../lib/utils';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info'); // info, warning, success
  
  // Targeting States
  const [targetType, setTargetType] = useState<'all' | 'OT' | 'NT' | 'servant' | 'admin' | 'specific'>('all');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userSearchText, setUserSearchText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });

    return () => {
      unsub();
      unsubUsers();
    };
  }, []);

  const filteredUsers = useMemo(() => {
    if (!userSearchText) return [];
    return users.filter(u => 
      u.fullName?.toLowerCase().includes(userSearchText.toLowerCase()) || 
      u.code?.toLowerCase().includes(userSearchText.toLowerCase())
    ).slice(0, 5);
  }, [users, userSearchText]);

  const handleCreate = async () => {
    if (!title || !message) return;
    if (targetType === 'specific' && !selectedUser) {
      alert("من فضلك اختر الطالب أو الخادم أولاً!");
      return;
    }

    const docData: any = {
      title,
      message,
      type,
      createdAt: serverTimestamp()
    };

    if (targetType === 'specific') {
      docData.targetId = selectedUser.uid;
      docData.targetGroups = [];
    } else {
      docData.targetGroups = [targetType];
      docData.targetId = null;
    }

    await addDoc(collection(db, 'notifications'), docData);
    
    setTitle('');
    setMessage('');
    setSelectedUser(null);
    setUserSearchText('');
    setTargetType('all');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("حذف الإشعار؟")) return;
    await deleteDoc(doc(db, 'notifications', id));
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8" dir="rtl">
      <div className="flex items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-12 h-12 rounded-2xl bg-brand-red flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-black text-brand-text">نظام الإشعارات</h1>
      </div>
      
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-xl font-bold mb-4 text-brand-text">نشر إشعار جديد للطلاب</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <input className="w-full p-4 border border-gray-200 rounded-xl" placeholder="عنوان الإشعار..." value={title} onChange={e => setTitle(e.target.value)} />
          <select className="w-full p-4 border border-gray-200 rounded-xl" value={type} onChange={e => setType(e.target.value)}>
            <option value="info">معلومة عامة (أزرق)</option>
            <option value="success">نجاح / إنجاز (أخضر)</option>
            <option value="warning">تنبيه هام (أحمر)</option>
          </select>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-sm font-bold text-brand-text">المستحقون لاستلام الإشعار (الفئة المستهدفة):</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all', label: 'الجميع' },
              { id: 'OT', label: 'العهد القديم (H)' },
              { id: 'NT', label: 'العهد الجديد (N)' },
              { id: 'servant', label: 'الخدام (S)' },
              { id: 'admin', label: 'الآدمن' },
              { id: 'specific', label: 'تحديد شخص' }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTargetType(opt.id as any);
                  if (opt.id !== 'specific') {
                    setSelectedUser(null);
                    setUserSearchText('');
                  }
                }}
                className={`py-3 px-4 rounded-xl font-bold border-2 text-xs transition-all ${targetType === opt.id ? 'bg-brand-red text-white border-brand-red' : 'bg-gray-50 text-gray-600 border-transparent hover:border-gray-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {targetType === 'specific' && (
          <div className="bg-brand-cream/10 p-4 rounded-2xl border border-brand-beige/5 space-y-3 relative">
            <label className="text-xs font-bold text-brand-beige">ابحث عن الطالب أو الخادم بالاسم أو الكود:</label>
            <div className="relative">
              <input
                type="text"
                placeholder="اكتب الاسم أو الكود للبحث..."
                className="w-full p-3 pr-10 border border-gray-200 rounded-xl bg-white text-sm"
                value={userSearchText}
                onChange={e => setUserSearchText(e.target.value)}
              />
              <Search className="w-4 h-4 text-brand-beige absolute right-3.5 top-3.5" />
            </div>

            {selectedUser ? (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex justify-between items-center text-sm border border-emerald-100">
                <span>المستهدف للتنبيه: {selectedUser.fullName} ({selectedUser.code})</span>
                <button type="button" onClick={() => setSelectedUser(null)} className="text-brand-red font-bold hover:underline">تعديل الاختيار</button>
              </div>
            ) : (
              filteredUsers.length > 0 && (
                <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg divide-y divide-gray-100 overflow-hidden max-h-48 overflow-y-auto z-10 relative">
                  {filteredUsers.map(u => (
                    <button
                      key={u.uid}
                      type="button"
                      onClick={() => {
                        setSelectedUser(u);
                        setUserSearchText('');
                      }}
                      className="w-full p-3 text-right hover:bg-gray-50 flex justify-between items-center text-sm transition-colors"
                    >
                      <span className="font-bold text-brand-text">{u.fullName}</span>
                      <span className="text-xs text-brand-beige font-mono bg-brand-cream px-2 py-0.5 rounded-md">{u.code}</span>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        <textarea className="w-full p-4 border border-gray-200 rounded-xl h-32" placeholder="محتوى الإشعار..." value={message} onChange={e => setMessage(e.target.value)} />
        <button onClick={handleCreate} className="px-6 py-3 bg-brand-red text-white font-bold rounded-xl flex gap-2 items-center">
          <Plus className="w-5 h-5"/> نشر الإشعار
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
           <p className="text-center font-bold text-gray-400 py-10">جاري التحميل...</p>
        ) : announcements.length === 0 ? (
           <p className="text-center font-bold text-gray-400 py-10">لا توجد إشعارات سابقة</p>
        ) : (
           <div className="space-y-4">
              {announcements.map(ann => (
                 <div key={ann.id} className="bg-white p-6 rounded-[24px] border border-gray-100 flex justify-between gap-4">
                    <div className="flex gap-4 items-start">
                      <div className={`p-3 rounded-2xl ${ann.type === 'warning' ? 'bg-red-50 text-red-500' : ann.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'}`}>
                        <Bell className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-brand-text text-lg">{ann.title}</h3>
                        <p className="text-gray-500 font-medium whitespace-pre-wrap mt-2">{ann.message}</p>
                        {ann.createdAt?.seconds && (
                           <p className="text-xs text-gray-400 font-bold mt-4">{formatDate(ann.createdAt.seconds * 1000)}</p>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(ann.id)} className="text-brand-red self-start bg-red-50 p-2 rounded-xl transition-transform hover:scale-110 shrink-0">
                      <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
