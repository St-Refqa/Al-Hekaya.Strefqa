// Google Sheets JSONP URL
const SHEET_ID = '1qLw0Md1-A9x8Vj_FWg_2B4j_cUOGTAmNTsdoASzvx-c';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=&gid=0`;

// App State
let data = [];

// DOM Elements
const elements = {
    counts: {
        pending: document.getElementById('count-pending'),
        ready: document.getElementById('count-ready'),
        shipped: document.getElementById('count-shipped'),
        arrived: document.getElementById('count-arrived')
    },
    tables: {
        pending: document.querySelector('#table-pending tbody'),
        ready: document.querySelector('#table-ready tbody'),
        shipped: document.querySelector('#table-shipped tbody'),
        arrived: document.querySelector('#table-arrived tbody')
    },
    lastUpdated: document.getElementById('last-updated')
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
                    obj[cols[i]] = cell ? cell.v : null;
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
    // Append callback name to URL
    script.src = GVIZ_URL + '&tqx=responseHandler:processGvizData';
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

    // Render Tables
    renderTable('pending', categories.pending, row => `
        <tr>
            <td>${row['Client Name'] || '-'}</td>
            <td>${row['Date'] || '-'}</td>
            <td>${row['Order Details'] || '-'}</td>
            <td>${row['Quantity'] || '-'}</td>
            <td>${row['Total'] || '0'} ج.م</td>
        </tr>
    `);

    renderTable('ready', categories.ready, row => `
        <tr>
            <td>${row['Client Name'] || '-'}</td>
            <td>${row['Date'] || '-'}</td>
            <td>${row['Order Details'] || '-'}</td>
            <td>${row['المحافطة'] || '-'}</td>
        </tr>
    `);

    renderTable('shipped', categories.shipped, row => `
        <tr>
            <td>${row['Client Name'] || '-'}</td>
            <td>${row['Order Details'] || '-'}</td>
            <td>${row['المحافطة'] || '-'}${row['المنطقة'] ? ' - ' + row['المنطقة'] : ''}</td>
            <td><strong style="color:var(--color-shipped)">${row['The Rest'] || '0'} ج.م</strong></td>
        </tr>
    `);

    renderTable('arrived', categories.arrived, row => `
        <tr>
            <td>${row['Client Name'] || '-'}</td>
            <td>${row['Order Details'] || '-'}</td>
            <td>${row['Payment Method'] || '-'}</td>
            <td><strong style="color:var(--color-arrived)">${row['Total'] || '0'} ج.م</strong></td>
        </tr>
    `);
}

// Helper to render table rows
function renderTable(type, items, rowTemplate) {
    const tbody = elements.tables[type];
    tbody.innerHTML = ''; // clear existing
    
    if (items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">لا يوجد أوردرات في هذه القائمة حالياً</div></td></tr>`;
        return;
    }

    items.forEach(row => {
        tbody.innerHTML += rowTemplate(row);
    });
}

// Run app
document.addEventListener('DOMContentLoaded', init);
