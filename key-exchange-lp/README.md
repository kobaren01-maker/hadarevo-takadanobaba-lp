# 鍵開け・鍵交換 LP（h-gate.jp リニューアル）

鍵トラブルで**緊急に検索している人が、3秒で「ここに電話して大丈夫」と判断できる**LPの方針と骨組み。
リスティング広告での即時獲得と、記事・事例の継続更新によるSEO／AIOの両立を前提に設計している。

> 本ディレクトリは肌REVOのLP（リポジトリ直下の `src/` 等）とは無関係。GitHub Pagesのデプロイ対象にも含まれない。
> 本格運用時は専用リポジトリ（またはWordPress）へ移す想定。

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| [docs/01-strategy.md](docs/01-strategy.md) | 方針書：ターゲット心理、ポジショニング、サイト構成、SEO/AIO方針、ヒアリングシート |
| [docs/02-keywords.md](docs/02-keywords.md) | キーワード設計：意図別の受け皿ページ、広告グループ案、初期コラム20本 |
| [docs/03-wireframe.md](docs/03-wireframe.md) | トップ（LP）のワイヤーと各ブロックの要件 |
| [docs/04-content-ops.md](docs/04-content-ops.md) | 運用ガイド：コラムの型、作業事例の投稿手順、GBP・口コミ、月次の振り返り |
| [docs/05-current-site-audit.md](docs/05-current-site-audit.md) | 現行サイトの分析（WordPress＋Lightning）と、子テーマ化による移行方針 |
| [docs/06-focus-strategy.md](docs/06-focus-strategy.md) | 勝ちに行く分野の選定：鍵の紛失と安否確認の鍵開けの比較（自然流入メイン） |

## 骨組み

```
key-exchange-lp/src/
├─ index.html                     … トップ兼LP（BLOCK0〜16。構造化データ Locksmith / FAQPage 入り）
├─ price/index.html               … 料金表（鍵開け・交換・修理・車・その他・追加費用）
├─ area/_template/index.html      … エリアページの雛形（【独自】欄を埋められるエリアだけ作る）
├─ column/kagi-nakushita/index.html … コラム1本目「鍵をなくした時にまずやること」＝記事の雛形
├─ style.css                      … 全ページ共通のスタイル
└─ script.js                      … FVの広告別出し分け、固定CTA、電話・LINEタップのGA4イベント
```

### 広告ごとのFV出し分け

広告の最終ページURLに `?type=` を付けると、トップのFV見出し・料金目安・お困りごとボタンの並び順が変わる。
文言と金額は `script.js` の `FV_VARIANTS` で管理する。

| パラメータ | 広告グループ | FV見出し |
| --- | --- | --- |
| （なし） | 自然検索・地域 | 鍵をなくした・開かない |
| `?type=funshitsu` | 紛失・閉め出し | 鍵をなくして家に入れない方へ |
| `?type=kagiake` | 鍵開け | 玄関の鍵開け・閉め出し |
| `?type=koukan` | 鍵交換 | 鍵交換・シリンダー交換 |
| `?type=car` | 車 | 車・バイクの鍵トラブル |

プレビュー：

```bash
cd key-exchange-lp/src && python -m http.server 8001
# http://localhost:8001/ をスマホ幅で確認
```

下層ページはCSS・JSを `/style.css` のようにルートからのパスで読むので、ファイルを直接開かず必ずサーバー経由で確認する。

## 差し替えルール

- 屋号（鍵マッハ24）・電話番号・所在地・到着時間（最短5分／平均5〜20分）は現行サイトの情報を反映済み
- `{地域}` `{市区町村A}` `◯◯円` `【要確認】` は仮。ヒアリング後に置換する
- 電話番号は `tel:` リンク・表示・JSON-LD・フッターの**4か所すべて**を同じ番号にする
- FAQを変更したら `<head>` 内の FAQPage JSON-LD も同じ文言に揃える
- 作業事例・口コミは実在のものが揃うまで `hidden` のまま（ダミーで埋めない）
