/**
 * 設定ページの処理
 */

document.addEventListener('DOMContentLoaded', () => {
    // OpenAI APIキーの表示/非表示切り替え
    const toggleOpenAIKey = document.getElementById('toggleOpenAIKey');
    const openaiApiKeyInput = document.getElementById('openaiApiKey');
    const saveOpenAIKeyBtn = document.getElementById('saveOpenAIKey');
    const openaiKeyStatus = document.getElementById('openaiKeyStatus');
    const openaiEnvKeyInfo = document.getElementById('openaiEnvKeyInfo');

    // 環境変数からAPIキーが設定されているかチェック
    let envApiKey = null;
    if (typeof CONFIG !== 'undefined' && CONFIG.OPENAI_API_KEY) {
        envApiKey = CONFIG.OPENAI_API_KEY;
        // 環境変数から取得した場合（空文字列でない場合）
        if (envApiKey && envApiKey.length > 0) {
            // 環境変数が設定されていることを表示
            if (openaiEnvKeyInfo) {
                openaiEnvKeyInfo.style.display = 'block';
            }
            // 入力欄を無効化（環境変数が優先されるため）
            if (openaiApiKeyInput) {
                openaiApiKeyInput.placeholder = '環境変数から設定済み';
                openaiApiKeyInput.disabled = true;
            }
            if (saveOpenAIKeyBtn) {
                saveOpenAIKeyBtn.disabled = true;
                saveOpenAIKeyBtn.textContent = '環境変数使用中';
            }
            if (toggleOpenAIKey) {
                toggleOpenAIKey.disabled = true;
            }
            showStatus('openaiKeyStatus', '環境変数からAPIキーが設定されています', 'success');
        }
    }

    // 保存済みのAPIキーを読み込む（環境変数が設定されていない場合のみ）
    if (!envApiKey || envApiKey.length === 0) {
        const savedOpenAIKey = localStorage.getItem('openaiApiKey');
        if (savedOpenAIKey) {
            openaiApiKeyInput.value = savedOpenAIKey;
            showStatus('openaiKeyStatus', 'APIキーが保存されています', 'success');
        }
    }

    // 表示/非表示切り替え
    if (toggleOpenAIKey) {
        toggleOpenAIKey.addEventListener('click', () => {
            const type = openaiApiKeyInput.type === 'password' ? 'text' : 'password';
            openaiApiKeyInput.type = type;
            toggleOpenAIKey.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // 保存ボタン
    if (saveOpenAIKeyBtn) {
        saveOpenAIKeyBtn.addEventListener('click', () => {
            const apiKey = openaiApiKeyInput.value.trim();
            
            if (!apiKey) {
                showStatus('openaiKeyStatus', 'APIキーを入力してください', 'error');
                return;
            }

            // APIキーの形式チェック（OpenAI APIキーは通常 "sk-" で始まる）
            if (!apiKey.startsWith('sk-')) {
                if (!confirm('入力されたAPIキーが "sk-" で始まっていません。このまま保存しますか？')) {
                    return;
                }
            }

            // localStorageに保存
            localStorage.setItem('openaiApiKey', apiKey);
            showStatus('openaiKeyStatus', 'APIキーを保存しました', 'success');
            
            // 入力欄をクリア（セキュリティのため）
            setTimeout(() => {
                openaiApiKeyInput.value = '';
                openaiApiKeyInput.type = 'password';
                toggleOpenAIKey.textContent = '👁️';
            }, 1000);
        });
    }

    // エンターキーで保存
    if (openaiApiKeyInput) {
        openaiApiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveOpenAIKeyBtn.click();
            }
        });
    }
});

/**
 * ステータスメッセージを表示
 * @param {string} elementId - 要素ID
 * @param {string} message - メッセージ
 * @param {string} type - タイプ（success, error, info）
 */
function showStatus(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.textContent = message;
    element.className = `api-key-status ${type}`;
    
    // 3秒後に自動で消す（successの場合）
    if (type === 'success') {
        setTimeout(() => {
            element.textContent = '';
            element.className = 'api-key-status';
        }, 3000);
    }
}

/**
 * OpenAI APIキーを取得（他のスクリプトから使用可能）
 * 優先順位: 1. config.jsの直接設定値 2. 環境変数（Vercel） 3. localStorage（ローカル）
 * @returns {string|null} APIキー
 */
function getOpenAIApiKey() {
    // config.jsから取得（直接設定値または環境変数）
    if (typeof CONFIG !== 'undefined') {
        // OPENAI_API_KEY_FALLBACKを使用（優先順位を考慮）
        if (CONFIG.OPENAI_API_KEY_FALLBACK) {
            return CONFIG.OPENAI_API_KEY_FALLBACK;
        }
        // 直接OPENAI_API_KEYが設定されている場合
        if (CONFIG.OPENAI_API_KEY && CONFIG.OPENAI_API_KEY.length > 0) {
            return CONFIG.OPENAI_API_KEY;
        }
    }
    // localStorageから取得（ローカル環境）
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('openaiApiKey');
    }
    return null;
}

// グローバルにエクスポート
window.getOpenAIApiKey = getOpenAIApiKey;

