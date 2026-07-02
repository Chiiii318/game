// ══════════════════════════════════════
// 微博客户端
// ══════════════════════════════════════

var wbData = {
    currentView:'home', currentPostIdx:-1, currentDmId:null,
    hotSearch: [], feed: [], messages: [], dms: [], visitors: [], accounts: [],
    playerProfile: null,          // ★ 玩家微博主页信息（从角色卡推断）
    playerAccounts: []            // ★ 玩家拥有的多个微博账号（从角色卡/剧情动态生成）
};

// ★ 手机启动时，从父页面 gameState 提取玩家资料填充微博主页
function wbInitPlayerProfile() {
    var name = typeof playerName !== 'undefined' ? playerName : '玩家';
    var color = typeof playerColor !== 'undefined' ? playerColor : '#ff9eaa';

    // 尝试从父页面拿玩家信息
    try {
        var gs = window.parent.gameState;
        if (gs) {
            if (gs.playerName) name = gs.playerName;
            if (gs.playerColor) color = gs.playerColor;
        }
    } catch(e) { /* iframe 跨域可能失败，不阻塞 */ }

    // ★ 兜底：无论是否获取到 gameState，都确保 playerProfile 和 accounts 有数据
    if (!wbData.playerProfile) {
        wbData.playerProfile = {
            name: name,
            avatar: name[0],
            color: color,
            desc: '（主页简介会根据你的角色设定自动生成）',
            following: 128,
            followers: 0,
            postCount: 0
        };
    }

    if (!wbData.accounts || wbData.accounts.length === 0) {
        wbData.accounts = [{
            id: 'player_main',
            name: name,
            avatar: name[0],
            color: color,
            desc: '主账号',
            verified: false,
            following: 128,
            followers: 0,
            isPlayer: true
        }];
    }

    if (!wbData.playerAccounts || wbData.playerAccounts.length === 0) {
        wbData.playerAccounts = wbData.accounts.filter(function(a){ return a.isPlayer; });
    }
}

var WB_IC = {
    repost:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 14l3-3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 11v5a3 3 0 0 0 3 3h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M21 10l-3 3-3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 13V8a3 3 0 0 0-3-3H9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    comment:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-3l-3.5 3V16H8a3 3 0 0 1-3-3V7z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    like:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 4 15.5 4 10c0-2.8 2.2-5 5-5 1.5 0 2.8.7 3.5 1.8A4.8 4.8 0 0 1 16 5c2.8 0 5 2.2 5 5 0 5.5-8 11-8 11h-1z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    likeFilled:'<svg width="15" height="15" viewBox="0 0 24 24"><path d="M12 21C12 21 4 15.5 4 10c0-2.8 2.2-5 5-5 1.5 0 2.8.7 3.5 1.8A4.8 4.8 0 0 1 16 5c2.8 0 5 2.2 5 5 0 5.5-8 11-8 11h-1z" fill="#ff6b2b" stroke="#ff6b2b" stroke-width="2" stroke-linejoin="round"/></svg>',
    likeSm:'<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 4 15.5 4 10c0-2.8 2.2-5 5-5 1.5 0 2.8.7 3.5 1.8A4.8 4.8 0 0 1 16 5c2.8 0 5 2.2 5 5 0 5.5-8 11-8 11h-1z" stroke="#ccc" stroke-width="2.5" stroke-linejoin="round"/></svg>',
    avatar:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6.5" r="3" fill="#bbb"/><path d="M3 16.5c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" fill="#bbb"/></svg>',
    search:'<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="7.5" cy="7.5" r="5" stroke="#666" stroke-width="1.5"/><line x1="11.5" y1="11.5" x2="16" y2="16" stroke="#666" stroke-width="1.5" stroke-linecap="round"/></svg>'
};

function wbFmtNum(n){if(typeof n==='string')return n;if(n>=10000)return(n/10000).toFixed(1).replace('.0','')+'万';return String(n||0);}

function wbImgs(images){
    if(!images||images.length===0)return '';
    var cls='grid';
    if(images.length===1)cls='single';
    else if(images.length===2)cls='double';
    else if(images.length===3)cls='triple';
    return '<div class="wb-imgs '+cls+'">'+images.map(function(img){return '<div class="wb-img-item">'+img+'</div>';}).join('')+'</div>';
}

function wbNav(view,data){
    if (!wbData._inited) { wbData._inited = true; wbInitPlayerProfile(); }
    wbData.currentView=view;
    if (view === 'feed' && wbData.feed.length === 0 && typeof requestAppData==='function') requestAppData('weibo');
    if (view === 'hotsearch' && wbData.hotSearch.length === 0 && typeof requestAppData==='function') requestAppData('weibo_hotsearch');
    
    var el=document.getElementById('screen-weibo');
    if(view==='home')el.innerHTML=renderWbHome();
    else if(view==='hot')el.innerHTML=renderWbHot();
    else if(view==='detail'){wbData._detailFrom=wbData._prevView||'home';wbData.currentPostIdx=data;el.innerHTML=renderWbDetail();}
    else if(view==='search')el.innerHTML=renderWbSearch();
    else if(view==='messages')el.innerHTML=renderWbMessages();
    else if(view==='dmlist')el.innerHTML=renderWbDmList();
    else if(view==='dm'){wbData.currentDmId=data;el.innerHTML=renderWbDm();}
    else if(view==='profile')el.innerHTML=renderWbProfile(data);
    else if(view==='visitors')el.innerHTML=renderWbVisitors();
    else if(view==='publish')el.innerHTML=renderWbPublish();
    else if(view==='searchresult')el.innerHTML=renderWbSearchResult();
    else if(view==='account'){wbData._currentAccountId=data;el.innerHTML=renderWbAccount(data);}
else if(view==='accountSwitch'){el.innerHTML=renderWbAccountSwitch();}
    wbData._prevView=view;
}

function renderWbHome(){
    if(!wbData.feed || wbData.feed.length===0) return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left"><div class="wb-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="wb-navbar-tabs"><span class="wb-nav-tab active">关注</span><span class="wb-nav-tab" onclick="wbNav(\'hot\')">热搜</span><span class="wb-nav-tab">推荐</span></div><div class="wb-navbar-right"><div class="wb-navbar-btn" onclick="wbNav(\'search\')">'+WB_IC.search+'</div></div></div><div class="wb-body wb-feed" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">刷新动态中...</div>'+renderWbTabbar('home')+'</div>';
    
    var feedHTML=wbData.feed.map(function(p,i){
        return '<div class="wb-post" onclick="wbNav(\'detail\','+i+')">'+
            '<div class="wb-post-header"><div class="wb-post-avatar" style="background:'+(p.color||'#ff6b2b')+';color:#fff;font-size:14px;">'+(p.avatar||p.name[0]||'网')+'</div><div class="wb-post-info"><div class="wb-post-name">'+(p.name||p.author)+(p.verified?' <span class="wb-post-vip"><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M3 5l2 2 3-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':'')+'</div><div class="wb-post-meta">'+(p.time||'刚刚')+'</div></div></div>'+
            '<div class="wb-post-content">'+(p.text||p.content||'').replace(/\n/g,'<br>')+'</div>'+wbImgs(p.imgs||[])+
            '<div class="wb-post-actions"><button class="wb-action-btn" onclick="event.stopPropagation()">'+WB_IC.repost+' '+wbFmtNum(p.reposts||p.shares||0)+'</button><button class="wb-action-btn" onclick="event.stopPropagation()">'+WB_IC.comment+' '+((p.comments||[]).length||p.commentCount||0)+'</button><button class="wb-action-btn'+(p.liked?' liked':'')+'" onclick="event.stopPropagation();wbLike('+i+',this)">'+(p.liked?WB_IC.likeFilled:WB_IC.like)+' <span>'+wbFmtNum(p.likes||0)+'</span></button></div>'+
        '</div>';
    }).join('');

    return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left"><div class="wb-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="wb-navbar-tabs"><span class="wb-nav-tab active">关注</span><span class="wb-nav-tab" onclick="wbNav(\'hot\')">热搜</span><span class="wb-nav-tab">推荐</span></div><div class="wb-navbar-right"><div class="wb-navbar-btn" onclick="wbNav(\'search\')">'+WB_IC.search+'</div></div></div><div class="wb-body wb-feed">'+feedHTML+'</div>'+renderWbTabbar('home')+'</div>';
}

function renderWbHot(){
    if(!wbData.hotSearch || wbData.hotSearch.length===0) return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left"><div class="wb-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="wb-navbar-tabs"><span class="wb-nav-tab" onclick="wbNav(\'home\')">关注</span><span class="wb-nav-tab active">热搜</span><span class="wb-nav-tab">推荐</span></div><div class="wb-navbar-right"></div></div><div class="wb-body wb-hot-list" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">获取热搜中...</div>'+renderWbTabbar('home')+'</div>';
    
    var list=wbData.hotSearch.map(function(h,i){
        var rc=i<3?'':' normal';
        var tag=h.tag?'<span class="wb-hot-tag">'+h.tag+'</span>':'';
        return '<div class="wb-hot-item"><span class="wb-hot-rank'+rc+'">'+(i+1)+'</span><span class="wb-hot-text">'+(h.text||h.title)+'</span>'+tag+'<span class="wb-hot-count">'+(h.count||'')+'</span></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-navbar"><div class="wb-navbar-left"><div class="wb-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="wb-navbar-tabs"><span class="wb-nav-tab" onclick="wbNav(\'home\')">关注</span><span class="wb-nav-tab active">热搜</span><span class="wb-nav-tab">推荐</span></div><div class="wb-navbar-right"></div></div><div class="wb-body wb-hot-list">'+list+'</div>'+renderWbTabbar('home')+'</div>';
}

function renderWbDetail(){
    var backTo = wbData._detailFrom || 'home';
    var p=wbData.feed[wbData.currentPostIdx];
    if(!p) return '';
    var cmts=(p.comments||[]).map(function(c){
        return '<div class="wb-comment-item"><div class="wb-comment-avatar">'+WB_IC.avatar+'</div><div class="wb-comment-body"><div class="wb-comment-name">'+(c.name||c.author)+'</div><div class="wb-comment-text">'+(c.text||c.content)+'</div><div class="wb-comment-meta"><span>'+(c.time||'刚刚')+'</span></div></div><div class="wb-comment-like">'+WB_IC.likeSm+'<span>'+(c.likes||0)+'</span></div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\''+backTo+'\')">'+IC.back+'</div><div class="wb-detail-title">正文</div></div><div class="wb-body"><div class="wb-post" style="margin:0;"><div class="wb-post-header"><div class="wb-post-avatar" style="background:'+(p.color||'#ff6b2b')+';color:#fff;font-size:14px;" onclick="wbNav(\'profile\','+wbData.currentPostIdx+')">'+(p.avatar||p.name[0]||'网')+'</div><div class="wb-post-info"><div class="wb-post-name" onclick="wbNav(\'profile\','+wbData.currentPostIdx+')">'+(p.name||p.author)+(p.verified?' <span class="wb-post-vip"><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M3 5l2 2 3-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':'')+'</div><div class="wb-post-meta">'+(p.time||'刚刚')+'</div></div></div><div class="wb-post-content">'+(p.text||p.content||'').replace(/\n/g,'<br>')+'</div>'+wbImgs(p.imgs||[])+'<div class="wb-post-actions"><button class="wb-action-btn">'+WB_IC.repost+' '+wbFmtNum(p.reposts||p.shares||0)+'</button><button class="wb-action-btn">'+WB_IC.comment+' '+((p.comments||[]).length||0)+'</button><button class="wb-action-btn'+(p.liked?' liked':'')+'" onclick="wbLike('+wbData.currentPostIdx+',this)">'+(p.liked?WB_IC.likeFilled:WB_IC.like)+' <span>'+wbFmtNum(p.likes||0)+'</span></button></div></div><div class="wb-comments-section"><div class="wb-comments-tabs"><span class="wb-comments-tab active">热门</span><span class="wb-comments-tab">最新</span></div>'+(cmts||'<div style="text-align:center;padding:20px;color:#999;font-size:12px;">暂无评论</div>')+'</div></div><div class="wb-comment-input"><input id="wb-cmt-input" placeholder="写评论..." onkeydown="if(event.key===\'Enter\')wbComment()"><button class="wb-comment-send" onclick="wbComment()">发送</button></div></div>';
}

function renderWbSearch(){
    var hots = (wbData.hotSearch||[]).slice(0,6).map(function(h){
        return '<div style="padding:6px 12px;background:#f5f5f5;border-radius:14px;font-size:12px;color:#ff6b2b;cursor:pointer;">'+(h.text||h.title)+'</div>';
    }).join('');
    var accList = (wbData.accounts||[]).slice(0,3).map(function(a){
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:0.5px solid #f5f5f5;cursor:pointer;" onclick="wbNav(\'account\',\''+a.id+'\')"><div style="width:36px;height:36px;border-radius:50%;background:'+a.color+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;">'+a.avatar+'</div><div style="flex:1;"><div style="font-size:14px;color:#1a1a1a;font-weight:500;">'+a.name+'</div><div style="font-size:11px;color:#999;margin-top:2px;">'+(a.desc||'').split('·')[0].trim()+'</div></div><div style="font-size:11px;color:#bbb;">'+(a.followers||0)+'粉丝</div></div>';
    }).join('');

    return '<div class="weibo-container"><div class="wb-search-bar"><input id="wb-search-input" placeholder="搜索微博/用户" autofocus onkeydown="if(event.key===\'Enter\')wbDoSearch()"><span class="wb-search-bar-cancel" onclick="wbNav(\'home\')">取消</span></div><div class="wb-body" style="background:#fff;padding:16px;"><div style="font-size:13px;color:#999;margin-bottom:10px;">推荐用户</div>'+(accList||'<div style="color:#ccc;font-size:12px;">暂无数据</div>')+'<div style="font-size:13px;color:#999;margin:16px 0 10px;">大家都在搜</div><div style="display:flex;flex-wrap:wrap;gap:8px;">'+hots+'</div></div></div>';
}

function wbDoSearch(){
    var input = document.getElementById('wb-search-input');
    var query = input.value.trim();
    if(!query) return;
    var matchedAccounts = (wbData.accounts||[]).filter(function(a){ return a.name.indexOf(query)!==-1 || (a.desc||'').indexOf(query)!==-1; });
    var matchedPosts = (wbData.feed||[]).filter(function(p){ return (p.text||p.content||'').indexOf(query)!==-1 || (p.name||p.author||'').indexOf(query)!==-1; });
    wbData._searchResults = {query:query, accounts:matchedAccounts, posts:matchedPosts};
    wbNav('searchresult');
}

function renderWbSearchResult(){
    var r = wbData._searchResults || {query:'',accounts:[],posts:[]};
    var accHTML = '';
    if(r.accounts.length > 0){
        accHTML = '<div style="font-size:13px;color:#999;padding:12px 16px 6px;">用户</div>' +
            r.accounts.map(function(a){
                var vBadge = a.verified ? '<span class="wb-post-vip" style="margin-left:4px;"><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M3 5l2 2 3-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : '';
                return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:0.5px solid #f5f5f5;cursor:pointer;" onclick="wbNav(\'account\',\''+a.id+'\')"><div class="wb-post-avatar" style="background:'+a.color+';color:#fff;font-size:14px;">'+a.avatar+'</div><div style="flex:1;"><div style="font-size:14px;font-weight:600;color:#1a1a1a;">'+a.name+vBadge+'</div><div style="font-size:12px;color:#999;margin-top:2px;">'+a.desc+'</div></div><div style="padding:4px 12px;border:1px solid #ff6b2b;border-radius:14px;font-size:12px;color:#ff6b2b;cursor:pointer;">关注</div></div>';
            }).join('');
    }
    var postHTML = '';
    if(r.posts.length > 0){
        postHTML = '<div style="font-size:13px;color:#999;padding:12px 16px 6px;">相关微博</div>' +
            r.posts.map(function(p,i){
                var idx = wbData.feed.indexOf(p);
                return '<div class="wb-post" onclick="wbNav(\'detail\','+idx+')" style="margin:0;border-bottom:0.5px solid #f5f5f5;"><div class="wb-post-header"><div class="wb-post-avatar" style="background:'+(p.color||'#ccc')+';color:#fff;font-size:14px;">'+(p.avatar||p.name[0]||'网')+'</div><div class="wb-post-info"><div class="wb-post-name">'+(p.name||p.author)+'</div><div class="wb-post-meta">'+(p.time||'刚刚')+'</div></div></div><div class="wb-post-content" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">'+(p.text||p.content||'').replace(/<[^>]+>/g,'')+'</div></div>';
            }).join('');
    }
    var emptyTip = (r.accounts.length===0 && r.posts.length===0) ? '<div style="text-align:center;padding:40px 0;color:#999;font-size:14px;">未找到"'+r.query+'"相关结果</div>' : '';

    return '<div class="weibo-container"><div class="wb-search-bar"><input id="wb-search-input" value="'+r.query+'" onkeydown="if(event.key===\'Enter\')wbDoSearch()"><span class="wb-search-bar-cancel" onclick="wbNav(\'home\')">取消</span></div><div class="wb-body" style="background:#fff;">'+accHTML+postHTML+emptyTip+'</div></div>';
}

function renderWbAccount(accId){
    var acc = (wbData.accounts||[]).find(function(a){return a.id===accId;});
    if(!acc){ wbNav('home'); return ''; }
    var accPosts = (wbData.feed||[]).filter(function(p){return (p.name||p.author)===acc.name;});
    var postsHTML = accPosts.length > 0 ? accPosts.map(function(p){
        var idx = wbData.feed.indexOf(p);
        return '<div class="wb-post" onclick="wbNav(\'detail\','+idx+')"><div class="wb-post-header"><div class="wb-post-avatar" style="background:'+(p.color||'#ccc')+';color:#fff;font-size:14px;">'+(p.avatar||p.name[0])+'</div><div class="wb-post-info"><div class="wb-post-name">'+(p.name||p.author)+'</div><div class="wb-post-meta">'+(p.time||'刚刚')+'</div></div></div><div class="wb-post-content">'+(p.text||p.content||'').replace(/\n/g,'<br>')+'</div>'+wbImgs(p.imgs||[])+'<div class="wb-post-actions"><button class="wb-action-btn">'+WB_IC.repost+' '+wbFmtNum(p.reposts||0)+'</button><button class="wb-action-btn">'+WB_IC.comment+' '+((p.comments||[]).length||0)+'</button><button class="wb-action-btn'+(p.liked?' liked':'')+'">'+( p.liked?WB_IC.likeFilled:WB_IC.like)+' '+wbFmtNum(p.likes||0)+'</button></div></div>';
    }).join('') : '<div style="text-align:center;padding:40px 0;color:#bbb;font-size:13px;">暂无微博</div>';

    var vBadge = acc.verified ? ' <span class="wb-post-vip"><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 5l2 2 3-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : '';

    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'home\')">'+IC.back+'</div><div class="wb-detail-title">'+acc.name+'</div></div><div class="wb-body"><div class="wb-profile-header"><div class="wb-profile-top"><div class="wb-profile-avatar" style="background:'+acc.color+'">'+acc.avatar+'</div><div class="wb-profile-info"><div class="wb-profile-name">'+acc.name+vBadge+'</div><div class="wb-profile-desc">'+acc.desc+'</div></div></div><div class="wb-profile-stats"><div class="wb-profile-stat"><div class="wb-profile-stat-num">'+(acc.following||0)+'</div><div class="wb-profile-stat-label">关注</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">'+(acc.followers||0)+'</div><div class="wb-profile-stat-label">粉丝</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">'+accPosts.length+'</div><div class="wb-profile-stat-label">微博</div></div></div></div>'+postsHTML+'</div></div>';
}

function renderWbMessages(){
    if(!wbData.messages || wbData.messages.length===0) return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'home\')">'+IC.back+'</div><div class="wb-detail-title">消息</div></div><div class="wb-body" style="background:#fff;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">暂无消息</div>'+renderWbTabbar('msg')+'</div>';
    var list=wbData.messages.map(function(m){
        return '<div class="wb-msg-item"><div class="wb-msg-icon">'+WB_IC.likeSm+'</div><div class="wb-msg-text">'+m.text+'</div><div class="wb-msg-time">'+m.time+'</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'home\')">'+IC.back+'</div><div class="wb-detail-title">消息</div></div><div class="wb-body" style="background:#fff;">'+list+'</div>'+renderWbTabbar('msg')+'</div>';
}

function renderWbDmList(){
    if(!wbData.dms || wbData.dms.length===0) return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'messages\')">'+IC.back+'</div><div class="wb-detail-title">私信</div></div><div class="wb-body" style="background:#fff;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">暂无私信</div>'+renderWbTabbar('msg')+'</div>';
    var list=wbData.dms.map(function(d){
        return '<div class="wb-dm-item" onclick="wbNav(\'dm\',\''+d.id+'\')"><div class="wb-dm-avatar" style="background:'+d.color+'">'+d.avatar+'</div><div class="wb-dm-info"><div class="wb-dm-name">'+d.name+'</div><div class="wb-dm-preview">'+d.lastMsg+'</div></div><div class="wb-dm-time">'+d.time+'</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'messages\')">'+IC.back+'</div><div class="wb-detail-title">私信</div></div><div class="wb-body" style="background:#fff;">'+list+'</div>'+renderWbTabbar('msg')+'</div>';
}

function renderWbDm(){
    var dm=wbData.dms.find(function(d){return d.id===wbData.currentDmId;});
    if(!dm) return '';
    var msgs=dm.msgs.map(function(m){
        var self=m.sender===(typeof playerName!=='undefined'?playerName:'我');
        return '<div class="wx-msg-row'+(self?' self':'')+'"><div class="wx-msg-avatar" style="background:'+(self?(typeof playerColor!=='undefined'?playerColor:'#ff9eaa'):dm.color)+'">'+( self?(typeof playerName!=='undefined'?playerName[0]:'我'):dm.avatar)+'</div><div class="wx-bubble" style="background:'+(self?'#fff3ef':'#fff')+';color:#333;">'+m.text+'</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'dmlist\')">'+IC.back+'</div><div class="wb-detail-title">'+dm.name+'</div></div><div class="wechat-conversation" id="wb-dm-scroll">'+msgs+'</div><div class="wb-comment-input"><input id="wb-dm-input" placeholder="发送私信..." onkeydown="if(event.key===\'Enter\')wbSendDm()"><button class="wb-comment-send" onclick="wbSendDm()">发送</button></div></div>';
}

function renderWbProfile(idx){
    var pName = wbCurrentName();
    var pColor = wbCurrentColor();
    var p, isSelf;

    if (idx !== undefined) {
        // 看别人的主页
        p = wbData.feed[idx] || {};
        isSelf = ((p.name||p.author) === pName);
    } else {
        // 看自己的主页
        isSelf = true;
        p = { name: pName, avatar: pName[0], color: pColor };
    }

    // ★ 自己的主页：从 playerProfile 读取真实数据
    var desc = '这个人很懒 什么都没写';
    var following = 128, followers = 0, postCount = 0;
    if (isSelf && wbData.playerProfile) {
        desc = wbData.playerProfile.desc || desc;
        following = wbData.playerProfile.following || following;
        followers = wbData.playerProfile.followers || followers;
    }
    // ★ 自己发过的微博数量 = feed 中 name === playerName 的帖子数
    if (isSelf) {
        postCount = wbData.feed.filter(function(post){ return (post.name||post.author) === pName; }).length;
    } else {
        var authorName = p.name || p.author;
        postCount = wbData.feed.filter(function(post){ return (post.name||post.author) === authorName; }).length;
        // 别人的 desc 从 accounts 里找
        var acc = (wbData.accounts||[]).find(function(a){ return a.name === authorName; });
        if (acc) { desc = acc.desc || desc; followers = acc.followers || 0; following = acc.following || 0; }
    }

    var extra = isSelf ? '<div style="padding:12px 16px;"><div style="padding:10px;text-align:center;background:#fff3ef;border-radius:8px;color:#ff6b2b;font-size:13px;cursor:pointer;" onclick="wbNav(\'visitors\')">查看访客记录 →</div></div>' : '';

    // ★ 自己有多个账号时，显示账号切换入口
    var switchBtn = '';
    if (isSelf && wbData.playerAccounts && wbData.playerAccounts.length > 1) {
        switchBtn = '<div style="padding:8px 16px;"><div style="padding:10px;text-align:center;background:#f5f5f5;border-radius:8px;color:#666;font-size:13px;cursor:pointer;" onclick="wbNav(\'accountSwitch\')">切换账号 (' + wbData.playerAccounts.length + '个)</div></div>';
    }

    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'home\')">'+IC.back+'</div><div class="wb-detail-title">个人主页</div></div><div class="wb-body"><div class="wb-profile-header"><div class="wb-profile-top"><div class="wb-profile-avatar" style="background:'+(p.color||pColor)+'">'+(p.avatar||p.name[0]||pName[0])+'</div><div class="wb-profile-info"><div class="wb-profile-name">'+(p.name||p.author||pName)+'</div><div class="wb-profile-desc">'+desc+'</div></div></div><div class="wb-profile-stats"><div class="wb-profile-stat"><div class="wb-profile-stat-num">'+following+'</div><div class="wb-profile-stat-label">关注</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">'+wbFmtNum(followers)+'</div><div class="wb-profile-stat-label">粉丝</div></div><div class="wb-profile-stat"><div class="wb-profile-stat-num">'+postCount+'</div><div class="wb-profile-stat-label">微博</div></div></div></div>'+switchBtn+extra+'</div></div>';
}

function renderWbVisitors(){
    if(!wbData.visitors || wbData.visitors.length===0) return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'profile\')">'+IC.back+'</div><div class="wb-detail-title">访客记录</div></div><div class="wb-body" style="background:#fff;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">暂无访客</div></div>';
    var list=wbData.visitors.map(function(v){
        return '<div class="wb-visitor-item"><div class="wb-visitor-avatar" style="background:'+v.color+'">'+WB_IC.avatar+'</div><div class="wb-visitor-name">'+v.name+'</div><div class="wb-visitor-time">'+v.time+'</div></div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'profile\')">'+IC.back+'</div><div class="wb-detail-title">访客记录</div></div><div class="wb-body" style="background:#fff;">'+list+'</div></div>';
}

function renderWbPublish(){
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'home\')">'+IC.back+'</div><div class="wb-detail-title">发微博</div></div><div class="wb-publish-page"><textarea class="wb-publish-textarea" id="wb-pub-text" placeholder="分享新鲜事..."></textarea><button class="wb-publish-btn" onclick="wbPublish()">发布</button></div></div>';
}

// ★ 账号切换页面
function renderWbAccountSwitch() {
    var list = (wbData.playerAccounts||[]).map(function(a) {
       var self=m.sender===wbCurrentName();
return '<div class="wx-msg-row'+(self?' self':'')+'"><div class="wx-msg-avatar" style="background:'+(self?wbCurrentColor():dm.color)+'">'+(self?wbCurrentName()[0]:dm.avatar)+'</div><div class="wx-bubble" style="background:'+(self?'#fff3ef':'#fff')+';color:#333;">'+m.text+'</div></div>';
        return '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:0.5px solid #f5f5f5;cursor:pointer;" onclick="wbSwitchAccount(\''+a.id+'\')"><div class="wb-post-avatar" style="background:'+a.color+';color:#fff;font-size:14px;">'+a.avatar+'</div><div style="flex:1;"><div style="font-size:14px;font-weight:600;color:#1a1a1a;">'+a.name+'</div><div style="font-size:12px;color:#999;margin-top:2px;">'+a.desc+'</div></div>'+(isCurrent?'<span style="font-size:12px;color:#ff6b2b;">当前</span>':'')+'</div>';
    }).join('');
    return '<div class="weibo-container"><div class="wb-detail-nav"><div class="wb-detail-back" onclick="wbNav(\'profile\')">'+IC.back+'</div><div class="wb-detail-title">切换账号</div></div><div class="wb-body" style="background:#fff;">'+list+'</div></div>';
}

// ★ 获取微博模块当前活跃账号名/颜色（优先用切换后的小号，否则用全局）
function wbCurrentName() {
    return wbData._activeAccountName || (typeof playerName !== 'undefined' ? playerName : '玩家');
}
function wbCurrentColor() {
    return wbData._activeAccountColor || (typeof playerColor !== 'undefined' ? playerColor : '#ff9eaa');
}

// ★ 切换当前活跃微博账号
function wbSwitchAccount(accId) {
    var acc = (wbData.playerAccounts||[]).find(function(a){ return a.id === accId; });
    if (!acc) return;
    // ★ 只修改微博模块内部的当前账号变量，不篡改全局 playerName/playerColor
    wbData._activeAccountId = accId;
    wbData._activeAccountName = acc.name;
    wbData._activeAccountColor = acc.color;
    wbData.playerProfile = acc;
    wbNav('profile');
}

// ★ 动态添加玩家小号（由剧情驱动 —— 收到 PHONE_DATA 含 weibo_accounts 时调用）
function wbAddPlayerAccount(account) {
    if (!account || !account.name) return;
    var exists = (wbData.playerAccounts||[]).some(function(a){ return a.id === account.id || a.name === account.name; });
    if (exists) return;
    account.isPlayer = true;
    wbData.accounts.push(account);
    wbData.playerAccounts.push(account);
}

function wbLike(i,btn){
    var p=wbData.feed[i];
    if(p.liked){p.liked=false;p.likes--;}
    else{
        p.liked=true;p.likes++;
        if(btn){var anim=document.createElement('span');anim.className='wb-like-anim';anim.textContent='+1';btn.appendChild(anim);setTimeout(function(){anim.remove();},600);}
    }
    if(wbData.currentView==='home')wbNav('home');
    else wbNav('detail',wbData.currentPostIdx);
}

function wbComment(){
    var input=document.getElementById('wb-cmt-input');
    var t=input.value.trim();if(!t)return;
    if(!wbData.feed[wbData.currentPostIdx].comments) wbData.feed[wbData.currentPostIdx].comments=[];
    wbData.feed[wbData.currentPostIdx].comments.unshift({name:wbCurrentName(),text:t,time:'刚刚',likes:'0'});
    input.value='';
    wbNav('detail',wbData.currentPostIdx);
}

function wbSendDm(){
    var input=document.getElementById('wb-dm-input');
    var t=input.value.trim();if(!t)return;
    var dm=wbData.dms.find(function(d){return d.id===wbData.currentDmId;});
    dm.msgs.push({sender:wbCurrentName(),text:t});dm.lastMsg=t;
    input.value='';wbNav('dm',wbData.currentDmId);
}

function wbPublish(){
    var t=document.getElementById('wb-pub-text').value.trim();
    if(!t){alert('请输入内容');return;}
    var pn = wbCurrentName();
var pc = wbCurrentColor();
    wbData.feed.unshift({id:'p'+Date.now(),name:pn,avatar:pn[0],color:pc,verified:false,time:'刚刚',text:t,imgs:[],reposts:0,comments:[],likes:0,liked:false});
    wbNav('home');
}

function renderWbTabbar(active){
    var tabs=[
        {id:'home',label:'首页',icon:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 12l8-7 8 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V19a1 1 0 0 0 1 1h3.5v-4.5h3V20H17a1 1 0 0 0 1-1v-8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'},
        {id:'msg',label:'消息',icon:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'},
        {id:'dm',label:'私信',icon:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 7l9 5 9-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'},
        {id:'me',label:'我的',icon:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.8"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'}
    ];
    return '<div class="wb-tabbar">'+tabs.map(function(t){
        var cls=t.id===active?' active':'';
        var oc='';
        if(t.id==='home')oc='wbNav(\'home\')';
        else if(t.id==='msg')oc='wbNav(\'messages\')';
        else if(t.id==='dm')oc='wbNav(\'dmlist\')';
        else if(t.id==='me')oc='wbNav(\'profile\')';
        return '<div class="wb-tab-item'+cls+'" onclick="'+oc+'"><div class="wb-tab-icon">'+t.icon+'</div><span>'+t.label+'</span></div>';
    }).join('')+'</div>';
}