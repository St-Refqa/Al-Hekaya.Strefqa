// Google Sheets JSONP URL
const SHEET_ID = '1qLw0Md1-A9x8Vj_FWg_2B4j_cUOGTAmNTsdoASzvx-c';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=&gid=0`;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9vHPpskDKhZP5h_59V9PYLVoEaKBHqdj9OYU0Jp8WrXfrtQiBfvqEjXHF-EBuR-VH/exec'; 

// App State
let data = [];
window.appOptions = { products: [], governorates: [] };

// Cache DOM elements
const elements = {
    lastUpdated: document.getElementById('last-updated'),
    counts: {
        pending: document.getElementById('count-pending'),
        ready: document.getElementById('count-ready'),
        shipped: document.getElementById('count-shipped'),
        arrived: document.getElementById('count-arrived')
    },
    badges: {
        pending: document.getElementById('badge-pending'),
        ready: document.getElementById('badge-ready'),
        shipped: document.getElementById('badge-shipped'),
        arrived: document.getElementById('badge-arrived')
    },
    lists: {
        pending: document.getElementById('list-pending'),
        designing: document.getElementById('list-designing'),
        printing: document.getElementById('list-printing'),
        received: document.getElementById('list-received'),
        ready: document.getElementById('list-ready'),
        shipped: document.getElementById('list-shipped'),
        arrived: document.getElementById('list-arrived')
    }
};

// Initialize App
function init() {
    fetchFormOptions();
    fetchData();
    // Refresh every 5 minutes (300000 ms)
    setInterval(fetchData, 300000);
}

// Fetch Data using Google Visualization JSONP (No CORS needed)
function fetchData() {
    elements.lastUpdated.textContent = 'جاري التحديث...';
    
    // Define the global callback function for JSONP
    window.processGvizData = function(json) {
        if (json.status !== 'ok') {
            elements.lastUpdated.textContent = 'حدث خطأ أثناء جلب البيانات.';
            return;
        }
        
        // Transform Google Visualization JSON to Array of Objects
        try {
            const cols = json.table.cols.map(c => c ? c.label : '');
            data = json.table.rows.map(row => {
                const obj = {};
                row.c.forEach((cell, i) => {
                    const val = cell ? (cell.f !== undefined ? cell.f : cell.v) : null;
                    obj[cols[i]] = val;
                    obj['col_' + i] = val; // Also save by index (0-based) for reliable access
                });
                return obj;
            });
            
            window.allData = data;
            processData();
            
            const now = new Date();
            elements.lastUpdated.textContent = `آخر تحديث: ${now.toLocaleTimeString('ar-EG')}`;
        } catch (e) {
            console.error('Error processing JSONP data:', e);
            elements.lastUpdated.textContent = 'حدث خطأ: ' + e.message;
        }
        
        // Cleanup script tag
        const oldScript = document.getElementById('gviz-script');
        if (oldScript) oldScript.remove();
    };
    
    // Inject script tag for JSONP
    const script = document.createElement('script');
    script.id = 'gviz-script';
    script.src = GVIZ_URL.replace('out:json', 'out:json;responseHandler:processGvizData') + '&_=' + Date.now();
    script.onerror = function() {
        console.error('Failed to load JSONP script');
        elements.lastUpdated.textContent = 'حدث خطأ في الاتصال بجوجل شيت.';
    };
    
    const oldScript = document.getElementById('gviz-script');
    if (oldScript) oldScript.remove();
    
    document.body.appendChild(script);
}

// Process and categorize data
function processData() {
    let categories = {
        pending: [],
        designing: [],
        printing: [],
        received: [],
        ready: [],
        shipped: [],
        arrived: []
    };

    data.forEach(row => {
        if (row['Delivery By'] && row['Delivery By'].trim().toUpperCase() === 'REJECT') {
            return;
        }

        const isDone = String(row['col_14']).trim().toUpperCase() === 'TRUE';
        const isProcessed = String(row['col_15']).trim().toUpperCase() === 'TRUE';
        const isDelivery = String(row['col_19']).trim().toUpperCase() === 'TRUE';
        const isDesigning = String(row['col_21']).trim().toUpperCase() === 'TRUE';
        const isPrinting = String(row['col_22']).trim().toUpperCase() === 'TRUE';
        const isReceived = String(row['col_23']).trim().toUpperCase() === 'TRUE';

        if (isDone) {
            categories.arrived.push(row);
        } else if (isDelivery) {
            categories.shipped.push(row);
        } else if (isProcessed) {
            categories.ready.push(row);
        } else if (isReceived) {
            categories.received.push(row);
        } else if (isPrinting) {
            categories.printing.push(row);
        } else if (isDesigning) {
            categories.designing.push(row);
        } else {
            if (row['Client Name'] || row['Order Details']) {
                categories.pending.push(row);
            }
        }
    });

    const groupCategory = (catArray, checkPartial = false) => {
        let grouped = [];
        let map = {};
        catArray.forEach(row => {
            let orderId = row['col_16'];
            let client = String(row['Client Name'] || '').trim();
            let key = orderId || client;
            if (!map[key]) {
                map[key] = Object.assign({}, row);
                map[key]._allProducts = [{ details: row['Order Details'], qty: row['Quantity'] }];
                grouped.push(map[key]);
            } else {
                map[key]._allProducts.push({ details: row['Order Details'], qty: row['Quantity'] });
            }
        });
        grouped.forEach(g => {
            g['Order Details'] = g._allProducts.map(p => `${p.details} (x${p.qty || 1})`).join('<br>');
            g['Quantity'] = g._allProducts.reduce((sum, p) => sum + (parseFloat(p.qty)||1), 0);
            g['isGrouped'] = true;
            if (checkPartial) {
                let orderId = g['col_16'];
                let client = String(g['Client Name'] || '').trim();
                let totalOverall = window.allData.filter(r => (orderId && r['col_16'] === orderId) || (!orderId && String(r['Client Name']||'').trim() === client)).length;
                g._readyCount = g._allProducts.length;
                g._totalCount = totalOverall;
                g._isPartial = (g._readyCount < totalOverall);
            }
        });
        return grouped;
    };

    categories.pending = groupCategory(categories.pending);
    categories.designing = groupCategory(categories.designing);
    categories.printing = groupCategory(categories.printing);
    categories.received = groupCategory(categories.received);
    categories.ready = groupCategory(categories.ready, true);
    categories.shipped = groupCategory(categories.shipped);
    categories.arrived = groupCategory(categories.arrived);

    const getCount = (catArray) => catArray.reduce((sum, g) => sum + (g._allProducts ? g._allProducts.length : 1), 0);

    if (elements.counts.pending) elements.counts.pending.textContent = getCount(categories.pending);
    if (document.getElementById('count-designing')) document.getElementById('count-designing').textContent = getCount(categories.designing);
    if (document.getElementById('count-printing')) document.getElementById('count-printing').textContent = getCount(categories.printing);
    if (document.getElementById('count-received')) document.getElementById('count-received').textContent = getCount(categories.received);
    if (elements.counts.ready) elements.counts.ready.textContent = getCount(categories.ready);
    if (elements.counts.shipped) elements.counts.shipped.textContent = getCount(categories.shipped);
    if (elements.counts.arrived) elements.counts.arrived.textContent = getCount(categories.arrived);

    if (elements.badges.pending) elements.badges.pending.textContent = getCount(categories.pending);
    if (document.getElementById('badge-designing')) document.getElementById('badge-designing').textContent = getCount(categories.designing);
    if (document.getElementById('badge-printing')) document.getElementById('badge-printing').textContent = getCount(categories.printing);
    if (document.getElementById('badge-received')) document.getElementById('badge-received').textContent = getCount(categories.received);
    if (elements.badges.ready) elements.badges.ready.textContent = getCount(categories.ready);
    if (elements.badges.shipped) elements.badges.shipped.textContent = getCount(categories.shipped);
    if (elements.badges.arrived) elements.badges.arrived.textContent = getCount(categories.arrived);

    const populateFilter = (type, items) => {
        const select = document.getElementById('filter-' + type);
        if (!select) return;
        
        const currentVal = select.value;
        const products = new Set();
        items.forEach(row => {
            if (row._allProducts) {
                row._allProducts.forEach(p => {
                    if (p.details) products.add(String(p.details).trim());
                });
            } else {
                const p = row['Order Details'] ? String(row['Order Details']).trim() : '';
                if (p) products.add(p);
            }
        });
        
        let html = '<option value="">كل المنتجات</option>';
        Array.from(products).sort().forEach(p => {
            html += `<option value="${p}">${p}</option>`;
        });
        
        select.innerHTML = html;
        if (products.has(currentVal)) select.value = currentVal;
    };
    
    populateFilter('pending', categories.pending);
    populateFilter('designing', categories.designing);
    populateFilter('printing', categories.printing);
    populateFilter('received', categories.received);
    populateFilter('ready', categories.ready);
    populateFilter('shipped', categories.shipped);
    populateFilter('arrived', categories.arrived);

    window.clientsMap = {};
    const clientsList = document.getElementById('clients-list');
    if (clientsList) {
        let clientsHtml = '';
        data.forEach(row => {
            const name = row['Client Name'] ? String(row['Client Name']).trim() : '';
            if (name && !window.clientsMap[name]) {
                window.clientsMap[name] = {
                    phone: row['col_2'] || '',
                    gov: row['col_3'] || '',
                    region: row['col_4'] || ''
                };
                clientsHtml += `<option value="${name}">`;
            }
        });
        clientsList.innerHTML = clientsHtml;
    }

    const clientInput = document.getElementById('order-client');
    if (clientInput && !clientInput.hasAttribute('data-listener')) {
        clientInput.setAttribute('data-listener', 'true');
        clientInput.addEventListener('input', function() {
            const name = this.value.trim();
            if (window.clientsMap && window.clientsMap[name]) {
                document.getElementById('order-phone').value = window.clientsMap[name].phone;
                document.getElementById('order-gov').value = window.clientsMap[name].gov;
                document.getElementById('order-region').value = window.clientsMap[name].region;
            }
        });
    }

    renderAnalytics(data);

    const getWhatsAppLink = (phone, name, status) => {
        if (!phone) return '';
        let cleanedPhone = String(phone).replace(/\D/g, '');
        if (cleanedPhone.startsWith('0')) {
            cleanedPhone = '2' + cleanedPhone;
        } else if (!cleanedPhone.startsWith('20')) {
            cleanedPhone = '20' + cleanedPhone;
        }
        
        let msg = `أهلاً بك أ. ${name || ''} من ورشة الحكاية، `;
        if (status === 'pending') msg += 'جاري حالياً العمل على تجهيز طلبك وسيتم الانتهاء منه قريباً.';
        else if (status === 'ready') msg += 'طلبك الآن جاهز وفي انتظار المندوب لاستلامه وشحنه لك.';
        else if (status === 'shipped') msg += 'تم تسليم طلبك لشركة الشحن وسيتواصلون معك قريباً للتوصيل.';
        else msg += 'نتمنى أن يكون طلبك قد نال إعجابك!';
        
        const encodedMsg = encodeURIComponent(msg);
        return `<a href="https://wa.me/${cleanedPhone}?text=${encodedMsg}" target="_blank" class="btn-whatsapp" title="تواصل عبر واتساب">💬 واتساب</a>`;
    };

    
const getEditDeleteBtns = (row) => `
    <button class="btn-action" style="background-color: #4299e1; color: white; margin-top: 5px;" onclick="openEditModal('${String(row['col_16'] || '').replace(/'/g, "\\'")}', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}', ${row['Quantity'] || 0}, ${row['Price'] || 0}, ${row['Discount'] || 0}, ${row['Total'] || 0})">✏️ تعديل</button>
    <button class="btn-action" style="background-color: #e53e3e; color: white; margin-top: 5px;" onclick="deleteOrder('${String(row['col_16'] || '').replace(/'/g, "\\'")}', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">🗑️ حذف</button>
`;

const isDelayed = (dateStr) => {
        if (!dateStr) return false;
        let orderDate = null;
        if (String(dateStr).startsWith('Date(')) {
            const parts = String(dateStr).match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
            if (parts) {
                orderDate = new Date(parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3]));
            }
        } else {
            orderDate = new Date(dateStr);
        }
        
        if (orderDate && !isNaN(orderDate.getTime())) {
            const today = new Date();
            const diffTime = Math.abs(today - orderDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 3;
        }
        return false;
    };

    renderList('pending', categories.pending, row => `
        <div class="accordion-item ${isDelayed(row['col_1']) ? 'delayed-warning' : ''}" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" class="batch-cb" data-order-id="${String(row['col_16'] || '').replace(/'/g, "\\'")}" data-client-name="${String(row['Client Name'] || '').replace(/"/g, '&quot;')}" data-order-details="${String(row['Order Details'] || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); updateBatchActions()">
                    ${isDelayed(row['col_1']) ? '<span class="delayed-icon" title="أوردر متأخر">⚠️</span>' : ''}
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge">${row['Total'] || '0'} ج.م</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['col_1'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <p><strong>الكمية:</strong> ${row['Quantity'] || '-'}</p>
                <div class="action-container" style="flex-wrap: wrap; gap: 5px;">
                    ${getEditDeleteBtns(row)}
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'pending')}
                    <button class="btn-action" style="background-color: #f6ad55;" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Designed', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">للتصميم 🎨</button>
                    <button class="btn-action" style="background-color: #f6e05e; color: #000;" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Printed', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">للطباعة 🖨️</button>
                    <button class="btn-action" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Processed', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">تجهيز فوراً ✅</button>
                </div>
            </div>
        </div>
    `);

    renderList('designing', categories.designing, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" class="batch-cb" data-order-id="${String(row['col_16'] || '').replace(/'/g, "\\'")}" data-client-name="${String(row['Client Name'] || '').replace(/"/g, '&quot;')}" data-order-details="${String(row['Order Details'] || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); updateBatchActions()">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge" style="background-color: #f6ad55;">جاري التصميم</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['col_1'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'pending')}
                    <button class="btn-action" style="background-color: #f6e05e; color: #000;" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Printed', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">تم التصميم (للطباعة) 🖨️</button>
                    <button class="btn-action" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Processed', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">تخطي للجاهز ✅</button>
                </div>
            </div>
        </div>
    `);

    renderList('printing', categories.printing, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" class="batch-cb" data-order-id="${String(row['col_16'] || '').replace(/'/g, "\\'")}" data-client-name="${String(row['Client Name'] || '').replace(/"/g, '&quot;')}" data-order-details="${String(row['Order Details'] || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); updateBatchActions()">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge" style="background-color: #f6e05e; color: #000;">في الطباعة</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['col_1'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'pending')}
                    <button class="btn-action" style="background-color: #38b2ac; color: white;" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Received', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">تم الاستلام 📥</button>
                </div>
            </div>
        </div>
    `);

    renderList('received', categories.received, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" class="batch-cb" data-order-id="${String(row['col_16'] || '').replace(/'/g, "\\'")}" data-client-name="${String(row['Client Name'] || '').replace(/"/g, '&quot;')}" data-order-details="${String(row['Order Details'] || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); updateBatchActions()">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge" style="background-color: #38b2ac; color: white;">تم الاستلام من المطبعة</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['col_1'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'pending')}
                    <button class="btn-action" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Processed', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">جاهز للشحن ✅</button>
                </div>
            </div>
        </div>
    `);

    renderList('ready', categories.ready, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()} ${(row['المحافطة'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title" style="display: flex; align-items: center; gap: 8px;">
                    ${!row._isPartial ? `<input type="checkbox" class="batch-cb" data-order-id="${String(row['col_16'] || '').replace(/'/g, "\\'")}" data-client-name="${String(row['Client Name'] || '').replace(/"/g, '&quot;')}" data-order-details="${String(row['Order Details'] || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); updateBatchActions()">` : ''}
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    ${row._isPartial ? `<span class="gov-badge" style="background-color: #ed8936; color: white;">⚠️ وصل ${row._readyCount} من ${row._totalCount}</span>` : `<span class="gov-badge" style="background-color: #48bb78; color: white;">✅ مكتمل</span>`}
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['col_1'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'ready')}
                    ${!row._isPartial ? `<button class="btn-action" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Delivery', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">تسليم للشحن</button>` : `<div style="color: #ed8936; font-weight: bold; width: 100%; text-align: center; padding: 10px;">⚠️ الأوردر غير مكتمل، باقي منتجات في التصميم أو المطبعة</div>`}
                </div>
            </div>
        </div>
    `);


    renderList('shipped', categories.shipped, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()} ${(row['المحافطة'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title" style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" class="batch-cb" data-order-id="${String(row['col_16'] || '').replace(/'/g, "\\'")}" data-client-name="${String(row['Client Name'] || '').replace(/"/g, '&quot;')}" data-order-details="${String(row['Order Details'] || '').replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); updateBatchActions()">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge shipped-color">${row['The Rest'] || '0'} ج.م</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <p><strong>المحافظة/المنطقة:</strong> ${row['المحافطة'] || '-'}${row['المنطقة'] ? ' - ' + row['المنطقة'] : ''}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'shipped')}
                    <button class="btn-action" onclick="moveToNextStep('${String(row['col_16'] || '').replace(/'/g, "\\'")}', 'Done', '${String(row['Client Name'] || '').replace(/'/g, "\\'")}', '${String(row['Order Details'] || '').replace(/'/g, "\\'")}')">تم التوصيل</button>
                </div>
            </div>
        </div>
    `);

    renderList('arrived', categories.arrived, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge arrived-color">${row['Total'] || '0'} ج.م</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <p><strong>الدفع:</strong> ${row['Payment Method'] || '-'}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'arrived')}
                    <button class="btn-action" disabled>مكتمل</button>
                </div>
            </div>
        </div>
    `);
}

function renderList(type, items, rowTemplate) {
    const container = elements.lists[type];
    container.innerHTML = ''; 
    
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state">لا يوجد أوردرات في هذه القائمة حالياً</div>`;
        return;
    }

    items.forEach(row => {
        container.innerHTML += rowTemplate(row);
    });
}

let govChartInstance = null;
let productChartInstance = null;

window.switchTab = function(tabId, navItemElement) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active-tab'));
    
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active-tab');
    }
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if (navItemElement) {
        navItemElement.classList.add('active');
    }
    
    if (tabId === 'tab-inventory') {
        renderInventory();
    }
}

window.cachedAnalyticsData = { clients: {}, govs: {} };

window.showStatsDetails = function(type) {
    const titleEl = document.getElementById('stats-details-title');
    const listEl = document.getElementById('stats-details-list');
    
    let dataObj = {};
    if (type === 'clients') {
        titleEl.textContent = 'تفاصيل العملاء / الكنائس';
        dataObj = window.cachedAnalyticsData.clients;
    } else if (type === 'govs') {
        titleEl.textContent = 'المحافظات المستفيدة';
        dataObj = window.cachedAnalyticsData.govs;
    }
    
    const sorted = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
    
    let html = '<table style="width: 100%; text-align: right; border-collapse: collapse;">';
    html += '<thead><tr style="border-bottom: 2px solid #e2e8f0;"><th style="padding: 10px;">الاسم</th><th style="padding: 10px;">عدد الطلبات</th></tr></thead><tbody>';
    
    sorted.forEach(([name, count]) => {
        html += `<tr style="border-bottom: 1px solid #edf2f7;"><td style="padding: 10px;">${name}</td><td style="padding: 10px; font-weight: bold; color: #4a5568;">${count}</td></tr>`;
    });
    
    html += '</tbody></table>';
    
    if (sorted.length === 0) {
        html = '<p style="text-align: center; color: #a0aec0; padding: 20px;">لا توجد بيانات</p>';
    }
    
    listEl.innerHTML = html;
    document.getElementById('stats-details-modal').style.display = 'flex';
};

function renderAnalytics(allData) {
    const validData = allData.filter(row => row['Client Name'] && row['Client Name'] !== '');
    const govCounts = {};
    const productCounts = {};
    
    const clientMap = {};
    const govMap = {};
    let totalItems = 0;
    let totalMoney = 0;

    const normalizeGov = (gov) => {
        if (!gov) return 'غير محدد';
        let g = String(gov).trim();
        if (g === '') return 'غير محدد';
        let simplified = g.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
        if (simplified.includes('اسكندريه')) return 'الإسكندرية';
        if (simplified.includes('جيزه') || simplified.includes('جيره')) return 'الجيزة';
        if (simplified.includes('منوفيه')) return 'المنوفية';
        if (simplified.includes('دقهليه')) return 'الدقهلية';
        if (simplified.includes('اسماعيليه')) return 'الإسماعيلية';
        if (simplified.includes('قاهره')) return 'القاهرة';
        if (simplified.includes('قليوبيه')) return 'القليوبية';
        if (simplified.includes('اردن') || simplified.includes('بره مصر')) return 'خارج مصر';
        if (simplified.includes('اوبر') || simplified.includes('استلام') || simplified.includes('كنيستنا') || simplified.includes('كرنفال') || simplified.includes('مقر')) return 'استلام مباشر';
        // Add "ال" if missing for some governorates
        if (g === 'اسيوط') return 'أسيوط';
        if (g === 'بني سويف') return 'بني سويف';
        if (g === 'سوهاج') return 'سوهاج';
        if (g === 'اسوان') return 'أسوان';
        if (g === 'مطروح') return 'مرسى مطروح';
        if (g === 'قنا') return 'قنا';
        return g;
    };

    validData.forEach(row => {
        const rawGov = row['المحافطة'] ? String(row['المحافطة']).trim() : 'غير محدد';
        const gov = normalizeGov(rawGov);
        
        const product = row['Order Details'] ? String(row['Order Details']).trim() : 'غير محدد';
        
        govCounts[gov] = (govCounts[gov] || 0) + 1;
        productCounts[product] = (productCounts[product] || 0) + 1;
        
        const client = String(row['Client Name']).trim();
        if (client) {
            clientMap[client] = (clientMap[client] || 0) + 1;
        }
        
        if (gov !== 'غير محدد' && gov !== 'استلام مباشر' && gov !== 'خارج مصر') {
            govMap[gov] = (govMap[gov] || 0) + 1;
        }
        
        const qty = parseFloat(row['Quantity']) || 1;
        totalItems += qty;
        
        const total = parseFloat(row['Total']) || 0;
        totalMoney += total;
    });
    
    window.cachedAnalyticsData.clients = clientMap;
    window.cachedAnalyticsData.govs = govMap;
    
    const statClients = document.getElementById('stat-clients');
    if(statClients) statClients.textContent = Object.keys(clientMap).length;
    
    const statGovs = document.getElementById('stat-govs');
    if(statGovs) statGovs.textContent = Object.keys(govMap).length;
    
    const statOrders = document.getElementById('stat-orders');
    if(statOrders) statOrders.textContent = totalItems;
    
    const statMoney = document.getElementById('stat-money');
    if(statMoney) statMoney.textContent = totalMoney.toLocaleString('en-US');

    const govLabels = Object.keys(govCounts).sort((a, b) => govCounts[b] - govCounts[a]).slice(0, 10);
    const govValues = govLabels.map(label => govCounts[label]);

    const prodLabels = Object.keys(productCounts).sort((a, b) => productCounts[b] - productCounts[a]).slice(0, 5);
    const prodValues = prodLabels.map(label => productCounts[label]);

    if (govChartInstance) govChartInstance.destroy();
    if (productChartInstance) productChartInstance.destroy();

    const ctxGov = document.getElementById('govChart').getContext('2d');
    govChartInstance = new Chart(ctxGov, {
        type: 'bar',
        data: {
            labels: govLabels,
            datasets: [{
                label: 'عدد الطلبات',
                data: govValues,
                backgroundColor: '#4299e1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });

    const ctxProd = document.getElementById('productChart').getContext('2d');
    productChartInstance = new Chart(ctxProd, {
        type: 'pie',
        data: {
            labels: prodLabels,
            datasets: [{
                data: prodValues,
                backgroundColor: ['#f6ad55', '#68d391', '#b794f4', '#fc8181', '#4fd1c5']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.refreshData = function() {
    const btn = document.getElementById('refresh-btn');
    if (btn) btn.disabled = true;
    
    document.querySelectorAll('.search-input').forEach(input => input.value = '');
    
    fetchData();
    setTimeout(() => {
        if (btn) btn.disabled = false;
    }, 2000);
};

window.toggleAccordion = function(headerElement) {
    const item = headerElement.parentElement;
    item.classList.toggle('active');
};

window.filterList = function(type) {
    const input = document.getElementById('search-' + type);
    const select = document.getElementById('filter-' + type);
    
    const textFilter = input ? input.value.toLowerCase() : '';
    const productFilter = select ? select.value.toLowerCase() : '';
    
    const container = elements.lists[type];
    const items = container.getElementsByClassName('accordion-item');
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const searchData = item.getAttribute('data-search') || '';
        
        const matchesText = textFilter === '' || searchData.indexOf(textFilter) > -1;
        const matchesProduct = productFilter === '' || searchData.indexOf(productFilter) > -1;
        
        if (matchesText && matchesProduct) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    }
};

window.renderInventory = function() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;
    
    if (!window.appOptions || !window.appOptions.products || window.appOptions.products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري جلب بيانات المخزن... ⏳</td></tr>';
        return;
    }
    
    let html = '';
    window.appOptions.products.forEach(prod => {
        html += `
            <tr>
                <td><strong>${prod.name}</strong></td>
                <td>${prod.orders}</td>
                <td>${prod.inbound}</td>
                <td><span class="total-badge" style="background: ${prod.stock > 0 ? '#c6f6d5; color: #22543d' : '#fed7d7; color: #c53030'}">${prod.stock}</span></td>
                <td>
                    <button class="btn-add-stock" onclick="addStock('${prod.name.replace(/'/g, "\\'")}')">➕ توريد</button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

window.addStock = function(productName) {
    const qtyStr = prompt(`كم عدد القطع التي تريد إضافتها لمخزون المنتج:\n"${productName}" ؟`);
    if (!qtyStr) return;
    
    const qty = parseFloat(qtyStr);
    if (isNaN(qty) || qty <= 0) {
        alert('الرجاء إدخال رقم صحيح أكبر من الصفر.');
        return;
    }

    elements.lastUpdated.textContent = 'جاري إضافة البضاعة...';
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'addStock',
            productName: productName,
            quantity: qty
        })
    }).then(() => {
        alert('تم التوريد بنجاح! جاري التحديث...');
        fetchFormOptions(); 
        elements.lastUpdated.textContent = 'مكتمل';
    }).catch(err => {
        console.error(err);
        alert('حدث خطأ في الاتصال بالسيرفر');
    });
};

window.toggleSidebar = function() {
    const sidebar = document.querySelector('.sidebar');
    if(sidebar) sidebar.classList.toggle('collapsed');
};

let bulkQueue = [];
let bulkCurrentIndex = 0;
let bulkCategory = '';

window.bulkWhatsApp = function(type) {
    const container = document.getElementById('list-' + type);
    if (!container) return;
    const items = container.querySelectorAll('.accordion-item');
    bulkQueue = [];
    items.forEach(item => {
        if (item.style.display !== 'none') {
            const btn = item.querySelector('.btn-whatsapp');
            if (btn) {
                bulkQueue.push({
                    name: item.querySelector('.client-name').textContent,
                    url: btn.href
                });
            }
        }
    });
    if (bulkQueue.length === 0) {
        alert('لا يوجد أوردرات لإرسال رسائل لها.');
        return;
    }
    bulkCategory = type === 'ready' ? 'الأوردرات الجاهزة' : 'في شركة الشحن';
    bulkCurrentIndex = 0;
    showBulkWhatsAppUI();
};

window.showBulkWhatsAppUI = function() {
    let ui = document.getElementById('bulk-whatsapp-ui');
    if (!ui) {
        ui = document.createElement('div');
        ui.id = 'bulk-whatsapp-ui';
        ui.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 9999; width: 300px; border: 2px solid #ed8936;';
        document.body.appendChild(ui);
    }
    ui.style.display = 'block';
    if (bulkCurrentIndex >= bulkQueue.length) {
        ui.innerHTML = `
            <h4 style="margin-top:0; color:#2d3748;">🎉 اكتمل الإرسال!</h4>
            <p>تم الانتهاء من جميع العملاء في قسم (${bulkCategory}).</p>
            <button onclick="this.parentElement.style.display='none'" style="width:100%; padding:10px; background:#4a5568; color:white; border:none; border-radius:5px; cursor:pointer;">إغلاق</button>
        `;
        return;
    }
    const client = bulkQueue[bulkCurrentIndex];
    ui.innerHTML = `
        <h4 style="margin-top:0; color:#2d3748;">رسائل مجمعة (${bulkCategory})</h4>
        <p style="margin-bottom: 10px;"><strong>العميل ${bulkCurrentIndex + 1} من ${bulkQueue.length}:</strong><br> ${client.name}</p>
        <button onclick="sendBulkNext()" style="width:100%; padding:10px; background:#48bb78; color:white; border:none; border-radius:5px; cursor:pointer; font-weight:bold; margin-bottom:10px;">
            إرسال للعميل ( ${client.name} ) 💬
        </button>
        <button onclick="this.parentElement.style.display='none'" style="width:100%; padding:8px; background:#e2e8f0; color:#4a5568; border:none; border-radius:5px; cursor:pointer;">إلغاء</button>
    `;
};

window.sendBulkNext = function() {
    if (bulkCurrentIndex < bulkQueue.length) {
        const client = bulkQueue[bulkCurrentIndex];
        window.open(client.url, '_blank');
        bulkCurrentIndex++;
        setTimeout(showBulkWhatsAppUI, 500);
    }
};

window.fetchFormOptions = function() {
    const prodScript = document.createElement('script');
    prodScript.id = 'gviz-products';
    window.processProductsData = function(json) {
        if (json.status === 'ok') {
            try {
                window.appOptions.products = json.table.rows.map(row => {
                    return {
                        name: row.c[0] ? String(row.c[0].v).trim() : '',
                        price: row.c[3] ? parseFloat(row.c[3].v) || 0 : 0,
                        orders: row.c[6] ? parseFloat(row.c[6].v) || 0 : 0,
                        inbound: row.c[7] ? parseFloat(row.c[7].v) || 0 : 0,
                        stock: row.c[8] ? parseFloat(row.c[8].v) || 0 : 0
                    };
                }).filter(p => p.name);
                document.querySelectorAll('.prod-name').forEach(select => {
                    if (select.tagName.toLowerCase() === 'select') {
                        populateProductSelect(select);
                    }
                });
                if (document.getElementById('tab-inventory').classList.contains('active-tab')) {
                    renderInventory();
                }
            } catch(e) {}
        }
        prodScript.remove();
    };
    prodScript.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:processProductsData&sheet=Products&_=${Date.now()}`;
    document.body.appendChild(prodScript);

    const clientScript = document.createElement('script');
    clientScript.id = 'gviz-clients';
    window.processClientsData = function(json) {
        if (json.status === 'ok') {
            try {
                const govSet = {};
                const clientsSet = {};
                json.table.rows.forEach(row => {
                    const name = row.c[0] ? String(row.c[0].v).trim() : ''; 
                    if (name) clientsSet[name] = true;
                    
                    const gov = row.c[2] ? String(row.c[2].v).trim() : ''; 
                    if (gov) govSet[gov] = true;
                });
                
                window.appOptions.governorates = Object.keys(govSet).sort();
                
                const clientList = document.getElementById('clients-list');
                if (clientList) {
                    clientList.innerHTML = Object.keys(clientsSet).sort().map(c => `<option value="${c}">`).join('');
                }
                
                const govSelect = document.getElementById('order-gov');
                if (govSelect) {
                    const currentGov = govSelect.value;
                    govSelect.innerHTML = '<option value="">اختر المحافظة...</option>' + 
                        window.appOptions.governorates.map(g => `<option value="${g}">${g}</option>`).join('');
                    if (currentGov) govSelect.value = currentGov;
                }
            } catch(e) {}
        }
        clientScript.remove();
    };
    clientScript.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:processClientsData&sheet=Clients&_=${Date.now()}`;
    document.body.appendChild(clientScript);
};

window.populateProductSelect = function(select) {
    const currentVal = select.value;
    select.innerHTML = '<option value="">اختر المنتج...</option>' + 
        window.appOptions.products.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} - ${p.price} ج</option>`).join('');
    if (currentVal) select.value = currentVal;
};

window.addProductRow = function() {
    const container = document.getElementById('products-container');
    const row = document.createElement('div');
    row.className = 'product-entry';
    row.style = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end;';
    
    let optionsHtml = '<option value="">جاري تحميل المنتجات...</option>';
    if (window.appOptions && window.appOptions.products.length > 0) {
        optionsHtml = '<option value="">اختر المنتج...</option>' + 
            window.appOptions.products.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} - ${p.price} ج</option>`).join('');
    }

    row.innerHTML = `
        <div class="form-group" style="flex: 2; margin-bottom: 0;">
            <label>المنتج *</label>
            <select class="prod-name" required onchange="handleProductSelect(this)" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
                ${optionsHtml}
            </select>
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label>الكمية *</label>
            <input type="number" class="prod-qty" value="1" required min="1" onchange="calculateOrderTotals()">
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label>السعر</label>
            <input type="number" class="prod-price" value="0" min="0" onchange="calculateOrderTotals()">
        </div>
        <button type="button" onclick="this.parentElement.remove(); calculateOrderTotals();" style="padding: 10px; background: #e53e3e; color: white; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 0px; height: 42px;">❌</button>
    `;
    container.appendChild(row);
};

window.handleProductSelect = function(select) {
    const option = select.options[select.selectedIndex];
    if (option && option.dataset.price !== undefined) {
        const row = select.closest('.product-entry');
        if (row) {
            const priceInput = row.querySelector('.prod-price');
            if (priceInput) priceInput.value = option.dataset.price;
        }
    }
    calculateOrderTotals();
};

window.calculateOrderTotals = function() {
    let total = 0;
    document.querySelectorAll('.product-entry').forEach(row => {
        const qty = parseFloat(row.querySelector('.prod-qty').value) || 0;
        const price = parseFloat(row.querySelector('.prod-price').value) || 0;
        total += (qty * price);
    });
    
    const discount = parseFloat(document.getElementById('order-discount').value) || 0;
    const finalTotal = Math.max(0, total - discount);
    document.getElementById('order-total').value = finalTotal;
    
    const deposit = parseFloat(document.getElementById('order-deposit').value) || 0;
    const rest = Math.max(0, finalTotal - deposit);
    document.getElementById('order-rest').value = rest;
};

window.submitNewOrder = function(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-order');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ... ⏳';

    const productsArray = [];
    document.querySelectorAll('.product-entry').forEach(row => {
        const name = row.querySelector('.prod-name').value.trim();
        const qty = parseInt(row.querySelector('.prod-qty').value) || 1;
        const price = parseFloat(row.querySelector('.prod-price').value) || 0;
        if (name) {
            productsArray.push({ name: name, qty: qty, price: price });
        }
    });

    const payload = {
        action: 'addOrder',
        clientName: document.getElementById('order-client').value,
        phone: document.getElementById('order-phone').value,
        gov: document.getElementById('order-gov').value,
        region: document.getElementById('order-region').value,
        products: JSON.stringify(productsArray),
        total: document.getElementById('order-total').value,
        discount: document.getElementById('order-discount').value,
        deposit: document.getElementById('order-deposit').value,
        deposit_method: document.getElementById('order-deposit-method').value,
        the_rest: document.getElementById('order-rest').value
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(payload)
    }).then(() => {
        alert('تم حفظ الأوردر بنجاح! سيظهر في قسم (مطلوبة ولسه متحضرتش) بعد ثواني.');
        document.getElementById('add-order-form').reset();
        document.getElementById('products-container').innerHTML = `
            <div class="product-entry" style="display: flex; gap: 10px; margin-bottom: 10px; align-items: flex-end;">
                <div class="form-group" style="flex: 2; margin-bottom: 0;">
                    <label>المنتج *</label>
                    <select class="prod-name" required onchange="handleProductSelect(this)" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
                        <option value="">اختر المنتج...</option>
                        ${window.appOptions.products.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} - ${p.price} ج</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label>الكمية *</label>
                    <input type="number" class="prod-qty" value="1" required min="1" onchange="calculateOrderTotals()">
                </div>
                <div class="form-group" style="flex: 1; margin-bottom: 0;">
                    <label>السعر</label>
                    <input type="number" class="prod-price" value="0" min="0" onchange="calculateOrderTotals()">
                </div>
            </div>
        `;
        calculateOrderTotals();
        refreshData();
        switchTab('tab-home', document.querySelectorAll('.nav-item')[0]);
    }).catch(err => {
        console.error(err);
        alert('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    }).finally(() => {
        btn.disabled = false;
        btn.textContent = 'حفظ الأوردر 💾';
    });
};

window.moveToNextStep = function(orderId, nextStepColumn, clientName, groupedDetails) {
    if (!APPS_SCRIPT_URL) {
        alert('لم يتم ربط الأزرار بجوجل شيت بعد. يرجى إضافة رابط Google Apps Script أولاً في الكود.');
        return;
    }
    
    const confirmMsg = `هل أنت متأكد من ترحيل الأوردر الخاص بـ "${clientName}"؟`;
    if (!confirm(confirmMsg)) return;

    // Extract all product names from the grouped details
    const allProducts = groupedDetails ? groupedDetails.split('<br>').map(p => p.replace(/ \(x\d+\)/, '').trim()).join('|||') : '';

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            action: 'updateStatus',
            orderId: orderId || '',
            clientName: clientName || '',
            orderDetails: allProducts,
            nextStep: nextStepColumn
        })
    }).then(() => {
        refreshData();
    }).catch(err => {
        console.error(err);
        alert('حدث خطأ في الاتصال بالسيرفر');
    });
};

window.switchCategory = function(category) {
    const sections = ['pending', 'designing', 'printing', 'received', 'ready', 'shipped', 'arrived'];
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
    
    // Clear checkboxes when switching
    document.querySelectorAll('.batch-cb').forEach(cb => cb.checked = false);
    if(window.updateBatchActions) window.updateBatchActions();
};

// Batch Actions
window.updateBatchActions = function() {
    const sections = ['pending', 'designing', 'printing', 'received', 'ready', 'shipped'];
    sections.forEach(sec => {
        const sectionEl = document.getElementById('section-' + sec);
        if (!sectionEl) return;
        
        const checkboxes = sectionEl.querySelectorAll('.batch-cb:checked');
        const count = checkboxes.length;
        const actionBar = document.getElementById('batch-actions-' + sec);
        const countSpan = document.getElementById('batch-count-' + sec);
        
        if (actionBar && countSpan) {
            if (count > 0) {
                actionBar.style.display = 'flex';
                countSpan.textContent = 'تم تحديد ' + count + ' أوردر';
            } else {
                actionBar.style.display = 'none';
            }
        }
    });
};

window.batchMove = function(nextStep) {
    const sections = ['pending', 'designing', 'printing', 'received', 'ready', 'shipped'];
    let activeSec = '';
    sections.forEach(sec => {
        if (document.getElementById('section-' + sec).style.display !== 'none') {
            activeSec = sec;
        }
    });
    
    if (!activeSec) return;
    
    const checkboxes = document.getElementById('section-' + activeSec).querySelectorAll('.batch-cb:checked');
    if (checkboxes.length === 0) return;
    
    if (!confirm('هل أنت متأكد من نقل ' + checkboxes.length + ' أوردر؟')) return;
    
    if (!APPS_SCRIPT_URL) {
        alert('لم يتم ربط الأزرار بجوجل شيت بعد.');
        return;
    }
    
    const orders = [];
    checkboxes.forEach(cb => {
        orders.push({
            orderId: cb.getAttribute('data-order-id'),
            clientName: cb.getAttribute('data-client-name'),
            orderDetails: cb.getAttribute('data-order-details')
        });
    });
    
    const actionBar = document.getElementById('batch-actions-' + activeSec);
    const buttons = actionBar.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    });
    document.getElementById('batch-count-' + activeSec).textContent = 'جاري الترحيل... يرجى الانتظار';
    
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            action: 'updateStatusBatch',
            orders: JSON.stringify(orders),
            nextStep: nextStep
        })
    }).then(() => {
        setTimeout(() => {
            refreshData();
        }, 1500);
    }).catch(error => {
        console.error('Error:', error);
        alert('حدث خطأ أثناء الترحيل.');
        refreshData();
    });
};

// Run app
document.addEventListener('DOMContentLoaded', init);

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
