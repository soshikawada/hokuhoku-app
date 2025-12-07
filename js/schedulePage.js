/**
 * タイムスケジュール画面の処理
 */

let scheduleData;

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', () => {
    loadSchedule();
});

/**
 * タイムスケジュールを読み込んで表示
 */
function loadSchedule() {
    // 行きたいリストを取得
    let wishlistItems = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (wishlistItems.length === 0) {
        showError('行きたいリストが空です。ルート画面で施設を追加してください。');
        return;
    }

    // ルート情報を取得
    const routeInfo = JSON.parse(localStorage.getItem('routeInfo') || 'null');
    if (!routeInfo) {
        showError('ルート情報がありません。ルート画面で「ルートを更新」ボタンをクリックしてルートを計算してください。');
        return;
    }

    const legs = routeInfo.legs || [];

    // 施設データを整形
    const facilities = wishlistItems.map((item, index) => {
        // 写真URLを取得
        let photoUrl = null;
        if (item.location) {
            photoUrl = item.location.photoUrlLarge || item.location.photoUrl || null;
        }

        const facility = {
            index: index,
            label: indexToAlphabet(index),
            name: item.facility.name,
            prefecture: item.facility.prefecture,
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

    scheduleData = {
        facilities: facilities,
        routeInfo: routeInfo
    };

    // スケジュールを表示
    renderSchedule();
}

/**
 * インデックスをアルファベットに変換
 */
function indexToAlphabet(index) {
    if (index < 0) return '';
    if (index < 26) {
        return String.fromCharCode(65 + index);
    }
    const first = Math.floor(index / 26) - 1;
    const second = index % 26;
    return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

/**
 * スケジュールをレンダリング
 */
function renderSchedule() {
    const contentContainer = document.getElementById('scheduleContent');
    contentContainer.innerHTML = '';

    if (!scheduleData || !scheduleData.facilities || scheduleData.facilities.length === 0) {
        showError('表示する施設がありません。');
        return;
    }

    scheduleData.facilities.forEach((facility, index) => {
        // 移動時間カード（最初の施設以外）
        if (facility.travelTime) {
            const travelTimeCard = document.createElement('div');
            travelTimeCard.className = 'travel-time-card';
            travelTimeCard.innerHTML = `
                <span class="travel-time-label">移動時間：</span>
                <span class="travel-time-text">${facility.travelTime.text}</span>
            `;
            contentContainer.appendChild(travelTimeCard);
        }

        // 施設カード
        const facilityCard = document.createElement('div');
        facilityCard.className = 'facility-schedule-card';
        
        const imageHTML = facility.photoUrl
            ? `<img src="${facility.photoUrl}" alt="${facility.name}" class="facility-image" onerror="this.parentElement.innerHTML='<div class=\\'facility-image-placeholder\\'>画像なし</div>'">`
            : '<div class="facility-image-placeholder">画像なし</div>';

        facilityCard.innerHTML = `
            <div class="facility-card-content">
                <div class="facility-image-container">
                    ${imageHTML}
                </div>
                <div class="facility-info">
                    <span class="facility-label">${facility.label}</span>
                    <h2 class="facility-name">${facility.name}</h2>
                    <p class="facility-prefecture">${facility.prefecture}</p>
                    <p class="facility-address">${facility.address}</p>
                </div>
            </div>
        `;

        contentContainer.appendChild(facilityCard);
    });
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    const contentContainer = document.getElementById('scheduleContent');
    contentContainer.innerHTML = `
        <div class="schedule-error">
            <h2>エラー</h2>
            <p>${message}</p>
            <a href="route.html" class="btn btn-primary">ルート画面に戻る</a>
        </div>
    `;
}

