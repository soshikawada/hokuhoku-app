/**
 * しおりページの処理
 */

let itineraryGenerator;
let itineraryData;

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOMContentLoadedイベントが発火しました');
    itineraryGenerator = new ItineraryGenerator();
    await loadItinerary();
    // 少し遅延させてイベントリスナーを設定（ライブラリの読み込みを待つ）
    setTimeout(() => {
        setupEventListeners();
    }, 100);
});

// window.onloadでも実行（ライブラリが読み込まれた後）
window.addEventListener('load', () => {
    console.log('window.loadイベントが発火しました');
    // イベントリスナーが設定されていない場合に備えて再設定
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn && !exportPdfBtn.hasAttribute('data-listener-attached')) {
        console.log('window.loadでPDFボタンのイベントリスナーを設定');
        exportPdfBtn.setAttribute('data-listener-attached', 'true');
        exportPdfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('PDFダウンロードボタンがクリックされました（window.load）');
            try {
                await exportToPdf();
            } catch (error) {
                console.error('PDF生成エラー:', error);
                alert('PDFの生成に失敗しました: ' + error.message);
            }
        });
    }
});

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
                    : '<div class="map-error">地図情報がありません</div>'
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
        if (!lat || !lng) {
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
                if (f.location && f.location.lat && f.location.lng) {
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

    // PDF出力ボタン
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    console.log('exportPdfBtn:', exportPdfBtn);
    if (exportPdfBtn) {
        console.log('PDFダウンロードボタンが見つかりました');
        // 既にイベントリスナーが設定されている場合はスキップ
        if (!exportPdfBtn.hasAttribute('data-listener-attached')) {
            exportPdfBtn.setAttribute('data-listener-attached', 'true');
            exportPdfBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('PDFダウンロードボタンがクリックされました');
                
                // ライブラリの確認
                console.log('window.jspdf:', typeof window.jspdf);
                console.log('html2canvas:', typeof html2canvas);
                
                try {
                    await exportToPdf();
                } catch (error) {
                    console.error('PDF生成エラー:', error);
                    alert('PDFの生成に失敗しました: ' + error.message);
                }
            });
        } else {
            console.log('PDFボタンには既にイベントリスナーが設定されています');
        }
    } else {
        console.error('PDFダウンロードボタンが見つかりません！');
        // 少し遅延させて再試行
        setTimeout(() => {
            const retryBtn = document.getElementById('exportPdfBtn');
            if (retryBtn) {
                console.log('リトライ: PDFダウンロードボタンが見つかりました');
                if (!retryBtn.hasAttribute('data-listener-attached')) {
                    retryBtn.setAttribute('data-listener-attached', 'true');
                    retryBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('PDFダウンロードボタンがクリックされました（リトライ）');
                        try {
                            await exportToPdf();
                        } catch (error) {
                            console.error('PDF生成エラー:', error);
                            alert('PDFの生成に失敗しました: ' + error.message);
                        }
                    });
                }
            } else {
                console.error('リトライ失敗: PDFダウンロードボタンが見つかりません');
            }
        }, 500);
    }
}

/**
 * PDFをエクスポート
 */
async function exportToPdf() {
    console.log('exportToPdf関数が呼ばれました');
    
    // ライブラリの確認
    if (typeof window.jspdf === 'undefined') {
        const errorMsg = 'jsPDFライブラリが読み込まれていません。ページを再読み込みしてください。';
        console.error(errorMsg);
        alert(errorMsg);
        return;
    }
    
    if (typeof html2canvas === 'undefined') {
        const errorMsg = 'html2canvasライブラリが読み込まれていません。ページを再読み込みしてください。';
        console.error(errorMsg);
        alert(errorMsg);
        return;
    }

    console.log('PDF生成を開始します');
    console.log('window.jspdf:', window.jspdf);
    const { jsPDF } = window.jspdf;
    console.log('jsPDF:', jsPDF);
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pages = document.querySelectorAll('.itinerary-page');
    console.log(`ページ数: ${pages.length}`);
    
    if (pages.length === 0) {
        alert('しおりページが見つかりません。');
        return;
    }
    
    // ローディング表示
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        z-index: 10000;
    `;
    loadingDiv.innerHTML = `
        <div>PDFを生成しています...</div>
        <div style="font-size: 1rem; margin-top: 10px;">0/${pages.length}ページ</div>
    `;
    document.body.appendChild(loadingDiv);

    try {
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            
            // ローディング表示を更新
            loadingDiv.innerHTML = `
                <div>PDFを生成しています...</div>
                <div style="font-size: 1rem; margin-top: 10px;">${i + 1}/${pages.length}ページ</div>
            `;
            
            // 画像をCanvasに描画してBase64に変換（CORSエラーを回避）
            const images = page.querySelectorAll('img');
            const imagePromises = Array.from(images).map(async (img) => {
                // 既にBase64データの場合はスキップ
                if (img.src.startsWith('data:')) {
                    return;
                }
                
                try {
                    // 画像の読み込みを待つ
                    await new Promise((resolve, reject) => {
                        if (img.complete && img.naturalHeight !== 0) {
                            resolve();
                            return;
                        }
                        
                        const timeout = setTimeout(() => {
                            console.warn('画像の読み込みタイムアウト:', img.src);
                            reject(new Error('タイムアウト'));
                        }, 10000);
                        
                        img.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        img.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('画像の読み込みエラー'));
                        };
                    });
                    
                    // Canvasに画像を描画してBase64に変換
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.naturalWidth;
                    tempCanvas.height = img.naturalHeight;
                    const ctx = tempCanvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    // Base64データに変換
                    const base64Data = tempCanvas.toDataURL('image/jpeg', 0.9);
                    img.src = base64Data;
                    
                    console.log('画像をBase64に変換しました');
                } catch (error) {
                    console.warn('画像のBase64変換に失敗:', img.src, error);
                    // エラーが発生した場合は、画像を非表示にする
                    img.style.display = 'none';
                }
            });
            
            await Promise.all(imagePromises);
            console.log('すべての画像のBase64変換が完了しました');
            
            // 少し待機してからキャプチャ（レンダリングを確実に）
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // html2canvasでページをキャプチャ
            // Google Maps APIの写真URLはCORSを許可していないため、allowTaintをtrueに設定
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: false, // Google Maps APIの写真URLはCORSを許可していない
                logging: false, // ログを無効化
                backgroundColor: '#faf8f3',
                allowTaint: true, // CORSエラーを回避するためtrueに設定
                imageTimeout: 15000,
                removeContainer: false,
                foreignObjectRendering: false, // 互換性のためfalseに設定
                onclone: (clonedDoc) => {
                    // クローンされたドキュメント内の画像も確認
                    const clonedImages = clonedDoc.querySelectorAll('img');
                    clonedImages.forEach(img => {
                        // CORSエラーを回避するため、crossorigin属性を削除
                        img.removeAttribute('crossorigin');
                        console.log('クローン内の画像:', img.src, 'complete:', img.complete, 'naturalHeight:', img.naturalHeight);
                        if (!img.complete || img.naturalHeight === 0) {
                            console.warn('クローン内で画像が読み込まれていません:', img.src);
                        }
                    });
                }
            });

            // 画像をBase64に変換済みなので、通常通りPNG形式でエクスポート
            let imgData;
            try {
                imgData = canvas.toDataURL('image/png');
            } catch (e) {
                console.warn('PNG形式でのエクスポートに失敗、JPEG形式を試行:', e);
                try {
                    imgData = canvas.toDataURL('image/jpeg', 0.95);
                } catch (e2) {
                    console.error('画像のエクスポートに失敗:', e2);
                    // エラーが発生した場合は、JPEG形式で再試行
                    try {
                        imgData = canvas.toDataURL('image/jpeg', 0.9);
                    } catch (e3) {
                        console.error('すべての形式でのエクスポートに失敗:', e3);
                        throw new Error('PDF生成に失敗しました。ページを再読み込みして再試行してください。');
                    }
                }
            }
            const imgWidth = 210; // A4幅（mm）
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // 最初のページ以外は新しいページを追加
            if (i > 0) {
                pdf.addPage();
            }

            // 画像をPDFに追加
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }

        // PDFをダウンロード
        const fileName = `ほくほくルート_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        loadingDiv.innerHTML = `
            <div>PDFの生成が完了しました！</div>
            <div style="font-size: 1rem; margin-top: 10px;">${fileName}</div>
        `;
        setTimeout(() => {
            document.body.removeChild(loadingDiv);
        }, 2000);
    } catch (error) {
        console.error('PDF生成エラー:', error);
        loadingDiv.innerHTML = `
            <div>PDFの生成に失敗しました</div>
            <div style="font-size: 1rem; margin-top: 10px; color: #ffcccc;">${error.message}</div>
        `;
        setTimeout(() => {
            document.body.removeChild(loadingDiv);
        }, 3000);
    }
}

