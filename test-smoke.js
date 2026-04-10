// Basic smoke tests for Debra's Deals Inventory System
// These tests use simple DOM and function checks. For full automation, use a test runner like Jest + jsdom or Cypress.

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function testInventorySearch() {
    // Add a test product
    products.push({
        sku: 'TESTSKU', name: 'Test Product', cost: 1, price: 2, quantity: 5, location: 'TestLoc',
        hyperlink: '', notes: [{type: 'Product', text: 'Test note'}], purchaseName: 'TestPN', purchaseSource: 'TestPS'
    });
    saveData();
    showInventory();
    document.getElementById('keywordSearch').value = 'TestSKU';
    filterByKeyword();
    assert(filteredProducts.length === 1 && filteredProducts[0].sku === 'TESTSKU', 'Inventory search by SKU failed');
    document.getElementById('keywordSearch').value = 'Test Product';
    filterByKeyword();
    assert(filteredProducts.length === 1 && filteredProducts[0].name === 'Test Product', 'Inventory search by name failed');
    clearKeywordSearch();
}

function testSalesSearch() {
    // Add a test sale
    sales.push({
        sku: 'TESTSKU', name: 'Test Product', quantity: 1, price: 2, total: 2, profit: 1, date: new Date().toLocaleString(), pickedUp: false
    });
    saveData();
    showSalesDetails();
    document.getElementById('salesKeywordSearch').value = 'TestSKU';
    filterSalesByKeyword();
    assert(filteredSales.length >= 1 && filteredSales.some(s => s.sku === 'TESTSKU'), 'Sales search by SKU failed');
    clearSalesKeywordSearch();
}

function runAllTests() {
    try {
        testInventorySearch();
        testSalesSearch();
        alert('All automated tests passed!');
    } catch (e) {
        alert('Test failed: ' + e.message);
    }
}

// Run tests automatically on load, but delay to ensure all scripts/UI are ready
window.addEventListener('DOMContentLoaded', function() {
    setTimeout(runAllTests, 500); // 500ms delay ensures global variables and UI are ready
});
