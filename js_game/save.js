// ══════════════════════════════════════
// 存读档管理系统
// ══════════════════════════════════════

function autoSave() {
    if (!gameState) return;
    const saveData = {
        gameState: gameState,
        timestamp: Date.now(),
        preview: gameState.location + ' · Day' + gameState.day + ' ' + gameState.timeOfDay
    };
    localStorage.setItem('saosao_auto_save', JSON.stringify(saveData));
}

function manualSave(slot) {
    const saveData = {
        gameState: gameState,
        timestamp: Date.now(),
        preview: gameState.location + ' · Day' + gameState.day + ' ' + gameState.timeOfDay + ' · 第' + gameState.round + '回合'
    };
    localStorage.setItem('saosao_save_' + slot, JSON.stringify(saveData));
    showToast('已保存到槽位 ' + slot);
    renderSaveSlots();
}

function loadSave(slot) {
    const key = slot === 'auto' ? 'saosao_auto_save' : 'saosao_save_' + slot;
    const data = localStorage.getItem(key);
    if (!data) { showToast('该槽位无存档'); return; }

    try {
        const parsed = JSON.parse(data);
        gameState = parsed.gameState;
        migrateSave(gameState);
        loadApiConfig();
        navTo('page-game');

        // 重新渲染当前界面
        const lastAI = [...gameState.history].reverse().find(h => h.role === 'assistant');
        if (lastAI) {
            parseAndRender(lastAI.content);
        } else {
            document.getElementById('game-narrative').textContent = '存档已加载，等待继续...';
            document.getElementById('bottom-tabbar').style.display = 'flex';
        }

        showToast('存档已加载');
    } catch (e) {
        showToast('存档数据损坏');
    }
}

function deleteSave(slot) {
    if (!confirm('确定删除槽位 ' + slot + ' 的存档？')) return;
    localStorage.removeItem('saosao_save_' + slot);
    showToast('已删除');
    renderSaveSlots();
}

function renderSaveSlots() {
    const autoData = localStorage.getItem('saosao_auto_save');
    const autoSlot = document.getElementById('auto-save-slot');
    if(autoSlot) {
        if (autoData) {
            const parsed = JSON.parse(autoData);
            const time = new Date(parsed.timestamp).toLocaleString('zh-CN');
            autoSlot.innerHTML = `<div class="save-slot-header"><span class="save-slot-name">🔄 自动存档</span><span class="save-slot-time">${time}</span></div><div class="save-slot-preview">${parsed.preview || '...'}</div>`;
        } else {
            autoSlot.innerHTML = '<div class="save-slot-empty">暂无自动存档</div>';
        }
    }

    const container = document.getElementById('manual-save-slots');
    if(!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const data = localStorage.getItem('saosao_save_' + i);
        const div = document.createElement('div');
        div.className = 'save-slot';
        if (data) {
            const parsed = JSON.parse(data);
            const time = new Date(parsed.timestamp).toLocaleString('zh-CN');
            div.innerHTML = `<div class="save-slot-header"><span class="save-slot-name">📁 槽位 ${i}</span><span class="save-slot-time">${time}</span></div><div class="save-slot-preview">${parsed.preview || '...'}</div><div class="save-actions"><button class="btn btn-secondary" onclick="loadSave(${i})">读取</button><button class="btn btn-secondary" onclick="manualSave(${i})">覆盖</button><button class="btn btn-danger" onclick="deleteSave(${i})">删除</button></div>`;
        } else {
            div.innerHTML = `<div class="save-slot-header"><span class="save-slot-name">📁 槽位 ${i}</span><span class="save-slot-time">空</span></div><div class="save-slot-empty">空存档</div><div class="save-actions"><button class="btn btn-primary" onclick="manualSave(${i})">保存到此</button></div>`;
        }
        container.appendChild(div);
    }
}

function exportSave() {
    const allSaves = { auto: localStorage.getItem('saosao_auto_save') };
    for (let i = 1; i <= 5; i++) allSaves['slot_' + i] = localStorage.getItem('saosao_save_' + i);
    allSaves.api_config = localStorage.getItem('saosao_api_config');

    const blob = new Blob([JSON.stringify(allSaves, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '嫂嫂模拟器存档_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('存档已导出');
}

function importSave(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
        if (data.auto) {
    const val = typeof data.auto === 'string' ? data.auto : JSON.stringify(data.auto);
    localStorage.setItem('saosao_auto_save', val);
}
            for (let i = 1; i <= 5; i++) {
                if (data['slot_' + i]) localStorage.setItem('saosao_save_' + i, data['slot_' + i]);
            }
            if (data.api_config) localStorage.setItem('saosao_api_config', data.api_config);
            showToast('存档已导入');
            renderSaveSlots();
        } catch (err) {
            showToast('导入失败：文件格式错误');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


function migrateSave(gs) {
    if (!gs.phoneStore) gs.phoneStore = { wechat:{ chats:[], conversations:{}, moments:[] }, weibo:[], douban:{}, douyin:[], redbook:[], bilibili:[], tfamily:[], imessage:[] };
    if (!gs.currentTab) gs.currentTab = 'story';
    if (!gs.lastPhoneApp) gs.lastPhoneApp = 'wechat';
    if (!gs.values) gs.values = { charm:50, eq:50, connections:30, energy:100, energyMax:100 };
    if (!gs.phoneBadge && gs.phoneBadge !== 0) gs.phoneBadge = 0;
}
