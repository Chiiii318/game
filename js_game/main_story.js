// ══════════════════════════════════════
// 基础 UI 导航功能
// ══════════════════════════════════════
function navTo(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) target.classList.add('active');
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

// 【核心】动态组装终极 System Prompt
function buildSystemPrompt() {
    const targetNames = Object.keys(gameState.targets);
    const targetStatus = targetNames.map(name => {
        const t = gameState.targets[name];
        return `  ${name}：好感${t.affection} / 占有欲${t.possessiveness} / 信任${t.trust} / 警惕${t.alertness}`;
    }).join('\n');

    const currentState = `
# 👤 模块 7：当前动态状态与专属世界线
【当前游戏状态】
回合：${gameState.round} / Day${gameState.day} · ${gameState.timeOfDay}
地点：${gameState.location}
舆论值：${gameState.reputation}/100
玩家属性：魅力${gameState.values.charm} / 情商${gameState.values.eq} / 人脉${gameState.values.connections} / 精力${gameState.values.energy}/${gameState.values.energyMax}

【玩家角色卡】：\n${gameState.playerCard}
【攻略对象卡】：\n${gameState.targetCards.map(t => `[初始关系: ${t.relationship}]\n${t.content}`).join('\n\n')}
【攻略对象状态】：\n${targetStatus}
【叙事偏好】：${gameState.narrativePref}

⚠️ 【本局专属世界线机制（极度机密，绝不直接告诉玩家，仅用于暗中驱动剧情）】⚠️
${gameState.customModules || "无特殊暗线"}
`;

    // 终极拼接返回：核心设定 + 动态状态 + 格式约束！
    return PROMPT_CORE + "\n" + currentState + "\n" + PROMPT_FORMAT;
}

// ══════════════════════════════════════
// 角色设定页功能支持
// ══════════════════════════════════════

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
  <div class="card-header">
    <span>♥ 攻略对象 ${count + 1}</span>
    <span class="delete-target" onclick="this.closest('.target-card').remove()">✕ 删除</span>
  </div>
  <textarea class="target-textarea" rows="6" placeholder="粘贴或输入攻略对象的人设卡（姓名、性格、背景等）"></textarea>
  <div class="target-rel-wrap">
    <label>你与 TA 的初始关系</label>
    <input class="target-rel" type="text" list="rel-options" placeholder="陌生人/同事/青梅竹马..." onfocus="this.value=''">
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
    const traits = `社交:${getVal('char-soc')}, 决策:${getVal('char-dec')}, 情绪:${getVal('char-emo')}, 自尊:${getVal('char-est')}, 待人:${getVal('char-int')}, 主动:${getVal('char-act')}, 独立:${getVal('char-ind')}, 恋爱:${getVal('char-lov')}`;

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
        round: 1, day: 1, timeOfDay: '上午', location: '未知', reputation: 0,
        playerCard: playerCard, targetCards: targets,
        narrativePref: document.getElementById('narrative-pref').value,
        history: [], allPhoneData: [], phoneBadge: 0,
        values: { charm: 50, eq: 50, connections: 30, energy: 100, energyMax: 100 },
        targets: {}, customModules: ""
    };

    targets.forEach((cardObj, idx) => {
        let name = '';
        const patterns = [ /名字[：:]\s*(.+)/, /姓名[：:]\s*(.+)/, /角色[：:]\s*(.+)/, /^[【\[](.+?)[】\]]/m, /^(.{2,4})[,，\s/|·]/m ];
        for (const p of patterns) {
            const m = cardObj.content.match(p);
            if (m) { name = m[1].trim().split(/[\s,，、/|·：:]/)[0]; break; }
        }
        if (!name) name = cardObj.content.trim().split(/[\n\r]/)[0].substring(0, 6).trim() || '攻略对象' + (idx + 1);
        gameState.targets[name] = { affection: 0, possessiveness: '低', trust: 50, alertness: 20 };
    });

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
    const relationDesc = gameState.targetCards.map((t, idx) => `目标${idx+1}: \n设定:${t.content}\n【与玩家初始关系】:${t.relationship}`).join('\n\n');

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

注意：直接输出这些设定的文本（格式清晰即可），不要废话，这份文本将被直接注入到游戏主循环的 Prompt 中，作为约束 AI 的法则。`;

    try {
        const response = await callAI([{ role: 'system', content: '严格按照指定格式输出底层游戏规则模块。' }, { role: 'user', content: initPrompt }], null, 2500);
        gameState.customModules = response.trim();

        document.querySelector('.loading-text').textContent = "正在生成第一回合剧情...";
        await sendFirstRound();
    } catch (e) {
        document.getElementById('game-narrative').textContent = '世界线预演算失败：' + e.message;
        setLoading(false);
    }
}

async function sendFirstRound() {
    const narrativeEl = document.getElementById('game-narrative');
    narrativeEl.textContent = '...'; 
    setLoading(true);

    try {
        const messages = [
            { role: 'system', content: buildSystemPrompt() }, 
            { role: 'user', content: '游戏开始。请生成第一回合的开场叙事。' }
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
                narrativeEl.innerHTML = displayStr.replace(/\n/g, '<br>');
            },
            onDone: (fullText) => {
                gameState.history.push({ role: 'assistant', content: fullText });
                parseAndRender(fullText);
                autoSave();
                setLoading(false);
            },
            onError: (err) => {
                narrativeEl.textContent = '❌ 请求失败：' + err.message;
                setLoading(false);
            }
        });
   } catch (e) {
    narrativeEl.textContent = '❌ 请求出错：' + e.message;
    isRequesting = false;
    setLoading(false);
}
}

async function sendPlayerInput() {
    if (isRequesting) return;
    const input = document.getElementById('game-input');
    const text = input.value.trim();
    if (!text) return; input.value = ''; await sendToAI(text);
}
function sendChoice(choiceText) { if(!isRequesting) sendToAI('我选择：' + choiceText); }
function sendContinue() { if(!isRequesting) sendToAI('[继续]'); }

async function sendToAI(userText) {
    if (isRequesting) return;
    
    isRequesting = true; 
    setLoading(true); 
    document.getElementById('game-send-btn').disabled = true;
    
    // 玩家发出的文字，先存入历史记录
    gameState.history.push({ role: 'user', content: userText });
    
    const messages = [{ role: 'system', content: buildSystemPrompt() }];
    // 控制历史记录长度，防止越来越卡
    const recentHistory = gameState.history.slice(-15);
    recentHistory.forEach(h => messages.push({ role: h.role, content: h.content }));

    const narrativeEl = document.getElementById('game-narrative');
    narrativeEl.textContent = '...'; // 清空并准备接收文字

    try {
        // 核心修改：调用流式函数 callAIStream
        await callAIStream(messages, {
            onChunk: (chunk, fullText) => {
                // 流式解析：提取 ---NARRATIVE--- 之后，其他 --- 标签之前的内容实时显示
                let displayStr = fullText;
                const nMatch = fullText.match(/---NARRATIVE---([\s\S]*?)(?=---STATUS---|---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
                if (nMatch) {
                    displayStr = nMatch[1].trim();
                } else if (fullText.includes('---')) {
                    // 如果没找到 NARRATIVE 但有其他标签，尝试清理掉前面的标签
                    displayStr = fullText.replace(/---[\w_]+---/g, '').trim();
                }
                narrativeEl.innerHTML = displayStr.replace(/\n/g, '<br>');
            },
            onDone: (fullText) => {
                // 完全接收完毕后，存入历史，并调用完整的解析逻辑
                gameState.history.push({ role: 'assistant', content: fullText });
                gameState.round++;
                parseAndRender(fullText);
                autoSave();
                
                isRequesting = false; 
                setLoading(false); 
                document.getElementById('game-send-btn').disabled = false;
            },
            onError: (err) => {
                narrativeEl.textContent = '❌ 请求失败：' + err.message;
                gameState.history.pop();
                isRequesting = false; 
                setLoading(false); 
                document.getElementById('game-send-btn').disabled = false;
            }
        });
    } catch (e) {
        narrativeEl.textContent = '❌ 请求出错：' + e.message;
        gameState.history.pop();
        isRequesting = false; 
        setLoading(false); 
        document.getElementById('game-send-btn').disabled = false;
    }
}

// ══════════════════════════════════════
// 解析与界面渲染
// ══════════════════════════════════════
function parseAndRender(response) {
    let narrative = '';
    const nMatch = response.match(/---NARRATIVE---([\s\S]*?)(?=---STATUS---|---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
    if (nMatch) narrative = nMatch[1].trim(); else narrative = response.replace(/---[\w_]+---[\s\S]*$/m, '').trim();

    const sMatch = response.match(/---STATUS---([\s\S]*?)(?=---CHOICES---|---PHONE_DATA---|---DATA_UPDATE---|---END---|$)/);
    if (sMatch) {
        const locMatch = sMatch[1].match(/location:\s*(.+)/);
        const timeMatch = sMatch[1].match(/time:\s*(.+)/);
        if (locMatch) gameState.location = locMatch[1].trim();
        if (timeMatch) {
            const timeStr = timeMatch[1].trim();
            const dayMatch = timeStr.match(/Day(\d+)/);
            const periodMatch = timeStr.match(/(上午|下午|晚上)/);
            if (dayMatch) gameState.day = parseInt(dayMatch[1]);
            if (periodMatch) gameState.timeOfDay = periodMatch[1];
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
        const pMatch = response.match(/---PHONE_DATA---([\s\S]*?)(?=---DATA_UPDATE---|---END---|$)/);
if (pMatch) {
    try {
        const newPhoneData = JSON.parse(pMatch[1].trim());
        if (!gameState.allPhoneData) gameState.allPhoneData = [];
        const lastPD = gameState.allPhoneData[gameState.allPhoneData.length - 1];
        if (JSON.stringify(lastPD) !== JSON.stringify(newPhoneData)) {
            gameState.allPhoneData.push(newPhoneData);
            let newBadgeCount = 0;
            if(newPhoneData.badges) Object.values(newPhoneData.badges).forEach(v => newBadgeCount += (v||0));
            else newBadgeCount = newPhoneData.badge || 1;
            gameState.phoneBadge = (gameState.phoneBadge || 0) + newBadgeCount;
        }

        // ★★★ 核心修复：将完整 PHONE_DATA（含 app_data）转发给手机 iframe ★★★
        const iframe = document.getElementById('phone-iframe');
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'PHONE_DATA', data: newPhoneData }, '*');

            // 如果有 app_data，逐个 App 分发过去
            if (newPhoneData.app_data) {
                Object.keys(newPhoneData.app_data).forEach(appId => {
                    const appContent = newPhoneData.app_data[appId];
                    if (appContent && appContent.length > 0) {
                        iframe.contentWindow.postMessage({
                            type: 'PHONE_APP_DATA',
                            app: appId,
                            payload: appContent
                        }, '*');
                    }
                });
            }
        }
    } catch (e) { console.error('手机数据解析失败', e); }
}

    const dMatch = response.match(/---DATA_UPDATE---([\s\S]*?)(?=---END---|$)/);
    if (dMatch) {
        dMatch[1].trim().split('\n').forEach(line => {
            const m = line.match(/^(\w+?):\s*([+-]?\d+|.+)/);
            if (!m) return;
            const key = m[1].trim(), val = m[2].trim();
            if (key === 'reputation') {
                gameState.reputation = val.startsWith('+')||val.startsWith('-') ? Math.max(0, Math.min(100, gameState.reputation + parseInt(val))) : parseInt(val);
            } else if (key.startsWith('affection_') && gameState.targets[key.replace('affection_', '')]) {
                const t = gameState.targets[key.replace('affection_', '')];
                t.affection = val.startsWith('+')||val.startsWith('-') ? Math.max(0, Math.min(100, t.affection + parseInt(val))) : parseInt(val);
            } else if (key.startsWith('possessiveness_') && gameState.targets[key.replace('possessiveness_', '')]) {
                gameState.targets[key.replace('possessiveness_', '')].possessiveness = val;
            }
        });
    }
    renderGameUI(narrative, choices);
    updatePhoneBadge();
}

function renderGameUI(narrative, choices) {
    document.getElementById('game-round').textContent = '第' + gameState.round + '回合';
    document.getElementById('game-time').textContent = 'Day' + gameState.day + ' · ' + gameState.timeOfDay;
    document.getElementById('st-location').textContent = gameState.location;
    
    let repLevel = '隐形';
    if(gameState.reputation>15) repLevel='被留意'; if(gameState.reputation>30) repLevel='小范围';
    if(gameState.reputation>50) repLevel='圈内知名'; if(gameState.reputation>70) repLevel='高危';
    if(gameState.reputation>85) repLevel='爆炸';
    document.getElementById('st-reputation').textContent = `${repLevel}（${gameState.reputation}）`;

    const affEl = document.getElementById('st-affections');
    if(affEl) {
        affEl.innerHTML = '';
        Object.keys(gameState.targets).forEach(name => {
            const t = gameState.targets[name];
            affEl.innerHTML += `<div class="status-row"><span class="status-label">💗 ${name}</span><div class="affection-wrap"><div class="affection-bar"><div class="affection-fill" style="width:${t.affection}%"></div></div><span class="status-value" style="font-size:12px">${t.affection}</span></div></div>`;
        });
    }

    document.getElementById('game-narrative').textContent = narrative;

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
        freeBtn.innerHTML = `<span class="choice-label">✏️</span> 以上都不选，我要自己来`;
        freeBtn.onclick = () => { 
            document.getElementById('game-input').focus(); 
            document.getElementById('game-input').placeholder = '输入你想做的事...';
        };
        choicesEl.appendChild(freeBtn);
    } else if (narrative !== '') {
        const btn = document.createElement('button'); btn.className = 'choice-btn';
        btn.textContent = '▶ 继续';
        btn.onclick = () => sendContinue();
        choicesEl.appendChild(btn);
    }
        document.getElementById('game-scroll').scrollTop = 0;

    // 🌟 游戏开始后显示手机浮窗按钮
    const fab = document.getElementById('phone-fab');
    if (fab) fab.classList.add('show');
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
    if(badge) {
        badge.textContent = gameState.phoneBadge;
        if(gameState.phoneBadge > 0) badge.classList.add('show');
        else badge.classList.remove('show');
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if(!t) return alert(msg);
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
}

// ══════════════════════════════════════
// 与手机 iframe 的通讯接口 (全新 RAG 路由对接)
// ══════════════════════════════════════

window.addEventListener('message', async (e) => {
    if (!e.data) return;
    const iframe = document.getElementById('phone-iframe');
    
    if (e.data.type === 'PHONE_CLOSE') {
        document.getElementById("phone-overlay").classList.remove("show");
        document.body.style.overflow = "";
    }
    
    // 【新加】：当手机外壳加载完毕，主系统命令其初始化清空旧数据
    if (e.data.type === 'PHONE_READY') {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'PHONE_INIT' }, '*');
        }
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
        const messages = [
            { role: 'system', content: `你是NPC对话生成器。玩家角色：${gameState.playerCard}。当前关系状态：${JSON.stringify(gameState.targets)}。\n玩家在微信给"${data.chatName}"发了消息。只输出回复文字，语气自然简短，像真实的活人微信聊天。可以有多条回复，每条换行。` },
            { role: 'user', content: `玩家发送：${data.userMessage}\n请生成"${data.chatName}"的回复：` }
        ];
        try {
            const reply = await callAI(messages, null, 200);
           iframe.contentWindow.postMessage({
    type: 'PHONE_REPLY',
    action: 'wechat_reply',
    chatId: data.chatId,
    chatName: data.chatName,
    replies: reply.split('\n').filter(l => l.trim())
}, '*');
        } catch(e) { console.error("微信回复生成失败:", e); }
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
            xhs: `生成 6 条小红书笔记。必须输出严格的 JSON 数组：[{"author":"用户名","title":"标题(多加Emoji)","likes":3421}]`,
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

        } catch(e) { 
            console.error(`[${data.app}] App 数据生成或解析失败:`, e); 
            // 如果报错（比如超时），给手机一个空数组兜底，解除 loading 状态
            iframe.contentWindow.postMessage({ type: 'PHONE_APP_DATA', app: data.app, payload: [] }, '*');
        }
    }
}
// ══════════════════════════════════════
// 手机浮窗、历史记录面板等辅助功能
// ══════════════════════════════════════

function openPhone() {
    const overlay = document.getElementById('phone-overlay');
    const iframe = document.getElementById('phone-iframe');
    // 第一次打开时才加载 phone.html（懒加载）
       if (!iframe.src || iframe.src.indexOf('phone.html') === -1) {
        iframe.src = 'phone.html';
    }
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';

    // 清除角标
    if (gameState) { gameState.phoneBadge = 0; updatePhoneBadge(); }
}

function closePhone() {
    document.getElementById('phone-overlay').classList.remove('show');
    document.body.style.overflow = '';
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