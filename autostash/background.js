import { wildcardToRegex } from './utils.js';

// This function is for localStorage matching ONLY
async function applyLocalStorageRules(tabId, url) {
    if (!url?.startsWith('http')) return;
    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });

    const matchingRules = rules.filter(rule => {
        if (rule.enabled === false || rule.type !== 'localStorage') return false;
        try {
            return wildcardToRegex(rule.pattern).test(url);
        } catch (e) {
            return false;
        }
    });

    for (const rule of matchingRules) {
        chrome.scripting.executeScript({
            target: { tabId },
            func: (key, value) => {
                try {
                    window.localStorage.setItem(key, value);
                } catch (_) {}
            },
            args: [rule.key, rule.value],
        });
    }
}

async function applyRedirectRules(tabId, url) {
    console.log('[Autostash] Checking redirects for URL:', url);

    if (!url?.startsWith('http')) return;
    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });

    const redirectRules = rules.filter(rule => {
        return !(rule.enabled === false || rule.type !== 'redirect');

    });

    if (redirectRules.length === 0) return;

    console.log('[Autostash] Found redirect rules:', redirectRules);

    // Inject a content script that checks for exact matches and redirects
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: (currentUrl, redirectRules) => {

                // Check each rule for exact matches
                for (const rule of redirectRules) {

                    // Normalize URLs for comparison (remove trailing slashes)
                    const normalizedCurrent = currentUrl.replace(/\/$/, '');
                    const normalizedPattern = rule.pattern.replace(/\/$/, '');

                    if (normalizedCurrent === normalizedPattern) {

                        // Prevent infinite redirects by checking if we're already at the target
                        const normalizedTarget = rule.value.replace(/\/$/, '');
                        if (normalizedCurrent !== normalizedTarget) {
                            window.location.replace(rule.value);
                            return;
                        } else {
                        }
                    }

                    // Also check with trailing slash variations
                    if (normalizedCurrent === normalizedPattern + '/' ||
                        normalizedCurrent + '/' === normalizedPattern) {

                        const normalizedTarget = rule.value.replace(/\/$/, '');
                        if (normalizedCurrent !== normalizedTarget) {
                            window.location.replace(rule.value);
                            return;
                        }
                    }
                }

            },
            args: [url, redirectRules],
        });
    } catch (e) {
        console.error('[Autostash] Error executing redirect script:', e);
    }
}

// This function is for the badge count ONLY
async function updateBadgeForTab(tabId, url) {
    if (!url?.startsWith('http')) {
        await chrome.action.setBadgeText({ text: '', tabId });
        return;
    }
    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });
    const enabledRules = rules.filter(rule => rule.enabled !== false);
    const matchingRulesCount = enabledRules.filter(rule => {
        try {
            if (rule.type === 'redirect') {
                // For redirects, do exact URL matching for badge count
                const normalizedUrl = url.replace(/\/$/, '');
                const normalizedPattern = rule.pattern.replace(/\/$/, '');
                return normalizedUrl === normalizedPattern;
            } else {
                // For localStorage, use wildcard matching
                return wildcardToRegex(rule.pattern).test(url);
            }
        } catch (e) {
            return false;
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
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (!tab.url?.startsWith('http')) return;

    // Update badge immediately
    updateBadgeForTab(tabId, tab.url);

    // Apply rules when navigation commits (before page fully loads)
    if (changeInfo.status === 'loading' && changeInfo.url) {
        console.log('[Autostash] Page loading, checking for redirects:', changeInfo.url);
        await applyRedirectRules(tabId, changeInfo.url);
    }

    // Apply localStorage rules when page fully loads
    if (changeInfo.status === 'complete') {
        applyLocalStorageRules(tabId, tab.url);
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
        console.log('[Autostash] Rules updated in storage');
        // Update badge for current tab
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab?.url) {
            updateBadgeForTab(currentTab.id, currentTab.url);
        }
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log("[Autostash] Extension installed/updated.");
});

chrome.runtime.onStartup.addListener(() => {
    console.log("[Autostash] Browser startup.");
});
