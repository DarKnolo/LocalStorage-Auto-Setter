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

function updateBadgeForTab(tabId, url) {
    if (!url || !url.startsWith('http')) {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
        return;
    }

    chrome.storage.sync.get({ rules: [] }, (data) => {
        const enabledRules = (data.rules || []).filter(rule => rule.enabled !== false);
        const matchingRulesCount = enabledRules.filter(rule => {
            try {
                return wildcardToRegex(rule.pattern).test(url);
            } catch (e) {
                return false;
            }
        }).length;

        if (matchingRulesCount > 0) {
            chrome.action.setBadgeText({
                text: `${matchingRulesCount}`,
                tabId: tabId
            });
            // High-contrast badge: white background, black text
            chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF', tabId: tabId });
            chrome.action.setBadgeTextColor({ color: '#000000', tabId: tabId });
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId });
        }
    });
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Update badge as soon as URL is available
    if (tab.url) {
        updateBadgeForTab(tabId, tab.url);
    }
    // Apply rules when the page has finished loading
    if (changeInfo.status === 'complete' && tab.url) {
        applyRulesForTab(tabId, tab.url);
    }
});

// Update badge when user switches to a different tab
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab && tab.url) {
            updateBadgeForTab(tab.id, tab.url);
        }
    });
});

// Update badge for the active tab when rules are changed in the popup
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.rules) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id && tabs[0].url) {
                updateBadgeForTab(tabs[0].id, tabs[0].url);
            }
        });
    }
});
