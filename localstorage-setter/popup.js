document.addEventListener('DOMContentLoaded', () => {
    // --- Element Selectors ---
    const urlPatternInput = document.getElementById('url-pattern');
    const keyInput = document.getElementById('ls-key');
    const valueInput = document.getElementById('ls-value');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const rulesList = document.getElementById('rules-list');
    const supportLink = document.getElementById('support-link');

    // --- SVG Icons ---
    const ICONS = {
        POWER_ON: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>',
        TRASH: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
        COFFEE: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>'
    };

    // --- Setup and Initial Load ---
    function initialize() {
        // Populate the support link icon
        if (supportLink) {
            supportLink.innerHTML = ICONS.COFFEE;
        }

        // Add event listeners
        addRuleBtn.addEventListener('click', addRule);

        // Load rules from storage
        loadRules();
    }

    // --- Rule Management Logic ---
    function addRule() {
        const pattern = urlPatternInput.value.trim();
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();

        if (!pattern || !key) { alert('URL Pattern and Key are required.'); return; }

        chrome.storage.sync.get({ rules: [] }, data => {
            data.rules.push({ id: Date.now(), pattern, key, value, enabled: true });
            chrome.storage.sync.set({ rules: data.rules }, () => {
                [urlPatternInput, keyInput, valueInput].forEach(input => input.value = '');
                loadRules();
            });
        });
    }

    function loadRules() {
        chrome.storage.sync.get({ rules: [] }, data => {
            rulesList.innerHTML = '';
            data.rules.forEach(createRuleElement);
        });
    }

    function createRuleElement(rule) {
        const li = document.createElement('li');
        li.classList.toggle('disabled', rule.enabled === false);

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

        actionsDiv.append(toggleBtn, deleteBtn);
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
