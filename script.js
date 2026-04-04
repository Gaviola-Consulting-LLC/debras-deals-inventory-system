// Debra's Deals Inventory System

// Data storage using localStorage
let products = JSON.parse(localStorage.getItem('products')) || [];
let sales = JSON.parse(localStorage.getItem('sales')) || [];
let revenue = parseFloat(localStorage.getItem('revenue')) || 0;

// Ensure products have new fields
products = products.map(p => ({
    sku: p.sku,
    name: p.name,
    cost: p.cost || 0,
    price: p.price,
    quantity: p.quantity,
    location: p.location || '',
    hyperlink: p.hyperlink || '',
    notes: p.notes || []
}));

// Ensure sales have pickedUp and profit
sales = sales.map(s => ({
    ...s,
    pickedUp: s.pickedUp || false,
    profit: s.profit !== undefined ? s.profit : ((s.price - (products.find(p => p.sku === s.sku)?.cost || 0)) * s.quantity)
}));

// Filtered sales for details view
let filteredSales = sales;
let isSortedByLocation = false;
let filteredProducts = products;

// DOM elements
const mainContent = document.getElementById('mainContent');
const uploadSpreadsheetBtn = document.getElementById('uploadSpreadsheetBtn');
const addProductBtn = document.getElementById('addProductBtn');
const viewInventoryBtn = document.getElementById('viewInventoryBtn');
const scanSkuBtn = document.getElementById('scanSkuBtn');
const makeSaleBtn = document.getElementById('makeSaleBtn');
const salesSummaryBtn = document.getElementById('salesSummaryBtn');
const salesDetailsBtn = document.getElementById('salesDetailsBtn');

// Event listeners
uploadSpreadsheetBtn.addEventListener('click', showUploadForm);
addProductBtn.addEventListener('click', showAddProductForm);
viewInventoryBtn.addEventListener('click', showInventory);
scanSkuBtn.addEventListener('click', showScanForm);
makeSaleBtn.addEventListener('click', showMakeSaleForm);
salesSummaryBtn.addEventListener('click', showSalesSummary);
salesDetailsBtn.addEventListener('click', showSalesDetails);

// Functions
function saveData() {
    try {
        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('sales', JSON.stringify(sales));
        localStorage.setItem('revenue', revenue.toString());
    } catch (e) {
        alert('Failed to save data: ' + e.message + '. Data may not persist.');
    }
}

function showUploadForm() {
    mainContent.innerHTML = `
        <h2>Upload Spreadsheet</h2>
        <form id="uploadForm">
            <input type="file" id="fileInput" accept=".xlsx,.xls" required>
            <button type="submit">Upload and Import</button>
        </form>
    `;
    
    document.getElementById('uploadForm').addEventListener('submit', uploadSpreadsheet);
}

function uploadSpreadsheet(e) {
    e.preventDefault();
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        alert('No file selected.');
        return;
    }
    
    alert('Processing file: ' + file.name);
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            alert('File read successfully, parsing...');
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetNames = workbook.SheetNames;
            alert('Sheets found: ' + sheetNames.join(', '));
            
            let totalAdded = 0;
            sheetNames.forEach(sheetName => {
                alert('Processing sheet: ' + sheetName);
                const worksheet = workbook.Sheets[sheetName];
                const range = XLSX.utils.decode_range(worksheet['!ref']);
                const maxRow = range.e.r;
                const maxCol = range.e.c;
                
                // Get headers from row 0
                const headers = [];
                for (let c = 0; c <= maxCol; c++) {
                    const cellAddr = XLSX.utils.encode_cell({r: 0, c});
                    const cell = worksheet[cellAddr];
                    headers.push(cell ? String(cell.v || '') : '');
                }
                
                alert('Headers in ' + sheetName + ': ' + headers.join(', '));
                
                // Map columns
                const colMap = {};
                headers.forEach((header, index) => {
                    if (header) {
                        const h = header.toLowerCase().trim();
                        if (h.includes('sku')) colMap.sku = index;
                        else if (h.includes('item title') || h.includes('desc')) colMap.name = index;
                        else if (h.includes('item price') || h.includes('cost')) colMap.cost = index;
                        else if (h.includes('retail') || h.includes('selling price')) colMap.price = index;
                        else if (h.includes('qty') || h.includes('quantity')) colMap.quantity = index;
                        else if (h.includes('loc') || h.includes('location')) colMap.location = index;
                        else if (h.includes('link') || h.includes('hyperlink')) colMap.hyperlink = index;
                        else if (h.includes('notes')) colMap.notes = index;
                    }
                });
                
                alert('Mapped columns in ' + sheetName + ': ' + JSON.stringify(colMap));
                
                let addedCount = 0;
                // Data from row 1 onwards
                for (let r = 1; r <= maxRow; r++) {
                    const rowData = {};
                    for (let c = 0; c <= maxCol; c++) {
                        const cellAddr = XLSX.utils.encode_cell({r, c});
                        const cell = worksheet[cellAddr];
                        let value = cell ? String(cell.v || '') : '';
                        // If hyperlink, get the URL
                        if (cell && cell.l) {
                            value = cell.l.Target || cell.l || value;
                        }
                        rowData[c] = value;
                    }
                    
                    const sku = rowData[colMap.sku];
                    if (!sku) continue; // Skip rows without SKU
                    
                    const existing = products.find(p => p.sku === sku);
                    if (existing) {
                        // Update existing
                        if (colMap.name !== undefined) existing.name = rowData[colMap.name] || existing.name;
                        if (colMap.cost !== undefined) existing.cost = parseFloat(rowData[colMap.cost]) || existing.cost;
                        if (colMap.price !== undefined) existing.price = parseFloat(rowData[colMap.price]) || existing.price;
                        if (colMap.quantity !== undefined) existing.quantity = parseInt(rowData[colMap.quantity]) || existing.quantity;
                        if (colMap.location !== undefined) existing.location = rowData[colMap.location] || existing.location;
                        if (colMap.hyperlink !== undefined) existing.hyperlink = rowData[colMap.hyperlink] || existing.hyperlink;
                        if (colMap.notes !== undefined) {
                            const noteText = rowData[colMap.notes];
                            if (noteText) existing.notes.push({type: 'Product', text: noteText});
                        }
                    } else {
                        // Add new
                        const product = {
                            sku: sku,
                            name: rowData[colMap.name] || '',
                            cost: parseFloat(rowData[colMap.cost]) || 0,
                            price: parseFloat(rowData[colMap.price]) || 0,
                            quantity: parseInt(rowData[colMap.quantity]) || 0,
                            location: rowData[colMap.location] || '',
                            hyperlink: rowData[colMap.hyperlink] || '',
                            notes: []
                        };
                        if (colMap.notes !== undefined && rowData[colMap.notes]) {
                            product.notes.push({type: 'Product', text: rowData[colMap.notes]});
                        }
                        products.push(product);
                        addedCount++;
                    }
                }
                
                alert(`Sheet ${sheetName}: Added ${addedCount} new products.`);
                totalAdded += addedCount;
            });
            
            alert(`Total import completed. Added ${totalAdded} new products from all sheets.`);
            
            saveData();
            alert('Spreadsheet imported successfully!');
            showInventory();
        } catch (error) {
            alert('Error parsing spreadsheet: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function showAddProductForm() {
    mainContent.innerHTML = `
        <h2>Add New Product</h2>
        <form id="addProductForm">
            <label for="sku">SKU:</label>
            <input type="text" id="sku" required>
            
            <label for="name">Product Name:</label>
            <input type="text" id="name" required>
            
            <label for="cost">Cost:</label>
            <input type="number" id="cost" step="0.01" required>
            
            <label for="price">Selling Price:</label>
            <input type="number" id="price" step="0.01" required>
            
            <label for="quantity">Quantity:</label>
            <input type="number" id="quantity" required>
            
            <label for="location">Location:</label>
            <input type="text" id="location">
            
            <label for="hyperlink">Hyperlink:</label>
            <input type="url" id="hyperlink">
            
            <label for="notes">Notes:</label>
            <textarea id="notes"></textarea>
            
            <button type="submit">Add Product</button>
        </form>
    `;
    
    document.getElementById('addProductForm').addEventListener('submit', addProduct);
}

function addProduct(e) {
    e.preventDefault();
    const sku = document.getElementById('sku').value;
    const name = document.getElementById('name').value;
    const cost = parseFloat(document.getElementById('cost').value);
    const price = parseFloat(document.getElementById('price').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const location = document.getElementById('location').value;
    const hyperlink = document.getElementById('hyperlink').value;
    const notesText = document.getElementById('notes').value;
    
    // Check if SKU already exists
    if (products.find(p => p.sku === sku)) {
        alert('SKU already exists!');
        return;
    }
    
    const notes = notesText ? [{type: 'Product', text: notesText}] : [];
    
    products.push({ sku, name, cost, price, quantity, location, hyperlink, notes });
    saveData();
    alert('Product added successfully!');
    showInventory();
}

function editProduct(sku) {
    const product = products.find(p => p.sku === sku);
    if (!product) return;
    
    const notesText = product.notes.map(note => `${note.type}: ${note.text}`).join('\n');
    
    mainContent.innerHTML = `
        <h2>Edit Product</h2>
        <form id="editProductForm">
            <label for="editSku">SKU:</label>
            <input type="text" id="editSku" value="${product.sku}" required>
            
            <label for="editName">Product Name:</label>
            <input type="text" id="editName" value="${product.name}" required>
            
            <label for="editCost">Cost:</label>
            <input type="number" id="editCost" step="0.01" value="${product.cost}" required>
            
            <label for="editPrice">Selling Price:</label>
            <input type="number" id="editPrice" step="0.01" value="${product.price}" required>
            
            <label for="editQuantity">Quantity:</label>
            <input type="number" id="editQuantity" value="${product.quantity}" required>
            
            <label for="editLocation">Location:</label>
            <input type="text" id="editLocation" value="${product.location}">
            
            <label for="editHyperlink">Hyperlink:</label>
            <input type="url" id="editHyperlink" value="${product.hyperlink}">
            
            <label for="editNotes">Notes:</label>
            <textarea id="editNotes">${notesText}</textarea>
            
            <button type="submit">Update Product</button>
            <button type="button" onclick="showInventory()">Cancel</button>
        </form>
    `;
    
    document.getElementById('editProductForm').addEventListener('submit', (e) => updateProduct(e, sku));
}

function updateProduct(e, oldSku) {
    e.preventDefault();
    const newSku = document.getElementById('editSku').value;
    const name = document.getElementById('editName').value;
    const cost = parseFloat(document.getElementById('editCost').value);
    const price = parseFloat(document.getElementById('editPrice').value);
    const quantity = parseInt(document.getElementById('editQuantity').value);
    const location = document.getElementById('editLocation').value;
    const hyperlink = document.getElementById('editHyperlink').value;
    const notesText = document.getElementById('editNotes').value;
    
    const productIndex = products.findIndex(p => p.sku === oldSku);
    if (productIndex === -1) return;
    
    // Check if new SKU already exists (if changed)
    if (newSku !== oldSku && products.find(p => p.sku === newSku)) {
        alert('SKU already exists!');
        return;
    }
    
    const notes = notesText.split('\n').map(line => {
        const [type, ...textParts] = line.split(': ');
        return {type: type || 'Product', text: textParts.join(': ') || line};
    }).filter(note => note.text.trim());
    
    products[productIndex] = { sku: newSku, name, cost, price, quantity, location, hyperlink, notes };
    saveData();
    alert('Product updated successfully!');
    showInventory();
}

function showScanForm() {
    mainContent.innerHTML = `
        <h2>Scan SKU</h2>
        <form id="scanForm">
            <label for="scanSku">Enter or Scan SKU:</label>
            <input type="text" id="scanSku" required autofocus>
            
            <button type="submit">Mark as Sold</button>
        </form>
    `;
    
    document.getElementById('scanForm').addEventListener('submit', scanSku);
}

function scanSku(e) {
    e.preventDefault();
    const sku = document.getElementById('scanSku').value;
    const product = products.find(p => p.sku === sku);
    if (!product) {
        alert('Product not found!');
        return;
    }
    if (product.quantity <= 0) {
        alert('Product out of stock!');
        return;
    }
    
    // Deduct from inventory
    product.quantity -= 1;
    
    // Record sale
    const saleAmount = product.price;
    revenue += saleAmount;
    const profit = (product.price - product.cost) * 1;
    sales.push({
        sku: product.sku,
        name: product.name,
        quantity: 1,
        price: product.price,
        total: saleAmount,
        profit: profit,
        date: new Date().toLocaleString(),
        pickedUp: false
    });
    
    saveData();
    alert(`Sale completed! Profit: $${profit.toFixed(2)}`);
    showInventory();
}

function showInventory(sortByLocation = false) {
    try {
        if (sortByLocation) {
            filteredProducts.sort((a, b) => (a.location || '').toLowerCase().localeCompare((b.location || '').toLowerCase()));
        }
        
        let html = '<h2>Inventory</h2>';
        html += `<input type="text" id="locationSearch" placeholder="Search by location"><button onclick="filterByLocation()">Search</button><button onclick="clearLocationSearch()">Clear</button><br>`;
        const buttonText = isSortedByLocation ? 'Unsort by Location' : 'Sort by Location';
        html += `<button onclick="toggleSort()">${buttonText}</button>`;
        if (filteredProducts.length === 0) {
            html += '<p>No products match the search.</p>';
        } else {
            html += `
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Name</th>
                            <th>Cost</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Location</th>
                            <th>Hyperlink</th>
                            <th>Notes</th>
                            <th>Availability</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            filteredProducts.forEach(product => {
                const availability = product.quantity > 0 ? 'Available' : 'Out of Stock';
                const hyperlink = product.hyperlink ? `<a href="${product.hyperlink}" target="_blank">${product.hyperlink}</a>` : 'No Link';
                
                // Check if product name is a URL and make it clickable
                let nameDisplay = product.name || '';
                if (nameDisplay && (nameDisplay.startsWith('http://') || nameDisplay.startsWith('https://'))) {
                    nameDisplay = `<a href="${nameDisplay}" target="_blank" style="color: blue; text-decoration: underline;">${nameDisplay}</a>`;
                }
                
                const notes = product.notes && Array.isArray(product.notes) ? product.notes.map(note => {
                    const color = note.type === 'Priority' ? 'red' : note.type === 'Self' ? 'blue' : 'green';
                    return `<span style="color: ${color};">${note.type}: ${note.text}</span>`;
                }).join('<br>') : '';
                const escapedSku = (product.sku || '').replace(/'/g, "\\'");
                html += `
                    <tr>
                        <td>${product.sku || ''}</td>
                        <td>${nameDisplay}</td>
                        <td>$${product.cost ? product.cost.toFixed(2) : '0.00'}</td>
                        <td>$${product.price ? product.price.toFixed(2) : '0.00'}</td>
                        <td>${product.quantity || 0}</td>
                        <td>${product.location || ''}</td>
                        <td>${hyperlink}</td>
                        <td>${notes}</td>
                        <td>${availability}</td>
                        <td><button onclick="editProduct('${escapedSku}')">Edit</button></td>
                    </tr>
                `;
            });
            html += '</tbody></table>';
        }
        mainContent.innerHTML = html;
    } catch (error) {
        alert('Error displaying inventory: ' + error.message);
    }
}

function showMakeSaleForm() {
    let html = '<h2>Make a Sale</h2>';
    if (products.length === 0) {
        html += '<p>No products available for sale.</p>';
    } else {
        html += `
            <form id="makeSaleForm">
                <label for="productSelect">Select Product:</label>
                <select id="productSelect" required>
                    <option value="">Choose a product</option>
        `;
        products.forEach((product, index) => {
            if (product.quantity > 0) {
                html += `<option value="${index}">${product.name} (SKU: ${product.sku}) - $${product.price.toFixed(2)} (${product.quantity} available)</option>`;
            }
        });
        html += `
                </select>
                
                <label for="saleQuantity">Quantity:</label>
                <input type="number" id="saleQuantity" min="1" required>
                
                <button type="submit">Complete Sale</button>
            </form>
        `;
    }
    mainContent.innerHTML = html;
    
    if (products.some(p => p.quantity > 0)) {
        document.getElementById('makeSaleForm').addEventListener('submit', makeSale);
    }
}

function makeSale(e) {
    e.preventDefault();
    const productIndex = parseInt(document.getElementById('productSelect').value);
    const quantity = parseInt(document.getElementById('saleQuantity').value);
    
    const product = products[productIndex];
    if (quantity > product.quantity) {
        alert('Not enough quantity in stock!');
        return;
    }
    
    // Deduct from inventory
    product.quantity -= quantity;
    
    // Record sale
    const saleAmount = product.price * quantity;
    revenue += saleAmount;
    const profit = (product.price - product.cost) * quantity;
    sales.push({
        sku: product.sku,
        name: product.name,
        quantity: quantity,
        price: product.price,
        total: saleAmount,
        profit: profit,
        date: new Date().toLocaleString(),
        pickedUp: false
    });
    
    saveData();
    alert(`Sale completed! Total: $${saleAmount.toFixed(2)}`);
    showInventory();
}

function showSalesSummary() {
    const totalSales = sales.length;
    const totalRevenue = revenue;
    
    mainContent.innerHTML = `
        <h2>Sales Summary</h2>
        <p>Total Sales: ${totalSales}</p>
        <p>Total Revenue: $${totalRevenue.toFixed(2)}</p>
    `;
}

function showSalesDetails() {
    let html = '<h2>Sales Details</h2>';
    html += `
        <div style="margin-bottom: 1rem;">
            <label for="yearFilter">Filter by Year:</label>
            <input type="number" id="yearFilter" placeholder="e.g. 2026" style="margin-right: 1rem;">
            
            <label for="monthFilter">Filter by Month:</label>
            <select id="monthFilter" style="margin-right: 1rem;">
                <option value="">All</option>
                <option value="0">January</option>
                <option value="1">February</option>
                <option value="2">March</option>
                <option value="3">April</option>
                <option value="4">May</option>
                <option value="5">June</option>
                <option value="6">July</option>
                <option value="7">August</option>
                <option value="8">September</option>
                <option value="9">October</option>
                <option value="10">November</option>
                <option value="11">December</option>
            </select>
            
            <button onclick="applyFilter()">Apply Filter</button>
            <button onclick="clearFilter()">Clear Filter</button>
        </div>
    `;
    if (filteredSales.length === 0) {
        html += '<p>No sales recorded yet.</p>';
    } else {
        html += `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>SKU</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                        <th>Profit</th>
                        <th>Picked Up</th>
                    </tr>
                </thead>
                <tbody>
        `;
        filteredSales.forEach((sale, index) => {
            const originalIndex = sales.indexOf(sale);
            const rowColor = sale.profit > 0 ? 'lightgreen' : sale.profit < 0 ? 'lightcoral' : 'white';
            html += `
                <tr style="background-color: ${rowColor};">
                    <td>${sale.date}</td>
                    <td>${sale.sku}</td>
                    <td>${sale.name}</td>
                    <td>${sale.quantity}</td>
                    <td>$${sale.price.toFixed(2)}</td>
                    <td>$${sale.total.toFixed(2)}</td>
                    <td>$${sale.profit.toFixed(2)}</td>
                    <td><input type="checkbox" ${sale.pickedUp ? 'checked' : ''} onchange="togglePickedUp(${originalIndex})"></td>
                </tr>
            `;
        });
        html += '</tbody></table>';
    }
    mainContent.innerHTML = html;
}

function toggleSort() {
    isSortedByLocation = !isSortedByLocation;
    showInventory(isSortedByLocation);
}

function filterByLocation() {
    const term = document.getElementById('locationSearch').value.toLowerCase();
    filteredProducts = products.filter(p => (p.location || '').toLowerCase().includes(term));
    showInventory(isSortedByLocation);
}

function clearLocationSearch() {
    document.getElementById('locationSearch').value = '';
    filteredProducts = products;
    showInventory(isSortedByLocation);
}

function applyFilter() {
    const year = document.getElementById('yearFilter').value;
    const month = document.getElementById('monthFilter').value;
    
    filteredSales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        const saleYear = saleDate.getFullYear();
        const saleMonth = saleDate.getMonth();
        
        if (year && saleYear != year) return false;
        if (month !== '' && saleMonth != month) return false;
        return true;
    });
    
    showSalesDetails();
}

function clearFilter() {
    document.getElementById('yearFilter').value = '';
    document.getElementById('monthFilter').value = '';
    filteredSales = sales;
    showSalesDetails();
}

function togglePickedUp(index) {
    sales[index].pickedUp = !sales[index].pickedUp;
    saveData();
    // Update filteredSales if needed, but since it's reference, it updates
    showSalesDetails();
}

// Initialize with inventory view
showInventory();