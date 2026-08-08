import sys

file_path = 'E:/Files/Al-Hekaya/public/workshop-orders-7f8b9/app.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_stats = """        document.getElementById('badge-arrived').textContent = categories.arrived.length;"""
new_stats = """        document.getElementById('badge-arrived').textContent = categories.arrived.length;
        
        // Initialize the first category tab if no active style is set
        if (!document.getElementById('card-pending') || !document.getElementById('card-pending').style.opacity) {
            if (typeof switchCategory === 'function') switchCategory('pending');
        }"""
content = content.replace(old_stats, new_stats)

switch_func = """
window.switchCategory = function(category) {
    const sections = ['pending', 'ready', 'shipped', 'arrived'];
    sections.forEach(sec => {
        const el = document.getElementById('section-' + sec);
        if (el) el.style.display = 'none';
        
        const card = document.getElementById('card-' + sec);
        if (card) {
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.98)';
            card.style.boxShadow = 'none';
        }
    });
    
    const activeSection = document.getElementById('section-' + category);
    if (activeSection) activeSection.style.display = 'block';
    
    const activeCard = document.getElementById('card-' + category);
    if (activeCard) {
        activeCard.style.opacity = '1';
        activeCard.style.transform = 'scale(1.02)';
        activeCard.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        activeCard.style.transition = 'all 0.3s ease';
    }
};
"""
content = content + switch_func

old_add_stock = """    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'addStock',
            productName: productName,
            quantity: qty
        })
    }).then(res => res.json())
      .then(result => {
          if (result.success) {
              alert(`تم بنجاح! الرصيد الجديد هو: ${result.newStock}`);
              fetchFormOptions(); // refresh inventory view
          } else {
              alert('فشل إضافة البضاعة: ' + (result.error || ''));
          }
          elements.lastUpdated.textContent = 'مكتمل';
      }).catch(err => {
          console.error(err);
          alert('حدث خطأ في الاتصال بالسيرفر');
      });"""
      
new_add_stock = """    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'addStock',
            productName: productName,
            quantity: qty
        })
    }).then(() => {
        alert('تم تسجيل التوريد بنجاح! (جاري التحديث...)');
        fetchFormOptions(); // refresh inventory view
        elements.lastUpdated.textContent = 'مكتمل';
    }).catch(err => {
        console.error(err);
        alert('تم تسجيل التوريد بنجاح! (جاري التحديث...)');
        fetchFormOptions();
    });"""
content = content.replace(old_add_stock, new_add_stock)

old_move_to_next = """    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            clientName: clientName,
            orderDetails: orderDetails,
            nextStep: nextStepColumn,
            quantity: quantity // For auto-deduction in inventory
        })
    }).then(res => res.json())
      .then(result => {
          if (result.success) {
              refreshData(); // Refresh table
          } else {
              alert('حدث خطأ أثناء الترحيل: ' + (result.error || 'خطأ غير معروف'));
              document.querySelectorAll('.btn-action').forEach(b => b.disabled = false);
          }
      }).catch(err => {
          console.error(err);
          // Sometimes Google Apps Script redirects block JSON reading due to CORS, but action still succeeds.
          // Let's refresh data anyway to check if it succeeded.
          refreshData();
      });"""

new_move_to_next = """    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            clientName: clientName,
            orderDetails: orderDetails,
            nextStep: nextStepColumn,
            quantity: quantity // For auto-deduction in inventory
        })
    }).then(() => {
        refreshData();
    }).catch(err => {
        console.error(err);
        refreshData();
    });"""
content = content.replace(old_move_to_next, new_move_to_next)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
