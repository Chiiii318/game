// ══════════════════════════════════════
// 抖音客户端 
// ══════════════════════════════════════

var dyData = {
    currentView: 'feed', currentVideoIdx: 0,
    
    // 【修改点】：死数据置空
    videos: []
};

var DY_IC = {
    heart:'<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/></svg>',
    comment:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" fill="currentColor"/></svg>',
    star:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/></svg>',
    share:'<svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M15 5l6 7-6 7M21 12H3" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function dyFmtNum(n){if(typeof n==='string')return n;if(n>=10000)return(n/10000).toFixed(1).replace('.0','')+'w';return String(n||0);}

function dyNav(view) {
    dyData.currentView = view;
    
    // 【修改点】：如果没数据，向AI呼叫！
    if (view === 'feed' && (!dyData.videos || dyData.videos.length === 0)) {
        if(typeof requestAppData==='function') requestAppData('douyin');
    }

    var el = document.getElementById('screen-douyin');
    if(view==='feed') el.innerHTML = renderDyFeed();
}

function renderDyFeed() {
    if(!dyData.videos || dyData.videos.length===0) return '<div class="douyin-container"><div class="dy-navbar"><div class="dy-nav-left" onclick="goDesktop()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="dy-nav-center"><span class="dy-nav-tab">同城</span><span class="dy-nav-tab">关注</span><span class="dy-nav-tab active">推荐</span></div><div class="dy-nav-right">'+IC.search.replace(/b0b0b0/g,'fff')+'</div></div><div class="dy-body" style="display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.6);font-size:15px;background:#000;">刷新推荐中...</div>'+renderDyTabbar('home')+'</div>';
    
    var v = dyData.videos[dyData.currentVideoIdx];
    if(!v) return '';
    var dmHtml = (v.danmaku||[]).map(function(d,i){
        var top = 20 + (i%5)*10;
        var delay = Math.random()*3;
        var dur = 5 + Math.random()*3;
        return '<div class="dy-danmaku-item" style="top:'+top+'%; animation: dy-scroll '+dur+'s linear '+delay+'s infinite;">'+d+'</div>';
    }).join('');

    return '<div class="douyin-container"><div class="dy-navbar"><div class="dy-nav-left" onclick="goDesktop()"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="dy-nav-center"><span class="dy-nav-tab">同城</span><span class="dy-nav-tab">关注</span><span class="dy-nav-tab active">推荐</span></div><div class="dy-nav-right">'+IC.search.replace(/b0b0b0/g,'fff')+'</div></div><div class="dy-body" id="dy-video-area"><div class="dy-video-bg" style="background:'+(v.color||'#333')+'">▶</div><div class="dy-danmaku-layer">'+dmHtml+'</div><div class="dy-right-bar"><div class="dy-avatar-wrap"><div class="dy-avatar">'+(v.author||v.user)[0]+'</div><div class="dy-follow-btn">+</div></div><div class="dy-action-item'+(v.liked?' liked':'')+'" onclick="dyLike(this)">'+DY_IC.heart+'<span class="dy-action-text">'+dyFmtNum(v.likes)+'</span></div><div class="dy-action-item" onclick="dyShowComments()">'+DY_IC.comment+'<span class="dy-action-text">'+dyFmtNum((v.comments||[]).length||v.commentCount||0)+'</span></div><div class="dy-action-item">'+DY_IC.star+'<span class="dy-action-text">'+dyFmtNum(v.stars||0)+'</span></div><div class="dy-action-item">'+DY_IC.share+'<span class="dy-action-text">'+dyFmtNum(v.shares||0)+'</span></div><div class="dy-record">🎵</div></div><div class="dy-info-bar"><div class="dy-author">@'+(v.author||v.user)+'</div><div class="dy-desc">'+(v.desc||'').replace(/#([^#\s]+)/g,'<span class="dy-tag">#$1</span>')+'</div><div class="dy-music-row"><span style="display:inline-block;animation:dy-spin 3s linear infinite;">🎵</span> <span>'+(v.author||v.user)+'创作的原声</span></div></div></div><div class="dy-comments-panel" id="dy-comments-panel"><div class="dy-comments-mask" onclick="this.parentNode.classList.remove(\'show\')"></div><div class="dy-comments-content"><div class="dy-c-header">共 '+((v.comments||[]).length||0)+' 条评论<span class="dy-c-close" onclick="this.closest(\'.dy-comments-panel\').classList.remove(\'show\')">✕</span></div><div class="dy-c-list" id="dy-c-list">'+((v.comments||[]).map(function(c){return '<div class="dy-c-item"><div class="dy-c-avatar">'+c.name[0]+'</div><div class="dy-c-body"><div class="dy-c-name">'+c.name+'</div><div class="dy-c-text">'+c.text+'</div><div class="dy-c-meta"><span>'+(c.time||'刚刚')+'</span></div></div>'<div class="dy-c-like"><svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg> <span style="font-size:11px;">'+(c.likes||0)+'</span></div>'</div>';}).join('')||'<div style="text-align:center;padding:20px;color:#999;font-size:12px;">暂无评论</div>')+'</div><div class="dy-c-input"><input id="dy-cmt-input" placeholder="留下你的精彩评论吧" onkeydown="if(event.key===\'Enter\')dyComment()"><button onclick="dyComment()">发送</button></div></div></div>'+renderDyTabbar('home')+'</div>';
}

function dyLike(btn) {
    var v = dyData.videos[dyData.currentVideoIdx];
    if(v.liked){ v.liked=false; v.likes--; btn.classList.remove('liked'); }
    else{ v.liked=true; v.likes++; btn.classList.add('liked'); }
    btn.querySelector('.dy-action-text').textContent = dyFmtNum(v.likes);
}

function dyShowComments() {
    document.getElementById('dy-comments-panel').classList.add('show');
}

function dyComment() {
    var input = document.getElementById('dy-cmt-input');
    var t = input.value.trim(); if(!t) return;
    var v = dyData.videos[dyData.currentVideoIdx];
    if(!v.comments) v.comments=[];
    var pn = typeof playerName!=='undefined'?playerName:'玩家';
    v.comments.unshift({name:pn, text:t, time:'刚刚', likes:0});
    dyNav('feed');
    setTimeout(dyShowComments, 50);
}

function renderDyTabbar(active) {
    var tabs = [
        {id:'home',label:'首页'}, {id:'friend',label:'朋友'},
        {id:'add',label:'+'}, {id:'msg',label:'消息'}, {id:'me',label:'我'}
    ];
    return '<div class="dy-tabbar">'+tabs.map(function(t){
        if(t.id==='add') return '<div class="dy-tab-item"><div class="dy-tab-add"><span>+</span></div></div>';
        var cls = t.id===active?' active':'';
        return '<div class="dy-tab-item'+cls+'"><span>'+t.label+'</span></div>';
    }).join('')+'</div>';
}

// 监听上下滑动切换视频
document.addEventListener('DOMContentLoaded', function() {
    var dyArea = null;
    var startY = 0;
    document.addEventListener('touchstart', function(e){
        dyArea = e.target.closest('#dy-video-area');
        if(dyArea) startY = e.touches[0].clientY;
    }, {passive:true});
       document.addEventListener('touchend', function(e){
        if(!dyArea || !dyData.videos || dyData.videos.length<=1) return;
        var endY = e.changedTouches[0].clientY;
        var diff = startY - endY;
        if(Math.abs(diff) > 50) {
            // 加过渡动画
            var direction = diff > 0 ? -1 : 1; // 上滑=-1，下滑=1
            dyArea.style.transition = 'transform 0.3s ease';
            dyArea.style.transform = 'translateY(' + (direction * 100) + '%)';
            setTimeout(function(){
                if(diff > 0) {
                    dyData.currentVideoIdx = (dyData.currentVideoIdx + 1) % dyData.videos.length;
                } else {
                    dyData.currentVideoIdx = (dyData.currentVideoIdx - 1 + dyData.videos.length) % dyData.videos.length;
                }
                dyNav('feed');
            }, 300);
        }
        dyArea = null;
    }, {passive:true});
});