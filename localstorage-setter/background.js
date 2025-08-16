import { wildcardToRegex } from './utils.js';

/**
 * This function is injected into the page and runs in its context.
 * It cannot access any variables from the service worker.
 */
function setLocalStorageItem(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (_) {
        // Errors are ignored as they might happen on restricted pages (e.g., chrome:// pages).
    }
}

/**
 * Applies all enabled rules that match the given URL to the specified tab.
 * @param {number} tabId The ID of the tab to apply rules to.
 * @param {string} url The URL of the tab.
 */
async function applyRulesForTab(tabId, url) {
    if (!url?.startsWith('http')) return;

    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });

    rules
        .filter(rule => rule.enabled !== false)
        .forEach(rule => {
            try {
                if (wildcardToRegex(rule.pattern).test(url)) {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: setLocalStorageItem,
                        args: [rule.key, rule.value],
                    });
                }
            } catch (e) {
                console.error(`Invalid regex from pattern: "${rule.pattern}"`, e);
            }
        });
}

/**
 * Updates the badge text for a tab to show the number of matching, enabled rules.
 * @param {number} tabId The ID of the tab to update the badge for.
 * @param {string} url The URL of the tab.
 */
async function updateBadgeForTab(tabId, url) {
    if (!url?.startsWith('http')) {
        await chrome.action.setBadgeText({ text: '', tabId });
        return;
    }

    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });
    const enabledRules = rules.filter(rule => rule.enabled !== false);

    const matchingRulesCount = enabledRules.filter(rule => {
        try {
            return wildcardToRegex(rule.pattern).test(url);
        } catch (e) {
            return false; // A malformed pattern shouldn't count as a match.
        }
    }).length;

    if (matchingRulesCount > 0) {
        await chrome.action.setBadgeText({ text: `${matchingRulesCount}`, tabId });
        await chrome.action.setBadgeBackgroundColor({ color: '#FFFFFF', tabId });
        await chrome.action.setBadgeTextColor({ color: '#000000', tabId });
    } else {
        await chrome.action.setBadgeText({ text: '', tabId });
    }
}


// --- Event Listeners ---

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only act on http/https tabs and ignore chrome://, file://, etc.
    if (!tab.url?.startsWith('http')) return;

    // Update badge on initial load or if URL changes (catches SPA navigations).
    if (changeInfo.status === 'loading' || changeInfo.url) {
        updateBadgeForTab(tabId, tab.url);
    }

    // Apply rules only when the page has finished loading.
    if (changeInfo.status === 'complete') {
        applyRulesForTab(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.url) {
        updateBadgeForTab(tab.id, tab.url);
    }
});

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'sync' && changes.rules) {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab?.url) {
            updateBadgeForTab(currentTab.id, currentTab.url);
        }
    }
});
