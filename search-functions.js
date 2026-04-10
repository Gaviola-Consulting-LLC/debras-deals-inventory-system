// --- Advanced Search Functions (Top Level, Only Once) ---
function filterByKeyword() {
    const input = document.getElementById('keywordSearch');
    if (!input) return;
    const term = input.value.trim().toLowerCase();
    if (term.length < 2) {
        filteredProducts = products;
        showInventory(isSortedByLocation);
        return;
    }
    filteredProducts = products.filter(p => {
        return [
            p.sku, p.name, p.cost, p.price, p.quantity, p.location, p.purchaseName, p.purchaseSource, p.hyperlink,
            ...(Array.isArray(p.notes) ? p.notes.map(n => n.text) : [])
        ].some(val => (val !== undefined && String(val).toLowerCase().includes(term)));
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