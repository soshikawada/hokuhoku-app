/**
 * Google Maps制御モジュール
 */

class MapController {
    constructor() {
        this.map = null;
        this.markers = [];
        this.directionsService = null;
        this.directionsRenderer = null;
        this.placesService = null;
        this.facilityLocations = new Map(); // 施設名 -> 位置情報のキャッシュ
        this.infoWindow = null; // InfoWindow
    }

    /**
     * 地図を初期化
     * @param {string} apiKey - Google Maps APIキー
     * @param {HTMLElement} mapElement - 地図を表示する要素
     */
    initMap(apiKey, mapElement) {
        if (!mapElement) {
            console.error('地図要素が見つかりません');
            return;
        }

        // 地図の初期化
        this.map = new google.maps.Map(mapElement, {
            center: { lat: 36.2048, lng: 138.2529 }, // 日本の中心付近
            zoom: 6
        });

        // Directions APIの初期化
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            suppressMarkers: true // カスタムマーカーのみを表示するため、デフォルトマーカーを抑制
        });
        
        // InfoWindowの管理
        this.infoWindow = new google.maps.InfoWindow();

        // Places Serviceの初期化
        this.placesService = new google.maps.places.PlacesService(this.map);
    }

    /**
     * 施設の位置情報を取得（Places API使用）
     * @param {string} facilityName - 施設名
     * @param {string} prefecture - 都道府県
     * @returns {Promise<Object>} 位置情報と写真URLを含むオブジェクト
     */
    async getFacilityLocation(facilityName, prefecture) {
        const cacheKey = `${prefecture}_${facilityName}`;
        
        // キャッシュをチェック
        if (this.facilityLocations.has(cacheKey)) {
            return this.facilityLocations.get(cacheKey);
        }

        return new Promise((resolve, reject) => {
            const query = `${facilityName} ${prefecture}`;
            
            const request = {
                query: query,
                fields: ['geometry', 'photos', 'name', 'place_id', 'formatted_address']
            };

            this.placesService.findPlaceFromQuery(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                    const place = results[0];
                    const location = {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        name: place.name,
                        placeId: place.place_id,
                        photoUrl: null,
                        address: null
                    };

                    // 写真を取得（マーカーアイコン用に小さめのサイズ）
                    if (place.photos && place.photos.length > 0) {
                        // マーカーアイコン用の写真URL（小さめのサイズ）
                        location.photoUrl = place.photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
                        // カード表示用の写真URLも保存（大きめのサイズ）
                        location.photoUrlLarge = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                    }
                    
                    // 住所情報を保存
                    if (place.formatted_address) {
                        location.address = place.formatted_address;
                    } else {
                        // 住所が取得できない場合は、施設名と都道府県を組み合わせる
                        location.address = `${facilityName} ${prefecture}`;
                    }

                    // キャッシュに保存
                    this.facilityLocations.set(cacheKey, location);
                    resolve(location);
                } else {
                    console.warn(`施設の位置情報が見つかりませんでした: ${query}`, status);
                    // 位置情報が見つからない場合でも、都道府県の中心座標を使用
                    const fallbackLocation = this.getPrefectureCenter(prefecture);
                    const location = {
                        ...fallbackLocation,
                        name: facilityName,
                        photoUrl: null,
                        address: `${facilityName} ${prefecture}`
                    };
                    this.facilityLocations.set(cacheKey, location);
                    resolve(location);
                }
            });
        });
    }

    /**
     * 都道府県の中心座標を取得（フォールバック用）
     * @param {string} prefecture - 都道府県名
     * @returns {Object} 緯度・経度
     */
    getPrefectureCenter(prefecture) {
        // 主要な都道府県の中心座標（簡易版）
        const prefectureCenters = {
            '北海道': { lat: 43.0642, lng: 141.3469 },
            '青森県': { lat: 40.8244, lng: 140.7406 },
            '岩手県': { lat: 39.7036, lng: 141.1527 },
            '宮城県': { lat: 38.2688, lng: 140.8721 },
            '秋田県': { lat: 39.7186, lng: 140.1024 },
            '山形県': { lat: 38.2404, lng: 140.3633 },
            '福島県': { lat: 37.7503, lng: 140.4676 },
            '茨城県': { lat: 36.3414, lng: 140.4467 },
            '栃木県': { lat: 36.5658, lng: 139.8836 },
            '群馬県': { lat: 36.3911, lng: 139.0608 },
            '埼玉県': { lat: 35.8617, lng: 139.6455 },
            '千葉県': { lat: 35.6074, lng: 140.1065 },
            '東京都': { lat: 35.6762, lng: 139.6503 },
            '神奈川県': { lat: 35.4475, lng: 139.6425 },
            '新潟県': { lat: 37.9022, lng: 139.0236 },
            '富山県': { lat: 36.6953, lng: 137.2113 },
            '石川県': { lat: 36.5947, lng: 136.6256 },
            '福井県': { lat: 36.0652, lng: 136.2216 },
            '山梨県': { lat: 35.6636, lng: 138.5684 },
            '長野県': { lat: 36.6513, lng: 138.1810 },
            '岐阜県': { lat: 35.3912, lng: 136.7223 },
            '静岡県': { lat: 34.9769, lng: 138.3830 },
            '愛知県': { lat: 35.1802, lng: 136.9066 },
            '三重県': { lat: 34.7303, lng: 136.5086 },
            '滋賀県': { lat: 35.0045, lng: 135.8686 },
            '京都府': { lat: 35.0212, lng: 135.7556 },
            '大阪府': { lat: 34.6937, lng: 135.5023 },
            '兵庫県': { lat: 34.6913, lng: 135.1830 },
            '奈良県': { lat: 34.6853, lng: 135.8327 },
            '和歌山県': { lat: 34.2261, lng: 135.1675 },
            '鳥取県': { lat: 35.5036, lng: 134.2383 },
            '島根県': { lat: 35.4722, lng: 133.0505 },
            '岡山県': { lat: 34.6617, lng: 133.9350 },
            '広島県': { lat: 34.3966, lng: 132.4596 },
            '山口県': { lat: 34.1858, lng: 131.4705 },
            '徳島県': { lat: 34.0657, lng: 134.5593 },
            '香川県': { lat: 34.3401, lng: 134.0433 },
            '愛媛県': { lat: 33.8416, lng: 132.7657 },
            '高知県': { lat: 33.5597, lng: 133.5310 },
            '福岡県': { lat: 33.5904, lng: 130.4017 },
            '佐賀県': { lat: 33.2494, lng: 130.2988 },
            '長崎県': { lat: 32.7448, lng: 129.8737 },
            '熊本県': { lat: 32.7898, lng: 130.7416 },
            '大分県': { lat: 33.2381, lng: 131.6126 },
            '宮崎県': { lat: 31.9077, lng: 131.4202 },
            '鹿児島県': { lat: 31.5602, lng: 130.5581 },
            '沖縄県': { lat: 26.2124, lng: 127.6809 }
        };

        return prefectureCenters[prefecture] || { lat: 36.2048, lng: 138.2529 }; // デフォルトは日本の中心
    }

    /**
     * インデックスをアルファベットに変換（0→A, 1→B, 2→C...）
     * @param {number} index - インデックス
     * @returns {string} アルファベット（A-Z, AA-ZZ...）
     */
    indexToAlphabet(index) {
        if (index < 0) return '';
        if (index < 26) {
            return String.fromCharCode(65 + index); // A-Z
        }
        // 26以上はAA, AB...と続く
        const first = Math.floor(index / 26) - 1;
        const second = index % 26;
        return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
    }

    /**
     * マーカーを追加
     * @param {Object} location - 位置情報
     * @param {string} title - マーカーのタイトル
     * @param {number} index - 順番（オプション）
     * @param {string} photoUrl - 施設の写真URL（オプション）
     * @param {Object} facility - 施設オブジェクト（オプション、InfoWindow用）
     * @returns {google.maps.Marker} 作成されたマーカー
     */
    addMarker(location, title, index = null, photoUrl = null, facility = null) {
        if (!this.map) {
            console.error('地図が初期化されていません');
            return null;
        }

        const marker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: this.map,
            title: title,
            label: {
                text: index !== null ? this.indexToAlphabet(index) : '',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
            }
        });

        // マーカークリック時にInfoWindowを表示
        if (facility && this.infoWindow) {
            marker.addListener('click', () => {
                this.showInfoWindow(marker, facility, location, photoUrl);
            });
        }

        this.markers.push(marker);
        return marker;
    }

    /**
     * InfoWindowを表示
     * @param {google.maps.Marker} marker - マーカー
     * @param {Object} facility - 施設オブジェクト
     * @param {Object} location - 位置情報
     * @param {string} photoUrl - 写真URL（オプション）
     */
    async showInfoWindow(marker, facility, location, photoUrl = null) {
        if (!this.infoWindow) return;

        // 写真と住所を取得
        let displayPhotoUrl = photoUrl || (location.photoUrlLarge ? location.photoUrlLarge : null);
        let address = location.address || location.name || facility.name;

        // 写真がない場合は、Google Places APIから取得を試みる
        if (!displayPhotoUrl && this.placesService && facility) {
            try {
                const placeLocation = await this.getFacilityLocation(facility.name, facility.prefecture);
                if (placeLocation.photoUrlLarge) {
                    displayPhotoUrl = placeLocation.photoUrlLarge;
                }
                // 住所情報も取得
                if (placeLocation.address) {
                    address = placeLocation.address;
                }
            } catch (error) {
                console.warn('写真・住所の取得に失敗しました:', error);
            }
        }

        // Google Places APIから詳細情報を取得（住所を日本語で取得）
        if (this.placesService && location.placeId) {
            try {
                const request = {
                    placeId: location.placeId,
                    fields: ['formatted_address', 'photos', 'name']
                };

                this.placesService.getDetails(request, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place) {
                        // 日本語の住所を取得
                        if (place.formatted_address) {
                            address = place.formatted_address;
                        }
                        // 写真を取得
                        if (!displayPhotoUrl && place.photos && place.photos.length > 0) {
                            displayPhotoUrl = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                        }
                        // InfoWindowの内容を更新
                        this.updateInfoWindowContent(marker, facility, address, displayPhotoUrl);
                    } else {
                        // 詳細情報が取得できない場合は、既存の情報で表示
                        this.updateInfoWindowContent(marker, facility, address, displayPhotoUrl);
                    }
                });
            } catch (error) {
                console.warn('詳細情報の取得に失敗しました:', error);
                this.updateInfoWindowContent(marker, facility, address, displayPhotoUrl);
            }
        } else {
            // placeIdがない場合は、既存の情報で表示
            this.updateInfoWindowContent(marker, facility, address, displayPhotoUrl);
        }
    }

    /**
     * InfoWindowの内容を更新
     * @param {google.maps.Marker} marker - マーカー
     * @param {Object} facility - 施設オブジェクト
     * @param {string} address - 住所
     * @param {string} photoUrl - 写真URL
     */
    updateInfoWindowContent(marker, facility, address, photoUrl) {
        const photoHtml = photoUrl 
            ? `<img src="${photoUrl}" alt="${facility.name}" style="width:100%;max-width:400px;height:auto;border-radius:8px;margin-bottom:10px;">`
            : '<div style="width:100%;height:200px;background:#f0f0f0;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;justify-content:center;color:#999;">写真なし</div>';

        const content = `
            <div style="max-width:400px;">
                <h3 style="margin:0 0 10px 0;color:#667eea;font-size:18px;">${facility.name}</h3>
                ${photoHtml}
                <p style="margin:10px 0 0 0;color:#666;font-size:14px;">
                    <strong>住所:</strong> ${address}<br>
                    <strong>都道府県:</strong> ${facility.prefecture}
                </p>
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.open(this.map, marker);
    }


    /**
     * すべてのマーカーをクリア
     */
    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    /**
     * ルートを計算して表示
     * @param {Array<Object>} waypoints - 経由地の配列（{lat, lng}形式）
     * @param {Object} origin - 出発地（{lat, lng}形式、オプション）
     * @param {Object} destination - 目的地（{lat, lng}形式、オプション）
     * @returns {Promise<Object>} ルート情報と移動時間を含むオブジェクト
     */
    async calculateRoute(waypoints, origin = null, destination = null) {
        if (!this.directionsService || !this.directionsRenderer) {
            console.error('Directions APIが初期化されていません');
            return null;
        }

        if (waypoints.length < 2) {
            console.warn('経由地が2つ以上必要です');
            return null;
        }

        // 出発地と目的地が指定されていない場合、最初と最後の経由地を使用
        const startPoint = origin || waypoints[0];
        const endPoint = destination || waypoints[waypoints.length - 1];
        const viaPoints = waypoints.slice(1, -1);

        const request = {
            origin: new google.maps.LatLng(startPoint.lat, startPoint.lng),
            destination: new google.maps.LatLng(endPoint.lat, endPoint.lng),
            waypoints: viaPoints.map(wp => ({
                location: new google.maps.LatLng(wp.lat, wp.lng),
                stopover: true
            })),
            optimizeWaypoints: false, // 順番を保持
            travelMode: google.maps.TravelMode.DRIVING
        };

        return new Promise((resolve, reject) => {
            this.directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK) {
                    this.directionsRenderer.setDirections(result);
                    
                    // 地図の表示範囲を調整
                    const bounds = new google.maps.LatLngBounds();
                    result.routes[0].legs.forEach(leg => {
                        bounds.extend(leg.start_location);
                        bounds.extend(leg.end_location);
                    });
                    this.map.fitBounds(bounds);

                    // 移動時間情報を抽出
                    const routeInfo = {
                        route: result,
                        legs: result.routes[0].legs.map(leg => ({
                            startLocation: {
                                lat: leg.start_location.lat(),
                                lng: leg.start_location.lng()
                            },
                            endLocation: {
                                lat: leg.end_location.lat(),
                                lng: leg.end_location.lng()
                            },
                            duration: {
                                value: leg.duration.value, // 秒
                                text: leg.duration.text    // "30分" などのテキスト
                            },
                            distance: {
                                value: leg.distance.value, // メートル
                                text: leg.distance.text    // "15 km" などのテキスト
                            }
                        }))
                    };

                    // 移動時間情報をlocalStorageに保存（しおり生成用）
                    localStorage.setItem('routeInfo', JSON.stringify(routeInfo));

                    resolve(routeInfo);
                } else {
                    console.error('ルート計算エラー:', status);
                    reject(new Error(`ルート計算エラー: ${status}`));
                }
            });
        });
    }

    /**
     * 地図の表示範囲を設定
     * @param {Array<Object>} locations - 位置情報の配列
     */
    fitBounds(locations) {
        if (!this.map || locations.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        locations.forEach(loc => {
            bounds.extend(new google.maps.LatLng(loc.lat, loc.lng));
        });
        this.map.fitBounds(bounds);
    }
}

// グローバルにエクスポート
window.MapController = MapController;

// Google Maps APIのコールバック
window.initMap = function() {
    // この関数はapp.jsから呼び出される
    console.log('Google Maps APIが読み込まれました');
};

