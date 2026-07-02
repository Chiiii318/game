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

// 游戏时间自动走：每30秒游戏内过1分钟
// 每月天数(含闰年判断)
function daysInMonth(year, month) {
    if (month === 2) {
        var leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        return leap ? 29 : 28;
    }
    return [31,28,31,30,31,30,31,31,30,31,30,31][month - 1];
}

var WEEKDAYS = ['周日','周一','周二','周三','周四','周五','周六'];

// 前进一天,同时处理月/年进位和星期
function advanceOneDay() {
    gameTime.day++;
    if (gameTime.day > daysInMonth(gameTime.year, gameTime.month)) {
        gameTime.day = 1;
        gameTime.month++;
        if (gameTime.month > 12) { gameTime.month = 1; gameTime.year++; }
    }
    // 星期跟着走
    var idx = WEEKDAYS.indexOf(gameTime.weekday);
    if (idx >= 0) gameTime.weekday = WEEKDAYS[(idx + 1) % 7];
}

setInterval(function() {
    gameTime.minute++;
    if (gameTime.minute >= 60) { gameTime.minute = 0; gameTime.hour++; }
    if (gameTime.hour >= 24) { gameTime.hour = 0; advanceOneDay(); }
    updateTimeDisplay();
}, 30000);

function formatChatTime(ts) {
    if(!ts) return "";
    if(typeof ts === 'string') return ts;
    if(ts.hour === undefined || ts.minute === undefined) return "刚刚";
    var time = String(ts.hour).padStart(2,'0') + ':' + String(ts.minute).padStart(2,'0');
    if (ts.daysAgo === 0) return time;
    if (ts.daysAgo === 1) return '昨天 ' + time;
    // 跨月修复：日期不能为负数
    var displayDay = gameTime.day - (ts.daysAgo || 0);
    var displayMonth = gameTime.month;
    if (displayDay <= 0) { displayMonth--; if(displayMonth<=0) displayMonth=12; displayDay += 30; }
    return displayMonth + '/' + displayDay + ' ' + time;
}
// iMessage 数据规范化：补齐列表页和聊天页都需要的字段
function normalizeImChat(m) {
    m = m || {};
    return {
        id:      m.id || ('im_' + Date.now() + '_' + Math.random().toString(36).slice(2,6)),
        name:    m.name || '未知号码',
        avatar:  m.avatar || '',
        color:   m.color || '#8e8e93',
        lastMsg: m.lastMsg || (m.msgs && m.msgs.length ? (m.msgs[m.msgs.length-1].text || '') : ''),
        time:    m.time || '刚刚',
        unread:  m.unread || 0,
        sortKey: m.sortKey || Date.now(),
        msgs:    Array.isArray(m.msgs) ? m.msgs : []
    };
}

// iMessage 数据合并写入：同 id 更新，新 id 追加
function mergeImChats(items) {
    items.forEach(function(m) {
        var norm = normalizeImChat(m);
        var existing = imData.chats.find(function(c){ return c.id === norm.id; });
        if (existing) {
            existing.lastMsg = norm.lastMsg;
            existing.time = norm.time;
            existing.unread = norm.unread;
            if (norm.msgs.length) existing.msgs = norm.msgs;
        } else {
            imData.chats.push(norm);
        }
    });
    var active = document.querySelector('.screen.active');
    if (active && active.id === 'screen-imessage' && typeof imNav === 'function') imNav('list');
}


// ═══ 导航 ═══
function setStatusbarMode(m) { document.getElementById('statusbar').className = 'statusbar ' + m; }
function setHomeBarMode(m) { var el = document.getElementById('home-bar'); el.className = 'home-bar ' + m; el.style.display = m === 'hidden' ? 'none' : 'block'; }
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
    else console.warn('showScreen: 找不到屏幕 ' + id);
}
function unlockPhone() { showScreen('screen-home'); setStatusbarMode('light'); setHomeBarMode('hidden'); }
// 锁屏上滑解锁手势
(function(){
    var startY = 0, lockEl = null;
    document.addEventListener('touchstart', function(e){
        lockEl = document.getElementById('screen-lock');
        if(!lockEl || !lockEl.classList.contains('active')) { lockEl=null; return; }
        startY = e.touches[0].clientY;
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
        if(!lockEl) return;
        var diff = startY - e.touches[0].clientY;
        if(diff > 0) {
            lockEl.style.transform = 'translateY('+ (-diff) +'px)';
            lockEl.style.opacity = Math.max(0, 1 - diff/300);
        }
    }, {passive:true});
    document.addEventListener('touchend', function(e){
        if(!lockEl) return;
        var diff = startY - e.changedTouches[0].clientY;
        if(diff > 80) {
            lockEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            lockEl.style.transform = 'translateY(-100%)';
            lockEl.style.opacity = '0';
            setTimeout(function(){ unlockPhone(); lockEl.style=''; }, 300);
        } else {
            lockEl.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            lockEl.style.transform = '';
            lockEl.style.opacity = '';
            setTimeout(function(){ lockEl.style.transition=''; }, 300);
        }
        lockEl = null;
    }, {passive:true});
})();
function goDesktop() { showScreen('screen-home'); setStatusbarMode('light'); setHomeBarMode('hidden'); }

// ═══ 桌面横向翻页手势 ═══
(function(){
    var startX=0, currentPage=0, totalPages=2, pagesEl=null;
    var homeContent = null;

    function getPages(){ return document.querySelector('.home-pages'); }
    function getDots(){ return document.querySelectorAll('.home-page-dots .dot'); }

    function setPage(idx){
        currentPage = Math.max(0, Math.min(totalPages-1, idx));
        var el = getPages();
        if(el) el.style.transform = 'translateX(-'+(currentPage*50)+'%)';
        getDots().forEach(function(d,i){ d.classList.toggle('active', i===currentPage); });
    }

    document.addEventListener('touchstart', function(e){
        var home = document.getElementById('screen-home');
        if(!home || !home.classList.contains('active')) { homeContent=null; return; }
        homeContent = home;
        pagesEl = getPages();
        startX = e.touches[0].clientX;
    }, {passive:true});

    document.addEventListener('touchend', function(e){
        if(!homeContent || !pagesEl) return;
        var dx = e.changedTouches[0].clientX - startX;
        if(dx < -50) setPage(currentPage+1);
        else if(dx > 50) setPage(currentPage-1);
        homeContent = null;
    }, {passive:true});
})();

function openApp(id) {
    var badgeEl = document.getElementById('badge-' + id);
    if (badgeEl) { badgeEl.textContent = '0'; badgeEl.style.display = 'none'; }
    // ★ Tab记忆：把当前打开的App回传父页面存进 gameState.lastPhoneApp
    window.parent.postMessage({ type: 'PHONE_APP_OPENED', app: id }, '*');

    if (id === 'wechat') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-wechat'); if(typeof wxNav === 'function') wxNav('chatlist'); }
    else if (id === 'weibo') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-weibo'); if(typeof wbNav === 'function') wbNav('home'); }
    else if (id === 'douban') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-douban'); if(typeof dbNav === 'function') dbNav('home'); }
    else if (id === 'redbook') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-redbook'); if(typeof xhsNav === 'function') xhsNav('home'); }
    else if (id === 'douyin') { setStatusbarMode('light'); setHomeBarMode('light'); showScreen('screen-douyin'); if(typeof dyNav === 'function') dyNav('feed'); }
    else if (id === 'bilibili') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-bilibili'); if(typeof biliNav === 'function') biliNav('home'); }
    else if (id === 'tfamily') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-tfamily'); if(typeof tfNav === 'function') tfNav('home'); }
    else if (id === 'imessage') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-imessage'); if(typeof imNav === 'function') imNav('list'); else showPlaceholder('screen-imessage','iMessage'); }
    else if (id === 'album') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-album'); if(typeof openAlbum === 'function') openAlbum(); else showPlaceholder('screen-album','相册'); }
    else if (id === 'phone') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-phone'); if(typeof openPhoneApp === 'function') openPhoneApp(); else showPlaceholder('screen-phone','电话'); }
    else if (id === 'notes') { setStatusbarMode('dark'); setHomeBarMode('dark'); showScreen('screen-notes'); if(typeof openNotes === 'function') openNotes(); else showPlaceholder('screen-notes','备忘录'); }
    else { showScreen('screen-home'); alert(id + ' 功能开发中'); }
}

function showPlaceholder(screenId, appName) {
    var el = document.getElementById(screenId);
    if (el && !el.innerHTML.trim()) {
        el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#999;font-size:14px;gap:12px;"><div style="color:#ccc;"><svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div>' + appName + ' 功能开发中</div><div style="font-size:12px;color:#ccc;">后续版本更新</div><div style="margin-top:20px;padding:8px 20px;background:#f0f0f0;border-radius:18px;font-size:13px;color:#666;cursor:pointer;" onclick="goDesktop()">返回桌面</div></div>';
    }
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
    // 如果已经由剧情自动推送过数据，不再请求（省 token）
    if (appCache[appId] === 'loaded') return;
    // 检查本地数据源是否已有内容
    if (appId === 'wechat' && typeof wxData !== 'undefined' && wxData.chats && wxData.chats.length > 0) { appCache[appId] = 'loaded'; return; }
    if (appId === 'weibo' && typeof wbData !== 'undefined' && wbData.feed && wbData.feed.length > 0) { appCache[appId] = 'loaded'; return; }
    if (appId === 'douyin' && typeof dyData !== 'undefined' && dyData.videos && dyData.videos.length > 0) { appCache[appId] = 'loaded'; return; }
    if (appId === 'redbook' && typeof xhsData !== 'undefined' && xhsData.notes && xhsData.notes.length > 0) { appCache[appId] = 'loaded'; return; }
    if (appId === 'bilibili' && typeof biliData !== 'undefined' && biliData.videos && biliData.videos.length > 0) { appCache[appId] = 'loaded'; return; }
    if (appId === 'douban' && typeof dbData !== 'undefined' && dbData.posts && (dbData.posts.art.length > 0 || dbData.posts.observe.length > 0)) { appCache[appId] = 'loaded'; return; }
    if (appId === 'tfamily' && typeof tfData !== 'undefined' && tfData.feed && tfData.feed.length > 0) { appCache[appId] = 'loaded'; return; }
    // 本地没数据，去请求 AI 生成（花 token）
    if (appCache[appId] === 'loading') return;
    appCache[appId] = 'loading';
    window.parent.postMessage({ type: 'PHONE_INTERACT', action: 'load_app', app: appId }, '*');
}

window.addEventListener('message', function(e) {
    if (!e.data) return;

    // ★ 收到父页面初始化消息，更新玩家姓名
    if (e.data.type === 'PHONE_INIT') {
        if (e.data.playerName) playerName = e.data.playerName;
        return;
    }

    if (e.data.type === 'PHONE_STORE_SYNC' && e.data.store) {

    var s = e.data.store;
    // 微信：整份用全局仓库覆盖（全局仓库才是唯一真相）
    if (typeof wxData !== 'undefined' && s.wechat) {
        wxData.chats = s.wechat.chats || [];
        wxData.conversations = s.wechat.conversations || {};
        wxData.moments = s.wechat.moments || [];
                // ★ 用聊天列表反推通讯录分组
        wxData.contacts = [];
        (wxData.chats || []).forEach(function(c) {
            if (c.isGroup) return;
            var first = (c.name || '#')[0];
            var letter = '#';
            if (/[a-zA-Z]/.test(first)) letter = first.toUpperCase();
            else if (/[\u4e00-\u9fff]/.test(first)) letter = first;
            var group = wxData.contacts.find(function(g) { return g.letter === letter; });
            if (!group) { group = { letter: letter, items: [] }; wxData.contacts.push(group); }
            if (!group.items.some(function(x){ return x.id === c.id; })) {
                group.items.push({ id: c.id, name: c.name, avatar: c.avatar || c.name[0], color: c.color || '#4a90d9' });
            }
        });
    }
    if (typeof wbData !== 'undefined')  wbData.feed  = s.weibo   || [];
    if (typeof dyData !== 'undefined')  dyData.videos = s.douyin || [];
    if (typeof xhsData !== 'undefined') xhsData.notes = s.redbook|| [];
    if (typeof biliData !== 'undefined')biliData.videos = s.bilibili || [];
    if (typeof tfData !== 'undefined')  tfData.feed  = s.tfamily || [];
    if (typeof imData !== 'undefined')  imData.chats = s.imessage|| [];
    if (typeof dbData !== 'undefined' && s.douban) dbData.posts = Object.assign({art:[],observe:[],emoji:[]}, s.douban);
    phoneInitialized = true;
    refreshCurrentView();
    return;
}

// ★ 切回手机Tab时，自动停留在上次打开的App（Tab记忆逻辑）
if (e.data.type === 'PHONE_RESTORE') {
    var app = e.data.app || 'wechat';
    if (typeof openApp === 'function') { unlockPhone(); openApp(app); }
    return;
}

        if (e.data.type === 'PHONE_DATA' && e.data.data) {
        var data = e.data.data;
        if (data.badges) {
            var badgeMap = {wechat:'badge-wechat',weibo:'badge-weibo',douyin:'badge-douyin',redbook:'badge-redbook',bilibili:'badge-bilibili',douban:'badge-douban',imessage:'badge-imessage',tfamily:'badge-tfamily'};
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

        // ★★★ 新增：如果 PHONE_DATA 里带有 app_data，直接填充到本地数据源 ★★★
        if (data.app_data) {
            Object.keys(data.app_data).forEach(function(appId) {
                var items = data.app_data[appId];
                if (!items || !Array.isArray(items) || items.length === 0) return;
                appCache[appId] = 'loaded';

                                               if (appId === 'wechat' && typeof wxData !== 'undefined') {
                    items.forEach(function(chat) {
                        if (chat.chatId && chat.messages) {
                            var existing = wxData.chats.find(function(c) { return c.id === chat.chatId; });
                            if (!existing) {
                                wxData.chats.push({ id: chat.chatId, name: chat.chatName || chat.chatId, avatar: (chat.chatName||chat.chatId)[0], color: chat.color || '#4a90d9', lastMsg: chat.messages[chat.messages.length-1].message || '', time: '刚刚' });
                            } else {
                                existing.lastMsg = chat.messages[chat.messages.length-1].message || '';
                                existing.time = '刚刚';
                            }
                            if (!wxData.conversations[chat.chatId]) wxData.conversations[chat.chatId] = [];
                            var convArr = wxData.conversations[chat.chatId];
                            chat.messages.forEach(function(msg) {
    // ★ 跟整段历史比，防止AI重复输出之前的消息
    var isDup = convArr.some(function(existing) {
        return existing.message === msg.message && existing.sender === msg.sender && existing.isSelf === msg.isSelf;
    });
    if (!isDup) convArr.push(msg);
});
                            // ★ 同步到通讯录（去重）
                            if (!chat.isGroup) {
                                var contactExists = false;
                                wxData.contacts.forEach(function(g) {
                                    (g.items || []).forEach(function(c) { if (c.id === chat.chatId) contactExists = true; });
                                });
                                if (!contactExists) {
                                    var cName = chat.chatName || chat.chatId;
                                    var letter = '#';
                                    var first = cName[0];
                                    if (/[a-zA-Z]/.test(first)) letter = first.toUpperCase();
                                    else if (/[\u4e00-\u9fff]/.test(first)) letter = first;
                                    var group = wxData.contacts.find(function(g) { return g.letter === letter; });
                                    if (!group) { group = { letter: letter, items: [] }; wxData.contacts.push(group); }
                                    group.items.push({ id: chat.chatId, name: cName, avatar: cName[0], color: chat.color || '#4a90d9' });
                                }
                            }
                        }
                    });
                }

                else if (appId === 'weibo' && typeof wbData !== 'undefined') {
    items.forEach(function(p) {
        // ★ 去重：按 content+author 判断是否已存在
        var isDup = wbData.feed.some(function(existing) {
            return (existing.content || existing.text) === (p.content || p.text) && (existing.author || existing.name) === (p.author || p.name);
        });
        if (!isDup) wbData.feed.unshift(p);
    });
}

                else if (appId === 'douyin' && typeof dyData !== 'undefined') { items.forEach(function(v) { var isDup = dyData.videos.some(function(existing) { return (existing.desc || existing.title) === (v.desc || v.title) && (existing.author || existing.name) === (v.author || v.name); }); if (!isDup) dyData.videos.unshift(v); }); }
                else if (appId === 'redbook' && typeof xhsData !== 'undefined') { items.forEach(function(n) { var isDup = xhsData.notes.some(function(existing) { return (existing.title || existing.content) === (n.title || n.content) && (existing.author || existing.name) === (n.author || n.name); }); if (!isDup) xhsData.notes.unshift(n); }); }
                else if (appId === 'bilibili' && typeof biliData !== 'undefined') { items.forEach(function(v) { var isDup = biliData.videos.some(function(existing) { return existing.title === v.title && (existing.up || existing.author) === (v.up || v.author); }); if (!isDup) biliData.videos.unshift(v); }); }
                else if (appId === 'douban' && typeof dbData !== 'undefined') { items.forEach(function(p) { var g = p.groupId||'art'; if(!dbData.posts[g]) dbData.posts[g]=[]; var isDup = dbData.posts[g].some(function(existing) { return existing.title === p.title && (existing.author || existing.name) === (p.author || p.name); }); if (!isDup) dbData.posts[g].unshift(p); }); }
                else if (appId === 'tfamily' && typeof tfData !== 'undefined') { if(!tfData.feed) tfData.feed=[]; items.forEach(function(p) { var isDup = tfData.feed.some(function(existing) { return (existing.text || existing.content) === (p.text || p.content) && (existing.name || existing.author) === (p.name || p.author); }); if (!isDup) tfData.feed.unshift(p); }); }
                else if (appId === 'imessage' && typeof imData !== 'undefined') { mergeImChats(items); }
            });

            // ★ 处理玩家微博账号列表（weibo_accounts 不是数组里的普通 appId，单独处理）
            if (data.app_data.weibo_accounts && typeof wbData !== 'undefined') {
                var accs = data.app_data.weibo_accounts;
                if (Array.isArray(accs)) {
                    accs.forEach(function(acc) {
                        if (typeof wbAddPlayerAccount === 'function') wbAddPlayerAccount(acc);
                    });
                }
            }
            // ★ 处理玩家微博主页资料
            if (data.app_data.weibo_profile && typeof wbData !== 'undefined') {
                wbData.playerProfile = Object.assign(wbData.playerProfile || {}, data.app_data.weibo_profile);
            }

            // ★ 数据写入后刷新当前正在看的视图，解决"永远刷新中"
            refreshCurrentView();
        }
        return;
    }

       if (e.data.type === 'PHONE_APP_DATA') {
    try {
        var items;
        if (Array.isArray(e.data.payload)) {
            items = e.data.payload;
        } else {
            var raw = e.data.payload || e.data.content || '';
            if (typeof raw === 'string') {
                var jsonStr = raw.match(/\[[\s\S]*\]/);
                if (!jsonStr) return;
                items = JSON.parse(jsonStr[0]);
            } else {
                items = raw;
            }
        }
        if (!items || items.length === 0) return;
        var app = e.data.app;
        appCache[app] = 'loaded';

        // ★ 微信：写入聊天列表和对话详情
                if (app === 'wechat' && typeof wxData !== 'undefined') {
            items.forEach(function(chat) {
                if (chat.chatId && chat.messages) {
                    var existing = wxData.chats.find(function(c) { return c.id === chat.chatId; });
                    if (!existing) {
                        wxData.chats.push({ id: chat.chatId, name: chat.chatName || chat.chatId, lastMsg: chat.messages[chat.messages.length-1].message || '', time: '刚刚' });
                    } else {
                        existing.lastMsg = chat.messages[chat.messages.length-1].message || '';
                        existing.time = '刚刚';
                    }
                    if (!wxData.conversations[chat.chatId]) wxData.conversations[chat.chatId] = [];
                    var convArr = wxData.conversations[chat.chatId];
                                        chat.messages.forEach(function(msg) {
                        var isDup = convArr.some(function(existing) {
                            return existing.message === msg.message && existing.sender === msg.sender && existing.isSelf === msg.isSelf;
                        });
                        if (!isDup) convArr.push(msg);
                    });
                    // ★ 同步到通讯录（去重）
                    if (!chat.isGroup) {
                        var contactExists = false;
                        wxData.contacts.forEach(function(g) {
                            (g.items || []).forEach(function(c) { if (c.id === chat.chatId) contactExists = true; });
                        });
                        if (!contactExists) {
                            var cName = chat.chatName || chat.chatId;
                            var letter = '#';
                            var first = cName[0];
                            if (/[a-zA-Z]/.test(first)) letter = first.toUpperCase();
                            else if (/[\u4e00-\u9fff]/.test(first)) letter = first;
                            var group = wxData.contacts.find(function(g) { return g.letter === letter; });
                            if (!group) { group = { letter: letter, items: [] }; wxData.contacts.push(group); }
                            group.items.push({ id: chat.chatId, name: cName, avatar: cName[0], color: chat.color || '#4a90d9' });
                        }
                    }
                }
            });
            // 如果当前正在看微信，刷新视图
            var activeWx = document.querySelector('.screen.active');
            if (activeWx && activeWx.id === 'screen-wechat' && typeof wxNav === 'function') wxNav(wxData.currentView || 'chatlist');
        }
        // ★ 微博
                else if (app === 'weibo' && typeof wbData !== 'undefined') {
    items.forEach(function(p) {
        var isDup = wbData.feed.some(function(existing) {
            return (existing.content || existing.text) === (p.content || p.text) && (existing.author || existing.name) === (p.author || p.name);
        });
        if (!isDup) wbData.feed.unshift(p);
    });
    var activeWb = document.querySelector('.screen.active');
    if (activeWb && activeWb.id === 'screen-weibo' && typeof wbNav === 'function') wbNav('home');
}

        else if (app === 'weibo_hotsearch' && typeof wbData !== 'undefined') {
            wbData.hotSearch = items.map(function(h) { return {text:h.text||h.title, tag:h.tag||'热', count:h.count||''}; });
        }
        // ★ 抖音
        else if (app === 'douyin' && typeof dyData !== 'undefined') {
    items.forEach(function(v) { var isDup = dyData.videos.some(function(existing) { return (existing.desc || existing.title) === (v.desc || v.title) && (existing.author || existing.name) === (v.author || v.name); }); if (!isDup) dyData.videos.unshift(v); });
            var activeDy = document.querySelector('.screen.active');
            if (activeDy && activeDy.id === 'screen-douyin' && typeof dyNav === 'function') dyNav('feed');
        }
        // ★ 小红书
            else if (app === 'redbook' && typeof xhsData !== 'undefined') {
    items.forEach(function(n) { var isDup = xhsData.notes.some(function(existing) { return (existing.title || existing.content) === (n.title || n.content) && (existing.author || existing.name) === (n.author || n.name); }); if (!isDup) xhsData.notes.unshift(n); });
            var activeXhs = document.querySelector('.screen.active');
            if (activeXhs && activeXhs.id === 'screen-redbook' && typeof xhsNav === 'function') xhsNav('home');
        }
        
        // ★ B站
        else if (app === 'bilibili' && typeof biliData !== 'undefined') {
    items.forEach(function(v) { var isDup = biliData.videos.some(function(existing) { return existing.title === v.title && (existing.up || existing.author) === (v.up || v.author); }); if (!isDup) biliData.videos.unshift(v); });
            var activeBili = document.querySelector('.screen.active');
            if (activeBili && activeBili.id === 'screen-bilibili' && typeof biliNav === 'function') biliNav('home');
        }
        // ★ 豆瓣
        else if (app === 'douban' && typeof dbData !== 'undefined') {
    items.forEach(function(p) { var g = p.groupId||'art'; if(!dbData.posts[g]) dbData.posts[g]=[]; var isDup = dbData.posts[g].some(function(existing) { return existing.title === p.title && (existing.author || existing.name) === (p.author || p.name); }); if (!isDup) dbData.posts[g].unshift(p); });
            var activeDb = document.querySelector('.screen.active');
            if (activeDb && activeDb.id === 'screen-douban' && typeof dbNav === 'function') dbNav('group');
        }
        // ★ TFamily
        else if (app === 'tfamily' && typeof tfData !== 'undefined') {
            if (!tfData.feed) tfData.feed = [];
            items.forEach(function(p) { var isDup = tfData.feed.some(function(existing) { return (existing.text || existing.content) === (p.text || p.content) && (existing.name || existing.author) === (p.name || p.author); }); if (!isDup) tfData.feed.unshift(p); });
            var activeTf = document.querySelector('.screen.active');
            if (activeTf && activeTf.id === 'screen-tfamily' && typeof tfNav === 'function') tfNav('home');
        }

// ★ iMessage
else if (app === 'imessage' && typeof imData !== 'undefined') {
    mergeImChats(items);
}

    } catch(err) { console.error('PHONE_APP_DATA 解析失败', err); }
    return;
    }


           if (e.data.type === 'PHONE_REPLY') {
        if(typeof wxData !== 'undefined' && wxData.conversations[e.data.chatId]) {
            var msgs = wxData.conversations[e.data.chatId];
            // 移除 typing 气泡
            for (var i = msgs.length - 1; i >= 0; i--) {
                if (msgs[i].type === 'typing') { msgs.splice(i, 1); break; }
            }
            e.data.replies.forEach(function(t) { msgs.push({isSelf:false, sender:e.data.chatName, color:'#4a90d9', message:t}); });
            // 更新聊天列表最后一条
            var chat = wxData.chats.find(function(c){ return c.id === e.data.chatId; });
            if (chat) { chat.lastMsg = e.data.replies[e.data.replies.length-1] || ''; chat.time = '刚刚'; }
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

// ═══ 统一的"返回上一级"逻辑 ═══
// 根据当前所在 App 及其内部视图，决定返回到二级页面还是退回桌面
function goBack() {
    var active = document.querySelector('.screen.active');
    if (!active) return goDesktop();
    var id = active.id;

    // 微信：对话页 → 聊天列表
    if (id === 'screen-wechat' && typeof wxData !== 'undefined') {
        if (wxData.currentView === 'conversation') { if(typeof wxNav==='function') wxNav('chatlist'); return; }
    }
    // iMessage：聊天页 → 信息列表
    if (id === 'screen-imessage' && typeof imData !== 'undefined') {
        if (imData.currentView === 'chat') { if(typeof imNav==='function') imNav('list'); return; }
    }
    // TODO: 其他 App 若有二级页面，按同样模式在此补充分支
    // 例如豆瓣帖子详情、微博正文页等，根据各自 xxxData.currentView 判断

    // 默认：已在 App 首页，退回桌面
    goDesktop();
}

// ═══ 通知主页面：手机 iframe 已加载完毕，可以接收消息了 ═══
// iOS 左边缘右滑返回手势
(function(){
    var startX=0, startY=0, swiping=false, currentScreen=null;
    document.addEventListener('touchstart', function(e){
        if(e.touches[0].clientX > 30) return; // 只在左边缘30px内触发
        var active = document.querySelector('.screen.active');
        if(!active || active.id==='screen-home' || active.id==='screen-lock') return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        swiping = true;
        currentScreen = active;
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
        if(!swiping) return;
        var dx = e.touches[0].clientX - startX;
        var dy = Math.abs(e.touches[0].clientY - startY);
        if(dy > dx) { swiping=false; currentScreen.style.transform=''; return; }
        if(dx > 0) currentScreen.style.transform = 'translateX('+dx+'px)';
    }, {passive:true});
    document.addEventListener('touchend', function(e){
        if(!swiping || !currentScreen) { swiping=false; return; }
        var dx = e.changedTouches[0].clientX - startX;
        var screenToReset = currentScreen; // 闭包保存引用，避免 setTimeout 里被置空
        if(dx > 100) {
            currentScreen.style.transition = 'transform 0.25s ease';
            currentScreen.style.transform = 'translateX(100%)';
            setTimeout(function(){
                screenToReset.removeAttribute('style'); // 规范写法，兼容 iOS Safari
                goBack();                               // 返回上一级，而非总是回桌面
            }, 250);
        } else {
            currentScreen.style.transition = 'transform 0.2s ease';
            currentScreen.style.transform = '';
            setTimeout(function(){ screenToReset.style.transition=''; }, 200);
        }
        swiping=false;
    }, {passive:true});
})();
// ═══ 手势：下拉刷新 ═══
(function(){
    var startY=0, pulling=false, target=null;
    document.addEventListener('touchstart', function(e){
        var active = document.querySelector('.screen.active');
        if(!active || active.id==='screen-home' || active.id==='screen-lock') return;
        var scrollEl = active.querySelector('.wx-body, .wb-body, .xhs-body, .db-body, .bili-body, .tf-body, .im-body');
        if(!scrollEl || scrollEl.scrollTop > 5) return;
        startY = e.touches[0].clientY;
        pulling = true;
        target = active;
    }, {passive:true});

    document.addEventListener('touchend', function(e){
        if(!pulling) return;
        pulling = false;
        var dy = e.changedTouches[0].clientY - startY;
        if(dy > 100 && target) {
            // 触发下拉刷新：重新请求当前 App 数据
            var appId = (target.id || '').replace('screen-','');
            if(appId && typeof requestAppData === 'function') {
                appCache[appId] = null; // 清除缓存标记以允许重新请求
                requestAppData(appId);
            }
        }
        target = null;
    }, {passive:true});
})();

// ═══ 手势：底部上滑退出 App ═══
(function(){
    var startY=0, swiping=false;
    document.addEventListener('touchstart', function(e){
        var active = document.querySelector('.screen.active');
        if(!active || active.id==='screen-home' || active.id==='screen-lock') return;
        var rect = document.querySelector('.phone').getBoundingClientRect();
        // 只在底部 30px 区域触发
        if(e.touches[0].clientY < rect.bottom - 30) return;
        startY = e.touches[0].clientY;
        swiping = true;
    }, {passive:true});

    document.addEventListener('touchend', function(e){
        if(!swiping) { return; }
        swiping = false;
        var dy = startY - e.changedTouches[0].clientY;
        if(dy > 80) goDesktop();
    }, {passive:true});
})();

// ═══ 手势：抖音上下滑切换视频 ═══
(function(){
    var startY=0, active=false;
    document.addEventListener('touchstart', function(e){
        var screen = document.getElementById('screen-douyin');
        if(!screen || !screen.classList.contains('active')) { active=false; return; }
        // 确保不在评论面板上操作
        if(e.target.closest && e.target.closest('.dy-comments-panel.show')) { active=false; return; }
        startY = e.touches[0].clientY;
        active = true;
    }, {passive:true});

    document.addEventListener('touchend', function(e){
        if(!active) return;
        active = false;
        var dy = startY - e.changedTouches[0].clientY;
        if(Math.abs(dy) < 60) return;
        // 上滑 = 下一个视频，下滑 = 上一个视频
        if(typeof dyData !== 'undefined' && typeof dyNav === 'function') {
            if(dy > 60) {
                // 下一个
                dyData.currentIndex = ((dyData.currentIndex || 0) + 1) % Math.max(1, (dyData.videos||[]).length);
            } else {
                // 上一个
                dyData.currentIndex = ((dyData.currentIndex || 0) - 1 + (dyData.videos||[]).length) % Math.max(1, (dyData.videos||[]).length);
            }
            dyNav('feed');
        }
    }, {passive:true});
})();

window.addEventListener('DOMContentLoaded', function() {
    window.parent.postMessage({ type: 'PHONE_READY' }, '*');
});