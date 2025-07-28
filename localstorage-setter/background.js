function setLocalStorageItem(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (_) {
        // Errors are ignored as they might happen on restricted pages.
    }
}

function wildcardToRegex(pattern) {
    const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
}

function applyRulesForTab(tabId, url) {
    if (!url?.startsWith('http')) return;

    chrome.storage.sync.get({ rules: [] }, (data) => {
        data.rules
            .filter(rule => rule.enabled !== false)
            .forEach(rule => {
                try {
                    const regex = wildcardToRegex(rule.pattern);
                    if (regex.test(url)) {
                        chrome.scripting.executeScript({
                            target: { tabId },
                            func: setLocalStorageItem,
                            args: [rule.key, rule.value]
                        });
                    }
                } catch (e) {
                    console.error(`Invalid regex pattern for rule: ${rule.pattern}`, e);
                }
            });
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        applyRulesForTab(tabId, tab.url);
    }
});
