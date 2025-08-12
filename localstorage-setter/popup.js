document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let editingRuleId = null;

    // --- Element Selectors ---
    const formInputs = document.querySelectorAll('#rule-form input');
    const urlPatternInput = document.getElementById('url-pattern');
    const getCurrentUrlBtn = document.getElementById('get-current-url-btn');
    const urlSuggestions = document.getElementById('url-suggestions');
    const keyInput = document.getElementById('ls-key');
    const valueInput = document.getElementById('ls-value');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const supportLink = document.getElementById('support-link');
    const activeRulesList = document.getElementById('active-rules-list');
    const enabledRulesList = document.getElementById('enabled-rules-list');
    const disabledRulesList = document.getElementById('disabled-rules-list');
    const activeRulesContainer = document.getElementById('active-rules-container');
    const enabledRulesContainer = document.getElementById('enabled-rules-container');
    const disabledRulesContainer = document.getElementById('disabled-rules-container');
    const noRulesMessage = document.getElementById('no-rules-message');

    // --- SVG Icons ---
    const ICONS = {
        POWER_ON: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
        TRASH: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
        EDIT: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        COFFEE: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>',
        TARGET: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>',
        COPY: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>'
    };

    // --- Main Setup ---
    function initialize() {
        if (supportLink) supportLink.innerHTML = ICONS.COFFEE;
        if (getCurrentUrlBtn) getCurrentUrlBtn.innerHTML = ICONS.TARGET;

        addRuleBtn.addEventListener('click', handleAddOrUpdate);
        cancelEditBtn.addEventListener('click', cancelEditMode);
        getCurrentUrlBtn.addEventListener('click', toggleUrlSuggestions);

        formInputs.forEach(input => {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOrUpdate();
                }
            });
        });
        document.addEventListener('click', (e) => {
            if (!getCurrentUrlBtn.contains(e.target) && !urlSuggestions.contains(e.target)) {
                urlSuggestions.style.display = 'none';
            }
        });
        loadRules();
    }

    // --- URL Suggestions Logic ---
    function toggleUrlSuggestions() {
        if (urlSuggestions.style.display === 'block') {
            urlSuggestions.style.display = 'none';
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (tabs[0] && tabs[0].url && tabs[0].url.startsWith('http')) {
                try {
                    const url = new URL(tabs[0].url);
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
                }
            } else {
                showToast('Cannot get URL from the current tab (e.g., new tab page).', 'error');
            }
        });
    }

    function generateSuggestionsForUrl(url) {
        const parts = url.hostname.split('.');
        const suggestions = new Set(); // Use a Set to avoid duplicates

        suggestions.add(`${url.protocol}//${url.hostname}${url.pathname}`); // Full path
        suggestions.add(`${url.protocol}//${url.hostname}/*`); // Hostname wildcard path

        if (parts.length > 2) {
            const domain = parts.slice(1).join('.');
            suggestions.add(`*.${domain}/*`); // Wildcard subdomain
        } else if (url.hostname !== "localhost" && !/^\d{1,3}(\.\d{1,3}){3}$/.test(url.hostname)) {
            suggestions.add(`*.${url.hostname}/*`); // e.g., *.example.com/* for example.com
        }

        return Array.from(suggestions);
    }


    // --- UI State & Feedback ---
    function startEditMode(rule) {
        editingRuleId = rule.id;
        urlPatternInput.value = rule.pattern;
        keyInput.value = rule.key;
        valueInput.value = rule.value;
        addRuleBtn.textContent = 'Update Rule';
        cancelEditBtn.style.display = 'block';
        urlPatternInput.focus();
        loadRules();
    }

    function cancelEditMode() {
        editingRuleId = null;
        [urlPatternInput, keyInput, valueInput].forEach(input => input.value = '');
        addRuleBtn.textContent = 'Add Rule';
        cancelEditBtn.style.display = 'none';
        loadRules();
    }

    function showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- Rule CRUD Logic ---
    function handleAddOrUpdate() {
        const pattern = urlPatternInput.value.trim();
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();
        if (!pattern || !key) { showToast('URL Pattern and Key are required.', 'error'); return; }

        chrome.storage.sync.get({ rules: [] }, data => {
            const rules = data.rules || [];
            if (editingRuleId) {
                const updatedRules = rules.map(r => r.id === editingRuleId ? { ...r, pattern, key, value } : r);
                chrome.storage.sync.set({ rules: updatedRules }, () => {
                    showToast('Rule updated successfully!');
                    cancelEditMode();
                });
            } else {
                const newRule = { id: Date.now(), pattern, key, value, enabled: true };
                chrome.storage.sync.set({ rules: [...rules, newRule] }, () => {
                    showToast('Rule added successfully!');
                    [urlPatternInput, keyInput, valueInput].forEach(input => input.value = '');
                    urlPatternInput.focus();
                    loadRules();
                });
            }
        });
    }

    async function loadRules() {
        const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentUrl = currentTab?.url;

        chrome.storage.sync.get({ rules: [] }, data => {
            const allRules = data.rules || [];
            activeRulesList.innerHTML = '';
            enabledRulesList.innerHTML = '';
            disabledRulesList.innerHTML = '';

            if (allRules.length === 0) {
                noRulesMessage.style.display = 'block';
                activeRulesContainer.style.display = 'none';
                enabledRulesContainer.style.display = 'none';
                disabledRulesContainer.style.display = 'none';
                return;
            }

            const activeRules = [];
            const enabledRules = [];
            const disabledRules = allRules.filter(r => r.enabled === false);

            const allEnabledRules = allRules.filter(r => r.enabled !== false);
            allEnabledRules.forEach(rule => {
                let isMatch = false;
                if (currentUrl && currentUrl.startsWith('http')) {
                    try {
                        isMatch = wildcardToRegex(rule.pattern).test(currentUrl);
                    } catch (e) { /* Ignore invalid patterns */ }
                }
                if (isMatch) {
                    activeRules.push(rule);
                } else {
                    enabledRules.push(rule);
                }
            });

            noRulesMessage.style.display = 'none';
            activeRulesContainer.style.display = activeRules.length > 0 ? 'block' : 'none';
            enabledRulesContainer.style.display = enabledRules.length > 0 ? 'block' : 'none';
            disabledRulesContainer.style.display = disabledRules.length > 0 ? 'block' : 'none';

            activeRules.forEach(rule => activeRulesList.appendChild(createRuleElement(rule, true)));
            enabledRules.forEach(rule => enabledRulesList.appendChild(createRuleElement(rule, false)));
            disabledRules.forEach(rule => disabledRulesList.appendChild(createRuleElement(rule, false)));
        });
    }

    function createRuleElement(rule, isActive = false) {
        const li = document.createElement('li');
        li.classList.toggle('disabled', rule.enabled === false);
        li.classList.toggle('editing', rule.id === editingRuleId);
        li.classList.toggle('active', isActive);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'rule-details';

        detailsDiv.append(
            createDetailLine('URL', rule.pattern),
            createDetailLine('Key', rule.key),
            createDetailLine('Value', rule.value)
        );

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'rule-actions';
        const isEnabled = rule.enabled !== false;

        const duplicateBtn = createActionButton(ICONS.COPY, 'Duplicate rule', () => duplicateRule(rule), 'copy-btn');
        const editBtn = createActionButton(ICONS.EDIT, 'Edit rule', () => startEditMode(rule), 'edit-btn');
        const toggleBtn = createActionButton(ICONS.POWER_ON, isEnabled ? 'Disable rule' : 'Enable rule', () => toggleRule(rule.id), 'toggle-btn', isEnabled ? 'enabled' : 'disabled');
        const deleteBtn = createActionButton(ICONS.TRASH, 'Delete rule', () => deleteRule(rule.id), 'delete-btn');

        actionsDiv.append(duplicateBtn, editBtn, toggleBtn, deleteBtn);
        li.append(detailsDiv, actionsDiv);
        return li;
    }

    function duplicateRule(ruleToDuplicate) {
        chrome.storage.sync.get({ rules: [] }, data => {
            const rules = data.rules || [];
            const newRule = {
                ...ruleToDuplicate,
                id: Date.now() // new unique ID
            };
            const updatedRules = [...rules, newRule];
            chrome.storage.sync.set({ rules: updatedRules }, () => {
                showToast('Rule duplicated. Now editing the copy.');
                startEditMode(newRule);
            });
        });
    }

    function deleteRule(ruleId) {
        chrome.storage.sync.get({ rules: [] }, data => {
            const updatedRules = (data.rules || []).filter(r => r.id !== ruleId);
            chrome.storage.sync.set({ rules: updatedRules }, () => {
                showToast('Rule deleted.', 'error');
                loadRules();
            });
        });
    }

    function toggleRule(ruleId) {
        chrome.storage.sync.get({ rules: [] }, data => {
            const updatedRules = (data.rules || []).map(r => r.id === ruleId ? { ...r, enabled: !(r.enabled ?? true) } : r);
            chrome.storage.sync.set({ rules: updatedRules }, loadRules);
        });
    }

    // --- Helper Functions ---
    function wildcardToRegex(pattern) {
        const escaped = pattern.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
    }

    function createDetailLine(label, value) {
        const div = document.createElement('div');
        const span = document.createElement('span');
        span.textContent = `${label}: `;
        const code = document.createElement('code');
        code.textContent = value;
        div.append(span, code);
        return div;
    }

    function createActionButton(icon, title, onClick, ...classes) {
        const button = document.createElement('button');
        button.innerHTML = icon;
        button.title = title;
        button.className = classes.join(' ');
        button.addEventListener('click', onClick);
        return button;
    }

    initialize();
});
