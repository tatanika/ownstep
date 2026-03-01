// ===== OwnStep — Application Logic =====

// ===== State =====
let state = {
    connected: false,
    connecting: false,
    uptimeInterval: null,
    uptimeStart: null,
    config: loadConfig()
};

// ===== Tab Navigation =====
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        item.classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');
    });
});

// ===== Config Persistence =====
function loadConfig() {
    try {
        const saved = localStorage.getItem('ownstep_config');
        if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {
        server: { address: '', port: 443, uuid: '', flow: 'xtls-rprx-vision', pubKey: '', sni: 'www.google.com', shortId: '', fp: 'chrome' },
        local: { socksPort: 10808, httpPort: 10809 },
        chain: { enabled: false, protocol: 'socks', address: '', port: 1080, user: '', pass: '', uuid: '' }
    };
}

function saveConfig() {
    const config = {
        server: {
            address: document.getElementById('serverAddress').value,
            port: parseInt(document.getElementById('serverPort').value) || 443,
            uuid: document.getElementById('serverUUID').value,
            flow: document.getElementById('serverFlow').value,
            pubKey: document.getElementById('serverPubKey').value,
            sni: document.getElementById('serverSNI').value,
            shortId: document.getElementById('serverShortId').value,
            fp: document.getElementById('serverFP').value
        },
        local: {
            socksPort: parseInt(document.getElementById('localSocksPort').value) || 10808,
            httpPort: parseInt(document.getElementById('localHttpPort').value) || 10809
        },
        chain: {
            enabled: document.getElementById('chainEnabled').checked,
            protocol: document.getElementById('chainProtocol').value,
            address: document.getElementById('chainAddress').value,
            port: parseInt(document.getElementById('chainPort').value) || 1080,
            user: document.getElementById('chainUser').value,
            pass: document.getElementById('chainPass').value,
            uuid: document.getElementById('chainUUID').value
        }
    };
    state.config = config;
    localStorage.setItem('ownstep_config', JSON.stringify(config));
    return config;
}

function populateFields() {
    const c = state.config;
    document.getElementById('serverAddress').value = c.server.address || '';
    document.getElementById('serverPort').value = c.server.port || 443;
    document.getElementById('serverUUID').value = c.server.uuid || '';
    document.getElementById('serverFlow').value = c.server.flow || 'xtls-rprx-vision';
    document.getElementById('serverPubKey').value = c.server.pubKey || '';
    document.getElementById('serverSNI').value = c.server.sni || 'www.google.com';
    document.getElementById('serverShortId').value = c.server.shortId || '';
    document.getElementById('serverFP').value = c.server.fp || 'chrome';
    document.getElementById('localSocksPort').value = c.local.socksPort || 10808;
    document.getElementById('localHttpPort').value = c.local.httpPort || 10809;
    document.getElementById('chainEnabled').checked = c.chain.enabled || false;
    document.getElementById('chainProtocol').value = c.chain.protocol || 'socks';
    document.getElementById('chainAddress').value = c.chain.address || '';
    document.getElementById('chainPort').value = c.chain.port || 1080;
    document.getElementById('chainUser').value = c.chain.user || '';
    document.getElementById('chainPass').value = c.chain.pass || '';
    document.getElementById('chainUUID').value = c.chain.uuid || '';
    updateChainUI();
}

// ===== Generate Xray-core Config =====
function generateXrayConfig() {
    const c = saveConfig();

    // Build inbounds
    const inbounds = [
        {
            tag: "socks-in",
            port: c.local.socksPort,
            listen: "127.0.0.1",
            protocol: "socks",
            settings: { auth: "noauth", udp: true },
            sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] }
        },
        {
            tag: "http-in",
            port: c.local.httpPort,
            listen: "127.0.0.1",
            protocol: "http",
            settings: {},
            sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] }
        }
    ];

    // Build primary outbound (Germany VLESS Reality)
    const primaryOutbound = {
        tag: "proxy-de",
        protocol: "vless",
        settings: {
            vnext: [{
                address: c.server.address,
                port: c.server.port,
                users: [{
                    id: c.server.uuid,
                    encryption: "none",
                    flow: c.server.flow || ""
                }]
            }]
        },
        streamSettings: {
            network: "tcp",
            security: "reality",
            realitySettings: {
                show: false,
                fingerprint: c.server.fp || "chrome",
                serverName: c.server.sni || "www.google.com",
                publicKey: c.server.pubKey,
                shortId: c.server.shortId || ""
            }
        }
    };

    const outbounds = [primaryOutbound];

    // If chaining is enabled, add the second-hop proxy
    if (c.chain.enabled && c.chain.address) {
        let chainOutbound;

        if (c.chain.protocol === 'socks') {
            chainOutbound = {
                tag: "proxy-us",
                protocol: "socks",
                settings: {
                    servers: [{
                        address: c.chain.address,
                        port: c.chain.port,
                        users: c.chain.user ? [{ user: c.chain.user, pass: c.chain.pass }] : []
                    }]
                },
                proxySettings: {
                    tag: "proxy-de"
                }
            };
        } else if (c.chain.protocol === 'http') {
            chainOutbound = {
                tag: "proxy-us",
                protocol: "http",
                settings: {
                    servers: [{
                        address: c.chain.address,
                        port: c.chain.port,
                        users: c.chain.user ? [{ user: c.chain.user, pass: c.chain.pass }] : []
                    }]
                },
                proxySettings: {
                    tag: "proxy-de"
                }
            };
        } else if (c.chain.protocol === 'vless') {
            chainOutbound = {
                tag: "proxy-us",
                protocol: "vless",
                settings: {
                    vnext: [{
                        address: c.chain.address,
                        port: c.chain.port,
                        users: [{
                            id: c.chain.uuid,
                            encryption: "none"
                        }]
                    }]
                },
                proxySettings: {
                    tag: "proxy-de"
                }
            };
        } else if (c.chain.protocol === 'vmess') {
            chainOutbound = {
                tag: "proxy-us",
                protocol: "vmess",
                settings: {
                    vnext: [{
                        address: c.chain.address,
                        port: c.chain.port,
                        users: [{
                            id: c.chain.uuid,
                            alterId: 0
                        }]
                    }]
                },
                proxySettings: {
                    tag: "proxy-de"
                }
            };
        } else if (c.chain.protocol === 'shadowsocks') {
            chainOutbound = {
                tag: "proxy-us",
                protocol: "shadowsocks",
                settings: {
                    servers: [{
                        address: c.chain.address,
                        port: c.chain.port,
                        method: "chacha20-ietf-poly1305",
                        password: c.chain.pass
                    }]
                },
                proxySettings: {
                    tag: "proxy-de"
                }
            };
        }

        if (chainOutbound) {
            outbounds.push(chainOutbound);
        }
    }

    // Add direct and block outbounds
    outbounds.push({ tag: "direct", protocol: "freedom", settings: {} });
    outbounds.push({ tag: "block", protocol: "blackhole", settings: {} });

    // Determine which proxy tag to use as default
    const defaultProxyTag = (c.chain.enabled && c.chain.address) ? "proxy-us" : "proxy-de";

    // Build routing rules
    const routing = {
        domainStrategy: "AsIs",
        rules: [
            // Block ads/trackers
            {
                type: "field",
                domain: ["geosite:category-ads-all"],
                outboundTag: "block"
            },
            // Direct for local & private ranges
            {
                type: "field",
                ip: ["geoip:private", "127.0.0.0/8"],
                outboundTag: "direct"
            },
            // Direct for DNS queries
            {
                type: "field",
                port: "53",
                outboundTag: "direct"
            },
            // Everything else goes through proxy
            {
                type: "field",
                port: "0-65535",
                outboundTag: defaultProxyTag
            }
        ]
    };

    // Reorder outbounds so the default is first
    const reordered = [
        outbounds.find(o => o.tag === defaultProxyTag),
        ...outbounds.filter(o => o.tag !== defaultProxyTag)
    ];

    const xrayConfig = {
        log: {
            loglevel: "warning"
        },
        dns: {
            servers: [
                { address: "1.1.1.1", domains: ["geosite:geolocation-!cn"] },
                { address: "8.8.8.8" },
                "localhost"
            ]
        },
        inbounds,
        outbounds: reordered,
        routing
    };

    return xrayConfig;
}

// ===== Connection Flow =====
function toggleConnection() {
    if (state.connecting) return;

    if (state.connected) {
        disconnect();
    } else {
        connect();
    }
}

function connect() {
    const c = saveConfig();
    if (!c.server.address || !c.server.uuid) {
        showToast('⚠️ Заполните адрес сервера и UUID', 'error');
        return;
    }

    state.connecting = true;
    updateUI('connecting');
    addLog('Генерация конфигурации Xray-core...', 'info');

    const config = generateXrayConfig();
    const configJson = JSON.stringify(config, null, 2);

    addLog('Конфигурация создана', 'success');
    addLog(`Протокол: VLESS + Reality → ${c.server.address}:${c.server.port}`, 'info');

    if (c.chain.enabled && c.chain.address) {
        addLog(`Цепочка: ${c.chain.protocol.toUpperCase()} → ${c.chain.address}:${c.chain.port}`, 'info');
    }

    // Save config to clipboard for use with the PowerShell script
    addLog('Сохранение config.json...', 'info');

    // Simulate the connection (since we can't actually run xray from browser)
    // In practice, the PowerShell script handles xray-core
    setTimeout(() => {
        // Download the config file
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.json';
        a.click();
        URL.revokeObjectURL(url);

        addLog('✅ config.json скачан! Запустите скрипт start-vpn.ps1', 'success');
        addLog('Или выполните: .\\xray.exe run -c config.json', 'success');

        state.connecting = false;
        state.connected = true;
        state.uptimeStart = Date.now();
        state.uptimeInterval = setInterval(updateUptime, 1000);
        updateUI('connected');
        showToast('✅ Конфигурация готова!', 'success');
    }, 1500);
}

function disconnect() {
    state.connected = false;
    state.connecting = false;
    if (state.uptimeInterval) {
        clearInterval(state.uptimeInterval);
        state.uptimeInterval = null;
    }
    updateUI('disconnected');
    addLog('🔌 Отключено', 'warning');
    showToast('Отключено', 'error');
}

// ===== UI Updates =====
function updateUI(status) {
    const badge = document.getElementById('globalStatus');
    const text = document.getElementById('statusText');
    const ring = document.getElementById('connectRing');
    const btn = document.getElementById('connectBtn');
    const label = document.getElementById('connectLabel');
    const playIcon = btn.querySelector('#playIcon').parentElement;
    const pauseParts = btn.querySelectorAll('#pauseIcon1, #pauseIcon2');

    badge.className = 'status-badge ' + status;
    ring.className = 'connect-ring ' + status;

    const c = state.config;

    if (status === 'connected') {
        text.textContent = 'Подключено';
        label.textContent = 'Нажмите для отключения';
        playIcon.style.display = 'none';
        pauseParts.forEach(p => p.parentElement.style.display = 'block');
        document.getElementById('statServer').textContent = c.server.address || '—';
        document.getElementById('statProtocol').textContent = 'VLESS+Reality';
        document.getElementById('statChain').textContent = c.chain.enabled ? `${c.chain.protocol.toUpperCase()} → US` : 'Выкл';
    } else if (status === 'connecting') {
        text.textContent = 'Подключение...';
        label.textContent = 'Генерация конфигурации...';
    } else {
        text.textContent = 'Отключено';
        label.textContent = 'Нажмите для подключения';
        playIcon.style.display = 'block';
        pauseParts.forEach(p => p.parentElement.style.display = 'none');
        document.getElementById('statServer').textContent = '—';
        document.getElementById('statProtocol').textContent = '—';
        document.getElementById('statChain').textContent = 'Выкл';
        document.getElementById('statUptime').textContent = '00:00:00';
    }
}

function updateUptime() {
    if (!state.uptimeStart) return;
    const elapsed = Math.floor((Date.now() - state.uptimeStart) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    document.getElementById('statUptime').textContent = `${h}:${m}:${s}`;
}

// ===== Chain UI =====
function updateChainUI() {
    const enabled = document.getElementById('chainEnabled').checked;
    const fields = document.getElementById('chainFields');
    const arrow2 = document.getElementById('chainArrow2');
    const nodeUS = document.getElementById('chainNodeUS');
    const arrow3 = document.getElementById('chainArrow3');
    const nodeInternet = document.getElementById('chainNodeInternet');

    fields.style.opacity = enabled ? '1' : '0.5';
    fields.style.pointerEvents = enabled ? 'auto' : 'none';
    arrow2.style.opacity = enabled ? '1' : '0.3';
    nodeUS.style.opacity = enabled ? '1' : '0.3';
    arrow3.style.opacity = enabled ? '1' : '0.3';
    nodeInternet.style.opacity = enabled ? '1' : '0.3';

    if (enabled) {
        nodeUS.querySelector('.chain-icon').style.borderColor = 'var(--accent)';
        nodeUS.querySelector('.chain-icon').style.boxShadow = '0 0 15px var(--accent-glow)';
    } else {
        nodeUS.querySelector('.chain-icon').style.borderColor = '';
        nodeUS.querySelector('.chain-icon').style.boxShadow = '';
    }

    // Show/hide VLESS/VMess specific fields
    const proto = document.getElementById('chainProtocol').value;
    const vlessFields = document.getElementById('chainVlessFields');
    vlessFields.style.display = (proto === 'vless' || proto === 'vmess') ? 'block' : 'none';
}

document.getElementById('chainProtocol').addEventListener('change', updateChainUI);

// ===== Import VLESS Link =====
function importVlessLink() {
    const link = document.getElementById('importLink').value.trim();
    if (!link.startsWith('vless://')) {
        showToast('⚠️ Ссылка должна начинаться с vless://', 'error');
        return;
    }

    try {
        // Parse vless://uuid@host:port?params#name
        const withoutScheme = link.substring(8);
        const [mainPart, name] = withoutScheme.split('#');
        const [userHost, queryString] = mainPart.split('?');
        const [uuid, hostPort] = userHost.split('@');
        const [host, portStr] = hostPort.split(':');
        const port = parseInt(portStr) || 443;

        const params = new URLSearchParams(queryString);

        document.getElementById('serverAddress').value = host;
        document.getElementById('serverPort').value = port;
        document.getElementById('serverUUID').value = uuid;

        if (params.get('flow')) document.getElementById('serverFlow').value = params.get('flow');
        if (params.get('pbk')) document.getElementById('serverPubKey').value = params.get('pbk');
        if (params.get('sni')) document.getElementById('serverSNI').value = params.get('sni');
        if (params.get('sid')) document.getElementById('serverShortId').value = params.get('sid');
        if (params.get('fp')) document.getElementById('serverFP').value = params.get('fp');

        saveConfig();
        showToast('✅ Конфигурация импортирована!', 'success');
        addLog(`Импортирован сервер: ${host}:${port}`, 'success');
    } catch (e) {
        showToast('❌ Не удалось разобрать VLESS ссылку', 'error');
        console.error(e);
    }
}

// ===== Save Button Handler =====
function saveServers() {
    saveConfig();
    showToast('💾 Настройки сохранены', 'success');
    addLog('Настройки сохранены в локальное хранилище', 'info');
}

// ===== Export Config =====
function exportConfig() {
    saveConfig();
    const config = generateXrayConfig();
    const json = JSON.stringify(config, null, 2);
    document.getElementById('configPreview').textContent = json;

    // Also download
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(url);

    showToast('📄 config.json скачан', 'success');
    addLog('Конфигурация экспортирована', 'info');
}

// ===== Logs =====
function addLog(message, level = 'info') {
    const viewer = document.getElementById('logViewer');
    const time = new Date().toLocaleTimeString('ru-RU');
    const line = document.createElement('div');
    line.className = `log-line log-${level}`;
    line.textContent = `[${time}] ${message}`;
    viewer.appendChild(line);
    viewer.scrollTop = viewer.scrollHeight;
}

function clearLogs() {
    document.getElementById('logViewer').innerHTML = '<div class="log-line log-info">Логи очищены</div>';
}

// ===== Toast =====
function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
}

// ===== Init =====
populateFields();
addLog('OwnStep инициализирован', 'info');
addLog('Введите данные сервера во вкладке "Серверы"', 'info');
