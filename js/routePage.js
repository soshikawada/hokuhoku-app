/**
 * ルート表示ページの処理
 */

let mapController;
let dragDropManager;
let wishlistItems = [];

// Google Maps APIのコールバック
window.initMapForRoute = function() {
    console.log('initMapForRoute called');
    
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps APIが読み込まれていません');
        return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('地図要素が見つかりません');
        return;
    }

    console.log('地図要素が見つかりました:', mapElement);

    // CONFIGが読み込まれているか確認
    if (typeof CONFIG === 'undefined' || !CONFIG.GOOGLE_MAPS_API_KEY || CONFIG.GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY') {
        console.error('Google Maps APIキーが設定されていません');
        alert('Google Maps APIキーが設定されていません。js/config.jsファイルを確認してください。');
        return;
    }

    console.log('MapControllerを初期化します...');
    
    // MapControllerの初期化
    mapController = new MapController();
    mapController.initMap(CONFIG.GOOGLE_MAPS_API_KEY, mapElement);
    
    console.log('地図が初期化されました:', mapController.map);
    
    // 地図のリサイズをトリガー（レイアウトが確定した後に地図を表示）
    setTimeout(() => {
        if (mapController && mapController.map) {
            console.log('地図のリサイズをトリガーします');
            google.maps.event.trigger(mapController.map, 'resize');
            
            // 地図の中心を再設定
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(new google.maps.LatLng(36.2048, 138.2529));
            mapController.map.fitBounds(bounds);
        }
    }, 300);

    // ドラッグ&ドロップマネージャーの初期化
    dragDropManager = new DragDropManager('wishlist');

    // 行きたいリストの順番変更イベント
    document.addEventListener('wishlistOrderChanged', handleWishlistOrderChange);

    // ルート更新ボタンのイベント設定
    const updateRouteBtn = document.getElementById('updateRouteBtn');
    if (updateRouteBtn) {
        updateRouteBtn.addEventListener('click', updateRoute);
    }

    // 検索機能の設定
    setupSearchEvents();

    // サイドバーの開閉機能を設定
    setupSidebarToggle();
    
    // サイドバーがデフォルトで開いているので、bodyのスクロールを無効化
    document.body.style.overflow = 'hidden';

    // 行きたいリストを読み込んで表示
    // 少し遅延させて、レイアウトが確定してから読み込む
    setTimeout(async () => {
        await loadWishlist();
    }, 200);
};

/**
 * サイドバーの開閉機能を設定
 */
function setupSidebarToggle() {
    const sidebar = document.getElementById('routeSidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const closeBtn = document.getElementById('sidebarClose');
    const overlay = document.getElementById('sidebarOverlay');

    if (!sidebar || !toggleBtn) return;

    // サイドバーを開く
    function openSidebar() {
        sidebar.classList.add('open');
        if (overlay) {
            overlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden'; // 背景のスクロールを無効化
        
        // 地図のリサイズをトリガー
        setTimeout(() => {
            if (mapController && mapController.map) {
                google.maps.event.trigger(mapController.map, 'resize');
            }
        }, 300);
    }

    // サイドバーを閉じる
    function closeSidebar() {
        sidebar.classList.remove('open');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = ''; // 背景のスクロールを有効化
        
        // 地図のリサイズをトリガー
        setTimeout(() => {
            if (mapController && mapController.map) {
                google.maps.event.trigger(mapController.map, 'resize');
            }
        }, 300);
    }

    // トグルボタンのイベント
    toggleBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    // 閉じるボタンのイベント
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    // オーバーレイをクリックしたら閉じる
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
}

/**
 * 行きたいリストを読み込んで表示
 */
async function loadWishlist() {
    wishlistItems = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (wishlistItems.length === 0) {
        const container = document.getElementById('wishlist');
        if (container) {
            container.innerHTML = '<div class="error">行きたいリストが空です。</div>';
        }
        return;
    }

    // ドラッグ&ドロップマネージャーにアイテムを追加
    wishlistItems.forEach((item, index) => {
        dragDropManager.addItem(item.facility, item.location);
    });

    // 写真が取得できていない場合は、再度取得を試みる
    for (const item of wishlistItems) {
        if (!item.location.photoUrl && mapController && mapController.placesService) {
            try {
                const location = await mapController.getFacilityLocation(item.facility.name, item.facility.prefecture);
                if (location.photoUrl) {
                    // 写真を更新
                    item.location.photoUrl = location.photoUrl;
                    if (location.photoUrlLarge) {
                        item.location.photoUrlLarge = location.photoUrlLarge;
                    }
                    // localStorageを更新
                    localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
                }
            } catch (error) {
                console.warn(`写真の取得に失敗しました: ${item.facility.name}`, error);
            }
        }
    }

    // 初期ルートを表示
    await updateRoute();
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
function handleSearch() {
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

        const escapedName = place.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedAddress = (place.formatted_address || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedPhotoUrl = (photoUrl || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        card.innerHTML = `
            ${photoUrl ? `<img src="${photoUrl}" alt="${escapedName}">` : ''}
            <h3>${place.name}</h3>
            <div class="prefecture">${place.formatted_address || ''}</div>
            <button class="btn btn-secondary" onclick="addToWishlistFromSearch('${escapedName}', '${escapedAddress}', ${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${escapedPhotoUrl}')">リストに追加</button>
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

    // 既に追加されているかチェック
    const exists = wishlistItems.some(item => 
        item.facility.name === name && item.facility.prefecture === facility.prefecture
    );

    if (exists) {
        alert('この施設は既にリストに追加されています');
        return;
    }

    wishlistItems.push({ facility, location });
    
    // localStorageを更新
    localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
    
    // ドラッグ&ドロップマネージャーに追加
    dragDropManager.addItem(facility, location);
    
    // 検索結果をクリア
    const searchInput = document.getElementById('placeSearch');
    if (searchInput) {
        searchInput.value = '';
    }
    const resultsDiv = document.getElementById('searchResults');
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
    }
};

/**
 * 行きたいリストの順番変更処理
 */
function handleWishlistOrderChange(event) {
    const items = event.detail.items;
    wishlistItems = items.map(item => ({
        facility: item.facility,
        location: item.location
    }));
    
    localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
}

/**
 * ルートを更新
 */
async function updateRoute() {
    if (!mapController) {
        console.error('MapControllerが初期化されていません');
        return;
    }

    if (!mapController.map) {
        console.error('地図が初期化されていません');
        return;
    }

    // 現在の行きたいリストを取得
    const items = dragDropManager.getItems();
    const waypoints = items.map(item => ({
        lat: item.location.lat,
        lng: item.location.lng
    }));

    if (waypoints.length < 2) {
        alert('ルート検索には2つ以上の施設が必要です');
        return;
    }

    // マーカーをクリア
    mapController.clearMarkers();

    // 地図のリサイズをトリガー（レイアウト変更後に必要）
    google.maps.event.trigger(mapController.map, 'resize');

    // ルートを計算
    mapController.calculateRoute(waypoints);

    // マーカーを追加（InfoWindow用にfacilityオブジェクトも渡す）
    items.forEach((item, index) => {
        const photoUrl = item.location && item.location.photoUrlLarge ? item.location.photoUrlLarge : null;
        mapController.addMarker(item.location, item.facility.name, index, photoUrl, item.facility);
    });
}

