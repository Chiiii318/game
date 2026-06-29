// ══════════════════════════════════════
// T-Family 客户端 
// ══════════════════════════════════════

var tfData = {
    currentView: 'home',
    
    // 【死数据置空，由外部 AI 生成最新官方物料和动态】
    feed: []
};

function tfNav(view) {
    tfData.currentView = view;
    
    // 按需加载：如果没数据，向主系统呼叫 AI 生成高会动态！
    if (view === 'home' && (!tfData.feed || tfData.feed.length === 0)) {
        if(typeof requestAppData === 'function') requestAppData('tfamily');
    }

    var el = document.getElementById('screen-tfamily');
    if (view === 'home') el.innerHTML = renderTfHome();
    else if (view === 'mall') el.innerHTML = renderTfMall();
    else if (view === 'ticket') el.innerHTML = renderTfTicket();
    else if (view === 'me') el.innerHTML = renderTfMe();
}

function renderTfHome() {
    if(!tfData.feed || tfData.feed.length === 0) return '<div class="tf-container"><div class="tf-navbar"><div class="tf-navbar-left"><div class="tf-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="tf-navbar-center">T-FAMILY</div><div class="tf-navbar-right"><div class="tf-navbar-btn">'+IC.search+'</div></div></div><div class="tf-body" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;background:#f5f5f5;">加载高级会员物料中...</div>'+renderTfTabbar('home')+'</div>';
    
    var list = tfData.feed.map(function(p){
        var verifiedHtml = p.verified ? ' <span class="wb-post-vip" style="background:#000;"><svg width="8" height="8" viewBox="0 0 10 10" fill="none"><path d="M3 5l2 2 3-3" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' : '';
        return '<div class="wb-post" style="border-radius:0;margin-bottom:8px;"><div class="wb-post-header"><div class="wb-post-avatar" style="background:'+(p.color||'#333')+';color:#fff;font-size:14px;">'+(p.avatar||p.name[0])+'</div><div class="wb-post-info"><div class="wb-post-name" style="color:#000;">'+p.name+verifiedHtml+'</div><div class="wb-post-meta">'+p.time+'</div></div></div><div class="wb-post-content">'+p.text+'</div>'+wbImgs(p.imgs||[])+'<div class="wb-post-actions"><button class="wb-action-btn">'+WB_IC.repost+' '+(p.reposts||0)+'</button><button class="wb-action-btn">'+WB_IC.comment+' '+((p.comments||[]).length||p.commentCount||0)+'</button><button class="wb-action-btn">'+WB_IC.like+' '+(p.likes||0)+'</button></div></div>';
    }).join('');

    return '<div class="tf-container"><div class="tf-navbar"><div class="tf-navbar-left"><div class="tf-navbar-btn" onclick="goDesktop()">'+IC.back+'</div></div><div class="tf-navbar-center">T-FAMILY</div><div class="tf-navbar-right"><div class="tf-navbar-btn">'+IC.search+'</div></div></div><div class="tf-body" style="background:#f5f5f5;"><div class="tf-banner">⭐ 高级会员专享物料</div>'+list+'</div>'+renderTfTabbar('home')+'</div>';
}

function renderTfMall() {
    return '<div class="tf-container"><div class="tf-navbar"><div class="tf-navbar-left"></div><div class="tf-navbar-center">商城</div><div class="tf-navbar-right"></div></div><div class="tf-body" style="display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;background:#f5f5f5;">周边商品开发中...</div>'+renderTfTabbar('mall')+'</div>';
}

function renderTfTicket() {
    return '<div class="tf-container"><div class="tf-navbar"><div class="tf-navbar-left"></div><div class="tf-navbar-center">购票</div><div class="tf-navbar-right"></div></div><div class="tf-body" style="background:#f5f5f5;"><div style="margin:16px;padding:16px;background:#fff;border-radius:8px;"><div style="font-size:16px;font-weight:600;margin-bottom:8px;">2026 时代少年团 巡回演唱会</div><div style="font-size:13px;color:#666;margin-bottom:16px;">特权购票通道暂未开启</div><button style="width:100%;padding:10px;background:#ccc;color:#fff;border:none;border-radius:4px;font-size:14px;">暂无排期</button></div></div>'+renderTabbar('ticket')+'</div>';
}

function renderTfMe() {
    var pn = typeof playerName!=='undefined'?playerName:'玩家';
    return '<div class="tf-container"><div class="tf-navbar"><div class="tf-navbar-left"></div><div class="tf-navbar-center">我</div><div class="tf-navbar-right"></div></div><div class="tf-body" style="background:#f5f5f5;"><div style="background:#000;padding:30px 20px;display:flex;align-items:center;gap:16px;"><div style="width:60px;height:60px;border-radius:50%;background:#ff9eaa;color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;border:2px solid #333;">'+pn[0]+'</div><div><div style="font-size:18px;font-weight:600;color:#fff;display:flex;align-items:center;gap:8px;">'+pn+' <span style="font-size:10px;padding:2px 6px;background:linear-gradient(90deg,#e6c073,#f3d79f);color:#5e4313;border-radius:10px;">高级会员</span></div><div style="font-size:12px;color:rgba(255,255,255,0.6);margin-top:6px;">TF号：'+Math.floor(Math.random()*1000000)+'</div></div></div><div style="margin-top:12px;background:#fff;"><div style="padding:16px;border-bottom:0.5px solid #eee;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:15px;">我的订单</span><span style="color:#ccc;">></span></div><div style="padding:16px;border-bottom:0.5px solid #eee;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:15px;">我的票务</span><span style="color:#ccc;">></span></div><div style="padding:16px;display:flex;justify-content:space-between;align-items:center;"><span style="font-size:15px;">收货地址</span><span style="color:#ccc;">></span></div></div></div>'+renderTfTabbar('me')+'</div>';
}

function renderTfTabbar(active) {
    var tabs = [
        {id:'home',label:'首页',icon:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 3l2 5h5l-4 3 1.5 5L12 13l-4.5 3L9 11l-4-3h5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>'},
        {id:'mall',label:'商城',icon:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'},
        {id:'ticket',label:'购票',icon:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M3 10h18M3 14h18" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"/></svg>'},
        {id:'me',label:'我',icon:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'}
    ];
    return '<div class="tf-tabbar">'+tabs.map(function(t){
        var cls = t.id===active?' active':'';
        return '<div class="tf-tab-item'+cls+'" onclick="tfNav(\''+t.id+'\')"><div class="tf-tab-icon">'+t.icon+'</div><span>'+t.label+'</span></div>';
    }).join('')+'</div>';
}