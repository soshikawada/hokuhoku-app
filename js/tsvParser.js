/**
 * TSVファイルの読み込みとパースを行うモジュール
 */

class TSVParser {
    constructor() {
        this.data = [];
        this.headers = [];
    }

    /**
     * TSVファイルを読み込む
     * @param {string} filePath - TSVファイルのパス
     * @returns {Promise<Array>} パースされたデータの配列
     */
    async loadTSV(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`TSVファイルの読み込みに失敗しました: ${response.statusText}`);
            }
            
            const text = await response.text();
            return this.parseTSV(text);
        } catch (error) {
            console.error('TSV読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * TSVテキストをパースする
     * @param {string} text - TSVテキスト
     * @returns {Array} パースされたデータの配列
     */
    parseTSV(text) {
        const lines = text.trim().split('\n');
        if (lines.length === 0) {
            return [];
        }

        // ヘッダー行をパース
        this.headers = this.parseTSVLine(lines[0]);
        
        // データ行をパース
        this.data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseTSVLine(lines[i]);
            if (values.length === 0) continue;
            
            const row = {};
            this.headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            this.data.push(row);
        }

        return this.data;
    }

    /**
     * TSV行をパースする（タブ区切り）
     * @param {string} line - TSV行
     * @returns {Array<string>} 値の配列
     */
    parseTSVLine(line) {
        // タブで分割
        return line.split('\t').map(value => value.trim());
    }

    /**
     * 施設名と都道府県でフィルタリング
     * @param {Array} data - フィルタリング対象のデータ配列（省略時はthis.dataを使用）
     * @param {string} facilityName - 施設名（CSVから取得）
     * @param {string} prefecture - 都道府県（CSVから取得）
     * @returns {Array} フィルタリングされたデータ配列
     */
    filterByFacility(data = null, facilityName, prefecture) {
        const targetData = data || this.data;
        
        return targetData.filter(row => {
            const tsvFacilityName = row['回答場所'] || '';
            const tsvPrefecture = row['対象県（富山/石川/福井）'] || '';
            
            // 施設名のマッチング
            const nameMatches = this.matchFacilityName(facilityName, tsvFacilityName);
            
            // 都道府県のマッチング
            const prefectureMatches = this.matchPrefecture(prefecture, tsvPrefecture);
            
            return nameMatches && prefectureMatches;
        });
    }

    /**
     * 施設名のマッチングロジック
     * @param {string} csvName - CSVファイルの施設名
     * @param {string} tsvName - TSVファイルの「回答場所」
     * @returns {boolean} マッチするかどうか
     */
    matchFacilityName(csvName, tsvName) {
        if (!csvName || !tsvName) return false;
        
        // 完全一致
        if (csvName === tsvName) return true;
        
        // 「エリア」を除いて比較
        const csvNormalized = csvName.replace(/\s*エリア\s*/g, '').trim();
        const tsvNormalized = tsvName.replace(/\s*エリア\s*/g, '').trim();
        if (csvNormalized === tsvNormalized) return true;
        
        // 部分一致（どちらかがもう一方を含む）
        if (csvNormalized.includes(tsvNormalized) || 
            tsvNormalized.includes(csvNormalized)) {
            return true;
        }
        
        return false;
    }

    /**
     * 都道府県のマッチングロジック
     * @param {string} csvPrefecture - CSVファイルの都道府県（例：「福井県」）
     * @param {string} tsvPrefecture - TSVファイルの「対象県」（例：「福井」）
     * @returns {boolean} マッチするかどうか
     */
    matchPrefecture(csvPrefecture, tsvPrefecture) {
        if (!csvPrefecture || !tsvPrefecture) return false;
        
        // 「県」「府」を除いて比較
        const csvNormalized = csvPrefecture.replace(/[県府都]$/, '').trim();
        const tsvNormalized = tsvPrefecture.replace(/[県府都]$/, '').trim();
        
        return csvNormalized === tsvNormalized;
    }

    /**
     * 統計情報を計算
     * @param {Array} data - 対象データ配列
     * @returns {Object} 統計情報オブジェクト
     */
    calculateStatistics(data) {
        if (!data || data.length === 0) {
            return {
                totalCount: 0,
                averageSatisfaction: 0,
                averageRecommendation: 0,
                satisfactionDistribution: {},
                recommendationDistribution: {},
                ageDistribution: {},
                companionDistribution: {},
                purposeDistribution: {}
            };
        }

        let totalSatisfaction = 0;
        let totalRecommendation = 0;
        const satisfactionCounts = {};
        const recommendationCounts = {};
        const ageCounts = {};
        const companionCounts = {};
        const purposeCounts = {};

        data.forEach(row => {
            // 満足度
            const satisfaction = parseInt(row['満足度（旅行全体）']) || 0;
            if (satisfaction > 0) {
                totalSatisfaction += satisfaction;
                satisfactionCounts[satisfaction] = (satisfactionCounts[satisfaction] || 0) + 1;
            }

            // おすすめ度
            const recommendation = parseInt(row['おすすめ度']) || 0;
            if (recommendation > 0) {
                totalRecommendation += recommendation;
                recommendationCounts[recommendation] = (recommendationCounts[recommendation] || 0) + 1;
            }

            // 年代
            const age = row['年代'] || '';
            if (age) {
                ageCounts[age] = (ageCounts[age] || 0) + 1;
            }

            // 同伴者
            const companion = row['同伴者'] || '';
            if (companion) {
                companionCounts[companion] = (companionCounts[companion] || 0) + 1;
            }
        });

        return {
            totalCount: data.length,
            averageSatisfaction: data.length > 0 ? (totalSatisfaction / data.length).toFixed(2) : 0,
            averageRecommendation: data.length > 0 ? (totalRecommendation / data.length).toFixed(2) : 0,
            satisfactionDistribution: satisfactionCounts,
            recommendationDistribution: recommendationCounts,
            ageDistribution: ageCounts,
            companionDistribution: companionCounts
        };
    }
}

