/**
 * 属性入力フォームの処理
 */

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('userForm');
    
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // ロード画面を表示
        showLoadingScreen();
        
        try {
            const formData = new FormData(form);
            const userAttributes = {
                age: formData.get('age'),
                gender: formData.get('gender'),
                stayDays: formData.get('stayDays'),
                companion: formData.get('companion'),
                purpose: formData.get('purpose')
            };

            // ユーザー属性をlocalStorageに保存
            localStorage.setItem('userAttributes', JSON.stringify(userAttributes));

            // 新しい属性入力時に行きたいリストをクリア
            localStorage.removeItem('wishlist');

            // 少し待機してから遷移（ロード画面を見せるため）
            await new Promise(resolve => setTimeout(resolve, 500));

            // レコメンド結果ページに遷移
            window.location.href = 'recommendations.html';
        } catch (error) {
            console.error('エラー:', error);
            hideLoadingScreen();
            alert('エラーが発生しました。もう一度お試しください。');
        }
    });
    
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
});

