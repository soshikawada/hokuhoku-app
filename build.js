const fs = require('fs');
const path = require('path');

// Vercelの環境変数からAPIキーを取得
const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

if (!apiKey) {
    console.warn('警告: GOOGLE_MAPS_API_KEY環境変数が設定されていません');
}

// config.jsの内容を生成
const configContent = `/**
 * アプリケーション設定ファイル
 * 
 * このファイルはVercelのビルド時に自動生成されます。
 * 環境変数 GOOGLE_MAPS_API_KEY からAPIキーを取得しています。
 */

const CONFIG = {
    // Google Maps APIキー
    // 取得方法: https://console.cloud.google.com/
    GOOGLE_MAPS_API_KEY: '${apiKey}'
};
`;

// js/config.jsに書き込み
const configPath = path.join(__dirname, 'js', 'config.js');
fs.writeFileSync(configPath, configContent, 'utf8');

console.log('✓ config.js generated successfully');
console.log(`✓ API Key length: ${apiKey.length} characters`);