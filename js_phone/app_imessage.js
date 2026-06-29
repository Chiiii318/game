// ══════════════════════════════════════
// iMessage 
// ══════════════════════════════════════

var imData = {
    currentView: 'list', 
    currentChatId: null,
    
    // 【修改点】：死数据置空，仅由外层触发通知时增加
    chats: []
};

function imNav(view, data) {
    imData.currentView = view;
    var el = document.getElementById('screen-imessage');
    
    // 【修改点】：短信一般不需要像微博那样去大模型“硬凑”数据，
    // 如果为空，只渲染空列表界面。它的数据通常由游戏主线剧情强制下发（比如银行扣费）。
    
    if (view === 'list') el.innerHTML = renderImList();
    else if (view === 'chat') { 
        imData.currentChatId = data; 
        el.innerHTML = renderImChat(); 
    }
}

function renderImList() {
    var items = '';
    if (!imData.chats || imData.chats.length === 0) {
        items = '<div style="text-align:center;padding:100px 0;color:#999;font-size:14px;">暂无信息</div>';
    } else {
        var sorted = imData.chats.slice().sort(function(a,b){return (b.sortKey||0)-(a.sortKey||0);});
        items = sorted.map(function(c){
            var av = '<div class="im-avatar" style="background:'+(c.color||'#8e8e93')+';">'+(c.avatar||c.name[0]||'#')+'</div>';
            var badge = c.unread>0?'<div class="im-badge"></div>':'';
            var timeStr = c.time ? formatChatTime(c.time) : '刚刚';
            return '<div class="im-list-item" onclick="imNav(\'chat\',\''+c.id+'\')"><div class="im-avatar-wrap">'+av+badge+'</div><div class="im-list-info"><div class="im-list-top"><span class="im-list-name">'+c.name+'</span><span class="im-list-time">'+timeStr+'</span></div><div class="im-list-preview">'+c.lastMsg+'</div></div><div class="im-list-arrow">'+IC.arrowR+'</div></div>';
        }).join('');
    }

    return '<div class="im-container"><div class="im-navbar"><div class="im-navbar-left"><span style="color:#007aff;font-size:16px;cursor:pointer;" onclick="goDesktop()">编辑</span></div><div class="im-navbar-center">信息</div><div class="im-navbar-right"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="#007aff" stroke-width="1.8" stroke-linejoin="round"/></svg></div></div><div class="im-search-bar"><div class="im-search-inner">'+IC.search+'<span>搜索</span></div></div><div class="im-body im-list-page">'+items+'</div></div>';
}

function renderImChat() {
    var chat = imData.chats.find(function(c){return c.id===imData.currentChatId;}) || {name:'未知号码'};
    var msgs = chat.msgs || [];
    
    var html = msgs.map(function(msg){
        if(msg.type==='time') return '<div class="im-msg-time">'+msg.text+'</div>';
        var self = msg.isSelf;
        var cls = self?'im-msg-row self':'im-msg-row';
        var bubbleCls = self?'im-bubble self':'im-bubble';
        return '<div class="'+cls+'"><div class="'+bubbleCls+'">'+msg.text+'</div></div>';
    }).join('');

    return '<div class="im-container"><div class="im-navbar" style="background:rgba(249,249,249,0.94);border-bottom:0.5px solid #d1d1d6;"><div class="im-navbar-left" onclick="imNav(\'list\')"><div class="im-navbar-btn" style="color:#007aff;">'+IC.back+' <span style="font-size:16px;">信息</span></div></div><div class="im-navbar-center" style="display:flex;flex-direction:column;align-items:center;line-height:1.2;"><div style="width:26px;height:26px;border-radius:50%;background:'+(chat.color||'#8e8e93')+';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;margin-bottom:2px;">'+(chat.avatar||chat.name[0]||'#')+'</div><div style="font-size:10px;font-weight:400;color:#000;">'+chat.name+'</div></div><div class="im-navbar-right"></div></div><div class="im-body im-chat-page" id="im-chat-scroll">'+html+'</div><div class="im-input-bar"><div class="im-input-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="13" rx="2" stroke="#8e8e93" stroke-width="1.5"/><circle cx="12" cy="12.5" r="3" stroke="#8e8e93" stroke-width="1.5"/></svg></div><div class="im-input-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6z" stroke="#8e8e93" stroke-width="1.5"/><path d="M4 14l5-4 4 3 3-2 4 4" stroke="#8e8e93" stroke-width="1.5" stroke-linejoin="round"/></svg></div><div class="im-input-box"><input placeholder="短信/彩信" disabled><div class="im-input-send"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" fill="#34c759"/><path d="M12 7v10M8 11l4-4 4 4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div></div></div></div>';
}