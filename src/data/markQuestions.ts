// ═══════════════════════════════════════════════════════════════
//  ألعاب الكتاب المقدس — محتوى إنجيل مارقس (السيزون الأول)
// ═══════════════════════════════════════════════════════════════

export type GameType = 'match' | 'fill' | 'where' | 'who' | 'order' | 'speed';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface MatchPair  { right: string; left: string }
export interface OrderItem  { text: string; order: number }

export interface GameQuestion {
  id: string;
  type: GameType;
  difficulty: Difficulty;
  chapter?: number;
  // fill / where / who / speed ─ MCQ style
  question?: string;
  options?: string[];
  answer?: string;
  hint?: string;
  // match
  pairs?: MatchPair[];
  // order
  items?: OrderItem[];
}

// ──────────────────────────────────────────────────────────────
//  1. وَصِّل (Match)
// ──────────────────────────────────────────────────────────────
export const matchQuestions: GameQuestion[] = [
  {
    id: 'm1', type: 'match', difficulty: 'easy', chapter: 1,
    pairs: [
      { right: 'نهر الأردن',      left: 'معمودية يسوع' },
      { right: 'بحيرة الجليل',    left: 'دعوة الصيادين الأوائل' },
      { right: 'كفرناحوم',        left: 'شفاء المجنون في المجمع' },
      { right: 'بيت بطرس',        left: 'شفاء حماة بطرس' },
    ],
  },
  {
    id: 'm2', type: 'match', difficulty: 'medium', chapter: 5,
    pairs: [
      { right: 'بلاد الجرشيين',   left: 'طرد ليجئون من الرجل' },
      { right: 'بيت يائيرس',      left: 'إقامة ابنة يائيرس' },
      { right: 'الطريق',           left: 'شفاء المرأة ذات النزيف' },
      { right: 'البرية',           left: 'إطعام الخمسة آلاف' },
    ],
  },
  {
    id: 'm3', type: 'match', difficulty: 'medium', chapter: 9,
    pairs: [
      { right: 'جبل عالٍ',         left: 'تجلّي يسوع' },
      { right: 'أريحا',            left: 'شفاء بارتيماوس الأعمى' },
      { right: 'أورشليم',          left: 'الدخول المنتصر على حمار' },
      { right: 'هيكل أورشليم',    left: 'طرد الباعة والمشترين' },
    ],
  },
  {
    id: 'm4', type: 'match', difficulty: 'hard', chapter: 14,
    pairs: [
      { right: 'العليّة',           left: 'العشاء الأخير' },
      { right: 'بستان جثسيماني',   left: 'صلاة يسوع وإلقاء القبض عليه' },
      { right: 'دار رئيس الكهنة', left: 'محاكمة يسوع ليلاً وجحود بطرس' },
      { right: 'الجلجثة',          left: 'صلب يسوع' },
    ],
  },
  {
    id: 'm5', type: 'match', difficulty: 'easy', chapter: 1,
    pairs: [
      { right: 'سمعان ويعقوب ويوحنا وأندراوس', left: 'أول أربعة تلاميذ' },
      { right: 'زبدي',             left: 'والد يعقوب ويوحنا' },
      { right: 'يوحنا المعمدان',   left: 'من عمّد يسوع' },
      { right: 'مريم المجدلية',    left: 'أول من رأى يسوع بعد القيامة' },
    ],
  },
];

// ──────────────────────────────────────────────────────────────
//  2. أكمل الآية (Fill the blank)
// ──────────────────────────────────────────────────────────────
export const fillQuestions: GameQuestion[] = [
  {
    id: 'f1', type: 'fill', difficulty: 'easy', chapter: 1,
    question: '"تُوبُوا وَآمِنُوا بِـ_____" (مر ١: ١٥)',
    options: ['الإنجيل', 'الله', 'الخلاص', 'النبوة'],
    answer: 'الإنجيل',
    hint: 'الكلمة اليونانية Euaggelion',
  },
  {
    id: 'f2', type: 'fill', difficulty: 'easy', chapter: 1,
    question: '"تَعَالَوا وَرَائِي فَأَجْعَلَكُمْ صَيَّادِي _____" (مر ١: ١٧)',
    options: ['الناس', 'الأسماك', 'المجد', 'الملكوت'],
    answer: 'الناس',
    hint: 'قالها يسوع للصيادين عند البحيرة',
  },
  {
    id: 'f3', type: 'fill', difficulty: 'medium', chapter: 9,
    question: '"مَنْ أَرَادَ أَنْ يَكُونَ أَوَّلاً فَيَكُونُ _____ وَخَادِمَ الْكُلِّ" (مر ٩: ٣٥)',
    options: ['آخر الكل', 'أكثرهم حكمة', 'أعظمهم إيماناً', 'أحبهم'],
    answer: 'آخر الكل',
    hint: 'تعليم يسوع عن الخدمة الحقيقية',
  },
  {
    id: 'f4', type: 'fill', difficulty: 'easy', chapter: 10,
    question: '"دَعُوا الأَوْلاَدَ يَأْتُونَ إِلَيَّ لأَنَّ مِثْلَ هَؤُلاَءِ _____" (مر ١٠: ١٤)',
    options: ['ملكوت الله', 'الجنة', 'الحياة الأبدية', 'السماء'],
    answer: 'ملكوت الله',
    hint: 'قالها يسوع حين منع التلاميذ الأطفال',
  },
  {
    id: 'f5', type: 'fill', difficulty: 'medium', chapter: 8,
    question: '"مَنْ أَرَادَ أَنْ يَتْبَعَنِي فَلْيُنْكِرْ نَفْسَهُ وَيَحْمِلْ _____" (مر ٨: ٣٤)',
    options: ['صليبه', 'همّه', 'حزنه', 'إيمانه'],
    answer: 'صليبه',
    hint: 'شرط التلمذة الحقيقية',
  },
  {
    id: 'f6', type: 'fill', difficulty: 'medium', chapter: 12,
    question: '"أَعْطُوا مَا لِقَيْصَرَ لِقَيْصَرَ وَمَا لِلَّهِ _____" (مر ١٢: ١٧)',
    options: ['لله', 'للكنيسة', 'للفقراء', 'للروح'],
    answer: 'لله',
    hint: 'إجابة يسوع على سؤال الضريبة',
  },
  {
    id: 'f7', type: 'fill', difficulty: 'hard', chapter: 10,
    question: '"ابْنُ الإِنْسَانِ لَمْ يَأْتِ لِيُخْدَمَ بَلْ لِيَخْدِمَ وَلِيُعْطِيَ نَفْسَهُ _____ عَنْ كَثِيرِينَ" (مر ١٠: ٤٥)',
    options: ['فدية', 'ذبيحة', 'كفارة', 'برهاناً'],
    answer: 'فدية',
    hint: 'هدف مجيء يسوع المسيح',
  },
  {
    id: 'f8', type: 'fill', difficulty: 'easy', chapter: 12,
    question: '"اَلرَّبُّ إِلَهُنَا رَبٌّ _____" (مر ١٢: ٢٩)',
    options: ['وَاحِد', 'عظيم', 'أبدي', 'قدير'],
    answer: 'وَاحِد',
    hint: 'أول الوصايا العظمى',
  },
  {
    id: 'f9', type: 'fill', difficulty: 'medium', chapter: 9,
    question: '"كُلُّ شَيْءٍ مُسْتَطَاعٌ لِمَنْ _____" (مر ٩: ٢٣)',
    options: ['يُؤمِن', 'يُصلّي', 'يصوم', 'يجاهد'],
    answer: 'يُؤمِن',
    hint: 'قالها يسوع لأبي المجنون',
  },
  {
    id: 'f10', type: 'fill', difficulty: 'hard', chapter: 7,
    question: '"الشَّعْبُ هَذَا يُكَرِّمُنِي بِشَفَتَيْهِ وَأَمَّا قَلْبُهُ فَـ_____" (مر ٧: ٦)',
    options: ['بَعِيدٌ عَنِّي', 'قاسٍ', 'مظلم', 'فارغ'],
    answer: 'بَعِيدٌ عَنِّي',
    hint: 'اقتبسه يسوع من إشعياء النبي',
  },
  {
    id: 'f11', type: 'fill', difficulty: 'easy', chapter: 1,
    question: '"أَنَا عَمَّدْتُكُمْ بِمَاءٍ وَأَمَّا هُوَ فَيُعَمِّدُكُمْ بِـ_____" (مر ١: ٨)',
    options: ['الرُّوحِ الْقُدُسِ', 'نار', 'دم', 'نعمة'],
    answer: 'الرُّوحِ الْقُدُسِ',
    hint: 'قالها يوحنا المعمدان عن يسوع',
  },
  {
    id: 'f12', type: 'fill', difficulty: 'hard', chapter: 15,
    question: '"إِلَهِي إِلَهِي لِمَاذَا _____؟" (مر ١٥: ٣٤)',
    options: ['تَرَكْتَنِي', 'أبعدتني', 'أهنتني', 'خذلتني'],
    answer: 'تَرَكْتَنِي',
    hint: 'صرخة يسوع على الصليب من مزمور ٢٢',
  },
  {
    id: 'f13', type: 'fill', difficulty: 'easy', chapter: 1,
    question: '"وَكَانَ هُنَاكَ مَعَ الْوُحُوشِ، وَكَانَ _____ تَخْدِمُهُ" (مر ١: ١٣)',
    options: ['الملائكة', 'التلاميذ', 'الحيوانات', 'الأنبياء'],
    answer: 'الملائكة',
    hint: 'حدث هذا أثناء تجربة يسوع في البرية',
  },
  {
    id: 'f14', type: 'fill', difficulty: 'medium', chapter: 2,
    question: '"وَقَالَ لَهُمْ: السَّبْتُ إِنَّمَا جُعِلَ لأَجْلِ الإِنْسَانِ لاَ _____ لأَجْلِ السَّبْتِ" (مر ٢: ٢٧)',
    options: ['الإنسان', 'الله', 'الناموس', 'الراحة'],
    answer: 'الإنسان',
    hint: 'عندما قطف التلاميذ السنابل في السبت',
  },
  {
    id: 'f15', type: 'fill', difficulty: 'hard', chapter: 8,
    question: '"لأَنَّ مَنْ يَسْتَحِي بِي وَبِكَلاَمِي... فَإِنَّ ابْنَ الإِنْسَانِ _____ بِهِ" (مر ٨: ٣٨)',
    options: ['يَسْتَحِي', 'يغضب', 'يتجاهل', 'يحكم'],
    answer: 'يَسْتَحِي',
    hint: 'عن مجيء ابن الإنسان بمجده',
  },
  {
    id: 'f16', type: 'fill', difficulty: 'medium', chapter: 11,
    question: '"وَكُلَّمَا وَقَفْتُمْ تُصَلُّونَ، _____ إِنْ كَانَ لَكُمْ عَلَى أَحَدٍ شَيْءٌ" (مر ١١: ٢٥)',
    options: ['فَاغْفِرُوا', 'فاطلبوا', 'فابكوا', 'فانتظروا'],
    answer: 'فَاغْفِرُوا',
    hint: 'عن أهمية التسامح لاستجابة الصلاة',
  },
];

// ──────────────────────────────────────────────────────────────
//  3. فين الحدث (Where)
// ──────────────────────────────────────────────────────────────
export const whereQuestions: GameQuestion[] = [
  {
    id: 'w1', type: 'where', difficulty: 'easy', chapter: 1,
    question: 'أين عمّد يوحنا يسوعَ؟',
    options: ['نهر الأردن', 'بحيرة الجليل', 'بحر الملح', 'بئر يعقوب'],
    answer: 'نهر الأردن',
    hint: 'مر ١: ٩',
  },
  {
    id: 'w2', type: 'where', difficulty: 'easy', chapter: 1,
    question: 'أين طرد يسوع الروح النجسة لأول مرة؟',
    options: ['مجمع كفرناحوم', 'هيكل أورشليم', 'بيت بطرس', 'جبل الزيتون'],
    answer: 'مجمع كفرناحوم',
    hint: 'مر ١: ٢١-٢٦',
  },
  {
    id: 'w3', type: 'where', difficulty: 'easy', chapter: 1,
    question: 'أين شفى يسوع حماةَ بطرس من الحُمَّى؟',
    options: ['بيت بطرس في كفرناحوم', 'مجمع الناصرة', 'العليّة', 'الجليل'],
    answer: 'بيت بطرس في كفرناحوم',
    hint: 'مر ١: ٢٩-٣١',
  },
  {
    id: 'w4', type: 'where', difficulty: 'medium', chapter: 5,
    question: 'أين طرد يسوع الأرواح النجسة "ليجئون" من الرجل المجنون؟',
    options: ['بلاد الجرشيين', 'أورشليم', 'الجليل', 'الناصرة'],
    answer: 'بلاد الجرشيين',
    hint: 'مر ٥: ١ — الجانب الشرقي من بحيرة الجليل',
  },
  {
    id: 'w5', type: 'where', difficulty: 'medium', chapter: 6,
    question: 'أين أطعم يسوع الخمسة آلاف؟',
    options: ['في البرية على ضفة البحيرة', 'في أورشليم', 'في كفرناحوم', 'في الهيكل'],
    answer: 'في البرية على ضفة البحيرة',
    hint: 'مر ٦: ٣٢-٤٤',
  },
  {
    id: 'w6', type: 'where', difficulty: 'medium', chapter: 9,
    question: 'أين تجلَّى يسوع أمام بطرس ويعقوب ويوحنا؟',
    options: ['على جبل عالٍ', 'في الهيكل', 'في البرية', 'على شاطئ الجليل'],
    answer: 'على جبل عالٍ',
    hint: 'مر ٩: ٢',
  },
  {
    id: 'w7', type: 'where', difficulty: 'easy', chapter: 10,
    question: 'أين شفى يسوع بارتيماوس الأعمى؟',
    options: ['أريحا', 'أورشليم', 'بيت لحم', 'كفرناحوم'],
    answer: 'أريحا',
    hint: 'مر ١٠: ٤٦',
  },
  {
    id: 'w8', type: 'where', difficulty: 'easy', chapter: 11,
    question: 'أين طرد يسوع الباعة والمشترين؟',
    options: ['هيكل أورشليم', 'السوق', 'باب المدينة', 'بيت عنيا'],
    answer: 'هيكل أورشليم',
    hint: 'مر ١١: ١٥',
  },
  {
    id: 'w9', type: 'where', difficulty: 'medium', chapter: 14,
    question: 'أين أقام يسوع العشاء الأخير مع تلاميذه؟',
    options: ['العليّة', 'بيت عنيا', 'المجمع', 'بيت بطرس'],
    answer: 'العليّة',
    hint: 'مر ١٤: ١٥',
  },
  {
    id: 'w10', type: 'where', difficulty: 'medium', chapter: 14,
    question: 'أين صلّى يسوع وأُلقي القبض عليه؟',
    options: ['بستان جثسيماني', 'جبل الزيتون', 'الهيكل', 'العليّة'],
    answer: 'بستان جثسيماني',
    hint: 'مر ١٤: ٣٢',
  },
  {
    id: 'w11', type: 'where', difficulty: 'hard', chapter: 15,
    question: 'ما اسم المكان الذي صُلب فيه يسوع؟',
    options: ['الجلجثة', 'جبل الزيتون', 'جبل صهيون', 'بيت لحم'],
    answer: 'الجلجثة',
    hint: 'مر ١٥: ٢٢ — تعني "موضع الجمجمة"',
  },
  {
    id: 'w12', type: 'where', difficulty: 'easy', chapter: 1,
    question: 'من أي مدينة جاء يسوع ليتعمد؟',
    options: ['الناصرة', 'أورشليم', 'بيت لحم', 'كفرناحوم'],
    answer: 'الناصرة',
    hint: 'مر ١: ٩',
  },
  {
    id: 'w13', type: 'where', difficulty: 'medium', chapter: 5,
    question: 'أين طلب يسوع من الرجل الذي طُردت منه الشياطين أن يذهب؟',
    options: ['إلى بيته وأهله', 'ليتبعه كفرد من التلاميذ', 'إلى أورشليم', 'إلى الهيكل'],
    answer: 'إلى بيته وأهله',
    hint: 'مر ٥: ١٩ — ليخبرهم بكم صنع الرب به',
  },
  {
    id: 'w14', type: 'where', difficulty: 'hard', chapter: 8,
    question: 'أين شفى يسوع أعمى بيت صيدا؟',
    options: ['خارج القرية', 'في مجمع بيت صيدا', 'عند بركة سلوان', 'في الهيكل'],
    answer: 'خارج القرية',
    hint: 'مر ٨: ٢٣ — أخذه بيده وأخرجه إلى خارج القرية',
  },
  {
    id: 'w15', type: 'where', difficulty: 'easy', chapter: 14,
    question: 'أين كان بطرس حين أنكر يسوع لأول مرة؟',
    options: ['في الدار أسفل', 'في المحكمة العليا', 'في العلية', 'في البستان'],
    answer: 'في الدار أسفل',
    hint: 'مر ١٤: ٦٦',
  },
  {
    id: 'w16', type: 'where', difficulty: 'hard', chapter: 14,
    question: 'من أين هرب الشاب الذي كان لابساً إزاراً على عُريه تاركاً الإزار وراءه؟',
    options: ['بستان جثسيماني', 'دار رئيس الكهنة', 'العليّة', 'الجلجثة'],
    answer: 'بستان جثسيماني',
    hint: 'مر ١٤: ٥١ — وقت إلقاء القبض على يسوع',
  },
];

// ──────────────────────────────────────────────────────────────
//  4. مين قال ده؟ (Who Said It)
// ──────────────────────────────────────────────────────────────
export const whoQuestions: GameQuestion[] = [
  {
    id: 'wh1', type: 'who', difficulty: 'easy', chapter: 15,
    question: '"حَقًّا كَانَ هَذَا الإِنْسَانُ ابْنَ اللهِ" (مر ١٥: ٣٩)',
    options: ['قائد المئة', 'بيلاطس', 'يوسف الرامي', 'أحد الحاضرين'],
    answer: 'قائد المئة',
    hint: 'قالها لما رأى كيف مات يسوع',
  },
  {
    id: 'wh2', type: 'who', difficulty: 'medium', chapter: 14,
    question: '"يَا أَبَتَا كُلُّ شَيْءٍ مُسْتَطَاعٌ لَدَيْكَ أَعْبُرْ عَنِّي هَذِهِ الْكَأْسَ" (مر ١٤: ٣٦)',
    options: ['يسوع', 'بطرس', 'يعقوب', 'يوحنا'],
    answer: 'يسوع',
    hint: 'صلاة في جثسيماني قبل الاعتقال',
  },
  {
    id: 'wh3', type: 'who', difficulty: 'easy', chapter: 8,
    question: '"أَنْتَ الْمَسِيحُ" (مر ٨: ٢٩)',
    options: ['بطرس', 'يوحنا', 'أندراوس', 'توما'],
    answer: 'بطرس',
    hint: 'إجابة على سؤال يسوع "من أنا؟"',
  },
  {
    id: 'wh4', type: 'who', difficulty: 'medium', chapter: 16,
    question: '"مَنْ يُدَحْرِجُ لَنَا الْحَجَرَ عَنْ بَابِ الْقَبْرِ؟" (مر ١٦: ٣)',
    options: ['المريمات', 'التلاميذ', 'الملائكة', 'يوسف الرامي'],
    answer: 'المريمات',
    hint: 'قالته النساء وهن في طريقهن للقبر',
  },
  {
    id: 'wh5', type: 'who', difficulty: 'easy', chapter: 1,
    question: '"مَا لَنَا وَلَكَ يَا يَسُوعَ النَّاصِرِيَّ؟ أَجِئْتَ لِتُهْلِكَنَا؟" (مر ١: ٢٤)',
    options: ['الروح النجسة', 'الكتبة', 'الفريسيون', 'رئيس المجمع'],
    answer: 'الروح النجسة',
    hint: 'في مجمع كفرناحوم',
  },
  {
    id: 'wh6', type: 'who', difficulty: 'hard', chapter: 14,
    question: '"لاَ أَعْرِفُ هَذَا الإِنْسَانَ الَّذِي تَقُولُونَ عَنْهُ" (مر ١٤: ٧١)',
    options: ['بطرس', 'يهوذا', 'يوحنا', 'يعقوب'],
    answer: 'بطرس',
    hint: 'قالها ثلاث مرات في دار رئيس الكهنة',
  },
  {
    id: 'wh7', type: 'who', difficulty: 'medium', chapter: 15,
    question: '"هَلْ أَنْتَ مَلِكُ الْيَهُودِ؟" (مر ١٥: ٢)',
    options: ['بيلاطس', 'هيرودس', 'رئيس الكهنة', 'قائد المئة'],
    answer: 'بيلاطس',
    hint: 'حاكم يهودا الروماني',
  },
  {
    id: 'wh8', type: 'who', difficulty: 'easy', chapter: 10,
    question: '"يَا مُعَلِّمُ الصَّالِحُ، مَاذَا أَعْمَلُ لأَرِثَ الْحَيَاةَ الأَبَدِيَّةَ؟" (مر ١٠: ١٧)',
    options: ['الشاب الغني', 'نيقوديموس', 'الكاتب', 'أحد التلاميذ'],
    answer: 'الشاب الغني',
    hint: 'جاء إلى يسوع وهو راكع',
  },
  {
    id: 'wh9', type: 'who', difficulty: 'hard', chapter: 1,
    question: '"أَنَا صَوْتُ صَارِخٍ فِي الْبَرِّيَّةِ" (يو ١: ٢٣) — من هو هذا الصوت في إنجيل مارقس؟',
    options: ['يوحنا المعمدان', 'إيليا', 'إشعياء', 'يسوع'],
    answer: 'يوحنا المعمدان',
    hint: 'مر ١: ٣ — المُهيِّئ للطريق',
  },
  {
    id: 'wh10', type: 'who', difficulty: 'medium', chapter: 5,
    question: '"إِنْ شِئْتَ تَسْتَطِيعُ أَنْ تُطَهِّرَنِي" (مر ١: ٤٠)',
    options: ['الأبرص', 'الأعمى', 'المجنون', 'الشلول'],
    answer: 'الأبرص',
    hint: 'طلب الشفاء من يسوع على ركبتيه',
  },
  {
    id: 'wh11', type: 'who', difficulty: 'hard', chapter: 15,
    question: 'من طلب جسد يسوع من بيلاطس ودفنه؟',
    options: ['يوسف الرامي', 'نيقوديموس', 'يوحنا التلميذ', 'قائد المئة'],
    answer: 'يوسف الرامي',
    hint: 'مر ١٥: ٤٣ — كان عضواً في مجلس السنهدرين',
  },
  {
    id: 'wh12', type: 'who', difficulty: 'medium', chapter: 16,
    question: 'مَن قال للنساء عند القبر: "لا تَخَفْنَ، أنتن تطلبن يسوع"؟',
    options: ['الملاك', 'يسوع', 'بطرس', 'يوحنا'],
    answer: 'الملاك',
    hint: 'مر ١٦: ٦ — كان جالساً على الجانب الأيمن',
  },
  {
    id: 'wh13', type: 'who', difficulty: 'easy', chapter: 1,
    question: '"أَنَا لَسْتُ أَهْلاً أَنْ أَنْحَنِيَ وَأَحُلَّ سُيُورَ حِذَائِهِ" (مر ١: ٧)',
    options: ['يوحنا المعمدان', 'بطرس', 'يعقوب', 'متى العشار'],
    answer: 'يوحنا المعمدان',
    hint: 'كان يكرز في البرية',
  },
  {
    id: 'wh14', type: 'who', difficulty: 'easy', chapter: 1,
    question: '"أَنْتَ ابْنِي الْحَبِيبُ الَّذِي بِهِ سُرِرْتُ" (مر ١: ١١)',
    options: ['صوت من السماوات', 'يوحنا المعمدان', 'الملاك جبرائيل', 'الأنبياء'],
    answer: 'صوت من السماوات',
    hint: 'جاء هذا الصوت وقت المعمودية',
  },
  {
    id: 'wh15', type: 'who', difficulty: 'medium', chapter: 7,
    question: '"يَا سَيِّدُ، وَالْكِلاَبُ أَيْضاً تَحْتَ الْمَائِدَةِ تَأْكُلُ مِنْ فُتَاتِ الْبَنِينَ" (مر ٧: ٢٨)',
    options: ['المرأة الفينيقية السورية', 'المرأة نازفة الدم', 'حماة بطرس', 'مريم المجدلية'],
    answer: 'المرأة الفينيقية السورية',
    hint: 'طلبت إخراج شيطان من ابنتها',
  },
  {
    id: 'wh16', type: 'who', difficulty: 'hard', chapter: 12,
    question: '"هَلُمَّ نَقْتُلْهُ فَيَكُونَ لَنَا الْمِيرَاثُ!" (مر ١٢: ٧)',
    options: ['الكرّامون الأردياء', 'الفريسيون', 'الجنود الرومان', 'التلاميذ'],
    answer: 'الكرّامون الأردياء',
    hint: 'في مثل الكرم والكرامين',
  },
];

// ──────────────────────────────────────────────────────────────
//  5. رتّب الأحداث (Order)
// ──────────────────────────────────────────────────────────────
export const orderQuestions: GameQuestion[] = [
  {
    id: 'o1', type: 'order', difficulty: 'easy',
    question: 'رتّب هذه الأحداث من مارقس ١ حسب ترتيب حدوثها:',
    items: [
      { text: 'معمودية يسوع في نهر الأردن', order: 1 },
      { text: 'تجربة يسوع في البرية', order: 2 },
      { text: 'دعوة الصيادين الأوائل', order: 3 },
      { text: 'شفاء المجنون في مجمع كفرناحوم', order: 4 },
    ],
  },
  {
    id: 'o2', type: 'order', difficulty: 'medium',
    question: 'رتّب هذه الأحداث المهمة في حياة يسوع حسب مارقس:',
    items: [
      { text: 'إطعام الخمسة آلاف', order: 1 },
      { text: 'تجلّي يسوع على الجبل', order: 2 },
      { text: 'شفاء بارتيماوس عند أريحا', order: 3 },
      { text: 'الدخول المنتصر إلى أورشليم', order: 4 },
    ],
  },
  {
    id: 'o3', type: 'order', difficulty: 'hard',
    question: 'رتّب أحداث آخر أسبوع يسوع حسب مارقس ١٤-١٦:',
    items: [
      { text: 'العشاء الأخير في العليّة', order: 1 },
      { text: 'الصلاة في جثسيماني وإلقاء القبض عليه', order: 2 },
      { text: 'المحاكمة أمام بيلاطس', order: 3 },
      { text: 'الصلب في الجلجثة', order: 4 },
    ],
  },
  {
    id: 'o4', type: 'order', difficulty: 'medium',
    question: 'رتّب هذه المعجزات حسب ورودها في مارقس:',
    items: [
      { text: 'تهدئة العاصفة على البحيرة', order: 1 },
      { text: 'إقامة ابنة يائيرس من الموت', order: 2 },
      { text: 'إطعام الأربعة آلاف', order: 3 },
      { text: 'التجلّي على الجبل', order: 4 },
    ],
  },
  {
    id: 'o5', type: 'order', difficulty: 'easy',
    question: 'رتّب أحداث يوم القيامة حسب مارقس ١٦:',
    items: [
      { text: 'ذهاب المريمات إلى القبر فجراً', order: 1 },
      { text: 'وجدن الحجر مدحرجاً عن القبر', order: 2 },
      { text: 'رأين الملاك في القبر', order: 3 },
      { text: 'ظهور يسوع لمريم المجدلية', order: 4 },
    ],
  },
];

// ──────────────────────────────────────────────────────────────
//  6. سباق الآيات — Speed Quiz (MCQ سريعة)
// ──────────────────────────────────────────────────────────────
export const speedQuestions: GameQuestion[] = [
  {
    id: 'sp1', type: 'speed', difficulty: 'easy',
    question: 'كم إصحاحاً في إنجيل مارقس؟',
    options: ['١٦', '٢١', '٢٨', '٢٤'],
    answer: '١٦',
  },
  {
    id: 'sp2', type: 'speed', difficulty: 'easy',
    question: 'مارقس كتب إنجيله بالأساس لمن؟',
    options: ['الرومان', 'اليهود', 'اليونانيين', 'المصريين'],
    answer: 'الرومان',
  },
  {
    id: 'sp3', type: 'speed', difficulty: 'easy',
    question: 'ما اسم والد يعقوب ويوحنا التلميذين؟',
    options: ['زبدي', 'يونا', 'حلفى', 'برتولماوس'],
    answer: 'زبدي',
  },
  {
    id: 'sp4', type: 'speed', difficulty: 'medium',
    question: 'ما اسم الأعمى الذي شفاه يسوع قرب أريحا؟',
    options: ['بارتيماوس', 'نيقوديموس', 'أنانيا', 'يائيرس'],
    answer: 'بارتيماوس',
  },
  {
    id: 'sp5', type: 'speed', difficulty: 'easy',
    question: 'كم شخصاً تقريباً أكل من المعجزة الأولى لإطعام الجموع؟',
    options: ['٥٠٠٠', '٤٠٠٠', '٣٠٠٠', '١٠٠٠٠'],
    answer: '٥٠٠٠',
  },
  {
    id: 'sp6', type: 'speed', difficulty: 'medium',
    question: 'ما اسم أبي الإسكندر والروفس الذي حمل صليب يسوع؟',
    options: ['سمعان القيرواني', 'يوسف الرامي', 'نيقوديموس', 'يائيرس'],
    answer: 'سمعان القيرواني',
  },
  {
    id: 'sp7', type: 'speed', difficulty: 'medium',
    question: 'من دفن يسوع بعد الصلب؟',
    options: ['يوسف الرامي', 'بطرس', 'يوحنا', 'الحرس الروماني'],
    answer: 'يوسف الرامي',
  },
  {
    id: 'sp8', type: 'speed', difficulty: 'easy',
    question: 'في أي يوم قام يسوع من الموت؟',
    options: ['الأول من الأسبوع', 'السبت', 'الجمعة', 'الأربعاء'],
    answer: 'الأول من الأسبوع',
  },
  {
    id: 'sp9', type: 'speed', difficulty: 'easy',
    question: 'من أول من رأى يسوع بعد القيامة حسب مارقس؟',
    options: ['مريم المجدلية', 'بطرس', 'يوحنا', 'أمه مريم'],
    answer: 'مريم المجدلية',
  },
  {
    id: 'sp10', type: 'speed', difficulty: 'hard',
    question: 'ماذا كانت تفعل المريمات حين أتين للقبر؟',
    options: ['يحملن حنوطاً لتحنيطه', 'يبكين فقط', 'يبحثن عن الحراس', 'يذهبن لإخبار بطرس'],
    answer: 'يحملن حنوطاً لتحنيطه',
  },
  {
    id: 'sp11', type: 'speed', difficulty: 'medium',
    question: 'كم مرة أنكر بطرس يسوع؟',
    options: ['٣', '٢', '١', '٤'],
    answer: '٣',
  },
  {
    id: 'sp12', type: 'speed', difficulty: 'hard',
    question: 'ماذا مزّق يسوع حين سمع كلام رئيس الكهنة؟',
    options: ['ثيابه', 'ستار الهيكل', 'كلا الأمرين', 'لا شيء — هذا حدث بعد موته'],
    answer: 'لا شيء — هذا حدث بعد موته',
  },
  {
    id: 'sp13', type: 'speed', difficulty: 'easy',
    question: 'ما اسم رئيس المجمع الذي طلب من يسوع شفاء ابنته؟',
    options: ['يائيرس', 'نيقوديموس', 'قيافا', 'حنّا'],
    answer: 'يائيرس',
  },
  {
    id: 'sp14', type: 'speed', difficulty: 'medium',
    question: 'كم سلة مُليئت من فضلات إطعام الأربعة آلاف؟',
    options: ['٧', '١٢', '٥', '٣'],
    answer: '٧',
  },
  {
    id: 'sp15', type: 'speed', difficulty: 'hard',
    question: 'ما الكلمة الآرامية التي قالها يسوع حين أقام ابنة يائيرس؟',
    options: ['طليثا قومي', 'أبا أبت', 'مرنا ثا', 'إيفّاثا'],
    answer: 'طليثا قومي',
  },
  {
    id: 'sp16', type: 'speed', difficulty: 'easy',
    question: 'كم كان عمر ابنة يائيرس حين أقامها يسوع؟',
    options: ['١٢ سنة', '١٠ سنوات', '١٥ سنة', '٧ سنوات'],
    answer: '١٢ سنة',
  },
  {
    id: 'sp17', type: 'speed', difficulty: 'medium',
    question: 'ماذا تعني كلمة "إفَّثَا" التي قالها يسوع للأصم الأعقد؟',
    options: ['انفتح', 'قم', 'اخرج', 'اسمع'],
    answer: 'انفتح',
  },
  {
    id: 'sp18', type: 'speed', difficulty: 'hard',
    question: 'بأي شيء شُفي الأعمى في بيت صيدا؟',
    options: ['بالتفل ووضع اليد', 'بكلمة فقط', 'بغسله في البركة', 'بلمس ثوبه'],
    answer: 'بالتفل ووضع اليد',
  },
  {
    id: 'sp19', type: 'speed', difficulty: 'hard',
    question: 'في أي ساعة صُلب يسوع حسب إنجيل مارقس؟',
    options: ['الساعة الثالثة', 'الساعة السادسة', 'الساعة التاسعة', 'الساعة الثانية عشرة'],
    answer: 'الساعة الثالثة',
  },
];

// ──────────────────────────────────────────────────────────────
//  الفهرس الكامل
// ──────────────────────────────────────────────────────────────
export const allQuestions: GameQuestion[] = [
  ...fillQuestions,
  ...whereQuestions,
  ...whoQuestions,
  ...speedQuestions,
];

export const GAME_CONFIG = {
  questionsPerRound: 10,
  secondsPerQuestion: {
    match: 45,
    fill: 20,
    where: 15,
    who: 15,
    order: 40,
    speed: 10,
  },
  pointsPerCorrect: {
    match: 1,
    fill: 1,
    where: 1,
    who: 1,
    order: 1,
    speed: 1,
  },
  bonusSpeedFactor: 0, // No bonus points, strictly 1 point per question
};

export const GAME_META: Record<GameType, { label: string; emoji: string; desc: string; color: string; bg: string }> = {
  match:  { label: 'وصّل',          emoji: '🔗', desc: 'صل كل حدث بمكانه أو شخصه', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  fill:   { label: 'أكمل الآية',    emoji: '✍️', desc: 'اختر الكلمة الناقصة من الآية', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  where:  { label: 'فين الحدث؟',   emoji: '📍', desc: 'أين وقع هذا الحدث؟',           color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  who:    { label: 'مين قال ده؟',  emoji: '🗣️', desc: 'مَن صاحب هذه الكلمات؟',       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  order:  { label: 'رتّب الأحداث', emoji: '🔢', desc: 'رتّب الأحداث حسب حدوثها',     color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
  speed:  { label: 'سباق الآيات',  emoji: '⚡', desc: '١٠ ثواني لكل سؤال — أسرع!',   color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
};
