// OwnStep Dual-Proxy for Firefox - Popup Script

const $ = id => document.getElementById(id);

let state = {};
let tabInfo = {};

function init() {
    browser.runtime.sendMessage({ action: 'getState' }).then(r => {
        state = r;
        $('mainToggle').classList.toggle('active', state.isEnabled);
        renderDefaultDE();
        renderDefaultUS();
        renderCustom();
    });

    browser.runtime.sendMessage({ action: 'getCurrentTabDomain' }).then(r => {
        tabInfo = r || {};
        if (r && r.domain) {
            $('siteDomain').textContent = r.domain;
            if (r.route === 'us') {
                $('siteStatus').textContent = '🇺🇸 Через США';
                $('siteStatus').className = 'site-status status-us';
                if (r.isDefault) {
                    $('btnDE').disabled = true; $('btnUS').disabled = true;
                    $('btnDE').style.display = 'none'; $('btnUS').style.display = 'none';
                    $('btnRemove').style.display = 'none';
                    $('siteStatus').textContent += ' (авто)';
                } else {
                    $('btnDE').style.display = 'none'; $('btnUS').style.display = 'none';
                    $('btnRemove').style.display = '';
                }
            } else if (r.route === 'de') {
                $('siteStatus').textContent = '🇩🇪 Через Германию';
                $('siteStatus').className = 'site-status status-de';
                if (r.isDefault) {
                    $('btnDE').style.display = 'none'; $('btnUS').style.display = 'none';
                    $('btnRemove').style.display = 'none';
                    $('siteStatus').textContent += ' (авто)';
                } else {
                    $('btnDE').style.display = 'none'; $('btnUS').style.display = 'none';
                    $('btnRemove').style.display = '';
                }
            } else {
                $('siteStatus').textContent = '🇷🇺 Напрямую';
                $('siteStatus').className = 'site-status status-direct';
                $('btnDE').style.display = ''; $('btnUS').style.display = '';
                $('btnRemove').style.display = 'none';
            }
        }
    });
}

$('mainToggle').addEventListener('click', () => {
    browser.runtime.sendMessage({ action: 'toggle' }).then(r => {
        state.isEnabled = r.isEnabled;
        $('mainToggle').classList.toggle('active', state.isEnabled);
    });
});

$('btnDE').addEventListener('click', () => {
    browser.runtime.sendMessage({ action: 'addCurrentTab', route: 'de' }).then(r => {
        if (r && r.success) { state.customDE = r.customDE; renderCustom(); init(); }
    });
});

$('btnUS').addEventListener('click', () => {
    browser.runtime.sendMessage({ action: 'addCurrentTab', route: 'us' }).then(r => {
        if (r && r.success) { state.customUS = r.customUS; renderCustom(); init(); }
    });
});

$('btnRemove').addEventListener('click', () => {
    if (tabInfo.domain) {
        browser.runtime.sendMessage({ action: 'removeDomain', domain: tabInfo.domain }).then(r => {
            if (r && r.success) {
                state.customDE = r.customDE; state.customUS = r.customUS;
                renderCustom(); init();
            }
        });
    }
});

$('addDE').addEventListener('click', () => addManual('de'));
$('addUS').addEventListener('click', () => addManual('us'));
$('customInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addManual('de');
});

function addManual(route) {
    const d = $('customInput').value.trim();
    if (d) {
        browser.runtime.sendMessage({ action: 'addDomain', domain: d, route }).then(r => {
            if (r && r.success) {
                state.customDE = r.customDE; state.customUS = r.customUS;
                $('customInput').value = '';
                renderCustom(); init();
            }
        });
    }
}

function renderCustom() {
    const all = [
        ...(state.customDE || []).map(d => ({ d, r: 'de' })),
        ...(state.customUS || []).map(d => ({ d, r: 'us' }))
    ];
    if (all.length === 0) {
        $('customList').innerHTML = '<div style="padding:4px 0;font-size:11px;color:#444">Пусто</div>';
        return;
    }
    $('customList').innerHTML = all.map(({ d, r }) => `
    <div class="domain-item">
      <span class="name">${d}</span>
      <span class="tag tag-${r}">${r === 'us' ? '🇺🇸' : '🇩🇪'}</span>
      <button class="remove-btn" data-domain="${d}">✕</button>
    </div>
  `).join('');
    $('customList').querySelectorAll('.remove-btn').forEach(b => {
        b.addEventListener('click', () => {
            browser.runtime.sendMessage({ action: 'removeDomain', domain: b.dataset.domain }).then(r => {
                if (r && r.success) {
                    state.customDE = r.customDE; state.customUS = r.customUS;
                    renderCustom(); init();
                }
            });
        });
    });
}

function renderDefaultUS() {
    if (!state.DEFAULT_US) return;
    $('defaultUSList').innerHTML = state.DEFAULT_US.map(d => `
    <div class="domain-item">
      <span class="name default">${d}</span>
      <span class="tag tag-auto">авто</span>
    </div>
  `).join('');
}

function renderDefaultDE() {
    if (!state.DEFAULT_DE) return;
    $('defaultDEList').innerHTML = state.DEFAULT_DE.map(d => `
    <div class="domain-item">
      <span class="name default">${d}</span>
      <span class="tag tag-auto">авто</span>
    </div>
  `).join('');
}

init();
