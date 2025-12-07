/**
 * レコメンド結果ページの処理
 */

let csvParser;
let recommendationEngine;
let mapController;
let dragDropManager;
let facilities = [];

// Google Maps APIのコールバック
window.initMapForRecommendations = function() {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps APIが読み込まれていません');
        return;
    }

    // MapControllerの初期化（地図は表示しないが、Places APIを使用するため）
    mapController = new MapController();
    const dummyElement = document.createElement('div');
    mapController.initMap(CONFIG.GOOGLE_MAPS_API_KEY, dummyElement);
    
    // 検索機能の設定
    setupSearchEvents();
    
    // ドラッグ&ドロップマネージャーの初期化
    dragDropManager = new DragDropManager('wishlist');
    
    // 行きたいリストの順番変更イベント
    document.addEventListener('wishlistOrderChanged', handleWishlistOrderChange);
    
    // 移動手段選択の設定
    const travelModeSelect = document.getElementById('travelMode');
    if (travelModeSelect) {
        // 既存の選択を読み込む
        const savedTravelMode = localStorage.getItem('travelMode');
        if (savedTravelMode) {
            travelModeSelect.value = savedTravelMode;
        }
        
        // 変更時に保存
        travelModeSelect.addEventListener('change', (e) => {
            localStorage.setItem('travelMode', e.target.value);
        });
    }
    
    // ルートマップボタンのイベント設定
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.addEventListener('click', () => {
            // 移動手段を保存（念のため）
            const travelModeSelect = document.getElementById('travelMode');
            const travelMode = travelModeSelect ? travelModeSelect.value : 'DRIVING';
            localStorage.setItem('travelMode', travelMode);
            
            window.location.href = 'route.html';
        });
    }
    
    // すべて削除ボタンのイベント設定
    const clearWishlistBtn = document.getElementById('clearWishlistBtn');
    if (clearWishlistBtn) {
        clearWishlistBtn.addEventListener('click', () => {
            if (confirm('行きたいリストのすべての施設を削除しますか？')) {
                clearAllWishlist();
            }
        });
    }
    
    // 既存の行きたいリストを読み込んで表示
    loadWishlist();
    
    // 都道府県フィルターの設定
    setupPrefectureFilter();
    
    loadRecommendations();
};

/**
 * レコメンド結果を読み込んで表示
 */
async function loadRecommendations() {
    // ロード画面を表示
    showLoadingScreen();
    
    try {
        // CSVパーサーの初期化
        csvParser = new CSVParser();
        facilities = await csvParser.loadCSV('data/tif_score.csv');
        console.log(`${facilities.length}件の施設データを読み込みました`);

        // レコメンドエンジンの初期化
        recommendationEngine = new RecommendationEngine(facilities);

        // localStorageからユーザー属性を取得
        const userAttributesJson = localStorage.getItem('userAttributes');
        if (!userAttributesJson) {
            hideLoadingScreen();
            alert('ユーザー属性が見つかりません。最初からやり直してください。');
            window.location.href = 'index.html';
            return;
        }

        const userAttributes = JSON.parse(userAttributesJson);

        // レコメンド実行（スコア計算）
        const recommendations = recommendationEngine.recommend(userAttributes, 30);
        
        // ロード画面を非表示
        hideLoadingScreen();
        
        displayRecommendations(recommendations);
        
        // その他の施設を表示（レコメンドされなかった施設）
        displayOtherFacilities(recommendations);
    } catch (error) {
        console.error('レコメンド読み込みエラー:', error);
        hideLoadingScreen();
        alert('データの読み込みに失敗しました。ページを再読み込みしてください。');
    }
}

/**
 * ロード画面を表示
 */
function showLoadingScreen() {
    // 既存のロード画面があれば削除
    const existingLoader = document.getElementById('loadingOverlay');
    if (existingLoader) {
        existingLoader.remove();
    }
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner"></div>
            <p class="loading-text">計算中...</p>
            <p class="loading-subtext">おすすめ施設を計算しています</p>
        </div>
    `;
    document.body.appendChild(overlay);
}

/**
 * ロード画面を非表示
 */
function hideLoadingScreen() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * レコメンド結果を表示
 */
function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    if (!container) return;

    container.innerHTML = '';

    if (recommendations.length === 0) {
        container.innerHTML = '<div class="error">レコメンド結果がありません</div>';
        return;
    }

    // 既存の行きたいリストを読み込む
    const existingWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    // 位置情報を非同期で取得しながら表示
    recommendations.forEach(async (facility, index) => {
        const card = createFacilityCard(facility, index, existingWishlist);
        container.appendChild(card);

        // 位置情報と写真を取得
        if (mapController && mapController.placesService) {
            try {
                const location = await mapController.getFacilityLocation(facility.name, facility.prefecture);
                updateFacilityCard(card, facility, location);
            } catch (error) {
                console.error(`施設の位置情報取得エラー: ${facility.name}`, error);
            }
        }
    });
    
    // フィルターを適用（初期表示時）
    applyPrefectureFilter();
}

/**
 * 施設カードを作成
 */
function createFacilityCard(facility, index, existingWishlist) {
    const card = document.createElement('div');
    card.className = 'facility-card';
    card.dataset.facilityName = facility.name;
    card.dataset.prefecture = facility.prefecture;
    card.dataset.index = index;

    // 既にリストに追加されているかチェック
    const isInWishlist = existingWishlist.some(item => 
        item.facility.name === facility.name && item.facility.prefecture === facility.prefecture
    );

    // 施設名と都道府県をエスケープ
    const escapedName = facility.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    const escapedPrefecture = facility.prefecture.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    
    card.innerHTML = `
        <div class="loading">読み込み中...</div>
        <h3>${facility.name}</h3>
        <div class="prefecture">${facility.prefecture}</div>
        <div class="checkbox-container">
            <input type="checkbox" id="facility-${index}" ${isInWishlist ? 'checked' : ''} 
                   onchange="handleFacilityCheckbox(this, '${escapedName}', '${escapedPrefecture}')">
            <label for="facility-${index}">行きたいリストに追加</label>
        </div>
        <div class="facility-links">
            <a href="evaluation.html?facility=${encodeURIComponent(facility.name)}&prefecture=${encodeURIComponent(facility.prefecture)}&ai=true" 
               class="recommendation-link" target="_blank">✨ おすすめポイント</a>
        </div>
    `;

    if (isInWishlist) {
        card.classList.add('selected');
    }

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

    // 既存の行きたいリストを取得
    const existingWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    results.forEach(place => {
        const card = document.createElement('div');
        card.className = 'facility-card';
        
        const photoUrl = place.photos && place.photos.length > 0
            ? place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 })
            : null;

        const escapedName = place.name.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedAddress = (place.formatted_address || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const escapedPhotoUrl = (photoUrl || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

        const prefecture = (place.formatted_address || '').split(' ')[0] || '不明';
        
        // 既にリストに追加されているかチェック
        const isInWishlist = existingWishlist.some(item => 
            item.facility.name === place.name && item.facility.prefecture === prefecture
        );

        card.innerHTML = `
            ${photoUrl ? `<img src="${photoUrl}" alt="${escapedName}">` : ''}
            <h3>${place.name}</h3>
            <div class="prefecture">${place.formatted_address || ''}</div>
            <div class="checkbox-container">
                <input type="checkbox" id="search-facility-${place.place_id}" ${isInWishlist ? 'checked' : ''}
                       onchange="handleSearchFacilityCheckbox(this, '${escapedName}', '${escapedAddress}', ${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${escapedPhotoUrl}')">
                <label for="search-facility-${place.place_id}">行きたいリストに追加</label>
            </div>
        `;

        if (isInWishlist) {
            card.classList.add('selected');
        }

        resultsDiv.appendChild(card);
    });
}

/**
 * 検索結果の施設チェックボックスの処理（グローバル関数）
 */
window.handleSearchFacilityCheckbox = async function(checkbox, name, address, lat, lng, photoUrl) {
    const prefecture = address.split(' ')[0] || '不明';
    
    // 行きたいリストを取得
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    if (checkbox.checked) {
        // 既に追加されているかチェック
        const exists = wishlist.some(item => 
            item.facility.name === name && item.facility.prefecture === prefecture
        );

        if (exists) {
            checkbox.checked = true;
            return;
        }

        // 施設オブジェクトを作成
        const facility = {
            name: name,
            prefecture: prefecture,
            scores: {}
        };

        const location = {
            lat: lat,
            lng: lng,
            name: name,
            photoUrl: photoUrl,
            photoUrlLarge: photoUrl // 検索結果の写真も大きいサイズとして保存
        };

        wishlist.push({ facility, location });
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        
        // カードのスタイルを更新
        const card = checkbox.closest('.facility-card');
        if (card) {
            card.classList.add('selected');
        }
        
        // 右側の行きたいリストに追加
        if (dragDropManager) {
            dragDropManager.addItem(facility, location);
            
            // ルートマップボタンの表示を更新
            const routeBtn = document.getElementById('routeBtn');
            if (routeBtn && wishlist.length >= 2) {
                routeBtn.style.display = 'block';
            }
            
            // すべて削除ボタンの表示を更新
            const clearBtn = document.getElementById('clearWishlistBtn');
            if (clearBtn) {
                clearBtn.style.display = wishlist.length > 0 ? 'block' : 'none';
            }
        }
    } else {
        // リストから削除
        wishlist = wishlist.filter(item => 
            !(item.facility.name === name && item.facility.prefecture === prefecture)
        );
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        
        // カードのスタイルを更新
        const card = checkbox.closest('.facility-card');
        if (card) {
            card.classList.remove('selected');
        }
        
        // 右側の行きたいリストから削除
        if (dragDropManager) {
            const items = dragDropManager.getItems();
            const itemToRemove = items.find(item => 
                item.facility.name === name && item.facility.prefecture === prefecture
            );
            if (itemToRemove) {
                dragDropManager.removeItem(itemToRemove.element);
            }
            
            // ルートマップボタンの表示を更新
            const routeBtn = document.getElementById('routeBtn');
            if (routeBtn) {
                routeBtn.style.display = wishlist.length >= 2 ? 'block' : 'none';
            }
        }
    }
};

/**
 * その他の施設を都道府県別に表示
 * @param {Array} recommendations - レコメンドされた施設の配列
 */
function displayOtherFacilities(recommendations) {
    const section = document.getElementById('otherFacilitiesSection');
    const container = document.getElementById('otherFacilities');
    
    if (!section || !container) return;

    // レコメンドされた施設の名前と都道府県のセットを作成
    const recommendedSet = new Set();
    recommendations.forEach(facility => {
        recommendedSet.add(`${facility.prefecture}_${facility.name}`);
    });

    // レコメンドされなかった施設をフィルタリング
    const otherFacilities = facilities.filter(facility => {
        return !recommendedSet.has(`${facility.prefecture}_${facility.name}`);
    });

    if (otherFacilities.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    // 都道府県別にグループ化
    const facilitiesByPrefecture = {};
    otherFacilities.forEach(facility => {
        if (!facilitiesByPrefecture[facility.prefecture]) {
            facilitiesByPrefecture[facility.prefecture] = [];
        }
        facilitiesByPrefecture[facility.prefecture].push(facility);
    });

    // 都道府県名でソート
    const sortedPrefectures = Object.keys(facilitiesByPrefecture).sort();

    // 既存の行きたいリストを読み込む
    const existingWishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    // 都道府県ごとにセクションを作成
    sortedPrefectures.forEach(prefecture => {
        const prefectureSection = document.createElement('div');
        prefectureSection.className = 'prefecture-section';
        
        const prefectureHeader = document.createElement('div');
        prefectureHeader.className = 'prefecture-header';
        prefectureHeader.innerHTML = `
            <h3>${prefecture}</h3>
            <span class="facility-count">${facilitiesByPrefecture[prefecture].length}件</span>
        `;
        prefectureSection.appendChild(prefectureHeader);

        const facilitiesGrid = document.createElement('div');
        facilitiesGrid.className = 'recommendations-grid';

        // 施設カードを追加
        facilitiesByPrefecture[prefecture].forEach((facility, index) => {
            const globalIndex = facilities.indexOf(facility);
            const card = createFacilityCard(facility, globalIndex, existingWishlist);
            facilitiesGrid.appendChild(card);

            // 位置情報と写真を取得
            if (mapController && mapController.placesService) {
                (async () => {
                    try {
                        const location = await mapController.getFacilityLocation(facility.name, facility.prefecture);
                        updateFacilityCard(card, facility, location);
                    } catch (error) {
                        console.error(`施設の位置情報取得エラー: ${facility.name}`, error);
                    }
                })();
            }
        });

        prefectureSection.appendChild(facilitiesGrid);
        container.appendChild(prefectureSection);
    });
}

/**
 * 行きたいリストを読み込んで表示
 */
function loadWishlist() {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (wishlist.length === 0) {
        const container = document.getElementById('wishlist');
        if (container) {
            container.innerHTML = '';
        }
        // すべて削除ボタンを非表示
        const clearBtn = document.getElementById('clearWishlistBtn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        return;
    }

    // 空の状態のメッセージを削除
    const container = document.getElementById('wishlist');
    if (container) {
        const errorMessage = container.querySelector('.error');
        if (errorMessage) {
            errorMessage.remove();
        }
    }
    
    // ドラッグ&ドロップマネージャーにアイテムを追加
    wishlist.forEach((item, index) => {
        dragDropManager.addItem(item.facility, item.location);
    });

    // ルートマップボタンを表示（2つ以上の施設がある場合）
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn && wishlist.length >= 2) {
        routeBtn.style.display = 'block';
    }
    
    // すべて削除ボタンを表示
    const clearBtn = document.getElementById('clearWishlistBtn');
    if (clearBtn) {
        clearBtn.style.display = 'block';
    }
}

/**
 * 行きたいリストをすべて削除
 */
function clearAllWishlist() {
    // localStorageをクリア
    localStorage.removeItem('wishlist');
    
    // ドラッグ&ドロップマネージャーをリセット
    if (dragDropManager) {
        dragDropManager.clear();
    }
    
    // リスト表示を更新
    const container = document.getElementById('wishlist');
    if (container) {
        container.innerHTML = '';
    }
    
    // すべて削除ボタンを非表示
    const clearBtn = document.getElementById('clearWishlistBtn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    // ルートマップボタンを非表示
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.style.display = 'none';
    }
    
    // 左側のチェックボックスをすべて外す
    const checkboxes = document.querySelectorAll('.facility-card input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        const card = checkbox.closest('.facility-card');
        if (card) {
            card.classList.remove('selected');
        }
    });
}

/**
 * 行きたいリストの順番変更処理
 */
function handleWishlistOrderChange(event) {
    const items = event.detail.items;
    
    // localStorageを更新
    const wishlist = items.map(item => ({
        facility: item.facility,
        location: item.location
    }));
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));

    // ルートマップボタンの表示を更新
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.style.display = wishlist.length >= 2 ? 'block' : 'none';
    }
    
    // すべて削除ボタンの表示を更新
    const clearBtn = document.getElementById('clearWishlistBtn');
    if (clearBtn) {
        clearBtn.style.display = wishlist.length > 0 ? 'block' : 'none';
    }
}

/**
 * 都道府県フィルターの設定
 */
function setupPrefectureFilter() {
    // 保存されたフィルター状態を読み込む
    const savedFilters = JSON.parse(localStorage.getItem('prefectureFilters') || '["石川県", "富山県", "福井県"]');
    
    // チェックボックスに状態を反映
    const checkboxes = document.querySelectorAll('.prefecture-filter input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = savedFilters.includes(checkbox.value);
        
        // 変更イベントを設定
        checkbox.addEventListener('change', () => {
            applyPrefectureFilter();
            savePrefectureFilterState();
        });
    });
}

/**
 * 都道府県フィルターを適用
 */
function applyPrefectureFilter() {
    const container = document.getElementById('recommendations');
    if (!container) return;
    
    // 選択された都道府県を取得
    const selectedPrefectures = Array.from(
        document.querySelectorAll('.prefecture-filter input[type="checkbox"]:checked')
    ).map(checkbox => checkbox.value);
    
    // すべての施設カードを取得
    const cards = container.querySelectorAll('.facility-card');
    
    if (selectedPrefectures.length === 0) {
        // すべて非表示
        cards.forEach(card => {
            card.style.display = 'none';
        });
        
        // メッセージを表示
        if (cards.length > 0) {
            const message = document.createElement('div');
            message.className = 'error';
            message.textContent = '都道府県を選択してください';
            message.id = 'filter-message';
            
            // 既存のメッセージを削除
            const existingMessage = container.querySelector('#filter-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            container.insertBefore(message, container.firstChild);
        }
    } else {
        // フィルターメッセージを削除
        const existingMessage = container.querySelector('#filter-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        let visibleCount = 0;
        
        // カードをフィルタリング
        cards.forEach(card => {
            const prefecture = card.dataset.prefecture;
            if (selectedPrefectures.includes(prefecture)) {
                card.style.display = 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });
        
        // 該当施設がない場合のメッセージ
        if (visibleCount === 0 && cards.length > 0) {
            const message = document.createElement('div');
            message.className = 'error';
            message.textContent = '選択した都道府県の施設が見つかりませんでした';
            message.id = 'filter-message';
            
            const existingMessage = container.querySelector('#filter-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            container.insertBefore(message, container.firstChild);
        }
    }
}

/**
 * 都道府県フィルターの状態を保存
 */
function savePrefectureFilterState() {
    const selectedPrefectures = Array.from(
        document.querySelectorAll('.prefecture-filter input[type="checkbox"]:checked')
    ).map(checkbox => checkbox.value);
    
    localStorage.setItem('prefectureFilters', JSON.stringify(selectedPrefectures));
}

/**
 * 施設チェックボックスの処理（グローバル関数）
 */
window.handleFacilityCheckbox = async function(checkbox, facilityName, prefecture) {
    const facility = facilities.find(f => f.name === facilityName && f.prefecture === prefecture);
    if (!facility) return;

    // 行きたいリストを取得
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');

    if (checkbox.checked) {
        // 既に追加されているかチェック
        const exists = wishlist.some(item => 
            item.facility.name === facilityName && item.facility.prefecture === prefecture
        );

        if (exists) {
            checkbox.checked = true;
            return;
        }

        // 位置情報を取得してから追加
        try {
            const location = await mapController.getFacilityLocation(facilityName, prefecture);
            wishlist.push({ facility, location });
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
            
            // カードのスタイルを更新
            const card = checkbox.closest('.facility-card');
            if (card) {
                card.classList.add('selected');
            }
            
            // 右側の行きたいリストに追加
            if (dragDropManager) {
                dragDropManager.addItem(facility, location);
                
                // ルートマップボタンの表示を更新
                const routeBtn = document.getElementById('routeBtn');
                if (routeBtn && wishlist.length >= 2) {
                    routeBtn.style.display = 'block';
                }
                
                // すべて削除ボタンの表示を更新
                const clearBtn = document.getElementById('clearWishlistBtn');
                if (clearBtn) {
                    clearBtn.style.display = wishlist.length > 0 ? 'block' : 'none';
                }
            }
        } catch (error) {
            console.error('位置情報取得エラー:', error);
            alert('施設の位置情報を取得できませんでした');
            checkbox.checked = false;
        }
    } else {
        // リストから削除
        wishlist = wishlist.filter(item => 
            !(item.facility.name === facilityName && item.facility.prefecture === prefecture)
        );
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        
        // カードのスタイルを更新
        const card = checkbox.closest('.facility-card');
        if (card) {
            card.classList.remove('selected');
        }
        
        // 右側の行きたいリストから削除
        if (dragDropManager) {
            const items = dragDropManager.getItems();
            const itemToRemove = items.find(item => 
                item.facility.name === facilityName && item.facility.prefecture === prefecture
            );
            if (itemToRemove) {
                dragDropManager.removeItem(itemToRemove.element);
            }
            
            // ルートマップボタンの表示を更新
            const routeBtn = document.getElementById('routeBtn');
            if (routeBtn) {
                routeBtn.style.display = wishlist.length >= 2 ? 'block' : 'none';
            }
        }
    }
};

