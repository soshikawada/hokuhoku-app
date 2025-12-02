/**
 * 行きたいリストページの処理
 */

let dragDropManager;

document.addEventListener('DOMContentLoaded', () => {
    // ドラッグ&ドロップマネージャーの初期化
    dragDropManager = new DragDropManager('wishlist');

    // 行きたいリストの順番変更イベント
    document.addEventListener('wishlistOrderChanged', handleWishlistOrderChange);

    // ルート検索ボタンのイベント設定
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.addEventListener('click', () => {
            window.location.href = 'route.html';
        });
    }

    // 行きたいリストを読み込んで表示
    loadWishlist();
});

/**
 * 行きたいリストを読み込んで表示
 */
function loadWishlist() {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    
    if (wishlist.length === 0) {
        const container = document.getElementById('wishlist');
        if (container) {
            container.innerHTML = '<div class="error">行きたいリストが空です。おすすめ施設ページで施設を追加してください。</div>';
        }
        return;
    }

    // ドラッグ&ドロップマネージャーにアイテムを追加
    wishlist.forEach((item, index) => {
        dragDropManager.addItem(item.facility, item.location);
    });

    // ルート検索ボタンを表示（2つ以上の施設がある場合）
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn && wishlist.length >= 2) {
        routeBtn.style.display = 'block';
    }
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

    // ルート検索ボタンの表示を更新
    const routeBtn = document.getElementById('routeBtn');
    if (routeBtn) {
        routeBtn.style.display = wishlist.length >= 2 ? 'block' : 'none';
    }
}

