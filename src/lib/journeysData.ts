export interface JourneyLocation {
  id: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  companions: string[];
  events: string;
  image?: string; // Optional image URL for the popup
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface Journey {
  mapImage?: string;
  id: string;
  title: string;
  color: string;
  locations: JourneyLocation[];
}

export const journeysData: Journey[] = [
  {
    id: 'journey1',
    title: 'الرحلة التبشيرية الأولى (أع 13-14)',
    color: '#d97706',
    mapImage: '/assets/maps/journey1.png', // amber-600
    locations: [
      {
        id: 'antioch-syria',
        name: 'أنطاكية (سوريا)',
        x: 90, y: 70,
        companions: ['برنابا', 'مرقس'],
        events: 'نقطة الانطلاق للرحلة الأولى، حيث فرز الروح القدس شاول وبرنابا للعمل. صاموا وصلوا ووضعوا عليهما الأيادي.',
        image: '/assets/cities/antioch_syria.png',
        labelPosition: 'right'
      },
      {
        id: 'seleucia',
        name: 'سلوكية',
        x: 88, y: 45,
        companions: ['برنابا', 'مرقس'],
        events: 'ميناء أنطاكية، ومنه أبحروا إلى قبرص بتوجيه من الروح القدس.',
        image: '/assets/cities/seleucia.png',
        labelPosition: 'bottom'
      },
      {
        id: 'salamis',
        name: 'سلاميس (قبرص)',
        x: 86, y: 75,
        companions: ['برنابا', 'مرقس'],
        events: 'أول محطة في قبرص، نادوا بكلمة الله في مجامع اليهود.',
        image: '/assets/cities/salamis_cyprus.png',
        labelPosition: 'right'
      },
      {
        id: 'paphos',
        name: 'بافوس (قبرص)',
        x: 82, y: 76,
        companions: ['برنابا', 'مرقس'],
        events: 'مواجهة عليم الساحر وضربه بالعمى، وإيمان سيرجيوس بولس الوالي. وهنا تغير اسم شاول إلى بولس رسمياً.',
        image: '/assets/cities/paphos_cyprus.png',
        labelPosition: 'bottom'
      },
      {
        id: 'perga',
        name: 'برجة بمفيلية',
        x: 70, y: 40,
        companions: ['برنابا'],
        events: 'في هذه النقطة فارقهم يوحنا مرقس وعاد إلى أورشليم، وأكمل بولس وبرنابا الطريق الصعب.',
        image: '/assets/cities/perga.png',
        labelPosition: 'bottom-left'
      },
      {
        id: 'antioch-pisidia',
        name: 'أنطاكية بيسيدية',
        x: 70, y: 31,
        companions: ['برنابا'],
        events: 'ألقى بولس عظة تاريخية في المجمع، وآمن الكثير من الأمم، لكن اليهود أثاروا اضطهاداً فطردوهما، فنفضا غبار أرجلهما.',
        image: '/assets/cities/antioch_pisidia.png',
        labelPosition: 'top-left'
      },
      {
        id: 'iconium',
        name: 'أيقونية',
        x: 74, y: 34,
        companions: ['برنابا'],
        events: 'آمن جمهور من اليهود واليونانيين. انقسمت المدينة، وتآمروا لرجمهما فهربا إلى لسترة.',
        image: '/assets/cities/iconium.png',
        labelPosition: 'top-right'
      },
      {
        id: 'lystra',
        name: 'لسترة',
        x: 74, y: 37,
        companions: ['برنابا'],
        events: 'شفاء مقعد من بطن أمه، فظنهم الناس آلهة (زفس وهرمس). جاء يهود وحرضوا الجموع فرجموا بولس وجروه خارج المدينة ظانين أنه مات، لكنه قام.',
        image: '/assets/cities/lystra.png',
        labelPosition: 'bottom'
      },
      {
        id: 'derbe',
        name: 'دربة',
        x: 76, y: 40,
        companions: ['برنابا'],
        events: 'بشرا في هذه المدينة وتلمذا كثيرين. ثم عادا في نفس الطريق (لسترة وأيقونية وأنطاكية) لتشديد عزائم الكنائس ورسامة قسوس.',
        image: '/assets/cities/derbe.png',
        labelPosition: 'top-right'
      },
      {
        id: 'return-antioch',
        name: 'العودة لأنطاكية',
        x: 91, y: 44,
        companions: ['برنابا'],
        events: 'عادوا إلى القاعدة بأنطاكية وأخبروا الكنيسة كيف فتح الله للأمم باب الإيمان.',
        labelPosition: 'bottom-right'
      }
    ]
  },
  {
    id: 'journey2',
    title: 'الرحلة التبشيرية الثانية (أع 15-18)',
    color: '#059669',
    mapImage: '/assets/maps/journey2.png', // emerald-600
    locations: [
      {
        id: 'antioch-syria2',
        name: 'أنطاكية (سوريا)',
        x: 90, y: 70,
        companions: ['سيلا'],
        events: 'بدء الرحلة بعد مجمع أورشليم. حدث مشاجرة بين بولس وبرنابا بسبب مرقس، فأخذ بولس سيلا وانطلق براً.'
      },
      {
        id: 'syria-cilicia',
        name: 'سوريا وكيليكية',
        x: 89, y: 41,
        companions: ['سيلا'],
        events: 'اجتياز بولس وسيلا لشدائد وتثبيت الكنائس التي تأسست سابقاً.',
        labelPosition: 'bottom-right'
      },
      {
        id: 'derbe-lystra2',
        name: 'دربة ولسترة',
        x: 75, y: 38,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'انضمام تيموثاوس الشاب ليكون رفيقاً في الرحلة، وقام بولس بختانه مراعاة لليهود في تلك النواحي.',
        labelPosition: 'bottom'
      },
      {
        id: 'phrygia-galatia',
        name: 'فريجية وغلاطية',
        x: 65, y: 32,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'منعهم الروح القدس من التكلم بالكلمة في أسيا، ثم حاولوا الذهاب لبيثينية فلم يدعهم الروح.',
        labelPosition: 'top-left'
      },
      {
        id: 'troas',
        name: 'ترواس',
        x: 57, y: 24,
        companions: ['سيلا', 'تيموثاوس', 'لوقا'],
        events: 'ظهور رؤيا لبولس ليلاً: رجل مكدوني يطلب العون قائلاً "اعبر إلى مكدونية وأعنا". هنا ينضم لوقا البشير للرحلة.',
        image: '/assets/cities/troas.png',
        labelPosition: 'top'
      },
      {
        id: 'philippi',
        name: 'فيلبي',
        x: 50, y: 15,
        companions: ['سيلا', 'تيموثاوس', 'لوقا'],
        events: 'إيمان ليدية بائعة الأرجوان. إخراج روح عرافة من جارية. سجن بولس وسيلا، حدوث زلزلة في منتصف الليل، وإيمان سجان فيلبي وأهل بيته.',
        image: '/assets/cities/philippi.png'
      },
      {
        id: 'thessalonica',
        name: 'تسالونيكي',
        x: 45, y: 18,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'تأسيس الكنيسة. ثورة اليهود وتجمهرهم ضد بيت ياسون.',
        image: '/assets/cities/thessalonica.png',
        labelPosition: 'top'
      },
      {
        id: 'berea',
        name: 'بيرية',
        x: 42, y: 21,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'كانوا أشرف من الذين في تسالونيكي إذ قبلوا الكلمة بفرح وفحصوا الكتب كل يوم.',
        image: '/assets/cities/berea.png',
        labelPosition: 'left'
      },
      {
        id: 'athens',
        name: 'أثينا',
        x: 47, y: 39,
        companions: ['بولس بمفرده'],
        events: 'احتدت روحه فيه إذ رأى المدينة ممتلئة أصناماً. عظة بولس الشهيرة في أريوس باغوس أمام الفلاسفة عن الإله المجهول.',
        image: '/assets/cities/athens.png',
        labelPosition: 'top-left'
      },
      {
        id: 'corinth',
        name: 'كورنثوس',
        x: 45, y: 41,
        companions: ['سيلا', 'تيموثاوس', 'أكيلا وبريسكلا'],
        events: 'بقي فيها سنة وستة أشهر يعلم، واشتغل بصناعة الخيام مع أكيلا وبريسكلا. هنا كتب رسالتي تسالونيكي الأولى والثانية.',
        image: '/assets/cities/corinth.png',
        labelPosition: 'bottom-left'
      },
      {
        id: 'ephesus2',
        name: 'أفسس',
        x: 59, y: 38,
        companions: ['أكيلا وبريسكلا'],
        events: 'زيارة قصيرة جداً، ترك فيها أكيلا وبريسكلا، ووعد بالعودة.',
        labelPosition: 'bottom'
      },
      {
        id: 'caesarea-jerusalem',
        name: 'قيصرية وأورشليم',
        x: 90, y: 82,
        companions: [],
        events: 'النزول في ميناء قيصرية، الصعود لتسليم على الكنيسة في أورشليم، ثم العودة لإنطاكية.',
        labelPosition: 'bottom-left'
      }
    ]
  },
  {
    id: 'journey3',
    title: 'الرحلة التبشيرية الثالثة (أع 18-21)',
    color: '#2563eb',
    mapImage: '/assets/maps/journey3.png', // blue-600
    locations: [
      {
        id: 'antioch-syria3',
        name: 'أنطاكية (سوريا)',
        x: 90, y: 70,
        companions: ['تيموثاوس', 'تيطس'],
        events: 'انطلق منها للمرة الثالثة، وابتدأ يطوف بالترتيب في كورة غلاطية وفريجية يشدد جميع التلاميذ.'
      },
      {
        id: 'ephesus3',
        name: 'أفسس',
        x: 59, y: 38,
        companions: ['تيموثاوس', 'تيطس', 'أبُلُّوس', 'أراستس'],
        events: 'مكث فيها 3 سنوات. معجزات غير عادية بمناديله، حرق كتب السحر (بـ 50 ألف من الفضة)، وثورة ديمتريوس الصائغ صانع هياكل أرطاميس. كتب هنا رسالة كورنثوس الأولى.',
        image: '/assets/paul-miracle.png'
      },
      {
        id: 'macedonia3',
        name: 'مكدونية (فيلبي)',
        x: 58, y: 35,
        companions: ['تيموثاوس', 'تيطس'],
        events: 'افتقاد الكنائس وتشجيعهم. جمع العطايا لفقراء أورشليم. كتب هنا رسالة كورنثوس الثانية.',
        labelPosition: 'top-left'
      },
      {
        id: 'corinth3',
        name: 'اليونان (كورنثوس)',
        x: 53, y: 52,
        companions: ['تيموثاوس'],
        events: 'قضاء 3 أشهر، وخلالها كتب رسالته الأعظم (رسالة رومية). كان ينوي الإبحار لسوريا ولكن تآمر اليهود جعله يغير طريقه راجعاً عبر مكدونية.',
        labelPosition: 'bottom-left'
      },
      {
        id: 'troas3',
        name: 'ترواس',
        x: 52, y: 32,
        companions: ['لوقا', 'تيموثاوس', 'سوباترس', 'أرسترخس'],
        events: 'حديث بولس الطويل، وسقوط الشاب أفتيخوس من الطابق الثالث ميتاً، وإقامة بولس له.'
      },
      {
        id: 'miletus',
        name: 'ميليتس',
        x: 59, y: 41,
        companions: ['لوقا'],
        events: 'استدعى قسوس كنيسة أفسس، وودعهم بكلمات مؤثرة، فبكوا وقبلوه لأنهم لن يروا وجهه بعد.',
        image: '/assets/cities/miletus.png',
        labelPosition: 'bottom-right'
      },
      {
        id: 'tyre',
        name: 'صور',
        x: 88, y: 67,
        companions: ['لوقا'],
        events: 'توقف السفينة وتفريغ حمولتها. تحذير المؤمنين لبولس بالروح ألا يصعد لأورشليم.'
      },
      {
        id: 'caesarea3',
        name: 'قيصرية',
        x: 88, y: 72,
        companions: ['لوقا'],
        events: 'البقاء في بيت فيلبس المبشر. جاء أغابوس النبي وربط يديه ورجليه بمنطقة بولس متنبئاً بما سيحدث له في أورشليم.',
        labelPosition: 'left'
      },
      {
        id: 'jerusalem3',
        name: 'أورشليم',
        x: 88, y: 78,
        companions: ['لوقا', 'مؤمنون آخرون'],
        events: 'القبض على بولس في الهيكل من قبل اليهود، وتدخل قائد الألف الروماني لإنقاذه. خطاب بولس على الدرج.',
        labelPosition: 'bottom'
      }
    ]
  },
  {
    id: 'journey4',
    title: 'الرحلة إلى روما (أع 27-28)',
    color: '#7c3aed',
    mapImage: '/assets/maps/journey4.png',
    locations: [
      {
        id: 'jerusalem4',
        name: 'أورشليم',
        x: 88, y: 78,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تم القبض على بولس هنا وبداية رحلة المحاكمات.'
      },
      {
        id: 'caesarea4',
        name: 'قيصرية',
        x: 88, y: 72,
        companions: ['لوقا', 'أرسترخس'],
        events: 'السجن لمدة سنتين والمحاكمات. بولس يرفع دعواه إلى قيصر.'
      },
      {
        id: 'tyre',
        name: 'صور',
        x: 88, y: 67,
        companions: ['لوقا', 'أرسترخس'],
        events: 'المرور بصور في بداية الرحلة بحراً.',
        labelPosition: 'left'
      },
      {
        id: 'sidon',
        name: 'صيدا',
        x: 88, y: 65,
        companions: ['لوقا', 'أرسترخس'],
        events: 'قائد المئة يوليوس يعامل بولس بالرفق.',
        labelPosition: 'left'
      },
      {
        id: 'myra',
        name: 'ميرا ليكيا',
        x: 67, y: 48,
        companions: ['لوقا', 'أرسترخس'],
        events: 'الانتقال إلى سفينة إسكندرية متجهة لإيطاليا.',
        labelPosition: 'top-left'
      },
      {
        id: 'cnidus',
        name: 'كنيدوس',
        x: 59, y: 46,
        companions: ['لوقا', 'أرسترخس'],
        events: 'ساروا ببطء أياماً كثيرة وبالجهد وصلوا بقرب كنيدوس.'
      },
      {
        id: 'fair-havens',
        name: 'لاسائية (الموانئ الجميلة)',
        x: 53, y: 59,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تحذير بولس من خطورة السفر ولكنهم لم يستمعوا له، فهبت ريح أوروكليدون العنيفة.',
        image: '/assets/paul-ship.png',
        labelPosition: 'bottom'
      },
      {
        id: 'clauda',
        name: 'كلودا',
        x: 48, y: 62,
        companions: ['لوقا', 'أرسترخس'],
        events: 'جرتهم الريح تحت جزيرة كلودا وبالجهد تمكنوا من القارب.'
      },
      {
        id: 'malta',
        name: 'مالطا',
        x: 14, y: 53,
        companions: ['لوقا', 'أرسترخس'],
        events: 'انكسار السفينة. لدغة الأفعى لبولس ولم يتضرر، وشفاء أبو بوبليوس.',
        image: '/assets/paul-miracle.png',
        labelPosition: 'bottom'
      },
      {
        id: 'syracuse',
        name: 'سراكوسا',
        x: 17, y: 44,
        companions: ['لوقا', 'أرسترخس'],
        events: 'المكوث 3 أيام في هذه المدينة الواقعة في جزيرة صقلية.',
        labelPosition: 'left'
      },
      {
        id: 'rhegium',
        name: 'ريغيون',
        x: 19, y: 37,
        companions: ['لوقا', 'أرسترخس'],
        events: 'الطواف من هناك والوصول إلى ريغيون.'
      },
      {
        id: 'puteoli',
        name: 'بوطيولي',
        x: 15, y: 16,
        companions: ['لوقا', 'أرسترخس'],
        events: 'لقاء إخوة مؤمنين والمكوث عندهم 7 أيام.',
        labelPosition: 'top-left'
      },
      {
        id: 'rome',
        name: 'روما',
        x: 10, y: 8,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تحديد إقامة بولس في بيت مستأجر لمدة سنتين.',
        labelPosition: 'top-right'
      }
    ]
  }
];
