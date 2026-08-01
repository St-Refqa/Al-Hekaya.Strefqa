const fs = require('fs');
let content = fs.readFileSync('public/workshop-orders-7f8b9/app.js', 'utf8');

const helper = `
const getEditDeleteBtns = (row) => \`
    <button class="btn-action" style="background-color: #4299e1; color: white; margin-top: 5px;" onclick="openEditModal('\${String(row['col_16'] || '').replace(/'/g, "\\\\'")}', '\${String(row['Client Name'] || '').replace(/'/g, "\\\\'")}', '\${String(row['Order Details'] || '').replace(/'/g, "\\\\'")}', \${row['Quantity'] || 0}, \${row['Price'] || 0}, \${row['Discount'] || 0}, \${row['Total'] || 0})">✏️ تعديل</button>
    <button class="btn-action" style="background-color: #e53e3e; color: white; margin-top: 5px;" onclick="deleteOrder('\${String(row['col_16'] || '').replace(/'/g, "\\\\'")}', '\${String(row['Client Name'] || '').replace(/'/g, "\\\\'")}', '\${String(row['Order Details'] || '').replace(/'/g, "\\\\'")}')">🗑️ حذف</button>
\`;
`;

content = content.replace('const isDelayed = (dateStr) => {', helper + '\nconst isDelayed = (dateStr) => {');
content = content.replace(/<div class="action-container" style="flex-wrap: wrap; gap: 5px;">/g, '<div class="action-container" style="flex-wrap: wrap; gap: 5px;">\n                    ${getEditDeleteBtns(row)}');

// Add front-end javascript logic for the modals and fetching
const newFunctions = `
window.openEditModal = function(orderId, clientName, orderDetails, qty, price, discount, total) {
    document.getElementById('edit-order-id').value = orderId;
    document.getElementById('edit-client-name').value = clientName;
    document.getElementById('edit-order-details').value = orderDetails;
    document.getElementById('edit-qty').value = qty;
    document.getElementById('edit-price').value = price;
    document.getElementById('edit-discount').value = discount;
    document.getElementById('edit-total').value = total;
    document.getElementById('edit-modal').style.display = 'flex';
};

const editForm = document.getElementById('edit-order-form');
if (editForm) {
    editForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!APPS_SCRIPT_URL) return alert('لم يتم ربط الأزرار بجوجل شيت بعد.');
        
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'جاري الحفظ...';
        btn.disabled = true;

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'editOrder',
                orderId: document.getElementById('edit-order-id').value,
                clientName: document.getElementById('edit-client-name').value,
                orderDetails: document.getElementById('edit-order-details').value,
                qty: document.getElementById('edit-qty').value,
                price: document.getElementById('edit-price').value,
                discount: document.getElementById('edit-discount').value,
                total: document.getElementById('edit-total').value
            })
        }).then(() => {
            document.getElementById('edit-modal').style.display = 'none';
            btn.textContent = originalText;
            btn.disabled = false;
            refreshData();
        }).catch(err => {
            console.error(err);
            alert('حدث خطأ في الاتصال بالسيرفر');
            btn.textContent = originalText;
            btn.disabled = false;
        });
    });
}

window.deleteOrder = function(orderId, clientName, orderDetails) {
    if (!APPS_SCRIPT_URL) return alert('لم يتم ربط الأزرار بجوجل شيت بعد.');
    if (!confirm('هل أنت متأكد من حذف هذا الأوردر نهائياً؟')) return;

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'deleteOrder',
            orderId: orderId,
            clientName: clientName,
            orderDetails: orderDetails
        })
    }).then(() => {
        refreshData();
    }).catch(err => {
        console.error(err);
        alert('حدث خطأ في الاتصال بالسيرفر');
    });
};

const newProductForm = document.getElementById('new-product-form');
if (newProductForm) {
    newProductForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!APPS_SCRIPT_URL) return alert('لم يتم ربط الأزرار بجوجل شيت بعد.');
        
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = 'جاري الإضافة...';
        btn.disabled = true;

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'addProduct',
                name: document.getElementById('p-name').value,
                cost: document.getElementById('p-cost').value,
                price: document.getElementById('p-price').value
            })
        }).then(() => {
            alert('تم إضافة المنتج بنجاح');
            document.getElementById('new-product-form').reset();
            btn.textContent = originalText;
            btn.disabled = false;
        }).catch(err => {
            console.error(err);
            alert('حدث خطأ في الاتصال بالسيرفر');
            btn.textContent = originalText;
            btn.disabled = false;
        });
    });
}
`;

content += '\n' + newFunctions;

fs.writeFileSync('public/workshop-orders-7f8b9/app.js', content);
console.log('done');
