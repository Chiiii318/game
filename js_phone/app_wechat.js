// ══════════════════════════════════════
// 微信客户端 
// ══════════════════════════════════════

var wxData = {
    currentView: 'chatlist', 
    currentChatId: null, 
    commentingIdx: -1,
    chats: [],
    conversations: {},
    moments: [],
    contacts: [],
    searchHistory: [],
    searchHot: []
};

function wxNav(view, data) {
    wxData.currentView = view;
    var el = document.getElementById('screen-wechat');

    // 通用数据请求钩子：如果没有数据，向外呼叫 AI
    if (view === 'chatlist' && wxData.chats.length === 0) {
        if(typeof requestAppData === 'function') requestAppData('wechat');
    }
    if (view === 'moments' && wxData.moments.length === 0) {
        if(typeof requestAppData === 'function') requestAppData('wechat_moments');
    }

    if (view === 'chatlist') el.innerHTML = renderChatlist();
    else if (view === 'myprofile') el.innerHTML = renderMyProfile();
    else if (view === 'conversation') { wxData.currentChatId = data; el.innerHTML = renderConversation(); setTimeout(function(){var s=document.getElementById('wx-conv-scroll');if(s)s.scrollTop=s.scrollHeight;},30); }
    else if (view === 'search') el.innerHTML = renderSearch();
    else if (view === 'contacts') el.innerHTML = renderContacts();
    else if (view === 'discover') el.innerHTML = renderDiscover();
    else if (view === 'moments') el.innerHTML = renderMoments();
    else if (view === 'publish') el.innerHTML = renderPublish();
    else if (view === 'me') el.innerHTML = renderMe();
    else if (view === 'profile') el.innerHTML = renderProfile(data);
}

function renderChatlist() {
    var sorted = wxData.chats.slice().sort(function(a,b){return (b.sortKey||0)-(a.sortKey||0);});
    var items = sorted.map(function(c){
        var av = '';
        if (c.isGroup) {
            var members = c.members || [];
            var colors = c.colors || [];
            var n = Math.min(members.length, 4);
            var cells = members.slice(0,n).map(function(m,i){return '<div class="avatar-cell" style="background:'+(colors[i]||'#ccc')+'">'+m+'</div>';}).join('');
            av = '<div class="wx-avatar-group members-'+n+'">'+cells+'</div>';
        } else { av = '<div class="wx-avatar-single" style="background:'+(c.color||'#07c160')+'">'+(c.avatar||c.name[0]||'未知')+'</div>'; }
        var badge = c.unread>0?'<div class="wx-badge">'+c.unread+'</div>':'';
        var name = c.name+(c.memberCount?'('+c.memberCount+')':'');
        return '<div class="wx-chat-item" onclick="wxNav(\'conversation\',\''+c.id+'\')"><div class="wx-avatar-wrap">'+av+badge+'</div><div class="wx-chat-info"><div class="wx-chat-top-row"><span class="wx-chat-name">'+name+'</span><span class="wx-chat-time">'+(c.time?formatChatTime(c.time):'')+'</span></div><div class="wx-chat-preview">'+(c.lastMsg||'')+'</div></div></div>';
    }).join('');
    
    if(!items) items = '<div style="text-align:center;padding:40px;color:#999;font-size:14px;">暂无聊天</div>';

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"></div><div class="wx-navbar-center">微信</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="showPlusMenu()">'+IC.plus+'</div></div></div>' +
        '<div class="wx-search-bar" onclick="wxNav(\'search\')"><div class="wx-search-inner">'+IC.search+'<span>搜索</span></div></div>' +
        '<div class="wx-body wx-chatlist">'+items+'</div>'+renderTabbar('chat')+'</div>';
}

function renderConversation() {
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;}) || {name:'未知'};
    var msgs = wxData.conversations[wxData.currentChatId]||[];
    var name = chat.name+(chat.memberCount?'('+chat.memberCount+')':'');
    var isGroup = chat.isGroup;

    var html = msgs.map(function(msg,idx){
        if (msg.type==='time') return '<div class="wx-msg-time">'+msg.text+'</div>';
        if (msg.type==='sys') return '<div class="wx-sys-msg">'+msg.text+'</div>';
        var self = msg.isSelf;
        var cls = self?'wx-msg-row self':'wx-msg-row';
        var avColor = self?(typeof playerColor!=='undefined'?playerColor:'#ff9eaa'):(msg.color||'#ccc');
        var avText = self?(typeof playerName!=='undefined'?playerName[0]:'我'):(msg.sender?msg.sender[0]:'?');
        var clickAv = '';
        if (!self && msg.sender) {
            var contact = findContact(msg.sender);
            if (contact) clickAv = ' onclick="wxNav(\'profile\',\''+contact.id+'\')"';
        }
        var nameH = (isGroup&&!self&&msg.sender)?'<div class="wx-msg-sender-name">'+msg.sender+'</div>':'';
        var content = '';
        if (msg.type==='voice') {
            var duration = msg.duration||2;
            var w = 80 + duration*12;
            content = '<div class="wx-voice-bubble" style="width:'+w+'px" onclick="toggleTranscript('+idx+')"><div class="wx-voice-icon">'+(self?IC.voiceRight:IC.voiceLeft)+'</div><span class="wx-voice-duration">'+duration+'"</span></div>';
            if (msg.transcript) content += '<div class="wx-voice-transcript" id="vt-'+idx+'">'+msg.transcript+'</div>';
        } else if (msg.type==='redpacket') {
            content = '<div class="wx-redpacket"><div class="wx-redpacket-top"><div class="wx-redpacket-icon">'+IC.redpacket+'</div><div class="wx-redpacket-text">'+(msg.text||'恭喜发财')+'</div></div><div class="wx-redpacket-bottom">微信红包</div></div>';
        } else if (msg.type==='transfer') {
            var st = msg.status||'pending';
            var stText = st==='pending'?'待收款':st==='received'?'已收款 ✓':'已退回';
            var topCls = st==='pending'?'pending':'done';
            var click = st==='pending'?' onclick="showTransferAction('+idx+')"':'';
            content = '<div class="wx-transfer"'+click+'><div class="wx-transfer-top '+topCls+'"><div class="wx-transfer-info"><div class="wx-transfer-amount">¥'+msg.amount+'</div><div class="wx-transfer-label">'+stText+'</div></div></div><div class="wx-transfer-bottom">'+(msg.note||'转账')+'</div></div>';
                } else if (msg.type === 'typing') {
            // 新增：正在输入的跳动气泡
            content = '<div class="wx-bubble typing-dots"><span>·</span><span>·</span><span>·</span></div>';
        } else {
            content = '<div class="wx-bubble">'+(msg.message||msg.text||'')+'</div>';
        }
        return '<div class="'+cls+'"><div class="wx-msg-avatar" style="background:'+avColor+'"'+clickAv+'>'+avText+'</div><div class="wx-msg-content">'+nameH+content+'</div></div>';
    }).join('');

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'chatlist\')">'+IC.back+'</div></div><div class="wx-navbar-center">'+name+'</div><div class="wx-navbar-right"><div class="wx-navbar-btn">'+IC.more+'</div></div></div>' +
        '<div class="wechat-conversation" id="wx-conv-scroll">'+html+'</div>' +
        '<div class="wx-input-bar"><div class="wx-input-btn">'+IC.mic+'</div><input id="wx-msg-input" placeholder="输入消息..." onkeydown="if(event.key===\'Enter\')sendMsg()"><div class="wx-input-btn" onclick="showPlusPanel()">'+IC.plusGray+'</div></div></div>';
}

function toggleTranscript(idx) {
    var el = document.getElementById('vt-'+idx);
    if (el) el.classList.toggle('show');
}

function showPlusMenu() {
    // 调用腾讯微信原生底部菜单
    weui.actionSheet([
        { label: '发起群聊', onClick: function () { console.log('点击发起群聊'); } },
        { label: '添加好友', onClick: function () { console.log('点击添加好友'); } },
        { label: '扫一扫', onClick: function () { console.log('点击扫一扫'); } },
        { label: '收付款', onClick: function () { console.log('点击收付款'); } }
    ], [
        { label: '取消', onClick: function () {} }
    ]);
}

function showPlusPanel() {
    var el = document.getElementById('screen-wechat');
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = function(e){if(e.target===overlay)overlay.remove();};
    overlay.innerHTML = '<div class="plus-panel"><div class="plus-panel-grid">'+
        '<div class="plus-panel-item" onclick="alert(\'功能开发中\')"><div class="plus-panel-icon">'+IC.photo+'</div><div class="plus-panel-label">相册</div></div>'+
        '<div class="plus-panel-item" onclick="alert(\'功能开发中\')"><div class="plus-panel-icon">'+IC.shoot+'</div><div class="plus-panel-label">拍摄</div></div>'+
        '<div class="plus-panel-item" onclick="alert(\'功能开发中\')"><div class="plus-panel-icon">'+IC.redpacket.replace(/#fff/g,"#666")+'</div><div class="plus-panel-label">红包</div></div>'+
        '<div class="plus-panel-item" onclick="this.closest(\'.overlay\').remove();showTransferModal()"><div class="plus-panel-icon">'+IC.transfer+'</div><div class="plus-panel-label">转账</div></div>'+
        '<div class="plus-panel-item" onclick="alert(\'功能开发中\')"><div class="plus-panel-icon">'+IC.location+'</div><div class="plus-panel-label">位置</div></div>'+
        '<div class="plus-panel-item" onclick="alert(\'功能开发中\')"><div class="plus-panel-icon">'+IC.card+'</div><div class="plus-panel-label">名片</div></div>'+
        '</div></div>';
    el.querySelector('.wechat-container').appendChild(overlay);
}

function showTransferModal() {
    var el = document.getElementById('screen-wechat');
    var modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = '<div class="modal-box"><div class="modal-title">转账</div><input class="modal-input" id="tf-amount" placeholder="金额" type="number"><input class="modal-input" id="tf-note" placeholder="留言（选填）"><div class="modal-btns"><button class="modal-btn cancel" onclick="this.closest(\'.modal-overlay\').remove()">取消</button><button class="modal-btn confirm" onclick="doTransfer()">转账</button></div></div>';
    el.querySelector('.wechat-container').appendChild(modal);
}

function doTransfer() {
    var amount = document.getElementById('tf-amount').value;
    var note = document.getElementById('tf-note').value||'转账';
    if (!amount||isNaN(amount)||Number(amount)<=0) { alert('请输入有效金额'); return; }
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs) { msgs = []; wxData.conversations[wxData.currentChatId] = msgs; }
    msgs.push({isSelf:true,type:'transfer',amount:Number(amount).toFixed(2),note:note,status:'pending'});
    document.querySelector('.modal-overlay').remove();
    wxNav('conversation',wxData.currentChatId);
}

function showTransferAction(idx) {
    var el = document.getElementById('screen-wechat');
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = function(e){if(e.target===overlay)overlay.remove();};
    overlay.innerHTML = '<div class="action-sheet"><div class="action-sheet-item" onclick="acceptTransfer('+idx+');this.closest(\'.overlay\').remove()">收款</div><div class="action-sheet-item" onclick="rejectTransfer('+idx+');this.closest(\'.overlay\').remove()">退回</div><div class="action-sheet-cancel" onclick="this.closest(\'.overlay\').remove()">取消</div></div>';
    el.querySelector('.wechat-container').appendChild(overlay);
}

function acceptTransfer(idx) {
    var msgs = wxData.conversations[wxData.currentChatId];
    msgs[idx].status = 'received';
    msgs.push({type:'sys',text:'对方已收款 ¥'+msgs[idx].amount});
    wxNav('conversation',wxData.currentChatId);
}

function rejectTransfer(idx) {
    var msgs = wxData.conversations[wxData.currentChatId];
    msgs[idx].status = 'rejected';
    msgs.push({type:'sys',text:'对方已退回转账'});
    wxNav('conversation',wxData.currentChatId);
}

function sendMsg() {
    var input = document.getElementById('wx-msg-input');
    var text = input.value.trim();
    if (!text) return;
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs) { msgs=[]; wxData.conversations[wxData.currentChatId]=msgs; }
    msgs.push({isSelf:true,message:text});
    input.value = '';
    
    var chat = wxData.chats.find(function(c){ return c.id === wxData.currentChatId; });
    if(chat) {
        chat.lastMsg = text;
        chat.sortKey = Date.now();
    }
        wxNav('conversation',wxData.currentChatId);

    // 显示"对方正在输入"气泡
    var typingChatId = wxData.currentChatId;
    var convArr = wxData.conversations[typingChatId];
    if (convArr) {
        convArr.push({type:'typing', isSelf:false, sender: chat ? chat.name : '?', color: chat ? chat.color : '#ccc'});
        wxNav('conversation', typingChatId);
    }

    if (typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
            type: 'PHONE_INTERACT',
            action: 'wechat_reply',
            chatId: wxData.currentChatId,
            chatName: chat ? chat.name : '未知',
            userMessage: text
        }, '*');
    }
}

function renderSearch() {
    var tags = (wxData.searchHistory||[]).map(function(t){return '<div class="wx-search-tag">'+t+'</div>';}).join('');
    var hots = (wxData.searchHot||[]).map(function(t,i){return '<div class="wx-search-hot-item"><span class="wx-search-hot-rank'+(i>=3?' normal':'')+'">'+( i+1)+'</span><span class="wx-search-hot-text">'+t+'</span></div>';}).join('');
    return '<div class="wechat-container"><div class="wx-search-top-bar"><input placeholder="搜索" autofocus><span class="wx-search-cancel" onclick="wxNav(\'chatlist\')">取消</span></div><div class="wx-body wx-search-page"><div class="wx-search-section"><div class="wx-search-section-title">最近搜索</div><div class="wx-search-tags">'+(tags||'<span style="color:#ccc;font-size:12px;">暂无历史</span>')+'</div></div><div class="wx-search-section"><div class="wx-search-section-title">热搜</div>'+(hots||'<span style="color:#ccc;font-size:12px;">暂无热搜</span>')+'</div></div></div>';
}

function renderContacts() {
    var html = (wxData.contacts||[]).map(function(g){
        var items = (g.items||[]).map(function(c){return '<div class="wx-contact-item" onclick="wxNav(\'profile\',\''+c.id+'\')"><div class="wx-contact-avatar" style="background:'+c.color+'">'+c.avatar+'</div><span class="wx-contact-name">'+c.name+'</span></div>';}).join('');
        return '<div class="wx-contact-letter">'+g.letter+'</div>'+items;
    }).join('');
    if(!html) html = '<div style="text-align:center;padding:40px;color:#999;font-size:14px;">暂无联系人</div>';
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"></div><div class="wx-navbar-center">通讯录</div><div class="wx-navbar-right"></div></div><div class="wx-search-bar" onclick="wxNav(\'search\')"><div class="wx-search-inner">'+IC.search+'<span>搜索</span></div></div><div class="wx-body wx-contacts-list">'+html+'</div>'+renderTabbar('contacts')+'</div>';
}

function renderDiscover() {
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"></div><div class="wx-navbar-center">发现</div><div class="wx-navbar-right"></div></div><div class="wx-body wx-discover-list">'+
        '<div class="wx-discover-item" onclick="wxNav(\'moments\')"><div class="wx-discover-icon">'+IC.moments+'</div><span class="wx-discover-name">朋友圈</span><div class="wx-discover-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-discover-gap"></div>'+
        '<div class="wx-discover-item"><div class="wx-discover-icon">'+IC.scan+'</div><span class="wx-discover-name">扫一扫</span><div class="wx-discover-arrow">'+IC.arrowR+'</div></div>'+
        '</div>'+renderTabbar('discover')+'</div>';
}

function renderMoments() {
    if (!wxData.moments || wxData.moments.length === 0) return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'discover\')">'+IC.back+'</div></div><div class="wx-navbar-center">朋友圈</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="wxNav(\'publish\')">'+IC.camera+'</div></div></div><div class="wx-body" style="display:flex;justify-content:center;align-items:center;color:#999;font-size:14px;">刷新朋友圈中...</div></div>';
    
    var list = wxData.moments.map(function(m,i){
        var likes = m.likes||[];
        var comments = m.comments||[];
        var likesH = likes.length>0?'<div class="wx-moment-likes-bar">'+IC.heart+' '+likes.join('、')+'</div>':'';
        var commH = comments.length>0?'<div class="wx-moment-comments">'+comments.map(function(c){return '<div class="wx-moment-comment-item"><span class="comment-author">'+(c.author||c.name)+'：</span>'+c.text+'</div>';}).join('')+'</div>':'';
        var likedCls = m.liked?' liked':'';
        return '<div class="wx-moment-item"><div class="wx-moment-avatar" style="background:'+(m.color||'#ccc')+'">'+(m.avatar||m.name[0]||'网')+'</div><div class="wx-moment-body"><div class="wx-moment-name">'+m.name+'</div><div class="wx-moment-text">'+(m.text||m.content||'')+'</div><div class="wx-moment-meta"><span class="wx-moment-time-text">'+(m.time||'刚刚')+'</span><div class="wx-moment-btns"><span class="wx-moment-btn'+likedCls+'" onclick="toggleLike('+i+')">'+IC.heart+' 赞</span><span class="wx-moment-btn" onclick="startComment('+i+')">'+IC.comment+' 评论</span></div></div>'+likesH+commH+'</div></div>';
    }).join('');
    
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'discover\')">'+IC.back+'</div></div><div class="wx-navbar-center">朋友圈</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="wxNav(\'publish\')">'+IC.camera+'</div></div></div>'+
        '<div class="wx-moments-scroll"><div class="wx-moments-cover" onclick="alert(\'更换封面\')"><div class="wx-moments-me"><span class="wx-moments-my-name">'+(typeof playerName!=='undefined'?playerName:'我')+'</span><div class="wx-moments-my-avatar" style="background:'+(typeof playerColor!=='undefined'?playerColor:'#ff9eaa')+'">'+(typeof playerName!=='undefined'?playerName[0]:'我')+'</div></div></div><div class="wx-moments-list">'+list+'</div></div>'+
        '<div class="wx-moment-comment-input" id="wx-cmt-bar" style="display:none"><input id="wx-cmt-input" placeholder="评论..." onkeydown="if(event.key===\'Enter\')submitComment()"><button class="wx-moment-comment-send" onclick="submitComment()">发送</button></div></div>';
}

function toggleLike(i) { 
    var m = wxData.moments[i]; 
    if(!m.likes) m.likes=[];
    var pn = typeof playerName!=='undefined'?playerName:'我';
    if(m.liked){
        m.liked=false;
        m.likes=m.likes.filter(function(n){return n!==pn;});
    }else{
        m.liked=true;
        m.likes.unshift(pn);
    } 
    wxNav('moments'); 
}

function startComment(i) { 
    wxData.commentingIdx=i; 
    document.getElementById('wx-cmt-bar').style.display='flex'; 
    document.getElementById('wx-cmt-input').focus(); 
}

function submitComment() { 
    var t=document.getElementById('wx-cmt-input').value.trim(); 
    if(!t||wxData.commentingIdx<0)return; 
    if(!wxData.moments[wxData.commentingIdx].comments) wxData.moments[wxData.commentingIdx].comments=[];
    var pn = typeof playerName!=='undefined'?playerName:'我';
    wxData.moments[wxData.commentingIdx].comments.push({author:pn,text:t}); 
    wxData.commentingIdx=-1; 
    wxNav('moments'); 
}

function renderPublish() {
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'moments\')">'+IC.back+'</div></div><div class="wx-navbar-center"></div><div class="wx-navbar-right"></div></div><div class="wx-publish-page"><textarea class="wx-publish-textarea" id="wx-pub-text" placeholder="这一刻的想法..."></textarea><button class="wx-publish-btn" onclick="publishMoment()">发表</button></div></div>';
}

function publishMoment() {
    var t = document.getElementById('wx-pub-text').value.trim();
    if (!t) { alert('请输入内容'); return; }
    var pn = typeof playerName!=='undefined'?playerName:'我';
    var pc = typeof playerColor!=='undefined'?playerColor:'#ff9eaa';
    wxData.moments.unshift({name:pn, avatar:pn[0], color:pc, text:t, time:'刚刚', likes:[], liked:false, comments:[], isSelf:true});
    wxNav('moments');
}

function renderMe() {
    var pn = typeof playerName!=='undefined'?playerName:'我';
    var pc = typeof playerColor!=='undefined'?playerColor:'#ff9eaa';
    var pWxId = typeof playerWxId!=='undefined'?playerWxId:'player_001';
    
    return '<div class="wechat-container"><div class="wx-body wx-me-page"><div class="wx-me-header" onclick="wxNav(\'myprofile\')"><div class="wx-me-avatar" style="background:'+pc+'">'+pn[0]+'</div><div class="wx-me-info"><div class="wx-me-name">'+pn+'</div><div class="wx-me-id">微信号：'+pWxId+'</div></div><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-me-item" onclick="wxNav(\'moments\')"><div class="wx-me-item-icon">'+IC.moments+'</div><span class="wx-me-item-name">朋友圈</span><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-me-item"><div class="wx-me-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" stroke="#f5a623" stroke-width="1.4" stroke-linejoin="round"/></svg></div><span class="wx-me-item-name">收藏</span><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-item"><div class="wx-me-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" stroke="#576b95" stroke-width="1.4"/><circle cx="8.5" cy="9.5" r="2" stroke="#576b95" stroke-width="1.2"/><path d="M3 16l5-4 3 2 4-3 6 5" stroke="#576b95" stroke-width="1.2" stroke-linecap="round"/></svg></div><span class="wx-me-item-name">相册</span><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-me-item"><div class="wx-me-item-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#666" stroke-width="1.4"/><path d="M12 8v4l3 2" stroke="#666" stroke-width="1.3" stroke-linecap="round"/></svg></div><span class="wx-me-item-name">设置</span><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '</div>'+renderTabbar('me')+'</div>';
}

function renderMyProfile() {
    var colors = ['#ff9eaa','#ff6b81','#e08080','#f5a623','#f7b731','#80d4a8','#2fbd59','#5b8def','#6cb5f0','#4a52e0','#7c5ce7','#9b59b6','#a0a0a0','#333333'];
    var pc = typeof playerColor !== 'undefined' ? playerColor : '#ff9eaa';
    var pn = typeof playerName !== 'undefined' ? playerName : '我';
    var pid = typeof playerWxId !== 'undefined' ? playerWxId : 'player_001';

    var colorGrid = colors.map(function(c){
        var selected = c===pc ? ' style="border:2.5px solid #07c160;transform:scale(1.15);"' : '';
        return '<div onclick="changeAvatar(\''+c+'\')" style="width:36px;height:36px;border-radius:50%;background:'+c+';cursor:pointer;transition:transform 0.15s;"'+selected+'></div>';
    }).join('');

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'me\')">'+IC.back+'</div></div><div class="wx-navbar-center">个人信息</div><div class="wx-navbar-right"></div></div>'+
        '<div class="wx-body wx-profile-page">'+
        '<div style="padding:20px 16px;background:#fff;display:flex;align-items:center;gap:14px;border-bottom:0.5px solid rgba(0,0,0,0.04);"><div style="width:60px;height:60px;border-radius:10px;background:'+pc+';display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;">'+pn[0]+'</div><div style="flex:1;"><div style="font-size:17px;font-weight:600;color:#000;">'+pn+'</div><div style="font-size:13px;color:#999;margin-top:4px;">微信号：'+pid+'</div></div></div>'+
        '<div style="height:8px;background:#f5f5f5;"></div>'+
        '<div class="wx-profile-item" onclick="editName()"><span class="wx-profile-item-name">更改昵称</span><div class="wx-profile-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div style="padding:16px;background:#fff;"><div style="font-size:14px;color:#666;margin-bottom:12px;">选择头像颜色</div><div style="display:flex;flex-wrap:wrap;gap:12px;">'+colorGrid+'</div></div>'+
        '</div></div>';
}

function changeAvatar(color) {
    var oldColor = typeof playerColor!=='undefined'?playerColor:'#ff9eaa';
    if(typeof window.playerColor !== 'undefined') window.playerColor = color;
    wxData.moments.forEach(function(m){
        if(m.isSelf || m.color===oldColor) m.color = color;
    });
    wxNav('myprofile');
}

function confirmEditName() {
    var input = document.getElementById('edit-name-input');
    var newName = input.value.trim();
    if (!newName) { alert('昵称不能为空'); return; }
    var oldName = typeof playerName!=='undefined'?playerName:'我';
    if(typeof window.playerName !== 'undefined') window.playerName = newName;
    wxData.moments.forEach(function(m){
        if(m.isSelf || m.name===oldName) { m.name = newName; m.avatar = newName[0]; }
    });
    if(document.querySelector('.modal-overlay')) document.querySelector('.modal-overlay').remove();
    wxNav('myprofile');
}

function editName() {
    var currentName = typeof playerName!=='undefined'?playerName:'我';
    var newName = prompt('修改微信名', currentName);
    if (newName && newName.trim()) {
        if(typeof window.playerName !== 'undefined') window.playerName = newName.trim();
        var pn = newName.trim();
        wxData.moments.forEach(function(m){ if(m.name==='玩家'||(m.color==='#ff9eaa'&&m.avatar===m.name[0])) { m.name=pn; m.avatar=pn[0]; }});
        wxNav('me');
    }
}

function renderProfile(contactId) {
    var contact = null;
    wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){ if(c.id===contactId) contact=c; }); });
    if (!contact) { wxNav('contacts'); return ''; }
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'contacts\')">'+IC.back+'</div></div><div class="wx-navbar-center">'+contact.name+'</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="showProfileMore(\''+contactId+'\')">'+IC.more+'</div></div></div>'+
        '<div class="wx-body wx-profile-page"><div class="wx-profile-header"><div class="wx-profile-avatar" style="background:'+contact.color+'">'+contact.avatar+'</div><div class="wx-profile-info"><div class="wx-profile-name">'+contact.name+'</div><div class="wx-profile-detail">微信号：'+contact.id+'_wx</div></div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-profile-item"><span class="wx-profile-item-name">朋友资料</span><div class="wx-profile-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-profile-item"><span class="wx-profile-item-name">朋友圈</span><div class="wx-profile-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-profile-actions"><div class="wx-profile-action-btn" onclick="goChat(\''+contactId+'\')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-4l-4 3.5V16H7a3 3 0 0 1-3-3V6z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg> 发消息</div><div class="wx-profile-action-btn secondary">'+IC.phone+' 音视频通话</div></div>'+
        '</div></div>';
}

function goChat(contactId) {
    var chatExists = wxData.chats.find(function(c){return c.id===contactId;});
    if (chatExists) { wxNav('conversation', contactId); }
    else { alert('暂无聊天记录'); }
}

function showProfileMore(contactId) {
    var el = document.getElementById('screen-wechat');
    var overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.onclick = function(e){if(e.target===overlay)overlay.remove();};
    overlay.innerHTML = '<div class="action-sheet"><div class="action-sheet-item">编辑备注</div><div class="action-sheet-item">设置权限</div><div class="action-sheet-item">推荐给朋友</div><div class="action-sheet-item">设为星标朋友</div><div class="action-sheet-item">加入黑名单</div><div class="action-sheet-item">投诉</div><div class="action-sheet-item danger">删除联系人</div><div class="action-sheet-cancel" onclick="this.closest(\'.overlay\').remove()">取消</div></div>';
    el.querySelector('.wechat-container').appendChild(overlay);
}

function findContact(name) {
    var found = null;
    wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){ if(c.name===name) found=c; }); });
    return found;
}

function renderTabbar(active) {
    var tabs = [
        {id:'chat',label:'微信',icon:'<svg width="23" height="23" viewBox="0 0 24 24" fill="none"><path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-4l-4 3.5V16H7a3 3 0 0 1-3-3V6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'},
        {id:'contacts',label:'通讯录',icon:'<svg width="23" height="23" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 20c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'},
        {id:'discover',label:'发现',icon:'<svg width="23" height="23" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M10 14l1.5-5 5-1.5-1.5 5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>'},
        {id:'me',label:'我',icon:'<svg width="23" height="23" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'}
    ];
    return '<div class="wx-tabbar">'+tabs.map(function(t){
        var cls = t.id===active?' active':'';
        return '<div class="wx-tab-item'+cls+'" onclick="wxSwitchTab(\''+t.id+'\')"><div class="wx-tab-icon">'+t.icon+'</div><span>'+t.label+'</span></div>';
    }).join('')+'</div>';
}

function wxSwitchTab(id) {
    if (id==='chat') wxNav('chatlist');
    else if (id==='contacts') wxNav('contacts');
    else if (id==='discover') wxNav('discover');
    else if (id==='me') wxNav('me');
}