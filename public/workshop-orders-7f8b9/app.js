// Google Sheets JSONP URL
const SHEET_ID = '1qLw0Md1-A9x8Vj_FWg_2B4j_cUOGTAmNTsdoASzvx-c';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=&gid=0`;

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
            
            processData();
            
            const now = new Date();
            elements.lastUpdated.textContent = `آخر تحديث: ${now.toLocaleTimeString('ar-EG')}`;
        } catch (e) {
            console.error('Error processing JSONP data:', e);
            elements.lastUpdated.textContent = 'حدث خطأ أثناء معالجة البيانات.';
        }
        
        // Cleanup script tag
        const oldScript = document.getElementById('gviz-script');
        if (oldScript) oldScript.remove();
    };
    
    // Inject script tag for JSONP
    const script = document.createElement('script');
    script.id = 'gviz-script';
    // Use semicolon to separate tqx options in Google Visualization API
    script.src = GVIZ_URL.replace('out:json', 'out:json;responseHandler:processGvizData');
    script.onerror = function() {
        console.error('Failed to load JSONP script');
        elements.lastUpdated.textContent = 'حدث خطأ في الاتصال بجوجل شيت.';
    };
    
    // Remove previous script if it got stuck
    const oldScript = document.getElementById('gviz-script');
    if (oldScript) oldScript.remove();
    
    document.body.appendChild(script);
}

// Process and categorize data
function processData() {
    // Arrays for each category
    const categories = {
        pending: [],
        ready: [],
        shipped: [],
        arrived: []
    };

    data.forEach(row => {
        // Skip Rejected Orders if column U is 'Reject'
        if (row['Delivery By'] && row['Delivery By'].trim().toUpperCase() === 'REJECT') {
            return;
        }

        // Parsing booleans using hardcoded column indices (0-based array)
        // Column O = index 14 (التجهيز)
        // Column P = index 15 (الشحن)
        // Column T = index 19 (الوصول)
        const isProcessed = String(row['col_14']).trim().toUpperCase() === 'TRUE';
        const isDelivery = String(row['col_15']).trim().toUpperCase() === 'TRUE';
        const isDone = String(row['col_19']).trim().toUpperCase() === 'TRUE';

        // Categorization Logic
        if (isDone) {
            // 4. وصلت
            categories.arrived.push(row);
        } else if (isDelivery) {
            // 3. في شركة الشحن (Delivery = true, Done = false)
            categories.shipped.push(row);
        } else if (isProcessed) {
            // 2. جاهزة وعايزة تتشحن (Processed = true, Delivery = false, Done = false)
            categories.ready.push(row);
        } else {
            // 1. مطلوبة ولسه متحضرتش (Processed = false, Delivery = false, Done = false)
            // Ensure it has at least a Client Name or Number so we don't count empty rows
            if (row['Client Name'] || row['Order Details']) {
                categories.pending.push(row);
            }
        }
    });

    // Update Counts (Top Stats)
    if (elements.counts.pending) elements.counts.pending.textContent = categories.pending.length;
    if (elements.counts.ready) elements.counts.ready.textContent = categories.ready.length;
    if (elements.counts.shipped) elements.counts.shipped.textContent = categories.shipped.length;
    if (elements.counts.arrived) elements.counts.arrived.textContent = categories.arrived.length;

    // Update Section Badges
    if (elements.badges.pending) elements.badges.pending.textContent = categories.pending.length;
    if (elements.badges.ready) elements.badges.ready.textContent = categories.ready.length;
    if (elements.badges.shipped) elements.badges.shipped.textContent = categories.shipped.length;
    if (elements.badges.arrived) elements.badges.arrived.textContent = categories.arrived.length;

    // Initialize the first category tab if no active style is set
    if (!document.getElementById('card-pending') || !document.getElementById('card-pending').style.opacity) {
        switchCategory('pending');
    }

    // Populate Product Filters
    const populateFilter = (type, items) => {
        const select = document.getElementById('filter-' + type);
        if (!select) return;
        
        // Save current selection if any
        const currentVal = select.value;
        
        const products = new Set();
        items.forEach(row => {
            const p = row['Order Details'] ? String(row['Order Details']).trim() : '';
            if (p) products.add(p);
        });
        
        let html = '<option value="">كل المنتجات</option>';
        Array.from(products).sort().forEach(p => {
            html += `<option value="${p}">${p}</option>`;
        });
        
        select.innerHTML = html;
        if (products.has(currentVal)) {
            select.value = currentVal;
        }
    };
    
    populateFilter('pending', categories.pending);
    populateFilter('ready', categories.ready);
    populateFilter('shipped', categories.shipped);
    populateFilter('arrived', categories.arrived);

    // Render Analytics
    renderAnalytics(data);

    // Helper to format WhatsApp link
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

    // Helper to check if order is delayed (older than 3 days)
    const isDelayed = (dateStr) => {
        if (!dateStr) return false;
        // Parse "Date" object string if it comes as "Date(2026, 6, 26)" from Google JSON
        let orderDate = null;
        if (String(dateStr).startsWith('Date(')) {
            const parts = String(dateStr).match(/Date\((\d+),\s*(\d+),\s*(\d+)/);
            if (parts) {
                // Month in JS is 0-indexed, but Google JSON is also 0-indexed for month
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

    // Render Accordion Lists
    renderList('pending', categories.pending, row => `
        <div class="accordion-item ${isDelayed(row['col_1']) ? 'delayed-warning' : ''}" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title">
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
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'pending')}
                    <button class="btn-action" onclick="moveToNextStep('${(row['Client Name'] || '').replace(/'/g, "\\'")}', '${(row['Order Details'] || '').replace(/'/g, "\\'")}', 'Processed', '${row['Quantity'] || 1}')">تجهيز الأوردر</button>
                </div>
            </div>
        </div>
    `);

    renderList('ready', categories.ready, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()} ${(row['المحافطة'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="gov-badge">${row['المحافطة'] || '-'}</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['col_1'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <div class="action-container">
                    ${getWhatsAppLink(row['col_2'], row['Client Name'], 'ready')}
                    <button class="btn-action" onclick="moveToNextStep('${(row['Client Name'] || '').replace(/'/g, "\\'")}', '${(row['Order Details'] || '').replace(/'/g, "\\'")}', 'Delivery')">تسليم للشحن</button>
                </div>
            </div>
        </div>
    `);

    renderList('shipped', categories.shipped, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()} ${(row['المحافطة'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title">
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
                    <button class="btn-action" onclick="moveToNextStep('${(row['Client Name'] || '').replace(/'/g, "\\'")}', '${(row['Order Details'] || '').replace(/'/g, "\\'")}', 'Done')">تم التوصيل</button>
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

// Helper to render accordion lists
function renderList(type, items, rowTemplate) {
    const container = elements.lists[type];
    container.innerHTML = ''; // clear existing
    
    if (items.length === 0) {
        container.innerHTML = `<div class="empty-state">لا يوجد أوردرات في هذه القائمة حالياً</div>`;
        return;
    }

    items.forEach(row => {
        container.innerHTML += rowTemplate(row);
    });
}

// Chart Variables
let govChartInstance = null;
let productChartInstance = null;

window.switchTab = function(tabId, navItemElement) {
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active-tab'));
    
    // Show selected tab
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active-tab');
    }
    
    // Update Sidebar highlighting
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if (navItemElement) {
        navItemElement.classList.add('active');
    }
    
    // If switching to inventory, trigger render
    if (tabId === 'tab-inventory') {
        renderInventory();
    }
}

function renderAnalytics(allData) {
    const validData = allData.filter(row => row['Client Name'] && row['Client Name'] !== '');
    
    // 1. Governorate Stats
    const govCounts = {};
    // 2. Product Stats
    const productCounts = {};

    validData.forEach(row => {
        const gov = row['المحافطة'] ? String(row['المحافطة']).trim() : 'غير محدد';
        const product = row['Order Details'] ? String(row['Order Details']).trim() : 'غير محدد';
        
        govCounts[gov] = (govCounts[gov] || 0) + 1;
        productCounts[product] = (productCounts[product] || 0) + 1;
    });

    // Prepare Gov Chart Data
    const govLabels = Object.keys(govCounts).sort((a, b) => govCounts[b] - govCounts[a]).slice(0, 10);
    const govValues = govLabels.map(label => govCounts[label]);

    // Prepare Product Chart Data
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

// Interactivity Functions
window.scrollToSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

window.refreshData = function() {
    const btn = document.getElementById('refresh-btn');
    if (btn) btn.disabled = true;
    
    // Clear search inputs
    document.querySelectorAll('.search-input').forEach(input => input.value = '');
    
    fetchData();
    setTimeout(() => {
        if (btn) btn.disabled = false;
    }, 2000);
};

// Accordion Toggle Logic
window.toggleAccordion = function(headerElement) {
    const item = headerElement.parentElement;
    item.classList.toggle('active');
};

// Search Filter Logic
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
        
        // Exact match for product filter (if selected), fuzzy match for text search
        const matchesText = textFilter === '' || searchData.indexOf(textFilter) > -1;
        const matchesProduct = productFilter === '' || searchData.indexOf(productFilter) > -1;
        
        if (matchesText && matchesProduct) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    }
};

// Inventory Logic
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
                <td><span class="total-badge" style="background: ${prod.stock < 10 ? '#fed7d7; color: #c53030' : '#c6f6d5; color: #22543d'}">${prod.stock}</span></td>
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
    // Fetch Products
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
                if (document.getElementById('tab-inventory').style.display === 'block') {
                    renderInventory();
                }
            } catch(e) {}
        }
        prodScript.remove();
    };
    prodScript.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:processProductsData&sheet=Products`;
    document.body.appendChild(prodScript);

    // Fetch Clients (Governorates and Names)
    const clientScript = document.createElement('script');
    clientScript.id = 'gviz-clients';
    window.processClientsData = function(json) {
        if (json.status === 'ok') {
            try {
                const govSet = {};
                const clientsSet = {};
                json.table.rows.forEach(row => {
                    const name = row.c[0] ? String(row.c[0].v).trim() : ''; // Col A is index 0
                    if (name) clientsSet[name] = true;
                    
                    const gov = row.c[2] ? String(row.c[2].v).trim() : ''; // Col C is index 2
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
    clientScript.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json;responseHandler:processClientsData&sheet=Clients`;
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

    let detailsStr = '';
    let totalQty = 0;
    document.querySelectorAll('.product-entry').forEach(row => {
        const name = row.querySelector('.prod-name').value.trim();
        const qty = parseInt(row.querySelector('.prod-qty').value) || 1;
        if (name) {
            detailsStr += `${name} (x${qty}), `;
            totalQty += qty;
        }
    });
    detailsStr = detailsStr.replace(/, $/, '');

    const payload = {
        action: 'addOrder',
        clientName: document.getElementById('order-client').value,
        phone: document.getElementById('order-phone').value,
        gov: document.getElementById('order-gov').value,
        region: document.getElementById('order-region').value,
        details: detailsStr,
        qty: totalQty,
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
                    <input type="text" class="prod-name" required placeholder="اسم المنتج...">
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

// Run app
document.addEventListener('DOMContentLoaded', init);
      });
};

// This URL will be updated once the user deploys the Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9vHPpskDKhZP5h_59V9PYLVoEaKBHqdj9OYU0Jp8WrXfrtQiBfvqEjXHF-EBuR-VH/exec'; 

window.moveToNextStep = function(clientName, orderDetails, nextStepColumn, quantity = 1) {
    if (!APPS_SCRIPT_URL) {
        alert('لم يتم ربط الأزرار بجوجل شيت بعد. يرجى إضافة رابط Google Apps Script أولاً في الكود.');
        return;
    }
    
    const confirmMsg = `هل أنت متأكد من ترحيل الأوردر الخاص بـ "${clientName}"؟`;
    if (!confirm(confirmMsg)) return;
    
    // Disable all action buttons to prevent double clicks
    document.querySelectorAll('.btn-action').forEach(b => b.disabled = true);
    elements.lastUpdated.textContent = 'جاري ترحيل الأوردر...';
    
    fetch(APPS_SCRIPT_URL, {
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
      });
};

// Run app
document.addEventListener('DOMContentLoaded', init);

 w i n d o w . s w i t c h C a t e g o r y   =   f u n c t i o n ( c a t e g o r y )   { 
         c o n s t   s e c t i o n s   =   [ ' p e n d i n g ' ,   ' r e a d y ' ,   ' s h i p p e d ' ,   ' a r r i v e d ' ] ; 
         s e c t i o n s . f o r E a c h ( s e c   = >   { 
                 c o n s t   e l   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' s e c t i o n - '   +   s e c ) ; 
                 i f   ( e l )   e l . s t y l e . d i s p l a y   =   ' n o n e ' ; 
                 
                 c o n s t   c a r d   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' c a r d - '   +   s e c ) ; 
                 i f   ( c a r d )   { 
                         c a r d . s t y l e . o p a c i t y   =   ' 0 . 5 ' ; 
                         c a r d . s t y l e . t r a n s f o r m   =   ' s c a l e ( 0 . 9 8 ) ' ; 
                         c a r d . s t y l e . b o x S h a d o w   =   ' n o n e ' ; 
                 } 
         } ) ; 
         
         c o n s t   a c t i v e S e c t i o n   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' s e c t i o n - '   +   c a t e g o r y ) ; 
         i f   ( a c t i v e S e c t i o n )   a c t i v e S e c t i o n . s t y l e . d i s p l a y   =   ' b l o c k ' ; 
         
         c o n s t   a c t i v e C a r d   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' c a r d - '   +   c a t e g o r y ) ; 
         i f   ( a c t i v e C a r d )   { 
                 a c t i v e C a r d . s t y l e . o p a c i t y   =   ' 1 ' ; 
                 a c t i v e C a r d . s t y l e . t r a n s f o r m   =   ' s c a l e ( 1 . 0 2 ) ' ; 
                 a c t i v e C a r d . s t y l e . b o x S h a d o w   =   ' 0   4 p x   6 p x   r g b a ( 0 , 0 , 0 , 0 . 1 ) ' ; 
                 a c t i v e C a r d . s t y l e . t r a n s i t i o n   =   ' a l l   0 . 3 s   e a s e ' ; 
         } 
 } ; 
  
 