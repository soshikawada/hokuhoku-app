const fs = require('fs');
const path = require('path');

// Vercelの環境変数からAPIキーを取得
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
const openaiApiKey = process.env.OPENAI_API_KEY || '';

if (!googleMapsApiKey) {
    console.warn('警告: GOOGLE_MAPS_API_KEY環境変数が設定されていません');
}

if (!openaiApiKey) {
    console.warn('警告: OPENAI_API_KEY環境変数が設定されていません（ローカルでは設定ページで設定可能）');
}

// config.jsの内容を生成
const configContent = `/**
 * アプリケーション設定ファイル
 * 
 * このファイルはVercelのビルド時に自動生成されます。
 * 環境変数からAPIキーを取得しています。
 * 
 * ローカル環境では、このファイルに直接APIキーを書き込むか、
 * settings.htmlでAPIキーを設定することも可能です。
 */

const CONFIG = {
    // Google Maps APIキー
    // 取得方法: https://console.cloud.google.com/
    GOOGLE_MAPS_API_KEY: '${googleMapsApiKey}',
    
    // OpenAI APIキー
    // 優先順位: 1. 直接設定値 2. 環境変数（Vercel） 3. localStorage（ローカル）
    // 取得方法: https://platform.openai.com/api-keys
    // 注意: このファイルは.gitignoreに含まれているため、Gitにコミットされません
    OPENAI_API_KEY: '${openaiApiKey}',
    
    // 上記のOPENAI_API_KEYが空文字列の場合、環境変数やlocalStorageから取得
    get OPENAI_API_KEY_FALLBACK() {
        // 直接設定された値がある場合はそれを使用
        if (this.OPENAI_API_KEY && this.OPENAI_API_KEY.length > 0) {
            return this.OPENAI_API_KEY;
        }
        // 環境変数から取得（Vercel環境）
        const envKey = '${openaiApiKey}';
        if (envKey) {
            return envKey;
        }
        // localStorageから取得（ローカル環境）
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('openaiApiKey') || null;
        }
        return null;
    }
};
`;

// js/config.jsに書き込み
const configPath = path.join(__dirname, 'js', 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✓ config.js generated successfully');
console.log(`✓ Google Maps API Key length: ${googleMapsApiKey.length} characters`);
console.log(`✓ OpenAI API Key length: ${openaiApiKey.length} characters`);