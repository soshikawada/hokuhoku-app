/**
 * レコメンドエンジン
 * ユーザーの属性に基づいて施設をレコメンドする
 */

class RecommendationEngine {
    constructor(facilities) {
        this.facilities = facilities || [];
    }

    /**
     * ユーザー属性に基づいて施設をレコメンド
     * @param {Object} userAttributes - ユーザー属性
     * @param {string} userAttributes.age - 年代
     * @param {string} userAttributes.gender - 性別
     * @param {string} userAttributes.stayDays - 宿泊日数
     * @param {string} userAttributes.companion - 同伴者
     * @param {string} userAttributes.purpose - 訪問目的
     * @param {number} limit - 返却する施設数の上限（デフォルト: 30）
     * @returns {Array} レコメンドされた施設の配列（スコア上位30件を抽出後、NPS順にソート）
     */
    recommend(userAttributes, limit = 30) {
        if (!this.facilities || this.facilities.length === 0) {
            console.warn('施設データがありません');
            return [];
        }

        // 各施設のスコアを計算
        const scoredFacilities = this.facilities.map(facility => {
            const score = this.calculateScore(facility, userAttributes);
            return {
                ...facility,
                totalScore: score
            };
        });

        // スコアの高い順にソート
        scoredFacilities.sort((a, b) => b.totalScore - a.totalScore);

        // 上位30施設を抽出
        const top30Facilities = scoredFacilities.slice(0, limit);

        // NPSが高い順にソート
        top30Facilities.sort((a, b) => {
            const npsA = a.nps || 0;
            const npsB = b.nps || 0;
            return npsB - npsA; // 降順（高い順）
        });

        return top30Facilities;
    }

    /**
     * 施設のスコアを計算
     * 各施設の行（CSVの各行）を基に、入力された属性に対応する列のスコアをすべて足し合わせる
     * @param {Object} facility - 施設オブジェクト（CSVの1行分のデータ）
     * @param {Object} userAttributes - ユーザー属性
     * @returns {number} 総合スコア（各属性のスコアの合計）
     */
    calculateScore(facility, userAttributes) {
        let totalScore = 0;

        // 各属性のスコアを加算（入力された列のスコアをすべて足す）
        if (userAttributes.age && facility.scores.age) {
            // 年代カテゴリーのマッピング
            const ageCategoryMap = {
                '若年層': ['10代', '20代', '30代'],
                '中年層': ['40代', '50代'],
                '高齢層': ['60代', '70代', '80代', '90代', '100代']
            };
            
            let ageScore = 0;
            
            // カテゴリーが選択されている場合、そのカテゴリーに含まれるすべての年代のスコアを合計
            if (ageCategoryMap[userAttributes.age]) {
                const ageCategories = ageCategoryMap[userAttributes.age];
                ageCategories.forEach(age => {
                    ageScore += facility.scores.age[age] || 0;
                });
            } else {
                // 個別の年代が選択されている場合（後方互換性のため）
                ageScore = facility.scores.age[userAttributes.age] || 0;
            }
            
            totalScore += ageScore;
        }

        if (userAttributes.gender && facility.scores.gender) {
            const genderScore = facility.scores.gender[userAttributes.gender] || 0;
            totalScore += genderScore;
        }

        if (userAttributes.stayDays && facility.scores.stayDays) {
            const stayDaysScore = facility.scores.stayDays[userAttributes.stayDays] || 0;
            totalScore += stayDaysScore;
        }

        if (userAttributes.companion && facility.scores.companion) {
            // 同伴者カテゴリーのマッピング
            const companionCategoryMap = {
                'ひとり旅': ['自分ひとり'],
                'カップル': ['恋人', '夫婦2人'],
                '友人・同僚': ['友人', '職場の同僚'],
                '家族': ['小学生以下連れの家族', '中学生以下連れの家族', '高校生連れの家族'],
                '親族・団体': ['親', '親戚', '団体旅行']
            };
            
            let companionScore = 0;
            
            // カテゴリーが選択されている場合、そのカテゴリーに含まれるすべての同伴者のスコアを合計
            if (companionCategoryMap[userAttributes.companion]) {
                const companions = companionCategoryMap[userAttributes.companion];
                companions.forEach(companion => {
                    companionScore += facility.scores.companion[companion] || 0;
                });
            } else {
                // 個別の同伴者が選択されている場合（後方互換性のため）
                companionScore = facility.scores.companion[userAttributes.companion] || 0;
            }
            
            totalScore += companionScore;
        }

        if (userAttributes.purpose && facility.scores.purpose) {
            // 訪問目的カテゴリーのマッピング
            const purposeCategoryMap = {
                'リラックス・温泉': ['宿でのんびり過ごす', '温泉や露天風呂'],
                'グルメ・買い物': ['地元の美味しいものを食べる', '買い物、アウトレット'],
                '自然・アウトドア': ['花見や紅葉などの自然鑑賞', 'アウトドア（海水浴、釣り、登山など）', 
                                   'スキー・スノボ、マリンスポーツ', 'その他スポーツ（ゴルフ、テニスなど）', 
                                   'ドライブ・ツーリング'],
                '観光・文化': ['名所、旧跡の観光', 'テーマパーク（遊園地、動物園、博物館など）', 
                            'お祭りやイベントへの参加・見物', 'スポーツ観戦や芸能鑑賞（コンサート等）', 
                            'まちあるき、都市散策', '各種体験（手作り、果物狩りなど）'],
                'その他': ['災害支援', '友人・親戚を尋ねる', '出張など仕事関係']
            };
            
            let purposeScore = 0;
            
            // カテゴリーが選択されている場合、そのカテゴリーに含まれるすべての訪問目的のスコアを合計
            if (purposeCategoryMap[userAttributes.purpose]) {
                const purposes = purposeCategoryMap[userAttributes.purpose];
                purposes.forEach(purpose => {
                    purposeScore += facility.scores.purpose[purpose] || 0;
                });
            } else {
                // 個別の訪問目的が選択されている場合（後方互換性のため）
                purposeScore = facility.scores.purpose[userAttributes.purpose] || 0;
            }
            
            totalScore += purposeScore;
        }

        // 都道府県エリアのスコアを加算
        if (userAttributes.prefectureArea && facility.scores.prefecture) {
            // 都道府県エリアのマッピング
            const prefectureAreaMap = {
                '北海道・東北': ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
                '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
                '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県'],
                '関西': ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
                '中国・四国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'],
                '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
            };
            
            let prefectureScore = 0;
            
            // エリアが選択されている場合、そのエリアに含まれるすべての都道府県のスコアを合計
            if (prefectureAreaMap[userAttributes.prefectureArea]) {
                const prefectures = prefectureAreaMap[userAttributes.prefectureArea];
                prefectures.forEach(prefecture => {
                    prefectureScore += facility.scores.prefecture[prefecture] || 0;
                });
            }
            
            totalScore += prefectureScore;
        }

        return totalScore;
    }

    /**
     * 施設データを設定
     * @param {Array} facilities - 施設データの配列
     */
    setFacilities(facilities) {
        this.facilities = facilities;
    }
}

// グローバルにエクスポート
window.RecommendationEngine = RecommendationEngine;

