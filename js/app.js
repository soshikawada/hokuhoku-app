/**
 * メインアプリケーションロジック
 */

// グローバル変数
let csvParser;
let recommendationEngine;
let mapController;
let dragDropManager;
let facilities = [];
let wishlistItems = [];

// Google Maps APIキー（config.jsから読み込む）
// config.jsファイルが存在しない場合はエラーを表示
let GOOGLE_MAPS_API_KEY = '';
if (typeof CONFIG !== 'undefined' && CONFIG.GOOGLE_MAPS_API_KEY && CONFIG.GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY') {
    GOOGLE_MAPS_API_KEY = CONFIG.GOOGLE_MAPS_API_KEY;
} else {
    const errorMsg = '設定ファイル（js/config.js）が見つからないか、APIキーが設定されていません。\n' +
                     '1. js/config.example.jsをjs/config.jsとしてコピー\n' +
                     '2. js/config.js内のYOUR_API_KEYを実際のAPIキーに置き換え';
    console.error(errorMsg);
    alert(errorMsg);
}

/**
 * アプリケーションの初期化
 */
async function initApp() {
    try {
        // CSVパーサーの初期化
        csvParser = new CSVParser();
        
        // CSVファイルを読み込み
        console.log('CSVファイルを読み込んでいます...');
        facilities = await csvParser.loadCSV('data/tif_score.csv');
        console.log(`${facilities.length}件の施設データを読み込みました`);

        // レコメンドエンジンの初期化
        recommendationEngine = new RecommendationEngine(facilities);

        // フォームイベントの設定
        setupFormEvents();

        // 検索機能の設定
        setupSearchEvents();

        console.log('アプリケーションの初期化が完了しました');
    } catch (error) {
        console.error('初期化エラー:', error);
        showError('データの読み込みに失敗しました。ページを再読み込みしてください。');
    }
}

/**
 * Google Maps APIの初期化
 */
function initGoogleMaps() {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps APIが読み込まれていません');
        return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('地図要素が見つかりません');
        return;
    }

    // MapControllerの初期化
    mapController = new MapController();
    mapController.initMap(GOOGLE_MAPS_API_KEY, mapElement);

    // ドラッグ&ドロップマネージャーの初期化
    dragDropManager = new DragDropManager('wishlist');

    // 行きたいリストの順番変更イベント
    document.addEventListener('wishlistOrderChanged', handleWishlistOrderChange);

    console.log('Google Maps APIの初期化が完了しました');
}

/**
 * フォームイベントの設定
 */
function setupFormEvents() {
    const form = document.getElementById('userForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const userAttributes = {
            age: formData.get('age'),
            gender: formData.get('gender'),
            stayDays: formData.get('stayDays'),
            companion: formData.get('companion'),
            purpose: formData.get('purpose')
        };

        // レコメンド実行
        const recommendations = recommendationEngine.recommend(userAttributes, 20);
        displayRecommendations(recommendations);
    });
}

/**
 * 検索機能の設定
 */
function setupSearchEvents() {
    const searchBtn = document.getElementById('searchBtn');
    const placeSearch = document.getElementById('placeSearch');

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }

    if (placeSearch) {
        placeSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch();
            }
        });
    }
}

/**
 * 施設検索の処理
 */
async function handleSearch() {
    const searchInput = document.getElementById('placeSearch');
    const query = searchInput.value.trim();

    if (!query) {
        alert('施設名を入力してください');
        return;
    }

    if (!mapController || !mapController.placesService) {
        alert('Google Maps APIが初期化されていません');
        return;
    }

    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '<div class="loading">検索中...</div>';

    const request = {
        query: query,
        fields: ['name', 'geometry', 'photos', 'formatted_address']
    };

    mapController.placesService.findPlaceFromQuery(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            displaySearchResults(results);
        } else {
            resultsDiv.innerHTML = '<div class="error">施設が見つかりませんでした</div>';
        }
    });
}

/**
 * 検索結果を表示
 */
function displaySearchResults(results) {
    const resultsDiv = document.getElementById('searchResults');
    resultsDiv.innerHTML = '';

    results.forEach(place => {
        const card = document.createElement('div');
        card.className = 'facility-card';
        
        const photoUrl = place.photos && place.photos.length > 0
            ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
            : null;

        card.innerHTML = `
            ${photoUrl ? `<img src="${photoUrl}" alt="${place.name}">` : ''}
            <h3>${place.name}</h3>
            <div class="prefecture">${place.formatted_address || ''}</div>
            <button class="btn btn-secondary" onclick="addToWishlistFromSearch('${place.name}', '${place.formatted_address || ''}', ${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${photoUrl || ''}')">リストに追加</button>
        `;

        resultsDiv.appendChild(card);
    });
}

/**
 * 検索結果から行きたいリストに追加（グローバル関数）
 */
window.addToWishlistFromSearch = function(name, address, lat, lng, photoUrl) {
    const facility = {
        name: name,
        prefecture: address.split(' ')[0] || '不明',
        scores: {}
    };

    const location = {
        lat: lat,
        lng: lng,
        name: name,
        photoUrl: photoUrl
    };

    addToWishlist(facility, location);
}

/**
 * レコメンド結果を表示
 */
function displayRecommendations(recommendations) {
    const section = document.getElementById('recommendationsSection');
    const container = document.getElementById('recommendations');

    if (!section || !container) return;

    section.style.display = 'block';
    container.innerHTML = '';

    if (recommendations.length === 0) {
        container.innerHTML = '<div class="error">レコメンド結果がありません</div>';
        return;
    }

    // 位置情報を非同期で取得しながら表示
    recommendations.forEach(async (facility, index) => {
        const card = createFacilityCard(facility, index);
        container.appendChild(card);

        // 位置情報と写真を取得
        try {
            const location = await mapController.getFacilityLocation(facility.name, facility.prefecture);
            updateFacilityCard(card, facility, location);
        } catch (error) {
            console.error(`施設の位置情報取得エラー: ${facility.name}`, error);
        }
    });
}

/**
 * 施設カードを作成
 */
function createFacilityCard(facility, index) {
    const card = document.createElement('div');
    card.className = 'facility-card';
    card.dataset.facilityName = facility.name;
    card.dataset.prefecture = facility.prefecture;
    card.dataset.index = index;

    card.innerHTML = `
        <div class="loading">読み込み中...</div>
        <h3>${facility.name}</h3>
        <div class="prefecture">${facility.prefecture}</div>
        ${facility.totalScore !== undefined ? `<div class="score">スコア: ${facility.totalScore.toFixed(3)}</div>` : ''}
        <div class="checkbox-container">
            <input type="checkbox" id="facility-${index}" onchange="handleFacilityCheckbox(this, '${facility.name}', '${facility.prefecture}')">
            <label for="facility-${index}">行きたいリストに追加</label>
        </div>
    `;

    return card;
}

/**
 * 施設カードを更新（写真を追加）
 */
function updateFacilityCard(card, facility, location) {
    const loadingDiv = card.querySelector('.loading');
    if (loadingDiv) {
        loadingDiv.remove();
    }

    if (location && location.photoUrl) {
        const existingImg = card.querySelector('img');
        if (!existingImg) {
            const img = document.createElement('img');
            img.src = location.photoUrl;
            img.alt = facility.name;
            card.insertBefore(img, card.querySelector('h3'));
        } else {
            existingImg.src = location.photoUrl;
        }
    }
}

/**
 * 施設チェックボックスの処理（グローバル関数）
 */
window.handleFacilityCheckbox = function(checkbox, facilityName, prefecture) {
    const facility = facilities.find(f => f.name === facilityName && f.prefecture === prefecture);
    if (!facility) return;

    if (checkbox.checked) {
        // 位置情報を取得してから追加
        mapController.getFacilityLocation(facilityName, prefecture).then(location => {
            addToWishlist(facility, location);
        });
    } else {
        removeFromWishlist(facility);
    }
}

/**
 * 行きたいリストに追加
 */
function addToWishlist(facility, location) {
    // 既に追加されているかチェック
    const exists = wishlistItems.some(item => 
        item.facility.name === facility.name && item.facility.prefecture === facility.prefecture
    );

    if (exists) {
        alert('この施設は既にリストに追加されています');
        return;
    }

    wishlistItems.push({ facility, location });
    
    if (dragDropManager) {
        dragDropManager.addItem(facility, location);
    }

    // 行きたいリストセクションを表示
    const wishlistSection = document.getElementById('wishlistSection');
    if (wishlistSection) {
        wishlistSection.style.display = 'block';
    }

    // ルート検索ボタンを表示
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn && wishlistItems.length >= 2) {
        routeBtn.style.display = 'block';
    }

    // チェックボックスを更新
    updateCheckboxes();
}

/**
 * 行きたいリストから削除
 */
function removeFromWishlist(facility) {
    wishlistItems = wishlistItems.filter(item => 
        !(item.facility.name === facility.name && item.facility.prefecture === facility.prefecture)
    );

    // ドラッグ&ドロップマネージャーからも削除
    if (dragDropManager) {
        const items = dragDropManager.getItems();
        const itemToRemove = items.find(item => 
            item.facility.name === facility.name && item.facility.prefecture === facility.prefecture
        );
        if (itemToRemove) {
            dragDropManager.removeItem(itemToRemove.element);
        }
    }

    // ルート検索ボタンの表示を更新
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.style.display = wishlistItems.length >= 2 ? 'block' : 'none';
    }

    updateCheckboxes();
}

/**
 * チェックボックスを更新
 */
function updateCheckboxes() {
    document.querySelectorAll('.facility-card input[type="checkbox"]').forEach(checkbox => {
        const card = checkbox.closest('.facility-card');
        const facilityName = card.dataset.facilityName;
        const prefecture = card.dataset.prefecture;

        const exists = wishlistItems.some(item => 
            item.facility.name === facilityName && item.facility.prefecture === prefecture
        );

        checkbox.checked = exists;
        card.classList.toggle('selected', exists);
    });
}

/**
 * 行きたいリストの順番変更処理
 */
function handleWishlistOrderChange(event) {
    const items = event.detail.items;
    wishlistItems = items;
}

/**
 * ルート検索ボタンの処理
 */
function handleRouteSearch() {
    if (wishlistItems.length < 2) {
        alert('ルート検索には2つ以上の施設が必要です');
        return;
    }

    if (!mapController) {
        alert('地図が初期化されていません');
        return;
    }

    // 地図セクションを表示
    const mapSection = document.getElementById('mapSection');
    if (mapSection) {
        mapSection.style.display = 'block';
        mapSection.scrollIntoView({ behavior: 'smooth' });
    }

    // 位置情報の配列を作成
    const waypoints = wishlistItems.map(item => ({
        lat: item.location.lat,
        lng: item.location.lng
    }));

    // ルートを計算
    mapController.clearMarkers();
    mapController.calculateRoute(waypoints);

    // マーカーを追加
    wishlistItems.forEach((item, index) => {
        mapController.addMarker(item.location, item.facility.name, index);
    });
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
    const container = document.querySelector('.container');
    if (container) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        container.insertBefore(errorDiv, container.firstChild);
    }
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

// Google Maps API読み込み後の初期化
window.initMap = function() {
    initGoogleMaps();
};

// ルート検索ボタンのイベント設定
document.addEventListener('DOMContentLoaded', () => {
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.addEventListener('click', handleRouteSearch);
    }
});

