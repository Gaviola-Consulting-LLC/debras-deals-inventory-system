// Per-header search for inventory table
function filterByHeader() {
    // Collect all header search values
    const fields = [
        { id: 'searchSku', key: 'sku' },
        { id: 'searchName', key: 'name' },
        { id: 'searchCost', key: 'cost' },
        { id: 'searchPrice', key: 'price' },
        { id: 'searchQuantity', key: 'quantity' },
        { id: 'searchLocation', key: 'location' },
        { id: 'searchPurchaseName', key: 'purchaseName' },
        { id: 'searchPurchaseSource', key: 'purchaseSource' },
        { id: 'searchHyperlink', key: 'hyperlink' },
        { id: 'searchNotes', key: 'notes' }
    ];
    let filters = {};
    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el && el.value.trim() !== '') {
            filters[f.key] = el.value.trim().toLowerCase();
        }
    });
    filteredProducts = products.filter(p => {
        return Object.entries(filters).every(([key, val]) => {
            if (key === 'notes') {
                return (Array.isArray(p.notes) ? p.notes.map(n => n.text).join(' ') : '').toLowerCase().includes(val);
            }
            return p[key] !== undefined && String(p[key]).toLowerCase().includes(val);
        });
    });
    inventoryPage = 1;
    showInventory(isSortedByLocation);
}
// --- Advanced Search Functions (Top Level, Only Once) ---
function filterSalesByKeyword() {
    const input = document.getElementById('salesKeywordSearch');
    if (!input) return;
    const term = input.value.trim().toLowerCase();
    if (term.length < 2) {
        filteredSales = sales;
        showSalesDetails();
        return;
    }
    filteredSales = sales.filter(sale => {
        return [
            sale.date, sale.sku, sale.name, sale.quantity, sale.price, sale.total, sale.profit, sale.pickedUp
        ].some(val => (val !== undefined && String(val).toLowerCase().includes(term)));
    });
    showSalesDetails();
}
function clearSalesKeywordSearch() {
    document.getElementById('salesKeywordSearch').value = '';
    filteredSales = sales;
    showSalesDetails();
}