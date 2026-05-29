export interface ScheduleItem {
  date: string;
  dayText: string;
  topic1: string;
  topic2?: string;
  isSpecialEvent?: boolean;
}

export const saturdaySchedules: ScheduleItem[] = [
  { date: "13 / 6", dayText: "السبت", topic1: "العهد القديم", topic2: "اعرف كتابك" },
  { date: "20 / 6", dayText: "السبت", topic1: "التكوين", topic2: "استحالة التحريف" },
  { date: "27 / 6", dayText: "السبت", topic1: "الخروج", topic2: "الأعياد اليهودية 1" },
  { date: "4 / 7", dayText: "السبت", topic1: "يشوع", topic2: "امتحان 1 Round" },
  { date: "11 / 7", dayText: "السبت", topic1: "القضاة", topic2: "الأعياد اليهودية 2" },
  { date: "18 / 7", dayText: "السبت", topic1: "صموئيل الأول 1", topic2: "الذبائح الحيوانية" },
  { date: "25 / 7", dayText: "السبت", topic1: "صموئيل الأول 2", topic2: "الفكر المسياني 1" },
  { date: "1 / 8", dayText: "السبت", topic1: "صموئيل الثاني 1", topic2: "امتحان 2 Round" },
  { date: "8 / 8", dayText: "السبت", topic1: "نهضة العذراء مريم 🌸", isSpecialEvent: true },
  { date: "15 / 8", dayText: "السبت", topic1: "نهضة العذراء مريم 🌸", isSpecialEvent: true },
  { date: "22 / 8", dayText: "السبت", topic1: "صموئيل الثاني 2", topic2: "الفكر المسياني 2" },
  { date: "29 / 8", dayText: "السبت", topic1: "ملوك الأول 1", topic2: "الكهنوت الهاروني" },
  { date: "5 / 9", dayText: "السبت", topic1: "ملوك الأول 2", topic2: "الطوائف اليهودية" },
  { date: "12 / 9", dayText: "السبت", topic1: "نهضة القديسة رفقة ⛪✨", isSpecialEvent: true },
  { date: "19 / 9", dayText: "السبت", topic1: "ملوك الثاني 1", topic2: "خيمة الاجتماع" },
  { date: "26 / 9", dayText: "السبت", topic1: "ملوك الثاني 2", topic2: "هيكل سليمان" },
  { date: "3 / 10", dayText: "السبت", topic1: "امتحان 3 Round 📝", isSpecialEvent: true }
];

export const thursdaySchedules: ScheduleItem[] = [
  { date: "11 / 6", dayText: "الخميس", topic1: "البشارة والميلاد ورحلة العائلة المقدسة", topic2: "مقارنة الأربع أناجيل" },
  { date: "18 / 6", dayText: "الخميس", topic1: "بدايات الخدمة", topic2: "خلفية تاريخية" },
  { date: "25 / 6", dayText: "الخميس", topic1: "الخدمة الأولى في اليهودية", topic2: "خلفية جغرافية" },
  { date: "2 / 7", dayText: "الخميس", topic1: "الخدمة العظيمة في الجليل", topic2: "الخلفية الثقافية والاجتماعية" },
  { date: "9 / 7", dayText: "الخميس", topic1: "الخدمة الأخيرة في اليهودية وإقليم بيرية", topic2: "الخلفية الدينية اليهودية" },
  { date: "16 / 7", dayText: "الخميس", topic1: "أسبوع الآلام", topic2: "الخلفية السياسية والاقتصادية" },
  { date: "23 / 7", dayText: "الخميس", topic1: "أعمال الرسل 1 - 12", topic2: "الخلفية اللغوية (عبري - آرامي - يوناني)" },
  { date: "30 / 7", dayText: "الخميس", topic1: "رحلات بولس الرسول 1 و 2", topic2: "النبوات والرموز في العهد القديم وتحقيقها في العهد الجديد" },
  { date: "6 / 8", dayText: "الخميس", topic1: "رحلات 3 وروما", topic2: "امتحان 1 Round" },
  { date: "13 / 8", dayText: "الخميس", topic1: "نهضة العذراء مريم 🌸", isSpecialEvent: true },
  { date: "20 / 8", dayText: "الخميس", topic1: "نهضة العذراء مريم 🌸", isSpecialEvent: true },
  { date: "27 / 8", dayText: "الخميس", topic1: "بانوراما رسائل بولس 1", topic2: "طرق دراسة الكتاب 1" },
  { date: "3 / 9", dayText: "الخميس", topic1: "بانوراما رسائل بولس 2", topic2: "طرق دراسة الكتاب 2" },
  { date: "10 / 9", dayText: "الخميس", topic1: "عشية عيد النيروز 🎉⛪", isSpecialEvent: true },
  { date: "17 / 9", dayText: "الخميس", topic1: "رسائل الجامعة", topic2: "الرموز والأرقام في الكتاب المقدس" },
  { date: "24 / 9", dayText: "الخميس", topic1: "سفر الرؤيا 1", topic2: "كيف انتشرت المسيحية" },
  { date: "1 / 10", dayText: "الخميس", topic1: "سفر الرؤيا 2", topic2: "امتحان 2 Round 📝" }
];
