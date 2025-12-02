# ほくほくルート

北陸地方の観光アンケート結果を基に、ユーザーの属性に応じた施設レコメンドとルート提案を行うWebアプリケーションです。

## 機能

- **属性入力フォーム**: 年代、性別、宿泊日数、同伴者、訪問目的を入力
- **施設レコメンド**: 入力された属性に基づいておすすめ施設を表示
- **施設検索**: Google Places APIを使用して施設を検索・追加
- **行きたいリスト**: レコメンドされた施設や検索した施設を行きたいリストに追加
- **ドラッグ&ドロップ**: 行きたいリスト内で施設の順番を変更可能
- **ルート検索**: Google Directions APIを使用して最適なルートを表示

## セットアップ

### 1. Google Maps APIキーの取得

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」から以下のAPIを有効化：
   - Maps JavaScript API
   - Places API
   - Directions API
4. 「認証情報」→「認証情報を作成」→「APIキー」でAPIキーを作成
5. APIキーの制限を設定（推奨）：
   - アプリケーションの制限: HTTPリファラー（ウェブサイト）
   - APIの制限: 上記の3つのAPIのみを選択

### 2. APIキーの設定

1. `js/config.example.js`を`js/config.js`としてコピーしてください：
   
   **Windowsの場合:**
   - エクスプローラーで`js`フォルダを開く
   - `config.example.js`を右クリック → 「コピー」
   - 同じフォルダ内で右クリック → 「貼り付け」
   - ファイル名を`config.js`に変更
   
   **Mac/Linuxの場合:**
   ```bash
   cp js/config.example.js js/config.js
   ```

2. `js/config.js`ファイルを開き、`YOUR_API_KEY`を実際のAPIキーに置き換えてください：
   ```javascript
   const CONFIG = {
       GOOGLE_MAPS_API_KEY: 'あなたのAPIキーをここに貼り付け'
   };
   ```

**重要**: `js/config.js`ファイルは`.gitignore`に追加されているため、Gitにコミットされません。これにより、APIキーが公開リポジトリに漏れることを防げます。

### 3. ローカルサーバーの起動

CORS問題を回避するため、ローカルサーバーで実行する必要があります。

#### 方法1: Pythonを使用（推奨）

```bash
# Python 3の場合
python -m http.server 8000

# Python 2の場合
python -m SimpleHTTPServer 8000
```

#### 方法2: Node.jsを使用

```bash
# http-serverをインストール（初回のみ）
npm install -g http-server

# サーバーを起動
http-server -p 8000
```

#### 方法3: VS CodeのLive Server拡張機能を使用

1. VS Codeに「Live Server」拡張機能をインストール
2. `index.html`を右クリック→「Open with Live Server」

### 4. アプリケーションの起動

ブラウザで以下のURLにアクセス：

```
http://localhost:8000
```

## ファイル構成

```
root-recomend/
├── index.html              # 属性入力ページ
├── recommendations.html     # 施設選択ページ（おすすめ施設一覧 + 行きたいリスト）
├── route.html              # ルート表示ページ
├── css/
│   └── style.css           # スタイルシート
├── js/
│   ├── config.js           # 設定ファイル（APIキー）
│   ├── config.example.js   # 設定ファイルテンプレート
│   ├── csvParser.js        # CSVデータ読み込み・パース
│   ├── recommendation.js   # レコメンドエンジン
│   ├── mapController.js    # Google Maps制御
│   ├── dragDrop.js         # ドラッグ&ドロップ機能
│   ├── formHandler.js      # 属性入力フォーム処理
│   ├── recommendationsPage.js # 施設選択ページ処理
│   └── routePage.js        # ルート表示ページ処理
├── data/
│   └── tif_score.csv       # 施設スコアデータ
└── README.md               # このファイル
```

## 使用方法

### ページフロー

1. **属性入力ページ（index.html）**
   - フォームに年代、性別、宿泊日数、同伴者、訪問目的を入力
   - 「レコメンド実行」ボタンをクリックすると、レコメンド結果ページに遷移

2. **施設選択ページ（recommendations.html）**
   - 左側：おすすめ施設一覧（上位表示）と都道府県別の施設一覧
   - 右側：行きたいリスト（ドラッグ&ドロップで順番変更可能）
   - 左側の施設にチェックを入れると、右側の行きたいリストに追加されます
   - 施設検索機能でGoogle Places APIを使用して施設を検索・追加可能
   - 2つ以上の施設がある場合、「ルートマップを見る」ボタンが表示されます

3. **ルート表示ページ（route.html）**
   - 左側に行きたいリスト、右側に地図が表示されます
   - 左側のリストでドラッグ&ドロップで順番を変更し、「ルートを更新」ボタンで地図を更新
   - 施設検索機能で新しい施設を検索してリストに追加可能
   - 地図上にルートとマーカーが表示されます

## 注意事項

- Google Maps APIの使用量制限に注意してください（無料枠あり）
- CSVファイルは`data/tif_score.csv`に配置してください
- ローカルサーバーで実行しないと、CORSエラーが発生する可能性があります

## トラブルシューティング

### CSVファイルが読み込めない

- ローカルサーバーで実行しているか確認してください
- ブラウザのコンソールでエラーメッセージを確認してください

### 地図が表示されない

- Google Maps APIキーが正しく設定されているか確認してください
- APIキーの制限設定を確認してください（HTTPリファラーなど）
- ブラウザのコンソールでエラーメッセージを確認してください

### 施設の位置情報が取得できない

- Google Places APIが有効になっているか確認してください
- APIキーの使用量制限に達していないか確認してください

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

