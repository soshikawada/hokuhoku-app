/**
 * オープニング画面のアニメーション制御
 */

document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash-screen');
    const linesContainer = document.getElementById('lines-container');
    
    if (!splash) return;
    
    // 設定: パーティクル（金箔）の数
    const particleCount = 30;
    
    // 設定: ルートラインの本数
    const lineCount = 25;
    
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
    
    // ルートラインを生成する関数
    function createRouteLines() {
        if (!linesContainer) return;
        
        for (let i = 0; i < lineCount; i++) {
            const line = document.createElement('div');
            line.classList.add('route-line');
            
            // 画面全体にランダムに配置
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            
            // 角度をランダムに、ただし水平・垂直に近い角度を多めにして「ルート感」を出す
            let rotate = Math.random() * 360;
            if (Math.random() > 0.5) {
                rotate = Math.round(rotate / 45) * 45 + (Math.random() * 10 - 5);
            }
            
            const width = Math.random() * 150 + 50 + 'px'; // 長さ
            line.style.top = `${top}%`;
            line.style.left = `${left}%`;
            line.style.transform = `rotate(${rotate}deg)`;
            line.style.width = width;
            linesContainer.appendChild(line);
            
            // アニメーション: 線が伸びて移動し、消える
            const duration = Math.random() * 2000 + 2500; // 2.5s - 4.5s
            const delay = Math.random() * 2500; // 開始をばらつかせる
            
            line.animate([
                { opacity: 0, transform: `rotate(${rotate}deg) translateX(-100%) scaleX(0.1)`, offset: 0 },
                { opacity: 1, transform: `rotate(${rotate}deg) translateX(0%) scaleX(1)`, offset: 0.4 },
                { opacity: 0, transform: `rotate(${rotate}deg) translateX(100%) scaleX(0.8)`, offset: 1 }
            ], {
                duration: duration,
                delay: delay,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards',
                // 複数回繰り返して賑やかにする
                iterations: 2 
            });
        }
    }
    
    // アニメーション開始
    createGoldLeaf();
    createRouteLines();
    
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
