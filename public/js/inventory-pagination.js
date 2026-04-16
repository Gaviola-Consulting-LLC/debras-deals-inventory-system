/*
 * Inventory pagination integration guide (additive enhancement)
 *
 * 1) Include this file AFTER jQuery on the inventory page, for example:
 *      <script src="public/js/inventory-pagination.js"></script>
 *    If your app serves static assets from a different location, move this file
 *    and/or update the script src path accordingly.
 *
 * 2) Ensure your inventory HTML contains:
 *      - A table body where rows are rendered (default selector: #inventory-table tbody)
 *      - A pagination container (default selector: #pagination-controls)
 *      - Delete buttons rendered with class "delete-btn" and item id in data-id
 *
 * 3) Initialize after DOM ready:
 *      $(function () {
 *        window.InventoryPagination.init();
 *      });
 *
 * 4) This script assumes the backend paginated response shape is:
 *      { items: [...], total: ... }
 *    from GET /api/inventory?page=...&limit=...
 */
(function (global, $) {
    'use strict';

    if (!$) {
        throw new Error('inventory-pagination.js requires jQuery.');
    }

    var state = {
        page: 1,
        limit: 10,
        total: 0,
        items: []
    };

    var settings = {
        endpoint: '/api/inventory',
        tableBodySelector: '#inventory-table tbody',
        paginationSelector: '#pagination-controls',
        deleteButtonSelector: '.delete-btn',
        idField: '_id',
        columns: ['name', 'quantity']
    };

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getTotalPages() {
        return Math.max(1, Math.ceil(state.total / state.limit));
    }

    function inventoryUrl(page) {
        return settings.endpoint + '?page=' + encodeURIComponent(page) + '&limit=' + encodeURIComponent(state.limit);
    }

    function fetchInventory(page) {
        return $.getJSON(inventoryUrl(page))
            .then(function (response) {
                var items = response && Array.isArray(response.items) ? response.items : [];
                var total = response && typeof response.total === 'number' ? response.total : 0;

                state.page = page;
                state.items = items;
                state.total = total;

                renderTable(items);
                renderPagination();
            })
            .fail(function () {
                alert('Unable to load inventory for this page. Please try again.');
            });
    }

    function renderTable(items) {
        var $tbody = $(settings.tableBodySelector);
        if ($tbody.length === 0) {
            return;
        }

        if (!items.length) {
            $tbody.html('<tr><td colspan="' + (settings.columns.length + 1) + '">No inventory items found.</td></tr>');
            return;
        }

        var rows = items.map(function (item) {
            var cells = settings.columns.map(function (key) {
                return '<td>' + escapeHtml(item[key]) + '</td>';
            }).join('');

            var idValue = item[settings.idField] || item.id || '';
            var actions = '<td><button type="button" class="delete-btn" data-id="' + escapeHtml(idValue) + '">Delete</button></td>';
            return '<tr>' + cells + actions + '</tr>';
        }).join('');

        $tbody.html(rows);
    }

    function renderPagination() {
        var $controls = $(settings.paginationSelector);
        if ($controls.length === 0) {
            return;
        }

        var totalPages = getTotalPages();
        var prevDisabled = state.page <= 1 ? 'disabled="disabled"' : '';
        var nextDisabled = state.page >= totalPages ? 'disabled="disabled"' : '';

        var html = '';
        html += '<button type="button" class="pagination-prev" ' + prevDisabled + '>Previous</button>';
        html += '<span style="margin: 0 0.5rem;">Page ' + state.page + ' of ' + totalPages + '</span>';
        html += '<button type="button" class="pagination-next" ' + nextDisabled + '>Next</button>';

        $controls.html(html);
    }

    function loadCurrentPageOrPreviousIfEmpty() {
        return fetchInventory(state.page).then(function () {
            if (state.items.length === 0 && state.page > 1) {
                return fetchInventory(state.page - 1);
            }
            return null;
        });
    }

    function onDeleteClick(event) {
        var $button = $(event.target).closest(settings.deleteButtonSelector);
        if ($button.length === 0) {
            return;
        }

        var itemId = $button.data('id');
        if (!itemId) {
            return;
        }

        $.ajax({
            url: settings.endpoint + '/' + encodeURIComponent(itemId),
            method: 'DELETE'
        }).done(function () {
            state.total = Math.max(0, state.total - 1);
            loadCurrentPageOrPreviousIfEmpty();
        }).fail(function () {
            alert('Unable to delete this inventory item. Please try again.');
        });
    }

    function onPaginationClick(event) {
        var $target = $(event.target);
        var totalPages = getTotalPages();

        if ($target.closest('.pagination-prev').length && state.page > 1) {
            fetchInventory(state.page - 1);
            return;
        }

        if ($target.closest('.pagination-next').length && state.page < totalPages) {
            fetchInventory(state.page + 1);
        }
    }

    function bindEvents() {
        $(document)
            .off('click.inventoryPaginationDelete')
            .on('click.inventoryPaginationDelete', settings.tableBodySelector + ' ' + settings.deleteButtonSelector, onDeleteClick);

        $(document)
            .off('click.inventoryPaginationControls')
            .on('click.inventoryPaginationControls', settings.paginationSelector + ' .pagination-prev, ' + settings.paginationSelector + ' .pagination-next', onPaginationClick);
    }

    function init(options) {
        settings = $.extend({}, settings, options || {});
        state.limit = Number(settings.limit) > 0 ? Number(settings.limit) : state.limit;
        bindEvents();
        return fetchInventory(state.page);
    }

    global.InventoryPagination = {
        init: init,
        fetchInventory: fetchInventory,
        renderTable: renderTable,
        renderPagination: renderPagination
    };
})(window, window.jQuery);
