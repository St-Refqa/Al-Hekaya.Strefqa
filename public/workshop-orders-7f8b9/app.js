// Google Sheets JSONP URL
const SHEET_ID = '1qLw0Md1-A9x8Vj_FWg_2B4j_cUOGTAmNTsdoASzvx-c';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=&gid=0`;

// App State
let data = [];

// Cache DOM elements
const elements = {
    lastUpdated: document.getElementById('last-updated'),
    counts: {
        pending: document.getElementById('count-pending'),
        ready: document.getElementById('count-ready'),
        shipped: document.getElementById('count-shipped'),
        arrived: document.getElementById('count-arrived')
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
                    obj[cols[i]] = cell ? (cell.f !== undefined ? cell.f : cell.v) : null;
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

        // Parsing booleans (Assuming they come as 'TRUE' or 'FALSE' string or similar)
        const isDone = String(row['Done']).trim().toUpperCase() === 'TRUE';
        const isProcessed = String(row['Processed']).trim().toUpperCase() === 'TRUE';
        const isDelivery = String(row['Delivery']).trim().toUpperCase() === 'TRUE';

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

    // Update Counts
    elements.counts.pending.textContent = categories.pending.length;
    elements.counts.ready.textContent = categories.ready.length;
    elements.counts.shipped.textContent = categories.shipped.length;
    elements.counts.arrived.textContent = categories.arrived.length;

    // Render Accordion Lists
    renderList('pending', categories.pending, row => `
        <div class="accordion-item" data-search="${(row['Client Name'] || '').toLowerCase()} ${(row['Order Details'] || '').toLowerCase()}">
            <div class="accordion-header" onclick="toggleAccordion(this)">
                <div class="accordion-title">
                    <span class="client-name">${row['Client Name'] || '-'}</span>
                    <span class="total-badge">${row['Total'] || '0'} ج.م</span>
                </div>
                <div class="accordion-arrow">🔽</div>
            </div>
            <div class="accordion-content">
                <p><strong>التاريخ:</strong> ${row['Date'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <p><strong>الكمية:</strong> ${row['Quantity'] || '-'}</p>
                <div class="action-container">
                    <button class="btn-action" onclick="moveToNextStep('${(row['Client Name'] || '').replace(/'/g, "\\'")}', '${(row['Order Details'] || '').replace(/'/g, "\\'")}', 'Processed')">تجهيز الأوردر</button>
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
                <p><strong>التاريخ:</strong> ${row['Date'] || '-'}</p>
                <p><strong>التفاصيل:</strong> ${row['Order Details'] || '-'}</p>
                <div class="action-container">
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
    const filter = input.value.toLowerCase();
    const container = elements.lists[type];
    const items = container.getElementsByClassName('accordion-item');
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const searchData = item.getAttribute('data-search') || '';
        if (searchData.indexOf(filter) > -1) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    }
};

// This URL will be updated once the user deploys the Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx9vHPpskDKhZP5h_59V9PYLVoEaKBHqdj9OYU0Jp8WrXfrtQiBfvqEjXHF-EBuR-VH/exec'; 

window.moveToNextStep = function(clientName, orderDetails, nextStepColumn) {
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
            nextStep: nextStepColumn
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
