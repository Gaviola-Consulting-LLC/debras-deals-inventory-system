(function attachInventorySearchUtils(globalObject) {
    const SESSION_CACHE_PREFIX = 'inventoryRemoteContent:';

    function isValidUrl(value) {
        if (typeof value !== 'string') return false;
        const trimmed = value.trim();
        if (!trimmed) return false;
        try {
            const parsed = new URL(trimmed);
            return /^https?:$/i.test(parsed.protocol);
        } catch (error) {
            return false;
        }
    }

    function stripHtmlTags(html) {
        if (typeof html !== 'string' || !html) return '';
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function getSessionCache(key) {
        if (!key || !globalObject.sessionStorage) return null;
        try {
            const raw = globalObject.sessionStorage.getItem(SESSION_CACHE_PREFIX + key);
            if (raw === null) return null;
            return JSON.parse(raw);
        } catch (error) {
            return null;
        }
    }

    function setSessionCache(key, value) {
        if (!key || !globalObject.sessionStorage) return;
        try {
            globalObject.sessionStorage.setItem(SESSION_CACHE_PREFIX + key, JSON.stringify(value));
        } catch (error) {
            // Ignore storage failures (quota/private mode)
        }
    }

    globalObject.InventorySearchUtils = {
        isValidUrl,
        stripHtmlTags,
        getSessionCache,
        setSessionCache
    };
})(window);
