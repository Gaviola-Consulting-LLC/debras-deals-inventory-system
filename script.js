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

const CANONICAL_SPREADSHEET_NAME = 'Debras inventory spreadsheet_1.xlsx';
const CANONICAL_SHEET_NAME = 'Fresh Start';
const SPREADSHEET_FIELD_ALIASES = {
    condition: ['condition'],
    desc: ['desc', 'description', 'desc/pu date', 'desc pu date'],
    brand: ['brand'],
    asin: ['asin'],
    name: ['item title', 'name', 'title'],
    seller: ['seller'],
    quantity: ['qty', 'quantity'],
    price: ['item price', 'price'],
    totalPrice: ['total price'],
    sku: ['sku'],
    location: ['loc', 'location'],
    receivedDate: ["rec'd", 'received', 'recd'],
    listDate: ['list date'],
    soldDate: ['sold date'],
    retail: ['retail'],
    soldFor: ['sold for'],
    profit: ['profit'],
    notes: ['notes'],
    hyperlink: ['link', 'hyperlink'],
    orderNumber: ['order #', 'order#', 'order number'],
    cost: ['cost'],
    purchaseName: ['purchase name'],
    purchaseSource: ['source of purchase', 'purchase source']
};

function normalizeText(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function parseNumberOrBlank(value) {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const normalizedValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[$,]/g, '').trim());
    return Number.isFinite(normalizedValue) ? normalizedValue : '';
}

function parseIntegerOrBlank(value) {
    if (value === undefined || value === null || value === '') {
        return '';
    }
    const normalizedValue = typeof value === 'number' ? value : parseInt(String(value).replace(/,/g, '').trim(), 10);
    return Number.isFinite(normalizedValue) ? normalizedValue : '';
}

function padDatePart(value) {
    return String(value).padStart(2, '0');
}

function formatDateMMDDYYYY(value) {
    if (value === undefined || value === null || value === '') {
        return '';
    }

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${padDatePart(value.getMonth() + 1)}/${padDatePart(value.getDate())}/${value.getFullYear()}`;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const excelDate = new Date(excelEpoch.getTime() + (value * 86400000));
        if (!Number.isNaN(excelDate.getTime())) {
            return formatDateMMDDYYYY(excelDate);
        }
    }

    const trimmedValue = String(value).trim();
    if (!trimmedValue) {
        return '';
    }

    const isoMatch = trimmedValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (isoMatch) {
        return `${padDatePart(isoMatch[2])}/${padDatePart(isoMatch[3])}/${isoMatch[1]}`;
    }

    const slashMatch = trimmedValue.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:,?\s.*)?$/);
    if (slashMatch) {
        let month = parseInt(slashMatch[1], 10);
        let day = parseInt(slashMatch[2], 10);
        let year = slashMatch[3];
        if (year.length === 2) {
            year = `20${year}`;
        }

        // If the first token cannot be a month, treat as DD/MM/YYYY and swap.
        if (month > 12 && day <= 12) {
            const tmp = month;
            month = day;
            day = tmp;
        }
        return `${padDatePart(month)}/${padDatePart(day)}/${year}`;
    }

    const parsedDate = new Date(trimmedValue);
    if (!Number.isNaN(parsedDate.getTime())) {
        return `${padDatePart(parsedDate.getMonth() + 1)}/${padDatePart(parsedDate.getDate())}/${parsedDate.getFullYear()}`;
    }

    return trimmedValue;
}

function normalizeUrl(value) {
    const trimmedValue = normalizeText(value);
    if (!trimmedValue || /\s/.test(trimmedValue)) {
        return '';
    }
    if (/^https?:\/\//i.test(trimmedValue)) {
        return trimmedValue;
    }
    if (/^[^\s]+\.[^\s]+/.test(trimmedValue)) {
        return `https://${trimmedValue}`;
    }
    return '';
}

function renderLinkedCell(value) {
    const text = normalizeText(value);
    if (!text) {
        return '';
    }
    const url = normalizeUrl(text);
    if (!url) {
        return text;
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
}

function ensureSecureLinkAttributes(scope = document) {
    if (!scope || !scope.querySelectorAll) {
        return;
    }
    const links = scope.querySelectorAll('a[href]');
    links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
    });
}

function calculateInventoryProfit(product) {
    const quantity = parseIntegerOrBlank(product.quantity);
    const soldFor = parseNumberOrBlank(product.soldFor);
    const totalPrice = parseNumberOrBlank(product.totalPrice);
    if (soldFor !== '' && totalPrice !== '') {
        const normalizedQuantity = quantity === '' || quantity === 0 ? 1 : quantity;
        return (soldFor * normalizedQuantity) - totalPrice;
    }
    const fallbackProfit = parseNumberOrBlank(product.profit);
    return fallbackProfit === '' ? '' : fallbackProfit;
}

function applySaleToInventoryRow(product, soldUnitPrice) {
    product.soldDate = formatDateMMDDYYYY(new Date());
    product.soldFor = soldUnitPrice;
    const recalculatedProfit = calculateInventoryProfit(product);
    product.profit = recalculatedProfit === '' ? '' : Number(recalculatedProfit).toFixed(2);
}

function normalizeNotes(notes) {
    if (!Array.isArray(notes)) {
        return [];
    }
    return notes
        .map(note => {
            if (typeof note === 'string') {
                return {type: 'Product', text: note.trim()};
            }
            return {
                type: note && note.type ? String(note.type) : 'Product',
                text: note && note.text ? String(note.text).trim() : ''
            };
        })
        .filter(note => note.text);
}

function normalizeProduct(product = {}) {
    const normalizedPrice = parseNumberOrBlank(product.price);
    const normalizedQuantity = parseIntegerOrBlank(product.quantity);
    const normalizedTotalPrice = parseNumberOrBlank(product.totalPrice);
    return {
        sku: normalizeText(product.sku),
        condition: normalizeText(product.condition),
        desc: normalizeText(product.desc !== undefined ? product.desc : product.descPuDate),
        brand: normalizeText(product.brand),
        asin: normalizeText(product.asin),
        name: normalizeText(product.name),
        seller: normalizeText(product.seller),
        quantity: normalizedQuantity === '' ? 0 : normalizedQuantity,
        price: normalizedPrice === '' ? 0 : normalizedPrice,
        totalPrice: normalizedTotalPrice !== '' ? normalizedTotalPrice : ((normalizedPrice !== '' && normalizedQuantity !== '') ? normalizedPrice * normalizedQuantity : ''),
        skuDisplay: normalizeText(product.skuDisplay),
        location: normalizeText(product.location),
        receivedDate: normalizeText(product.receivedDate),
        listDate: normalizeText(product.listDate),
        soldDate: normalizeText(product.soldDate),
        retail: parseNumberOrBlank(product.retail),
        soldFor: parseNumberOrBlank(product.soldFor),
        profit: parseNumberOrBlank(product.profit),
        notes: normalizeNotes(product.notes),
        hyperlink: normalizeText(product.hyperlink),
        orderNumber: normalizeText(product.orderNumber),
        cost: parseNumberOrBlank(product.cost) === '' ? 0 : parseNumberOrBlank(product.cost),
        purchaseName: normalizeText(product.purchaseName),
        purchaseSource: normalizeText(product.purchaseSource)
    };
}

function mergeProductData(existingProduct, importedProduct, importedFields) {
    const mergedProduct = normalizeProduct(existingProduct);
    importedFields.forEach(field => {
        if (field === 'name' || field === 'seller') {
            mergedProduct[field] = normalizeText(importedProduct[field]);
            return;
        }

        if (field === 'notes') {
            const existingNotes = normalizeNotes(mergedProduct.notes);
            const incomingNotes = normalizeNotes(importedProduct.notes);
            const seenNotes = new Set(existingNotes.map(note => `${note.type}|${note.text}`));
            incomingNotes.forEach(note => {
                const noteKey = `${note.type}|${note.text}`;
                if (!seenNotes.has(noteKey)) {
                    existingNotes.push(note);
                    seenNotes.add(noteKey);
                }
            });
            mergedProduct.notes = existingNotes;
            return;
        }

        const nextValue = importedProduct[field];
        if (nextValue === undefined || nextValue === null || nextValue === '') {
            return;
        }
        mergedProduct[field] = nextValue;
    });

    return normalizeProduct(mergedProduct);
}

function getSpreadsheetColumnMap(headers) {
    const colMap = {};
    headers.forEach((header, index) => {
        const normalizedHeader = normalizeText(header).toLowerCase();
        if (!normalizedHeader) {
            return;
        }
        Object.keys(SPREADSHEET_FIELD_ALIASES).forEach(field => {
            if (!colMap[field] && SPREADSHEET_FIELD_ALIASES[field].includes(normalizedHeader)) {
                colMap[field] = index;
            }
        });
    });
    return colMap;
}

function getWorksheetCellValue(worksheet, rowIndex, columnIndex) {
    if (columnIndex === undefined) {
        return '';
    }
    const cellAddr = XLSX.utils.encode_cell({r: rowIndex, c: columnIndex});
    const cell = worksheet[cellAddr];
    if (!cell) {
        return '';
    }
    if (cell.l) {
        return cell.l.Target || cell.l || '';
    }
    if (cell.w !== undefined && cell.w !== null && cell.w !== '') {
        return cell.w;
    }
    return cell.v === undefined || cell.v === null ? '' : cell.v;
}

// Ensure products use the canonical spreadsheet_1 field model
products = products.map(normalizeProduct);

// Ensure sales have pickedUp and profit
sales = sales.map(s => ({
    ...s,
    date: formatDateMMDDYYYY(s.date),
    pickedUp: s.pickedUp || false,
    profit: s.profit !== undefined ? s.profit : ((s.price - (products.find(p => p.sku === s.sku)?.cost || 0)) * s.quantity)
}));

// Filtered sales for details view
let filteredSales = sales;
let isSortedByLocation = false;
let filteredProducts = products;
let inventoryKeywordTerm = '';
let inventoryLocationTerm = '';
let inventoryFieldFilter = '';
let inventoryFieldTerm = '';
let inventorySortField = '';
let inventorySortDirection = 'asc';
let inventoryPage = 1;
const ITEMS_PER_PAGE = 100;
const INVENTORY_FILTER_FIELD_OPTIONS = {
    condition: 'Condition',
    desc: 'Desc',
    brand: 'Brand',
    asin: 'ASIN',
    name: 'Item Title',
    seller: 'Seller',
    quantity: 'Qty',
    price: 'Item Price',
    totalPrice: 'Total Price',
    sku: 'SKU',
    location: 'Loc',
    receivedDate: "Rec'd",
    listDate: 'List Date',
    soldDate: 'Sold Date',
    retail: 'Retail',
    soldFor: 'Sold For',
    profit: 'Profit',
    notes: 'Notes',
    hyperlink: 'Link',
    orderNumber: 'Order #',
    cost: 'Cost',
    purchaseName: 'Purchase Name',
    purchaseSource: 'Source of Purchase'
};
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

if (mainContent && typeof MutationObserver !== 'undefined') {
    const secureLinksObserver = new MutationObserver(() => {
        ensureSecureLinkAttributes(mainContent);
    });
    secureLinksObserver.observe(mainContent, {childList: true, subtree: true});
}

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

function matchesInventoryKeyword(product, term) {
    return Object.keys(product).some(key => {
        const value = product[key];
        if (typeof value === 'string') {
            return value.toLowerCase().includes(term);
        }
        if (typeof value === 'number') {
            return String(value).toLowerCase().includes(term);
        }
        if (Array.isArray(value)) {
            return value.some(note => typeof note.text === 'string' && note.text.toLowerCase().includes(term));
        }
        return false;
    });
}

function getInventoryFieldPlaceholder() {
    if (inventoryFieldFilter && INVENTORY_FILTER_FIELD_OPTIONS[inventoryFieldFilter]) {
        return `Filter by ${INVENTORY_FILTER_FIELD_OPTIONS[inventoryFieldFilter]}`;
    }
    return 'Choose a field to filter';
}

function getFilterableFieldValue(product, field) {
    const value = product[field];
    if (Array.isArray(value)) {
        return value.map(note => (note && typeof note.text === 'string' ? note.text : '')).join(' ');
    }
    return normalizeText(value);
}

function getSortableHeaderLabel(label, field) {
    if (inventorySortField !== field) {
        return label;
    }
    return `${label} ${inventorySortDirection === 'asc' ? '▲' : '▼'}`;
}

function compareInventoryValues(leftValue, rightValue) {
    const leftNumber = parseFloat(leftValue);
    const rightNumber = parseFloat(rightValue);
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
        return leftNumber - rightNumber;
    }
    return String(leftValue).localeCompare(String(rightValue), undefined, {numeric: true, sensitivity: 'base'});
}

function applyInventoryFiltersAndSorting() {
    let nextProducts = [...products];

    if (inventoryKeywordTerm) {
        nextProducts = nextProducts.filter(product => matchesInventoryKeyword(product, inventoryKeywordTerm));
    }

    if (inventoryLocationTerm) {
        nextProducts = nextProducts.filter(product => (product.location || '').toLowerCase().includes(inventoryLocationTerm));
    }

    if (inventoryFieldFilter && inventoryFieldTerm) {
        nextProducts = nextProducts.filter(product => getFilterableFieldValue(product, inventoryFieldFilter).toLowerCase().includes(inventoryFieldTerm));
    }

    if (inventorySortField) {
        nextProducts.sort((a, b) => {
            const comparison = compareInventoryValues(normalizeText(a[inventorySortField]), normalizeText(b[inventorySortField]));
            return inventorySortDirection === 'asc' ? comparison : comparison * -1;
        });
    } else if (isSortedByLocation) {
        nextProducts.sort((a, b) => (a.location || '').toLowerCase().localeCompare((b.location || '').toLowerCase()));
    }

    filteredProducts = nextProducts;
}

function showUploadForm() {
    mainContent.innerHTML = `
        <h2>Upload Spreadsheet</h2>
        <form id="uploadForm" autocomplete="off" novalidate>
            <label for="fileInput" style="display:block;margin-bottom:1rem;font-weight:bold;">Choose Excel file (.xlsx, .xls):</label>
            <input type="file" id="fileInput" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" required style="font-size:1.1rem;padding:0.5rem;width:100%;max-width:350px;" />
            <button type="submit" style="margin-top:1rem;">Upload and Import</button>
        </form>
        <div id="iosHint" style="margin-top:1rem;color:#555;font-size:0.95rem;">Uploads merge into the current Inventory view by SKU. Existing items stay in place, matching SKUs are updated from the spreadsheet, and new SKUs are appended. If you have trouble selecting a file on iPhone/iPad, make sure the file is saved in your Files app, then try again.</div>
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
            const sheetName = workbook.SheetNames.includes(CANONICAL_SHEET_NAME) ? CANONICAL_SHEET_NAME : workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            if (!worksheet || !worksheet['!ref']) {
                throw new Error('The selected workbook does not contain a readable inventory sheet.');
            }

            const range = XLSX.utils.decode_range(worksheet['!ref']);
            const maxRow = range.e.r;
            const maxCol = range.e.c;
            const headers = [];
            for (let c = 0; c <= maxCol; c++) {
                headers.push(getWorksheetCellValue(worksheet, 0, c));
            }
            const colMap = getSpreadsheetColumnMap(headers);
            if (colMap.sku === undefined) {
                throw new Error(`The workbook must contain the SKU column from ${CANONICAL_SPREADSHEET_NAME}.`);
            }

            let addedCount = 0;
            let updatedCount = 0;
            for (let r = 1; r <= maxRow; r++) {
                const sku = normalizeText(getWorksheetCellValue(worksheet, r, colMap.sku));
                if (!sku) {
                    continue;
                }

                const importedFields = ['sku'];
                const importedProduct = {
                    sku,
                    condition: normalizeText(getWorksheetCellValue(worksheet, r, colMap.condition)),
                    desc: normalizeText(getWorksheetCellValue(worksheet, r, colMap.desc)),
                    brand: normalizeText(getWorksheetCellValue(worksheet, r, colMap.brand)),
                    asin: normalizeText(getWorksheetCellValue(worksheet, r, colMap.asin)),
                    name: normalizeText(getWorksheetCellValue(worksheet, r, colMap.name)),
                    seller: normalizeText(getWorksheetCellValue(worksheet, r, colMap.seller)),
                    quantity: parseIntegerOrBlank(getWorksheetCellValue(worksheet, r, colMap.quantity)),
                    price: parseNumberOrBlank(getWorksheetCellValue(worksheet, r, colMap.price)),
                    totalPrice: parseNumberOrBlank(getWorksheetCellValue(worksheet, r, colMap.totalPrice)),
                    cost: parseNumberOrBlank(getWorksheetCellValue(worksheet, r, colMap.cost)),
                    location: normalizeText(getWorksheetCellValue(worksheet, r, colMap.location)),
                    receivedDate: normalizeText(getWorksheetCellValue(worksheet, r, colMap.receivedDate)),
                    listDate: normalizeText(getWorksheetCellValue(worksheet, r, colMap.listDate)),
                    soldDate: normalizeText(getWorksheetCellValue(worksheet, r, colMap.soldDate)),
                    retail: parseNumberOrBlank(getWorksheetCellValue(worksheet, r, colMap.retail)),
                    soldFor: parseNumberOrBlank(getWorksheetCellValue(worksheet, r, colMap.soldFor)),
                    profit: parseNumberOrBlank(getWorksheetCellValue(worksheet, r, colMap.profit)),
                    hyperlink: normalizeText(getWorksheetCellValue(worksheet, r, colMap.hyperlink)),
                    orderNumber: normalizeText(getWorksheetCellValue(worksheet, r, colMap.orderNumber)),
                    purchaseName: normalizeText(getWorksheetCellValue(worksheet, r, colMap.purchaseName)),
                    purchaseSource: normalizeText(getWorksheetCellValue(worksheet, r, colMap.purchaseSource)),
                    notes: []
                };

                Object.keys(colMap).forEach(field => {
                    if (field === 'notes' || field === 'sku') {
                        return;
                    }
                    const rawValue = getWorksheetCellValue(worksheet, r, colMap[field]);
                    if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
                        importedFields.push(field);
                    }
                });

                if (colMap.name !== undefined && !importedFields.includes('name')) {
                    importedFields.push('name');
                }
                if (colMap.seller !== undefined && !importedFields.includes('seller')) {
                    importedFields.push('seller');
                }

                const noteText = normalizeText(getWorksheetCellValue(worksheet, r, colMap.notes));
                if (noteText) {
                    importedProduct.notes = [{type: 'Product', text: noteText}];
                    importedFields.push('notes');
                }

                const existingIndex = products.findIndex(product => product.sku === sku);
                if (existingIndex >= 0) {
                    products[existingIndex] = mergeProductData(products[existingIndex], importedProduct, importedFields);
                    updatedCount++;
                } else {
                    products.push(normalizeProduct(importedProduct));
                    addedCount++;
                }
            }

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
            <label for="name">Item Title:</label>
            <input type="text" id="name" required>
            <label for="brand">Brand:</label>
            <input type="text" id="brand">
            <label for="seller">Seller:</label>
            <input type="text" id="seller">
            <label for="cost">Cost:</label>
            <input type="number" id="cost" step="0.01" required>
            <label for="price">Item Price:</label>
            <input type="number" id="price" step="0.01" required>
            <label for="quantity">Qty:</label>
            <input type="number" id="quantity" required>
            <label for="location">Loc:</label>
            <input type="text" id="location">
            <label for="receivedDate">Rec'd:</label>
            <input type="text" id="receivedDate">
            <label for="hyperlink">Link:</label>
            <input type="url" id="hyperlink">
            <label for="orderNumber">Order #:</label>
            <input type="text" id="orderNumber">
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
    const brand = document.getElementById('brand').value;
    const seller = document.getElementById('seller').value;
    const cost = parseFloat(document.getElementById('cost').value);
    const price = parseFloat(document.getElementById('price').value);
    const quantity = parseInt(document.getElementById('quantity').value);
    const location = document.getElementById('location').value;
    const receivedDate = document.getElementById('receivedDate').value;
    const hyperlink = document.getElementById('hyperlink').value;
    const orderNumber = document.getElementById('orderNumber').value;
    const purchaseName = document.getElementById('purchaseName').value;
    const purchaseSource = document.getElementById('purchaseSource').value;
    const notesText = document.getElementById('notes').value;
    // Check if SKU already exists
    if (products.find(p => p.sku === sku)) {
        alert('SKU already exists!');
        return;
    }
    const notes = notesText ? [{type: 'Product', text: notesText}] : [];
    products.push(normalizeProduct({ sku, name, brand, seller, cost, price, quantity, location, receivedDate, hyperlink, orderNumber, notes, purchaseName, purchaseSource }));
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
            <label for="editName">Item Title:</label>
            <input type="text" id="editName" value="${product.name}" required>
            <label for="editBrand">Brand:</label>
            <input type="text" id="editBrand" value="${product.brand || ''}">
            <label for="editSeller">Seller:</label>
            <input type="text" id="editSeller" value="${product.seller || ''}">
            <label for="editCost">Cost:</label>
            <input type="number" id="editCost" step="0.01" value="${product.cost}" required>
            <label for="editPrice">Item Price:</label>
            <input type="number" id="editPrice" step="0.01" value="${product.price}" required>
            <label for="editQuantity">Qty:</label>
            <input type="number" id="editQuantity" value="${product.quantity}" required>
            <label for="editLocation">Loc:</label>
            <input type="text" id="editLocation" value="${product.location}">
            <label for="editReceivedDate">Rec'd:</label>
            <input type="text" id="editReceivedDate" value="${product.receivedDate || ''}">
            <label for="editHyperlink">Link:</label>
            <input type="url" id="editHyperlink" value="${product.hyperlink}">
            <label for="editOrderNumber">Order #:</label>
            <input type="text" id="editOrderNumber" value="${product.orderNumber || ''}">
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
    const brand = document.getElementById('editBrand').value;
    const seller = document.getElementById('editSeller').value;
    const cost = parseFloat(document.getElementById('editCost').value);
    const price = parseFloat(document.getElementById('editPrice').value);
    const quantity = parseInt(document.getElementById('editQuantity').value);
    const location = document.getElementById('editLocation').value;
    const receivedDate = document.getElementById('editReceivedDate').value;
    const hyperlink = document.getElementById('editHyperlink').value;
    const orderNumber = document.getElementById('editOrderNumber').value;
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
    products[productIndex] = normalizeProduct({
        ...products[productIndex],
        sku: newSku,
        name,
        brand,
        seller,
        cost,
        price,
        quantity,
        location,
        receivedDate,
        hyperlink,
        orderNumber,
        notes,
        purchaseName,
        purchaseSource
    });
    saveData();
    alert('Product updated successfully!');
    showInventory();
}

function deleteProduct(sku) {
    const productIndex = products.findIndex(product => product.sku === sku);
    if (productIndex === -1) {
        return;
    }
    const product = products[productIndex];
    const confirmDelete = window.confirm(`Delete inventory row for SKU ${product.sku}${product.name ? ` (${product.name})` : ''}?`);
    if (!confirmDelete) {
        return;
    }
    products.splice(productIndex, 1);
    saveData();
    showInventory(isSortedByLocation);
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
                    <label>Item Title:<br><input type="text" id="newName" required></label><br>
                    <label>Brand:<br><input type="text" id="newBrand"></label><br>
                    <label>Seller:<br><input type="text" id="newSeller"></label><br>
                    <label>Cost:<br><input type="number" id="newCost" step="0.01" required></label><br>
                    <label>Item Price:<br><input type="number" id="newPrice" step="0.01" required></label><br>
                    <label>Qty:<br><input type="number" id="newQuantity" value="1" required></label><br>
                    <label>Loc:<br><input type="text" id="newLocation"></label><br>
                    <label>Rec'd:<br><input type="text" id="newReceivedDate"></label><br>
                    <label>Link:<br><input type="url" id="newHyperlink"></label><br>
                    <label>Order #:<br><input type="text" id="newOrderNumber"></label><br>
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
                const brand = document.getElementById('newBrand').value;
                const seller = document.getElementById('newSeller').value;
                const cost = parseFloat(document.getElementById('newCost').value);
                const price = parseFloat(document.getElementById('newPrice').value);
                const quantity = parseInt(document.getElementById('newQuantity').value);
                const location = document.getElementById('newLocation').value;
                const receivedDate = document.getElementById('newReceivedDate').value;
                const hyperlink = document.getElementById('newHyperlink').value;
                const orderNumber = document.getElementById('newOrderNumber').value;
                const purchaseName = document.getElementById('newPurchaseName').value;
                const purchaseSource = document.getElementById('newPurchaseSource').value;
                const notesText = document.getElementById('newNotes').value;
                if (products.find(p => p.sku === sku)) {
                    alert('SKU already exists!');
                    return;
                }
                const notes = notesText ? [{type: 'Product', text: notesText}] : [];
                products.push(normalizeProduct({ sku, name, brand, seller, cost, price, quantity, location, receivedDate, hyperlink, orderNumber, notes, purchaseName, purchaseSource }));
                saveData();
                scanResult.innerHTML = `<span style='color:green;'>Product added successfully!</span>`;
                showInventory();
            };
            return;
        }
        scanResult.innerHTML = `<b>Item Title:</b> ${product.name} (SKU: ${product.sku})<br>Current Qty: ${product.quantity}<br><button id="addBtn">Add to Inventory</button> <button id="subtractBtn">Subtract from Inventory</button>`;
        document.getElementById('addBtn').onclick = function() {
            product.quantity += 1;
            saveData();
            scanResult.innerHTML = `<span style='color:green;'>Added 1. New Qty: ${product.quantity}</span>`;
            showInventory();
        };
        document.getElementById('subtractBtn').onclick = function() {
            if (product.quantity <= 0) {
                scanResult.innerHTML = '<span style="color:red;">Product out of stock!</span>';
                return;
            }
            product.quantity -= 1;
            applySaleToInventoryRow(product, product.price);
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
                date: formatDateMMDDYYYY(new Date()),
                pickedUp: false
            });
            saveData();
            scanResult.innerHTML = `<span style='color:orange;'>Subtracted 1 (sold). New Qty: ${product.quantity}. Sale recorded.</span>`;
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
    applySaleToInventoryRow(product, product.price);
    
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
        date: formatDateMMDDYYYY(new Date()),
        pickedUp: false
    });
    
    saveData();
    alert(`Sale completed! Profit: $${profit.toFixed(2)}`);
    showInventory();
}

function showInventory(sortByLocation = false) {
    try {
        applyInventoryFiltersAndSorting();
        
        let html = '<h2>Inventory</h2>';
        html += `<input type="text" id="keywordSearch" value="${inventoryKeywordTerm}" placeholder="Search any inventory field..." style="width:320px;max-width:90vw;"> <button id="keywordSearchBtn">Search</button> <button onclick="clearKeywordSearch()">Clear</button> `;
        html += `<input type="text" id="locationSearch" value="${inventoryLocationTerm}" placeholder="Search by Loc" style="width:160px;max-width:60vw;"> <button onclick="filterByLocation()">Search</button> <button onclick="clearLocationSearch()">Clear</button><br>`;
        html += `<select id="fieldFilterSelect" onchange="updateInventoryFieldPlaceholder()" style="margin-top:0.5rem;">
            <option value="">Filter field</option>`;
        Object.keys(INVENTORY_FILTER_FIELD_OPTIONS).forEach(field => {
            const selected = inventoryFieldFilter === field ? 'selected' : '';
            html += `<option value="${field}" ${selected}>${INVENTORY_FILTER_FIELD_OPTIONS[field]}</option>`;
        });
        html += `</select> `;
        html += `<input type="text" id="fieldFilterValue" value="${inventoryFieldTerm}" placeholder="${getInventoryFieldPlaceholder()}" style="width:220px;max-width:70vw;"> <button onclick="filterBySelectedField()">Apply</button> <button onclick="clearFieldFilter()">Clear</button> `;
        html += `<select id="sortFieldSelect" onchange="applySortField()" style="margin-top:0.5rem;">
            <option value="" ${inventorySortField === '' ? 'selected' : ''}>Default sort</option>
            <option value="location" ${inventorySortField === 'location' ? 'selected' : ''}>Sort by Loc</option>
            <option value="brand" ${inventorySortField === 'brand' ? 'selected' : ''}>Sort by Brand</option>
            <option value="seller" ${inventorySortField === 'seller' ? 'selected' : ''}>Sort by Seller</option>
            <option value="receivedDate" ${inventorySortField === 'receivedDate' ? 'selected' : ''}>Sort by Rec'd</option>
            <option value="listDate" ${inventorySortField === 'listDate' ? 'selected' : ''}>Sort by List Date</option>
            <option value="soldDate" ${inventorySortField === 'soldDate' ? 'selected' : ''}>Sort by Sold Date</option>
            <option value="orderNumber" ${inventorySortField === 'orderNumber' ? 'selected' : ''}>Sort by Order #</option>
        </select>`;
        // Pagination controls
        const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
        if (inventoryPage > totalPages) inventoryPage = totalPages;
        if (inventoryPage < 1) inventoryPage = 1;
        const startIdx = filteredProducts.length > 0 ? (inventoryPage - 1) * ITEMS_PER_PAGE : 0;
        const endIdx = filteredProducts.length > 0 ? Math.min(startIdx + ITEMS_PER_PAGE, filteredProducts.length) : 0;
        const shownItemCount = filteredProducts.length > 0 ? endIdx - startIdx : 0;
        html += `<div style='margin:0.25rem 0;font-size:0.9rem;'>Showing ${shownItemCount} of ${filteredProducts.length} items (page ${inventoryPage})</div>`;
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
                            <th>Desc</th>
                                <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('brand')">${getSortableHeaderLabel('Brand', 'brand')}</th>
                            <th>ASIN</th>
                                <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('name')">${getSortableHeaderLabel('Item Title', 'name')}</th>
                                <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('seller')">${getSortableHeaderLabel('Seller', 'seller')}</th>
                            <th>Qty</th>
                            <th>Item Price</th>
                            <th>Total Price</th>
                            <th>SKU</th>
                            <th>Loc</th>
                                <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('receivedDate')">${getSortableHeaderLabel("Rec'd", 'receivedDate')}</th>
                            <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('listDate')">${getSortableHeaderLabel('List Date', 'listDate')}</th>
                            <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('soldDate')">${getSortableHeaderLabel('Sold Date', 'soldDate')}</th>
                            <th>Retail</th>
                            <th>Sold For</th>
                            <th>Profit</th>
                            <th>Notes</th>
                            <th>Link</th>
                                <th style="cursor:pointer;user-select:none;" onclick="sortInventoryByField('orderNumber')">${getSortableHeaderLabel('Order #', 'orderNumber')}</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            for (let i = startIdx; i < endIdx; i++) {
                const product = filteredProducts[i];
                // Ensure all fields are present
                const condition = product.condition || '';
                const desc = product.desc || '';
                const brand = product.brand || '';
                const asin = product.asin || '';
                const name = renderLinkedCell(product.name);
                const seller = renderLinkedCell(product.seller);
                const quantity = product.quantity || 0;
                const price = product.price ? Number(product.price) : 0;
                const totalPrice = product.totalPrice ? Number(product.totalPrice) : (price && quantity ? price * quantity : 0);
                const sku = product.sku || '';
                const location = product.location || '';
                const receivedDate = normalizeText(product.receivedDate);
                const listDate = normalizeText(product.listDate);
                const soldDate = normalizeText(product.soldDate);
                const retail = product.retail ? Number(product.retail) : 0;
                const soldFor = product.soldFor ? Number(product.soldFor) : 0;
                const orderNumber = product.orderNumber || '';
                const calculatedProfit = calculateInventoryProfit(product);
                const profit = calculatedProfit === '' ? '' : Number(calculatedProfit).toFixed(2);
                const notesArr = product.notes && Array.isArray(product.notes) ? product.notes.map(note => note.text) : [];
                const notes = notesArr.join('; ');
                const hyperlink = renderLinkedCell(product.hyperlink);
                const escapedSku = (sku).replace(/'/g, "\\'");
                html += `
                    <tr>
                        <td>${condition}</td>
                        <td>${desc}</td>
                        <td>${brand}</td>
                        <td>${asin}</td>
                        <td>${name}</td>
                        <td>${seller}</td>
                        <td>${quantity}</td>
                        <td>$${price ? price.toFixed(2) : ''}</td>
                        <td>$${totalPrice ? totalPrice.toFixed(2) : ''}</td>
                        <td>${sku}</td>
                        <td>${location}</td>
                        <td>${receivedDate}</td>
                        <td>${listDate}</td>
                        <td>${soldDate}</td>
                        <td>$${retail ? retail.toFixed(2) : ''}</td>
                        <td>$${soldFor ? soldFor.toFixed(2) : ''}</td>
                        <td>$${profit}</td>
                        <td>${notes}</td>
                        <td>${hyperlink}</td>
                        <td>${orderNumber}</td>
                        <td><button onclick="editProduct('${escapedSku}')">Edit</button> <button onclick="deleteProduct('${escapedSku}')">Delete</button></td>
                    </tr>
                `;
            }
            html += '</tbody></table>';
        }
        mainContent.innerHTML = html;
        ensureSecureLinkAttributes(mainContent);
        // Attach search events
        setTimeout(() => {
            const kwInput = document.getElementById('keywordSearch');
            const kwBtn = document.getElementById('keywordSearchBtn');
            const locationInput = document.getElementById('locationSearch');
            const fieldInput = document.getElementById('fieldFilterValue');
            if (kwInput) {
                kwInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') filterByKeyword(); });
            }
            if (kwBtn) {
                kwBtn.onclick = filterByKeyword;
            }
            if (locationInput) {
                locationInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') filterByLocation(); });
            }
            if (fieldInput) {
                fieldInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') filterBySelectedField(); });
            }
        }, 0);
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
                <label for="productSelect">Select Item Title:</label>
                <select id="productSelect" required>
                    <option value="">Choose an item</option>
        `;
        products.forEach((product, index) => {
            if (product.quantity > 0) {
                html += `<option value="${index}">${product.name} (SKU: ${product.sku}) - $${product.price.toFixed(2)} (${product.quantity} available)</option>`;
            }
        });
        html += `
                </select>
                <label for="saleQuantity">Qty:</label>
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
                                barcodeArea.innerHTML = `<span style='color:green;'>Item Title selected: ${products[idx].name} (SKU: ${products[idx].sku})</span>`;
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
    applySaleToInventoryRow(product, product.price);
    
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
        date: formatDateMMDDYYYY(new Date()),
        pickedUp: false
    });
    
    saveData();
    alert(`Sale completed! Total Price: $${saleAmount.toFixed(2)}`);
    showInventory();
}

function showSalesSummary() {
    const totalSales = sales.length;
    const totalRevenue = revenue;
    
    mainContent.innerHTML = `
        <h2>Sales Summary</h2>
        <p>Sold Count: ${totalSales}</p>
        <p>Sold For Total: $${totalRevenue.toFixed(2)}</p>
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
                        <th>Sold Date</th>
                        <th>SKU</th>
                        <th>Item Title</th>
                        <th>Qty</th>
                        <th>Item Price</th>
                        <th>Total Price</th>
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
                    <td>${formatDateMMDDYYYY(sale.date)}</td>
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
    inventorySortField = isSortedByLocation ? 'location' : '';
    inventorySortDirection = 'asc';
    showInventory(isSortedByLocation);
}

function filterByLocation() {
    const term = document.getElementById('locationSearch').value.toLowerCase().trim();
    inventoryLocationTerm = term;
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function clearLocationSearch() {
    document.getElementById('locationSearch').value = '';
    inventoryLocationTerm = '';
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function filterByKeyword() {
    const input = document.getElementById('keywordSearch');
    if (!input) return;
    const term = input.value.trim().toLowerCase();
    if (term.length < 3) {
        alert('Enter at least 3 letters to search.');
        return;
    }
    inventoryKeywordTerm = term;
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function clearKeywordSearch() {
    const input = document.getElementById('keywordSearch');
    if (input) input.value = '';
    inventoryKeywordTerm = '';
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function updateInventoryFieldPlaceholder() {
    const fieldSelect = document.getElementById('fieldFilterSelect');
    const fieldInput = document.getElementById('fieldFilterValue');
    if (!fieldSelect || !fieldInput) {
        return;
    }
    inventoryFieldFilter = fieldSelect.value;
    fieldInput.placeholder = getInventoryFieldPlaceholder();
}

function filterBySelectedField() {
    const fieldSelect = document.getElementById('fieldFilterSelect');
    const fieldInput = document.getElementById('fieldFilterValue');
    if (!fieldSelect || !fieldInput) {
        return;
    }
    const field = fieldSelect.value;
    const term = fieldInput.value.trim().toLowerCase();
    if (!field) {
        alert('Choose a filter field first.');
        return;
    }
    if (term.length < 1) {
        alert('Enter a value to filter.');
        return;
    }
    inventoryFieldFilter = field;
    inventoryFieldTerm = term;
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function clearFieldFilter() {
    const fieldSelect = document.getElementById('fieldFilterSelect');
    const fieldInput = document.getElementById('fieldFilterValue');
    if (fieldSelect) {
        fieldSelect.value = '';
    }
    if (fieldInput) {
        fieldInput.value = '';
        fieldInput.placeholder = getInventoryFieldPlaceholder();
    }
    inventoryFieldFilter = '';
    inventoryFieldTerm = '';
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function applySortField() {
    const sortSelect = document.getElementById('sortFieldSelect');
    const nextSortField = sortSelect ? sortSelect.value : '';
    if (inventorySortField !== nextSortField) {
        inventorySortDirection = 'asc';
    }
    inventorySortField = nextSortField;
    isSortedByLocation = inventorySortField === 'location';
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}

function sortInventoryByField(field) {
    if (inventorySortField === field) {
        inventorySortDirection = inventorySortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        inventorySortField = field;
        inventorySortDirection = 'asc';
    }
    isSortedByLocation = field === 'location';
    const sortSelect = document.getElementById('sortFieldSelect');
    if (sortSelect) {
        sortSelect.value = field;
    }
    inventoryPage = 1;
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
