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

## 骨組み

```
key-exchange-lp/src/
├─ index.html  … LP本体（BLOCK0〜16。構造化データ Locksmith / FAQPage 入り）
├─ style.css   … スマホファーストの仮デザイン
└─ script.js   … 固定CTAの表示制御、電話・LINEタップのGA4イベント
```

プレビュー：

```bash
cd key-exchange-lp/src && python -m http.server 8001
# http://localhost:8001/ をスマホ幅で確認
```

## 差し替えルール

- `{屋号}` `{地域}` `{市区町村A}` `◯◯円` `0120-000-000` `【要確認】` はすべて仮。ヒアリング後に置換する
- 電話番号は `tel:` リンク・表示・JSON-LD・フッターの**4か所すべて**を同じ番号にする
- FAQを変更したら `<head>` 内の FAQPage JSON-LD も同じ文言に揃える
- 作業事例・口コミは実在のものが揃うまで `hidden` のまま（ダミーで埋めない）
