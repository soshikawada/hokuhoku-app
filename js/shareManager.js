/**
 * しおり共有管理モジュール
 */

class ShareManager {
    constructor() {
        this.expirationDays = 7; // 1週間
    }

    /**
     * ランダムIDを生成
     */
    generateShareId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }

    /**
     * しおりデータを保存して共有IDを返す
     */
    saveItineraryForShare(itineraryData) {
        const shareId = this.generateShareId();
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + this.expirationDays);

        const shareData = {
            itineraryData: itineraryData,
            createdAt: new Date().toISOString(),
            expiresAt: expirationDate.toISOString()
        };

        // localStorageに保存
        localStorage.setItem(`itinerary_share_${shareId}`, JSON.stringify(shareData));

        // 期限切れデータをクリーンアップ
        this.cleanupExpiredShares();

        return shareId;
    }

    /**
     * 共有IDからしおりデータを取得
     */
    loadItineraryFromShare(shareId) {
        const shareData = JSON.parse(
            localStorage.getItem(`itinerary_share_${shareId}`) || 'null'
        );

        if (!shareData) {
            return null;
        }

        // 有効期限チェック
        const expiresAt = new Date(shareData.expiresAt);
        if (new Date() > expiresAt) {
            // 期限切れの場合は削除
            localStorage.removeItem(`itinerary_share_${shareId}`);
            return null;
        }

        return shareData.itineraryData;
    }

    /**
     * 期限切れの共有データを削除
     */
    cleanupExpiredShares() {
        const now = new Date();
        const keys = Object.keys(localStorage);
        
        keys.forEach(key => {
            if (key.startsWith('itinerary_share_')) {
                try {
                    const shareData = JSON.parse(localStorage.getItem(key));
                    if (shareData && shareData.expiresAt) {
                        const expiresAt = new Date(shareData.expiresAt);
                        if (now > expiresAt) {
                            localStorage.removeItem(key);
                        }
                    }
                } catch (e) {
                    // パースエラーは無視
                }
            }
        });
    }

    /**
     * 共有リンクを生成
     */
    generateShareUrl(shareId) {
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?share=${shareId}`;
    }
}

