window.apiConfig = null;
window.isRequesting = false;
window._currentAbort = null;

// 读取本地API配置
function loadApiConfig() {
    const saved = localStorage.getItem('saosao_api_config');
    if (saved) {
        window.apiConfig = JSON.parse(saved);
        if (document.getElementById('api-url')) document.getElementById('api-url').value = window.apiConfig.url || '';
        if (document.getElementById('api-key')) document.getElementById('api-key').value = window.apiConfig.key || '';
        if (document.getElementById('api-model')) document.getElementById('api-model').value = window.apiConfig.model || '';
        if (document.getElementById('api-stream-toggle') && window.apiConfig.stream !== undefined) {
            document.getElementById('api-stream-toggle').checked = window.apiConfig.stream;
        }
        if (document.getElementById('api-search-toggle') && window.apiConfig.enableSearch !== undefined) {
            document.getElementById('api-search-toggle').checked = window.apiConfig.enableSearch;
        }
        if (document.getElementById('search-key')) document.getElementById('search-key').value = window.apiConfig.searchKey || '';
        document.querySelectorAll('#api-type-group .radio-item').forEach(i => {
            i.classList.toggle('active', i.dataset.val === window.apiConfig.type);
        });
    }
}

function selectApiType(el) {
    document.querySelectorAll('#api-type-group .radio-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

function getApiType() {
    const active = document.querySelector('#api-type-group .radio-item.active');
    return active ? active.dataset.val : 'openai';
}

function saveApiConfig() {
    const config = {
        type: getApiType(),
        url: document.getElementById('api-url').value.trim(),
        key: document.getElementById('api-key').value.trim(),
        model: document.getElementById('api-model').value.trim(),
        temperature: 0.85,
        maxTokens: 4096,
        stream: document.getElementById('api-stream-toggle') ? document.getElementById('api-stream-toggle').checked : true,
        enableSearch: document.getElementById('api-search-toggle') ? document.getElementById('api-search-toggle').checked : false,
        searchKey: document.getElementById('search-key') ? document.getElementById('search-key').value.trim() : ''
    };
    if (!config.url || !config.key || !config.model) {
        if (typeof showToast === 'function') showToast('请填写完整配置');
        return;
    }
    localStorage.setItem('saosao_api_config', JSON.stringify(config));
    window.apiConfig = config;
    if (typeof showToast === 'function') showToast('配置已保存');
}

function abortCurrentRequest() {
    if (window._currentAbort) {
        window._currentAbort.abort();
        window._currentAbort = null;
    }
    window.isRequesting = false;
}

// Tavily 联网搜索
async function performWebSearch(query) {
    const cfg = window.apiConfig;
    if (!cfg || !cfg.enableSearch || !cfg.searchKey) return null;

    try {
        const resp = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: cfg.searchKey,
                query: query,
                search_depth: 'basic',
                max_results: 3
            })
        });

        if (!resp.ok) throw new Error('Search failed');
        const data = await resp.json();

        if (data.results && data.results.length > 0) {
            let searchContext = "\n【系统附加：最新真实网络资讯】\n";
            data.results.forEach((r, i) => {
                searchContext += `${i + 1}. ${r.title}: ${r.content}\n`;
            });
            return searchContext;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// 非流式调用（用于短请求）
async function callAI(messages, configOverride, maxTokensOverride) {
    const cfg = configOverride || window.apiConfig;
    if (!cfg) throw new Error('未配置API');

    const maxTk = maxTokensOverride || cfg.maxTokens || 4096;
    let url, headers, body;

    if (cfg.type === 'claude') {
        url = cfg.url.replace(/\/$/, '') + '/messages';
        headers = { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' };
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
    if (cfg.type === 'claude') {
        return (data.content && data.content[0] && data.content[0].text) || '';
    } else {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    }
}

// 流式调用（用于游戏剧情生成）
async function callAIStream(messages, { onChunk, onDone, onError, configOverride, maxTokensOverride } = {}) {
    const cfg = configOverride || window.apiConfig;
    if (!cfg) {
        onError && onError(new Error('未配置API'));
        return;
    }

    const maxTk = maxTokensOverride || cfg.maxTokens || 4096;

    // 非流式模式直接退回普通调用
    if (cfg.stream === false) {
        try {
            const fullText = await callAI(messages, cfg, maxTk);
            onDone && onDone(fullText);
        } catch (e) {
            onError && onError(e);
        }
        return;
    }

    const abortCtrl = new AbortController();
    window._currentAbort = abortCtrl;
    window.isRequesting = true;

    let url, headers, body;

    if (cfg.type === 'claude') {
        url = cfg.url.replace(/\/$/, '') + '/messages';
        headers = { 'Content-Type': 'application/json', 'x-api-key': cfg.key, 'anthropic-version': '2023-06-01' };
        let systemMsg = '';
        let convMessages = [];
        for (const m of messages) {
            if (m.role === 'system') systemMsg += m.content + '\n';
            else convMessages.push(m);
        }
        body = { model: cfg.model, max_tokens: maxTk, temperature: cfg.temperature, messages: convMessages, stream: true };
        if (systemMsg) body.system = systemMsg.trim();
    } else {
        url = cfg.url.replace(/\/$/, '') + '/chat/completions';
        headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.key };
        body = { model: cfg.model, messages: messages, temperature: cfg.temperature, max_tokens: maxTk, stream: true };
    }

    let fullText = '';

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
            signal: abortCtrl.signal
        });

        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error('API错误 ' + resp.status + ': ' + errText.substring(0, 200));
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;

                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    let chunk = '';
                    if (cfg.type === 'claude') {
                        if (json.type === 'content_block_delta' && json.delta && json.delta.text) chunk = json.delta.text;
                    } else {
                        if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) chunk = json.choices[0].delta.content;
                    }
                    if (chunk) {
                        fullText += chunk;
                        onChunk && onChunk(chunk, fullText);
                    }
                } catch (e) { }
            }
        }
        window.isRequesting = false;
        window._currentAbort = null;
        onDone && onDone(fullText);

    } catch (err) {
        window.isRequesting = false;
        window._currentAbort = null;
        if (err.name === 'AbortError') onDone && onDone(fullText || '');
        else onError && onError(err);
    }
}

// 测试连接
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