// ══════════════════════════════════════
// 小红书客户端 
// ══════════════════════════════════════

var xhsData = {
    currentView: 'home', currentNoteIdx: -1,
    
    // 【修改点】：死数据置空
    notes: []
};

var XHS_IC = {
    like:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    likeFilled:'<svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" fill="#ff2442" stroke="#ff2442" stroke-width="2" stroke-linejoin="round"/></svg>',
    star:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    comment:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'
};

function xhsFmtNum(n){if(typeof n==='string')return n;if(n>=10000)return(n/10000).toFixed(1).replace('.0','')+'w';return String(n||0);}

function xhsNav(view, data) {
    xhsData.currentView = view;
    
    // 【修改点】：如果没数据，向AI呼叫！
    if (view === 'home' && (!xhsData.notes || xhsData.notes.length === 0)) {
        if(typeof requestAppData==='function') requestAppData('redbook');
    }

    var el = document.getElementById('screen-redbook');
    if(view==='home') el.innerHTML = renderXhsHome();
    else if(view==='detail') { xhsData.currentNoteIdx = data; el.innerHTML = renderXhsDetail(); }
    else if(view==='publish') el.innerHTML = renderXhsPublish();
    else if(view==='me') el.innerHTML = renderXhsMe();
}

function renderXhsHome() {
    if(!xhsData.notes || xhsData.notes.length===0) return '<div class="xhs-container"><div class="xhs-navbar"><div class="xhs-navbar-left"><div class="xhs-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="xhs-navbar-tabs"><span class="xhs-nav-tab">关注</span><span class="xhs-nav-tab active">发现</span><span class="xhs-nav-tab">重庆</span></div><div class="xhs-navbar-right"><div class="xhs-navbar-btn">'+IC.search+'</div></div></div><div class="xhs-body" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;background:#f5f5f5;">刷新笔记中...</div>'+renderXhsTabbar('home')+'</div>';
    
    var col1 = '', col2 = '';
    xhsData.notes.forEach(function(n, i){
        var h = n.height || [160, 200, 240][i % 3]; // 模拟瀑布流高度
        var html = '<div class="xhs-note-card" onclick="xhsNav(\'detail\','+i+')"><div class="xhs-card-img" style="height:'+h+'px;background:'+(n.color||'#ccc')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:30px;">📷</div><div class="xhs-card-info"><div class="xhs-card-title">'+n.title+'</div><div class="xhs-card-bottom"><div class="xhs-card-user"><div class="xhs-card-avatar">'+(n.author?n.author[0]:'薯')+'</div><span class="xhs-card-name">'+(n.author||n.user||'小红薯')+'</span></div><div class="xhs-card-like" onclick="event.stopPropagation();xhsLike('+i+',this)">'+(n.liked?XHS_IC.likeFilled:XHS_IC.like)+' <span>'+xhsFmtNum(n.likes)+'</span></div></div></div></div>';
        if (i % 2 === 0) col1 += html; else col2 += html;
    });

    return '<div class="xhs-container"><div class="xhs-navbar"><div class="xhs-navbar-left"><div class="xhs-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="xhs-navbar-tabs"><span class="xhs-nav-tab">关注</span><span class="xhs-nav-tab active">发现</span><span class="xhs-nav-tab">重庆</span></div><div class="xhs-navbar-right"><div class="xhs-navbar-btn">'+IC.search+'</div></div></div><div class="xhs-body xhs-waterfall"><div class="xhs-col">'+col1+'</div><div class="xhs-col">'+col2+'</div></div>'+renderXhsTabbar('home')+'</div>';
}

function renderXhsDetail() {
    var n = xhsData.notes[xhsData.currentNoteIdx];
    if(!n) return '';
    var cmts = (n.comments||[]).map(function(c,i){
        var isAuthor = c.name===(n.author||n.user) ? '<span class="xhs-author-tag">作者</span>' : '';
        return '<div class="xhs-cmt-item"><div class="xhs-cmt-avatar">'+c.name[0]+'</div><div class="xhs-cmt-body"><div class="xhs-cmt-name">'+c.name+isAuthor+'</div><div class="xhs-cmt-text">'+c.text+'</div><div class="xhs-cmt-meta"><span>'+(c.time||'刚刚')+'</span></div></div><div class="xhs-cmt-like" onclick="xhsLikeCmt('+i+',this)">'+XHS_IC.like+' <span style="display:block;text-align:center;font-size:10px;margin-top:2px;">'+(c.likes||0)+'</span></div></div>';
    }).join('');

    return '<div class="xhs-container"><div class="xhs-detail-nav"><div class="xhs-detail-back" onclick="xhsNav(\'home\')">'+IC.back+'</div><div class="xhs-d-user"><div class="xhs-d-avatar">'+(n.author?n.author[0]:'薯')+'</div><span class="xhs-d-name">'+(n.author||n.user)+'</span><div class="xhs-d-follow">关注</div></div><div class="xhs-detail-right">'+IC.more+'</div></div><div class="xhs-body" style="background:#fff;"><div class="xhs-d-img" style="background:'+(n.color||'#ccc')+';">📷</div><div class="xhs-d-content"><div class="xhs-d-title">'+n.title+'</div><div class="xhs-d-text">'+(n.desc||n.content||'').replace(/\n/g,'<br>')+'</div><div class="xhs-d-time">'+(n.time||'刚刚')+'</div></div><div class="xhs-d-comments"><div class="xhs-d-c-header">共 '+(n.comments||[]).length+' 条评论</div>'+(cmts||'<div style="text-align:center;padding:20px;color:#999;font-size:12px;">快来抢沙发~</div>')+'</div></div><div class="xhs-bottom-bar"><div class="xhs-input-box" onclick="document.getElementById(\'xhs-cmt-wrap\').style.display=\'flex\';document.getElementById(\'xhs-cmt-input\').focus();">说点什么...</div><div class="xhs-actions"><div class="xhs-action-item'+(n.liked?' liked':'')+'" onclick="xhsLike('+xhsData.currentNoteIdx+',this)">'+(n.liked?XHS_IC.likeFilled:XHS_IC.like)+' <span>'+xhsFmtNum(n.likes)+'</span></div><div class="xhs-action-item">'+XHS_IC.star+' <span>'+xhsFmtNum(n.stars||0)+'</span></div><div class="xhs-action-item">'+XHS_IC.comment+' <span>'+((n.comments||[]).length||0)+'</span></div></div></div><div class="xhs-comment-wrap" id="xhs-cmt-wrap" style="display:none;"><div class="xhs-cmt-mask" onclick="this.parentNode.style.display=\'none\'"></div><div class="xhs-cmt-box"><input id="xhs-cmt-input" placeholder="发条友善的评论" onkeydown="if(event.key===\'Enter\')xhsComment()"><button onclick="xhsComment()">发送</button></div></div></div>';
}

function renderXhsPublish() {
    return '<div class="xhs-container"><div class="xhs-detail-nav"><div class="xhs-detail-back" onclick="xhsNav(\'home\')">✕</div><div class="xhs-detail-right"><div class="xhs-pub-btn" onclick="xhsPublish()">发布</div></div></div><div class="xhs-pub-page"><div class="xhs-pub-img-add">+ 添加图片</div><input class="xhs-pub-title" id="xhs-pub-title" placeholder="填写标题会有更多赞哦~"><textarea class="xhs-pub-text" id="xhs-pub-text" placeholder="添加正文"></textarea></div></div>';
}

function renderXhsMe() {
    var pn = typeof playerName!=='undefined'?playerName:'玩家';
    return '<div class="xhs-container"><div class="xhs-navbar"><div class="xhs-navbar-left"><div class="xhs-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="xhs-navbar-center">我</div><div class="xhs-navbar-right"><div class="xhs-navbar-btn">'+IC.more+'</div></div></div><div class="xhs-body" style="background:#fff;"><div class="xhs-me-header"><div style="display:flex;gap:16px;align-items:center;"><div class="xhs-me-avatar">'+pn[0]+'</div><div><div class="xhs-me-name">'+pn+'</div><div class="xhs-me-id">小红书号：'+Math.floor(Math.random()*100000000)+'</div></div></div><div class="xhs-me-desc">点击填写简介</div><div class="xhs-me-stats"><div class="xhs-me-stat"><span>0</span>关注</div><div class="xhs-me-stat"><span>0</span>粉丝</div><div class="xhs-me-stat"><span>0</span>获赞与收藏</div></div><div style="display:flex;gap:12px;margin-top:16px;"><div style="flex:1;text-align:center;padding:6px;border:1px solid #eee;border-radius:20px;font-size:13px;font-weight:500;">编辑资料</div><div style="flex:1;text-align:center;padding:6px;border:1px solid #eee;border-radius:20px;font-size:13px;font-weight:500;">分享主页</div></div></div><div class="xhs-me-tabs"><span class="xhs-me-tab active">笔记</span><span class="xhs-me-tab">收藏</span><span class="xhs-me-tab">赞过</span></div><div style="text-align:center;padding:60px 0;color:#999;font-size:13px;">还没有发布过笔记</div></div>'+renderXhsTabbar('me')+'</div>';
}

function xhsLike(i, btn) {
    var n = xhsData.notes[i];
    if(n.liked){ n.liked=false; n.likes--; }
    else{
        n.liked=true; n.likes++;
        if(btn && xhsData.currentView==='home') {
            var anim = document.createElement('span'); anim.className = 'xhs-like-anim'; anim.textContent = '+1';
            btn.appendChild(anim); setTimeout(function(){anim.remove();},600);
        }
    }
    if(xhsData.currentView==='home') xhsNav('home');
    else xhsNav('detail', xhsData.currentNoteIdx);
}

function xhsLikeCmt(i, btn) {
    var n = xhsData.notes[xhsData.currentNoteIdx];
    n.comments[i].likes = (n.comments[i].likes||0) + 1;
    if(btn){ var anim = document.createElement('span'); anim.className = 'xhs-like-anim'; anim.textContent = '+1'; btn.appendChild(anim); setTimeout(function(){anim.remove();},600); }
    xhsNav('detail', xhsData.currentNoteIdx);
}

function xhsComment() {
    var input = document.getElementById('xhs-cmt-input');
    var t = input.value.trim(); if(!t) return;
    var n = xhsData.notes[xhsData.currentNoteIdx];
    if(!n.comments) n.comments=[];
    var pn = typeof playerName!=='undefined'?playerName:'玩家';
    n.comments.unshift({name:pn, text:t, time:'刚刚', likes:0});
    input.value = ''; document.getElementById('xhs-cmt-wrap').style.display='none';
    xhsNav('detail', xhsData.currentNoteIdx);
}

function xhsPublish() {
    var title = document.getElementById('xhs-pub-title').value.trim();
    var text = document.getElementById('xhs-pub-text').value.trim();
    if(!title||!text){alert('请填写标题和内容');return;}
    var pn = typeof playerName!=='undefined'?playerName:'玩家';
    xhsData.notes.unshift({title:title, desc:text, author:pn, time:'刚刚', likes:0, liked:false, comments:[], stars:0, color:'#ff9eaa'});
    xhsNav('home');
}

function renderXhsTabbar(active) {
    var tabs = [
        {id:'home',label:'首页'},
        {id:'shop',label:'购物'},
        {id:'add',label:'+'},
        {id:'msg',label:'消息'},
        {id:'me',label:'我'}
    ];
    return '<div class="xhs-tabbar">'+tabs.map(function(t){
        if(t.id==='add') return '<div class="xhs-tab-item" onclick="xhsNav(\'publish\')"><div class="xhs-tab-add">+</div></div>';
        var cls = t.id===active?' active':'';
        var oc = '';
        if(t.id==='home') oc = 'xhsNav(\'home\')';
        else if(t.id==='me') oc = 'xhsNav(\'me\')';
        return '<div class="xhs-tab-item'+cls+'" onclick="'+oc+'"><span>'+t.label+'</span></div>';
    }).join('')+'</div>';
}