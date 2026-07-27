fetch('http://localhost:3000/api/system/push-broadcast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'تحديث جديد! 📸',
    message: 'دلوقتي تقدر تغير أو تعدل صورتك الشخصية بسهولة من الواجهة الرئيسية. جربها دلوقتي!'
  })
}).then(res => res.json())
  .then(console.log)
  .catch(console.error);
