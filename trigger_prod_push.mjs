fetch('https://al-hekaya.strefqa.com/api/system/push-broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'تحديث جديد! 📸',
    message: 'دلوقتي تقدر تغير صورتك الشخصية بسهولة من الواجهة الرئيسية. جرب تدوس على صورتك!'
  })
}).then(res => res.text())
  .then(console.log)
  .catch(console.error);
