document.addEventListener('DOMContentLoaded', () => {
    const urlPatternInput = document.getElementById('url-pattern');
    const keyInput = document.getElementById('ls-key');
    const valueInput = document.getElementById('ls-value');
    const addRuleBtn = document.getElementById('add-rule-btn');
    const rulesList = document.getElementById('rules-list');

    loadRules();

    addRuleBtn.addEventListener('click', () => {
        const pattern = urlPatternInput.value.trim();
        const key = keyInput.value.trim();
        const value = valueInput.value.trim();

        if (pattern && key) { // Value can be an empty string
            chrome.storage.sync.get({ rules: [] }, (data) => {
                const rules = data.rules;
                const newRule = { id: Date.now(), pattern, key, value };
                rules.push(newRule);
                chrome.storage.sync.set({ rules }, () => {
                    urlPatternInput.value = '';
                    keyInput.value = '';
                    valueInput.value = '';
                    loadRules();
                });
            });
        } else {
            alert('URL Pattern and Key are required.');
        }
    });

    function loadRules() {
        chrome.storage.sync.get({ rules: [] }, (data) => {
            rulesList.innerHTML = '';
            data.rules.forEach(rule => {
                const li = document.createElement('li');
                li.innerHTML = `
          <div>
            <strong title="${rule.pattern}">URL:</strong> ${rule.pattern.length > 25 ? rule.pattern.substring(0, 25) + '...' : rule.pattern}<br>
            <strong>Key:</strong> ${rule.key}<br>
            <strong>Value:</strong> ${rule.value}
          </div>
          <button class="delete-btn" data-id="${rule.id}">Delete</button>
        `;
                rulesList.appendChild(li);
            });
            addDeleteListeners();
        });
    }

    function addDeleteListeners() {
        const deleteButtons = document.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const ruleId = parseInt(e.target.dataset.id, 10);
                chrome.storage.sync.get({ rules: [] }, (data) => {
                    const updatedRules = data.rules.filter(rule => rule.id !== ruleId);
                    chrome.storage.sync.set({ rules: updatedRules }, () => {
                        loadRules(); // Refresh the list
                    });
                });
            });
        });
    }
});
