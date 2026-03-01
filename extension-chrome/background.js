// OwnStep Proxy Extension - Chrome Background Script (Single Proxy)

const DEFAULT_DOMAINS = [
    // Video
    'youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'ggpht.com',
    // Social
    'instagram.com', 'cdninstagram.com', 'facebook.com', 'fbcdn.net',
    'twitter.com', 'x.com', 'twimg.com',
    'linkedin.com',
    // Messengers
    'discord.com', 'discordapp.com',
    // Dev
    'github.com', 'githubusercontent.com',
    'stackoverflow.com',
    // Media
    'spotify.com', 'netflix.com',
    'medium.com',
    // AI
    'openai.com', 'chat.openai.com',
    'claude.ai', 'anthropic.com',
    // Google
    'google.com', 'googleapis.com', 'gstatic.com',
    'gmail.com', 'googleusercontent.com',
    'gemini.google.com', 'aistudio.google.com',
    // Other blocked
    'bbc.com', 'bbc.co.uk',
    'soundcloud.com',
    // Torrent trackers
    'rutracker.org', 'rutracker.cc',
    // Proxy services
    'proxy6.net'
];

const PROXY_HOST = '127.0.0.1';
const PROXY_PORT = 10808;

let customDomains = [];
let excludedDefaults = [];
let isEnabled = true;

function getAllDomains() {
    return [...DEFAULT_DOMAINS.filter(d => !excludedDefaults.includes(d)), ...customDomains];
}

function generatePacScript() {
    if (!isEnabled) {
        return 'function FindProxyForURL(url, host) { return "DIRECT"; }';
    }

    const domains = getAllDomains();
    const domainChecks = domains.map(d => {
        return 'if (dnsDomainIs(host, "' + d + '") || dnsDomainIs(host, ".' + d + '")) return proxy;';
    }).join('\n    ');

    return `function FindProxyForURL(url, host) {
    var proxy = "SOCKS5 ${PROXY_HOST}:${PROXY_PORT}; SOCKS ${PROXY_HOST}:${PROXY_PORT}; DIRECT";
    ${domainChecks}
    return "DIRECT";
  }`;
}

function applyProxy() {
    const pac = generatePacScript();
    chrome.proxy.settings.set({
        value: {
            mode: 'pac_script',
            pacScript: { data: pac }
        },
        scope: 'regular'
    }, updateBadge);
}

function updateBadge() {
    if (isEnabled) {
        const count = getAllDomains().length;
        chrome.action.setBadgeText({ text: String(count) });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#666' });
    }
}

function addDomain(domain) {
    domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();
    if (!domain) return false;
    if (DEFAULT_DOMAINS.includes(domain) || customDomains.includes(domain)) return false;
    customDomains.push(domain);
    saveAndApply();
    return true;
}

function removeDomain(domain) {
    const idx = customDomains.indexOf(domain);
    if (idx !== -1) {
        customDomains.splice(idx, 1);
        saveAndApply();
        return true;
    }
    return false;
}

function saveAndApply() {
    chrome.storage.local.set({
        customDomains: customDomains,
        excludedDefaults: excludedDefaults,
        isEnabled: isEnabled
    }, applyProxy);
}

// Load saved settings
chrome.storage.local.get(['customDomains', 'excludedDefaults', 'isEnabled'], (result) => {
    if (result.customDomains) customDomains = result.customDomains;
    if (result.excludedDefaults) excludedDefaults = result.excludedDefaults;
    if (result.isEnabled !== undefined) isEnabled = result.isEnabled;
    applyProxy();
});

// Message handler from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
        case 'getState':
            sendResponse({
                isEnabled: isEnabled,
                defaultDomains: DEFAULT_DOMAINS,
                excludedDefaults: excludedDefaults,
                customDomains: customDomains
            });
            break;
        case 'toggle':
            isEnabled = !isEnabled;
            saveAndApply();
            sendResponse({ isEnabled });
            break;
        case 'addDomain':
            const added = addDomain(msg.domain);
            sendResponse({ success: added, customDomains });
            break;
        case 'removeDomain':
            const removed = removeDomain(msg.domain);
            sendResponse({ success: removed, customDomains });
            break;
        case 'removeDefault': {
            if (DEFAULT_DOMAINS.includes(msg.domain) && !excludedDefaults.includes(msg.domain)) {
                excludedDefaults.push(msg.domain);
                saveAndApply();
                sendResponse({ success: true, excludedDefaults });
            } else {
                sendResponse({ success: false, excludedDefaults });
            }
            break;
        }
        case 'restoreDefault': {
            const ri = excludedDefaults.indexOf(msg.domain);
            if (ri !== -1) {
                excludedDefaults.splice(ri, 1);
                saveAndApply();
                sendResponse({ success: true, excludedDefaults });
            } else {
                sendResponse({ success: false, excludedDefaults });
            }
            break;
        }
        case 'addCurrentTab':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url) {
                    try {
                        const url = new URL(tabs[0].url);
                        let domain = url.hostname.replace(/^www\./, '');
                        const added = addDomain(domain);
                        sendResponse({ success: added, domain, customDomains });
                    } catch (e) {
                        sendResponse({ success: false, error: 'Invalid URL' });
                    }
                } else {
                    sendResponse({ success: false, error: 'No active tab' });
                }
            });
            return true; // async response
        case 'getCurrentTabDomain':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url) {
                    try {
                        const url = new URL(tabs[0].url);
                        let domain = url.hostname.replace(/^www\./, '');
                        const isProxied = getAllDomains().some(d => domain === d || domain.endsWith('.' + d));
                        const isDefault = DEFAULT_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
                        sendResponse({ domain, isProxied, isDefault });
                    } catch (e) {
                        sendResponse({ domain: '', isProxied: false, isDefault: false });
                    }
                } else {
                    sendResponse({ domain: '', isProxied: false, isDefault: false });
                }
            });
            return true;
    }
});
