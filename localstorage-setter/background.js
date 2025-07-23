function setLocalStorageItem(key, value) {
    try {
        window.localStorage.setItem(key, value)
    } catch (_) {
    }
}

function wildcardToRegex(pattern) {
    const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$')
}

function isValidRule(rule) {
    return rule?.pattern && rule?.key && rule?.value
}

function applyRulesForTab(tabId, url) {
    if (!url?.startsWith('http')) return

    chrome.storage.sync.get({ rules: [] }, (data) => {
        data.rules
            .filter(isValidRule)
            .forEach(rule => {
                const regex = wildcardToRegex(rule.pattern)
                if (regex.test(url)) {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: setLocalStorageItem,
                        args: [rule.key, rule.value]
                    })
                }
            })
    })
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
        applyRulesForTab(tabId, tab.url)
    }
})
