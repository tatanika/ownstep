// OwnStep Proxy - Popup Script (Single Proxy)

const $ = id => document.getElementById(id);

let state = {};
let tabInfo = {};

function init() {
    chrome.runtime.sendMessage({ action: 'getState' }, r => {
        state = r;
        $('mainToggle').classList.toggle('active', state.isEnabled);
        renderDefault();
        renderCustom();
    });

    chrome.runtime.sendMessage({ action: 'getCurrentTabDomain' }, r => {
        tabInfo = r || {};
        if (r && r.domain) {
            $('siteDomain').textContent = r.domain;
            if (r.isProxied) {
                $('siteStatus').textContent = '🔒 Через прокси';
                $('siteStatus').className = 'site-status status-proxied';
                if (r.isDefault) {
                    $('btnAdd').style.display = 'none';
                    $('btnRemove').style.display = 'none';
                    $('siteStatus').textContent += ' (авто)';
                } else {
                    $('btnAdd').style.display = 'none';
                    $('btnRemove').style.display = '';
                }
            } else {
                $('siteStatus').textContent = '🌐 Напрямую';
                $('siteStatus').className = 'site-status status-direct';
                $('btnAdd').style.display = '';
                $('btnRemove').style.display = 'none';
            }
        }
    });
}

$('mainToggle').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'toggle' }, r => {
        state.isEnabled = r.isEnabled;
        $('mainToggle').classList.toggle('active', state.isEnabled);
    });
});

$('btnAdd').addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'addCurrentTab' }, r => {
        if (r && r.success) { state.customDomains = r.customDomains; renderCustom(); init(); }
    });
});

$('btnRemove').addEventListener('click', () => {
    if (tabInfo.domain) {
        chrome.runtime.sendMessage({ action: 'removeDomain', domain: tabInfo.domain }, r => {
            if (r && r.success) {
                state.customDomains = r.customDomains;
                renderCustom(); init();
            }
        });
    }
});

$('addBtn').addEventListener('click', () => addManual());
$('customInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addManual();
});

function addManual() {
    const d = $('customInput').value.trim();
    if (d) {
        chrome.runtime.sendMessage({ action: 'addDomain', domain: d }, r => {
            if (r && r.success) {
                state.customDomains = r.customDomains;
                $('customInput').value = '';
                renderCustom(); init();
            }
        });
    }
}

function renderCustom() {
    const domains = state.customDomains || [];
    if (domains.length === 0) {
        $('customList').innerHTML = '<div style="padding:4px 0;font-size:11px;color:#444">Пусто</div>';
        return;
    }
    $('customList').innerHTML = domains.map(d => `
    <div class="domain-item">
      <span class="name">${d}</span>
      <button class="remove-btn" data-domain="${d}">✕</button>
    </div>
  `).join('');
    $('customList').querySelectorAll('.remove-btn').forEach(b => {
        b.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'removeDomain', domain: b.dataset.domain }, r => {
                if (r && r.success) {
                    state.customDomains = r.customDomains;
                    renderCustom(); init();
                }
            });
        });
    });
}

function renderDefault() {
    if (!state.defaultDomains) return;
    const excluded = state.excludedDefaults || [];
    $('defaultList').innerHTML = state.defaultDomains.map(d => {
        const isExcluded = excluded.includes(d);
        if (isExcluded) {
            return `<div class="domain-item">
              <span class="name default" style="text-decoration:line-through;opacity:0.4">${d}</span>
              <button class="restore-btn" data-domain="${d}" title="Вернуть">↩</button>
            </div>`;
        }
        return `<div class="domain-item">
          <span class="name default">${d}</span>
          <button class="remove-default-btn" data-domain="${d}" title="Убрать">✕</button>
        </div>`;
    }).join('');
    $('defaultList').querySelectorAll('.remove-default-btn').forEach(b => {
        b.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'removeDefault', domain: b.dataset.domain }, r => {
                if (r && r.success) { state.excludedDefaults = r.excludedDefaults; renderDefault(); init(); }
            });
        });
    });
    $('defaultList').querySelectorAll('.restore-btn').forEach(b => {
        b.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'restoreDefault', domain: b.dataset.domain }, r => {
                if (r && r.success) { state.excludedDefaults = r.excludedDefaults; renderDefault(); init(); }
            });
        });
    });
}

init();
