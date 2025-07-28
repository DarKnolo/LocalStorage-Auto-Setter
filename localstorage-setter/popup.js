document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let editingRuleId = null;

    // --- Element Selectors ---
    const form = document.getElementById('rule-form');
    const urlPatternInput = document.getElementById('url-pattern');
    const keyInput = document.getElementById('ls-key');
    const valueInput = document.getElementById('ls-value');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const rulesList = document.getElementById('rules-list');
    const supportLink = document.getElementById('support-link');

    // --- SVG Icons ---
    const ICONS = {
        POWER_ON: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
        TRASH: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
        EDIT: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        COFFEE: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>'
    };

    // --- Main Setup ---
    function initialize() {
        if (supportLink) supportLink.innerHTML = ICONS.COFFEE;
        addRuleBtn.addEventListener('click', handleAddOrUpdate);
        cancelEditBtn.addEventListener('click', cancelEditMode);
        loadRules();
    }

    // --- UI State Management ---
    function startEditMode(rule) {
        editingRuleId = rule.id;
        urlPatternInput.value = rule.pattern;
        keyInput.value = rule.key;
        valueInput.value = rule.value;
        addRuleBtn.textContent = 'Update Rule';
        cancelEditBtn.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        loadRules(); // Reload to show which item is being edited
    }

    function cancelEditMode() {
        editingRuleId = null;
        urlPatternInput.value = '';
        keyInput.value = '';
        valueInput.value = '';
        addRuleBtn.textContent = 'Add Rule';
        cancelEditBtn.style.display = 'none';
        loadRules(); // Reload to remove editing highlight
    }

    // --- Rule CRUD Logic ---
    function handleAddOrUpdate() {
        const pattern = urlPatternInput.value.trim();
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();
        if (!pattern || !key) { alert('URL Pattern and Key are required.'); return; }

        chrome.storage.sync.get({ rules: [] }, data => {
            if (editingRuleId) { // Update existing rule
                const rules = data.rules.map(r => r.id === editingRuleId ? { ...r, pattern, key, value } : r);
                chrome.storage.sync.set({ rules: rules }, cancelEditMode);
            } else { // Add new rule
                const newRule = { id: Date.now(), pattern, key, value, enabled: true };
                const rules = [...data.rules, newRule];
                chrome.storage.sync.set({ rules: rules }, () => {
                    [urlPatternInput, keyInput, valueInput].forEach(input => input.value = '');
                    loadRules();
                });
            }
        });
    }

    function loadRules() {
        chrome.storage.sync.get({ rules: [] }, data => {
            rulesList.innerHTML = '';
            (data.rules || []).forEach(createRuleElement);
        });
    }

    function createRuleElement(rule) {
        const li = document.createElement('li');
        li.classList.toggle('disabled', rule.enabled === false);
        li.classList.toggle('editing', rule.id === editingRuleId);

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'rule-details';
        detailsDiv.innerHTML = `
            <div><span>URL:</span> <code>${escapeHTML(rule.pattern)}</code></div>
            <div><span>Key:</span> <code>${escapeHTML(rule.key)}</code></div>
            <div><span>Value:</span> <code>${escapeHTML(rule.value)}</code></div>
        `;

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'rule-actions';

        const isEnabled = rule.enabled !== false;

        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.title = 'Edit rule';
        editBtn.innerHTML = ICONS.EDIT;
        editBtn.addEventListener('click', () => startEditMode(rule));

        const toggleBtn = document.createElement('button');
        toggleBtn.title = isEnabled ? 'Disable rule' : 'Enable rule';
        toggleBtn.classList.add('toggle-btn', isEnabled ? 'enabled' : 'disabled');
        toggleBtn.innerHTML = ICONS.POWER_ON;
        toggleBtn.addEventListener('click', () => toggleRule(rule.id));

        const deleteBtn = document.createElement('button');
        deleteBtn.title = 'Delete rule';
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = ICONS.TRASH;
        deleteBtn.addEventListener('click', () => deleteRule(rule.id));

        actionsDiv.append(editBtn, toggleBtn, deleteBtn);
        li.append(detailsDiv, actionsDiv);
        rulesList.appendChild(li);
    }

    function deleteRule(ruleId) {
        chrome.storage.sync.get({ rules: [] }, data => {
            const updatedRules = data.rules.filter(r => r.id !== ruleId);
            chrome.storage.sync.set({ rules: updatedRules }, loadRules);
        });
    }

    function toggleRule(ruleId) {
        chrome.storage.sync.get({ rules: [] }, data => {
            const updatedRules = data.rules.map(r => r.id === ruleId ? { ...r, enabled: !(r.enabled ?? true) } : r);
            chrome.storage.sync.set({ rules: updatedRules }, loadRules);
        });
    }

    function escapeHTML(str) {
        const p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    initialize();
});
