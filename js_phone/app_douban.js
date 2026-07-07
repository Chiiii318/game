// ══════════════════════════════════════
// 豆瓣客户端 
// ══════════════════════════════════════

var dbData = {
    currentView: 'home', currentGroupId: 'art', currentPostIdx: -1,

    // 【修改点】：所有死数据置空，只留空对象/数组接收AI数据
    posts: { art: [], observe: [], emoji: [] },
    discussing: [],
    groups: [
        { id: 'art', name: '表演艺术协会', desc: '纯吃瓜 不站队', members: '45.2万', icon: '🎭' },
        { id: 'observe', name: '楼人观察室', desc: '理性探讨 拒绝闭眼吹', members: '12.8万', icon: '🔍' },
        { id: 'emoji', name: 'emoji乐子组', desc: '抽象发疯 随便舞', members: '8.9万', icon: '🤪' }
    ]
};

var DB_IC = {
    like: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    comment: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'
};

function dbNav(view, data) {
    var prevView = dbData.currentView;   // ← 新增：先存旧视图
    dbData.currentView = view;

    if (view === 'group' && (!dbData.posts[data] || dbData.posts[data].length === 0)) {
        if (typeof requestAppData === 'function') requestAppData('douban');
    }

    var el = document.getElementById('screen-douban');
    if (view === 'home') el.innerHTML = renderDbHome();
    else if (view === 'group') { dbData.currentGroupId = data; el.innerHTML = renderDbGroup(); }
    else if (view === 'detail') { dbData._detailFrom = (prevView === 'detail' ? 'group' : prevView) || 'group'; dbData.currentPostIdx = data; el.innerHTML = renderDbDetail(); }
    else if (view === 'discuss') el.innerHTML = renderDbDiscuss();
    else if (view === 'publish') el.innerHTML = renderDbPublish();
    else if (view === 'me') el.innerHTML = renderDbMe();
}

function renderDbHome() {
    var groups = dbData.groups.map(function (g) {
        return '<div class="db-group-card" onclick="dbNav(\'group\',\'' + g.id + '\')"><div class="db-group-icon">' + g.icon + '</div><div class="db-group-info"><div class="db-group-name">' + g.name + '</div><div class="db-group-desc">' + g.desc + '</div><div class="db-group-meta">' + g.members + '成员</div></div><div class="db-group-join">去小组</div></div>';
    }).join('');
    return '<div class="douban-container"><div class="db-navbar"><div class="db-navbar-left"><div class="db-navbar-btn" onclick="goDesktop()">' + IC.back + '</div></div><div class="db-navbar-center">小组</div><div class="db-navbar-right"><div class="db-navbar-btn">' + IC.search + '</div></div></div><div class="db-search-wrap"><div class="db-search-bar">' + IC.search + ' 搜索小组/帖子</div></div><div class="db-body" style="background:#fff;padding:16px;"><div style="font-size:16px;font-weight:600;margin-bottom:12px;">我的小组</div><div class="db-groups-list">' + groups + '</div></div>' + renderDbTabbar('home') + '</div>';
}

function renderDbGroup() {
    var g = dbData.groups.find(function (x) { return x.id === dbData.currentGroupId; });
    var posts = dbData.posts[dbData.currentGroupId] || [];
    var list = '';
    if (posts.length === 0) {
        list = '<div style="text-align:center;padding:40px 0;color:#999;font-size:14px;">刷新收集中...</div>';
    } else {
        list = posts.map(function (p, i) {
            return '<div class="db-post-item" onclick="dbNav(\'detail\',' + i + ')"><div class="db-post-title">' + (p.title || '无题') + '</div><div class="db-post-preview">' + (p.preview || p.content || '').substring(0, 60) + '</div><div class="db-post-meta"><span class="db-post-author">' + (p.author || '已注销') + '</span><span class="db-post-time">' + (p.time || '刚刚') + '</span><span class="db-post-replies">' + (p.replies || (p.comments || []).length || 0) + '回应</span></div></div>';
        }).join('');
    }
    return '<div class="douban-container"><div class="db-navbar"><div class="db-navbar-left"><div class="db-navbar-btn" onclick="dbNav(\'home\')">' + IC.back + '</div></div><div class="db-navbar-center"></div><div class="db-navbar-right"><div class="db-navbar-btn" onclick="dbNav(\'publish\')">' + IC.plus + '</div></div></div><div class="db-body" style="background:#fff;"><div class="db-group-header"><div class="db-group-h-icon">' + g.icon + '</div><div class="db-group-h-info"><div class="db-group-h-name">' + g.name + '</div><div class="db-group-h-meta">' + g.members + '成员</div></div></div><div class="db-group-tabs"><span class="db-group-tab active">讨论</span><span class="db-group-tab">精华</span></div><div class="db-posts-list">' + list + '</div></div></div>';
}

function renderDbDetail() {
    var backTo = dbData._detailFrom || 'group';
    var p = (dbData.posts[dbData.currentGroupId] || [])[dbData.currentPostIdx];
    if (!p) return '';
    // ★ 修复：AI 生成的 comments 可能是数字(评论数)而非数组
    var cmts = (Array.isArray(p.comments) ? p.comments : []).map(function (c, i) {
        var isAuthor = c.name === (p.author || '已注销') ? '<span class="db-author-tag">楼主</span>' : '';
        return '<div class="db-cmt-item"><div class="db-cmt-avatar">' + c.name[0] + '</div><div class="db-cmt-body"><div class="db-cmt-name">' + c.name + isAuthor + '</div><div class="db-cmt-time">' + (c.time || '刚刚') + '</div><div class="db-cmt-text">' + (c.text || c.content) + '</div></div><div class="db-cmt-like" onclick="dbLikeCmt(' + i + ',this)">' + DB_IC.like + ' <span>' + (c.likes || 0) + '</span></div></div>';
    }).join('');

    return '<div class="douban-container"><div class="db-detail-nav"><div class="db-detail-back" onclick="dbNav(\'' + backTo + '\')">' + IC.back + '</div><div class="db-detail-title">话题详情</div><div class="db-navbar-right"><div class="db-navbar-btn">' + IC.more + '</div></div></div><div class="db-body" style="background:#fff;"><div class="db-detail-content"><div class="db-d-title">' + (p.title || '无题') + '</div><div class="db-d-author-bar"><div class="db-d-avatar">' + (p.author ? p.author[0] : '注') + '</div><div class="db-d-info"><div class="db-d-name">' + (p.author || '已注销') + '</div><div class="db-d-time">' + (p.time || '刚刚') + '</div></div></div><div class="db-d-text">' + (p.preview || p.content || '').replace(/\n/g, '<br>') + '</div><div class="db-d-actions"><div class="db-d-action-btn">' + DB_IC.like + ' 赞 (' + (p.likes || 0) + ')</div><div class="db-d-action-btn">' + DB_IC.star + ' 收藏</div></div></div><div class="db-d-comments-section"><div class="db-d-c-header">全部回应 ' + (p.replies || (p.comments || []).length || 0) + '</div>' + (cmts || '<div style="text-align:center;padding:20px;color:#999;font-size:12px;">暂无回应</div>') + '</div></div><div class="db-comment-input"><input id="db-cmt-input" placeholder="加入讨论..." onkeydown="if(event.key===\'Enter\')dbComment()"><button class="db-comment-send" onclick="dbComment()">发送</button></div></div>';
}

function renderDbDiscuss() {
    if (!dbData.discussing || dbData.discussing.length === 0) return '<div class="douban-container"><div class="db-navbar"><div class="db-navbar-left"><div class="db-navbar-btn" onclick="goDesktop()">' + IC.back + '</div></div><div class="db-navbar-center">动态</div><div class="db-navbar-right"></div></div><div class="db-body" style="background:#fff;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">暂无动态</div>' + renderDbTabbar('discuss') + '</div>';
    var list = dbData.discussing.map(function (d) {
        return '<div class="db-discuss-item"><div class="db-discuss-header"><span class="db-discuss-name">' + d.name + '</span> ' + d.action + ' <span class="db-discuss-time">' + d.time + '</span></div><div class="db-discuss-target"><div>' + d.targetTitle + '</div><div style="font-size:12px;color:#999;margin-top:4px;">' + d.targetGroup + '</div></div></div>';
    }).join('');
    return '<div class="douban-container"><div class="db-navbar"><div class="db-navbar-left"><div class="db-navbar-btn" onclick="goDesktop()">' + IC.back + '</div></div><div class="db-navbar-center">动态</div><div class="db-navbar-right"></div></div><div class="db-body" style="background:#fff;">' + list + '</div>' + renderDbTabbar('discuss') + '</div>';
}

function renderDbPublish() {
    return '<div class="douban-container"><div class="db-detail-nav"><div class="db-detail-back" onclick="dbNav(\'group\',\'' + dbData.currentGroupId + '\')">取消</div><div class="db-detail-title">发布话题</div><div class="db-navbar-right"><span style="color:#42bd56;font-weight:600;cursor:pointer;" onclick="dbPublish()">发布</span></div></div><div class="db-publish-page"><input class="db-pub-title" id="db-pub-title" placeholder="加个标题哟~"><textarea class="db-pub-textarea" id="db-pub-text" placeholder="分享你的吃瓜/讨论/感悟..."></textarea></div></div>';
}

function renderDbMe() {
    var pn = typeof playerName !== 'undefined' ? playerName : '玩家';
    return '<div class="douban-container"><div class="db-navbar"><div class="db-navbar-left"><div class="db-navbar-btn" onclick="goDesktop()">' + IC.back + '</div></div><div class="db-navbar-center">我</div><div class="db-navbar-right"></div></div><div class="db-body" style="background:#f5f5f5;"><div style="background:#fff;padding:24px 16px;display:flex;align-items:center;gap:16px;"><div style="width:64px;height:64px;border-radius:50%;background:#42bd56;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;">' + pn[0] + '</div><div><div style="font-size:20px;font-weight:600;color:#111;">' + pn + '</div><div style="font-size:13px;color:#999;margin-top:6px;">ID: db_user_' + Math.floor(Math.random() * 10000) + '</div></div></div><div style="margin-top:12px;background:#fff;"><div style="padding:16px;border-bottom:0.5px solid #eee;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:15px;">我的发布</span><span style="color:#ccc;">></span></div><div style="padding:16px;border-bottom:0.5px solid #eee;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:15px;">我的收藏</span><span style="color:#ccc;">></span></div><div style="padding:16px;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:15px;">浏览记录</span><span style="color:#ccc;">></span></div></div></div>' + renderDbTabbar('me') + '</div>';
}

function dbLikeCmt(i, btn) {
    var p = dbData.posts[dbData.currentGroupId][dbData.currentPostIdx];
    p.comments[i].likes++;
    if (btn) { var anim = document.createElement('span'); anim.className = 'wb-like-anim'; anim.textContent = '+1'; anim.style.color = '#42bd56'; btn.appendChild(anim); setTimeout(function () { anim.remove(); }, 600); }
    dbNav('detail', dbData.currentPostIdx);
}

function dbComment() {
    var input = document.getElementById('db-cmt-input');
    var t = input.value.trim(); if (!t) return;
    var p = dbData.posts[dbData.currentGroupId][dbData.currentPostIdx];
    if (!p.comments) p.comments = [];
    var pn = typeof playerName !== 'undefined' ? playerName : '玩家';
    p.comments.push({ name: pn, text: t, time: '刚刚', likes: 0 });
    p.replies = (p.replies || 0) + 1;
    input.value = ''; dbNav('detail', dbData.currentPostIdx);
}

function dbPublish() {
    var title = document.getElementById('db-pub-title').value.trim();
    var text = document.getElementById('db-pub-text').value.trim();
    if (!title || !text) { alert('标题和内容不能为空'); return; }
    var pn = typeof playerName !== 'undefined' ? playerName : '玩家';
    if (!dbData.posts[dbData.currentGroupId]) dbData.posts[dbData.currentGroupId] = [];
    dbData.posts[dbData.currentGroupId].unshift({ title: title, preview: text, author: pn, time: '刚刚', replies: 0, likes: 0, comments: [] });
    dbNav('group', dbData.currentGroupId);
}

function renderDbTabbar(active) {
    var tabs = [
        { id: 'home', label: '首页', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>' },
        { id: 'discuss', label: '动态', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' },
        { id: 'me', label: '我', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' }
    ];
    return '<div class="db-tabbar">' + tabs.map(function (t) {
        var cls = t.id === active ? ' active' : '';
        return '<div class="db-tab-item' + cls + '" onclick="dbNav(\'' + t.id + '\')"><div class="db-tab-icon">' + t.icon + '</div><span>' + t.label + '</span></div>';
    }).join('') + '</div>';
}