/* global chrome */
import { wildcardToRegex } from './utils.js';

// --- State ---
let rules = [];
let editingRuleId = null;
let currentContext = 'localStorage'; // 'localStorage', 'redirect'

// --- Element Selectors ---
const ruleForm = document.getElementById('rule-form');
const urlPatternInput = document.getElementById('url-pattern');
const keyInput = document.getElementById('rule-key');
const valueInput = document.getElementById('rule-value');
const addRuleBtn = document.getElementById('add-rule-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const getCurrentUrlBtn = document.getElementById('get-current-url-btn');
const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
const urlSuggestions = document.getElementById('url-suggestions');
const kvSuggestions = document.getElementById('kv-suggestions');
const supportLink = document.getElementById('support-link');
const contextSwitcher = document.querySelector('.context-switcher');

const formTitle = document.getElementById('form-title');
const rulesTitle = document.getElementById('rules-title');

const activeRulesList = document.getElementById('active-rules-list');
const enabledRulesList = document.getElementById('enabled-rules-list');
const disabledRulesList = document.getElementById('disabled-rules-list');
const activeRulesContainer = document.getElementById('active-rules-container');
const enabledRulesContainer = document.getElementById('enabled-rules-container');
const disabledRulesContainer = document.getElementById('disabled-rules-container');
const noRulesMessage = document.getElementById('no-rules-message');

const ruleTemplate = document.getElementById('rule-template');

// --- SVG Icons ---
const ICONS = {
    POWER_ON: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
    TRASH: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
    EDIT: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
    COFFEE: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
    TARGET: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>',
    COPY: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
    LIST: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
};

/** This function is injected into the page to read its storage. */
function getStorageItems(storageType) {
    const storage = window[storageType];
    const items = [];
    for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key) {
            items.push({ key, value: storage.getItem(key) });
        }
    }
    return items;
}

// --- Data Logic ---
async function loadAndRenderRules() {
    const data = await chrome.storage.sync.get({ rules: [] });
    rules = data.rules || [];
    await renderUI();
}

async function saveRules() {
    await chrome.storage.sync.set({ rules });
    await loadAndRenderRules();
}

// --- Matching Logic ---
function isRuleMatch(rule, url) {
    if (!url?.startsWith('http')) return false;

    if (rule.type === 'redirect') {
        // For redirects, do exact URL matching (with trailing slash normalization)
        const normalizedUrl = url.replace(/\/$/, '');
        const normalizedPattern = rule.pattern.replace(/\/$/, '');
        return normalizedUrl === normalizedPattern;
    } else {
        // For localStorage, use wildcard matching
        try {
            return wildcardToRegex(rule.pattern).test(url);
        } catch (e) {
            console.warn(`[Autostash] Rule with invalid pattern skipped: "${rule.pattern}"`);
            return false;
        }
    }
}

// --- UI Rendering ---
async function renderUI() {
    await updateUIForContext();
    await renderRules();
}

async function renderRules() {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = currentTab?.url;
    [activeRulesList, enabledRulesList, disabledRulesList].forEach(list => list.innerHTML = '');

    const filteredRules = rules.filter(rule => (rule.type || 'localStorage') === currentContext);

    if (filteredRules.length === 0) {
        noRulesMessage.style.display = 'block';
        noRulesMessage.textContent = `You haven't added any ${contextConfig[currentContext].name} rules yet.`;
        [activeRulesContainer, enabledRulesContainer, disabledRulesContainer].forEach(c => c.style.display = 'none');
        return;
    }

    noRulesMessage.style.display = 'none';
    const activeRules = [], enabledRules = [], disabledRules = [];

    filteredRules.forEach(rule => {
        if (rule.enabled === false) disabledRules.push(rule);
        else if (isRuleMatch(rule, currentUrl)) activeRules.push(rule);
        else enabledRules.push(rule);
    });

    activeRulesContainer.style.display = activeRules.length > 0 ? 'block' : 'none';
    enabledRulesContainer.style.display = enabledRules.length > 0 ? 'block' : 'none';
    disabledRulesContainer.style.display = disabledRules.length > 0 ? 'block' : 'none';

    activeRules.forEach(rule => activeRulesList.appendChild(createRuleElement(rule, true)));
    enabledRules.forEach(rule => enabledRulesList.appendChild(createRuleElement(rule, false)));
    disabledRules.forEach(rule => disabledRulesList.appendChild(createRuleElement(rule, false)));
}

function createRuleElement(rule, isActive) {
    const li = document.createElement('li');
    li.appendChild(ruleTemplate.content.cloneNode(true));
    li.dataset.ruleId = rule.id;
    li.classList.toggle('disabled', !rule.enabled);
    li.classList.toggle('editing', rule.id === editingRuleId);
    li.classList.toggle('active', isActive);

    const ruleType = rule.type || 'localStorage';
    li.querySelector('[data-role="pattern"]').textContent = rule.pattern;
    li.querySelector('[data-role="key"]').textContent = rule.key;
    li.querySelector('[data-role="value"]').textContent = rule.value;

    li.querySelectorAll('[data-field]').forEach(el => el.style.display = 'none');

    if (ruleType === 'redirect') {
        li.querySelector('[data-field="redirect"]').style.display = 'block';
    } else {
        li.querySelector('[data-field="key-value"]').style.display = 'block';
    }

    const isEnabled = rule.enabled !== false;
    const toggleBtn = li.querySelector('.toggle-btn');
    toggleBtn.innerHTML = ICONS.POWER_ON;
    toggleBtn.classList.toggle('enabled', isEnabled);
    toggleBtn.title = isEnabled ? 'Disable rule' : 'Enable rule';
    toggleBtn.setAttribute('aria-label', isEnabled ? 'Disable rule' : 'Enable rule');

    li.querySelector('.copy-btn').innerHTML = ICONS.COPY;
    li.querySelector('.edit-btn').innerHTML = ICONS.EDIT;
    li.querySelector('.delete-btn').innerHTML = ICONS.TRASH;

    return li;
}

function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// --- Context UI Logic ---
const contextConfig = {
    localStorage: { name: 'LocalStorage', keyPlaceholder: 'Key', valuePlaceholder: 'Value', showKey: true },
    redirect: { name: 'Redirect', keyPlaceholder: 'N/A', valuePlaceholder: 'Redirect to URL', showKey: false },
};

async function updateUIForContext() {
    const config = contextConfig[currentContext];

    formTitle.textContent = `Add New ${config.name} Rule`;
    rulesTitle.textContent = `Your ${config.name} Rules`;
    addRuleBtn.textContent = editingRuleId ? 'Update Rule' : 'Add Rule';

    const keyInputContainer = document.getElementById('key-input-container');
    keyInputContainer.style.display = config.showKey ? 'flex' : 'none';
    keyInput.required = config.showKey;
    keyInput.placeholder = config.keyPlaceholder;

    valueInput.placeholder = config.valuePlaceholder;
    urlPatternInput.placeholder = currentContext === 'redirect' ? 'Exact URL to match (e.g. https://site.com)' : 'URL pattern to match (supports wildcards)';
    urlPatternInput.title = currentContext === 'redirect' ? 'Enter the exact URL that should trigger the redirect' : 'URL pattern using wildcards like https://*.domain.com/*';

    contextSwitcher.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.context === currentContext);
    });
}

async function enterEditMode(rule) {
    editingRuleId = rule.id;
    currentContext = rule.type || 'localStorage';
    urlPatternInput.value = rule.pattern;
    keyInput.value = rule.key || '';
    valueInput.value = rule.value;
    addRuleBtn.textContent = 'Update Rule';
    cancelEditBtn.style.display = 'block';
    urlPatternInput.focus();
    await renderUI();
}

async function exitEditMode() {
    editingRuleId = null;
    ruleForm.reset();
    addRuleBtn.textContent = 'Add Rule';
    cancelEditBtn.style.display = 'none';
    await renderUI();
}

// --- Event Handlers ---
async function handleFormSubmit(event) {
    event.preventDefault();

    const pattern = urlPatternInput.value.trim();
    const key = keyInput.value.trim();
    const value = valueInput.value.trim();

    // Simple validation for redirects
    if (currentContext === 'redirect') {
        if (!pattern.startsWith('http')) {
            showToast('Please enter a complete URL starting with http:// or https://', 'error');
            return;
        }
        if (!value.startsWith('http')) {
            showToast('Redirect target must be a complete URL starting with http:// or https://', 'error');
            return;
        }
    }

    const newRuleData = {
        pattern,
        key: currentContext === 'redirect' ? 'redirect' : key,
        value,
        type: currentContext
    };

    if (editingRuleId) {
        const ruleIndex = rules.findIndex(r => r.id === editingRuleId);
        if (ruleIndex > -1) {
            rules[ruleIndex] = { ...rules[ruleIndex], ...newRuleData };
            showToast('Rule updated successfully!');
        }
    } else {
        rules.push({ id: Date.now(), ...newRuleData, enabled: true });
        showToast('Rule added successfully!');
    }

    await saveRules();
    await exitEditMode();
    urlPatternInput.focus();
}

async function handleGetSuggestionsClick() {
    if (kvSuggestions.style.display === 'block' || currentContext !== 'localStorage') {
        kvSuggestions.style.display = 'none';
        return;
    }

    let items = [];
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.startsWith('http')) {
            showToast('Cannot get suggestions from this page.', 'error');
            return;
        }

        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getStorageItems,
            args: ['localStorage'],
        });
        items = results[0]?.result || [];

    } catch (e) {
        showToast('Could not retrieve data from the page.', 'error');
        console.error("Error getting suggestions:", e);
        return;
    }

    renderSuggestionsDropdown(items);
}

function renderSuggestionsDropdown(items) {
    kvSuggestions.innerHTML = '';
    if (items.length === 0) {
        const itemEl = document.createElement('div');
        itemEl.className = 'suggestion-item';
        itemEl.textContent = 'No items found on this page.';
        kvSuggestions.appendChild(itemEl);
    } else {
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'kv-suggestion-item';
            itemEl.innerHTML = `<div class="key">${item.key}</div><div class="value">${item.value}</div>`;
            itemEl.addEventListener('click', () => {
                keyInput.value = item.key;
                valueInput.value = item.value;
                kvSuggestions.style.display = 'none';
                valueInput.focus();
            });
            kvSuggestions.appendChild(itemEl);
        });
    }
    kvSuggestions.style.display = 'block';
}

async function handleRulesListClick(event) {
    const actionButton = event.target.closest('button[data-action]');
    if (!actionButton) return;

    const ruleItem = actionButton.closest('li[data-rule-id]');
    const ruleId = Number(ruleItem.dataset.ruleId);
    const action = actionButton.dataset.action;
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    switch (action) {
        case 'duplicate':
        {
            const newRule = { ...rule, id: Date.now() };
            rules.push(newRule);
            await saveRules();
            showToast('Rule duplicated. Now editing the copy.');
            await enterEditMode(newRule);
            break;
        }
        case 'edit':
            await enterEditMode(rule);
            break;
        case 'toggle':
            rule.enabled = !(rule.enabled ?? true);
            await saveRules();
            break;
        case 'delete':
            rules = rules.filter(r => r.id !== ruleId);
            await saveRules();
            showToast('Rule deleted.', 'error');
            break;
    }
}

async function handleGetCurrentUrlClick() {
    if (urlSuggestions.style.display === 'block') {
        urlSuggestions.style.display = 'none';
        return;
    }

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url?.startsWith('http')) {
            showToast('Cannot get URL from the current tab.', 'error');
            return;
        }

        const url = new URL(tab.url);
        let suggestions;

        if (currentContext === 'redirect') {
            // For redirects, suggest exact URLs
            suggestions = [
                tab.url,
                `${url.protocol}//${url.hostname}`,
                `${url.protocol}//${url.hostname}/`
            ];
        } else {
            // For localStorage, suggest wildcard patterns
            suggestions = generateSuggestionsForUrl(url);
        }

        urlSuggestions.innerHTML = '';
        [...new Set(suggestions)].forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                urlPatternInput.value = suggestion;
                urlSuggestions.style.display = 'none';
                if (currentContext === 'redirect') {
                    valueInput.focus();
                } else {
                    keyInput.focus();
                }
            });
            urlSuggestions.appendChild(item);
        });
        urlSuggestions.style.display = 'block';
    } catch (e) {
        showToast('Could not parse the current URL.', 'error');
        console.error("Error generating URL suggestions:", e);
    }
}

function generateSuggestionsForUrl(url) {
    const parts = url.hostname.split('.');
    const suggestions = new Set();
    suggestions.add(`${url.protocol}//${url.hostname}${url.pathname}`);
    suggestions.add(`${url.protocol}//${url.hostname}/*`);
    if (parts.length > 1) {
        suggestions.add(`*${parts.slice(-2).join('.')}/*`);
    }
    return Array.from(suggestions);
}

// --- Initialization ---
function initialize() {
    supportLink.innerHTML = ICONS.COFFEE;
    getCurrentUrlBtn.innerHTML = ICONS.TARGET;
    getSuggestionsBtn.innerHTML = ICONS.LIST;

    ruleForm.addEventListener('submit', handleFormSubmit);
    cancelEditBtn.addEventListener('click', exitEditMode);
    getCurrentUrlBtn.addEventListener('click', handleGetCurrentUrlClick);
    getSuggestionsBtn.addEventListener('click', handleGetSuggestionsClick);

    contextSwitcher.addEventListener('click', async (e) => {
        if (e.target.tagName === 'BUTTON') {
            currentContext = e.target.dataset.context;
            await exitEditMode(); // Reset form when switching context
        }
    });

    [activeRulesList, enabledRulesList, disabledRulesList].forEach(list => {
        list.addEventListener('click', handleRulesListClick);
    });

    document.addEventListener('click', (e) => {
        if (!getCurrentUrlBtn.contains(e.target) && !urlSuggestions.contains(e.target)) {
            urlSuggestions.style.display = 'none';
        }
        if (!getSuggestionsBtn.contains(e.target) && !kvSuggestions.contains(e.target)) {
            kvSuggestions.style.display = 'none';
        }
    });

    loadAndRenderRules().catch(error => {
        console.error("[Autostash] Failed to initialize the popup:", error);
        showToast("Error: Could not load rules.", "error");
    });
}

initialize();
