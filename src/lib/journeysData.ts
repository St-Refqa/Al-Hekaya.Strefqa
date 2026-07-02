export interface JourneyLocation {
  id: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  cx?: number; // control point x for incoming curve
  cy?: number; // control point y for incoming curve
  labelX?: number; // Free-form X position for the label
  labelY?: number; // Free-form Y position for the label
  labelRotation?: number; // Label rotation in degrees
  hideLabel?: boolean; // Whether the label is hidden
  companions: string[];
  events: string;
  image?: string; // Optional image URL for the popup
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'; // legacy
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
    x: 92.17847769028872,
    y: 47.18714121699196,
    companions: [
      'برنابا',
      'مرقس'
    ],
    events: 'نقطة الانطلاق للرحلة الأولى، حيث فرز الروح القدس شاول وبرنابا للعمل. صاموا وصلوا ووضعوا عليهما الأيادي.',
    image: '/assets/cities/antioch_syria.png',
    labelPosition: 'right',
    labelX: 96.48293963254592,
    labelY: 47.646383467278994,
    hideLabel: false
  },
  {
    id: 'seleucia',
    name: 'سلوكية',
    x: 90.81364829396325,
    y: 43.85763490241102,
    companions: [
      'برنابا',
      'مرقس'
    ],
    events: 'ميناء أنطاكية، ومنه أبحروا إلى قبرص بتوجيه من الروح القدس.',
    image: '/assets/cities/seleucia.png',
    labelPosition: 'bottom',
    labelX: 93.96325459317585,
    labelY: 43.05396096440873,
    cx: 91.28608923884515,
    cy: 45.2353616532721
  },
  {
    id: 'salamis',
    name: 'سلاميس (قبرص)',
    x: 83.77952755905513,
    y: 51.20551090700345,
    companions: [
      'برنابا',
      'مرقس'
    ],
    events: 'أول محطة في قبرص، نادوا بكلمة الله في مجامع اليهود.',
    image: '/assets/cities/salamis_cyprus.png',
    labelPosition: 'right',
    labelX: 87.45406824146981,
    labelY: 53.84615384615385
  },
  {
    id: 'paphos',
    name: 'بافوس (قبرص)',
    x: 79.21259842519684,
    y: 56.48679678530425,
    companions: [
      'برنابا',
      'مرقس'
    ],
    events: 'مواجهة عليم الساحر وضربه بالعمى، وإيمان سيرجيوس بولس الوالي. وهنا تغير اسم شاول إلى بولس رسمياً.',
    image: '/assets/cities/paphos_cyprus.png',
    labelPosition: 'bottom',
    labelX: 77.53280839895012,
    labelY: 59.47187141216992
  },
  {
    id: 'perga',
    name: 'برجة بمفيلية',
    x: 74.12073490813648,
    y: 43.05396096440873,
    companions: [
      'برنابا'
    ],
    events: 'في هذه النقطة فارقهم يوحنا مرقس وعاد إلى أورشليم، وأكمل بولس وبرنابا الطريق الصعب.',
    image: '/assets/cities/perga.png',
    labelPosition: 'bottom-left',
    labelX: 74.48818897637796,
    labelY: 46.0390355912744
  },
  {
    id: 'antioch-pisidia',
    name: 'أنطاكية بيسيدية',
    x: 72.23097112860893,
    y: 32.26176808266361,
    companions: [
      'برنابا'
    ],
    events: 'ألقى بولس عظة تاريخية في المجمع، وآمن الكثير من الأمم، لكن اليهود أثاروا اضطهاداً فطردوهما، فنفضا غبار أرجلهما.',
    image: '/assets/cities/antioch_pisidia.png',
    labelPosition: 'top-left',
    labelX: 69.34383202099738,
    labelY: 28.817451205510906
  },
  {
    id: 'iconium',
    name: 'أيقونية',
    x: 76.53543307086615,
    y: 37.42824339839265,
    companions: [
      'برنابا'
    ],
    events: 'آمن جمهور من اليهود واليونانيين. انقسمت المدينة، وتآمروا لرجمهما فهربا إلى لسترة.',
    image: '/assets/cities/iconium.png',
    labelPosition: 'top-right',
    labelX: 77.32283464566929,
    labelY: 34.672789896670494
  },
  {
    id: 'lystra',
    name: 'لسترة',
    x: 79.00262467191601,
    y: 40.41331802525832,
    companions: [
      'برنابا'
    ],
    events: 'شفاء مقعد من بطن أمه، فظنهم الناس آلهة (زفس وهرمس). جاء يهود وحرضوا الجموع فرجموا بولس وجروه خارج المدينة ظانين أنه مات، لكنه قام.',
    image: '/assets/cities/lystra.png',
    labelPosition: 'bottom',
    labelX: 80.10498687664041,
    labelY: 37.65786452353617
  },
  {
    id: 'derbe',
    name: 'دربة',
    x: 81.31233595800525,
    y: 41.446613088404135,
    companions: [
      'برنابا'
    ],
    events: 'بشرا في هذه المدينة وتلمذا كثيرين. ثم عادا في نفس الطريق (لسترة وأيقونية وأنطاكية) لتشديد عزائم الكنائس ورسامة قسوس.',
    image: '/assets/cities/derbe.png',
    labelPosition: 'top-right',
    labelX: 83.46456692913385,
    labelY: 39.9540757749713
  },
  {
    id: 'attalia',
    name: 'أتالية',
    x: 70.70866141732284,
    y: 42.824339839265214,
    companions: [
      'برنابا'
    ],
    events: 'نزلا إلى أتالية وتكلما بالكلمة هناك.',
    labelPosition: 'bottom',
    labelX: 68.18897637795276,
    labelY: 42.13547646383467
  },
  {
    id: 'return-seleucia',
    name: 'العودة لسلوكية',
    x: 90.86614173228347,
    y: 43.85763490241102,
    companions: [
      'برنابا'
    ],
    events: 'أبحرا من أتالية عائدين إلى سلوكية.',
    labelPosition: 'bottom',
    labelX: 82.20472440944881,
    labelY: 30.99885189437428,
    hideLabel: true
  },
  {
    id: 'return-antioch',
    name: 'العودة لأنطاكية',
    x: 92.1259842519685,
    y: 47.072330654420206,
    companions: [
      'برنابا'
    ],
    events: 'عادوا إلى القاعدة بأنطاكية وأخبروا الكنيسة كيف فتح الله للأمم باب الإيمان.',
    labelPosition: 'bottom-right',
    labelX: 87.92650918635171,
    labelY: 31.917336394948336,
    hideLabel: true
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
        x: 91.44357242877909, y: 44.2389566408425,
        companions: ['سيلا'],
        events: 'بدء الرحلة بعد مجمع أورشليم. حدث مشاجرة بين بولس وبرنابا بسبب مرقس، فأخذ بولس سيلا وانطلق براً.'
      },
      {
        id: 'syria-cilicia',
        name: 'سوريا وكيليكية',
        x: 87.66404216125491, y: 38.790373052232944,
        companions: ['سيلا'],
        events: 'اجتياز بولس وسيلا لشدائد وتثبيت الكنائس التي تأسست سابقاً.',
        labelPosition: 'bottom-right'
      },
      {
        id: 'derbe-lystra2',
        name: 'دربة ولسترة',
        x: 69.816270523817, y: 38.790373052232944,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'انضمام تيموثاوس الشاب ليكون رفيقاً في الرحلة، وقام بولس بختانه مراعاة لليهود في تلك النواحي.',
        labelPosition: 'bottom'
      },
      {
        id: 'phrygia-galatia',
        name: 'فريجية وغلاطية',
        x: 63.359581206922876, y: 31.602876992481576,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'منعهم الروح القدس من التكلم بالكلمة في أسيا، ثم حاولوا الذهاب لبيثينية فلم يدعهم الروح.',
        labelPosition: 'top-left'
      },
      {
        id: 'troas',
        name: 'ترواس',
        x: 57.58530276969411, y: 25.110946699507654,
        companions: ['سيلا', 'تيموثاوس', 'لوقا'],
        events: 'ظهور رؤيا لبولس ليلاً: رجل مكدوني يطلب العون قائلاً "اعبر إلى مكدونية وأعنا". هنا ينضم لوقا البشير للرحلة.',
        image: '/assets/cities/troas.png',
        labelPosition: 'top'
      },
      {
        id: 'philippi',
        name: 'فيلبي',
        x: 48.60892543300392, y: 16.300469039413695,
        companions: ['سيلا', 'تيموثاوس', 'لوقا'],
        events: 'إيمان ليدية بائعة الأرجوان. إخراج روح عرافة من جارية. سجن بولس وسيلا، حدوث زلزلة في منتصف الليل، وإيمان سجان فيلبي وأهل بيته.',
        image: '/assets/cities/philippi.png'
      },
      {
        id: 'thessalonica',
        name: 'تسالونيكي',
        x: 43.77952603831634, y: 19.778290090093737,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'تأسيس الكنيسة. ثورة اليهود وتجمهرهم ضد بيت ياسون.',
        image: '/assets/cities/thessalonica.png',
        labelPosition: 'top'
      },
      {
        id: 'berea',
        name: 'بيرية',
        x: 42.309710670023534, y: 21.864979607218892,
        companions: ['سيلا', 'تيموثاوس'],
        events: 'كانوا أشرف من الذين في تسالونيكي إذ قبلوا الكلمة بفرح وفحصوا الكتب كل يوم.',
        image: '/assets/cities/berea.png',
        labelPosition: 'left'
      },
      {
        id: 'athens',
        name: 'أثينا',
        x: 47.19160158268235, y: 39.022227010624235,
        companions: ['بولس بمفرده'],
        events: 'احتدت روحه فيه إذ رأى المدينة ممتلئة أصناماً. عظة بولس الشهيرة في أريوس باغوس أمام الفلاسفة عن الإله المجهول.',
        image: '/assets/cities/athens.png',
        labelPosition: 'top-left'
      },
      {
        id: 'corinth',
        name: 'كورنثوس',
        x: 44.93438172576209, y: 39.48593492740681,
        companions: ['سيلا', 'تيموثاوس', 'أكيلا وبريسكلا'],
        events: 'بقي فيها سنة وستة أشهر يعلم، واشتغل بصناعة الخيام مع أكيلا وبريسكلا. هنا كتب رسالتي تسالونيكي الأولى والثانية.',
        image: '/assets/cities/corinth.png',
        labelPosition: 'bottom-left'
      },
      {
        id: 'ephesus2',
        name: 'أفسس',
        x: 59.4750679034562, y: 37.86295332706422,
        companions: ['أكيلا وبريسكلا'],
        events: 'زيارة قصيرة جداً، ترك فيها أكيلا وبريسكلا، ووعد بالعودة.',
        labelPosition: 'bottom'
      },
      {
        id: 'caesarea-jerusalem',
        name: 'قيصرية وأورشليم',
        x: 88.87138936667189, y: 72.87300611744517,
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
        x: 91.44357242877909, y: 44.2389566408425,
        companions: ['تيموثاوس', 'تيطس'],
        events: 'انطلق منها للمرة الثالثة، وابتدأ يطوف بالترتيب في كورة غلاطية وفريجية.'
      },
      {
        id: 'tarsus3',
        name: 'طرسوس',
        x: 82.5, y: 39.5,
        companions: ['تيموثاوس'],
        events: 'مرور بمسقط رأسه.'
      },
      {
        id: 'iconium3',
        name: 'أيقونية',
        x: 75.5, y: 38.5,
        companions: ['تيموثاوس'],
        events: 'افتقاد الكنائس وتثبيت المؤمنين.'
      },
      {
        id: 'ephesus3',
        name: 'أفسس',
        x: 59.481482557173806, y: 37.878158309423036,
        companions: ['تيموثاوس', 'تيطس', 'أبُلُّوس', 'أراستس'],
        events: 'مكث فيها 3 سنوات. معجزات بمناديله، حرق كتب السحر، وثورة ديمتريوس.'
      },
      {
        id: 'troas3-1',
        name: 'ترواس',
        x: 57.48148116466799, y: 25.18789699476787,
        companions: ['تيموثاوس'],
        events: 'البحث عن تيطس.'
      },
      {
        id: 'philippi3-1',
        name: 'فيلبي',
        x: 48.666665738329456, y: 16.244286480512567,
        companions: ['تيموثاوس'],
        events: 'الوصول إلى مكدونية.'
      },
      {
        id: 'thessalonica3-1',
        name: 'تسالونيكي',
        x: 45.5, y: 18.5,
        companions: ['تيموثاوس'],
        events: 'المرور بتسالونيكي.'
      },
      {
        id: 'berea3',
        name: 'بيرية',
        x: 43.5, y: 20.5,
        companions: ['تيموثاوس'],
        events: 'المرور ببيرية.'
      },
      {
        id: 'athens3',
        name: 'أثينا',
        x: 46.5, y: 30.5,
        companions: ['تيموثاوس'],
        events: 'المرور بأثينا.'
      },
      {
        id: 'corinth3',
        name: 'كورنثوس',
        x: 44.881890207790846, y: 39.37000794821116,
        companions: ['تيموثاوس'],
        events: 'قضاء 3 أشهر، وتآمر اليهود عليه.'
      },
      {
        id: 'thessalonica3-2',
        name: 'تسالونيكي (مكررة)',
        x: 45.6, y: 18.6,
        companions: ['تيموثاوس'],
        events: 'طريق العودة.'
      },
      {
        id: 'philippi3-2',
        name: 'فيلبي (مكررة)',
        x: 48.7, y: 16.3,
        companions: ['تيموثاوس'],
        events: 'الاحتفال بالفصح هنا قبل الإبحار.'
      },
      {
        id: 'troas3-2',
        name: 'ترواس (مكررة)',
        x: 57.5, y: 25.2,
        companions: ['لوقا', 'تيموثاوس'],
        events: 'حديث بولس الطويل، وسقوط أفتيخوس وإقامته.'
      },
      {
        id: 'miletus3',
        name: 'ميليتس',
        x: 59.99999718052811, y: 42.15226323211376,
        companions: ['لوقا'],
        events: 'وداع قسوس كنيسة أفسس.'
      },
      {
        id: 'rhodes3',
        name: 'رودس',
        x: 63.5, y: 48.5,
        companions: ['لوقا'],
        events: 'السفر باتجاه سوريا.'
      },
      {
        id: 'patara3',
        name: 'باترا',
        x: 68.5, y: 47.5,
        companions: ['لوقا'],
        events: 'تغيير السفينة.'
      },
      {
        id: 'tyre3',
        name: 'صور',
        x: 89.55554994132578, y: 67.7304811243898,
        companions: ['لوقا'],
        events: 'توقف السفينة 7 أيام، وتحذير المؤمنين لبولس.'
      },
      {
        id: 'ptolemais3',
        name: 'بتولمايس',
        x: 89.2, y: 69.5,
        companions: ['لوقا'],
        events: 'قضاء يوم واحد مع الإخوة.'
      },
      {
        id: 'caesarea3',
        name: 'قيصرية',
        x: 89.11111181841565, y: 72.68572234790454,
        companions: ['لوقا'],
        events: 'نبوة أغابوس.'
      },
      {
        id: 'jerusalem3',
        name: 'أورشليم',
        x: 88.66666374903545, y: 78.60784564713596,
        companions: ['لوقا'],
        events: 'القبض على بولس.'
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
        x: 88.66666374903545, y: 78.60784564713596,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تم القبض على بولس هنا وبداية رحلة المحاكمات.'
      },
      {
        id: 'caesarea4',
        name: 'قيصرية',
        x: 89.11111181841565, y: 72.80658565025186,
        companions: ['لوقا', 'أرسترخس'],
        events: 'السجن لمدة سنتين والمحاكمات. بولس يرفع دعواه إلى قيصر.'
      },
      {
        id: 'tyre',
        name: 'صور',
        x: 89.55554994132578, y: 67.7304811243898,
        companions: ['لوقا', 'أرسترخس'],
        events: 'المرور بصور في بداية الرحلة بحراً.',
        labelPosition: 'left'
      },
      {
        id: 'sidon',
        name: 'صيدا',
        x: 90.88888420299631, y: 60.841483863795695,
        companions: ['لوقا', 'أرسترخس'],
        events: 'قائد المئة يوليوس يعامل بولس بالرفق.',
        labelPosition: 'left'
      },
      {
        id: 'myra',
        name: 'ميرا ليكيا',
        x: 67.77777855139212, y: 49.48067830319121,
        companions: ['لوقا', 'أرسترخس'],
        events: 'الانتقال إلى سفينة إسكندرية متجهة لإيطاليا.',
        labelPosition: 'top-left'
      },
      {
        id: 'cnidus',
        name: 'كنيدوس',
        x: 59.92592565331897, y: 47.063489342607504,
        companions: ['لوقا', 'أرسترخس'],
        events: 'ساروا ببطء أياماً كثيرة وبالجهد وصلوا بقرب كنيدوس.'
      },
      {
        id: 'fair-havens',
        name: 'لاسائية (الموانئ الجميلة)',
        x: 54.01574914707451, y: 59.541360702306804,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تحذير بولس من خطورة السفر ولكنهم لم يستمعوا له، فهبت ريح أوروكليدون العنيفة.',
        image: '/assets/paul-ship.png',
        labelPosition: 'bottom'
      },
      {
        id: 'clauda',
        name: 'كلودا',
        x: 49.81627263842092, y: 61.28026928184504,
        companions: ['لوقا', 'أرسترخس'],
        events: 'جرتهم الريح تحت جزيرة كلودا وبالجهد تمكنوا من القارب.'
      },
      {
        id: 'malta',
        name: 'مالطا',
        x: 14.074073650428126, y: 53.34818632017293,
        companions: ['لوقا', 'أرسترخس'],
        events: 'انكسار السفينة. لدغة الأفعى لبولس ولم يتضرر، وشفاء أبو بوبليوس.',
        image: '/assets/paul-miracle.png',
        labelPosition: 'bottom'
      },
      {
        id: 'syracuse',
        name: 'سراكوسا',
        x: 17.33333296862943, y: 45.00887406035781,
        companions: ['لوقا', 'أرسترخس'],
        events: 'المكوث 3 أيام في هذه المدينة الواقعة في جزيرة صقلية.',
        labelPosition: 'left'
      },
      {
        id: 'rhegium',
        name: 'ريغيون',
        x: 19.185185419111423, y: 37.27385802639437,
        companions: ['لوقا', 'أرسترخس'],
        events: 'الطواف من هناك والوصول إلى ريغيون.'
      },
      {
        id: 'puteoli',
        name: 'بوطيولي',
        x: 14.96296232933598, y: 16.48600699944173,
        companions: ['لوقا', 'أرسترخس'],
        events: 'لقاء إخوة مؤمنين والمكوث عندهم 7 أيام.',
        labelPosition: 'top-left'
      },
      {
        id: 'rome',
        name: 'روما',
        x: 9.777777332949531, y: 8.630131720307956,
        companions: ['لوقا', 'أرسترخس'],
        events: 'تحديد إقامة بولس في بيت مستأجر لمدة سنتين.',
        labelPosition: 'top-right'
      }
    ]
  }
];
