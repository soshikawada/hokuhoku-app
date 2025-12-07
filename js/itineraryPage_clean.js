/**
 * しおりページの処理
 */

let itineraryGenerator;
let itineraryData;
let shareManager;

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoadedイベントが発火しました');
    itineraryGenerator = new ItineraryGenerator();
    shareManager = new ShareManager();
    
    // URLパラメータから共有IDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    
    if (shareId) {
        // 共有リンクから読み込む
        await loadItineraryFromShare(shareId);
    } else {
        // 通常の読み込み
        await loadItinerary();
    }
    
    // 少し遅延させてイベントリスナーを設定（ライブラリの読み込みを待つ）
    setTimeout(() => {
        setupEventListeners();
    }, 100);
});

/**
 * 共有リンクからしおりを読み込む
 */
async function loadItineraryFromShare(shareId) {
    const sharedData = shareManager.loadItineraryFromShare(shareId);
    
    if (!sharedData) {
        alert('共有リンクが無効または期限切れです。');
        window.location.href = 'route.html';
        return;
    }
    
    itineraryData = sharedData;
    updateTripInfo();
    renderPages();
}

/**
 * しおりを読み込んで表示
 */
async function loadItinerary() {
    // 行きたいリストを取得
    let wishlistItems = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (wishlistItems.length === 0) {
        alert('行きたいリストが空です。ルート画面で施設を追加してください。');
        window.location.href = 'route.html';
        return;
    }

    // 写真URLの確認とデバッグ
    console.log('wishlistItems:', wishlistItems);
    wishlistItems.forEach((item, index) => {
        console.log(`施設${index}: ${item.facility.name}, photoUrl: ${item.location?.photoUrl}, photoUrlLarge: ${item.location?.photoUrlLarge}`);
    });

    // 写真が取得できていない場合は、Google Maps APIで取得を試みる
    // ただし、itinerary.htmlではGoogle Maps APIが読み込まれていない可能性があるため、
    // まずはlocalStorageに保存されている写真URLを使用し、なければ後で取得を試みる
    
    // ルート情報を確認
    const routeInfo = JSON.parse(localStorage.getItem('routeInfo') || 'null');
    console.log('ルート情報:', routeInfo);
    if (!routeInfo) {
        console.warn('ルート情報がありません。ルート画面で「ルートを更新」ボタンをクリックしてください。');
    }
    
    // しおりデータを生成
    itineraryData = itineraryGenerator.generateItineraryData(wishlistItems);
    
    // 生成されたデータの写真URLを確認
    console.log('itineraryData:', itineraryData);
    itineraryData.facilities.forEach((facility, index) => {
        console.log(`施設${index}: ${facility.name}, photoUrl: ${facility.photoUrl}, location:`, facility.location);
    });
    
    // ルート情報が正しく設定されているか確認
    if (itineraryData.routeInfo) {
        console.log('ルート情報が設定されています:', itineraryData.routeInfo);
        if (itineraryData.routeInfo.legs) {
            console.log(`legs数: ${itineraryData.routeInfo.legs.length}`);
        }
    } else {
        console.warn('ルート情報が設定されていません');
    }

    // 旅行情報を設定
    updateTripInfo();

    // ページを表示
    renderPages();
    
    // 写真がない場合は、後で取得を試みる（Google Maps APIが利用可能な場合）
    // Google Maps APIの読み込みを待つ
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        await loadMissingPhotos();
    } else {
        // Google Maps APIがまだ読み込まれていない場合、読み込みを待つ
        let checkCount = 0;
        const maxChecks = 20; // 最大10秒待つ（500ms × 20回）
        const checkGoogleMaps = setInterval(() => {
            checkCount++;
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                clearInterval(checkGoogleMaps);
                console.log('Google Maps APIが読み込まれました。写真を取得します。');
                loadMissingPhotos();
            } else if (checkCount >= maxChecks) {
                clearInterval(checkGoogleMaps);
                console.warn('Google Maps APIの読み込みがタイムアウトしました');
            }
        }, 500);
    }
}

/**
 * 写真が欠けている施設の写真を取得
 */
async function loadMissingPhotos() {
    if (!itineraryData || !itineraryData.facilities) return;
    
    // Google Maps APIが利用可能か確認
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.log('Google Maps APIが利用できません');
        return;
    }

    // 一時的な地図要素を作成（Places Service用）
    const tempMapDiv = document.createElement('div');
    tempMapDiv.style.display = 'none';
    document.body.appendChild(tempMapDiv);
    
    const tempMap = new google.maps.Map(tempMapDiv, {
        center: { lat: 36.2048, lng: 138.2529 },
        zoom: 6
    });
    
    const placesService = new google.maps.places.PlacesService(tempMap);
    
    // 写真がない施設の写真を取得
    for (let i = 0; i < itineraryData.facilities.length; i++) {
        const facility = itineraryData.facilities[i];
        
        if (!facility.photoUrl) {
            try {
                console.log(`写真を取得中: ${facility.name}`);
                const query = `${facility.name} ${facility.prefecture}`;
                
                const request = {
                    query: query,
                    fields: ['photos', 'name']
                };

                await new Promise((resolve) => {
                    placesService.findPlaceFromQuery(request, (results, status) => {
                        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                            const place = results[0];
                            if (place.photos && place.photos.length > 0) {
                                const photoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                                facility.photoUrl = photoUrl;
                                console.log(`写真を取得しました: ${facility.name}, URL: ${photoUrl}`);
                                
                                // localStorageのwishlistも更新
                                const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
                                const wishlistItem = wishlist.find(item => 
                                    item.facility.name === facility.name && 
                                    item.facility.prefecture === facility.prefecture
                                );
                                if (wishlistItem && wishlistItem.location) {
                                    wishlistItem.location.photoUrl = photoUrl;
                                    wishlistItem.location.photoUrlLarge = photoUrl;
                                    localStorage.setItem('wishlist', JSON.stringify(wishlist));
                                }
                            } else {
                                console.warn(`写真が見つかりません: ${facility.name}`);
                            }
                        } else {
                            console.warn(`写真の取得に失敗: ${facility.name}, status: ${status}`);
                        }
                        resolve();
                    });
                });
                
                // API呼び出しの間隔を空ける
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`写真取得エラー: ${facility.name}`, error);
            }
        }
    }
    
    // 一時的な地図要素を削除
    if (document.body.contains(tempMapDiv)) {
        document.body.removeChild(tempMapDiv);
    }
    
    // 写真が更新された場合はページを再レンダリング
    const hasUpdates = itineraryData.facilities.some(f => f.photoUrl);
    if (hasUpdates) {
        console.log('写真が更新されたため、ページを再レンダリングします');
        renderPages();
    }
}

/**
 * 旅行情報を更新
 */
function updateTripInfo() {
    // 都道府県情報から旅行先を設定
    if (itineraryData.facilities.length > 0) {
        const prefectures = [...new Set(itineraryData.facilities.map(f => f.prefecture))];
        const locationText = prefectures.length <= 2 
            ? prefectures.join('・') + 'の旅'
            : prefectures[0] + '周辺の旅';
        document.getElementById('tripLocation').textContent = locationText;
    }
}

/**
 * ページをレンダリング
 */
function renderPages() {
    const pagesContainer = document.getElementById('itineraryPages');
    pagesContainer.innerHTML = '';

    // 施設ページをレンダリング
    itineraryData.pages.forEach((pageFacilities, pageIndex) => {
        const pageElement = document.createElement('div');
        pageElement.className = 'itinerary-page';
        pageElement.id = `page-${pageIndex + 1}`;

        // ページタイトルを追加
        let pageHTML = '<div class="page-title">MY TRIP ITINERARY</div>';

        pageFacilities.forEach((facility, facilityIndex) => {
            const isLastInPage = facilityIndex === pageFacilities.length - 1;
            const isLastInAllPages = pageIndex === itineraryData.pages.length - 1 && facilityIndex === pageFacilities.length - 1;
            
            // 移動時間を施設の間に表示（最初の施設以外）
            const travelTimeHTML = facility.travelTime && facilityIndex > 0
                ? `
                    <div class="travel-time-between">
                        <span class="travel-time-label">移動時間：</span>
                        <span class="travel-time-text">${facility.travelTime.text}</span>
                    </div>
                `
                : '';

            pageHTML += `
                ${travelTimeHTML}
                <div class="facility-item" ${isLastInPage ? 'style="margin-bottom: 0;"' : ''}>
                    <div class="facility-content">
                        <!-- 画像は非表示 -->
                        <div class="facility-info-wrapper">
                            <div class="facility-info">
                                <div class="facility-header">
                                    <span class="facility-number">[${facility.label}]</span>
                                    <h2 class="facility-name">${facility.name}</h2>
                                </div>
                                <div class="facility-prefecture">${facility.prefecture}</div>
                                
                                <div class="time-input-section">
                                    <div class="time-input-row">
                                        <span class="time-placeholder">　　</span>
                                        <span class="time-label-inline">：</span>
                                        <span class="time-placeholder">　　</span>
                                        <span class="time-tilde">～</span>
                                        <span class="time-placeholder">　　</span>
                                        <span class="time-label-inline">：</span>
                                        <span class="time-placeholder">　　</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        // ページ番号
        pageHTML += `
            <div class="page-number">
                PAGE ${pageIndex + 1}/${itineraryData.totalPages + 1} | Created by ほくほくルート
            </div>
        `;

        pageElement.innerHTML = pageHTML;
        pagesContainer.appendChild(pageElement);
    });

    // 地図ページを追加
    renderMapPage();
}

/**
 * 地図ページをレンダリング
 */
function renderMapPage() {
    const pagesContainer = document.getElementById('itineraryPages');
    const mapPageElement = document.createElement('div');
    mapPageElement.className = 'itinerary-page map-page';
    mapPageElement.id = `page-map`;

    // Google Maps Static APIで地図URLを生成
    const mapImageUrl = generateMapImageUrl();

    const mapPageHTML = `
        <div class="map-page-content">
            <h2 class="map-page-title">ルートマップ</h2>
            <div class="map-image-container">
                ${mapImageUrl 
                    ? `<img src="${mapImageUrl}" alt="ルートマップ" class="map-image" onerror="console.error('地図画像の読み込みエラー:', this.src); this.parentElement.innerHTML='<div class=\\'map-error\\'>地図の読み込みに失敗しました<br>ルート画面で「ルートを更新」ボタンをクリックしてから再度お試しください</div>'">`
                    : '<div class="map-error">地図情報がありません<br>ルート画面で「ルートを更新」ボタンをクリックしてから再度お試しください</div>'
                }
            </div>
            <div class="map-legend-section">
                <h3>凡例</h3>
                <div class="legend-items">
                    ${itineraryData.facilities.map(facility => `
                        <div class="legend-item">
                            <span class="legend-marker">${facility.label}</span>
                            <span class="legend-name">${facility.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="page-number">
            PAGE ${itineraryData.totalPages + 1}/${itineraryData.totalPages + 1} | Created by ほくほくルート
        </div>
    `;

    mapPageElement.innerHTML = mapPageHTML;
    pagesContainer.appendChild(mapPageElement);
}

/**
 * Google Maps Static APIのURLを生成
 */
function generateMapImageUrl() {
    if (!itineraryData.facilities || itineraryData.facilities.length === 0) {
        console.warn('施設データがありません');
        return null;
    }

    // APIキーを取得
    const apiKey = typeof CONFIG !== 'undefined' && CONFIG.GOOGLE_MAPS_API_KEY 
        ? CONFIG.GOOGLE_MAPS_API_KEY 
        : null;

    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        console.warn('Google Maps APIキーが設定されていません');
        return null;
    }

    // マーカー用のパラメータを生成
    const markers = itineraryData.facilities.map((facility, index) => {
        const label = facility.label;
        const lat = facility.location.lat;
        const lng = facility.location.lng;
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            console.warn(`施設 ${facility.name} の座標が無効です: lat=${lat}, lng=${lng}`);
            return null;
        }
        return `markers=color:red|label:${label}|${lat},${lng}`;
    }).filter(m => m !== null).join('&');

    if (!markers) {
        console.warn('有効なマーカーがありません');
        return null;
    }

    // パス用のパラメータを生成（ルート情報がある場合）
    let pathParam = '';
    if (itineraryData.routeInfo && itineraryData.routeInfo.legs && itineraryData.routeInfo.legs.length > 0) {
        // legsから座標を取得（localStorageから復元されたデータを使用）
        const legs = itineraryData.routeInfo.legs;
        const pathPoints = [];
        
        // 最初の地点
        if (legs[0].startLocation && legs[0].startLocation.lat && legs[0].startLocation.lng) {
            pathPoints.push(`${legs[0].startLocation.lat},${legs[0].startLocation.lng}`);
        }
        
        // 各legの終点を追加
        legs.forEach(leg => {
            if (leg.endLocation && leg.endLocation.lat && leg.endLocation.lng) {
                pathPoints.push(`${leg.endLocation.lat},${leg.endLocation.lng}`);
            }
        });

        if (pathPoints.length > 0) {
            pathParam = `&path=color:0x0000ff|weight:5|${pathPoints.join('|')}`;
        }
    }
    
    // ルート情報がない場合は、施設間を直線で結ぶ
    if (!pathParam) {
        const pathPoints = itineraryData.facilities
            .map(f => {
                if (f.location && f.location.lat && f.location.lng && !isNaN(f.location.lat) && !isNaN(f.location.lng)) {
                    return `${f.location.lat},${f.location.lng}`;
                }
                return null;
            })
            .filter(p => p !== null);
        
        if (pathPoints.length > 0) {
            pathParam = `&path=color:0x0000ff|weight:5|${pathPoints.join('|')}`;
        }
    }

    // 地図のサイズとズームレベルを設定（A4ページに大きく表示）
    const size = '1200x900'; // 大きく表示
    const zoom = itineraryData.facilities.length === 1 ? 15 : 'auto';

    // URLを構築
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    let url = `${baseUrl}?size=${size}&${markers}`;
    
    if (pathParam) {
        url += pathParam;
    }
    
    if (zoom !== 'auto') {
        url += `&zoom=${zoom}`;
    }
    
    url += `&key=${apiKey}`;

    console.log('生成された地図URL:', url.substring(0, 100) + '...');
    return url;
}

/**
 * イベントリスナーを設定
 */
function setupEventListeners() {
    console.log('イベントリスナーを設定中...');
    
    // 印刷ボタン
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        console.log('印刷ボタンが見つかりました');
        printBtn.addEventListener('click', () => {
            window.print();
        });
    } else {
        console.warn('印刷ボタンが見つかりません');
    }

    // 共有ボタン
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        console.log('共有ボタンが見つかりました');
        shareBtn.addEventListener('click', shareItinerary);
    } else {
        console.warn('共有ボタンが見つかりません');
    }
    
    // リンクコピーボタン
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyShareLink);
    }
    
    // モーダルを閉じる
    const closeShareModalBtn = document.getElementById('closeShareModalBtn');
    if (closeShareModalBtn) {
        closeShareModalBtn.addEventListener('click', () => {
            document.getElementById('shareModal').style.display = 'none';
        });
    }
    
    // モーダルの背景をクリックしても閉じる
    const shareModal = document.getElementById('shareModal');
    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.style.display = 'none';
            }
        });
    }
}

/**
 * しおりを共有
 */
function shareItinerary() {
    if (!itineraryData) {
        alert('しおりデータがありません。');
        return;
    }
    
    // 共有IDを生成して保存
    const shareId = shareManager.saveItineraryForShare(itineraryData);
    const shareUrl = shareManager.generateShareUrl(shareId);
    
    // モーダルを表示
    const modal = document.getElementById('shareModal');
    const linkInput = document.getElementById('shareLinkInput');
    const qrcodeContainer = document.getElementById('qrcode');
    
    if (!modal || !linkInput || !qrcodeContainer) {
        alert('共有モーダルの要素が見つかりません。');
        return;
    }
    
    linkInput.value = shareUrl;
    modal.style.display = 'flex';
    
    // QRコードを生成
    qrcodeContainer.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        new QRCode(qrcodeContainer, {
            text: shareUrl,
            width: 256,
            height: 256
        });
    } else {
        qrcodeContainer.innerHTML = '<p>QRコードライブラリが読み込まれていません</p>';
    }
}

/**
 * リンクをコピー
 */
function copyShareLink() {
    const linkInput = document.getElementById('shareLinkInput');
    if (!linkInput) {
        return;
    }
    
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // モバイル対応
    
    try {
        document.execCommand('copy');
        alert('リンクをコピーしました！');
    } catch (err) {
        // 新しいAPIを試す
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(linkInput.value).then(() => {
                alert('リンクをコピーしました！');
            }).catch(() => {
                alert('リンクのコピーに失敗しました。手動でコピーしてください。');
            });
        } else {
            alert('リンクのコピーに失敗しました。手動でコピーしてください。');
        }
    }
}

