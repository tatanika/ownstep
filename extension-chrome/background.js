// ShadowLink Dual-Proxy Extension - Background Script

const DEFAULT_DE = [
    'youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'ggpht.com',
    'instagram.com', 'cdninstagram.com',
    'facebook.com', 'fbcdn.net',
    'twitter.com', 'x.com', 'twimg.com',
    'linkedin.com',
    'discord.com', 'discordapp.com', 'discord.gg',
    'github.com', 'githubusercontent.com',
    'stackoverflow.com',
    'spotify.com',
    'netflix.com',
    'medium.com',
    'bbc.com', 'bbc.co.uk',
    'soundcloud.com',
    'twitch.tv',
    'reddit.com',
    'pinterest.com',
    'whatsapp.com', 'whatsapp.net',
    'signal.org',
    'telegram.org', 't.me',
    'google.com', 'google.de', 'googleapis.com', 'gstatic.com',
    'gmail.com',
    // Torrent trackers
    'rutracker.org', 'rutracker.cc'
];

const DEFAULT_US = [
    'gemini.google.com',
    'aistudio.google.com',
    'makersuite.google.com',
    'generativelanguage.googleapis.com',
    'bard.google.com',
    'openai.com', 'chat.openai.com', 'chatgpt.com',
    'claude.ai', 'anthropic.com',
    'copilot.microsoft.com'
];

const PROXY_DE = '127.0.0.1:10808';
const PROXY_US = '127.0.0.1:10818';

let customDE = [];
let customUS = [];
let isEnabled = true;

function generatePacScript() {
    if (!isEnabled) {
        return 'function FindProxyForURL(url, host) { return "DIRECT"; }';
    }

    const allUS = [...DEFAULT_US, ...customUS];
    const allDE = [...DEFAULT_DE, ...customDE];

    const usChecks = allUS.map(d =>
        'if (dnsDomainIs(host, "' + d + '") || dnsDomainIs(host, ".' + d + '")) return proxyUS;'
    ).join('\n    ');

    const deChecks = allDE.map(d =>
        'if (dnsDomainIs(host, "' + d + '") || dnsDomainIs(host, ".' + d + '")) return proxyDE;'
    ).join('\n    ');

    return `function FindProxyForURL(url, host) {
    var proxyUS = "SOCKS5 ${PROXY_US}; SOCKS ${PROXY_US}; DIRECT";
    var proxyDE = "SOCKS5 ${PROXY_DE}; SOCKS ${PROXY_DE}; DIRECT";
    ${usChecks}
    ${deChecks}
    return "DIRECT";
  }`;
}

function applyProxy() {
    chrome.proxy.settings.set({
        value: {
            mode: 'pac_script',
            pacScript: { data: generatePacScript() }
        },
        scope: 'regular'
    }, updateBadge);
}

function updateBadge() {
    if (isEnabled) {
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#666' });
    }
}

function cleanDomain(d) {
    return d.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/.*$/, '').toLowerCase();
}

function addDomain(domain, route) {
    domain = cleanDomain(domain);
    if (!domain) return false;
    const allDomains = [...DEFAULT_DE, ...DEFAULT_US, ...customDE, ...customUS];
    if (allDomains.includes(domain)) return false;
    if (route === 'us') customUS.push(domain);
    else customDE.push(domain);
    saveAndApply();
    return true;
}

function removeDomain(domain) {
    let idx = customDE.indexOf(domain);
    if (idx !== -1) { customDE.splice(idx, 1); saveAndApply(); return true; }
    idx = customUS.indexOf(domain);
    if (idx !== -1) { customUS.splice(idx, 1); saveAndApply(); return true; }
    return false;
}

function saveAndApply() {
    chrome.storage.local.set({ customDE, customUS, isEnabled }, applyProxy);
}

chrome.storage.local.get(['customDE', 'customUS', 'isEnabled'], (r) => {
    if (r.customDE) customDE = r.customDE;
    if (r.customUS) customUS = r.customUS;
    if (r.isEnabled !== undefined) isEnabled = r.isEnabled;
    applyProxy();
});

function getDomainInfo(domain) {
    const allUS = [...DEFAULT_US, ...customUS];
    const allDE = [...DEFAULT_DE, ...customDE];
    const matchUS = allUS.some(d => domain === d || domain.endsWith('.' + d));
    const matchDE = allDE.some(d => domain === d || domain.endsWith('.' + d));
    const isDefaultUS = DEFAULT_US.some(d => domain === d || domain.endsWith('.' + d));
    const isDefaultDE = DEFAULT_DE.some(d => domain === d || domain.endsWith('.' + d));
    let route = 'direct';
    if (matchUS) route = 'us';
    else if (matchDE) route = 'de';
    return { route, isDefault: isDefaultUS || isDefaultDE };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.action) {
        case 'getState':
            sendResponse({
                isEnabled, DEFAULT_DE, DEFAULT_US, customDE, customUS
            });
            break;
        case 'toggle':
            isEnabled = !isEnabled;
            saveAndApply();
            sendResponse({ isEnabled });
            break;
        case 'addDomain':
            sendResponse({ success: addDomain(msg.domain, msg.route), customDE, customUS });
            break;
        case 'removeDomain':
            sendResponse({ success: removeDomain(msg.domain), customDE, customUS });
            break;
        case 'getCurrentTabDomain':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url) {
                    try {
                        const domain = new URL(tabs[0].url).hostname.replace(/^www\./, '');
                        const info = getDomainInfo(domain);
                        sendResponse({ domain, ...info });
                    } catch (e) { sendResponse({ domain: '', route: 'direct', isDefault: false }); }
                } else { sendResponse({ domain: '', route: 'direct', isDefault: false }); }
            });
            return true;
        case 'addCurrentTab':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url) {
                    try {
                        const domain = new URL(tabs[0].url).hostname.replace(/^www\./, '');
                        const added = addDomain(domain, msg.route);
                        sendResponse({ success: added, domain, customDE, customUS });
                    } catch (e) { sendResponse({ success: false }); }
                } else { sendResponse({ success: false }); }
            });
            return true;
    }
});
