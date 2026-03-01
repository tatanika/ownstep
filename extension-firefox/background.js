// OwnStep Dual-Proxy Extension for Firefox - Background Script

const DEFAULT_DE = [
    'youtube.com', 'youtu.be', 'googlevideo.com', 'ytimg.com', 'ggpht.com',
    'instagram.com', 'cdninstagram.com',
    'facebook.com', 'fbcdn.net',
    'twitter.com', 'x.com', 'twimg.com',
    'linkedin.com',
    'discord.com', 'discordapp.com', 'discord.gg',
    'github.com', 'githubusercontent.com',
    'stackoverflow.com',
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
    'rutracker.org', 'rutracker.cc'
];

const DEFAULT_US = [
    'google.com',
    'labs.google',
    'fx.google',
    'deepmind.google',
    'video.google.com',
    'googleapis.com',
    'gstatic.com',
    'gmail.com',
    'googleusercontent.com',
    'gemini.google.com',
    'aistudio.google.com',
    'makersuite.google.com',
    'generativelanguage.googleapis.com',
    'bard.google.com',
    'openai.com', 'chat.openai.com', 'chatgpt.com',
    'claude.ai', 'anthropic.com',
    'copilot.microsoft.com'
];

const PROXY_DE_HOST = '127.0.0.1';
const PROXY_DE_PORT = 10808;
const PROXY_US_HOST = '127.0.0.1';
const PROXY_US_PORT = 10818;

let customDE = [];
let customUS = [];
let isEnabled = true;

function domainMatches(hostname, domain) {
    return hostname === domain || hostname.endsWith('.' + domain);
}

function getProxyForHost(hostname) {
    if (!isEnabled) return null;

    const allUS = [...DEFAULT_US, ...customUS];
    const allDE = [...DEFAULT_DE, ...customDE];

    for (const d of allUS) {
        if (domainMatches(hostname, d)) {
            return { type: 'socks', host: PROXY_US_HOST, port: PROXY_US_PORT, proxyDNS: true };
        }
    }
    for (const d of allDE) {
        if (domainMatches(hostname, d)) {
            return { type: 'socks', host: PROXY_DE_HOST, port: PROXY_DE_PORT, proxyDNS: true };
        }
    }
    return null;
}

// Firefox proxy API: event-based
browser.proxy.onRequest.addListener(
    (requestInfo) => {
        try {
            const url = new URL(requestInfo.url);
            const hostname = url.hostname.replace(/^www\./, '');
            const proxy = getProxyForHost(hostname);
            if (proxy) return proxy;
        } catch (e) { }
        return { type: 'direct' };
    },
    { urls: ['<all_urls>'] }
);

function updateBadge() {
    if (isEnabled) {
        browser.browserAction.setBadgeText({ text: 'ON' });
        browser.browserAction.setBadgeBackgroundColor({ color: '#4CAF50' });
    } else {
        browser.browserAction.setBadgeText({ text: 'OFF' });
        browser.browserAction.setBadgeBackgroundColor({ color: '#666' });
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
    saveSettings();
    return true;
}

function removeDomain(domain) {
    let idx = customDE.indexOf(domain);
    if (idx !== -1) { customDE.splice(idx, 1); saveSettings(); return true; }
    idx = customUS.indexOf(domain);
    if (idx !== -1) { customUS.splice(idx, 1); saveSettings(); return true; }
    return false;
}

function saveSettings() {
    browser.storage.local.set({ customDE, customUS, isEnabled });
    updateBadge();
}

// Load saved settings
browser.storage.local.get(['customDE', 'customUS', 'isEnabled']).then((r) => {
    if (r.customDE) customDE = r.customDE;
    if (r.customUS) customUS = r.customUS;
    if (r.isEnabled !== undefined) isEnabled = r.isEnabled;
    updateBadge();
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

browser.runtime.onMessage.addListener((msg, sender) => {
    switch (msg.action) {
        case 'getState':
            return Promise.resolve({
                isEnabled, DEFAULT_DE, DEFAULT_US, customDE, customUS
            });
        case 'toggle':
            isEnabled = !isEnabled;
            saveSettings();
            return Promise.resolve({ isEnabled });
        case 'addDomain':
            return Promise.resolve({ success: addDomain(msg.domain, msg.route), customDE, customUS });
        case 'removeDomain':
            return Promise.resolve({ success: removeDomain(msg.domain), customDE, customUS });
        case 'getCurrentTabDomain':
            return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
                if (tabs[0] && tabs[0].url) {
                    try {
                        const domain = new URL(tabs[0].url).hostname.replace(/^www\./, '');
                        const info = getDomainInfo(domain);
                        return { domain, ...info };
                    } catch (e) { return { domain: '', route: 'direct', isDefault: false }; }
                }
                return { domain: '', route: 'direct', isDefault: false };
            });
        case 'addCurrentTab':
            return browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
                if (tabs[0] && tabs[0].url) {
                    try {
                        const domain = new URL(tabs[0].url).hostname.replace(/^www\./, '');
                        const added = addDomain(domain, msg.route);
                        return { success: added, domain, customDE, customUS };
                    } catch (e) { return { success: false }; }
                }
                return { success: false };
            });
    }
    return Promise.resolve(null);
});
