/*
 * Intellectual Property Ownership:
 * The Software, including but not limited to its object code, source code, visual expressions, screen displays, graphics, design, and underlying algorithms, is the sole and exclusive property of Gaviola Consulting, LLC.
 * All right, title, and interest in and to the Software, including all associated Intellectual Property Rights (including, without limitation, copyrights, trademarks, and trade secrets), shall at all times remain vested in Gaviola Consulting, LLC. No license, lease, or sale of the software to any third party shall be construed as a transfer of ownership.
 *
 * Usage Restrictions (The "No Reverse Engineering" Clause):
 * Users are strictly prohibited from:
 * - Modifying, copying, or creating derivative works based on the Software.
 * - Reverse engineering, decompiling, or disassembling the code.
 * - Removing or altering any copyright or proprietary notices belonging to Gaviola Consulting, LLC.
 */
// Debra's Deals Inventory System
// --- Simple Local License Check ---
const VALID_LICENSE_KEYS = [
    'GAVIOLA-2026-001',
    'GAVIOLA-2026-002',
    'GAVIOLA-2026-003'
];

function showLicenseScreen() {
    mainContent.innerHTML = `
        <h2>License Required</h2>
        <form id="licenseForm">
            <label for="licenseKey">Enter your license key:</label>
            <input type="text" id="licenseKey" required style="width:260px;max-width:90vw;">
            <button type="submit">Activate</button>
        </form>
        <div id="licenseError" style="color:red;margin-top:0.5em;"></div>
    `;
    document.getElementById('licenseForm').onsubmit = function(e) {
        e.preventDefault();
        const key = document.getElementById('licenseKey').value.trim();
        if (VALID_LICENSE_KEYS.includes(key)) {
            localStorage.setItem('licenseKey', key);
            showInventory();
        } else {
            document.getElementById('licenseError').textContent = 'Invalid license key. Please try again.';
        }
    };
}

function checkLicense() {
    const key = localStorage.getItem('licenseKey');
    if (!key || !VALID_LICENSE_KEYS.includes(key)) {
        showLicenseScreen();
        return false;
    }
    return true;
}

// On page load, check license before showing app
window.addEventListener('DOMContentLoaded', function() {
    // Only prompt for license if not already set and valid
    if (!checkLicense()) {
        // If license is missing or invalid, show license screen and do nothing else
        return;
    }
    // License is valid, continue loading app as normal
    // ...existing code...
});

// Data storage using localStorage
let products = JSON.parse(localStorage.getItem('products')) || [];
let sales = JSON.parse(localStorage.getItem('sales')) || [];
let revenue = parseFloat(localStorage.getItem('revenue')) || 0;

function formatDateMMDDYYYY(value) {
    // Two-digit years 70-99 map to 19xx; 00-69 map to 20xx (common spreadsheet/date-parser convention).
    const TWO_DIGIT_YEAR_CUTOFF = 70;
    // Days between Excel's 1900-based epoch and Unix epoch (1970-01-01), accounting for Excel's date system offset.
    const EXCEL_TO_UNIX_DAYS_OFFSET = 25569;
    // Excel serial date upper bound for 9999-12-31 in the 1900 date system.
    const MAX_EXCEL_SERIAL_DATE = 2958465;

    if (value === null || value === undefined) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${month}/${day}/${value.getFullYear()}`;
    }
    const input = String(value).trim();
    if (!input) return '';

    const formatParts = (year, month, day) => {
        const parsedYear = Number(year);
        const parsedMonth = Number(month);
        const parsedDay = Number(day);
        if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedMonth) || !Number.isInteger(parsedDay)) return '';
        const candidate = new Date(parsedYear, parsedMonth - 1, parsedDay);
        if (
            candidate.getFullYear() !== parsedYear ||
            candidate.getMonth() !== parsedMonth - 1 ||
            candidate.getDate() !== parsedDay
        ) return '';
        return `${String(parsedMonth).padStart(2, '0')}/${String(parsedDay).padStart(2, '0')}/${parsedYear}`;
    };

    let match = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (match) {
        let year = Number(match[3]);
        if (year < 100) year += (year >= TWO_DIGIT_YEAR_CUTOFF ? 1900 : 2000);
        return formatParts(year, match[1], match[2]);
    }

    match = input.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (match) {
        return formatParts(match[1], match[2], match[3]);
    }

    if (/^\d+(\.\d+)?$/.test(input)) {
        const serial = Number(input);
        if (serial > 0 && serial <= MAX_EXCEL_SERIAL_DATE) {
            // Excel incorrectly includes a non-existent 1900-02-29 date at serial 60; adjust serials after that point.
            const adjustedSerial = serial >= 60 ? serial - 1 : serial;
            const date = new Date((adjustedSerial - EXCEL_TO_UNIX_DAYS_OFFSET) * 86400000);
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            return `${month}/${day}/${date.getUTCFullYear()}`;
        }
    }

    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) return '';
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${month}/${day}/${parsed.getFullYear()}`;
}

function formatDescPuDateMMDDYY(value) {
    const formatted = formatDateMMDDYYYY(value);
    if (!formatted) {
        if (value === null || value === undefined) return '';
        return String(value);
    }

    const parts = formatted.split('/');
    if (parts.length !== 3 || !/^\d{4}$/.test(parts[2])) {
        return String(value);
    }

    return `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
}

// Ensure products have new fields
products = products.map(p => ({
    sku: p.sku,
    name: p.name,
    cost: p.cost || 0,
    price: p.price,
    quantity: p.quantity,
    location: p.location || '',
    hyperlink: p.hyperlink || '',
    notes: p.notes || [],
    purchaseName: p.purchaseName || '',
    purchaseSource: p.purchaseSource || '',
    // Added fields for spreadsheet mapping
    condition: p.condition || '',
    descPuDate: p.descPuDate || '',
    asin: p.asin || '',
    listDate: p.listDate || '',
    soldDate: p.soldDate || '',
    retail: p.retail || '',
    soldFor: p.soldFor || '',
    profit: p.profit !== undefined ? p.profit : '',
    totalPrice: p.totalPrice !== undefined ? p.totalPrice : (p.price && p.quantity ? (p.price * p.quantity) : ''),
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
let inventoryPage = 1;
const ITEMS_PER_PAGE = 100;
// Patch: Expose pagination functions globally so HTML buttons work
window.nextInventoryPage = function() {
    inventoryPage++;
    showInventory(isSortedByLocation);
};
window.prevInventoryPage = function() {
    inventoryPage--;
    showInventory(isSortedByLocation);
};

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
        <form id="uploadForm" autocomplete="off" novalidate>
            <label for="fileInput" style="display:block;margin-bottom:1rem;font-weight:bold;">Choose Excel file (.xlsx, .xls):</label>
            <input type="file" id="fileInput" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required style="font-size:1.1rem;padding:0.5rem;width:100%;max-width:350px;" />
            <button type="submit" style="margin-top:1rem;">Upload and Import</button>
        </form>
        <div id="iosHint" style="margin-top:1rem;color:#555;font-size:0.95rem;">If you have trouble selecting a file on iPhone/iPad, make sure the file is saved in your Files app (not iCloud Drive only), then try again. Safari and Chrome on iOS are supported.</div>
    `;
    // Always open file picker, never camera
    const fileInput = document.getElementById('fileInput');
    fileInput.removeAttribute('capture');
    fileInput.setAttribute('tabindex', '0');
    fileInput.addEventListener('click', function(e) {
        fileInput.value = '';
    });
    // Remove all validation messages on submit
    document.getElementById('uploadForm').addEventListener('submit', function(e) {
        if (window && window.document) {
            const forms = document.querySelectorAll('form');
            forms.forEach(f => f.noValidate = true);
        }
        uploadSpreadsheet(e);
    });
}

function uploadSpreadsheet(e) {
    e.preventDefault();
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        // No file selected, do nothing
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const sheetNames = workbook.SheetNames;
            const productsBySku = new Map(
                products.map(product => [String(product.sku || '').trim(), product]).filter(([sku]) => sku)
            );
            sheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                if (!worksheet || !worksheet['!ref']) return;
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
                // Map columns (full mapping for all headers)
                const colMap = {};
                headers.forEach((header, index) => {
                    if (header) {
                        const h = header.toLowerCase().trim();
                        if (h.includes('condition')) colMap.condition = index;
                        else if (h.includes('desc') || h.includes('pu date')) colMap.descPuDate = index;
                        else if (h.includes('asin')) colMap.asin = index;
                        else if (h.includes('item title') || h.includes('name') || h.includes('title')) colMap.name = index;
                        else if (h === 'qty' || h.includes('quantity')) colMap.quantity = index;
                        else if (h === 'cost' || h.includes('item cost') || h.includes('unit cost')) colMap.cost = index;
                        else if (h.includes('item price')) colMap.price = index;
                        else if (h.includes('total price')) colMap.totalPrice = index;
                        else if (h === 'sku') colMap.sku = index;
                        else if (h === 'loc' || h.includes('location')) colMap.location = index;
                        else if (h.includes('list date')) colMap.listDate = index;
                        else if (h.includes('sold date')) colMap.soldDate = index;
                        else if (h.includes('retail')) colMap.retail = index;
                        else if (h.includes('sold for')) colMap.soldFor = index;
                        else if (h.includes('profit')) colMap.profit = index;
                        else if (h.includes('notes')) colMap.notes = index;
                        else if (h === 'link' || h.includes('hyperlink')) colMap.hyperlink = index;
                    }
                });
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
                    const sku = String(rowData[colMap.sku] || '').trim();
                    if (!sku) continue; // Skip rows without SKU
                    const existing = productsBySku.get(sku);
                    const productData = { sku };
                    if (colMap.name !== undefined) productData.name = rowData[colMap.name];
                    if (colMap.cost !== undefined) productData.cost = parseFloat(rowData[colMap.cost]) || 0;
                    if (colMap.price !== undefined) productData.price = parseFloat(rowData[colMap.price]) || 0;
                    if (colMap.quantity !== undefined) productData.quantity = parseInt(rowData[colMap.quantity], 10) || 0;
                    if (colMap.location !== undefined) productData.location = rowData[colMap.location];
                    if (colMap.hyperlink !== undefined) productData.hyperlink = rowData[colMap.hyperlink];
                    if (colMap.condition !== undefined) productData.condition = rowData[colMap.condition];
                    if (colMap.descPuDate !== undefined) productData.descPuDate = rowData[colMap.descPuDate];
                    if (colMap.asin !== undefined) productData.asin = rowData[colMap.asin];
                    if (colMap.listDate !== undefined) productData.listDate = rowData[colMap.listDate];
                    if (colMap.soldDate !== undefined) productData.soldDate = rowData[colMap.soldDate];
                    if (colMap.retail !== undefined) productData.retail = rowData[colMap.retail];
                    if (colMap.soldFor !== undefined) productData.soldFor = rowData[colMap.soldFor];
                    if (colMap.profit !== undefined) productData.profit = rowData[colMap.profit];
                    if (colMap.totalPrice !== undefined) productData.totalPrice = rowData[colMap.totalPrice];
                    if (colMap.notes !== undefined) {
                        const noteText = rowData[colMap.notes];
                        if (noteText) {
                            productData.notes = [{type: 'Product', text: noteText}];
                            // If the note looks like a name (letters and spaces, no @ or http), set as purchaser name
                            if (!productData.purchaseName && /^[A-Za-z .,'-]+$/.test(noteText.trim()) && !noteText.includes('@') && !noteText.toLowerCase().includes('http')) {
                                productData.purchaseName = noteText.trim();
                            }
                        }
                    }
                    if (existing) {
                        Object.assign(existing, productData);
                    } else {
                        const newProduct = {
                            sku,
                            name: '',
                            cost: 0,
                            price: 0,
                            quantity: 0,
                            location: '',
                            hyperlink: '',
                            notes: [],
                            purchaseName: '',
                            purchaseSource: '',
                            condition: '',
                            descPuDate: '',
                            asin: '',
                            listDate: '',
                            soldDate: '',
                            retail: '',
                            soldFor: '',
                            profit: '',
                            totalPrice: '',
                            ...productData
                        };
                        products.push(newProduct);
                        productsBySku.set(sku, newProduct);
                    }
                }
            });
            saveData();
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
            <label for="purchaseName">Purchase Name:</label>
            <input type="text" id="purchaseName">
            <label for="purchaseSource">Source of Purchase:</label>
            <input type="text" id="purchaseSource">
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
    const purchaseName = document.getElementById('purchaseName').value;
    const purchaseSource = document.getElementById('purchaseSource').value;
    const notesText = document.getElementById('notes').value;
    // Check if SKU already exists
    if (products.find(p => p.sku === sku)) {
        alert('SKU already exists!');
        return;
    }
    const notes = notesText ? [{type: 'Product', text: notesText}] : [];
    products.push({ sku, name, cost, price, quantity, location, hyperlink, notes, purchaseName, purchaseSource });
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
            <label for="editPurchaseName">Purchase Name:</label>
            <input type="text" id="editPurchaseName" value="${product.purchaseName || ''}">
            <label for="editPurchaseSource">Source of Purchase:</label>
            <input type="text" id="editPurchaseSource" value="${product.purchaseSource || ''}">
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
    const purchaseName = document.getElementById('editPurchaseName').value;
    const purchaseSource = document.getElementById('editPurchaseSource').value;
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
    products[productIndex] = { sku: newSku, name, cost, price, quantity, location, hyperlink, notes, purchaseName, purchaseSource };
    saveData();
    alert('Product updated successfully!');
    showInventory();
}

function showScanForm() {
    mainContent.innerHTML = `
        <h2>Scan SKU (Barcode or Manual)</h2>
        <div style="color:#555;font-size:1em;margin-bottom:0.5em;">
            <b>Tip:</b> Place the barcode in the center of the box, hold steady, and ensure good lighting. For best results, use a clean camera lens and avoid glare.
        </div>
        <div id="barcodeArea" style="margin-bottom:1rem;"></div>
        <div id="cameraStatus" style="color:#237804;font-size:1em;margin-bottom:0.5em;"></div>
        <button id="startCameraBtn" style="margin-bottom:1rem;">Start Camera</button>
        <form id="scanForm">
            <label for="scanSku">Enter or Scan SKU:</label>
            <input type="text" id="scanSku" required autocomplete="off">
            <button type="submit">Submit</button>
        </form>
        <div id="scanResult" style="margin-top:1rem;"></div>
    `;
    let html5Qr = null;
    let cameraActive = false;
    let lastScanError = '';
    let cameraStarting = false;
    async function stopCamera() {
        if (html5Qr && cameraActive) {
            try {
                await html5Qr.stop();
            } catch (e) {}
            cameraActive = false;
        }
    }
    function updateCameraStatus(msg, color) {
        const statusDiv = document.getElementById('cameraStatus');
        if (statusDiv) {
            statusDiv.textContent = msg;
            statusDiv.style.color = color || '#237804';
        }
    }
    async function startCamera() {
        if (cameraStarting) return;
        cameraStarting = true;
        await stopCamera();
        const barcodeArea = document.getElementById('barcodeArea');
        barcodeArea.innerHTML = '<div id="reader" style="width:400px;max-width:100vw;"></div>';
        updateCameraStatus('Starting camera...', '#237804');
        if (!window.Html5Qrcode) {
            barcodeArea.innerHTML = '<div style="color:red;">Barcode scanner library not loaded. Please check your internet connection and reload the page.</div>';
            updateCameraStatus('Barcode scanner library not loaded.', 'red');
            cameraStarting = false;
            return;
        }
        if (html5Qr) {
            try { await html5Qr.stop(); } catch(e){}
        }
        html5Qr = new Html5Qrcode("reader");
        let scanErrorTimeout = null;
        Html5Qrcode.getCameras().then(cameras => {
            if (cameras && cameras.length) {
                updateCameraStatus('Camera found. Initializing scan...', '#237804');
                html5Qr.start(
                    { facingMode: "environment" },
                    { fps: 2, qrbox: 380 }, // even less sensitive: lower fps, much bigger box
                    async (decodedText, decodedResult) => {
                        updateCameraStatus('Barcode detected: ' + decodedText, '#237804');
                        document.getElementById('scanSku').value = decodedText;
                        await stopCamera();
                        handleScanSku(decodedText);
                    },
                    (errorMsg) => {
                        lastScanError = errorMsg;
                        if (scanErrorTimeout) return; // prevent rapid error updates
                        updateCameraStatus('Scanning... (last error: ' + errorMsg + ')', 'orange');
                        scanErrorTimeout = setTimeout(() => { scanErrorTimeout = null; }, 800); // 0.8s delay
                    }
                ).then(() => { cameraActive = true; updateCameraStatus('Camera active. Point barcode at camera.', '#237804'); cameraStarting = false; })
                .catch(err => {
                    barcodeArea.innerHTML = '<div style="color:red;">Camera error: ' + err + '</div>';
                    updateCameraStatus('Camera error: ' + err, 'red');
                    cameraStarting = false;
                });
            } else {
                barcodeArea.innerHTML = '<div style="color:red;">No camera found.</div>';
                updateCameraStatus('No camera found.', 'red');
                cameraStarting = false;
            }
        }).catch(err => {
            barcodeArea.innerHTML = '<div style="color:red;">Camera access denied.</div>';
            updateCameraStatus('Camera access denied.', 'red');
            cameraStarting = false;
        });
    }
    document.getElementById('startCameraBtn').onclick = function() {
        startCamera();
    };
    // Do not auto-start camera. Only start when user presses button.
    document.getElementById('scanForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const sku = document.getElementById('scanSku').value;
        handleScanSku(sku);
    });
    function handleScanSku(sku) {
        const product = products.find(p => p.sku === sku);
        const scanResult = document.getElementById('scanResult');
        if (!product) {
            // Show add product form with SKU pre-filled
            scanResult.innerHTML = `
                <span style='color:orange;'>Product not found! Add new product to inventory:</span>
                <form id="addScannedProductForm" style="margin-top:1em;">
                    <label>SKU:<br><input type="text" id="newSku" value="${sku}" required readonly></label><br>
                    <label>Name:<br><input type="text" id="newName" required></label><br>
                    <label>Cost:<br><input type="number" id="newCost" step="0.01" required></label><br>
                    <label>Price:<br><input type="number" id="newPrice" step="0.01" required></label><br>
                    <label>Quantity:<br><input type="number" id="newQuantity" value="1" required></label><br>
                    <label>Location:<br><input type="text" id="newLocation"></label><br>
                    <label>Hyperlink:<br><input type="url" id="newHyperlink"></label><br>
                    <label>Purchase Name:<br><input type="text" id="newPurchaseName"></label><br>
                    <label>Source of Purchase:<br><input type="text" id="newPurchaseSource"></label><br>
                    <label>Notes:<br><textarea id="newNotes"></textarea></label><br>
                    <button type="submit">Add Product</button>
                </form>
            `;
            document.getElementById('addScannedProductForm').onsubmit = function(e) {
                e.preventDefault();
                const sku = document.getElementById('newSku').value;
                const name = document.getElementById('newName').value;
                const cost = parseFloat(document.getElementById('newCost').value);
                const price = parseFloat(document.getElementById('newPrice').value);
                const quantity = parseInt(document.getElementById('newQuantity').value);
                const location = document.getElementById('newLocation').value;
                const hyperlink = document.getElementById('newHyperlink').value;
                const purchaseName = document.getElementById('newPurchaseName').value;
                const purchaseSource = document.getElementById('newPurchaseSource').value;
                const notesText = document.getElementById('newNotes').value;
                if (products.find(p => p.sku === sku)) {
                    alert('SKU already exists!');
                    return;
                }
                const notes = notesText ? [{type: 'Product', text: notesText}] : [];
                products.push({ sku, name, cost, price, quantity, location, hyperlink, notes, purchaseName, purchaseSource });
                saveData();
                scanResult.innerHTML = `<span style='color:green;'>Product added successfully!</span>`;
                showInventory();
            };
            return;
        }
        scanResult.innerHTML = `<b>Product:</b> ${product.name} (SKU: ${product.sku})<br>Current Quantity: ${product.quantity}<br><button id="addBtn">Add to Inventory</button> <button id="subtractBtn">Subtract from Inventory</button>`;
        document.getElementById('addBtn').onclick = function() {
            product.quantity += 1;
            saveData();
            scanResult.innerHTML = `<span style='color:green;'>Added 1. New quantity: ${product.quantity}</span>`;
            showInventory();
        };
        document.getElementById('subtractBtn').onclick = function() {
            if (product.quantity <= 0) {
                scanResult.innerHTML = '<span style="color:red;">Product out of stock!</span>';
                return;
            }
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
            scanResult.innerHTML = `<span style='color:orange;'>Subtracted 1 (sold). New quantity: ${product.quantity}. Sale recorded.</span>`;
            showInventory();
        };
    }
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
        html += `<input type="text" id="keywordSearch" placeholder="Search (min 3 letters, any field)" style="width:220px;max-width:80vw;"> <button id="keywordSearchBtn">Search</button> <button onclick="clearKeywordSearch()">Clear</button> `;
        html += `<input type="text" id="locationSearch" placeholder="Search by location" style="width:160px;max-width:60vw;"> <button onclick="filterByLocation()">Search</button> <button onclick="clearLocationSearch()">Clear</button><br>`;
        const buttonText = isSortedByLocation ? 'Unsort by Location' : 'Sort by Location';
        html += `<button onclick="toggleSort()">${buttonText}</button>`;
        // Pagination controls
        const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
        if (inventoryPage > totalPages) inventoryPage = totalPages;
        if (inventoryPage < 1) inventoryPage = 1;
        if (filteredProducts.length > ITEMS_PER_PAGE) {
            html += `<div style='margin:0.5rem 0;'>Page <span id='pageNum'>${inventoryPage}</span> of ${totalPages} ` +
                `<button onclick='prevInventoryPage()' ${inventoryPage === 1 ? 'disabled' : ''}>&lt; Prev</button> ` +
                `<button onclick='nextInventoryPage()' ${inventoryPage === totalPages ? 'disabled' : ''}>Next &gt;</button></div>`;
        }
        if (filteredProducts.length === 0) {
            html += '<p>No products match the search.</p>';
        } else {
            html += `
                <table>
                    <thead>
                        <tr>
                            <th>Condition</th>
                            <th>Desc/PU Date</th>
                            <th>ASIN</th>
                            <th>Item Title</th>
                            <th>Qty</th>
                            <th>Item Price</th>
                            <th>Total Price</th>
                            <th>SKU</th>
                            <th>Loc</th>
                            <th>List Date</th>
                            <th>Sold Date</th>
                            <th>Retail</th>
                            <th>Sold For</th>
                            <th>Profit</th>
                            <th>Purchaser</th>
                            <th>Notes</th>
                            <th>Link</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            const startIdx = (inventoryPage - 1) * ITEMS_PER_PAGE;
            const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, filteredProducts.length);
            for (let i = startIdx; i < endIdx; i++) {
                const product = filteredProducts[i];
                // Ensure all fields are present
                const condition = product.condition || '';
                const descPuDate = formatDescPuDateMMDDYY(product.descPuDate);
                const asin = product.asin || '';
                let name = product.name || '';
                // If Item Title looks like a URL, make it clickable
                if (name) {
                    let url = name.trim();
                    if (!/^https?:\/\//i.test(url) && /\./.test(url) && !/\s/.test(url)) {
                        url = 'https://' + url;
                    }
                    if (/^https?:\/\/.+\..+/.test(url) && !/\s/.test(url)) {
                        name = `<a href="${url}" target="_blank" rel="noopener noreferrer">${product.name}</a>`;
                    }
                }
                const parseMoneyValue = (value) => {
                    if (value === null || value === undefined || value === '') return null;
                    const numericValue = Number(String(value).replace(/[$,]/g, '').trim());
                    return Number.isFinite(numericValue) ? numericValue : null;
                };
                const quantity = product.quantity || 0;
                const price = parseMoneyValue(product.price);
                const totalPrice = parseMoneyValue(product.totalPrice);
                const sku = product.sku || '';
                const location = product.location || '';
                const listDate = formatDateMMDDYYYY(product.listDate);
                const soldDate = formatDateMMDDYYYY(product.soldDate);
                const retail = parseMoneyValue(product.retail);
                const soldFor = parseMoneyValue(product.soldFor);
                // Calculate profit as (soldFor - totalPrice) * quantity
                let profit = '';
                if (soldFor !== null && totalPrice !== null) {
                    profit = ((soldFor - totalPrice) * quantity).toFixed(2);
                }
                // Purchaser: use purchaseName, or extract from notes if missing
                let purchaser = product.purchaseName || '';
                const notesArr = product.notes && Array.isArray(product.notes) ? product.notes.map(note => note.text) : [];
                if (!purchaser && notesArr.length > 0) {
                    const nameCandidate = notesArr.find(n => /^[A-Za-z .,'-]+$/.test(n.trim()) && !n.includes('@') && !n.toLowerCase().includes('http'));
                    if (nameCandidate) purchaser = nameCandidate.trim();
                }
                const notes = notesArr.filter(n => n !== purchaser).join('; ');
                // Hyperlink: always clickable if present, always prepends https:// if missing
                let hyperlink = '';
                if (product.hyperlink) {
                    let url = product.hyperlink.trim();
                    if (!/^https?:\/\//i.test(url)) {
                        url = 'https://' + url;
                    }
                    // Only render if it looks like a valid URL (contains a dot and no spaces)
                    if (/^https?:\/\/.+\..+/.test(url) && !/\s/.test(url)) {
                        hyperlink = `<a href="${url}" target="_blank" rel="noopener noreferrer">${product.hyperlink}</a>`;
                    }
                }
                const escapedSku = (sku).replace(/'/g, "\\'");
                html += `
                    <tr>
                        <td>${condition}</td>
                        <td>${descPuDate}</td>
                        <td>${asin}</td>
                        <td>${name}</td>
                        <td>${quantity}</td>
                        <td>$${price !== null ? price.toFixed(2) : ''}</td>
                        <td>$${totalPrice !== null ? totalPrice.toFixed(2) : ''}</td>
                        <td>${sku}</td>
                        <td>${location}</td>
                        <td>${listDate}</td>
                        <td>${soldDate}</td>
                        <td>$${retail !== null ? retail.toFixed(2) : ''}</td>
                        <td>$${soldFor !== null ? soldFor.toFixed(2) : ''}</td>
                        <td>${profit !== '' ? `$${profit}` : ''}</td>
                        <td>${purchaser}</td>
                        <td>${notes}</td>
                        <td>${hyperlink}</td>
                        <td><button onclick="editProduct('${escapedSku}')">Edit</button></td>
                    </tr>
                `;
            }
            html += '</tbody></table>';
        }
        mainContent.innerHTML = html;
        // Attach search events
        setTimeout(() => {
            const kwInput = document.getElementById('keywordSearch');
            const kwBtn = document.getElementById('keywordSearchBtn');
            if (kwInput) {
                kwInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') filterByKeyword(); });
            }
            if (kwBtn) {
                kwBtn.onclick = filterByKeyword;
            }
        }, 0);
    // Advanced search by any field, min 3 letters
    function filterByKeyword() {
        const input = document.getElementById('keywordSearch');
        if (!input) return;
        const term = input.value.trim().toLowerCase();
        if (term.length < 3) {
            alert('Enter at least 3 letters to search.');
            return;
        }
        filteredProducts = products.filter(p => {
            return Object.keys(p).some(key => {
                let val = p[key];
                if (typeof val === 'string' && val.toLowerCase().includes(term)) return true;
                if (Array.isArray(val)) {
                    return val.some(note => typeof note.text === 'string' && note.text.toLowerCase().includes(term));
                }
                return false;
            });
        });
        inventoryPage = 1;
        showInventory(isSortedByLocation);
    }
    function clearKeywordSearch() {
        const input = document.getElementById('keywordSearch');
        if (input) input.value = '';
        filteredProducts = products;
        inventoryPage = 1;
        showInventory(isSortedByLocation);
    }
    // Pagination controls
    function nextInventoryPage() {
        inventoryPage++;
        showInventory(isSortedByLocation);
    }
    function prevInventoryPage() {
        inventoryPage--;
        showInventory(isSortedByLocation);
    }
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
            <button id="startSaleCameraBtn" style="margin-bottom:1rem;">Start Camera</button>
            <div id="saleBarcodeArea" style="margin-bottom:1rem;"></div>
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
    // Camera logic for Make Sale
    let saleQr = null;
    let saleCameraActive = false;
    async function stopSaleCamera() {
        if (saleQr && saleCameraActive) {
            try { await saleQr.stop(); } catch (e) {}
            saleCameraActive = false;
        }
    }
    document.getElementById('startSaleCameraBtn')?.addEventListener('click', async function() {
        const barcodeArea = document.getElementById('saleBarcodeArea');
        await stopSaleCamera();
        barcodeArea.innerHTML = '<div id="saleReader" style="width:400px;max-width:100vw;"></div>';
        if (window.Html5Qrcode) {
            saleQr = new Html5Qrcode("saleReader");
            Html5Qrcode.getCameras().then(cameras => {
                if (cameras && cameras.length) {
                    saleQr.start(
                        { facingMode: "environment" },
                        { fps: 2, qrbox: 380 }, // match inventory scan settings
                        (decodedText, decodedResult) => {
                            // Try to select product by SKU
                            const idx = products.findIndex(p => p.sku === decodedText && p.quantity > 0);
                            if (idx !== -1) {
                                document.getElementById('productSelect').value = idx;
                                barcodeArea.innerHTML = `<span style='color:green;'>Product selected: ${products[idx].name} (SKU: ${products[idx].sku})</span>`;
                                stopSaleCamera();
                            } else {
                                barcodeArea.innerHTML = `<span style='color:red;'>SKU not found or out of stock: ${decodedText}</span>`;
                            }
                        },
                        (errorMsg) => {}
                    ).then(() => { saleCameraActive = true; })
                    .catch(err => {
                        barcodeArea.innerHTML = '<div style="color:red;">Camera error: ' + err + '</div>';
                    });
                } else {
                    barcodeArea.innerHTML = '<div style="color:red;">No camera found.</div>';
                }
            }).catch(err => {
                barcodeArea.innerHTML = '<div style="color:red;">Camera access denied.</div>';
            });
        } else {
            barcodeArea.innerHTML = '<div style="color:red;">Barcode scanner not loaded.</div>';
        }
    });
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
