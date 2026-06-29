// ══════════════════════════════════════
// AI API 通信模块
// ══════════════════════════════════════

window.apiConfig = null;
window.isRequesting = false;

// 读取本地存的 API 配置
function loadApiConfig() {
    const saved = localStorage.getItem('saosao_api_config');
    if (saved) {
        window.apiConfig = JSON.parse(saved);
        if(document.getElementById('api-url')) document.getElementById('api-url').value = window.apiConfig.url || '';
        if(document.getElementById('api-key')) document.getElementById('api-key').value = window.apiConfig.key || '';
        if(document.getElementById('api-model')) document.getElementById('api-model').value = window.apiConfig.model || '';
        // 恢复单选框状态
        document.querySelectorAll('#api-type-group .radio-item').forEach(i => {
            i.classList.toggle('active', i.dataset.val === window.apiConfig.type);
        });
    }
}

// 供页面按钮调用的：选择 API 类型
function selectApiType(el) {
    document.querySelectorAll('#api-type-group .radio-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

function getApiType() {
    const active = document.querySelector('#api-type-group .radio-item.active');
    return active ? active.dataset.val : 'openai';
}

// 保存配置
function saveApiConfig() {
    const config = {
        type: getApiType(),
        url: document.getElementById('api-url').value.trim(),
        key: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value.trim(),
        temperature: 0.85,
        maxTokens: 4096
    };
    if (!config.url || !config.key || !config.model) {
        if(typeof showToast === 'function') showToast('请填写完整配置');
        return;
    }
    localStorage.setItem('saosao_api_config', JSON.stringify(config));
    window.apiConfig = config;
    if(typeof showToast === 'function') showToast('配置已保存');
}

// 核心调用函数
async function callAI(messages, configOverride, maxTokensOverride) {
    const cfg = configOverride || window.apiConfig;
    if (!cfg) throw new Error('未配置API');

    const maxTk = maxTokensOverride || cfg.maxTokens || 4096;
    let url, headers, body;

    if (cfg.type === 'claude') {
        url = cfg.url.replace(/\/$/, '') + '/messages';
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': cfg.key,
            'anthropic-version': '2023-06-01'
        };
        let systemMsg = '';
        let convMessages = [];
        for (const m of messages) {
            if (m.role === 'system') systemMsg += m.content + '\n';
            else convMessages.push(m);
        }
        body = { model: cfg.model, max_tokens: maxTk, temperature: cfg.temperature, messages: convMessages };
        if (systemMsg) body.system = systemMsg.trim();
    } else {
        url = cfg.url.replace(/\/$/, '') + '/chat/completions';
        headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key };
        body = { model: cfg.model, messages: messages, temperature: cfg.temperature, max_tokens: maxTk };
    }

    const resp = await fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(body) });

    if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error('API错误 ' + resp.status + ': ' + errText.substring(0, 200));
    }

    const data = await resp.json();
    if (cfg.type === "claude") {
        return (data.content && data.content[0] && data.content[0].text) || "";
    } else {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    }
}

// 测试连接按钮
async function testApi() {
    const resultEl = document.getElementById('test-result');
    resultEl.className = 'test-result';
    
    const config = {
        type: getApiType(),
        url: document.getElementById('api-url').value.trim(),
        key: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value.trim(),
        temperature: 0.8,
        maxTokens: 100
    };

    if (!config.url || !config.key || !config.model) {
        resultEl.textContent = '❌ 请先填写完整配置';
        resultEl.className = 'test-result error';
        resultEl.style.display = 'block';
        return;
    }

    resultEl.textContent = '⏳ 正在测试...';
    resultEl.className = 'test-result success';
    resultEl.style.display = 'block';

    try {
        const response = await callAI([{ role: 'user', content: '你好，请只回复"连接成功"四个字。' }], config, 20);
        resultEl.textContent = '✅ 连接成功！回复：' + response;
    } catch (e) {
        resultEl.textContent = '❌ ' + e.message;
        resultEl.className = 'test-result error';
    }
}