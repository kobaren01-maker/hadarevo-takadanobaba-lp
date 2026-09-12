# hadarevo-takadanobaba-lp

肌REVO高田馬場店 集客強化用LP。仕様は [docs/lp-spec.md](docs/lp-spec.md) に準拠（Meta広告 → LP → LP内で直接予約が目的。Hot Pepper Beautyへは離脱させない）。

このリポジトリは元々、新店・藤沢のOPEN前LINE登録LPとして作られたものを、既存店・高田馬場向けに作り替えたもの。旧仕様（LINE登録ゴール・OPEN限定オファー）は廃止し、LP内で日時選択から予約完了まで完結する構成に変更している。

## 構成

```
hadarevo-takadanobaba-lp/
├─ src/
│  ├─ index.html   … LP本体（BLOCK01〜11をこの順のまま実装。BLOCK10に予約枠選択・予約フォームを実装）
│  ├─ manage.html   … 予約完了後、本人が来店前日まで日時変更・キャンセルを行うページ（?t=トークン で本人特定）
│  ├─ style.css     … デザイン（配色・タイポグラフィ・レイアウト）
│  └─ script.js      … 口コミ横スクロール／スマホ固定CTA／画像プレースホルダー制御／予約枠取得・予約送信／予約確認・変更・キャンセル
├─ backend/
│  └─ AppsScript.gs  … 予約バックエンド（Google Apps Script。デプロイ手順はファイル冒頭のコメント参照）
├─ public/
│  └─ images/
│     ├─ fv/         … FVのBefore/After、共感ブロックの実写
│     ├─ cases/       … お客様ストーリー（Before/After、2ショット）
│     ├─ reviews/    … Google/HPB口コミスクリーンショット（横スクロール用）
│     ├─ staff/       … スタッフ写真、施術写真、既存店舗の実写
│     └─ diagrams/    … 「ニキビが繰り返す理由」図解、肌改善レポートのモック（1枚画像として制作するもの）
├─ docs/
│  └─ lp-spec.md      … 制作仕様書（原本）
└─ README.md
```

## プレビュー方法

ビルド不要。`src/index.html` をブラウザで直接開くか、簡易サーバーで確認する。

```bash
cd src
python -m http.server 8000
```

`http://localhost:8000/index.html` を開き、スマホ幅（375px程度）の表示を確認する。

## 画像の差し替え方

各画像は `public/images/` 配下の該当フォルダにファイルを置き、`src/index.html` 内の対応する `<img src="...">` のパスをそのファイル名に書き換えるだけでよい。

- 画像ファイルが存在しない間は、点線枠＋説明ラベルのプレースホルダーが自動表示される（`script.js` の `initImagePlaceholders`）。
- ファイルを配置すると自動的に画像表示に切り替わる（コード変更不要）。
- **同じファイル名のまま画像を差し替えた場合**（例：`fv-full.png`を新しいデザインで上書き）、ブラウザが古い画像をキャッシュしたままにすることがある。その場合は`src/index.html`内の該当`<img src="...">`の末尾に`?v=数字`を付け、その数字を1つ上げること（例：`fv-full.png?v=2` → `fv-full.png?v=3`）。これによりURLが変わり、ブラウザは必ず新しいファイルを取得し直す。JS側で自動的に付与する方式は、初回に古い画像が一瞬表示されてから新しい画像に切り替わる二段階読み込みを生み、かえって「差し替え直後だけ画像が二重に見える」瞬間を作ってしまうため採用していない。
- 仕様書の原則どおり、実写が用意できていない箇所を仮のAI生成画像や無関係な画像で埋めないこと。
- BLOCK08（店舗基本情報）は高田馬場駅徒歩1分・完全個室・営業時間11:00〜20:00で確定済み。「完全個室」「駅徒歩1分」の実在性を裏付けるため、店内写真3枚（`store-photo-01.jpg`＝外観／`store-photo-02.jpg`＝個室の施術ルーム／`store-photo-03.jpg`＝受付・待合スペース）を横スワイプのギャラリーで表示する構成。現在は3枚とも未配置のプレースホルダー。

| フォルダ | 用途 | 想定ファイル例 |
| --- | --- | --- |
| `fv/` | FVのBefore/After、共感ブロックの実写 | `hero-before-after-01.jpg`, `empathy-visual.jpg` |
| `cases/` | お客様ストーリー2〜3名分 | `case-01-before-after.jpg`, `case-01-with-staff.jpg` |
| `reviews/` | Google/HPB口コミスクショ（BLOCK07で1件ずつ大きく表示）／口コミ抜粋（BLOCK02で横スクロール） | `google-takadanobaba-01.jpg`, `hpb-takadanobaba-01.jpg`, `reassure-review-01.png` |
| `staff/` | スタッフ・施術・既存店舗の実写（`store-photo-01〜03.jpg`はBLOCK08の店内ギャラリー用、`staff.jpg`はBLOCK10.5のスタッフ紹介用） | `herb-peeling-treatment-01.jpg`, `store-photo-01.jpg`, `staff.jpg` |
| `diagrams/` | 完成画像として制作する図解・レポートモック | `why-acne-repeats.png`, `skin-report-mock.png` |

## 予約システムのセットアップ（Googleスプレッドシート + Apps Script）

LP内の「空き状況を見て予約する」CTAは、Hot Pepper Beautyへ遷移させず、独自管理の予約枠データを使ってLP内で予約を完結させる仕組み。

1. Googleスプレッドシートを新規作成し、`backend/AppsScript.gs` 冒頭のコメントに従って「Slots」「Bookings」の2シートを用意する（`backend/Slots_template.csv` / `backend/Bookings_template.csv` をそれぞれのシートにインポートするとヘッダー行とサンプル枠がそのまま入るので早い）。
2. 拡張機能 > Apps Script に `backend/AppsScript.gs` の内容を貼り付け、`NOTIFY_EMAIL` を実際の通知先に書き換える。
3. ウェブアプリとしてデプロイし、発行されたURLを `src/script.js` の `RESERVE_CONFIG.webAppUrl` に設定する。
4. スタッフは「Slots」シートを直接編集して、LPに出す予約可能枠を追加・管理する。
5. **重要な運用ルール**：Hot Pepper Beauty経由で予約が入った場合、スタッフは同じ日時の行を「Slots」シートで手動で `booked` に変更する。これによりLPとHPBの二重予約を防ぐ（HPBの空き状況をLP側が自動取得することはしない）。
6. LP経由の予約が確定した通知はスタッフへメールで届く。Salon Boardへの登録は、その通知を受けてスタッフが手動で行う（自動連携は行わない）。
7. `backend/AppsScript.gs` の `buildManageUrl()` 内の `LP_BASE_URL` を、実際に公開するLPのURL（`src/`が置かれるドメイン）に書き換える。これにより、予約完了時に発行される管理リンクが正しい `manage.html` を指すようになる。

### 予約の日時変更・キャンセル（manage.html）

予約完了画面に表示される管理リンク（`manage.html?t=トークン`）から、予約した本人が来店前日23:59まで日時変更・キャンセルを行える。当日分の変更・キャンセルはこのページからはできない仕様（バックエンド側の `isChangeAllowed` が判定）で、その場合は電話等の別対応に誘導する文言が表示される。この「前日まで変更・キャンセル可能」という事実は、LP本体（BLOCK10の安心材料・BLOCK11の最終CTA周り）でもそのまま訴求文言として使っている。

## Meta Pixel（広告CV計測）

`index.html` の `<head>` にMeta Pixelのベースコードを埋め込み済み。`REPLACE_META_PIXEL_ID` を実際のピクセルIDに書き換えるだけで有効になる（ドメインが未確定でも動作する。ドメイン確定後はMeta Business Manager側でそのドメインを登録すること）。`src/script.js` の予約完了処理内で `fbq("trackCustom", "ReservationComplete", ...)` を発火するので、Meta Ads Managerでカスタムコンバージョン「ReservationComplete」を設定すること。

## 実装上守っていること（仕様書より）

- BLOCK01〜11の順序・コピー・CTA文言は仕様書のまま変更していない（BLOCK10の予約枠選択・予約フォームは仕様書で定義した新規ブロック）。
- 1ブロック1メッセージ、情報ヒエラルキー（最重要→証拠→補足→CTA）を各セクションで維持。
- カラーは白〜クリーム（ベース）／淡いグリーン（ブランド）／赤（4,980円などの重要情報のみ）／黒〜濃グレー（本文）の3系統に限定。
- カードUIの連発、汎用アイコン・絵文字、丸→矢印→丸のHTML図解は使用していない。
- BLOCK05の図解とBLOCK06内の肌改善レポートは完成画像として差し替える前提のプレースホルダー。
- スマホファーストでCSSを記述し、`min-width: 768px` のメディアクエリで余白・文字サイズのみ補強。
- Hot Pepper Beautyの空き状況スクレイピング、Salon Boardへの自動予約登録は行っていない（規約・二重予約リスクを避けるための確定方針）。
