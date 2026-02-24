// ShadowLink Proxy Extension - Popup Script

const mainToggle = document.getElementById('mainToggle');
const currentDomain = document.getElementById('currentDomain');
const currentStatus = document.getElementById('currentStatus');
const toggleSiteBtn = document.getElementById('toggleSiteBtn');
const customInput = document.getElementById('customInput');
const addCustomBtn = document.getElementById('addCustomBtn');
const customList = document.getElementById('customList');
const defaultList = document.getElementById('defaultList');

let state = {};
let tabDomain = '';

function init() {
    chrome.runtime.sendMessage({ action: 'getState' }, (response) => {
        state = response;
        mainToggle.classList.toggle('active', state.isEnabled);
        renderDefaultList();
        renderCustomList();
    });

    chrome.runtime.sendMessage({ action: 'getCurrentTabDomain' }, (response) => {
        if (response && response.domain) {
            tabDomain = response.domain;
            currentDomain.textContent = response.domain;
            if (response.isProxied) {
                currentStatus.textContent = '🇩🇪 Через Германию';
                currentStatus.className = 'status proxied';
                if (response.isDefault) {
                    toggleSiteBtn.textContent = 'Автоматический (нельзя убрать)';
                    toggleSiteBtn.disabled = true;
                    toggleSiteBtn.className = 'btn btn-add';
                } else {
                    toggleSiteBtn.textContent = '✕ Убрать из прокси';
                    toggleSiteBtn.disabled = false;
                    toggleSiteBtn.className = 'btn btn-remove';
                }
            } else {
                currentStatus.textContent = '🇷🇺 Напрямую (Россия)';
                currentStatus.className = 'status direct';
                toggleSiteBtn.textContent = '+ Добавить в прокси (🇩🇪)';
                toggleSiteBtn.disabled = false;
                toggleSiteBtn.className = 'btn btn-add';
            }
        } else {
            currentDomain.textContent = '—';
            currentStatus.textContent = 'Нет активной вкладки';
            toggleSiteBtn.disabled = true;
        }
    });
}

mainToggle.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggle' }, (response) => {
        state.isEnabled = response.isEnabled;
        mainToggle.classList.toggle('active', state.isEnabled);
    });
});

toggleSiteBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getCurrentTabDomain' }, (response) => {
        if (response.isProxied && !response.isDefault) {
            chrome.runtime.sendMessage({ action: 'removeDomain', domain: response.domain }, (res) => {
                if (res.success) {
                    state.customDomains = res.customDomains;
                    renderCustomList();
                    init();
                }
            });
        } else if (!response.isProxied) {
            chrome.runtime.sendMessage({ action: 'addCurrentTab' }, (res) => {
                if (res.success) {
                    state.customDomains = res.customDomains;
                    renderCustomList();
                    init();
                }
            });
        }
    });
});

addCustomBtn.addEventListener('click', () => {
    const domain = customInput.value.trim();
    if (domain) {
        chrome.runtime.sendMessage({ action: 'addDomain', domain }, (res) => {
            if (res.success) {
                state.customDomains = res.customDomains;
                customInput.value = '';
                renderCustomList();
                init();
            }
        });
    }
});

customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addCustomBtn.click();
});

function renderCustomList() {
    if (!state.customDomains || state.customDomains.length === 0) {
        customList.innerHTML = '<div style="padding:6px 0;font-size:11px;color:#555;">Пусто — добавьте свои домены</div>';
        return;
    }
    customList.innerHTML = state.customDomains.map(d => `
    <div class="domain-item">
      <span class="name">${d}</span>
      <button class="remove-btn" data-domain="${d}">✕</button>
    </div>
  `).join('');

    customList.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const domain = btn.dataset.domain;
            chrome.runtime.sendMessage({ action: 'removeDomain', domain }, (res) => {
                if (res.success) {
                    state.customDomains = res.customDomains;
                    renderCustomList();
                    init();
                }
            });
        });
    });
}

function renderDefaultList() {
    if (!state.defaultDomains) return;
    defaultList.innerHTML = state.defaultDomains.map(d => `
    <div class="domain-item">
      <span class="name default">${d}</span>
      <span class="tag">авто</span>
    </div>
  `).join('');
}

init();
