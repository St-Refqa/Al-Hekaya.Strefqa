const fs = require('fs');

const inputJson = {
  "journey1": [
    {
      "id": "antioch-syria",
      "name": "أنطاكية (سوريا)",
      "x": 92.17847769028872,
      "y": 47.18714121699196,
      "companions": [
        "برنابا",
        "مرقس"
      ],
      "events": "نقطة الانطلاق للرحلة الأولى، حيث فرز الروح القدس شاول وبرنابا للعمل. صاموا وصلوا ووضعوا عليهما الأيادي.",
      "image": "/assets/cities/antioch_syria.png",
      "labelPosition": "right",
      "labelX": 94.48818897637796,
      "labelY": 46.95752009184845,
      "hideLabel": false
    },
    {
      "id": "seleucia",
      "name": "سلوكية",
      "x": 90.81364829396325,
      "y": 43.85763490241102,
      "companions": [
        "برنابا",
        "مرقس"
      ],
      "events": "ميناء أنطاكية، ومنه أبحروا إلى قبرص بتوجيه من الروح القدس.",
      "image": "/assets/cities/seleucia.png",
      "labelPosition": "bottom",
      "labelX": 92.54593175853019,
      "labelY": 43.16877152698048,
      "cx": 91.28608923884515,
      "cy": 45.2353616532721
    },
    {
      "id": "salamis",
      "name": "سلاميس (قبرص)",
      "x": 83.77952755905513,
      "y": 51.20551090700345,
      "companions": [
        "برنابا",
        "مرقس"
      ],
      "events": "أول محطة في قبرص، نادوا بكلمة الله في مجامع اليهود.",
      "image": "/assets/cities/salamis_cyprus.png",
      "labelPosition": "right",
      "labelX": 86.24671916010499,
      "labelY": 52.23880597014925
    },
    {
      "id": "paphos",
      "name": "بافوس (قبرص)",
      "x": 79.21259842519684,
      "y": 56.48679678530425,
      "companions": [
        "برنابا",
        "مرقس"
      ],
      "events": "مواجهة عليم الساحر وضربه بالعمى، وإيمان سيرجيوس بولس الوالي. وهنا تغير اسم شاول إلى بولس رسمياً.",
      "image": "/assets/cities/paphos_cyprus.png",
      "labelPosition": "bottom",
      "labelX": 81.15485564304463,
      "labelY": 58.2089552238806
    },
    {
      "id": "perga",
      "name": "برجة بمفيلية",
      "x": 74.12073490813648,
      "y": 43.05396096440873,
      "companions": [
        "برنابا"
      ],
      "events": "في هذه النقطة فارقهم يوحنا مرقس وعاد إلى أورشليم، وأكمل بولس وبرنابا الطريق الصعب.",
      "image": "/assets/cities/perga.png",
      "labelPosition": "bottom-left",
      "labelX": 74.06824146981627,
      "labelY": 45.00574052812859
    },
    {
      "id": "antioch-pisidia",
      "name": "أنطاكية بيسيدية",
      "x": 72.23097112860893,
      "y": 32.26176808266361,
      "companions": [
        "برنابا"
      ],
      "events": "ألقى بولس عظة تاريخية في المجمع، وآمن الكثير من الأمم، لكن اليهود أثاروا اضطهاداً فطردوهما، فنفضا غبار أرجلهما.",
      "image": "/assets/cities/antioch_pisidia.png",
      "labelPosition": "top-left",
      "labelX": 69.97375328083989,
      "labelY": 32.14695752009185
    },
    {
      "id": "iconium",
      "name": "أيقونية",
      "x": 76.53543307086615,
      "y": 37.42824339839265,
      "companions": [
        "برنابا"
      ],
      "events": "آمن جمهور من اليهود واليونانيين. انقسمت المدينة، وتآمروا لرجمهما فهربا إلى لسترة.",
      "image": "/assets/cities/iconium.png",
      "labelPosition": "top-right",
      "labelX": 77.32283464566929,
      "labelY": 34.672789896670494
    },
    {
      "id": "lystra",
      "name": "لسترة",
      "x": 79.00262467191601,
      "y": 40.41331802525832,
      "companions": [
        "برنابا"
      ],
      "events": "شفاء مقعد من بطن أمه، فظنهم الناس آلهة (زفس وهرمس). جاء يهود وحرضوا الجموع فرجموا بولس وجروه خارج المدينة ظانين أنه مات، لكنه قام.",
      "image": "/assets/cities/lystra.png",
      "labelPosition": "bottom",
      "labelX": 79.58005249343833,
      "labelY": 38.23191733639495
    },
    {
      "id": "derbe",
      "name": "دربة",
      "x": 81.31233595800525,
      "y": 41.446613088404135,
      "companions": [
        "برنابا"
      ],
      "events": "بشرا في هذه المدينة وتلمذا كثيرين. ثم عادا في نفس الطريق (لسترة وأيقونية وأنطاكية) لتشديد عزائم الكنائس ورسامة قسوس.",
      "image": "/assets/cities/derbe.png",
      "labelPosition": "top-right",
      "labelX": 82.51968503937009,
      "labelY": 40.18369690011481
    },
    {
      "id": "attalia",
      "name": "أتالية",
      "x": 70.70866141732284,
      "y": 42.824339839265214,
      "companions": [
        "برنابا"
      ],
      "events": "نزلا إلى أتالية وتكلما بالكلمة هناك.",
      "labelPosition": "bottom",
      "labelX": 69.71128608923884,
      "labelY": 44.20206659012629
    },
    {
      "id": "return-seleucia",
      "name": "العودة لسلوكية",
      "x": 90.86614173228347,
      "y": 43.85763490241102,
      "companions": [
        "برنابا"
      ],
      "events": "أبحرا من أتالية عائدين إلى سلوكية.",
      "labelPosition": "bottom",
      "labelX": 82.20472440944881,
      "labelY": 30.99885189437428,
      "hideLabel": true
    },
    {
      "id": "return-antioch",
      "name": "العودة لأنطاكية",
      "x": 92.1259842519685,
      "y": 47.072330654420206,
      "companions": [
        "برنابا"
      ],
      "events": "عادوا إلى القاعدة بأنطاكية وأخبروا الكنيسة كيف فتح الله للأمم باب الإيمان.",
      "labelPosition": "bottom-right",
      "labelX": 87.92650918635171,
      "labelY": 31.917336394948336,
      "hideLabel": true
    }
  ]
};

const fileData = fs.readFileSync('src/lib/journeysData.ts', 'utf8');

// Convert object to string but match formatting
let replacement = JSON.stringify(inputJson.journey1, null, 2);
// JSON stringify quotes all keys. Let's make it look like TS for consistency, or just leave it. TypeScript parses JSON objects fine.
// We just need to replace the locations array of journey 1.
// Let's use string manipulation to find the bounds of journey1's locations array.

const journey1Start = fileData.indexOf("id: 'journey1'");
if (journey1Start === -1) throw new Error("Could not find journey1");
const locationsStart = fileData.indexOf("locations: [", journey1Start);
// Find the closing bracket of this array.
let openBrackets = 0;
let arrayEnd = -1;
for (let i = locationsStart + 11; i < fileData.length; i++) {
  if (fileData[i] === '[') openBrackets++;
  if (fileData[i] === ']') {
    if (openBrackets === 1) {
      arrayEnd = i;
      break;
    }
    openBrackets--;
  }
}

if (arrayEnd === -1) throw new Error("Could not find end of locations array");

// Clean up the JSON a bit for TS format (optional)
replacement = replacement.replace(/"([^"]+)":/g, '$1:').replace(/"/g, "'");

const newFileData = fileData.substring(0, locationsStart + 11) + replacement + fileData.substring(arrayEnd + 1);

fs.writeFileSync('src/lib/journeysData.ts', newFileData);
console.log("Replaced successfully!");
