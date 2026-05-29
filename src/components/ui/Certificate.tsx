import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Award, Star, Calendar, User } from 'lucide-react';
import { SmartImage } from "./SmartImage";

interface CertificateProps {
  studentName: string;
  assessmentTitle: string;
  score: number;
  maxScore: number;
  date: string;
}

export default function Certificate({ studentName, assessmentTitle, score, maxScore, date }: CertificateProps) {
  const certificateRef = useRef<HTMLDivElement>(null);

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;
    
    // Add temporary scaling classes for higher resolution capture
    certificateRef.current.style.transform = 'scale(2)';
    certificateRef.current.style.transformOrigin = 'top left';
    
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FCFAF5'
      });
      
      certificateRef.current.style.transform = '';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`شهادة_${studentName}_${assessmentTitle}.pdf`);
    } catch (err) {
      console.error('Certificate generation failed:', err);
      alert('حدث خطأ أثناء تحميل الشهادة. جرب مرة أخرى.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden Certificate Template */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none">
        <div 
          ref={certificateRef}
          className="w-[1000px] h-[700px] bg-brand-cream p-12 border-[20px] border-brand-text relative overflow-hidden flex flex-col items-center justify-between text-center font-bold"
          dir="rtl"
        >
          {/* Border Decorations */}
          <div className="absolute top-4 left-4 right-4 bottom-4 border-4 border-brand-red opacity-20 pointer-events-none" />
          <div className="absolute top-10 left-10 w-24 h-24 border-t-8 border-l-8 border-brand-red pointer-events-none" />
          <div className="absolute top-10 right-10 w-24 h-24 border-t-8 border-r-8 border-brand-red pointer-events-none" />
          <div className="absolute bottom-10 left-10 w-24 h-24 border-b-8 border-l-8 border-brand-red pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-24 h-24 border-b-8 border-r-8 border-brand-red pointer-events-none" />

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex flex-wrap gap-10 rotate-12">
            {Array.from({ length: 20 }).map((_, i) => (
              <span key={i} className="text-6xl font-black uppercase tracking-widest">Al-Hekaya</span>
            ))}
          </div>

          {/* Header */}
          <div className="relative z-10 w-full flex justify-between items-start px-8">
            <div className="flex flex-col items-center gap-2">
              <SmartImage 
                src="/assets/logo-red.png" 
                className="w-20 h-20 object-contain" 
                alt="Logo" 
                fallback={<div className="w-20 h-20 flex items-center justify-center bg-brand-red/5 text-brand-red font-black border border-brand-red/10 rounded-full"><Award className="w-10 h-10" /></div>}
              />
              <span className="text-xs text-brand-text uppercase tracking-widest text-[#9E0000]">كنيسة القديسة رفقة</span>
            </div>
            <div className="pt-8">
              <h1 className="text-6xl font-black text-brand-text tracking-tight mb-2">شهادة تقدير</h1>
              <div className="h-2 bg-brand-red w-48 mx-auto rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <SmartImage 
                src="/assets/logo-beige.png" 
                className="w-20 h-20 object-contain" 
                alt="Logo" 
                fallback={<div className="w-20 h-20 flex items-center justify-center bg-brand-beige/5 text-brand-beige font-black border border-brand-beige/10 rounded-full">H</div>}
              />
              <span className="text-xs text-brand-text uppercase tracking-widest text-[#DFC69D]">الحكاية ومافيها</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 space-y-8 flex-1 flex flex-col justify-center">
            <p className="text-2xl text-brand-beige font-medium">تشهد إدارة المنصة بأن الطالب المتميز</p>
            <h2 className="text-7xl font-black text-brand-red tracking-tighter decoration-double underline decoration-brand-beige underline-offset-[16px]">
              {studentName}
            </h2>
            <p className="text-2xl text-brand-beige font-medium max-w-[700px] mx-auto leading-relaxed">
              قد أتم بنجاح اختبار <span className="text-brand-text font-black">"{assessmentTitle}"</span> 
              بمعدل تفوق وقدرة استيعاب استثنائية.
            </p>
          </div>

          {/* Results Details */}
          <div className="relative z-10 grid grid-cols-3 gap-12 w-full px-20 mb-12">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-brand-beige">الدرجة</span>
              <p className="text-4xl font-black text-brand-text">{score} / {maxScore}</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-brand-beige">مستوى الإتقان</span>
              <p className="text-4xl font-black text-emerald-600">{Math.round((score / maxScore) * 100)}%</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-brand-beige">التاريخ</span>
              <p className="text-2xl font-black text-brand-text">{date}</p>
            </div>
          </div>

          {/* Footer/Signatures */}
          <div className="relative z-10 w-full flex justify-center pb-8">
            <div className="w-64 h-24 border-t-2 border-brand-beige flex items-center justify-center">
               <span className="text-brand-beige/40 italic font-medium">الختم الرسمي للمنصة</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={downloadCertificate}
        className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        <Download className="w-5 h-5" />
        تحميل شهادة التميز
      </button>
    </div>
  );
}
