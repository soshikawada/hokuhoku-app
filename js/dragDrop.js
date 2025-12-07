/**
 * ドラッグ&ドロップ機能
 */

class DragDropManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.items = [];
        this.init();
    }

    /**
     * 初期化
     */
    init() {
        if (!this.container) {
            console.error(`コンテナが見つかりません: ${this.containerId}`);
            return;
        }

        // ドラッグイベントの設定
        this.container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            if (!draggingItem) return;

            // 移動手段カードの上にドラッグしている場合は無視
            if (e.target.closest('.travel-mode-card')) {
                return;
            }

            const afterElement = this.getDragAfterElement(this.container, e.clientY);
            
            if (afterElement == null) {
                this.container.appendChild(draggingItem);
            } else {
                this.container.insertBefore(draggingItem, afterElement);
            }
            
            // ドラッグ後に移動手段カードを再配置
            this.reorganizeTravelModeCards();
        });

        this.container.addEventListener('dragend', () => {
            const draggingItem = document.querySelector('.dragging');
            if (draggingItem) {
                draggingItem.classList.remove('dragging');
            }
            // 移動手段カードを再配置
            this.reorganizeTravelModeCards();
            this.updateOrderNumbers();
            this.onOrderChange();
        });
    }

    /**
     * ドラッグ後の要素を取得
     * @param {HTMLElement} container - コンテナ要素
     * @param {number} y - マウスのY座標
     * @returns {HTMLElement|null} 挿入位置の後の要素
     */
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.wishlist-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    /**
     * アイテムを追加
     * @param {Object} facility - 施設オブジェクト
     * @param {Object} location - 位置情報（オプション）
     */
    addItem(facility, location = null) {
        // 空の状態のメッセージを削除
        const errorMessage = this.container.querySelector('.error');
        if (errorMessage) {
            errorMessage.remove();
        }
        
        const index = this.items.length;
        
        // 最初の施設以外の場合、前の施設の後に移動手段カードを追加
        if (index > 0) {
            const travelModeCard = this.createTravelModeCard(index - 1);
            this.container.appendChild(travelModeCard);
        }
        
        // 施設カードを追加
        const item = this.createItemElement(facility, location);
        this.container.appendChild(item);
        this.items.push({ facility, location, element: item });
        this.updateOrderNumbers();
    }

    /**
     * アイテム要素を作成
     * @param {Object} facility - 施設オブジェクト
     * @param {Object} location - 位置情報（オプション）
     * @returns {HTMLElement} アイテム要素
     */
    createItemElement(facility, location) {
        const item = document.createElement('div');
        item.className = 'wishlist-item';
        item.draggable = true;
        item.dataset.facilityName = facility.name;
        item.dataset.prefecture = facility.prefecture;

        const photoHtml = location && location.photoUrl 
            ? `<img src="${location.photoUrl}" alt="${facility.name}">`
            : '<div style="width:80px;height:80px;background:#ddd;border-radius:8px;"></div>';

        item.innerHTML = `
            <div class="drag-handle">☰</div>
            ${photoHtml}
            <div class="item-info">
                <h4>${facility.name}</h4>
                <div class="prefecture">${facility.prefecture}</div>
            </div>
            <div class="order-number">A</div>
        `;

        // ドラッグイベント
        item.addEventListener('dragstart', () => {
            item.classList.add('dragging');
        });

        // 削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '×';
        deleteBtn.className = 'delete-btn';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeItem(item);
        });
        item.appendChild(deleteBtn);

        return item;
    }

    /**
     * 移動手段カードを作成
     * @param {number} segmentIndex - セグメントインデックス（0から始まる）
     * @returns {HTMLElement} 移動手段カード要素
     */
    createTravelModeCard(segmentIndex) {
        const card = document.createElement('div');
        card.className = 'travel-mode-card';
        card.dataset.segmentIndex = segmentIndex;
        
        const prevIndex = segmentIndex;
        const currentIndex = segmentIndex + 1;
        const prevLabel = this.indexToAlphabet(prevIndex);
        const currentLabel = this.indexToAlphabet(currentIndex);
        
        // 施設名を取得
        const prevFacility = this.items[prevIndex] ? this.items[prevIndex].facility : null;
        const currentFacility = this.items[currentIndex] ? this.items[currentIndex].facility : null;
        const prevFacilityName = prevFacility ? prevFacility.name : '';
        const currentFacilityName = currentFacility ? currentFacility.name : '';
        
        card.innerHTML = `
            <div class="travel-mode-content">
                <label class="travel-mode-label">
                    ${prevLabel}(${prevFacilityName}) → ${currentLabel}(${currentFacilityName}) の移動手段：
                </label>
                <select class="travel-mode-select" data-segment-index="${segmentIndex}">
                    <option value="DRIVING">🚗 車</option>
                    <option value="TRANSIT">🚃 電車・バス</option>
                    <option value="WALKING">🚶 徒歩</option>
                    <option value="BICYCLING">🚴 自転車</option>
                </select>
            </div>
        `;
        
        // 既存の移動手段を読み込む
        const savedModes = JSON.parse(localStorage.getItem('segmentTravelModes') || '[]');
        const selectElement = card.querySelector('select');
        if (savedModes[segmentIndex]) {
            selectElement.value = savedModes[segmentIndex];
        }
        
        // 変更時に保存
        selectElement.addEventListener('change', (e) => {
            const savedModes = JSON.parse(localStorage.getItem('segmentTravelModes') || '[]');
            savedModes[segmentIndex] = e.target.value;
            localStorage.setItem('segmentTravelModes', JSON.stringify(savedModes));
        });
        
        return card;
    }

    /**
     * アイテムを削除
     * @param {HTMLElement} itemElement - 削除するアイテム要素
     */
    removeItem(itemElement) {
        const index = this.items.findIndex(item => item.element === itemElement);
        if (index !== -1) {
            // 削除する施設のインデックスを保存（移動手段の再配置に必要）
            this.items.splice(index, 1);
            itemElement.remove();
            
            // 移動手段カードを再配置（施設の間に必ず表示されるように）
            this.reorganizeTravelModeCards();
            
            // 順番番号を更新
            this.updateOrderNumbers();
            this.onOrderChange();
        }
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
     * 順番番号を更新（アルファベット表示）
     */
    updateOrderNumbers() {
        const items = this.container.querySelectorAll('.wishlist-item');
        items.forEach((item, index) => {
            const orderNumber = item.querySelector('.order-number');
            if (orderNumber) {
                orderNumber.textContent = this.indexToAlphabet(index);
            }
        });
        
        // 移動手段カードのラベルを更新
        const travelModeCards = this.container.querySelectorAll('.travel-mode-card');
        travelModeCards.forEach(card => {
            const segmentIndex = parseInt(card.dataset.segmentIndex);
            const prevIndex = segmentIndex;
            const currentIndex = segmentIndex + 1;
            const prevLabel = this.indexToAlphabet(prevIndex);
            const currentLabel = this.indexToAlphabet(currentIndex);
            
            // 施設名を取得
            const prevItem = this.items[prevIndex];
            const currentItem = this.items[currentIndex];
            const prevFacilityName = prevItem ? prevItem.facility.name : '';
            const currentFacilityName = currentItem ? currentItem.facility.name : '';
            
            const label = card.querySelector('.travel-mode-label');
            if (label) {
                label.textContent = `${prevLabel}(${prevFacilityName}) → ${currentLabel}(${currentFacilityName}) の移動手段：`;
            }
            
            // セグメントインデックスも更新
            const select = card.querySelector('select');
            if (select) {
                select.dataset.segmentIndex = segmentIndex.toString();
            }
        });
    }

    /**
     * 順番が変更されたときのコールバック
     */
    onOrderChange() {
        // カスタムイベントを発火
        const event = new CustomEvent('wishlistOrderChanged', {
            detail: { items: this.getItems() }
        });
        document.dispatchEvent(event);
    }

    /**
     * 現在のアイテムリストを取得
     * @returns {Array} アイテムの配列
     */
    getItems() {
        const items = [];
        this.container.querySelectorAll('.wishlist-item').forEach(item => {
            const facilityName = item.dataset.facilityName;
            const prefecture = item.dataset.prefecture;
            const matchedItem = this.items.find(i => 
                i.facility.name === facilityName && i.facility.prefecture === prefecture
            );
            if (matchedItem) {
                items.push(matchedItem);
            }
        });
        return items;
    }

    /**
     * 移動手段カードを再配置（ドラッグ&ドロップ後、削除後）
     */
    reorganizeTravelModeCards() {
        // this.itemsをDOMの順序に合わせて更新
        const items = this.container.querySelectorAll('.wishlist-item');
        const reorderedItems = [];
        items.forEach(item => {
            const facilityName = item.dataset.facilityName;
            const prefecture = item.dataset.prefecture;
            const matchedItem = this.items.find(i => 
                i.facility.name === facilityName && i.facility.prefecture === prefecture
            );
            if (matchedItem) {
                reorderedItems.push(matchedItem);
            }
        });
        this.items = reorderedItems;
        
        // すべての移動手段カードを削除
        const travelModeCards = this.container.querySelectorAll('.travel-mode-card');
        travelModeCards.forEach(card => card.remove());
        
        // 保存済みの移動手段を取得
        const savedModes = JSON.parse(localStorage.getItem('segmentTravelModes') || '[]');
        
        // 施設カードの順序に基づいて移動手段カードを再配置
        items.forEach((item, index) => {
            if (index > 0) {
                // 前の施設カードの後に移動手段カードを挿入
                const segmentIndex = index - 1;
                const travelModeCard = this.createTravelModeCard(segmentIndex);
                
                // 保存済みの移動手段を適用（セグメントインデックスが有効な場合）
                if (savedModes[segmentIndex]) {
                    const selectElement = travelModeCard.querySelector('select');
                    if (selectElement) {
                        selectElement.value = savedModes[segmentIndex];
                    }
                }
                
                this.container.insertBefore(travelModeCard, item);
            }
        });
        
        // セグメントインデックスを再マッピング（削除後にインデックスがずれるため）
        this.remapSegmentIndices();
    }
    
    /**
     * セグメントインデックスを再マッピング（削除後に移動手段のインデックスを調整）
     */
    remapSegmentIndices() {
        const travelModeCards = this.container.querySelectorAll('.travel-mode-card');
        const savedModes = JSON.parse(localStorage.getItem('segmentTravelModes') || '[]');
        const newModes = [];
        
        // 新しい順序で移動手段を再マッピング
        travelModeCards.forEach((card, cardIndex) => {
            const oldSegmentIndex = parseInt(card.dataset.segmentIndex);
            const newSegmentIndex = cardIndex;
            
            // セグメントインデックスを更新
            card.dataset.segmentIndex = newSegmentIndex.toString();
            const select = card.querySelector('select');
            if (select) {
                select.dataset.segmentIndex = newSegmentIndex.toString();
            }
            
            // 移動手段の値を保持（可能な場合）
            if (oldSegmentIndex < savedModes.length && savedModes[oldSegmentIndex]) {
                newModes[newSegmentIndex] = savedModes[oldSegmentIndex];
            } else {
                newModes[newSegmentIndex] = 'DRIVING'; // デフォルト
            }
        });
        
        // localStorageを更新
        localStorage.setItem('segmentTravelModes', JSON.stringify(newModes));
    }

    /**
     * すべてのアイテムをクリア
     */
    clear() {
        this.container.innerHTML = '';
        this.items = [];
    }
}

// グローバルにエクスポート
window.DragDropManager = DragDropManager;

