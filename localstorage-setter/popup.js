document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let editingRuleId = null;

    // --- Element Selectors ---
    const formInputs = document.querySelectorAll('#rule-form input');
    const urlPatternInput = document.getElementById('url-pattern');
    const keyInput = document.getElementById('ls-key');
    const valueInput = document.getElementById('ls-value');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const rulesList = document.getElementById('rules-list');
    const supportLink = document.getElementById('support-link');

    // --- SVG Icons ---
    const ICONS = {
        POWER_ON: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
        TRASH: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
        EDIT: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        COFFEE: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>'
    };

    // --- Main Setup ---
    function initialize() {
        if (supportLink) supportLink.innerHTML = ICONS.COFFEE;
        addRuleBtn.addEventListener('click', handleAddOrUpdate);
        cancelEditBtn.addEventListener('click', cancelEditMode);
        // NEW: Add keyboard submission
        formInputs.forEach(input => {
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOrUpdate();
                }
            });
        });
        loadRules();
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

        // REFACTORED: Use textContent for security
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

        const editBtn = createActionButton(ICONS.EDIT, 'Edit rule', () => startEditMode(rule), 'edit-btn');
        const toggleBtn = createActionButton(ICONS.POWER_ON, isEnabled ? 'Disable rule' : 'Enable rule', () => toggleRule(rule.id), 'toggle-btn', isEnabled ? 'enabled' : 'disabled');
        const deleteBtn = createActionButton(ICONS.TRASH, 'Delete rule', () => deleteRule(rule.id), 'delete-btn');

        actionsDiv.append(editBtn, toggleBtn, deleteBtn);
        li.append(detailsDiv, actionsDiv);
        rulesList.appendChild(li);
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
