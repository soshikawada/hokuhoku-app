/**
 * しおり生成モジュール
 */

class ItineraryGenerator {
    constructor() {
        this.facilitiesPerPage = 4; // 1ページあたりの施設数
    }

    /**
     * しおりデータを生成
     * @param {Array} wishlistItems - 行きたいリストのアイテム配列
     * @returns {Object} しおりデータ
     */
    generateItineraryData(wishlistItems) {
        const routeInfo = JSON.parse(localStorage.getItem('routeInfo') || 'null');
        const legs = routeInfo ? routeInfo.legs : [];

        // 施設データを整形
        const facilities = wishlistItems.map((item, index) => {
            // 写真URLを取得（複数の可能性を確認）
            let photoUrl = null;
            if (item.location) {
                photoUrl = item.location.photoUrlLarge || item.location.photoUrl || null;
            }
            
            // デバッグログ
            if (!photoUrl) {
                console.warn(`施設 ${item.facility.name} の写真URLが見つかりません:`, item.location);
            }
            
            const facility = {
                index: index,
                label: this.indexToAlphabet(index),
                name: item.facility.name,
                prefecture: item.facility.prefecture,
                category: this.getCategory(item.facility),
                photoUrl: photoUrl,
                address: item.location ? (item.location.address || `${item.facility.name} ${item.facility.prefecture}`) : `${item.facility.name} ${item.facility.prefecture}`,
                location: item.location || { lat: 0, lng: 0 }
            };

            // 移動時間を追加（前の施設からの移動時間）
            if (index > 0 && legs[index - 1]) {
                facility.travelTime = {
                    minutes: Math.round(legs[index - 1].duration.value / 60),
                    text: legs[index - 1].duration.text
                };
            }

            return facility;
        });

        // ページごとに分割
        const pages = [];
        for (let i = 0; i < facilities.length; i += this.facilitiesPerPage) {
            pages.push(facilities.slice(i, i + this.facilitiesPerPage));
        }

        return {
            facilities: facilities,
            pages: pages,
            totalPages: pages.length,
            routeInfo: routeInfo // routeInfoにはlegsが含まれている
        };
    }

    /**
     * インデックスをアルファベットに変換
     */
    indexToAlphabet(index) {
        if (index < 0) return '';
        if (index < 26) {
            return String.fromCharCode(65 + index);
        }
        const first = Math.floor(index / 26) - 1;
        const second = index % 26;
        return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
    }

    /**
     * 施設のカテゴリを取得（簡易版）
     */
    getCategory(facility) {
        // 施設名からカテゴリを推測（簡易版）
        const name = facility.name;
        if (name.includes('寺') || name.includes('神社') || name.includes('宮')) {
            return '寺院・神社';
        }
        if (name.includes('公園') || name.includes('庭園')) {
            return '公園・庭園';
        }
        if (name.includes('博物館') || name.includes('美術館')) {
            return '博物館・美術館';
        }
        if (name.includes('温泉') || name.includes('湯')) {
            return '温泉';
        }
        if (name.includes('市場') || name.includes('商店街')) {
            return 'グルメ・買い物';
        }
        return '観光スポット';
    }
}

// グローバルにエクスポート
window.ItineraryGenerator = ItineraryGenerator;

