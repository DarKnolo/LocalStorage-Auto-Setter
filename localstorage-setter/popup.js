/* global chrome */
import { wildcardToRegex } from './utils.js';

// --- State ---
let rules = [];
let editingRuleId = null;

// --- Element Selectors ---
const ruleForm = document.getElementById('rule-form');
const urlPatternInput = document.getElementById('url-pattern');
const keyInput = document.getElementById('ls-key');
const valueInput = document.getElementById('ls-value');
const addRuleBtn = document.getElementById('add-rule-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const getCurrentUrlBtn = document.getElementById('get-current-url-btn');
const urlSuggestions = document.getElementById('url-suggestions');
const supportLink = document.getElementById('support-link');

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
    COPY: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
};

// --- Data Logic ---
async function loadAndRenderRules() {
    const data = await chrome.storage.sync.get({ rules: [] });
    rules = data.rules || [];
    await renderRules();
}

async function saveRules() {
    await chrome.storage.sync.set({ rules });
    await loadAndRenderRules();
}

// --- Matching Logic ---
function isRuleMatch(rule, url) {
    if (!url?.startsWith('http')) return false;
    try {
        return wildcardToRegex(rule.pattern).test(url);
    } catch (e) {
        console.warn(`Rule with invalid pattern skipped: "${rule.pattern}"`);
        return false;
    }
}

// --- UI Rendering ---
async function renderRules() {
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = currentTab?.url;
    [activeRulesList, enabledRulesList, disabledRulesList].forEach(list => list.innerHTML = '');

    if (rules.length === 0) {
        noRulesMessage.style.display = 'block';
        [activeRulesContainer, enabledRulesContainer, disabledRulesContainer].forEach(c => c.style.display = 'none');
        return;
    }

    noRulesMessage.style.display = 'none';
    const activeRules = [], enabledRules = [], disabledRules = [];

    rules.forEach(rule => {
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

    li.querySelector('[data-role="pattern"]').textContent = rule.pattern;
    li.querySelector('[data-role="key"]').textContent = rule.key;
    li.querySelector('[data-role="value"]').textContent = rule.value;

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

// --- Form & Edit Mode ---
async function enterEditMode(rule) {
    editingRuleId = rule.id;
    urlPatternInput.value = rule.pattern;
    keyInput.value = rule.key;
    valueInput.value = rule.value;
    addRuleBtn.textContent = 'Update Rule';
    cancelEditBtn.style.display = 'block';
    urlPatternInput.focus();
    await renderRules();
}

async function exitEditMode() {
    editingRuleId = null;
    ruleForm.reset();
    addRuleBtn.textContent = 'Add Rule';
    cancelEditBtn.style.display = 'none';
    await renderRules();
}

// --- Event Handlers ---
async function handleFormSubmit(event) {
    event.preventDefault();
    const pattern = urlPatternInput.value.trim();
    const key = keyInput.value.trim();
    const value = valueInput.value.trim();

    if (editingRuleId) {
        const ruleIndex = rules.findIndex(r => r.id === editingRuleId);
        if (ruleIndex > -1) {
            rules[ruleIndex] = { ...rules[ruleIndex], pattern, key, value };
            showToast('Rule updated successfully!');
        }
    } else {
        rules.push({ id: Date.now(), pattern, key, value, enabled: true });
        showToast('Rule added successfully!');
    }

    await saveRules();
    await exitEditMode();
    urlPatternInput.focus();
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
            rules.push({ ...rule, id: Date.now() });
            await saveRules()
            const newRule = rules[rules.length - 1];
            showToast('Rule duplicated. Now editing the copy.');
            await enterEditMode(newRule);
            break;
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
        const suggestions = generateSuggestionsForUrl(url);
        urlSuggestions.innerHTML = '';
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            item.addEventListener('click', () => {
                urlPatternInput.value = suggestion;
                urlSuggestions.style.display = 'none';
                keyInput.focus();
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

    ruleForm.addEventListener('submit', handleFormSubmit);
    // CHANGED: Use async arrow function for event listeners calling async functions
    cancelEditBtn.addEventListener('click', async () => await exitEditMode());
    getCurrentUrlBtn.addEventListener('click', handleGetCurrentUrlClick);
    [activeRulesList, enabledRulesList, disabledRulesList].forEach(list => {
        list.addEventListener('click', handleRulesListClick);
    });

    document.addEventListener('click', (e) => {
        if (!getCurrentUrlBtn.contains(e.target) && !urlSuggestions.contains(e.target)) {
            urlSuggestions.style.display = 'none';
        }
    });

    loadAndRenderRules().catch(error => {
        console.error("Failed to initialize the popup:", error);
        showToast("Error: Could not load rules.", "error");
    });
}

initialize();
