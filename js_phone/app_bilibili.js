// ══════════════════════════════════════
// B站客户端 
// ══════════════════════════════════════

var biliData = {
    currentView: 'home',
    
    // 【修改点】：死数据置空
    videos: []
};

function biliNav(view) {
    biliData.currentView = view;
    
    // 【修改点】：如果没数据，向AI呼叫！
    if (view === 'home' && (!biliData.videos || biliData.videos.length === 0)) {
        if(typeof requestAppData==='function') requestAppData('bilibili');
    }

    var el = document.getElementById('screen-bilibili');
    if(view==='home') el.innerHTML = renderBiliHome();
}

function renderBiliHome() {
    if(!biliData.videos || biliData.videos.length===0) return '<div class="bilibili-container"><div class="bili-navbar"><div class="bili-nav-left" onclick="goDesktop()"><div class="bili-avatar" style="background:#fb7299;color:#fff;">'+(typeof playerName!=='undefined'?playerName[0]:'玩')+'</div></div><div class="bili-nav-center"><div class="bili-search-box">'+IC.search+' <span>搜索你感兴趣的视频</span></div></div><div class="bili-nav-right"><span style="color:#fb7299;font-weight:600;font-size:13px;">游戏</span> <span style="color:#fb7299;font-weight:600;font-size:13px;margin-left:12px;">✉</span></div></div><div class="bili-tabs"><span class="bili-tab">直播</span><span class="bili-tab active">推荐</span><span class="bili-tab">热门</span><span class="bili-tab">动画</span><span class="bili-tab">影视</span></div><div class="bili-body" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;background:#f4f4f4;">刷视频中...</div>'+renderBiliTabbar('home')+'</div>';

    var list = biliData.videos.map(function(v, i){
        var bgHues = [340, 280, 200, 150];
        var bg = 'linear-gradient(135deg, hsl('+bgHues[i%4]+', 70%, 80%), hsl('+bgHues[(i+1)%4]+', 70%, 60%))';
        return '<div class="bili-card"><div class="bili-card-cover" style="background:'+bg+'"><div class="bili-cover-stats"><span>▶ '+(v.views||'10万')+'</span><span>≡ '+(v.danmaku||'1000')+'</span></div><div class="bili-cover-duration">'+(v.duration||'03:45')+'</div></div><div class="bili-card-info"><div class="bili-card-title">'+v.title+'</div><div class="bili-card-up"><span class="bili-up-icon">UP</span> '+(v.author||v.up)+'</div></div></div>';
    }).join('');

    return '<div class="bilibili-container"><div class="bili-navbar"><div class="bili-nav-left" onclick="goDesktop()"><div class="bili-avatar" style="background:#fb7299;color:#fff;">'+(typeof playerName!=='undefined'?playerName[0]:'我')+'</div></div><div class="bili-nav-center"><div class="bili-search-box">'+IC.search+' <span>搜索你感兴趣的视频</span></div></div><div class="bili-nav-right"><span style="color:#fb7299;font-weight:600;font-size:13px;">游戏</span> <span style="color:#fb7299;font-weight:600;font-size:13px;margin-left:12px;">✉</span></div></div><div class="bili-tabs"><span class="bili-tab">直播</span><span class="bili-tab active">推荐</span><span class="bili-tab">热门</span><span class="bili-tab">动画</span><span class="bili-tab">影视</span></div><div class="bili-body bili-grid">'+list+'</div>'+renderBiliTabbar('home')+'</div>';
}

function renderBiliTabbar(active) {
    var tabs = [
        {id:'home',label:'首页'}, {id:'dynamic',label:'动态'},
        {id:'add',label:'+'}, {id:'shop',label:'会员购'}, {id:'me',label:'我的'}
    ];
    return '<div class="bili-tabbar">'+tabs.map(function(t){
        if(t.id==='add') return '<div class="bili-tab-item"><div class="bili-tab-add">+</div></div>';
        var cls = t.id===active?' active':'';
        return '<div class="bili-tab-item'+cls+'"><span>'+t.label+'</span></div>';
    }).join('')+'</div>';
}