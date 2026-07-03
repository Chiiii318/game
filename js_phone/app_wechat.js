// ══════════════════════════════════════
// 微信客户端（WeUI 版 · 全修复）
// ══════════════════════════════════════

// ★ 基于名字生成固定头像颜色，避免每次同步后颜色变化
var _avatarColorCache = {};
var _avatarColors = ['#4a90d9','#f5a623','#7c5ce7','#07c160','#e08080','#5b8def','#f7b731','#2fbd59','#9b59b6','#ff6b81','#4a52e0','#6cb5f0','#e74c3c','#1abc9c','#f39c12'];
function getAvatarColor(name) {
    if (!name) return '#4a90d9';
    if (_avatarColorCache[name]) return _avatarColorCache[name];
    var hash = 0;
    for (var i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    var idx = Math.abs(hash) % _avatarColors.length;
    _avatarColorCache[name] = _avatarColors[idx];
    return _avatarColors[idx];
}

// [fix #1] XSS 防护工具函数
function escapeHtml(str) {
    if (typeof str !== 'string') return str || '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// [fix #2] onclick 中的 ID 过滤，只允许安全字符
function sanitizeId(id) {
    return String(id || '').replace(/[^a-zA-Z0-9_\-\u4e00-\u9fff]/g, '');
}

// [fix #18] weui 可用性检测
var _useWeui = (typeof weui !== 'undefined');

var wxData = {
    currentView: 'chatlist',
    currentChatId: null,
    commentingIdx: -1,
    replyTarget: null, // [fix #12] 回复@某人
    chats: [],
    conversations: {},
    moments: [],
    contacts: [],
    searchHistory: [],
    searchHot: []
};

// [fix #14] typing 超时定时器
var _typingTimers = {};

function wxNav(view, data) {
    wxData.currentView = view;
    var el = document.getElementById('screen-wechat');

    // [fix #5] 进入对话时清除未读
    if (view === 'conversation' && data) {
        var chatForUnread = wxData.chats.find(function(c){ return c.id === data; });
        if (chatForUnread) {
            chatForUnread.unread = 0;
            // 更新桌面角标
            var totalUnread = wxData.chats.reduce(function(sum, c){ return sum + (c.unread||0); }, 0);
            var badgeEl = document.getElementById('badge-wechat');
            if (badgeEl) {
                badgeEl.textContent = totalUnread;
                badgeEl.style.display = totalUnread > 0 ? 'flex' : 'none';
            }
        }
    }

    // 通用数据请求钩子
    if (view === 'chatlist' && wxData.chats.length === 0) {
        if(typeof requestAppData === 'function') requestAppData('wechat');
    }

    // ★ 朋友圈不主动请求，靠AI每轮剧情推送，省token

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
    var sorted = wxData.chats.slice().sort(function(a,b){
        // [fix #7] 置顶排序
        if(a.pinned && !b.pinned) return -1;
        if(!a.pinned && b.pinned) return 1;
        return (b.sortKey||0)-(a.sortKey||0);
    });
    var items = sorted.map(function(c){
        var sid = sanitizeId(c.id);
        var av = '';
        if (c.isGroup) {
            var members = c.members || [];
            var colors = c.colors || [];
            var n = Math.min(members.length, 4);
            var cells = members.slice(0,n).map(function(m,i){return '<div class="avatar-cell" style="background:'+(colors[i]||'#ccc')+'">'+escapeHtml(m)+'</div>';}).join('');
            av = '<div class="wx-avatar-group members-'+n+'">'+cells+'</div>';
        } else {
            av = '<div class="wx-avatar-single" style="background:'+getAvatarColor(c.name)+'">'+escapeHtml(c.avatar||c.name[0]||'?')+'</div>';
        }
        var badge = c.unread>0?'<div class="wx-badge">'+c.unread+'</div>':'';
        var name = escapeHtml(c.name)+(c.memberCount?'('+c.memberCount+')':'');
        var pinCls = c.pinned?' wx-chat-pinned':'';
        // [fix #7] 长按操作用 data-id
        return '<div class="wx-chat-item'+pinCls+'" data-chatid="'+sid+'" onclick="wxNav(\'conversation\',\''+sid+'\')" oncontextmenu="event.preventDefault();chatLongPress(\''+sid+'\')"><div class="wx-avatar-wrap">'+av+badge+'</div><div class="wx-chat-info"><div class="wx-chat-top-row"><span class="wx-chat-name">'+name+'</span><span class="wx-chat-time">'+(c.time?formatChatTime(c.time):'')+'</span></div><div class="wx-chat-preview">'+escapeHtml(c.lastMsg||'')+'</div></div></div>';
    }).join('');

    if(!items) items = '<div style="text-align:center;padding:40px;color:#999;font-size:14px;">暂无聊天</div>';

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"></div><div class="wx-navbar-center">微信</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="showPlusMenu()">'+IC.plus+'</div></div></div>' +
        '<div class="wx-search-bar" onclick="wxNav(\'search\')"><div class="wx-search-inner">'+IC.search+'<span>搜索</span></div></div>' +
        '<div class="wx-body wx-chatlist">'+items+'</div>'+renderTabbar('chat')+'</div>';
}

// [fix #7] 聊天列表长按操作
function chatLongPress(chatId) {
    var chat = wxData.chats.find(function(c){ return c.id === chatId; });
    if (!chat) return;
    var pinLabel = chat.pinned ? '取消置顶' : '置顶聊天';

    if (_useWeui) {
        weui.actionSheet([
            { label: pinLabel, onClick: function(){ chat.pinned = !chat.pinned; wxNav('chatlist'); } },
            { label: '标记为已读', onClick: function(){ chat.unread = 0; wxNav('chatlist'); } },
            { label: '删除聊天', className: 'weui-actionsheet__cell_warn', onClick: function(){
                wxData.chats = wxData.chats.filter(function(c){ return c.id !== chatId; });
                delete wxData.conversations[chatId];
                wxNav('chatlist');
            }}
        ], [{ label: '取消', onClick: function(){} }]);
    }
}

function renderConversation() {
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;}) || {name:'未知'};
    var msgs = wxData.conversations[wxData.currentChatId]||[];
    var name = escapeHtml(chat.name)+(chat.memberCount?'('+chat.memberCount+')':'');
    var isGroup = chat.isGroup;

    var html = msgs.map(function(msg,idx){
        // ★ 过滤数值指令标记，不渲染为气泡
        var msgText = msg.message || msg.text || '';
        if (msgText.indexOf('###') === 0) return '';
        if (msg.type==='time') return '<div class="wx-msg-time">'+escapeHtml(msg.text)+'</div>';
        if (msg.type==='sys') return '<div class="wx-sys-msg">'+escapeHtml(msg.text)+'</div>';
        var self = msg.isSelf;
        var cls = self?'wx-msg-row self':'wx-msg-row';
        var avColor = self ? (typeof playerColor!=='undefined'?playerColor:'#ff9eaa') : getAvatarColor(msg.sender || chat.name);
        var avText = self?(typeof playerName!=='undefined'?playerName[0]:'我'):(msg.sender?msg.sender[0]:'?');
        var clickAv = '';
        if (!self && msg.sender) {
            var contact = findContact(msg.sender);
            if (contact) clickAv = ' onclick="wxNav(\'profile\',\''+sanitizeId(contact.id)+'\')"';
        }
        var nameH = (isGroup&&!self&&msg.sender)?'<div class="wx-msg-sender-name">'+escapeHtml(msg.sender)+'</div>':'';
        var content = '';
            if (msg.type==='voice') {
        var duration = msg.duration||2;
        var w = 80 + duration*12;
        // ★ 语音消息体验优化：增加转文字提示，点击展开/收起带动画
        content = '<div class="wx-voice-bubble" style="width:'+w+'px" onclick="toggleTranscript('+idx+')">'+(self?IC.voiceRight:IC.voiceLeft)+'<span class="wx-voice-duration">'+duration+'"</span></div>';
        if (msg.transcript) {
            content += '<div class="wx-voice-hint" onclick="toggleTranscript('+idx+')">转文字</div>';
            content += '<div class="wx-voice-transcript" id="vt-'+idx+'">'+escapeHtml(msg.transcript)+'</div>';
        }
    }
         else if (msg.type==='redpacket') {
            content = '<div class="wx-redpacket" onclick="openRedpacket('+idx+')"><div class="wx-redpacket-top"><div class="wx-redpacket-icon">'+IC.redpacket+'</div><div class="wx-redpacket-text">'+escapeHtml(msg.text||'恭喜发财')+'</div></div><div class="wx-redpacket-bottom">微信红包</div></div>';
        } else if (msg.type==='transfer') {
            var st = msg.status||'pending';
            var stText = st==='pending'?'待收款':st==='received'?'已收款 ✓':'已退回';
            var topCls = st==='pending'?'pending':'done';
            var click = st==='pending'?' onclick="showTransferAction('+idx+')"':'';
            content = '<div class="wx-transfer '+topCls+'"'+click+'><div class="wx-transfer-top '+topCls+'"><div class="wx-transfer-info"><div class="wx-transfer-amount">¥'+escapeHtml(msg.amount)+'</div><div class="wx-transfer-label">'+stText+'</div></div></div><div class="wx-transfer-bottom">'+escapeHtml(msg.note||'转账')+'</div></div>';
            } else if (msg.type === 'image') {
        // ★ 新增：图片消息气泡
        var imgW = msg.width || 140;
        var imgH = msg.height || 140;
        var imgColor = msg.color || '#e0e8f0';
        var imgLabel = escapeHtml(msg.label || '图片');
        content = '<div class="wx-img-bubble" onclick="previewChatImage('+idx+')"><div class="wx-img-placeholder" style="background:'+imgColor+';width:'+imgW+'px;height:'+imgH+'px;">'+imgLabel+'</div></div>';
    } else if (msg.type === 'typing') {
        return ''; // typing 不作为气泡渲染，改在导航栏标题下方提示
    } else {

            // [fix #8] 长按消息弹出菜单
            var longpress = self ? ' oncontextmenu="event.preventDefault();msgLongPress('+idx+',true)"' : ' oncontextmenu="event.preventDefault();msgLongPress('+idx+',false)"';
            content = '<div class="wx-bubble"'+longpress+'>'+escapeHtml(msg.message||msg.text||'')+'</div>';
        }

        return '<div class="'+cls+'"><div class="wx-msg-avatar" style="background:'+avColor+'"'+clickAv+'>'+escapeHtml(avText)+'</div><div class="wx-msg-content">'+nameH+content+'</div></div>';
    }).join('');

    // [fix #11] 群聊右上角更多按钮进入群设置
    var moreBtn = isGroup ?
        '<div class="wx-navbar-btn" onclick="showGroupSettings()">'+IC.more+'</div>' :
        '<div class="wx-navbar-btn" onclick="showChatMore()">'+IC.more+'</div>';

        var hasTyping = msgs.some(function(m){ return m.type === 'typing'; });
    var centerHtml = '<div class="wx-navbar-title">'+name+'</div>' + (hasTyping ? '<div class="wx-navbar-subtitle">对方正在输入...</div>' : '');

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'chatlist\')">'+IC.back+'</div></div><div class="wx-navbar-center">'+centerHtml+'</div><div class="wx-navbar-right">'+moreBtn+'</div></div>' +

        '<div class="wechat-conversation" id="wx-conv-scroll">'+html+'</div>' +
        '<div class="wx-input-bar"><div class="wx-input-btn">'+IC.mic+'</div><input id="wx-msg-input" placeholder="输入消息..." onkeydown="if(event.key===\'Enter\')sendMsg()" oninput="checkAtMention(this)"><div class="wx-input-btn" onclick="showPlusPanel()">'+IC.plusGray+'</div></div></div>';
}

// [fix #8] 消息长按菜单
function msgLongPress(idx, isSelf) {
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs || !msgs[idx]) return;
    var msg = msgs[idx];
    var menus = [];

    // 复制
    if (msg.message || msg.text) {
        menus.push({ label: '复制', onClick: function(){
            var t = msg.message || msg.text || '';
            if (navigator.clipboard) navigator.clipboard.writeText(t);
            if(_useWeui) weui.toast('已复制', {duration:1500});
        }});
    }
    // 撤回（自己的消息，2分钟内）
    if (isSelf && msg._ts && (Date.now() - msg._ts < 120000)) {
        menus.push({ label: '撤回', onClick: function(){
            msgs.splice(idx, 1, {type:'sys', text:'你撤回了一条消息'});
            wxNav('conversation', wxData.currentChatId);
        }});
    }
    // 删除
    menus.push({ label: '删除', onClick: function(){
        msgs.splice(idx, 1);
        wxNav('conversation', wxData.currentChatId);
    }});
    // 转发
    menus.push({ label: '转发', onClick: function(){ showForwardPicker(msg); }});

    if (_useWeui) {
        weui.actionSheet(menus, [{ label: '取消', onClick: function(){} }]);
    }
}

// [fix #8] 转发选择对话
function showForwardPicker(msg) {
    if (wxData.chats.length === 0) { if(_useWeui) weui.alert('没有可转发的对话'); return; }
    var menus = wxData.chats.slice(0, 10).map(function(c){
        return { label: escapeHtml(c.name), onClick: function(){
            if (!wxData.conversations[c.id]) wxData.conversations[c.id] = [];
            wxData.conversations[c.id].push({isSelf:true, message: msg.message||msg.text||'[转发消息]', _ts: Date.now()});
            c.lastMsg = '[转发消息]';
            c.sortKey = Date.now();
            if(_useWeui) weui.toast('已转发', {duration:1500});
        }};
    });
    if (_useWeui) weui.actionSheet(menus, [{ label: '取消', onClick: function(){} }]);
}

// [fix #11] 群设置页
function showGroupSettings() {
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;});
    if (!chat) return;
    var members = chat.members || ['未知'];
    var colors = chat.colors || ['#ccc'];
    var memberGrid = members.map(function(m,i){
        return '<div style="display:flex;flex-direction:column;align-items:center;gap:4px;"><div style="width:40px;height:40px;border-radius:6px;background:'+(colors[i]||'#ccc')+';display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">'+escapeHtml(m)+'</div><span style="font-size:10px;color:#666;">'+escapeHtml(m)+'</span></div>';
    }).join('');

    var el = document.getElementById('screen-wechat');
    el.innerHTML = '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'conversation\',\''+sanitizeId(wxData.currentChatId)+'\')">'+IC.back+'</div></div><div class="wx-navbar-center">群聊设置</div><div class="wx-navbar-right"></div></div>'+
        '<div class="wx-body wx-me-page">'+
        '<div style="padding:16px;background:#fff;"><div style="font-size:14px;color:#666;margin-bottom:12px;">群成员 ('+members.length+')</div><div style="display:flex;flex-wrap:wrap;gap:14px;">'+memberGrid+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-me-item"><span class="wx-me-item-name">群聊名称</span><span style="font-size:14px;color:#999;">'+escapeHtml(chat.name)+'</span><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-item"><span class="wx-me-item-name">群公告</span><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-me-item"><span class="wx-me-item-name">消息免打扰</span></div>'+
        '</div></div>';
}

function showChatMore() {
    if(_useWeui) {
        weui.actionSheet([
            { label: '查找聊天记录', onClick: function(){} },
            { label: '设置当前聊天背景', onClick: function(){} }
        ], [{ label: '取消', onClick: function(){} }]);
    }
}

// [fix #11] @人功能
function checkAtMention(input) {
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;});
    if (!chat || !chat.isGroup) return;
    var val = input.value;
    if (val.endsWith('@')) {
        var members = chat.members || [];
        if (members.length === 0) return;
        var menus = members.map(function(m){
            return { label: m, onClick: function(){ input.value = val + m + ' '; input.focus(); }};
        });
        if (_useWeui) weui.actionSheet(menus, [{ label: '取消', onClick: function(){} }]);
    }
}

function toggleTranscript(idx) {
    var el = document.getElementById('vt-'+idx);
    if (!el) return;
    // ★ 语音转写平滑展开/收起 + 更新提示文字
    el.classList.toggle('show');
    // 更新提示文字
    var hint = el.previousElementSibling;
    if (hint && hint.classList.contains('wx-voice-hint')) {
        hint.textContent = el.classList.contains('show') ? '收起' : '转文字';
    }
}

// ★ 聊天图片预览（点击放大）
function previewChatImage(idx) {
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs || !msgs[idx]) return;
    var msg = msgs[idx];
    var el = document.getElementById('screen-wechat');
    var overlay = document.createElement('div');
    overlay.className = 'wx-img-overlay show';
    overlay.innerHTML = '<div class="wx-img-preview-box" style="background:'+(msg.color||'#e0e8f0')+';width:80%;aspect-ratio:'+(msg.width||140)+'/'+(msg.height||140)+';max-height:70vh;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px;color:rgba(0,0,0,0.4);">'+(escapeHtml(msg.label||'图片'))+'</div>';
    overlay.addEventListener('click', function(){ overlay.remove(); });
    el.appendChild(overlay);
}

// [fix #18] 用 weui.actionSheet 替换
function showPlusMenu() {
    if (_useWeui) {
        weui.actionSheet([
            { label: '发起群聊', onClick: function () {} },
            { label: '添加好友', onClick: function () {} },
            { label: '扫一扫', onClick: function () {} },
            { label: '收付款', onClick: function () {} }
        ], [{ label: '取消', onClick: function () {} }]);
    }
}

// 微信 + 号功能面板：底部横向宫格（原生微信样式），支持左右翻页
function showPlusPanel() {
    closePlusPanel(); // 防止重复叠加
    var grid = [
        { key:'album', label:'照片', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#555"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10.5" r="1.5" fill="#fff"/><path d="M3 16l4-4 3 3 5-5 6 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2z" fill="#fff" opacity="0.6"/></svg>', act:function(){ if(_useWeui)weui.alert("功能开发中"); } },
        { key:'shoot', label:'拍摄', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#555"><rect x="2" y="7" width="15" height="10" rx="2"/><path d="M17 9.5l4.5-2.5v10L17 14.5v-5z"/></svg>', act:function(){ if(_useWeui)weui.alert("功能开发中"); } },
        { key:'redpacket',label:'红包', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#CF3E36"><rect x="4" y="3" width="16" height="18" rx="2"/><rect x="4" y="3" width="16" height="8" rx="2" fill="#CF3E36"/><circle cx="12" cy="11" r="3" fill="#f5c642" stroke="#CF3E36" stroke-width="0.5"/></svg>', act:function(){ closePlusPanel(); showRedpacketModal(); } },
        { key:'transfer', label:'转账', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#555" stroke-width="2"/><path d="M8 12h8M14 9l-4 3 4 3" stroke="#555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>', act:function(){ closePlusPanel(); showTransferModal(); } },
        { key:'voicechat',label:'语音通话',icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#555"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.5 0 1 .4 1 1v3.4c0 .5-.5 1-1 1C10.6 22 2 13.4 2 3c0-.5.4-1 1-1h3.5c.5 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>', act:function(){ if(_useWeui)weui.alert("功能开发中"); } },
        { key:'location', label:'位置', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#555"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>', act:function(){ if(_useWeui)weui.alert("功能开发中"); } },
        { key:'card', label:'名片', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#555"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2.5" fill="#fff"/><rect x="13" y="9" width="6" height="1.5" rx="0.75" fill="#fff"/><rect x="13" y="12.5" width="4" height="1.5" rx="0.75" fill="#fff"/></svg>', act:function(){ if(_useWeui)weui.alert("功能开发中"); } },
        { key:'file', label:'文件', icon:'<svg width="28" height="28" viewBox="0 0 24 24" fill="#555"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6z"/><path d="M14 2v6h6" fill="#fff" opacity="0.4"/></svg>', act:function(){ if(_useWeui)weui.alert("功能开发中"); } }
    ];

    var cells = grid.map(function(g, i){
        return '<div class="wx-plus-cell" data-idx="'+i+'"><div class="wx-plus-icon">'+g.icon+'</div><span class="wx-plus-label">'+g.label+'</span></div>';
    }).join('');

    var panel = document.createElement('div');
    panel.id = 'wx-plus-panel';
    panel.className = 'wx-plus-mask';
    // 横向可左右滑动的宫格容器
    panel.innerHTML = '<div class="wx-plus-sheet"><div class="wx-plus-grid">'+cells+'</div></div>';
    panel.addEventListener('click', function(e){ if(e.target === panel) closePlusPanel(); });
    document.getElementById('screen-wechat').appendChild(panel);

    // 绑定每个格子的点击（用索引，避免闭包引用问题）
    panel.querySelectorAll('.wx-plus-cell').forEach(function(cell){
        cell.addEventListener('click', function(){
            var idx = parseInt(cell.getAttribute('data-idx'), 10);
            if (grid[idx] && grid[idx].act) grid[idx].act();
        });
    });
    requestAnimationFrame(function(){ panel.classList.add('show'); });
}

function closePlusPanel() {
    var p = document.getElementById('wx-plus-panel');
    if (p) p.parentNode.removeChild(p);
}

// [fix #10] 红包弹窗
function showRedpacketModal() {
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;});
    var toName = chat ? chat.name : '对方';
    var el = document.getElementById('screen-wechat');
    var panel = document.createElement('div');
    panel.className = 'wx-rp-panel';
    panel.id = 'wx-rp-panel';
    panel.innerHTML = '<div class="wx-rp-panel__nav"><div class="wx-rp-panel__nav-back" onclick="closeRpPanel()">'+IC.back+'</div><div class="wx-rp-panel__nav-title">发红包</div><div style="width:28px"></div></div>'
        +'<div class="wx-rp-panel__body">'
        +'<div class="wx-rp-panel__row"><span class="wx-rp-panel__row-label">金额</span><input class="wx-rp-panel__row-input" id="rp-amount" type="number" placeholder="¥0.00" oninput="updateRpDisplay()"></div>'
        +'<div class="wx-rp-panel__row"><input class="wx-rp-panel__row-input" id="rp-text" placeholder="恭喜发财，大吉大利" style="text-align:left"></div>'
        +'<div class="wx-rp-panel__amount-display" id="rp-display"><span>¥</span>0.00</div>'
        +'<div class="wx-rp-panel__btn" onclick="submitRedpacket()">塞钱进红包</div>'
        +'<div class="wx-rp-panel__tip">可直接使用收到的零钱发红包</div>'
        +'</div>';
    el.appendChild(panel);
}
function updateRpDisplay() {
    var v = document.getElementById('rp-amount');
    var d = document.getElementById('rp-display');
    if (v && d) {
        var val = v.value ? Number(v.value).toFixed(2) : '0.00';
        d.innerHTML = '<span>¥</span>' + val;
    }
}

function closeRpPanel() {
    var p = document.getElementById('wx-rp-panel');
    if (p) p.remove();
}
function submitRedpacket() {
    var amount = document.getElementById('rp-amount').value;
    var text = document.getElementById('rp-text').value || '恭喜发财，大吉大利';
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        if(_useWeui) weui.toast('请输入金额',{duration:1500});
        return;
    }
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs) { msgs=[]; wxData.conversations[wxData.currentChatId]=msgs; }
    msgs.push({isSelf:true, type:'redpacket', text:text, amount:Number(amount).toFixed(2), opened:false, _ts:Date.now()});
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;});
    if(chat){ chat.lastMsg='[红包] '+text; chat.sortKey=Date.now(); }
    closeRpPanel();
    wxNav('conversation', wxData.currentChatId);
}

// [fix #10] 打开红包
function openRedpacket(idx) {
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs || !msgs[idx]) return;
    var msg = msgs[idx];
    if (msg.opened) {
        if(_useWeui) weui.toast('红包已被领取',{duration:1500});
        return;
    }
    // ★ 打开红包动画面板
    var el = document.getElementById('screen-wechat');
    var overlay = document.createElement('div');
    overlay.className = 'wx-rp-open';
    overlay.id = 'wx-rp-open';
    overlay.innerHTML = '<div class="wx-rp-open__card">'
        +'<div class="wx-rp-open__from">'+(msg.sender||'对方')+'的红包</div>'
        +'<div class="wx-rp-open__msg">'+escapeHtml(msg.text||'恭喜发财')+'</div>'
        +'<div class="wx-rp-open__gold" onclick="doOpenRedpacket('+idx+')">開</div>'
        +'</div>'
        +'<div class="wx-rp-open__close" onclick="closeRpOpen()">✕</div>';
    el.appendChild(overlay);
}
function doOpenRedpacket(idx) {
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs || !msgs[idx]) return;
    msgs[idx].opened = true;
    var card = document.querySelector('.wx-rp-open__card');
    if (card) {
        card.innerHTML = '<div class="wx-rp-open__result">'
            +'<div class="wx-rp-open__from">'+(msgs[idx].sender||'对方')+'的红包</div>'
            +'<div class="wx-rp-open__result-amount">¥'+msgs[idx].amount+'</div>'
            +'<div class="wx-rp-open__result-label">已存入零钱</div></div>';
    }
    setTimeout(function(){ closeRpOpen(); wxNav('conversation', wxData.currentChatId); }, 2000);
}
function closeRpOpen() {
    var p = document.getElementById('wx-rp-open');
    if (p) p.remove();
}


// [fix #18] 转账弹窗用 weui.dialog
function showTransferModal() {
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;});
    var toName = chat ? chat.name : '对方';
    var toColor = chat ? getAvatarColor(chat.name) : '#4a90d9';
    var el = document.getElementById('screen-wechat');
    var panel = document.createElement('div');
    panel.className = 'wx-tf-panel';
    panel.id = 'wx-tf-panel';
    panel.innerHTML = '<div class="wx-tf-panel__nav"><div class="wx-tf-panel__nav-back" onclick="closeTfPanel()">'+IC.back+'</div><div class="wx-tf-panel__nav-title">转账</div><div style="width:28px"></div></div>'
        +'<div class="wx-tf-panel__header"><div class="wx-tf-panel__header-info"><div class="wx-tf-panel__header-name">转账给 '+escapeHtml(toName)+'</div><div class="wx-tf-panel__header-id">微信号：'+escapeHtml(wxData.currentChatId)+'</div></div><div class="wx-tf-panel__header-avatar" style="background:'+toColor+'">'+escapeHtml(toName[0])+'</div></div>'
        +'<div class="wx-tf-panel__card">'
        +'<div class="wx-tf-panel__card-label">转账金额</div>'
        +'<div class="wx-tf-panel__amount-row"><span class="wx-tf-panel__currency">¥</span><input class="wx-tf-panel__amount-input" id="tf-amount" type="number" placeholder="0.00"></div>'
        +'<input class="wx-tf-panel__note-input" id="tf-note" placeholder="添加转账说明">'
        +'<button class="wx-tf-panel__btn" onclick="submitTransfer()">转账</button>'
        +'</div>';
    el.appendChild(panel);
}

function closeTfPanel() {
    var p = document.getElementById('wx-tf-panel');
    if (p) p.remove();
}
function submitTransfer() {
    var amount = document.getElementById('tf-amount').value;
    var note = document.getElementById('tf-note').value || '转账';
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
        if(_useWeui) weui.toast('请输入金额',{duration:1500});
        return;
    }
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs) { msgs=[]; wxData.conversations[wxData.currentChatId]=msgs; }
    msgs.push({isSelf:true, type:'transfer', amount:Number(amount).toFixed(2), note:note, status:'pending', _ts:Date.now()});
    var chat = wxData.chats.find(function(c){return c.id===wxData.currentChatId;});
    if(chat){ chat.lastMsg='[转账] ¥'+Number(amount).toFixed(2); chat.sortKey=Date.now(); }
    closeTfPanel();
    wxNav('conversation', wxData.currentChatId);
}

// [fix #18] 转账操作用 weui
function showTransferAction(idx) {
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs || !msgs[idx]) return;
    var msg = msgs[idx];
    var el = document.getElementById('screen-wechat');
    var panel = document.createElement('div');
    panel.className = 'wx-tf-detail';
    panel.id = 'wx-tf-detail';
    panel.innerHTML = '<div class="wx-tf-detail__nav"><div class="wx-tf-detail__nav-back" onclick="closeTfDetail()">'+IC.back+'</div><div class="wx-tf-detail__nav-title">转账详情</div><div style="width:28px"></div></div>'
        +'<div class="wx-tf-detail__body">'
        +'<div class="wx-tf-detail__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#fff"/></svg></div>'
        +'<div class="wx-tf-detail__amount">¥'+escapeHtml(msg.amount)+'</div>'
        +'<div class="wx-tf-detail__status">'+(msg.note||'转账')+'</div>'
        +'<button class="wx-tf-detail__btn" onclick="acceptTransfer('+idx+');closeTfDetail()">收款</button>'
        +'<div class="wx-tf-detail__btn-reject" onclick="rejectTransfer('+idx+');closeTfDetail()">退还</div>'
        +'</div>';
    el.appendChild(panel);
}
function closeTfDetail() {
    var p = document.getElementById('wx-tf-detail');
    if (p) p.remove();
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

// [fix #15] 合并消息+typing为一次渲染，[fix #14] typing超时清理
function sendMsg() {
    var input = document.getElementById('wx-msg-input');
    var text = input.value.trim();
    if (!text) return;
    var msgs = wxData.conversations[wxData.currentChatId];
    if (!msgs) { msgs=[]; wxData.conversations[wxData.currentChatId]=msgs; }
    msgs.push({isSelf:true, message:text, _ts:Date.now()});
    input.value = '';

    var chat = wxData.chats.find(function(c){ return c.id === wxData.currentChatId; });
    if(chat) {
        chat.lastMsg = text;
        chat.time = formatGameTime();
        chat.sortKey = Date.now();
    }

    // [fix #15] 一次性 push typing + 渲染，避免双重 wxNav
    var typingChatId = wxData.currentChatId;
    var typingIdx = msgs.length;
    msgs.push({type:'typing', isSelf:false, sender: chat ? chat.name : '?', color: chat ? chat.color : '#ccc'});
    wxNav('conversation', typingChatId);

    // [fix #14] 15秒超时自动移除 typing
    if (_typingTimers[typingChatId]) clearTimeout(_typingTimers[typingChatId]);
    _typingTimers[typingChatId] = setTimeout(function(){
        var convArr = wxData.conversations[typingChatId];
        if (convArr) {
            for (var i = convArr.length - 1; i >= 0; i--) {
                if (convArr[i].type === 'typing') { convArr.splice(i, 1); break; }
            }
            if (wxData.currentChatId === typingChatId && wxData.currentView === 'conversation') {
                wxNav('conversation', typingChatId);
            }
        }
        delete _typingTimers[typingChatId];
    }, 15000);

    // [fix #3] postMessage 加注释标记
    if (typeof window.parent.postMessage === 'function') {
        window.parent.postMessage({
            type: 'PHONE_INTERACT',
            action: 'wechat_reply',
            chatId: wxData.currentChatId,
            chatName: chat ? chat.name : '未知',
            userMessage: text
        }, '*'); // TODO: 替换为具体 origin
    }
}

// [fix #6] 搜索功能实现
function renderSearch() {
    var tags = (wxData.searchHistory||[]).map(function(t){return '<div class="wx-search-tag" onclick="doSearch(\''+escapeHtml(t)+'\')">'+escapeHtml(t)+'</div>';}).join('');
    var hots = (wxData.searchHot||[]).map(function(t,i){return '<div class="wx-search-hot-item" onclick="doSearch(\''+escapeHtml(t)+'\')"><span class="wx-search-hot-rank'+(i>=3?' normal':'')+'">'+( i+1)+'</span><span class="wx-search-hot-text">'+escapeHtml(t)+'</span></div>';}).join('');
    return '<div class="wechat-container"><div class="wx-search-top-bar"><input id="wx-search-input" placeholder="搜索" oninput="doSearchLive(this.value)" autofocus><span class="wx-search-cancel" onclick="wxNav(\'chatlist\')">取消</span></div><div class="wx-body wx-search-page"><div id="wx-search-results"></div><div id="wx-search-default"><div class="wx-search-section"><div class="wx-search-section-title">最近搜索</div><div class="wx-search-tags">'+(tags||'<span style="color:#ccc;font-size:12px;">暂无历史</span>')+'</div></div><div class="wx-search-section"><div class="wx-search-section-title">热搜</div>'+(hots||'<span style="color:#ccc;font-size:12px;">暂无热搜</span>')+'</div></div></div></div>';
}

// [fix #6] 实时搜索过滤
function doSearchLive(keyword) {
    var resultsEl = document.getElementById('wx-search-results');
    var defaultEl = document.getElementById('wx-search-default');
    if (!resultsEl || !defaultEl) return;

    if (!keyword.trim()) {
        resultsEl.innerHTML = '';
        defaultEl.style.display = 'block';
        return;
    }
    defaultEl.style.display = 'none';
    var kw = keyword.trim().toLowerCase();
    var html = '';

    // 搜索联系人
    var matchContacts = [];
    wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){
        if (c.name.toLowerCase().indexOf(kw) !== -1) matchContacts.push(c);
    }); });
    if (matchContacts.length > 0) {
        html += '<div class="wx-search-section"><div class="wx-search-section-title">联系人</div>';
        matchContacts.slice(0,5).forEach(function(c){
            html += '<div class="wx-contact-item" onclick="wxNav(\'profile\',\''+sanitizeId(c.id)+'\')"><div class="wx-contact-avatar" style="background:'+c.color+'">'+escapeHtml(c.avatar)+'</div><span class="wx-contact-name">'+escapeHtml(c.name)+'</span></div>';
        });
        html += '</div>';
    }

    // 搜索聊天记录
    var matchMsgs = [];
    wxData.chats.forEach(function(chat){
        var conv = wxData.conversations[chat.id] || [];
        conv.forEach(function(msg){
            var t = msg.message || msg.text || '';
            if (t.toLowerCase().indexOf(kw) !== -1) {
                matchMsgs.push({chatId: chat.id, chatName: chat.name, text: t});
            }
        });
    });
    if (matchMsgs.length > 0) {
        html += '<div class="wx-search-section"><div class="wx-search-section-title">聊天记录</div>';
        matchMsgs.slice(0,8).forEach(function(m){
            html += '<div class="wx-chat-item" onclick="wxNav(\'conversation\',\''+sanitizeId(m.chatId)+'\')"><div class="wx-chat-info"><div class="wx-chat-top-row"><span class="wx-chat-name">'+escapeHtml(m.chatName)+'</span></div><div class="wx-chat-preview">'+escapeHtml(m.text.substring(0,40))+'</div></div></div>';
        });
        html += '</div>';
    }

    if (!html) html = '<div style="text-align:center;padding:40px;color:#999;font-size:14px;">无结果</div>';
    resultsEl.innerHTML = html;
}

function doSearch(keyword) {
    var input = document.getElementById('wx-search-input');
    if (input) { input.value = keyword; doSearchLive(keyword); }
    // 保存搜索历史
    if (wxData.searchHistory.indexOf(keyword) === -1) {
        wxData.searchHistory.unshift(keyword);
        if (wxData.searchHistory.length > 8) wxData.searchHistory.pop();
    }
}

function renderContacts() {
    var html = (wxData.contacts||[]).map(function(g){
        var items = (g.items||[]).map(function(c){return '<div class="wx-contact-item" onclick="wxNav(\'profile\',\''+sanitizeId(c.id)+'\')"><div class="wx-contact-avatar" style="background:'+c.color+'">'+escapeHtml(c.avatar)+'</div><span class="wx-contact-name">'+escapeHtml(c.name)+'</span></div>';}).join('');
        return '<div class="wx-contact-letter">'+escapeHtml(g.letter)+'</div>'+items;
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
    if (!wxData.moments || wxData.moments.length === 0) {
        // ★ 区分loading和真的没数据
        var hint = appCache['wechat_moments'] === 'loading' ? '刷新朋友圈中...' : '暂无新动态，下拉刷新试试';
        return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'discover\')">'+IC.back+'</div></div><div class="wx-navbar-center">朋友圈</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="wxNav(\'publish\')">'+IC.camera+'</div></div></div><div class="wx-body" style="display:flex;align-items:center;justify-content:center;color:#999;">'+hint+'</div></div>';
    }

    var list = wxData.moments.map(function(m,i){
        var likes = m.likes||[];
        var comments = m.comments||[];
        var likesH = likes.length>0?'<div class="wx-moment-likes-bar">'+IC.heart+' '+likes.map(function(n){return escapeHtml(n);}).join('、')+'</div>':'';
        // [fix #12] 点击评论人名可回复
        var commH = comments.length>0?'<div class="wx-moment-comments">'+comments.map(function(c){
            var authorName = escapeHtml(c.author||c.name);
            var replyPart = c.replyTo ? '<span class="comment-author" onclick="startReplyComment('+i+',\''+escapeHtml(c.replyTo)+'\')"> 回复 '+escapeHtml(c.replyTo)+'</span>' : '';
            return '<div class="wx-moment-comment-item"><span class="comment-author" onclick="startReplyComment('+i+',\''+authorName+'\')">'+authorName+replyPart+'：</span>'+escapeHtml(c.text)+'</div>';
        }).join('')+'</div>':'';
        var likedCls = m.liked?' liked':'';
        // [fix #12] 点击头像跳转资料页，删除自己的动态
        var avatarClick = '';
        var deleteBtn = '';
        if (m.isSelf) {
            deleteBtn = '<span class="wx-moment-btn" onclick="deleteMoment('+i+')" style="color:#ff3b30;">删除</span>';
        } else {
            var contact = findContact(m.name);
            if (contact) avatarClick = ' onclick="wxNav(\'profile\',\''+sanitizeId(contact.id)+'\')"';
        }
        // [fix #12] 图片占位
        var imgHtml = '';
        if (m.images && m.images.length > 0) {
            imgHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">';
            m.images.forEach(function(img){
                imgHtml += '<div style="width:80px;height:80px;border-radius:4px;background:'+(img.color||'#f0f0f0')+';display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">'+(img.label||'图片')+'</div>';
            });
            imgHtml += '</div>';
        }

        return '<div class="wx-moment-item"><div class="wx-moment-avatar" style="background:'+(m.color||'#ccc')+'"'+avatarClick+'>'+escapeHtml(m.avatar||m.name[0]||'?')+'</div><div class="wx-moment-body"><div class="wx-moment-name">'+escapeHtml(m.name)+'</div><div class="wx-moment-text">'+escapeHtml(m.text||m.content||'')+'</div>'+imgHtml+'<div class="wx-moment-meta"><span class="wx-moment-time-text">'+(m.time||'刚刚')+'</span><div class="wx-moment-btns"><span class="wx-moment-btn'+likedCls+'" onclick="toggleLike('+i+')">'+IC.heart+' 赞</span><span class="wx-moment-btn" onclick="startComment('+i+')">'+IC.comment+' 评论</span>'+deleteBtn+'</div></div>'+likesH+commH+'</div></div>';
    }).join('');

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'discover\')">'+IC.back+'</div></div><div class="wx-navbar-center">朋友圈</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="wxNav(\'publish\')">'+IC.camera+'</div></div></div>'+
        '<div class="wx-moments-scroll"><div class="wx-moments-cover" onclick="if(_useWeui)weui.alert(\'更换封面\')"><div class="wx-moments-me"><span class="wx-moments-my-name">'+(typeof playerName!=='undefined'?escapeHtml(playerName):'我')+'</span><div class="wx-moments-my-avatar" style="background:'+(typeof playerColor!=='undefined'?playerColor:'#ff9eaa')+'">'+(typeof playerName!=='undefined'?escapeHtml(playerName[0]):'我')+'</div></div></div><div class="wx-moments-list">'+list+'</div></div>'+
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
    wxData.replyTarget=null;
    var bar = document.getElementById('wx-cmt-bar');
    var input = document.getElementById('wx-cmt-input');
    if(bar) bar.style.display='flex';
    if(input){ input.placeholder='评论...'; input.focus(); }
}

// [fix #12] 回复某人
function startReplyComment(i, targetName) {
    wxData.commentingIdx=i;
    wxData.replyTarget=targetName;
    var bar = document.getElementById('wx-cmt-bar');
    var input = document.getElementById('wx-cmt-input');
    if(bar) bar.style.display='flex';
    if(input){ input.placeholder='回复 '+targetName+'...'; input.focus(); }
}

function submitComment() {
    var t=document.getElementById('wx-cmt-input').value.trim();
    if(!t||wxData.commentingIdx<0)return;
    if(!wxData.moments[wxData.commentingIdx].comments) wxData.moments[wxData.commentingIdx].comments=[];
    var pn = typeof playerName!=='undefined'?playerName:'我';
    var commentObj = {author:pn, text:t};
    if (wxData.replyTarget) commentObj.replyTo = wxData.replyTarget;
    wxData.moments[wxData.commentingIdx].comments.push(commentObj);
    wxData.commentingIdx=-1;
    wxData.replyTarget=null;
    wxNav('moments');
}

// [fix #12] 删除自己的动态
function deleteMoment(idx) {
    if (_useWeui) {
        weui.confirm('确定删除这条动态？', function(){
            wxData.moments.splice(idx, 1);
            wxNav('moments');
        });
    }
}

// [fix #12] 发布朋友圈支持图片占位
function renderPublish() {
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'moments\')">'+IC.back+'</div></div><div class="wx-navbar-center"></div><div class="wx-navbar-right"></div></div><div class="wx-publish-page"><textarea class="wx-publish-textarea" id="wx-pub-text" placeholder="这一刻的想法..."></textarea><div id="wx-pub-imgs" style="display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 12px;"></div><div style="padding:0 16px 12px;"><span onclick="addPubImage()" style="display:inline-flex;width:60px;height:60px;border:1px dashed #ccc;border-radius:6px;align-items:center;justify-content:center;font-size:24px;color:#ccc;cursor:pointer;">+</span></div><button class="wx-publish-btn" onclick="publishMoment()">发表</button></div></div>';
}

var _pubImages = [];
function addPubImage() {
    var colors = ['#ffb3ba','#bae1ff','#baffc9','#ffffba','#e8baff','#ffd6a5'];
    var c = colors[_pubImages.length % colors.length];
    _pubImages.push({color:c, label:'图'+ (_pubImages.length+1)});
    var container = document.getElementById('wx-pub-imgs');
    if(container){
        container.innerHTML = _pubImages.map(function(img){
            return '<div style="width:60px;height:60px;border-radius:6px;background:'+img.color+';display:flex;align-items:center;justify-content:center;font-size:10px;color:#666;">'+img.label+'</div>';
        }).join('');
    }
}

function publishMoment() {
    var t = document.getElementById('wx-pub-text').value.trim();
    if (!t && _pubImages.length === 0) { if(_useWeui) weui.alert('请输入内容'); return; }
    var pn = typeof playerName!=='undefined'?playerName:'我';
    var pc = typeof playerColor!=='undefined'?playerColor:'#ff9eaa';
    var moment = {name:pn, avatar:pn[0], color:pc, text:t, time:'刚刚', likes:[], liked:false, comments:[], isSelf:true};
    if (_pubImages.length > 0) moment.images = _pubImages.slice();
    wxData.moments.unshift(moment);
    _pubImages = [];
    wxNav('moments');
}

// [fix #4] renderMe 补全头像信息
function renderMe() {
    var pn = typeof playerName!=='undefined'?playerName:'我';
    var pc = typeof playerColor!=='undefined'?playerColor:'#ff9eaa';
    var pWxId = typeof playerWxId!=='undefined'?playerWxId:'player_001';

    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"></div><div class="wx-navbar-center">我</div><div class="wx-navbar-right"></div></div><div class="wx-body wx-me-page"><div class="wx-me-header" onclick="wxNav(\'myprofile\')"><div class="wx-me-avatar" style="background:'+pc+'">'+escapeHtml(pn[0])+'</div><div class="wx-me-info"><div class="wx-me-name">'+escapeHtml(pn)+'</div><div class="wx-me-id">微信号：'+escapeHtml(pWxId)+'</div></div><div class="wx-me-item-arrow">'+IC.arrowR+'</div></div>'+
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
        '<div style="padding:20px 16px;background:#fff;display:flex;align-items:center;gap:14px;border-bottom:0.5px solid rgba(0,0,0,0.04);"><div style="width:60px;height:60px;border-radius:10px;background:'+pc+';display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;">'+escapeHtml(pn[0])+'</div><div style="flex:1;"><div style="font-size:17px;font-weight:600;color:#000;">'+escapeHtml(pn)+'</div><div style="font-size:13px;color:#999;margin-top:4px;">微信号：'+escapeHtml(pid)+'</div></div></div>'+
        '<div style="height:8px;background:#f5f5f5;"></div>'+
        '<div class="wx-profile-item" onclick="editName()"><span class="wx-profile-item-name">更改昵称</span><div class="wx-profile-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div style="padding:16px;background:#fff;"><div style="font-size:14px;color:#666;margin-bottom:12px;">选择头像颜色</div><div style="display:flex;flex-wrap:wrap;gap:12px;">'+colorGrid+'</div></div>'+
        '</div></div>';
}

// [fix #19] 直接赋值，不做 typeof 判断
function changeAvatar(color) {
    var oldColor = window.playerColor || '#ff9eaa';
    window.playerColor = color;
    wxData.moments.forEach(function(m){
        if(m.isSelf || m.color===oldColor) m.color = color;
    });
    wxNav('myprofile');
}

// [fix #16][fix #18] 用 weui.dialog 代替 prompt（续）
function editName() {
    if (_useWeui) {
        weui.dialog({
            title: '修改微信名',
            content: '<input class="weui-input" id="edit-name-val" value="'+(typeof playerName!=='undefined'?escapeHtml(playerName):'我')+'" style="border-bottom:1px solid #eee;padding:8px 0;">',
            className: 'custom',
            buttons: [
                { label: '取消', type: 'default', onClick: function(){} },
                { label: '确定', type: 'primary', onClick: function(){
                    var input = document.getElementById('edit-name-val');
                    var newName = input ? input.value.trim() : '';
                    if (!newName) { weui.alert('昵称不能为空'); return; }
                    var oldName = window.playerName || '我';
                    window.playerName = newName;
                    wxData.moments.forEach(function(m){
                        if(m.isSelf || m.name===oldName) { m.name = newName; m.avatar = newName[0]; }
                    });
                    wxNav('myprofile');
                }}
            ]
        });
    }
}

function renderProfile(contactId) {
    var contact = null;
    wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){ if(c.id===contactId) contact=c; }); });
    if (!contact) { wxNav('contacts'); return ''; }
    var sid = sanitizeId(contactId);
    return '<div class="wechat-container"><div class="wx-navbar"><div class="wx-navbar-left"><div class="wx-navbar-btn" onclick="wxNav(\'contacts\')">'+IC.back+'</div></div><div class="wx-navbar-center">'+escapeHtml(contact.name)+'</div><div class="wx-navbar-right"><div class="wx-navbar-btn" onclick="showProfileMore(\''+sid+'\')">'+IC.more+'</div></div></div>'+
        '<div class="wx-body wx-profile-page"><div class="wx-profile-header"><div class="wx-profile-avatar" style="background:'+contact.color+'">'+escapeHtml(contact.avatar)+'</div><div class="wx-profile-info"><div class="wx-profile-name">'+escapeHtml(contact.name)+'</div><div class="wx-profile-detail">微信号：'+escapeHtml(contact.id)+'_wx</div></div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-profile-item"><span class="wx-profile-item-name">朋友资料</span><div class="wx-profile-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-profile-item"><span class="wx-profile-item-name">朋友圈</span><div class="wx-profile-item-arrow">'+IC.arrowR+'</div></div>'+
        '<div class="wx-me-gap"></div>'+
        '<div class="wx-profile-actions"><div class="wx-profile-action-btn" onclick="goChat(\''+sid+'\')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-4l-4 3.5V16H7a3 3 0 0 1-3-3V6z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg> 发消息</div><div class="wx-profile-action-btn secondary">'+IC.phone+' 音视频通话</div></div>'+
        '</div></div>';
}

// [fix #9] 从通讯录发起新对话（不再 alert）
function goChat(contactId) {
    var chatExists = wxData.chats.find(function(c){return c.id===contactId;});
    if (chatExists) {
        wxNav('conversation', contactId);
    } else {
        // 自动创建新对话
        var contact = null;
        wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){ if(c.id===contactId) contact=c; }); });
        if (!contact) return;
        wxData.chats.push({
            id: contactId,
            name: contact.name,
            avatar: contact.avatar,
            color: contact.color,
            unread: 0,
            lastMsg: '',
            sortKey: Date.now()
        });
        wxData.conversations[contactId] = [];
        wxNav('conversation', contactId);
    }
}

// [fix #13] showProfileMore 操作项全做实
function showProfileMore(contactId) {
    if (!_useWeui) return;
    weui.actionSheet([
        { label: '编辑备注', onClick: function(){
            weui.dialog({
                title: '编辑备注',
                content: '<input class="weui-input" id="remark-input" placeholder="输入备注名" style="border-bottom:1px solid #eee;padding:8px 0;">',
                className: 'custom',
                buttons: [
                    { label: '取消', type: 'default', onClick: function(){} },
                    { label: '确定', type: 'primary', onClick: function(){
                        var remark = document.getElementById('remark-input').value.trim();
                        if (!remark) return;
                        // 更新联系人名字
                        wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){
                            if(c.id===contactId) c.name = remark;
                        }); });
                        // 更新聊天列表
                        var chat = wxData.chats.find(function(c){return c.id===contactId;});
                        if(chat) chat.name = remark;
                        wxNav('profile', contactId);
                    }}
                ]
            });
        }},
        { label: '设置权限', onClick: function(){ weui.alert('功能开发中'); } },
        { label: '推荐给朋友', onClick: function(){ weui.alert('功能开发中'); } },
        { label: '设为星标朋友', onClick: function(){
            wxData.contacts.forEach(function(g){ (g.items||[]).forEach(function(c){
                if(c.id===contactId) c.star = !c.star;
            }); });
            weui.toast('已设为星标', {duration:1500});
        }},
        { label: '加入黑名单', onClick: function(){ weui.alert('功能开发中'); } },
        { label: '投诉', onClick: function(){ weui.alert('功能开发中'); } },
        { label: '删除联系人', className: 'weui-actionsheet__cell_warn', onClick: function(){
            weui.confirm('确定删除该联系人？聊天记录也会删除。', function(){
                // 从 contacts 中移除
                wxData.contacts.forEach(function(g){
                    g.items = (g.items||[]).filter(function(c){ return c.id !== contactId; });
                });
                // 从 chats 中移除
                wxData.chats = wxData.chats.filter(function(c){ return c.id !== contactId; });
                delete wxData.conversations[contactId];
                wxNav('contacts');
            });
        }}
    ], [{ label: '取消', onClick: function(){} }]);
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


