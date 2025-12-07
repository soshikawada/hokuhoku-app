/**
 * オープニング画面のアニメーション制御
 */

document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    
    if (!splash) return;
    
    // 設定: パーティクル（金箔）の数
    const particleCount = 30;
    
    // 金箔を生成する関数
    function createGoldLeaf() {
        for (let i = 0; i < particleCount; i++) {
            const leaf = document.createElement('div');
            leaf.classList.add('gold-leaf');
            
            // ランダムな位置とサイズ
            const size = Math.random() * 10 + 5 + 'px'; // 5px〜15px
            leaf.style.width = size;
            leaf.style.height = size;
            leaf.style.left = Math.random() * 100 + 'vw';
            
            // ランダムなアニメーション時間（ゆっくり舞い落ちる）
            const duration = Math.random() * 4 + 3 + 's'; // 3秒〜7秒
            const delay = Math.random() * 3 + 's'; // 0秒〜3秒遅延
            
            leaf.style.animationDuration = duration;
            leaf.style.animationDelay = delay;
            splash.appendChild(leaf);
        }
    }
    
    // 金箔アニメーション開始
    createGoldLeaf();
    
    // 遷移処理
    // 5.5秒後にスライドアップアニメーションを開始
    setTimeout(() => {
        // スプラッシュ画面を上にスライドさせるクラスを追加
        splash.classList.add('slide-up');
    }, 5500);
    
    // 7秒後にindex.htmlに遷移
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 7000);
});
