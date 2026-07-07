// ══════════════════════════════════════
// 微博客户端
// ══════════════════════════════════════
var wbData = {
    currentView: 'home',
    currentPostIdx: -1,
    currentDmId: null,
    hotSearch: [],
    feed: [],
    messages: [],
    dms: [],
    visitors: [],
    accounts: [],
    playerProfile: null,
    playerAccounts: []
};

// ★ 手机启动时，从父页面 gameState 提取玩家资料填充微博主页
function wbInitPlayerProfile() {
    var name = typeof playerName !== 'undefined' ? playerName : '玩家';
    var color = typeof playerColor !== 'undefined' ? playerColor : '#ff9eaa';
    try {
        var gs = window.parent.gameState;
        if (gs) {
            if (gs.playerName) name = gs.playerName;
            if (gs.playerColor) color = gs.playerColor;
        }
    } catch (e) { }

    if (!wbData.playerProfile) {
        wbData.playerProfile = {
            name: name, avatar: name[0], color: color,
            desc: '（主页简介会根据你的角色设定自动生成）',
            following: 128, followers: 0, postCount: 0
        };
    }
    if (!wbData.accounts || wbData.accounts.length === 0) {
        wbData.accounts = [{
            id: 'player_main', name: name, avatar: name[0], color: color,
            desc: '主账号', verified: false, following: 128, followers: 0, isPlayer: true
        }];
    }
    if (!wbData.playerAccounts || wbData.playerAccounts.length === 0) {
        wbData.playerAccounts = wbData.accounts.filter(function (a) { return a.isPlayer; });
    }
}

var WB_IC = {
    repost: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    comment: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    like: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    likeFilled: '<svg width="16" height="16" viewBox="0 0 24 24" fill="#ff6b2b" stroke="#ff6b2b" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    likeSm: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    avatar: '<svg width="28" height="28" viewBox="0 0 24 24" fill="#ddd" stroke="none"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
};

// ★ HTML转义：防止AI生成的内容包含<>等字符破坏DOM结构
function wbEsc(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ★ 对微博正文做转义后再高亮话题标签
function wbSafeContent(text) {
    if (!text) return '';
    var s = wbEsc(text);
    s = s.replace(/#([^#]+)#/g, '<span class="wb-topic">#$1#</span>');
    s = s.replace(/\n/g, '<br>');
    return s;
}

function wbFmtNum(n) { if (typeof n === 'string') return n; if (n >= 10000) return (n / 10000).toFixed(1).replace('.0', '') + '万'; return String(n || 0); }

function wbImgs(images) {
    if (!images || images.length === 0) return '';
    var cls = 'grid';
    if (images.length === 1) cls = 'single';
    else if (images.length === 2) cls = 'double';
    else if (images.length === 3) cls = 'triple';
    /* ★ fix: 用 wbEsc 转义 data-desc，用 event.currentTarget 避免 this 作用域问题 */
    return '<div class="wb-imgs ' + cls + '">' + images.map(function (img) {
        return '<div class="wb-img-item" data-desc="' + wbEsc(img) + '" onclick="wbImgPreview(event.currentTarget.dataset.desc)">' + img + '</div>';
    }).join('') + '</div>';
}

function wbNav(view, data) {
    if (!wbData._inited) { wbData._inited = true; wbInitPlayerProfile(); }
    wbData.currentView = view;

    /* ★ fix: 入口是 'home' 不是 'feed'；热搜入口是 'hot' 不是 'hotsearch' */
    if (view === 'home' && wbData.feed.length === 0 && typeof requestAppData === 'function') requestAppData('weibo');
    if (view === 'hot' && wbData.hotSearch.length === 0 && typeof requestAppData === 'function') requestAppData('weibo_hotsearch');

    var el = document.getElementById('screen-weibo');
    if (view === 'home') el.innerHTML = renderWbHome();
    else if (view === 'hot') el.innerHTML = renderWbHot();
    else if (view === 'detail') { wbData._detailFrom = wbData._prevView || 'home'; wbData.currentPostIdx = data; wbData._cmtShowCount = 5; el.innerHTML = renderWbDetail(); }
    else if (view === 'search') el.innerHTML = renderWbSearch();
    else if (view === 'messages') el.innerHTML = renderWbMessages();
    else if (view === 'dmlist') el.innerHTML = renderWbDmList();
    else if (view === 'dm') { wbData.currentDmId = data; el.innerHTML = renderWbDm(); }
    else if (view === 'profile') el.innerHTML = renderWbProfile(data);
    else if (view === 'visitors') el.innerHTML = renderWbVisitors();
    else if (view === 'publish') el.innerHTML = renderWbPublish();
    else if (view === 'searchresult') el.innerHTML = renderWbSearchResult();
    else if (view === 'account') { wbData._currentAccountId = data; el.innerHTML = renderWbAccount(data); }
    else if (view === 'accountSwitch') { el.innerHTML = renderWbAccountSwitch(); }
    wbData._prevView = view;
}

function renderWbHome() {
    if (!wbData.feed || wbData.feed.length === 0)
        return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left">' + IC.back + '</div><div class="wb-navbar-tabs"><span class="wb-nav-tab" onclick="wbNav(\'home\')">关注</span><span class="wb-nav-tab active" onclick="wbNav(\'hot\')">热搜</span><span class="wb-nav-tab">推荐</span></div><div class="wb-navbar-right"><span class="wb-navbar-btn" onclick="wbNav(\'search\')">' + WB_IC.search + '</span></div></div><div class="wb-body" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">刷新动态中...</div>' + renderWbTabbar('home') + '</div>';

    var feedHTML = wbData.feed.map(function (p, i) {
        var displayName = wbEsc(p.name || p.author || '网友');
        var safeAvatar = wbEsc(p.avatar || (p.name || p.author || '网')[0]);
        var safeTime = wbEsc(p.time || '刚刚');
        var cmtCount = Array.isArray(p.comments) ? p.comments.length : (p.commentCount || 0);
        return '<div class="wb-post" onclick="wbNav(\'detail\',' + i + ')"><div class="wb-post-header"><div class="wb-post-avatar placeholder" style="background:' + (p.color || '#ccc') + '"><span style="color:#fff;font-size:13px;">' + safeAvatar + '</span></div><div class="wb-post-info"><div class="wb-post-name">' + displayName + (p.verified ? '<span class="wb-post-vip"></span>' : '') + '</div><div class="wb-post-meta">' + safeTime + '</div></div></div><div class="wb-post-content">' + wbSafeContent(p.text || p.content || '') + '</div>' + wbImgs(p.imgs || []) + '<div class="wb-post-actions"><button class="wb-action-btn" onclick="event.stopPropagation()">' + WB_IC.repost + ' <span>' + wbFmtNum(p.reposts || p.shares || 0) + '</span></button><button class="wb-action-btn" onclick="event.stopPropagation()">' + WB_IC.comment + ' <span>' + cmtCount + '</span></button><button class="wb-action-btn' + (p.liked ? ' liked' : '') + '" onclick="event.stopPropagation();wbLike(' + i + ',this)">' + (p.liked ? WB_IC.likeFilled : WB_IC.like) + ' <span>' + wbFmtNum(p.likes || 0) + '</span></button></div></div>';
    }).join('');

    return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left">' + IC.back + '</div><div class="wb-navbar-tabs"><span class="wb-nav-tab active" onclick="wbNav(\'home\')">关注</span><span class="wb-nav-tab" onclick="wbNav(\'hot\')">热搜</span><span class="wb-nav-tab">推荐</span></div><div class="wb-navbar-right"><span class="wb-navbar-btn" onclick="wbNav(\'search\')">' + WB_IC.search + '</span></div></div><div class="wb-body">' + feedHTML + '</div>' + renderWbTabbar('home') + '</div>';
}

function renderWbHot() {
    if (!wbData.hotSearch || wbData.hotSearch.length === 0)
        return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left">' + IC.back + '</div><div class="wb-navbar-tabs"><span class="wb-nav-tab" onclick="wbNav(\'home\')">关注</span><span class="wb-nav-tab active" onclick="wbNav(\'hot\')">热搜</span><span class="wb-nav-tab">推荐</span></div></div><div class="wb-body" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">获取热搜中...</div>' + renderWbTabbar('home') + '</div>';

    var list = wbData.hotSearch.map(function (h, i) {
        var rc = i < 3 ? '' : ' normal';
        var safeTag = h.tag ? '<span class="wb-hot-tag">' + wbEsc(h.tag) + '</span>' : '';
        return '<div class="wb-hot-item" onclick="wbNav(\'search\')"><span class="wb-hot-rank' + rc + '">' + (i + 1) + '</span><span class="wb-hot-text">' + wbEsc(h.text || h.title) + '</span>' + safeTag + '<span class="wb-hot-count">' + wbEsc(h.count || '') + '</span></div>';
    }).join('');

    return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left">' + IC.back + '</div><div class="wb-navbar-tabs"><span class="wb-nav-tab" onclick="wbNav(\'home\')">关注</span><span class="wb-nav-tab active" onclick="wbNav(\'hot\')">热搜</span><span class="wb-nav-tab">推荐</span></div></div><div class="wb-body"><div class="wb-hot-list">' + list + '</div></div>' + renderWbTabbar('home') + '</div>';
}

function renderWbDetail() {
    var backTo = wbData._detailFrom || 'home';
    var p = wbData.feed[wbData.currentPostIdx];
    if (!p) return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">内容不存在</span></div></div>';

    /* ★ fix: 兼容 comments 为数字或数组 */
    var allCmts = Array.isArray(p.comments) ? p.comments : [];
    var showCount = wbData._cmtShowCount || 5;
    var visibleCmts = allCmts.slice(0, showCount);

    var cmts = visibleCmts.map(function (c) {
        return '<div class="wb-comment-item"><div class="wb-comment-avatar">' + WB_IC.avatar + '</div><div class="wb-comment-body"><div class="wb-comment-name">' + wbEsc(c.name || c.author) + '</div><div class="wb-comment-text">' + wbSafeContent(c.text || c.content) + '</div><div class="wb-comment-meta"><span>' + wbEsc(c.time || '刚刚') + '</span></div></div><div class="wb-comment-like">' + WB_IC.likeSm + '<span>' + (c.likes || 0) + '</span></div></div>';
    }).join('');

    /* ★ 评论加载更多按钮 */
    if (allCmts.length > showCount) {
        cmts += '<div onclick="wbLoadMoreComments()" style="text-align:center;padding:14px 0;font-size:13px;color:#ff6b2b;cursor:pointer;">展开更多评论 (剩余' + (allCmts.length - showCount) + '条)</div>';
    }

    /* ★ fix: 操作栏评论数用 allCmts.length，不再对可能是数字的 p.comments 取 .length */
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'' + backTo + '\')">' + IC.back + '</span><span class="wb-detail-title">正文</span></div><div class="wb-body"><div class="wb-post" style="margin-bottom:0"><div class="wb-post-header"><div class="wb-post-avatar placeholder" style="background:' + (p.color || '#ccc') + '"><span style="color:#fff;font-size:13px;">' + wbEsc(p.avatar || (p.name || p.author || '网')[0]) + '</span></div><div class="wb-post-info"><div class="wb-post-name">' + wbEsc(p.name || p.author) + (p.verified ? '<span class="wb-post-vip"></span>' : '') + '</div><div class="wb-post-meta">' + wbEsc(p.time || '刚刚') + '</div></div></div><div class="wb-post-content">' + wbSafeContent(p.text || p.content || '') + '</div>' + wbImgs(p.imgs || []) + '<div class="wb-post-actions"><button class="wb-action-btn">' + WB_IC.repost + ' <span>' + wbFmtNum(p.reposts || p.shares || 0) + '</span></button><button class="wb-action-btn">' + WB_IC.comment + ' <span>' + allCmts.length + '</span></button><button class="wb-action-btn' + (p.liked ? ' liked' : '') + '" onclick="wbLike(' + wbData.currentPostIdx + ',this)">' + (p.liked ? WB_IC.likeFilled : WB_IC.like) + ' <span>' + wbFmtNum(p.likes || 0) + '</span></button></div></div><div class="wb-comments-section"><div class="wb-comments-tabs"><span class="wb-comments-tab active">热门</span><span class="wb-comments-tab">最新</span></div>' + (cmts || '<div style="text-align:center;padding:30px 0;color:#ccc;font-size:13px;">暂无评论</div>') + '</div></div><div class="wb-comment-input"><input id="wb-cmt-input" placeholder="写评论..." /><button class="wb-comment-send" onclick="wbComment()">发送</button></div></div>';
}

function renderWbSearch() {
    var hots = (wbData.hotSearch || []).slice(0, 6).map(function (h) {
        return '<span class="wx-search-tag" onclick="document.getElementById(\'wb-search-input\').value=\'' + wbEsc(h.text || h.title) + '\';wbDoSearch()">' + wbEsc(h.text || h.title) + '</span>';
    }).join('');

    var accList = (wbData.accounts || []).slice(0, 3).map(function (a) {
        return '<div class="wb-dm-item" onclick="wbNav(\'account\',\'' + a.id + '\')"><div class="wb-dm-avatar" style="background:' + (a.color || '#ccc') + '">' + wbEsc(a.avatar) + '</div><div class="wb-dm-info"><div class="wb-dm-name">' + wbEsc(a.name) + '</div><div class="wb-dm-preview">' + wbEsc((a.desc || '').split('·')[0].trim()) + '</div></div><div class="wb-dm-time">' + (a.followers || 0) + '粉丝</div></div>';
    }).join('');

    return '<div class="weibo-container"><div class="wb-search-bar"><input id="wb-search-input" placeholder="搜索用户/微博" onkeydown="if(event.key===\'Enter\')wbDoSearch()" /><span class="wb-search-bar-cancel" onclick="wbNav(\'home\')">取消</span></div><div class="wb-body"><div style="padding:14px 16px;font-size:13px;color:#999;">推荐用户</div>' + (accList || '<div style="padding:14px 16px;color:#ccc;font-size:13px;">暂无数据</div>') + '<div style="padding:14px 16px;font-size:13px;color:#999;">大家都在搜</div><div style="padding:0 16px;display:flex;flex-wrap:wrap;gap:8px;">' + hots + '</div></div></div>';
}

function wbDoSearch() {
    var input = document.getElementById('wb-search-input');
    var query = input.value.trim();
    if (!query) return;
    var matchedAccounts = (wbData.accounts || []).filter(function (a) {
        return a.name.indexOf(query) !== -1 || (a.desc || '').indexOf(query) !== -1;
    });
    var matchedPosts = (wbData.feed || []).filter(function (p) {
        return (p.text || p.content || '').indexOf(query) !== -1 || (p.name || p.author || '').indexOf(query) !== -1;
    });
    wbData._searchResults = { query: query, accounts: matchedAccounts, posts: matchedPosts };
    wbNav('searchresult');
}

function renderWbSearchResult() {
    var r = wbData._searchResults || { query: '', accounts: [], posts: [] };
    var accHTML = '';
    if (r.accounts.length > 0) {
        accHTML = '<div style="padding:12px 16px;font-size:13px;color:#999;">用户</div>' + r.accounts.map(function (a) {
            var vBadge = a.verified ? '<span class="wb-post-vip"></span>' : '';
            return '<div class="wb-dm-item" onclick="wbNav(\'account\',\'' + a.id + '\')"><div class="wb-dm-avatar" style="background:' + (a.color || '#ccc') + '">' + wbEsc(a.avatar) + '</div><div class="wb-dm-info"><div class="wb-dm-name">' + wbEsc(a.name) + vBadge + '</div><div class="wb-dm-preview">' + wbEsc(a.desc) + '</div></div><div style="font-size:12px;color:#ff6b2b;cursor:pointer;">关注</div></div>';
        }).join('');
    }
    var postHTML = '';
    if (r.posts.length > 0) {
        postHTML = '<div style="padding:12px 16px;font-size:13px;color:#999;">相关微博</div>' + r.posts.map(function (p) {
            /* ★ fix: 用 findIndex 按内容匹配，避免引用丢失返回 -1 导致白屏 */
            var pText = p.text || p.content || '';
            var pName = p.name || p.author || '';
            var idx = wbData.feed.findIndex(function (f) { return (f.text || f.content || '') === pText && (f.name || f.author || '') === pName; });
            if (idx < 0) return ''; /* 找不到则不渲染 */
            return '<div class="wb-post" onclick="wbNav(\'detail\',' + idx + ')"><div class="wb-post-header"><div class="wb-post-avatar placeholder" style="background:' + (p.color || '#ccc') + '"><span style="color:#fff;font-size:13px;">' + wbEsc(p.avatar || (p.name || p.author || '网')[0]) + '</span></div><div class="wb-post-info"><div class="wb-post-name">' + wbEsc(p.name || p.author) + '</div><div class="wb-post-meta">' + wbEsc(p.time || '刚刚') + '</div></div></div><div class="wb-post-content" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">' + wbEsc((p.text || p.content || '').substring(0, 80)) + '</div></div>';
        }).join('');
    }
    var emptyTip = (r.accounts.length === 0 && r.posts.length === 0) ? '<div style="text-align:center;padding:40px 0;color:#ccc;font-size:14px;">未找到"' + wbEsc(r.query) + '"相关结果</div>' : '';
    return '<div class="weibo-container"><div class="wb-search-bar"><input id="wb-search-input" value="' + wbEsc(r.query) + '" placeholder="搜索" onkeydown="if(event.key===\'Enter\')wbDoSearch()" /><span class="wb-search-bar-cancel" onclick="wbNav(\'home\')">取消</span></div><div class="wb-body">' + accHTML + postHTML + emptyTip + '</div></div>';
}

function renderWbAccount(accId) {
    var acc = (wbData.accounts || []).find(function (a) { return a.id === accId; });
    if (!acc) { wbNav('home'); return ''; }
    var accPosts = (wbData.feed || []).filter(function (p) { return (p.name || p.author) === acc.name; });
    var postsHTML = accPosts.length > 0 ? accPosts.map(function (p) {
        var pText = p.text || p.content || '';
        var pName = p.name || p.author || '';
        var idx = wbData.feed.findIndex(function (f) { return (f.text || f.content || '') === pText && (f.name || f.author || '') === pName; });
        if (idx < 0) return '';
        return '<div class="wb-post" onclick="wbNav(\'detail\',' + idx + ')"><div class="wb-post-header"><div class="wb-post-avatar placeholder" style="background:' + (p.color || '#ccc') + '"><span style="color:#fff;font-size:13px;">' + wbEsc(p.avatar || (p.name || '')[0]) + '</span></div><div class="wb-post-info"><div class="wb-post-name">' + wbEsc(p.name || p.author) + '</div><div class="wb-post-meta">' + wbEsc(p.time || '刚刚') + '</div></div></div><div class="wb-post-content">' + wbSafeContent(p.text || p.content || '') + '</div>' + wbImgs(p.imgs || []) + '<div class="wb-post-actions"><button class="wb-action-btn">' + WB_IC.repost + ' <span>' + wbFmtNum(p.reposts || 0) + '</span></button><button class="wb-action-btn">' + WB_IC.comment + ' <span>' + (Array.isArray(p.comments) ? p.comments.length : 0) + '</span></button><button class="wb-action-btn' + (p.liked ? ' liked' : '') + '" onclick="event.stopPropagation();wbLike(' + idx + ',this)">' + (p.liked ? WB_IC.likeFilled : WB_IC.like) + ' <span>' + wbFmtNum(p.likes || 0) + '</span></button></div></div>';
    }).join('') : '<div style="text-align:center;padding:40px 0;color:#ccc;font-size:13px;">暂无微博</div>';
    var vBadge = acc.verified ? '<span class="wb-post-vip" style="margin-left:4px;"></span>' : '';
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">' + wbEsc(acc.name) + '</span></div><div class="wb-body"><div class="wb-profile-header"><div class="wb-profile-top"><div class="wb-profile-avatar" style="background:' + (acc.color || '#ccc') + '">' + wbEsc(acc.avatar) + '</div><div class="wb-profile-info"><div class="wb-profile-name">' + wbEsc(acc.name) + vBadge + '</div><div class="wb-profile-desc">' + wbEsc(acc.desc) + '</div></div></div><div class="wb-profile-stats"><div class="wb-profile-stat"><div class="wb-profile-stat-num">' + (acc.following || 0) + '</div><div class="wb-profile-stat-label">关注</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">' + (acc.followers || 0) + '</div><div class="wb-profile-stat-label">粉丝</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">' + accPosts.length + '</div><div class="wb-profile-stat-label">微博</div></div></div></div>' + postsHTML + '</div></div>';
}

function renderWbMessages() {
    if (!wbData.messages || wbData.messages.length === 0)
        return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">消息</span></div><div class="wb-body" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:14px;">暂无消息</div>' + renderWbTabbar('msg') + '</div>';
    var list = wbData.messages.map(function (m) {
        return '<div class="wb-msg-item"><div class="wb-msg-icon">' + WB_IC.likeSm + '</div><div class="wb-msg-text">' + wbEsc(m.text) + '</div><div class="wb-msg-time">' + wbEsc(m.time) + '</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">消息</span></div><div class="wb-body">' + list + '</div>' + renderWbTabbar('msg') + '</div>';
}

function renderWbDmList() {
    if (!wbData.dms || wbData.dms.length === 0)
        return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">私信</span></div><div class="wb-body" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:14px;">暂无私信</div>' + renderWbTabbar('msg') + '</div>';
    var list = wbData.dms.map(function (d) {
        return '<div class="wb-dm-item" onclick="wbNav(\'dm\',\'' + d.id + '\')"><div class="wb-dm-avatar" style="background:' + (d.color || '#ccc') + '">' + wbEsc(d.avatar) + '</div><div class="wb-dm-info"><div class="wb-dm-name">' + wbEsc(d.name) + '</div><div class="wb-dm-preview">' + wbEsc(d.lastMsg) + '</div></div><div class="wb-dm-time">' + wbEsc(d.time) + '</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">私信</span></div><div class="wb-body">' + list + '</div>' + renderWbTabbar('msg') + '</div>';
}

function renderWbDm() {
    var dm = wbData.dms.find(function (d) { return d.id === wbData.currentDmId; });
    if (!dm) return '';
    var msgs = dm.msgs.map(function (m) {
        var self = m.sender === wbCurrentName();
        return '<div class="wx-msg-row' + (self ? ' self' : '') + '"><div class="wx-msg-avatar" style="background:' + (self ? wbCurrentColor() : (dm.color || '#ccc')) + '">' + wbEsc(self ? wbCurrentName()[0] : dm.avatar) + '</div><div class="wx-msg-content"><div class="wx-bubble">' + wbEsc(m.text) + '</div></div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'dmlist\')">' + IC.back + '</span><span class="wb-detail-title">' + wbEsc(dm.name) + '</span></div><div class="wb-body" style="padding:12px;">' + msgs + '</div><div class="wb-comment-input"><input id="wb-dm-input" placeholder="发送私信..." onkeydown="if(event.key===\'Enter\')wbSendDm()" /><button class="wb-comment-send" onclick="wbSendDm()">发送</button></div></div>';
}

function renderWbProfile(idx) {
    var pName = wbCurrentName();
    var pColor = wbCurrentColor();
    var p, isSelf;
    if (idx !== undefined) {
        p = wbData.feed[idx] || {};
        isSelf = ((p.name || p.author) === pName);
    } else {
        isSelf = true;
        p = { name: pName, avatar: pName[0], color: pColor };
    }

    var desc = '这个人很懒 什么都没写';
    var following = 128, followers = 0, postCount = 0;
    if (isSelf && wbData.playerProfile) {
        desc = wbData.playerProfile.desc || desc;
        following = wbData.playerProfile.following || following;
        followers = wbData.playerProfile.followers || followers;
    }

    if (isSelf) {
        postCount = wbData.feed.filter(function (post) { return (post.name || post.author) === pName; }).length;
    } else {
        var authorName = p.name || p.author;
        postCount = wbData.feed.filter(function (post) { return (post.name || post.author) === authorName; }).length;
        var acc = (wbData.accounts || []).find(function (a) { return a.name === authorName; });
        if (acc) { desc = acc.desc || desc; followers = acc.followers || 0; following = acc.following || 0; }
    }

    var extra = isSelf ? '<div style="text-align:center;padding:12px;font-size:13px;color:#ff6b2b;cursor:pointer;" onclick="wbNav(\'visitors\')">查看访客记录 →</div>' : '';
    var switchBtn = '';
    if (isSelf && wbData.playerAccounts && wbData.playerAccounts.length > 1) {
        switchBtn = '<div style="text-align:center;padding:10px;font-size:13px;color:#ff6b2b;cursor:pointer;" onclick="wbNav(\'accountSwitch\')">切换账号 (' + wbData.playerAccounts.length + '个)</div>';
    }

    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">个人主页</span></div><div class="wb-body"><div class="wb-profile-header"><div class="wb-profile-top"><div class="wb-profile-avatar" style="background:' + (p.color || pColor) + '">' + wbEsc(p.avatar || p.name[0] || pName[0]) + '</div><div class="wb-profile-info"><div class="wb-profile-name">' + wbEsc(p.name || p.author || pName) + '</div><div class="wb-profile-desc">' + wbEsc(desc) + '</div></div></div><div class="wb-profile-stats"><div class="wb-profile-stat"><div class="wb-profile-stat-num">' + following + '</div><div class="wb-profile-stat-label">关注</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">' + wbFmtNum(followers) + '</div><div class="wb-profile-stat-label">粉丝</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">' + postCount + '</div><div class="wb-profile-stat-label">微博</div></div></div></div>' + switchBtn + extra + '</div>' + renderWbTabbar('me') + '</div>';
}

function renderWbVisitors() {
    if (!wbData.visitors || wbData.visitors.length === 0)
        return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'profile\')">' + IC.back + '</span><span class="wb-detail-title">访客记录</span></div><div class="wb-body" style="display:flex;align-items:center;justify-content:center;color:#ccc;font-size:14px;">暂无访客</div></div>';
    var list = wbData.visitors.map(function (v) {
        return '<div class="wb-visitor-item"><div class="wb-visitor-avatar">' + WB_IC.avatar + '</div><div class="wb-visitor-name">' + wbEsc(v.name) + '</div><div class="wb-visitor-time">' + wbEsc(v.time) + '</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'profile\')">' + IC.back + '</span><span class="wb-detail-title">访客记录</span></div><div class="wb-body">' + list + '</div></div>';
}

function renderWbPublish() {
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'home\')">' + IC.back + '</span><span class="wb-detail-title">发微博</span></div><div class="wb-publish-page"><textarea id="wb-pub-text" class="wb-publish-textarea" placeholder="分享新鲜事..."></textarea><button class="wb-publish-btn" onclick="wbPublish()">发布</button></div></div>';
}

function renderWbAccountSwitch() {
    var list = (wbData.playerAccounts || []).map(function (a) {
        var isCurrent = (a.name === wbCurrentName());
        return '<div class="wb-dm-item" onclick="wbSwitchAccount(\'' + a.id + '\')"><div class="wb-dm-avatar" style="background:' + (a.color || '#ccc') + '">' + wbEsc(a.avatar) + '</div><div class="wb-dm-info"><div class="wb-dm-name">' + wbEsc(a.name) + '</div><div class="wb-dm-preview">' + wbEsc(a.desc) + '</div></div><div class="wb-dm-time">' + (isCurrent ? '当前' : '') + '</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><span class="wb-detail-back" onclick="wbNav(\'profile\')">' + IC.back + '</span><span class="wb-detail-title">切换账号</span></div><div class="wb-body">' + list + '</div></div>';
}

function wbCurrentName() {
    return wbData._activeAccountName || (typeof playerName !== 'undefined' ? playerName : '玩家');
}
function wbCurrentColor() {
    return wbData._activeAccountColor || (typeof playerColor !== 'undefined' ? playerColor : '#ff9eaa');
}

function wbSwitchAccount(accId) {
    var acc = (wbData.playerAccounts || []).find(function (a) { return a.id === accId; });
    if (!acc) return;
    wbData._activeAccountId = accId;
    wbData._activeAccountName = acc.name;
    wbData._activeAccountColor = acc.color;
    wbData.playerProfile = acc;
    wbNav('profile');
}

function wbAddPlayerAccount(account) {
    if (!account || !account.name) return;
    var exists = (wbData.playerAccounts || []).some(function (a) { return a.id === account.id || a.name === account.name; });
    if (exists) return;
    account.isPlayer = true;
    wbData.accounts.push(account);
    wbData.playerAccounts.push(account);
}

function wbLike(i, btn) {
    var p = wbData.feed[i];
    if (!p) return;
    if (p.liked) { p.liked = false; p.likes = Math.max(0, (p.likes || 1) - 1); }
    else {
        p.liked = true; p.likes = (p.likes || 0) + 1;
        if (btn) { var anim = document.createElement('span'); anim.className = 'wb-like-anim'; anim.textContent = '+1'; btn.appendChild(anim); setTimeout(function () { anim.remove(); }, 600); }
    }
    if (wbData.currentView === 'home') wbNav('home');
    else if (wbData.currentView === 'detail') wbNav('detail', wbData.currentPostIdx);
    else if (wbData.currentView === 'account') wbNav('account', wbData._currentAccountId);
}

function wbComment() {
    var input = document.getElementById('wb-cmt-input');
    var t = input.value.trim(); if (!t) return;
    if (!Array.isArray(wbData.feed[wbData.currentPostIdx].comments)) wbData.feed[wbData.currentPostIdx].comments = [];
    wbData.feed[wbData.currentPostIdx].comments.unshift({ name: wbCurrentName(), text: t, time: '刚刚', likes: 0 });
    input.value = '';
    wbNav('detail', wbData.currentPostIdx);
}

function wbSendDm() {
    var input = document.getElementById('wb-dm-input');
    var t = input.value.trim(); if (!t) return;
    var dm = wbData.dms.find(function (d) { return d.id === wbData.currentDmId; });
    if (!dm) return;
    dm.msgs.push({ sender: wbCurrentName(), text: t }); dm.lastMsg = t;
    input.value = ''; wbNav('dm', wbData.currentDmId);
}

function wbPublish() {
    var t = document.getElementById('wb-pub-text').value.trim();
    if (!t) { alert('请输入内容'); return; }
    var pn = wbCurrentName();
    var pc = wbCurrentColor();
    var newPost = { id: 'p' + Date.now(), name: pn, avatar: pn[0], color: pc, verified: false, time: '刚刚', text: t, imgs: [], reposts: 0, comments: [], likes: 0, liked: false };
    wbData.feed.unshift(newPost);
    window.parent.postMessage({ type: 'PHONE_INTERACT', action: 'weibo_publish', post: newPost }, '*');
    wbNav('home');
}

function renderWbTabbar(active) {
    var tabs = [
        { id: 'home', label: '首页', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' },
        { id: 'msg', label: '消息', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
        { id: 'dm', label: '私信', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
        { id: 'me', label: '我的', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
    ];
    return '<div class="wb-tabbar">' + tabs.map(function (t) {
        var cls = t.id === active ? ' active' : '';
        var oc = '';
        if (t.id === 'home') oc = 'wbNav(\'home\')';
        else if (t.id === 'msg') oc = 'wbNav(\'messages\')';
        else if (t.id === 'dm') oc = 'wbNav(\'dmlist\')';
        else if (t.id === 'me') oc = 'wbNav(\'profile\')';
        return '<div class="wb-tab-item' + cls + '" onclick="' + oc + '"><div class="wb-tab-icon">' + t.icon + '</div><span>' + t.label + '</span></div>';
    }).join('') + '</div>';
}

// ═══════════════ ★ 图片放大预览 ═══════════════
function wbImgPreview(desc) {
    var container = document.querySelector('.weibo-container');
    if (!container) return;
    var overlay = document.createElement('div');
    overlay.className = 'wb-img-overlay show';
    overlay.onclick = function () { overlay.remove(); };
    overlay.innerHTML = '<div class="wb-img-overlay-text" style="font-size:16px;opacity:1;">' + wbEsc(desc || '图片预览') + '</div>';
    container.appendChild(overlay);
}

// ═══════════════ ★ 评论区加载更多 ═══════════════
function wbLoadMoreComments() {
    wbData._cmtShowCount = (wbData._cmtShowCount || 5) + 10;
    var el = document.getElementById('screen-weibo');
    el.innerHTML = renderWbDetail();
}

// ═══════════════ ★ 热搜联动剧情事件 ═══════════════
function wbInjectHotEvent(event) {
    if (!event || !event.title) return;
    var rank = (event.rank || 1) - 1;
    var exist = wbData.hotSearch.findIndex(function (h) { return (h.text || h.title) === event.title; });
    if (exist !== -1) wbData.hotSearch.splice(exist, 1);
    var item = { text: event.title, tag: event.tag || '新', count: event.count || '' };
    wbData.hotSearch.splice(rank, 0, item);
    if (wbData.hotSearch.length > 50) wbData.hotSearch.length = 50;
    if (wbData.currentView === 'hot') wbNav('hot');
}

function wbOnPublicOpinionChange(opinionVal, events) {
    if (!events || !Array.isArray(events)) return;
    events.forEach(function (ev) {
        var tag = '新';
        if (opinionVal >= 80) tag = '爆';
        else if (opinionVal >= 60) tag = '热';
        else if (opinionVal >= 40) tag = '沸';
        wbInjectHotEvent({ title: ev.title, tag: tag, rank: ev.rank, count: ev.count });
    });
}

// ★ 监听父页面消息
window.addEventListener('message', function (e) {
    if (!e.data) return;
    if (e.data.type === 'WEIBO_HOT_EVENT') {
        wbInjectHotEvent(e.data.event);
    }
    if (e.data.type === 'PUBLIC_OPINION_CHANGE') {
        wbOnPublicOpinionChange(e.data.value, e.data.events);
    }
});