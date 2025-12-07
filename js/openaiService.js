/**
 * OpenAI API呼び出しサービス
 */

class OpenAIService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * APIキーを取得（優先順位: CONFIG > localStorage）
     * @returns {string|null} APIキー
     */
    getApiKey() {
        // CONFIGから取得
        if (typeof CONFIG !== 'undefined' && CONFIG.OPENAI_API_KEY_FALLBACK) {
            this.apiKey = CONFIG.OPENAI_API_KEY_FALLBACK;
            return this.apiKey;
        }

        // localStorageから取得
        if (typeof localStorage !== 'undefined') {
            this.apiKey = localStorage.getItem('openaiApiKey');
            return this.apiKey;
        }

        return null;
    }

    /**
     * TSVデータをプロンプト用に整形
     * @param {Array} facilityData - フィルタリングされた施設データ
     * @returns {string} 整形されたテキスト
     */
    formatTSVDataForPrompt(facilityData) {
        if (!facilityData || facilityData.length === 0) {
            return '評価データがありません。';
        }

        // 最初の10件のみを使用（プロンプトが長くなりすぎないように）
        const sampleData = facilityData.slice(0, 10);
        
        const formatted = sampleData.map((row, index) => {
            return `【回答${index + 1}】
- 満足度（旅行全体）: ${row['満足度（旅行全体）'] || 'なし'}/5
- おすすめ度: ${row['おすすめ度'] || 'なし'}/10
- 満足度理由: ${row['満足度理由'] || 'なし'}
- 年代: ${row['年代'] || 'なし'}
- 同伴者: ${row['同伴者'] || 'なし'}
- 居住都道府県: ${row['居住都道府県'] || 'なし'}`;
        }).join('\n\n');

        const totalCount = facilityData.length;
        return `全${totalCount}件の評価データのうち、代表的な${sampleData.length}件を以下に示します。\n\n${formatted}`;
    }

    /**
     * プロンプトを構築
     * @param {string} facilityName - 施設名
     * @param {string} prefecture - 都道府県
     * @param {Array} facilityData - フィルタリングされた施設データ
     * @returns {string} プロンプトテキスト
     */
    buildPrompt(facilityName, prefecture, facilityData) {
        const formattedData = this.formatTSVDataForPrompt(facilityData);
        
        return `あなたは観光施設の評価を分析する専門家です。以下の施設の評価データを分析して、この施設のおすすめポイントを3〜5個、簡潔に箇条書きで提示してください。

【施設情報】
- 施設名: ${facilityName}
- 都道府県: ${prefecture}

【評価データ】
${formattedData}

【出力形式】
以下の形式で、おすすめポイントを3〜5個提示してください：
1. [ポイント1]
2. [ポイント2]
3. [ポイント3]
...

【注意事項】
- 評価データに基づいて、実際の訪問者の声を反映したポイントを提示してください
- 推測や一般的な情報ではなく、提供されたデータから読み取れる具体的な特徴を強調してください
- 各ポイントは1〜2文程度で簡潔に記述してください
- 日本語で回答してください`;
    }

    /**
     * OpenAI APIを呼び出す
     * @param {string} facilityName - 施設名
     * @param {string} prefecture - 都道府県
     * @param {Array} facilityData - フィルタリングされた施設データ
     * @returns {Promise<string>} AI生成されたおすすめポイント
     */
    async generateRecommendationPoints(facilityName, prefecture, facilityData) {
        const apiKey = this.getApiKey();
        
        if (!apiKey) {
            throw new Error('OpenAI APIキーが設定されていません。設定ページでAPIキーを入力してください。');
        }

        const prompt = this.buildPrompt(facilityName, prefecture, facilityData);

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: 'あなたは観光施設の評価を分析する専門家です。評価データに基づいて、具体的で実用的なおすすめポイントを提示してください。'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 500
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`OpenAI APIエラー: ${response.status} ${errorData.error?.message || response.statusText}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('OpenAI APIからの応答が不正です');
            }

            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API呼び出しエラー:', error);
            throw error;
        }
    }
}

