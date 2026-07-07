// ══════════════════════════════════════
// 基础 UI 导航功能
// ══════════════════════════════════════
// ★ 每次发送给AI时追加的格式强制提醒（不存入history，仅发送时拼接）
const FORMAT_REMINDER = `
[系统格式提醒] 你的输出必须严格包含以下区块标记，缺任何一个=输出无效：
---NARRATIVE---
（叙事正文）
---STATUS---
location: 地点
time: DayX · 时段
---CHOICES---
A/B/C/D选项
---PHONE_DATA---
{"app_data":{...},"badges":{...}}
必须把叙事中提到的所有手机消息写进PHONE_DATA的JSON里！
---DATA_UPDATE---
数值变动
---END---`;

function navTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');

    // ★ 非游戏页面隐藏底部tabbar
    const tabbar = document.getElementById('bottom-tabbar');
    if (tabbar) tabbar.style.display = (pageId === 'page-game') ? 'flex' : 'none';

    if (pageId === 'page-save' && typeof renderSaveSlots === 'function') {
        renderSaveSlots();
    }
}

// 从存读档页面返回
function goBackFromSave() {
    // 如果 gameState 存在说明游戏正在进行中，退回游戏界面；否则退回主页
    if (gameState && gameState.round > 0) {
        navTo('page-game');
    } else {
        navTo('page-home');
    }
}

// 点击主页“进入游戏”按钮时触发
function checkApiAndStart() {
    // 1. 先检查有没有配置 API (假设你的 save.js 里有 loadApiConfig)
    if (typeof loadApiConfig === 'function') loadApiConfig();

    if (!window.apiConfig || !window.apiConfig.key) {
        // 如果没配 API，弹窗提示并跳转到 API 配置页
        showToast('请先配置 API Key');
        navTo('page-api');
    } else {
        // 🌟 如果配置了，跳转到“填写人设”的新建游戏页面！
        navTo('page-character');
    }
}
// ══════════════════════════════════════
// 游戏主循环与核心 Prompt 动态组装引擎
// ══════════════════════════════════════

let gameState = null;

// 【核心】动态组装终极 System Prompt（分模块按需加载）
function buildSystemPrompt() {
    const targetNames = Object.keys(gameState.targets);
    const targetStatus = targetNames.map(name => {
        const t = gameState.targets[name];
        return `  ${name}：好感${t.affection} / 占有欲${t.possessiveness} / 信任${t.trust} / 警惕${t.alertness}`;
    }).join('\n');

    // ★ 新增：随机事件间隔计算
    const roundsSinceLastEvent = gameState.round - (gameState.lastRandomEventRound || 0);
    const randomEventHint = roundsSinceLastEvent >= 2
        ? `距上次随机事件已过${roundsSinceLastEvent}天，本回合必须触发一个随机事件`
        : `距上次随机事件已过${roundsSinceLastEvent}天，可选择是否触发`;

    const currentState = `
═══════════════════════════════════
【当前动态状态与专属世界线】
═══════════════════════════════════
【当前游戏状态】
回合：${gameState.round} / Day${gameState.day} · ${gameState.timeOfDay}
本日已进行对话轮次：${gameState.todayDialogCount || 1}
${randomEventHint}
地点：${gameState.location}
舆论值：${gameState.reputation}/100${gameState.reputationEvents && gameState.reputationEvents.length > 0 ? '（近期关联：' + [...new Set(gameState.reputationEvents.slice(-5).map(e => e.target).filter(t => t))].join('、') + '）' : ''}
玩家属性：魅力${gameState.values.charm} / 情商${gameState.values.eq} / 人脉${gameState.values.connections} / 精力${gameState.values.energy}/${gameState.values.energyMax}

【玩家角色卡】：\n${gameState.playerCard}

【攻略对象卡】：\n${gameState.targetCards.map(t => `[初始关系: ${t.relationship}]\n${t.content}`).join('\n\n')}

【攻略对象状态】：\n${targetStatus}

【叙事偏好】：${gameState.narrativePref}

【跳天指令处理规则】：
当玩家输入"【跳过X天】"时，你在 ---STATUS--- 中直接输出 time: Day${gameState.day}+X对应的天数 · 上午。前端会自动推进日历。叙事正文用80-150字摘要概括跳过的日子。

⚠️ 【本局专属世界线机制（极度机密，绝不直接告诉玩家，仅用于暗中驱动剧情）】⚠️
${gameState.customModules || "无特殊暗线"}
`;

    // ═══ 分模块组装 ═══
    // 必带模块：世界观+铁律+关系系统 / 叙事文风 / 舆论系统 / NPC独立关系线
    let prompt = PROMPT_CORE + '\n' + PROMPT_NARRATIVE + '\n' + PROMPT_OPINION + '\n' + PROMPT_NPC;

    // 条件加载：舆论≥30时加载公司危机处理模块
    if (gameState.reputation >= 30) {
        prompt += '\n' + PROMPT_CRISIS;
    }

    // 条件加载：有攻略对象好感≥50时加载亲密规则
    const hasIntimateCondition = Object.values(gameState.targets).some(t => t.affection >= 50);
    if (hasIntimateCondition) {
        prompt += '\n' + PROMPT_INTIMACY;
    }

    // 随机事件系统每回合带
    prompt += '\n' + PROMPT_RANDOM;

    // 动态状态（玩家卡+攻略对象卡+当前数值）
    prompt += '\n' + currentState;

    // 格式约束永远放最后（输出结构规范）
    prompt += '\n' + PROMPT_FORMAT;

    return prompt;
}

// ══════════════════════════════════════
// 角色设定页功能支持
// ══════════════════════════════════════

// ★ 分步向导：控制第 n 步面板显隐 + 步骤指示器高亮
function goStep(n) {
    // 简单前置校验：第 1 步至少要有名字或粘贴内容才能进入第 2 步
    if (n === 2) {
        const quickShown = document.getElementById('player-tab-quick').style.display !== 'none';
        const hasName = quickShown
            ? document.getElementById('char-name').value.trim()
            : document.getElementById('player-card-paste').value.trim();
        if (!hasName) { showToast('请先填写你的姓名或粘贴角色卡'); return; }
    }

    if (n === 3) {
        const hasTarget = [...document.querySelectorAll('.target-textarea')].some(ta => ta.value.trim());
        if (!hasTarget) { showToast('请至少填写一个攻略对象的人设卡'); return; }
    }

    for (let i = 1; i <= 3; i++) {

        const panel = document.getElementById('wizard-step-' + i);
        if (panel) panel.style.display = (i === n) ? 'block' : 'none';
    }
    // 步骤指示器高亮
    document.querySelectorAll('#step-indicator .step-dot').forEach(dot => {
        const s = parseInt(dot.dataset.step);
        dot.classList.toggle('active', s === n);
        dot.classList.toggle('done', s < n);
    });
    // 回到容器顶部，避免长表单切换后停留在中间
    const container = document.querySelector('#page-character .container');
    if (container) container.scrollTop = 0;
}

// 切换快速创建与粘贴导入
function switchPlayerTab(tab) {
    document.querySelectorAll('#player-tabs .tab-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`#player-tabs .tab-item[onclick="switchPlayerTab('${tab}')"]`).classList.add('active');

    document.getElementById('player-tab-quick').style.display = tab === 'quick' ? 'block' : 'none';
    document.getElementById('player-tab-paste').style.display = tab === 'paste' ? 'block' : 'none';
}

// 增加攻略对象
function addTargetCard() {
    const container = document.getElementById('target-cards-container');
    const count = container.querySelectorAll('.target-card').length;
    const div = document.createElement('div');
    div.className = 'target-card';
    div.dataset.index = count;
    div.innerHTML = `
  <div class="target-card-header">
    <span class="target-card-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:3px;"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>攻略对象 ${count + 1}</span>
    <span class="delete-target" onclick="this.closest('.target-card').remove()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" style="vertical-align:-1px;margin-right:2px;"><line x1="5" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="19" y1="5" x2="5" y2="19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>删除</span>
  </div>
  <textarea class="input-field target-textarea" rows="4" placeholder="粘贴攻略对象人设卡..."></textarea>
  <div class="form-group" style="margin-top:10px;">
    <label class="label">你与 TA 的初始关系</label>
    <input class="input-field target-rel" list="rel-list" placeholder="请选择或自由输入..." onfocus="this.select()">
  </div>
`;
    container.appendChild(div);
}

// ⭐️ 核心：一键用 AI 按照你的 Prompt 扩写人设卡
async function generatePlayerCard() {
    if (typeof loadApiConfig === 'function') loadApiConfig();
    if (!window.apiConfig || !window.apiConfig.key) { showToast('请先配置并保存 API Key'); return; }

    const btn = document.querySelector('button[onclick="generatePlayerCard()"]');
    const resArea = document.getElementById('gen-card-area');
    const resEl = document.getElementById('player-card-result');

    btn.textContent = '⏳ AI 正在奋笔疾书...';
    btn.disabled = true;
    resArea.style.display = 'block';
    resEl.value = 'AI 编剧中，这可能需要十秒钟左右，请稍候...';

    // 取出面板上填的所有值
    const pName = document.getElementById('char-name').value || '未命名';
    const pAge = document.getElementById('char-age').value || '22';
    const pYear = document.getElementById('char-year') ? document.getElementById('char-year').value : '2026';
    const pJob = document.getElementById('char-job').value;
    const pLook = document.getElementById('char-look').value;
    const pFam = document.getElementById('char-fam') ? document.getElementById('char-fam').value : '';
    const pLview = document.getElementById('char-lview') ? document.getElementById('char-lview').value : '';

    // 取出玩家纯自由输入的暗线和自定义一句话
    const pCustom = document.getElementById('char-custom') ? document.getElementById('char-custom').value.trim() : '';

    // 组装性格维度 (防抖：万一没获取到则为空)
    const getVal = (id) => document.getElementById(id) ? document.getElementById(id).value : '随机';

    const traits = `社交:${getVal('char-soc')}, 决策:${getVal('char-dec')}, 家庭经济:${getVal('char-fam')}, 恋爱观:${getVal('char-lview')}`;

    const aiPrompt = `你是《嫂嫂模拟器》的角色卡辅助生成AI。本游戏围绕中国娱乐公司"时代峰峻"（总部北京，分部重庆）及其旗下艺人展开。所有角色设定默认基于中国内地背景。

请根据玩家提供的信息，生成一份完整的、极度丰满的【玩家角色卡】。

━━━━━━━━━━━━━━━━━━━━

【玩家提供的核心信息】

自定义一句话人设（若有，绝对优先参考，覆盖一切选项冲突）：
${pCustom || '未填写'}

基础信息：姓名 ${pName} | 年龄 ${pAge} | 初始年份 ${pYear}年
职业/身份：${pJob || '未选择'}
外貌特征：${pLook || '未选择'}
性格维度：${traits}
家庭经济：${pFam || '未选择'}
恋爱观：${pLview || '未选择'}

━━━━━━━━━━━━━━━━━━━━

【生成规则】

1. 如果玩家填写了"自定义一句话人设"，以该内容为绝对核心基调进行扩写，菜单选项仅作辅助参考。
2. 如果某项显示"未选择"或"随机"，请你大胆发挥创意补全，但必须与已有信息逻辑自洽。
3. 每个维度不要机械重复选项词汇，必须扩写成有画面感、有故事感的具体描述（每项50-150字）。
4. 性格描写要有内在矛盾和张力（比如"表面社牛实则极度缺爱"），让角色立体。
5. 直接输出角色卡，不要任何开场白、解释或废话。

━━━━━━━━━━━━━━━━━━━━

【必须严格遵循的输出格式】

【玩家角色卡 · ${pName}】

📌 基础档案
· 姓名：${pName}
· 年龄：${pAge}
· 职业：（基于选项扩写为具体的日常状态描述，包含工作内容、上班环境、同事关系等细节）
· 初始年份：${pYear}年

👤 外貌
（不少于100字。具体描写五官、身材、气质、标志性特征。要像小说里第一次见到女主时的镜头描写，有画面感。可以提及穿搭风格、给人的第一印象。）

🎭 性格特质（AI参考，不限制玩家后续选择）
· 社交倾向：（扩写，包含具体场景表现）
· 决策模式：（扩写，举一个日常决策的例子）
· 情绪底色：（扩写，描述她独处时的精神状态）
· 自尊水平：（扩写，描述她被否定时的反应）
· 待人风格：（扩写，描述她和不同关系的人分别怎么相处）
· 主动与否：（扩写，在感情中的具体表现）
· 独立程度：（扩写，经济和情感两个层面）
· 恋爱模式：（扩写，曾经的恋爱经历或幻想）

🏠 家庭与经济
（不少于80字。具体描写家庭结构、父母关系、经济状况对日常生活的影响、住房情况等。）

❤️ 恋爱观
（不少于80字。写出她对"和偶像恋爱"这件事的真实内心想法，包括对地下恋、曝光风险、粉丝心理的态度。）`;

    try {
        const result = await callAI([
            { role: 'system', content: '你是一位顶级的文字游戏角色设计师。你的文笔极其细腻，擅长用具体的感官细节和微小的行为习惯来刻画人物。输出必须严格遵循用户指定的格式，不添加任何额外标题或解释。' },
            { role: 'user', content: aiPrompt }
        ], null, 2000);
        resEl.value = result.trim();
    } catch (e) {
        resEl.value = '生成失败：' + e.message + '\n请检查 API 配置或网络。';
    }

    btn.textContent = '✨ 重新生成人设卡';
    btn.disabled = false;
}

// ══════════════════════════════════════
// 游戏初始化与预演算流转
// ══════════════════════════════════════

async function startGame() {
    let playerCard = '';
    if (document.getElementById('player-tab-quick').style.display !== 'none') {
        const generated = document.getElementById('player-card-result').value.trim();
        playerCard = (generated && !generated.startsWith('⏳') && !generated.startsWith('AI 编剧')) ? generated : `名字：${document.getElementById('char-name').value.trim()}\n职业：${document.getElementById('char-job').value}`;
    } else {
        playerCard = document.getElementById('player-card-paste').value.trim();
    }
    if (!playerCard || playerCard === '名字：\n职业：') { showToast('请填写玩家角色卡'); return; }

    const targetDivs = document.querySelectorAll('.target-card');
    const targets = [];
    targetDivs.forEach(div => {
        const val = div.querySelector('.target-textarea').value.trim();
        const relEl = div.querySelector('.target-rel');
        const rel = relEl ? relEl.value.trim() : '陌生人'; // 🌟 独立抓取每个男主的关系！
        if (val) targets.push({ content: val, relationship: rel || '陌生人' });
    });
    if (targets.length === 0) { showToast('请至少填写一个攻略对象'); return; }

    if (typeof loadApiConfig === 'function') loadApiConfig();
    if (!window.apiConfig || !window.apiConfig.key) { showToast('请先配置API'); return; }

    gameState = {
        round: 1,
        day: 1,
        timeOfDay: '上午',
        timeBlock: 'morning',
        todayDialogCount: 1,
        lastRandomEventRound: 0,
        endingTriggered: false,        // ★ 结局是否已触发（防重复弹窗）
        reputationEvents: [],          // ★ 舆论事件记录 [{round, target, delta}]
        staleRoundsCount: 0,           // ★ 连续无升温回合计数（用于结局判定）
        // ★ 游戏时间系统：完整日历日期
        year: parseInt(document.getElementById('char-year') ? document.getElementById('char-year').value : '2026') || 2026,
        month: 6,
        date: 28,
        weekday: '周六',
        location: '未知',
        reputation: 0,
        playerCard: playerCard,
        targetCards: targets,
        narrativePref: document.getElementById('narrative-pref').value,
        history: [],
        phoneBadge: 0,
        values: { charm: 50, eq: 50, connections: 30, energy: 100, energyMax: 100 },
        targets: {},
        customModules: "",
        phoneStore: { // ★ 全局手机仓库
            wechat: { chats: [], conversations: {}, moments: [] },
            weibo: [], weibo_hotsearch: [], douban: {}, douyin: [], redbook: [], bilibili: [], tfamily: [], imessage: []
        },
        currentTab: 'story', // ★ 当前底部Tab（默认剧情）
        lastPhoneApp: 'wechat' // ★ 手机内最后停留的App（Tab记忆）
    };
    // ★ 提取玩家姓名存入 gameState
    gameState.playerName = document.getElementById('char-name').value.trim() || '玩家';

    // ① 先解析每个攻略对象的名字，填充 gameState.targets
    targets.forEach((cardObj, idx) => {

        let name = '';
        const patterns = [/名字[：:]\s*(.+)/, /姓名[：:]\s*(.+)/, /角色[：:]\s*(.+)/, /^[【\[](.+?)[】\]]/m, /^(.{2,4})[,，\s/|·]/m];
        for (const p of patterns) {
            const m = cardObj.content.match(p);
            if (m) { name = m[1].trim().split(/[\s,，、/|·：:]/)[0]; break; }
        }
        if (!name) name = cardObj.content.trim().split(/[\n\r]/)[0].substring(0, 6).trim() || '攻略对象' + (idx + 1);
        gameState.targets[name] = { affection: 0, possessiveness: '低', trust: 50, alertness: 20 };
    });

    // ② 再把已解析出的攻略对象写入微信通讯录，避免开局空白
    targets.forEach((cardObj, idx) => {
        const name = Object.keys(gameState.targets)[idx];
        const rel = cardObj.relationship || '陌生人';
        const id = 'wx_' + name;
        // 只有工作关系及以上才预置微信对话
        const hasWechat = /工作|同事|合作|好友|私交|前任|朋友|熟人|点头/.test(rel);
        if (hasWechat) {
            gameState.phoneStore.wechat.chats.push({ id, name, avatar: name[0], color: '#4a90d9', lastMsg: '', time: '' });
            gameState.phoneStore.wechat.conversations[id] = [];
        }
    });

    // ★ 新游戏：清空手机 iframe 的旧数据
    window._pendingPhoneMessages = [];
    var phoneIframe = document.getElementById('phone-iframe');
    if (phoneIframe && phoneIframe.contentWindow && phoneIframe.src && phoneIframe.src.indexOf('phone.html') !== -1) {
        phoneIframe.contentWindow.postMessage({ type: 'PHONE_INIT', playerName: gameState.playerName }, '*');
    }

    navTo('page-game');
    renderGameUI('', []);
    await generateCustomWorldline(); // 触发世界线预演算！
}


// 动态世界线生成器 (后台幕后演算你的神级规则)
async function generateCustomWorldline() {
    setLoading(true);
    document.querySelector('.loading-text').textContent = "正在演算本局专属的世界线与暗线剧本...";

    const pJob = document.getElementById('char-job') ? document.getElementById('char-job').value : '未知';
    const pSecret = document.getElementById('char-secret') ? document.getElementById('char-secret').value : '无特殊秘密';
    const relationDesc = gameState.targetCards.map((t, idx) => `目标${idx + 1}: \n设定:${t.content}\n【与玩家初始关系】:${t.relationship}`).join('\n\n');

    const initPrompt = `你是一个游戏系统设计师。请根据玩家提供的身份，生成一份完整的【专属职业机制模块】，供游戏主脑在运行时进行推演。

【玩家最终角色卡】：
${gameState.playerCard}

【隐藏的秘密/多重身份】：
${pSecret}

【攻略对象及分别的初始关系】：
${relationDesc}

【生成规则】：
一、必须生成的内容（请用清晰的标题和列表输出）
1. 身份结构与核心矛盾：该身份的戏剧张力是什么？暴露后果的严重程度？
2. 身份特权与限制：能做到什么特权？有什么致命软肋？
3. 舆论危机对照表：按四级(🟡苗头 / 🟠疑似 / 🔴高危 / ⚫实锤)列出触发情境、后果及应对方式。
4. 舆论值增减事件表：列出该职业下推高舆论值的事件和降低手段（附带代价）。
5. 随机事件身份侧重：本身份专属事件池（至少3条具体事件示例）。
6. 身份专属机制：该职业独有的游戏机制带来的独特张力。

二、按需生成的内容（如有隐藏身份、多账号等需求，请自行添加：玩家发布功能、信息暴露风险机制、圈内泄露风险、外部力量介入机制等）。

三、【必须输出】根据玩家的职业/身份和各攻略对象的初始关系，输出初始数值区块。规则：
- charm（魅力）：根据外貌和职业推断，30-80
- eq（情商）：根据性格推断，30-80
- connections（人脉）：根据职业和背景推断，10-70
- energy（精力）：固定100
- 每个攻略对象的 affection：朋友关系35-50，前任40-60，同事20-35，陌生人0-15，粉丝关系5-20
- 每个攻略对象的 trust：朋友50-70，同事40-60，前任30-50，陌生人30-40
- 每个攻略对象的 alertness：默认10-25，前任可能30-50

格式必须严格如下（一行一条，英文冒号）：
---INITIAL_VALUES---
charm: 65
eq: 45
connections: 55
energy: 100
affection_角色名: 35
trust_角色名: 60
alertness_角色名: 15
---END_INITIAL_VALUES---

注意：直接输出这些设定的文本（格式清晰即可），不要废话，这份文本将被直接注入到游戏主循环的 Prompt 中，作为约束 AI 的法则。`;

    try {
        const response = await callAI([{ role: 'system', content: '严格按照指定格式输出底层游戏规则模块。' },
        { role: 'user', content: initPrompt }], null, 2500);

        // ★ 新增：解析 INITIAL_VALUES 区块，覆盖初始数值
        const ivMatch = response.match(/---INITIAL_VALUES---([\s\S]*?)---END_INITIAL_VALUES---/);
        if (ivMatch) {
            ivMatch[1].trim().split('\n').forEach(line => {
                const m = line.match(/^([^：:]+)[：:]\s*(.+)$/);
                if (!m) return;
                const k = m[1].trim(), v = parseInt(m[2].trim());
                if (isNaN(v)) return;
                if (['charm', 'eq', 'connections', 'energy'].includes(k)) {
                    gameState.values[k] = Math.max(0, Math.min(100, v));
                } else if (k.startsWith('affection_')) {
                    const name = k.replace('affection_', '');
                    if (gameState.targets[name]) gameState.targets[name].affection = Math.max(0, Math.min(100, v));
                } else if (k.startsWith('trust_')) {
                    const name = k.replace('trust_', '');
                    if (gameState.targets[name]) gameState.targets[name].trust = Math.max(0, Math.min(100, v));
                } else if (k.startsWith('alertness_')) {
                    const name = k.replace('alertness_', '');
                    if (gameState.targets[name]) gameState.targets[name].alertness = Math.max(0, Math.min(100, v));
                }
            });
        }

        // 去掉 INITIAL_VALUES 区块后存为 customModules（不让这段数据污染 prompt）
        gameState.customModules = response.replace(/---INITIAL_VALUES---[\s\S]*?---END_INITIAL_VALUES---/, '').trim();
        document.querySelector('.loading-text').textContent = "正在生成第一回合剧情...";
        await sendFirstRound();
    } catch (e) {
        document.getElementById('game-narrative').textContent = '世界线预演算失败：' + e.message;
        setLoading(false);
    }
}

async function sendFirstRound() {
    if (window.isRequesting) return;       // ← 新增：防止重复触发
    window.isRequesting = true;            // ← 新增：标记请求开始

    const narrativeEl = document.getElementById('game-narrative');
    narrativeEl.textContent = '...';
    setLoading(true);

    try {
        const messages = [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: '游戏开始。请生成第一回合的开场叙事。' + FORMAT_REMINDER }
        ];


        gameState.history.push({ role: 'user', content: '[游戏开始]' });

        await callAIStream(messages, {
            onChunk: (chunk, fullText) => {
                let displayStr = fullText;
                const nMatch = fullText.match(/---NARRATIVE---([\s\S]*?)(?=---STATUS---|---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
                if (nMatch) {
                    displayStr = nMatch[1].trim();
                } else if (fullText.includes('---')) {
                    displayStr = fullText.replace(/---[\w_]+---/g, '').trim();
                }
                narrativeEl.innerHTML = displayStr
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>');
            },

            onDone: (fullText) => {
                gameState.history.push({ role: 'assistant', content: fullText });
                parseAndRender(fullText);
                autoSave();
                window.isRequesting = false;   // ← 新增：请求完成，解锁
                setLoading(false);
            },
            onError: (err) => {
                narrativeEl.textContent = '❌ 请求失败：' + err.message;
                window.isRequesting = false;   // ← 新增：出错也要解锁
                setLoading(false);
            }
        });
    } catch (e) {
        narrativeEl.textContent = '❌ 请求出错：' + e.message;
        window.isRequesting = false;
        setLoading(false);
    }
}


async function sendPlayerInput() {
    if (window.isRequesting) return;
    const input = document.getElementById('game-input');
    const text = input.value.trim();
    if (!text) return; input.value = ''; await sendToAI(text);
}
function sendChoice(choiceText) { if (!window.isRequesting) sendToAI('我选择：' + choiceText); }
function sendContinue() { if (!window.isRequesting) sendToAI('[继续]'); }

async function sendToAI(userText) {
    if (window.isRequesting) return;

    window.isRequesting = true;
    setLoading(true);
    document.getElementById('game-send-btn').disabled = true;

    // 玩家发出的文字，先存入历史记录
    gameState.history.push({ role: 'user', content: userText });

    // ★ 跳天指令预处理：提取跳过天数，让AI知道目标Day
    const skipMatch = userText.match(/【跳过(\d+)天】/);
    let skipHint = '';
    if (skipMatch) {
        const skipDays = Math.min(parseInt(skipMatch[1]), 7); // 最多跳7天
        const targetDay = gameState.day + skipDays;
        // 只在本次请求拼接，不写回 history
        skipHint = `\n[系统提示：请在STATUS中输出 time: Day${targetDay} · 上午，叙事用80-150字摘要]`;
    }

    // 构建请求消息（系统prompt + 历史记录裁剪至最近20条）
    const trimmedHistory = gameState.history.slice(-20);
    const messages = [
        { role: 'system', content: buildSystemPrompt() },
        ...trimmedHistory
    ];
    // 末尾追加格式强制提醒（复制成新对象，不污染 history 原引用）
    if (messages.length > 1) {
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = { ...last, content: last.content + skipHint + FORMAT_REMINDER };
    }

    const narrativeEl = document.getElementById('game-narrative');
    narrativeEl.textContent = '';

    try {
        await callAIStream(messages, {
            onChunk: (chunk, fullText) => {
                let displayStr = fullText;
                const nMatch = fullText.match(/---NARRATIVE---([\s\S]*?)(?=---STATUS---|---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
                if (nMatch) {
                    displayStr = nMatch[1].trim();
                } else if (fullText.includes('---')) {
                    displayStr = fullText.replace(/---[\w_]+---/g, '').trim();
                }
                narrativeEl.innerHTML = displayStr
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>');
            },

            onDone: (fullText) => {
                // 完全接收完毕后，存入历史，并调用完整的解析逻辑
                gameState.history.push({ role: 'assistant', content: fullText });
                // ★ round++ 移到 parseAndRender 里，按 Day 变化触发
                parseAndRender(fullText);
                autoSave();
                window.isRequesting = false;
                setLoading(false);
                document.getElementById('game-send-btn').disabled = false;
            },

            onError: (err) => {
                narrativeEl.textContent = '❌ 请求失败：' + err.message;
                gameState.history.pop();
                window.isRequesting = false;
                setLoading(false);
                document.getElementById('game-send-btn').disabled = false;
            }
        });
    } catch (e) {
        narrativeEl.textContent = '❌ 请求出错：' + e.message;
        gameState.history.pop();
        window.isRequesting = false;
        setLoading(false);
        document.getElementById('game-send-btn').disabled = false;
    }
}

// ══════════════════════════════════════
// 解析与界面渲染
// ══════════════════════════════════════
function parseAndRender(response, skipPhone) {
    let narrative = '';
    const nMatch = response.match(/---NARRATIVE---([\s\S]*?)(?=---STATUS---|---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
    if (nMatch) narrative = nMatch[1].trim(); else narrative = response.replace(/---[\w_]+---[\s\S]*$/m, '').trim();

    const sMatch = response.match(/---STATUS---([\s\S]*?)(?=---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
    if (sMatch) {
        const locMatch = sMatch[1].match(/location\s*[:：]\s*(.+)/);
        const timeMatch = sMatch[1].match(/time\s*[:：]\s*(.+)/);
        if (locMatch) gameState.location = locMatch[1].trim();
        if (timeMatch) {
            const timeStr = timeMatch[1].trim();
            const dayMatch = timeStr.match(/Day(\d+)/);
            const periodMatch = timeStr.match(/(上午|下午|晚上)/);
            // ★ 时间块映射表
            const periodToBlock = { '上午': 'morning', '下午': 'afternoon', '晚上': 'evening' };
            // ★ 日历日期推进：Day变化时同步前进
            if (dayMatch) {
                const newDay = parseInt(dayMatch[1]);
                const diff = newDay - gameState.day;
                if (diff > 0) {
                    gameState.round += diff;
                    for (let i = 0; i < diff; i++) advanceGameDate();
                    gameState.todayDialogCount = 1;
                    // ★ 新的一天精力自动恢复满
                    gameState.values.energy = gameState.values.energyMax || 100;
                } else {
                    // ★ 同一天内：对话轮次+1
                    gameState.todayDialogCount = (gameState.todayDialogCount || 1) + 1;
                }
                gameState.day = newDay;
            } else {
                // ★ 没有Day信息时也累加对话轮次
                gameState.todayDialogCount = (gameState.todayDialogCount || 1) + 1;
            }
            if (periodMatch) {
                const newPeriod = periodMatch[1];
                // ★ 更新时间块
                gameState.timeBlock = periodToBlock[newPeriod] || gameState.timeBlock;
                gameState.timeOfDay = newPeriod;
            }
        }
    }

    let choices = [];
    const cMatch = response.match(/---CHOICES---([\s\S]*?)(?=---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
    if (cMatch) {
        cMatch[1].trim().split('\n').forEach(line => {
            const m = line.match(/^([A-D])[.、]\s*(.+)/);
            if (m) choices.push({ label: m[1], text: m[2].trim() });
        });
    }

    // 解析全平台手机数据 (JSON格式提取)
    // ★ 修复：读档时 skipPhone=true 跳过，避免对已入库的老数据重复解析报错
    const pMatch = !skipPhone && response.match(/---PHONE_DATA---([\s\S]*?)(?=---DATA_UPDATE---|---END---|$)/);
    if (pMatch) {
        console.log('[PHONE_DATA 原始内容]', pMatch[1].trim().substring(0, 500)); // ★ 调试日志
        try {

            const rawJson = pMatch[1].trim()
                .replace(/^```json?\s*/i, '').replace(/\s*```$/, '')  // 去掉markdown代码块
                .replace(/,\s*([}\]])/g, '$1')                        // 去掉尾部逗号
                .replace(/'/g, '"')                                    // 单引号转双引号
                .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');           // key没引号的补上
            // 修复未闭合的花括号/方括号
            let fixed = rawJson;
            let opens = (fixed.match(/\{/g) || []).length;
            let closes = (fixed.match(/\}/g) || []).length;
            while (closes < opens) { fixed += '}'; closes++; }
            let openB = (fixed.match(/\[/g) || []).length;
            let closeB = (fixed.match(/\]/g) || []).length;
            while (closeB < openB) { fixed += ']'; closeB++; }
            const newPhoneData = JSON.parse(fixed);

            mergeIntoPhoneStore(newPhoneData);
            let newBadge = 0;
            if (newPhoneData.badges) Object.values(newPhoneData.badges).forEach(v => newBadge += (v || 0));
            gameState.phoneBadge = (gameState.phoneBadge || 0) + newBadge;
            pushStoreToPhone();
        } catch (e) {
            console.error('手机数据解析失败', e);
        }
    } else if (!skipPhone) {
        console.log('[PHONE_DATA 未检测到] AI输出末尾200字：', response.slice(-200)); // ★ 调试日志
    }

    const dMatch = response.match(/---DATA_UPDATE---([\s\S]*?)(?=---END---|$)/);

    if (dMatch) {
        dMatch[1].trim().split('\n').forEach(line => {
            const m = line.match(/^([^：:]+)[：:]\s*(.+)$/);
            if (!m) return;
            const key = m[1].trim(), val = m[2].trim();

            // ★ 通用数值解析辅助函数（支持+/-相对值和绝对值，clamp到0-100）
            const parseNumeric = (current, rawVal) => {
                const n = parseInt(rawVal);
                if (isNaN(n)) return current;
                return (rawVal.startsWith('+') || rawVal.startsWith('-'))
                    ? Math.max(0, Math.min(100, current + n))
                    : Math.max(0, Math.min(100, n));
            };

            if (key === 'reputation') {
                const oldRep = gameState.reputation;
                gameState.reputation = parseNumeric(gameState.reputation, val);
                const delta = gameState.reputation - oldRep;
                // ★ 舆论变动时记录关联对象（从同回合的affection变动推断）
                if (delta !== 0) {
                    // 关联对象默认取本轮有affection变动的第一个目标
                    let relatedTarget = '';
                    dMatch[1].trim().split('\n').forEach(l => {
                        const am = l.match(/^affection_([^：:]+)/);
                        if (am && !relatedTarget) relatedTarget = am[1].trim();
                    });
                    gameState.reputationEvents = gameState.reputationEvents || [];
                    gameState.reputationEvents.push({
                        round: gameState.round,
                        day: gameState.day,
                        target: relatedTarget,
                        delta: delta
                    });
                    // 保留最近20条，防止无限膨胀
                    if (gameState.reputationEvents.length > 20) {
                        gameState.reputationEvents = gameState.reputationEvents.slice(-20);
                    }
                }
            }
            // ★ 新增：玩家属性 charm / eq / connections / energy
            else if (['charm', 'eq', 'connections', 'energy'].includes(key)) {
                const cur = gameState.values[key] || 50;
                const n = parseInt(val);
                if (!isNaN(n)) {
                    const upper = (key === 'energy') ? (gameState.values.energyMax || 100) : 100;
                    gameState.values[key] = (val.startsWith('+') || val.startsWith('-'))
                        ? Math.max(0, Math.min(upper, cur + n))
                        : Math.max(0, Math.min(upper, n));
                }
            }
            // ★ 新增：trust_xxx → 攻略对象信任值
            else if (key.startsWith('trust_')) {
                const name = key.replace('trust_', '');
                if (gameState.targets[name]) {
                    gameState.targets[name].trust = parseNumeric(gameState.targets[name].trust || 50, val);
                }
            }
            // ★ 新增：alertness_xxx → 攻略对象警惕值
            else if (key.startsWith('alertness_')) {
                const name = key.replace('alertness_', '');
                if (gameState.targets[name]) {
                    gameState.targets[name].alertness = parseNumeric(gameState.targets[name].alertness || 20, val);
                }
            }
            else if (key.startsWith('affection_')) {
                const name = key.replace('affection_', '');
                if (gameState.targets[name]) {
                    gameState.targets[name].affection = parseNumeric(gameState.targets[name].affection || 0, val);
                }
            }
            else if (key.startsWith('possessiveness_')) {
                const name = key.replace('possessiveness_', '');
                if (gameState.targets[name]) {
                    gameState.targets[name].possessiveness = val;
                }
            }
        });
    }

    // ★ 随机事件追踪：优先读取 AI 显式标记，回退到字数启发式
    const explicitRandomEvent = dMatch && /random_event\s*[:：]\s*(true|1|是)/i.test(dMatch[1]);
    if (explicitRandomEvent || (narrative && narrative.length > 800)) {
        gameState.lastRandomEventRound = gameState.round;
    }

    // ★ 新增：无升温回合追踪（用于结局判定）
    const hasAffectionGain = dMatch && dMatch[1].split('\n').some(line => {
        const am = line.match(/^affection_[^：:]+[：:]\s*\+(\d+)/);
        return am && parseInt(am[1]) > 0;
    });
    if (hasAffectionGain) {
        gameState.staleRoundsCount = 0;
    } else {
        gameState.staleRoundsCount = (gameState.staleRoundsCount || 0) + 1;
    }

    renderGameUI(narrative, choices);
    updatePhoneBadge();
    // ★ 向手机iframe同步游戏时间
    syncTimeToPhone();

    // ★ 新增：结局检测
    checkEnding();
}

// ════ 全局手机数据仓库（顶层函数，供 parseAndRender 与 handlePhoneInteract 共用）════
function ensurePhoneStore() {
    if (!gameState.phoneStore) {
        gameState.phoneStore = {
            wechat: { chats: [], conversations: {}, moments: [] },
            weibo: [], weibo_hotsearch: [], douban: {}, douyin: [], redbook: [],
            bilibili: [], tfamily: [], imessage: []
        };
    }
    return gameState.phoneStore;
}
// ══════════════════════════════════════
// 结局检测系统
// ══════════════════════════════════════
function checkEnding() {
    if (!gameState || gameState.endingTriggered) return;

    let endingType = '';
    let endingTitle = '';
    let endingDesc = '';

    const targets = gameState.targets;
    const targetNames = Object.keys(targets);

    // ① 舆论崩塌：reputation >= 86
    if (gameState.reputation >= 86) {
        endingType = 'reputation_collapse';
        endingTitle = '💀 全网曝光';
        endingDesc = '你的身份和关系被全网挂上热搜，舆论彻底失控。公司已经无法再保你了。';
    }

    // ② 关系终结：所有攻略对象好感 < 20 且连续10回合无升温
    if (!endingType) {
        const allLow = targetNames.every(n => targets[n].affection < 20);
        if (allLow && (gameState.staleRoundsCount || 0) >= 10) {
            endingType = 'all_cold';
            endingTitle = '💔 遗憾离场';
            endingDesc = '所有人都渐渐与你疏远了。没有戏剧性的决裂，只是不再有任何人主动找你。';
        }
    }

    // ③ 成功结局：任一攻略对象好感 >= 80，且游戏已进行满 30 回合
    if (!endingType) {
        const hasStableRelation = targetNames.some(n => {
            const t = targets[n];
            return t.affection >= 80 && gameState.round >= 30;
        });
        if (hasStableRelation) {
            endingType = 'success';
            endingTitle = '🔒 地下恋人';
            endingDesc = '你们的关系在秘密中稳固了下来。虽然见不得光，但每一次偷来的时间都真实得不像话。';
        }
    }

    // ④ 自然淡出：游戏超过60天（约2个月模拟时间）且无人好感>=50
    if (!endingType) {
        if (gameState.day >= 60 && targetNames.every(n => targets[n].affection < 50)) {
            endingType = 'fadeout';
            endingTitle = '🌱 普通人的青春';
            endingDesc = '两个月过去了。你和那些闪闪发光的人擦肩而过，最终回到了自己的生活轨道上。';
        }
    }

    if (!endingType) return;

    // 触发结局弹窗
    gameState.endingTriggered = true;
    showEndingModal(endingType, endingTitle, endingDesc);
}

function showEndingModal(type, title, desc) {
    // 如果已有弹窗则不重复创建
    if (document.getElementById('ending-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'ending-modal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
    modal.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;padding:32px 24px;max-width:360px;width:100%;text-align:center;color:#eee;">
            <div style="font-size:48px;margin-bottom:16px;">${title.split(' ')[0]}</div>
            <h2 style="font-size:20px;margin:0 0 12px;color:#fff;">${title}</h2>
            <p style="font-size:14px;line-height:1.6;color:#aaa;margin:0 0 24px;">${desc}</p>
            <p style="font-size:12px;color:#666;margin:0 0 20px;">第${gameState.round}回合 · Day${gameState.day}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button onclick="dismissEnding(false)" style="padding:10px 20px;border-radius:8px;border:1px solid #444;background:transparent;color:#aaa;font-size:14px;cursor:pointer;">继续游玩</button>
                <button onclick="dismissEnding(true)" style="padding:10px 20px;border-radius:8px;border:none;background:#4a90d9;color:#fff;font-size:14px;cursor:pointer;">结束游戏</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function dismissEnding(goHome) {
    const modal = document.getElementById('ending-modal');
    if (modal) modal.remove();
    if (goHome) {
        navTo('page-home');
    } else {
        // 玩家选择继续，重置标记允许后续再次触发（如果条件持续满足则不再弹）
        // 这里不重置 endingTriggered，避免每回合重复弹窗
        // 只有舆论崩塌是真正的硬结局，其他可以继续
        if (gameState.reputation >= 86) {
            // 舆论崩塌继续玩的话，给一次机会降下来
            gameState.endingTriggered = false;
        }
    }
}

// 把一回合的 PHONE_DATA 增量合并进永久仓库（不再清空，只累加）
function mergeIntoPhoneStore(pd) {
    const store = ensurePhoneStore();
    const ad = pd.app_data || {};
    // 微信：按 chatId 合并对话，永久保留
    (ad.wechat || []).forEach(chat => {
        if (!chat.chatId) return;
        let c = store.wechat.chats.find(x => x.id === chat.chatId);
        if (!c) {
            c = {
                id: chat.chatId, name: chat.chatName || chat.chatId,
                avatar: (chat.chatName || chat.chatId)[0], color: chat.color || '#4a90d9', lastMsg: '', time: '刚刚'
            };
            store.wechat.chats.push(c);
        }
        if (!store.wechat.conversations[chat.chatId]) store.wechat.conversations[chat.chatId] = [];
        (chat.messages || []).forEach(m => {
            // ★ 微信消息去重：跟整段历史比对，防止AI重复推送叠加
            const conv = store.wechat.conversations[chat.chatId];
            const isDup = conv.some(x => x.message === m.message && x.sender === m.sender && x.isSelf === m.isSelf);
            if (!isDup) conv.push(m);
        });
        const last = (chat.messages || []).slice(-1)[0];
        if (last) { c.lastMsg = last.message; c.time = '刚刚'; }
    });
    // 微信朋友圈：累加到 moments 数组
    (ad.wechat_moments || []).forEach(m => {
        if (!store.wechat.moments) store.wechat.moments = [];
        const isDup = store.wechat.moments.some(x => x.text === m.text && x.name === m.name);
        if (!isDup) store.wechat.moments.unshift(m);
    });

    // 其他平台：直接累加进仓库数组
    ['weibo', 'douyin', 'redbook', 'bilibili', 'tfamily', 'imessage'].forEach(app => {

        (ad[app] || []).forEach(item => {
            // ★ 通用去重：按内容+作者判断
            const content = item.content || item.text || item.desc || item.title || '';
            const author = item.author || item.name || '';
            const isDup = (store[app] || []).some(existing => {
                const ec = existing.content || existing.text || existing.desc || existing.title || '';
                const ea = existing.author || existing.name || '';
                return ec === content && ea === author && content !== '';
            });
            if (!isDup) store[app].unshift(item);
        });
    });
    (ad.douban || []).forEach(p => { const g = p.groupId || 'art'; (store.douban[g] = store.douban[g] || []).unshift(p); });

    // ★ 存储裁剪：每个 App 保留最近 N 条，防止 phoneStore 无限膨胀
    trimPhoneStore(store);
}

// ═══ phoneStore 裁剪逻辑 ═══
function trimPhoneStore(store) {
    const MAX_ITEMS = 50;           // 普通平台保留最近50条
    const MAX_CHAT_MSGS = 80;      // 微信每个会话最多80条消息
    const MAX_MOMENTS = 40;        // 朋友圈最多40条

    // 微信会话裁剪
    if (store.wechat) {
        Object.keys(store.wechat.conversations || {}).forEach(id => {
            const conv = store.wechat.conversations[id];
            if (conv && conv.length > MAX_CHAT_MSGS) {
                store.wechat.conversations[id] = conv.slice(-MAX_CHAT_MSGS);
            }
        });
        if (store.wechat.moments && store.wechat.moments.length > MAX_MOMENTS) {
            store.wechat.moments = store.wechat.moments.slice(0, MAX_MOMENTS);
        }
    }

    // 各平台 feed 裁剪
    ['weibo', 'douyin', 'redbook', 'bilibili', 'tfamily', 'imessage'].forEach(app => {
        if (Array.isArray(store[app]) && store[app].length > MAX_ITEMS) {
            store[app] = store[app].slice(0, MAX_ITEMS);
        }
    });

    // 豆瓣按小组裁剪
    if (store.douban && typeof store.douban === 'object') {
        Object.keys(store.douban).forEach(g => {
            if (Array.isArray(store.douban[g]) && store.douban[g].length > MAX_ITEMS) {
                store.douban[g] = store.douban[g].slice(0, MAX_ITEMS);
            }
        });
    }
}

// 把整份仓库快照推给手机Tab（切过去时一次性批量加载）
function pushStoreToPhone() {
    const iframe = document.getElementById('phone-iframe');
    const msg = { type: 'PHONE_STORE_SYNC', store: gameState.phoneStore, badges: null };
    if (iframe && iframe.contentWindow && iframe.src.indexOf('phone.html') !== -1) {
        iframe.contentWindow.postMessage(msg, '*');
    } else {
        window._pendingPhoneMessages = window._pendingPhoneMessages || [];
        window._pendingPhoneMessages.push(msg);
    }
}

function renderGameUI(narrative, choices) {
    document.getElementById('game-round').textContent = '第' + gameState.round + '回合';
    // ★ 显示完整日历日期，如 "2026年6月28日 周六 · 上午"
    // ★ 简短时间格式，避免手机上换行
    var displayHour = timeOfDayToHour(gameState.timeOfDay);
    document.getElementById('game-time').textContent = gameState.month + '/' + gameState.date + ' ' + gameState.weekday + ' · ' + (displayHour < 10 ? '0' : '') + displayHour + ':00';
    document.getElementById('st-location').textContent = gameState.location;

    let repLevel = '隐形';
    if (gameState.reputation > 15) repLevel = '被留意'; if (gameState.reputation > 30) repLevel = '小范围';
    if (gameState.reputation > 50) repLevel = '圈内知名'; if (gameState.reputation > 70) repLevel = '高危';
    if (gameState.reputation > 85) repLevel = '爆炸';
    document.getElementById('st-reputation').textContent = `${repLevel}（${gameState.reputation}）`;

    const affEl = document.getElementById('st-affections');
    if (affEl) {
        affEl.innerHTML = '';
        Object.keys(gameState.targets).forEach(name => {
            const t = gameState.targets[name];
            affEl.innerHTML += `<div class="status-row"><span class="status-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:3px;"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" fill="#ff6b81" stroke="#ff6b81" stroke-width="1.6" stroke-linejoin="round"/></svg>${name}</span><div class="affection-wrap"><div class="affection-bar"><div class="affection-fill" style="width:${t.affection}%"></div></div><span class="status-value" style="font-size:12px">${t.affection}</span></div></div>`;
        });
    }

    document.getElementById('game-narrative').innerHTML = narrative
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');


    const choicesEl = document.getElementById('game-choices');
    choicesEl.innerHTML = '';
    if (choices.length > 0) {
        choices.forEach(c => {
            const btn = document.createElement('button'); btn.className = 'choice-btn';
            btn.innerHTML = `<span class="choice-label">${c.label}.</span>${c.text}`;
            btn.onclick = () => sendChoice(c.label + '. ' + c.text);
            choicesEl.appendChild(btn);
        });
        // 🌟 第4个固定按钮：自由行动
        const freeBtn = document.createElement('button');
        freeBtn.className = 'choice-btn';
        freeBtn.innerHTML = `<span class="choice-label"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;"><path d="M4 20l4-1 11-11a2 2 0 0 0-3-3L5 16l-1 4z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span> 以上都不选，我要自己来`;
        freeBtn.onclick = () => {
            document.getElementById('game-input').focus();
            document.getElementById('game-input').placeholder = '输入你想做的事...';
        };
        choicesEl.appendChild(freeBtn);
    } else if (narrative !== '') {
        const btn = document.createElement('button'); btn.className = 'choice-btn';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="vertical-align:-2px;margin-right:4px;"><path d="M7 4l13 8-13 8V4z" fill="currentColor"/></svg>继续';
        btn.onclick = () => sendContinue();
        choicesEl.appendChild(btn);
    }
    document.getElementById('game-scroll').scrollTop = 0;

    // 🌟 游戏开始后显示底部三Tab导航栏
    const tabbar = document.getElementById('bottom-tabbar');
    if (tabbar) tabbar.style.display = 'flex';
}

function setLoading(show) {
    const narrativeEl = document.getElementById('game-narrative');
    const choicesEl = document.getElementById('game-choices');
    if (show) {
        narrativeEl.innerHTML = '<div class="loading-wrap"><div class="loading-spinner"></div><p class="loading-text">正在推演世界线...</p ></div>';
        choicesEl.innerHTML = '';
    }
}

function updatePhoneBadge() {
    const badge = document.getElementById('phone-badge');
    if (badge) {
        badge.textContent = gameState.phoneBadge;
        if (gameState.phoneBadge > 0) badge.classList.add('show');
        else badge.classList.remove('show');
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return alert(msg);
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// ══════════════════════════════════════
// 与手机 iframe 的通讯接口 (全新 RAG 路由对接)
// ══════════════════════════════════════

window.addEventListener('message', async (e) => {
    if (!e.data) return;
    const iframe = document.getElementById('phone-iframe');

    if (e.data.type === 'PHONE_READY') {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'PHONE_INIT', playerName: (gameState && gameState.playerName) || '玩家' }, '*');
        }
        _flushPhoneMessages(iframe);
        return;
    }

    if (e.data.type === 'PHONE_CLOSE') {
        // 手机已改为常驻 Tab，关闭即切回剧情 Tab（无 phone-overlay）
        if (typeof switchTab === 'function') switchTab('story');
        document.body.style.overflow = "";
        return;
    }

    // ★★★ 新增：手机Tab记忆 —— 记录玩家最后打开了哪个App ★★★
    if (e.data.type === 'PHONE_APP_OPENED') {
        if (gameState) gameState.lastPhoneApp = e.data.app;
        return;
    }

    // 拦截手机系统的交互请求
    if (e.data.type === 'PHONE_INTERACT') {
        await handlePhoneInteract(e.data);
    }
});

async function handlePhoneInteract(data) {
    if (!apiConfig) return;
    const iframe = document.getElementById('phone-iframe');

    // ----------------------------------------------------
    // 路由 1：处理微信实时聊天
    // ----------------------------------------------------
    if (data.action === 'wechat_reply') {
        const store = ensurePhoneStore();
        const conv = (store.wechat.conversations[data.chatId] = store.wechat.conversations[data.chatId] || []);
        if (!data.skipPush) {
            conv.push({ isSelf: true, sender: '我', message: data.userMessage });
        }

        const recentConv = (store.wechat.conversations[data.chatId] || []).slice(-5);
        const contextLines = recentConv.map(function (m) {
            if (m.type === 'time' || m.type === 'sys') return '';
            var prefix = m.isSelf ? '我' : (m.sender || data.chatName);
            var content = m.message || m.text || ('[' + (m.type || '消息') + ']');
            return prefix + '：' + content;
        }).filter(l => l).join('\n');

        // 检测是否群聊
        const chatObj = store.wechat.chats.find(x => x.id === data.chatId);
        const isGroup = chatObj && chatObj.isGroup;
        const members = (chatObj && chatObj.members) || [];

        let sysPrompt;
        if (isGroup) {
            sysPrompt = `你是群聊NPC对话生成器。玩家角色：${gameState.playerCard}。当前关系：${JSON.stringify(gameState.targets)}。
这是一个群聊"${data.chatName}"，成员有：${members.join('、')}。
玩家在群里发了消息，请生成1-3个群成员的回复。
【格式铁律】每条回复必须以"成员名：内容"格式输出，一行一条。禁止动作描写、括号注释。
例如：
宋亚轩：哈哈哈哈行
马嘉祺：别闹了
最后另起一行输出数值变动（只对攻略对象有效），格式：###affection_角色名:+2###`;
        } else {
            sysPrompt = `你是NPC对话生成器。玩家角色：${gameState.playerCard}。当前关系：${JSON.stringify(gameState.targets)}。
玩家在微信给"${data.chatName}"发消息。先输出该NPC的自然口语回复（可多条，每条换行）。
【格式铁律】只输出纯文字对话，禁止任何动作描写、旁白、括号注释。禁止出现：(xxx)、（xxx）、*xxx*、【xxx】、「xxx」、双引号包裹的动作。回复必须像真人发微信一样，只有文字内容。
最后另起一行输出数值变动，格式固定：###affection_${data.chatName}:+2###（好感变动，-5到+5之间，依据玩家这句话讨不讨喜）。`;
        }

        const messages = [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: `最近对话记录：\n${contextLines}\n\n请根据以上对话上下文，生成回复。` }
        ];

        try {
            const raw = await callAI(messages, null, 300);
            // ② 抽出数值变动并写回全局数值仓库（数值Tab会实时刷新）
            const affM = raw.match(/###affection_(.+?):([+-]?\d+)###/);
            if (affM && gameState.targets[affM[1]]) {
                const t = gameState.targets[affM[1]];
                t.affection = Math.max(0, Math.min(100, t.affection + parseInt(affM[2])));
            }
            // ★ 正则清洗：去除AI可能生成的动作描写（括号/星号/书名号动作）
            let cleaned = raw.replace(/###.*?###/g, '');
            cleaned = cleaned.replace(/[\(（][\s\S]*?[\)）]/g, '');   // 去掉(动作)和（动作）
            cleaned = cleaned.replace(/\*[^*]+\*/g, '');              // 去掉*动作*
            cleaned = cleaned.replace(/【[^】]*】/g, '');              // 去掉【动作】
            cleaned = cleaned.replace(/「[^」]*」/g, '');              // 去掉「动作」
            const replyLines = cleaned.split('\n').filter(l => l.trim());

            // ③ NPC回复永久入库（群聊需解析每条的sender）
            const parsedReplies = [];
            replyLines.forEach(line => {
                if (isGroup) {
                    // 群聊格式："成员名：内容" 或 "成员名: 内容"
                    const colonIdx = line.indexOf('：') !== -1 ? line.indexOf('：') : line.indexOf(':');
                    if (colonIdx > 0 && colonIdx < 8) {
                        const sender = line.substring(0, colonIdx).trim();
                        const msg = line.substring(colonIdx + 1).trim();
                        if (msg) {
                            conv.push({ isSelf: false, sender: sender, color: getAvatarColor ? getAvatarColor(sender) : '#4a90d9', message: msg });
                            parsedReplies.push({ sender: sender, message: msg });
                        }
                    } else {
                        // 没有冒号前缀，随机取一个成员
                        const fallbackSender = members[Math.floor(Math.random() * members.length)] || '群成员';
                        conv.push({ isSelf: false, sender: fallbackSender, color: '#4a90d9', message: line });
                        parsedReplies.push({ sender: fallbackSender, message: line });
                    }
                } else {
                    conv.push({ isSelf: false, sender: data.chatName, color: '#4a90d9', message: line });
                    parsedReplies.push({ sender: data.chatName, message: line });
                }
            });

            const c = store.wechat.chats.find(x => x.id === data.chatId);
            if (c) { c.lastMsg = parsedReplies.length > 0 ? parsedReplies[parsedReplies.length - 1].message : ''; c.time = '刚刚'; }
            // ④ 同步给手机UI渲染（群聊用结构化数据）
            iframe.contentWindow.postMessage({ type: 'PHONE_REPLY', chatId: data.chatId, chatName: data.chatName, replies: parsedReplies, isGroup: isGroup }, '*');
            if (typeof renderValuesTab === 'function') renderValuesTab();
            autoSave();
        } catch (e) { console.error("微信回复生成失败:", e); }
    }

    // ----------------------------------------------------
    // 路由 1.5：处理玩家在手机端发布微博后同步回 phoneStore
    // ----------------------------------------------------
    if (data.action === 'weibo_publish') {
        const store = ensurePhoneStore();
        if (!Array.isArray(store.weibo)) store.weibo = [];
        store.weibo.unshift(data.post);
        autoSave();
        return;
    }

    // ----------------------------------------------------
    // 路由 2：处理社交平台动态按需加载 (调用 LoreDB)
    // ----------------------------------------------------
    if (data.action === 'load_app') {

        // 1. 获取当前游戏里涉及的爱豆名单（为了精准提取黑料）
        const targetIdols = Object.keys(gameState.targets);

        // 2. 提取当前发生的剧情（拿最后 3 条历史记录让 AI 知道现在发生了什么）
        const currentEvent = gameState.history.slice(-3).map(h => h.content).join(' ');

        // 3. ⭐️ 核心：调用知识库 RAG 引擎，生成极简的神级 Prompt！
        let loreContext = "";
        if (window.LoreDB) {
            loreContext = window.LoreDB.retrieveContext(targetIdols, data.app);
        } else {
            console.warn("未找到 LoreDB，请确保引入了 db_knowledge.js");
        }

        // 4. 定义各平台所需的数据结构要求 (匹配我们重制的手机 UI)
        const appFormatRequirements = {
            weibo: `生成 5-8 条微博帖子。必须输出严格的 JSON 数组：[{"author":"博主名(用饭圈自然ID)","time":"刚刚","device":"iPhone 15 Pro","content":"正文，带有#话题#","likes":2341,"comments":432,"shares":120}]`,
            douyin: `生成 3 个抖音视频数据。必须输出严格的 JSON 数组：[{"author":"账号名","desc":"视频文案带#话题#","likes":"52.3w","comments":"8.4w","shares":"2.1w","stars":"1.2w","danmaku":["弹幕1","弹幕2","弹幕3"]}]`,
            redbook: `生成 6 条小红书笔记。必须输出严格的 JSON 数组：[{"author":"用户名","title":"标题(多加Emoji)","likes":3421}]`,
            bilibili: `生成 4 个B站视频卡片。必须输出严格的 JSON 数组：[{"title":"二创标题","author":"UP主名","views":"24.3万","danmaku":"4721","duration":"03:45"}]`,
            douban: `生成 4 个豆瓣吃瓜帖。必须输出严格的 JSON 数组：[{"group":"时代峰峻家属区","title":"帖子标题","author":"发帖人ID(也可叫已注销)","content":"帖子正文详情","likes":123,"comments":456}]`,
            tfamily: `生成 3 条 T-Family 高级会员专属动态。此为公司官方App，请用官方或站姐的口吻发布高清物料和内部花絮。必须输出严格的 JSON 数组：[{"name":"时代峰峻官方","verified":true,"time":"刚刚","text":"文字内容","likes":8848,"reposts":230}]`
        };

        const formatReq = appFormatRequirements[data.app];
        if (!formatReq) {
            // 如短信(imessage)未配置动态生成，直接给空数组渲染骨架
            iframe.contentWindow.postMessage({ type: 'PHONE_APP_DATA', app: data.app, payload: [] }, '*');
            return;
        }

        // 5. 拼装终极 Prompt
        const finalPrompt = `
${loreContext}
【当前游戏剧情进度】：${currentEvent}
【你的任务】：请结合刚刚发生的剧情与以上饭圈文化，生成符合该平台的假数据。如果剧情无大事发生，就生成日常舔颜、拉踩或催数据的日常贴。不同粉籍之间必须有撕扯感。
【输出格式限制】：${formatReq}
注意：必须返回合法的 JSON 数组，严禁包含任何 markdown 代码块（如 \`\`\`json ），直接输出 [] 包裹的 JSON 即可。
        `;

        try {
            // 调用 AI，这里可以要求更高的 token 长度保证 JSON 完整性
            const result = await callAI([
                { role: 'system', content: '你是专业的数据构造引擎，只输出合法的 JSON 数组，禁止任何寒暄与多余符号。' },
                { role: 'user', content: finalPrompt }
            ], null, 2500);

            // 6. 健壮的 JSON 提取器 (防止模型胡言乱语带了代码块)
            let jsonStr = result.trim();
            const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
            if (jsonMatch) jsonStr = jsonMatch[0];

            const payloadData = JSON.parse(jsonStr);

            // 7. 将 AI 完美编造的数据发给手机 UI 进行精美渲染！
            iframe.contentWindow.postMessage({
                type: 'PHONE_APP_DATA',
                app: data.app,
                payload: payloadData
            }, '*');

        } catch (e) {
            console.error(`[${data.app}] App 数据生成或解析失败:`, e);
            // 如果报错（比如超时），给手机一个空数组兜底，解除 loading 状态
            iframe.contentWindow.postMessage({ type: 'PHONE_APP_DATA', app: data.app, payload: [] }, '*');
        }
    }
}
// ══════════════════════════════════════
// 手机浮窗、历史记录面板等辅助功能
// ══════════════════════════════════════
// ═══ 手机消息队列（解决 iframe 懒加载时 postMessage 丢失的问题）═══
window._pendingPhoneMessages = [];

function _flushPhoneMessages(iframe) {
    if (!iframe || !iframe.contentWindow) return;
    if (!window._pendingPhoneMessages || window._pendingPhoneMessages.length === 0) return;
    window._pendingPhoneMessages.forEach(msg => {
        iframe.contentWindow.postMessage(msg, '*');
    });
    window._pendingPhoneMessages = [];
}
// ★ 底部Tab切换：剧情/手机/数值，切换不清空各自进度
function switchTab(tab) {
    if (!gameState) return; // 防止未开局时点击报错

    gameState.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

    document.getElementById('game-scroll').style.display = tab === 'story' ? '' : 'none';
    document.querySelector('.game-input-bar').style.display = tab === 'story' ? '' : 'none';

    const tabPhoneEl = document.getElementById('tab-phone');
    if (tabPhoneEl) tabPhoneEl.style.display = tab === 'phone' ? 'block' : 'none';

    const tabValuesEl = document.getElementById('tab-values');
    if (tabValuesEl) tabValuesEl.style.display = tab === 'values' ? 'block' : 'none';

    const topbar = document.querySelector('.game-topbar');
    if (topbar) topbar.style.display = tab === 'story' ? '' : 'none';

    if (tab === 'phone') {
        const iframe = document.getElementById('phone-iframe');
        if (iframe) {
            if (!iframe.src || !iframe.src.includes('phone.html')) {
                iframe.src = 'phone.html?t=' + new Date().getTime();
            }
            gameState.phoneBadge = 0;
            updatePhoneBadge();

            if (iframe.contentWindow && iframe.contentWindow.document && iframe.contentWindow.document.readyState === 'complete') {
                pushStoreToPhone();
                setTimeout(() => {
                    if (iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'PHONE_RESTORE', app: gameState.lastPhoneApp || 'wechat' }, '*');
                }, 150);
            } else {
                iframe.onload = function () {
                    pushStoreToPhone();
                    setTimeout(() => {
                        if (iframe.contentWindow) iframe.contentWindow.postMessage({ type: 'PHONE_RESTORE', app: gameState.lastPhoneApp || 'wechat' }, '*');
                    }, 150);
                };
            }
        }
    }

    if (tab === 'values' && typeof renderValuesTab === 'function') renderValuesTab();
}

// 数值Tab渲染（读取同一个 gameState，实时刷新）
function renderValuesTab() {
    const el = document.getElementById('values-wrap'); if (!el) return;
    let html = `<div class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px;margin-right:4px;"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.6"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>我的属性</div>
      <div class="v-row">魅力 ${gameState.values.charm}</div>
      <div class="v-row">情商 ${gameState.values.eq}</div>
      <div class="v-row">人脉 ${gameState.values.connections}</div>
      <div class="v-row">精力 ${gameState.values.energy}/${gameState.values.energyMax}</div>
      <div class="v-row">舆论 ${gameState.reputation}/100</div>
      <div class="section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:-3px;margin-right:4px;"><path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.9A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" fill="#ff6b81" stroke="#ff6b81" stroke-width="1.6" stroke-linejoin="round"/></svg>攻略对象</div>`;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    Object.keys(gameState.targets).forEach(n => {
        const t = gameState.targets[n];
        html += `<div class="v-row">${esc(n)}：好感${t.affection} / 占有欲${esc(t.possessiveness)} / 信任${t.trust} / 警惕${t.alertness}</div>`;
    });
    el.innerHTML = html;
}

function openHistory() {
    document.getElementById('history-mask').classList.add('show');
    document.getElementById('history-panel').classList.add('show');
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    if (gameState && gameState.history) {
        gameState.history.forEach(h => {
            if (h.role === 'assistant') {
                // 只显示叙事部分
                let text = h.content;
                const nMatch = text.match(/---NARRATIVE---([\s\S]*?)(?=---STATUS---|---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
                if (nMatch) text = nMatch[1].trim();
                else text = text.replace(/---[\w_]+---[\s\S]*/m, '').trim();
                const div = document.createElement('div');
                div.className = 'history-item';
                div.textContent = text.substring(0, 200) + (text.length > 200 ? '...' : '');
                list.appendChild(div);
            }
        });
    }
}

function closeHistory() {
    document.getElementById('history-mask').classList.remove('show');
    document.getElementById('history-panel').classList.remove('show');
}

function confirmGoHome() {
    if (confirm('确定返回主页吗？当前进度已自动保存。')) {
        navTo('page-home');
    }
}

function toggleTag(el) {
    el.classList.toggle('active');
}

// ══════════════════════════════════════
// 游戏日历日期工具函数
// ══════════════════════════════════════
const WEEKDAYS_GAME = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 前进一天日历日期（处理月/年进位和星期）
function advanceGameDate() {
    gameState.date++;
    const maxDay = daysInMonthGame(gameState.year, gameState.month);
    if (gameState.date > maxDay) {
        gameState.date = 1;
        gameState.month++;
        if (gameState.month > 12) {
            gameState.month = 1;
            gameState.year++;
        }
    }
    const idx = WEEKDAYS_GAME.indexOf(gameState.weekday);
    if (idx >= 0) gameState.weekday = WEEKDAYS_GAME[(idx + 1) % 7];
}

// 每月天数（含闰年）
function daysInMonthGame(year, month) {
    if (month === 2) {
        const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        return leap ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

// 时段→小时映射
function timeOfDayToHour(period) {
    if (period === '上午') return 10;
    if (period === '下午') return 15;
    if (period === '晚上') return 21;
    return 12;
}

// ★ 向手机iframe发送 TIME_SYNC
function syncTimeToPhone() {
    if (!gameState) return;
    const hour = timeOfDayToHour(gameState.timeOfDay);
    const timeData = {
        type: 'TIME_SYNC',
        time: {
            year: gameState.year,
            month: gameState.month,
            day: gameState.date,
            weekday: gameState.weekday,
            hour: hour,
            minute: 0
        }
    };
    const iframe = document.getElementById('phone-iframe');
    if (iframe && iframe.contentWindow && iframe.src && iframe.src.indexOf('phone.html') !== -1) {
        iframe.contentWindow.postMessage(timeData, '*');
    } else {
        // iframe未就绪时暂存到队列
        window._pendingPhoneMessages = window._pendingPhoneMessages || [];
        window._pendingPhoneMessages.push(timeData);
    }
}

// 页面加载完毕后初始化
document.addEventListener('DOMContentLoaded', () => {
    loadApiConfig();
});
