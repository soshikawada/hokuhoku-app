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
     * @param {number} limit - 返却する施設数の上限（デフォルト: 20）
     * @returns {Array} レコメンドされた施設の配列（スコア順）
     */
    recommend(userAttributes, limit = 20) {
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

        // 上位limit件を返す
        return scoredFacilities.slice(0, limit);
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
            const ageScore = facility.scores.age[userAttributes.age] || 0;
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
            const companionScore = facility.scores.companion[userAttributes.companion] || 0;
            totalScore += companionScore;
        }

        if (userAttributes.purpose && facility.scores.purpose) {
            const purposeScore = facility.scores.purpose[userAttributes.purpose] || 0;
            totalScore += purposeScore;
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

