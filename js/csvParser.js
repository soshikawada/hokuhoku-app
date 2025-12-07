/**
 * CSVファイルの読み込みとパースを行うモジュール
 */

class CSVParser {
    constructor() {
        this.facilities = [];
        this.headers = [];
    }

    /**
     * CSVファイルを読み込んでパースする
     * @param {string} filePath - CSVファイルのパス
     * @returns {Promise<Array>} 施設データの配列
     */
    async loadCSV(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`CSVファイルの読み込みに失敗しました: ${response.status}`);
            }
            const csvText = await response.text();
            return this.parseCSV(csvText);
        } catch (error) {
            console.error('CSV読み込みエラー:', error);
            throw error;
        }
    }

    /**
     * CSVテキストをパースして施設データの配列に変換
     * @param {string} csvText - CSVテキスト
     * @returns {Array} 施設データの配列
     */
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSVファイルが空か、データが不足しています');
        }

        // ヘッダー行をパース
        this.headers = this.parseCSVLine(lines[0]);
        
        // データ行をパース
        this.facilities = [];
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < 2) continue; // 空行や不完全な行をスキップ

            const facility = this.createFacilityObject(values);
            if (facility) {
                this.facilities.push(facility);
            }
        }

        return this.facilities;
    }

    /**
     * CSV行をパース（カンマ区切り、引用符対応）
     * @param {string} line - CSV行
     * @returns {Array<string>} 値の配列
     */
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim()); // 最後の値

        return values;
    }

    /**
     * パースした値から施設オブジェクトを作成
     * @param {Array<string>} values - CSV行の値の配列
     * @returns {Object|null} 施設オブジェクト
     */
    createFacilityObject(values) {
        if (values.length < 2) return null;

        const facility = {
            prefecture: values[0] || '',
            name: values[1] || '',
            scores: {},
            nps: 0  // NPSを追加（デフォルト値は0）
        };

        // NPSカラムのインデックスを取得（ヘッダーの18番目、インデックス17）
        const npsIndex = this.headers.indexOf('NPS');
        if (npsIndex !== -1 && npsIndex < values.length) {
            const npsValue = parseFloat(values[npsIndex]);
            facility.nps = isNaN(npsValue) ? 0 : npsValue;
        }

        // ヘッダーから属性カラムのインデックスを取得
        const attributeColumns = {
            // 年代
            age: ['10代', '20代', '30代', '40代', '50代', '60代', '70代', '80代', '90代', '100代'],
            // 性別
            gender: ['男性', '女性'],
            // 宿泊日数
            stayDays: ['1泊', '2泊', '3泊', '4泊以上', '日帰り'],
            // 同伴者
            companion: ['自分ひとり', '恋人', '友人', '夫婦2人', '団体旅行', '親戚', '親', '職場の同僚', 
                       '小学生以下連れの家族', '中学生以下連れの家族', '高校生連れの家族'],
            // 訪問目的
            purpose: ['災害支援', '宿でのんびり過ごす', '温泉や露天風呂', '地元の美味しいものを食べる', 
                     '花見や紅葉などの自然鑑賞', '名所、旧跡の観光', 'テーマパーク（遊園地、動物園、博物館など）', 
                     '買い物、アウトレット', 'お祭りやイベントへの参加・見物', 'スポーツ観戦や芸能鑑賞（コンサート等）', 
                     'アウトドア（海水浴、釣り、登山など）', 'まちあるき、都市散策', '各種体験（手作り、果物狩りなど）', 
                     'スキー・スノボ、マリンスポーツ', 'その他スポーツ（ゴルフ、テニスなど）', 'ドライブ・ツーリング', 
                     '友人・親戚を尋ねる', '出張など仕事関係'],
            // 都道府県
            prefecture: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', 
                        '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', 
                        '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', 
                        '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', 
                        '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
        };

        // 各属性のスコアを取得
        for (const [category, attributes] of Object.entries(attributeColumns)) {
            facility.scores[category] = {};
            for (const attr of attributes) {
                const index = this.headers.indexOf(attr);
                if (index !== -1 && index < values.length) {
                    const scoreValue = parseFloat(values[index]) || 0;
                    facility.scores[category][attr] = scoreValue;
                }
            }
        }

        return facility;
    }

    /**
     * パース済みの施設データを取得
     * @returns {Array} 施設データの配列
     */
    getFacilities() {
        return this.facilities;
    }
}

// グローバルにエクスポート
window.CSVParser = CSVParser;

