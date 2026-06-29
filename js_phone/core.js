// ══════════════════════════════════════
// 手机系统核心 (时间、锁屏、导航、通信)
// ══════════════════════════════════════

// ═══ 游戏时间 ═══
var gameTime = { year:2026, month:6, day:28, weekday:'周六', hour:14, minute:30 };
var playerName = '玩家';
var playerColor = '#ff9eaa';
var playerWxId = 'player_001'; // 微信号，不可修改

function formatGameTime() { return String(gameTime.hour).padStart(2,'0') + ':' + String(gameTime.minute).padStart(2,'0'); }
function formatGameDate() { return gameTime.month + '月' + gameTime.day + '日 ' + gameTime.weekday; }
function updateTimeDisplay() {
    var t = formatGameTime();
    document.getElementById('statusbar-time').textContent = t;
    document.getElementById('lock-time').textContent = t;
    document.getElementById('lock-date').textContent = formatGameDate();
}
updateTimeDisplay();

function formatChatTime(ts) {
    if(!ts) return "";
    var time = String(ts.hour).padStart(2,'0') + ':' + String(ts.minute).padStart(2,'0');
    if (ts.daysAgo === 0) return time;
    if (ts.daysAgo === 1) return '昨天 ' + time;
    return gameTime.month + '/' + (gameTime.day - ts.daysAgo) + ' ' + time;
}

// ═══ 导航 ═══
function setStatusbarMode(m) { document.getElementById('statusbar').className = 'statusbar ' + m; }
function setHomeBarMode(m) { var el = document.getElementById('home-bar'); el.className = 'home-bar ' + m; el.style.display = m === 'hidden' ? 'none' : 'block'; }
function showScreen(id) { document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');}); document.getElementById(id).classList.add('active'); }
function unlockPhone() { showScreen('screen-home'); setStatusbarMode('light'); setHomeBarMode('hidden'); }
function goDesktop() { showScreen('screen-home'); setStatusbarMode('light'); setHomeBarMode('hidden'); }
function openApp(id) {
    if (id === 'wechat') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-wechat'); if(typeof wxNav === 'function') wxNav('chatlist'); }
    else if (id === 'weibo') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-weibo'); if(typeof wbNav === 'function') wbNav('home'); }
    else if (id === 'douban') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-douban'); if(typeof dbNav === 'function') dbNav('home'); }
    else if (id === 'redbook') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-redbook'); if(typeof xhsNav === 'function') xhsNav('home'); }
    else if (id === 'douyin') { setStatusbarMode('light'); setHomeBarMode('light'); showScreen('screen-douyin'); if(typeof dyNav === 'function') dyNav('feed'); }
    else if (id === 'bilibili') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-bilibili'); if(typeof biliNav === 'function') biliNav('home'); }
    else if (id === 'tfamily') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-tfamily'); if(typeof tfNav === 'function') tfNav('home'); }
    else if (id === 'imessage') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-imessage'); if(typeof imNav === 'function') imNav('list'); }
    else if (id === 'album') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-album'); if(typeof openAlbum === 'function') openAlbum(); }
    else if (id === 'phone') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-phone'); if(typeof openPhoneApp === 'function') openPhoneApp(); }
    else if (id === 'notes') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-notes'); if(typeof openNotes === 'function') openNotes(); }
    else alert(id + ' 后续Part实现');
}

// ═══ SVG图标库 (全局) ═══
var IC = {
    back: '<svg width="10" height="18" viewBox="0 0 10 18" fill="none"><path d="M9 1L1 9l8 8" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    more: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="4" cy="10" r="1.5" fill="#000"/><circle cx="10" cy="10" r="1.5" fill="#000"/><circle cx="16" cy="10" r="1.5" fill="#000"/></svg>',
    plus: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="11" y1="4" x2="11" y2="18" stroke="#000" stroke-width="1.7" stroke-linecap="round"/><line x1="4" y1="11" x2="18" y2="11" stroke="#000" stroke-width="1.7" stroke-linecap="round"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 18 18" fill="none"><circle cx="7.5" cy="7.5" r="5" stroke="#b0b0b0" stroke-width="1.5"/><line x1="11.5" y1="11.5" x2="15" y2="15" stroke="#b0b0b0" stroke-width="1.5" stroke-linecap="round"/></svg>',
    mic: '<svg width="20" height="20" viewBox="0 0 22 22" fill="none"><rect x="8" y="4" width="6" height="9" rx="3" stroke="#3c3c3c" stroke-width="1.4"/><path d="M6 13a5 5 0 0 0 10 0" stroke="#3c3c3c" stroke-width="1.4" stroke-linecap="round"/><line x1="11" y1="18" x2="11" y2="20" stroke="#3c3c3c" stroke-width="1.4" stroke-linecap="round"/></svg>',
    plusGray: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none"><line x1="11" y1="5" x2="11" y2="17" stroke="#3c3c3c" stroke-width="1.8" stroke-linecap="round"/><line x1="5" y1="11" x2="17" y2="11" stroke="#3c3c3c" stroke-width="1.8" stroke-linecap="round"/></svg>',
    arrowR: '<svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1l6 6-6 6" stroke="#c8c8c8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    heart: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" stroke="currentColor" stroke-width="1.8"/></svg>',
    comment: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-4l-4 3.5V16H7a3 3 0 0 1-3-3V6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    camera: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="#000" stroke-width="1.4"/><circle cx="12" cy="12.5" r="3" stroke="#000" stroke-width="1.4"/><path d="M8 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="#000" stroke-width="1.4"/></svg>',
    voiceLeft: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M12 7a3 3 0 0 1 0 6" stroke="#333" stroke-width="1.5" stroke-linecap="round"/><path d="M14 4.5a6 6 0 0 1 0 11" stroke="#333" stroke-width="1.5" stroke-linecap="round"/><path d="M16 2a9 9 0 0 1 0 16" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>',
    voiceRight: '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M8 7a3 3 0 0 0 0 6" stroke="#333" stroke-width="1.5" stroke-linecap="round"/><path d="M6 4.5a6 6 0 0 0 0 11" stroke="#333" stroke-width="1.5" stroke-linecap="round"/><path d="M4 2a9 9 0 0 0 0 16" stroke="#333" stroke-width="1.5" stroke-linecap="round"/></svg>',
    redpacket: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="3" stroke="#fff" stroke-width="1.4"/><circle cx="12" cy="12" r="3" stroke="#fff" stroke-width="1.4"/><path d="M4 8h16" stroke="#fff" stroke-width="1.2"/></svg>',
    transfer: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#666" stroke-width="1.4"/><path d="M3 9h18" stroke="#666" stroke-width="1.2"/><path d="M7 14h4" stroke="#666" stroke-width="1.2" stroke-linecap="round"/></svg>',
    photo: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#666" stroke-width="1.4"/><circle cx="8.5" cy="9.5" r="2" stroke="#666" stroke-width="1.2"/><path d="M3 16l5-4 3 2 4-3 6 5" stroke="#666" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    shoot: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="#666" stroke-width="1.4"/><circle cx="12" cy="12.5" r="3" stroke="#666" stroke-width="1.4"/><path d="M8 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="#666" stroke-width="1.4"/></svg>',
    location: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" stroke="#666" stroke-width="1.4"/><circle cx="12" cy="9" r="2.5" stroke="#666" stroke-width="1.2"/></svg>',
    card: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#666" stroke-width="1.4"/><circle cx="12" cy="10" r="3" stroke="#666" stroke-width="1.2"/><path d="M7 18c0-2 2.2-3.5 5-3.5s5 1.5 5 3.5" stroke="#666" stroke-width="1.2"/></svg>',
    phone: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" stroke="#fff" stroke-width="1.5"/></svg>',
    moments: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="#576b95" stroke-width="1.4"/><circle cx="12" cy="12.5" r="3" stroke="#576b95" stroke-width="1.4"/><path d="M8 6V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="#576b95" stroke-width="1.4"/></svg>',
    scan: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" stroke="#576b95" stroke-width="1.5" stroke-linecap="round"/></svg>'
};

// ═══ 数据交互与接收 ═══
var phoneInitialized = false;
var appCache = {};

function requestAppData(appId) {
    if (appCache[appId]) return;
    appCache[appId] = 'loading';
    window.parent.postMessage({ type: 'PHONE_INTERACT', action: 'load_app', app: appId }, '*');
}

window.addEventListener('message', function(e) {
    if (!e.data) return;

    if (e.data.type === 'PHONE_INIT') {
        if(typeof wxData !== 'undefined') { wxData.chats=[]; wxData.conversations={}; wxData.moments=[]; }
        if(typeof wbData !== 'undefined') { wbData.feed=[]; wbData.hotSearch=[]; }
        if(typeof dbData !== 'undefined') { dbData.posts={art:[],observe:[],emoji:[]}; dbData.discussing=[]; }
        if(typeof xhsData !== 'undefined') { xhsData.notes=[]; }
        if(typeof dyData !== 'undefined') { dyData.videos=[]; }
        if(typeof biliData !== 'undefined') { biliData.videos=[]; }
        if(typeof imData !== 'undefined') { imData.chats=[]; }
        appCache = {};
        phoneInitialized = true;
        refreshCurrentView();
        return;
    }

    if (e.data.type === 'PHONE_DATA' && e.data.data) {
        var data = e.data.data;
        if (data.badges) {
            var badgeMap = {wechat:'badge-wechat',weibo:'badge-weibo',douyin:'badge-douyin',redbook:'badge-redbook',bilibili:'badge-bilibili',douban:'badge-douban',imessage:'badge-imessage'};
            Object.keys(data.badges).forEach(function(k) {
                var el = document.getElementById(badgeMap[k]);
                if (el) { el.textContent = data.badges[k]; el.style.display = data.badges[k]>0 ? 'flex' : 'none'; }
            });
        }
        if (data.notifications && document.querySelector('.lock-notifications')) {
            document.querySelector('.lock-notifications').innerHTML = '';
            data.notifications.forEach(function(n) {
                var colors = {微信:'#07c160',微博:'#ff5722',抖音:'#010101',小红书:'#fe2c55',bilibili:'#00a1d6',豆瓣:'#2fbd59'};
                var div = document.createElement('div'); div.className = 'lock-notif';
                div.innerHTML = '<div class="lock-notif-icon" style="background:'+(colors[n.app]||'#999')+'"></div><div class="lock-notif-body"><div class="lock-notif-header"><span class="lock-notif-app">'+n.app+'</span><span class="lock-notif-time">刚刚</span></div><div class="lock-notif-text">'+n.preview+'</div></div>';
                document.querySelector('.lock-notifications').insertBefore(div, document.querySelector('.lock-notifications').firstChild);
            });
        }
        return;
    }

    if (e.data.type === 'PHONE_APP_DATA') {
        try {
            var jsonStr = e.data.content.match(/\[[\s\S]*\]/);
            if (!jsonStr) return;
            var items = JSON.parse(jsonStr[0]);
            var app = e.data.app;
            appCache[app] = 'loaded';

            if (app === 'weibo' && typeof wbData !== 'undefined') { items.forEach(p => wbData.feed.unshift(p)); wbNav('feed'); }
            else if (app === 'weibo_hotsearch' && typeof wbData !== 'undefined') { wbData.hotSearch = items.map(h => ({text:h.text||h.title, tag:h.tag||'热', count:h.count||''})); wbNav('hotsearch'); }
            else if (app === 'douyin' && typeof dyData !== 'undefined') { items.forEach(v => dyData.videos.unshift(v)); dyNav('feed'); }
            else if (app === 'redbook' && typeof xhsData !== 'undefined') { items.forEach(n => xhsData.notes.unshift(n)); xhsNav('feed'); }
            else if (app === 'bilibili' && typeof biliData !== 'undefined') { items.forEach(v => biliData.videos.unshift(v)); biliNav('home'); }
            else if (app === 'douban' && typeof dbData !== 'undefined') { items.forEach(p => { var g = p.groupId||'art'; if(!dbData.posts[g]) dbData.posts[g]=[]; dbData.posts[g].unshift(p); }); dbNav('group'); }
        } catch(err) { console.error('解析失败', err); }
        return;
    }

    if (e.data.type === 'PHONE_REPLY' && e.data.action === 'wechat_reply') {
        if(typeof wxData !== 'undefined' && wxData.conversations[e.data.chatId]) {
            var msgs = wxData.conversations[e.data.chatId];
            e.data.replies.forEach(t => msgs.push({isSelf:false, sender:e.data.chatName, color:'#4a90d9', message:t}));
            if(typeof wxNav === 'function') wxNav('conversation', e.data.chatId);
        }
    }
});

function refreshCurrentView() {
    var activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;
    var id = activeScreen.id;
    if (id === 'screen-wechat' && typeof wxNav === 'function') wxNav(wxData.currentView);
    else if (id === 'screen-weibo' && typeof wbNav === 'function') wbNav(wbData.currentView);
    else if (id === 'screen-douban' && typeof dbNav === 'function') dbNav(dbData.currentView);
    else if (id === 'screen-redbook' && typeof xhsNav === 'function') xhsNav(xhsData.currentView);
    else if (id === 'screen-douyin' && typeof dyNav === 'function') dyNav(dyData.currentView);
    else if (id === 'screen-bilibili' && typeof biliNav === 'function') biliNav(biliData.currentView);
}