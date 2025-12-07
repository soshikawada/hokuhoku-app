/**
 * 評価ページの処理
 */

let tsvParser;
let openaiService;
let facilityName = '';
let prefecture = '';
let facilityData = [];
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
    // URLパラメータから施設情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    facilityName = urlParams.get('facility') || '';
    prefecture = urlParams.get('prefecture') || '';
    const aiRequested = urlParams.get('ai') === 'true';

    if (!facilityName || !prefecture) {
        showError('施設情報が指定されていません。');
        return;
    }

    // 施設情報を表示
    const facilityInfo = document.getElementById('facilityInfo');
    if (facilityInfo) {
        facilityInfo.textContent = `${prefecture} - ${facilityName}`;
    }

    // 初期化
    tsvParser = new TSVParser();
    openaiService = new OpenAIService();

    // データを読み込む
    loadEvaluationData(aiRequested);
});

/**
 * 評価データを読み込む
 * @param {boolean} aiRequested - AIおすすめポイントを生成するかどうか
 */
async function loadEvaluationData(aiRequested = false) {
    showLoading(true);

    try {
        // TSVファイルを読み込む
        const allData = await tsvParser.loadTSV('data/tifo_complain_3m.tsv');
        console.log(`全${allData.length}件のデータを読み込みました`);

        // 施設でフィルタリング
        facilityData = tsvParser.filterByFacility(allData, facilityName, prefecture);
        console.log(`${facilityName}の評価データ: ${facilityData.length}件`);

        if (facilityData.length === 0) {
            showError('この施設の評価データが見つかりませんでした。');
            showLoading(false);
            return;
        }

        // 統計情報を表示
        displayStatistics(facilityData);

        // グラフを表示
        displayCharts(facilityData);

        // AIおすすめポイントを生成（リクエストされた場合）
        if (aiRequested) {
            await generateAIRecommendation();
        }

        showLoading(false);
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        showError(`データの読み込みに失敗しました: ${error.message}`);
        showLoading(false);
    }
}

/**
 * 統計情報を表示
 * @param {Array} data - 施設データ
 */
function displayStatistics(data) {
    const statistics = tsvParser.calculateStatistics(data);
    const container = document.getElementById('statistics');
    if (!container) return;

    container.innerHTML = `
        <div class="stat-item">
            <div class="stat-label">総回答数</div>
            <div class="stat-value">${statistics.totalCount}件</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">平均満足度</div>
            <div class="stat-value">${statistics.averageSatisfaction}/5</div>
        </div>
        <div class="stat-item">
            <div class="stat-label">平均おすすめ度</div>
            <div class="stat-value">${statistics.averageRecommendation}/10</div>
        </div>
    `;
}

/**
 * グラフを表示
 * @param {Array} data - 施設データ
 */
function displayCharts(data) {
    const statistics = tsvParser.calculateStatistics(data);

    // 満足度分布グラフ
    const satisfactionCtx = document.getElementById('satisfactionChart');
    if (satisfactionCtx && Object.keys(statistics.satisfactionDistribution).length > 0) {
        if (charts.satisfaction) {
            charts.satisfaction.destroy();
        }
        charts.satisfaction = new Chart(satisfactionCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(statistics.satisfactionDistribution).sort(),
                datasets: [{
                    label: '回答数',
                    data: Object.keys(statistics.satisfactionDistribution).sort().map(key => 
                        statistics.satisfactionDistribution[key]
                    ),
                    backgroundColor: 'rgba(0, 110, 95, 0.6)',
                    borderColor: 'rgba(0, 110, 95, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // おすすめ度分布グラフ
    const recommendationCtx = document.getElementById('recommendationChart');
    if (recommendationCtx && Object.keys(statistics.recommendationDistribution).length > 0) {
        if (charts.recommendation) {
            charts.recommendation.destroy();
        }
        charts.recommendation = new Chart(recommendationCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(statistics.recommendationDistribution).sort(),
                datasets: [{
                    label: '回答数',
                    data: Object.keys(statistics.recommendationDistribution).sort().map(key => 
                        statistics.recommendationDistribution[key]
                    ),
                    backgroundColor: 'rgba(77, 182, 172, 0.6)',
                    borderColor: 'rgba(77, 182, 172, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // 年代別分布グラフ
    const ageCtx = document.getElementById('ageChart');
    if (ageCtx && Object.keys(statistics.ageDistribution).length > 0) {
        if (charts.age) {
            charts.age.destroy();
        }
        charts.age = new Chart(ageCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statistics.ageDistribution),
                datasets: [{
                    data: Object.values(statistics.ageDistribution),
                    backgroundColor: [
                        'rgba(0, 110, 95, 0.8)',
                        'rgba(77, 182, 172, 0.8)',
                        'rgba(0, 150, 136, 0.8)',
                        'rgba(0, 121, 107, 0.8)',
                        'rgba(0, 96, 100, 0.8)',
                        'rgba(0, 77, 64, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    // 同伴者別分布グラフ
    const companionCtx = document.getElementById('companionChart');
    if (companionCtx && Object.keys(statistics.companionDistribution).length > 0) {
        if (charts.companion) {
            charts.companion.destroy();
        }
        charts.companion = new Chart(companionCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statistics.companionDistribution),
                datasets: [{
                    data: Object.values(statistics.companionDistribution),
                    backgroundColor: [
                        'rgba(0, 110, 95, 0.8)',
                        'rgba(77, 182, 172, 0.8)',
                        'rgba(0, 150, 136, 0.8)',
                        'rgba(0, 121, 107, 0.8)',
                        'rgba(0, 96, 100, 0.8)',
                        'rgba(0, 77, 64, 0.8)'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

/**
 * AIおすすめポイントを生成
 */
async function generateAIRecommendation() {
    const section = document.getElementById('aiRecommendationSection');
    const content = document.getElementById('aiRecommendationContent');
    const loading = document.getElementById('aiLoading');
    const error = document.getElementById('aiError');

    if (!section || !content || !loading || !error) return;

    // セクションを表示
    section.style.display = 'block';
    content.innerHTML = '';
    error.style.display = 'none';
    loading.style.display = 'block';

    try {
        // OpenAI APIを呼び出す
        const recommendation = await openaiService.generateRecommendationPoints(
            facilityName,
            prefecture,
            facilityData
        );

        // 結果を表示
        content.innerHTML = `<div class="ai-recommendation-text">${formatRecommendationText(recommendation)}</div>`;
        loading.style.display = 'none';
    } catch (err) {
        console.error('AI生成エラー:', err);
        error.textContent = `おすすめポイントの生成に失敗しました: ${err.message}`;
        error.style.display = 'block';
        loading.style.display = 'none';
    }
}

/**
 * おすすめポイントテキストをフォーマット
 * @param {string} text - AI生成テキスト
 * @returns {string} フォーマットされたHTML
 */
function formatRecommendationText(text) {
    if (!text) return '';
    
    // HTMLエスケープ
    let formatted = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // 改行を<br>に変換
    formatted = formatted.replace(/\n/g, '<br>');
    
    // 番号付きリストを整形（改行で分割して処理）
    const lines = formatted.split('<br>');
    const formattedLines = lines.map(line => {
        // 番号付きリストの行を検出（例: "1. ポイント"）
        const match = line.match(/^(\d+\.\s*)(.+)$/);
        if (match) {
            return `<div class="recommendation-item">${match[1]}${match[2]}</div>`;
        }
        // 通常の行はそのまま
        return line ? `<p>${line}</p>` : '';
    });
    
    return formattedLines.join('');
}

/**
 * ローディング表示を制御
 * @param {boolean} show - 表示するかどうか
 */
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

/**
 * エラーメッセージを表示
 * @param {string} message - エラーメッセージ
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

