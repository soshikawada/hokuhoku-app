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

            const afterElement = this.getDragAfterElement(this.container, e.clientY);
            const currentItem = e.target.closest('.wishlist-item');
            
            if (afterElement == null) {
                this.container.appendChild(draggingItem);
            } else {
                this.container.insertBefore(draggingItem, afterElement);
            }
        });

        this.container.addEventListener('dragend', () => {
            const draggingItem = document.querySelector('.dragging');
            if (draggingItem) {
                draggingItem.classList.remove('dragging');
            }
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
     * アイテムを削除
     * @param {HTMLElement} itemElement - 削除するアイテム要素
     */
    removeItem(itemElement) {
        const index = this.items.findIndex(item => item.element === itemElement);
        if (index !== -1) {
            this.items.splice(index, 1);
            itemElement.remove();
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
     * すべてのアイテムをクリア
     */
    clear() {
        this.container.innerHTML = '';
        this.items = [];
    }
}

// グローバルにエクスポート
window.DragDropManager = DragDropManager;

