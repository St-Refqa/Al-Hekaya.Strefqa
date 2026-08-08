import sys

file_path = 'E:/Files/Al-Hekaya/public/workshop-orders-7f8b9/app.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

clients_logic = """    // Populate Product Filters
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

    // --- Clients Auto-fill Logic ---
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
    // -------------------------------
"""

old_logic = """    // Populate Product Filters
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
    populateFilter('arrived', categories.arrived);"""

content = content.replace(old_logic, clients_logic)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
