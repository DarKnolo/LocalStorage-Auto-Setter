import { wildcardToRegex } from './utils.js';

// This function is for localStorage matching ONLY
async function applyLocalStorageRules(tabId, url) {
    if (!url?.startsWith('http')) return;
    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });

    // In the migration, old rules might not have a type, so we check for 'undefined' or 'localStorage'
    const matchingRules = rules.filter(rule => {
        if (rule.enabled === false || (rule.type && rule.type !== 'localStorage')) return false;
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
    if (!url?.startsWith('http')) return;
    const { rules = [] } = await chrome.storage.sync.get({ rules: [] });

    const redirectRules = rules.filter(rule => {
        return !(rule.enabled === false || rule.type !== 'redirect');
    });

    if (redirectRules.length === 0) return;

    // Inject a content script that checks for exact matches and redirects
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func: (currentUrl, redirectRules) => {
                for (const rule of redirectRules) {
                    const normalizedCurrent = currentUrl.replace(/\/$/, '');
                    const normalizedPattern = rule.pattern.replace(/\/$/, '');

                    if (normalizedCurrent === normalizedPattern) {
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
        // Errors can happen if navigating away quickly, which is fine.
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
                const normalizedUrl = url.replace(/\/$/, '');
                const normalizedPattern = rule.pattern.replace(/\/$/, '');
                return normalizedUrl === normalizedPattern;
            } else {
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

    updateBadgeForTab(tabId, tab.url);

    if (changeInfo.status === 'loading' && changeInfo.url) {
        await applyRedirectRules(tabId, changeInfo.url);
    }

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
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (currentTab?.url) {
            updateBadgeForTab(currentTab.id, currentTab.url);
        }
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    console.log("[Autostash] onInstalled event fired. Reason:", details.reason);

    if (details.reason === 'update') {
        chrome.storage.sync.get({ rules: [] }, ({ rules }) => {
            // Check if a migration is needed by seeing if any rule is missing a 'type'.
            const needsMigration = rules && rules.length > 0 && rules.some(rule => !rule.type);

            if (needsMigration) {
                console.log("[Autostash] Old rule format detected. Migrating rules...");
                const migratedRules = rules.map(rule => {
                    if (rule.type) {
                        return rule;
                    }
                    return {
                        ...rule,
                        type: 'localStorage'
                    };
                });

                chrome.storage.sync.set({ rules: migratedRules }, () => {
                    console.log("[Autostash] Migration complete. All rules have been updated.");
                });
            } else {
                console.log("[Autostash] No migration needed.");
            }
        });
    }
});

chrome.runtime.onStartup.addListener(() => {
    console.log("[Autostash] Browser startup.");
});
