/* ==========================================================================
   新トップ案（2つの入口）を WordPress の固定ページ「下書き」として作る／更新する
   使い方：WordPressの「固定ページを追加」画面（ブロックエディター）を開き、
   ブラウザの開発者ツールのコンソールで、このファイルの中身と new-top.css を渡して実行する。
     await kmBuildNewTop(cssText)
   ブロックは createBlock で組み立てるので、エディターで「ブロックが壊れている」表示にならない。
   公開はしない（status: draft）。同じスラッグの下書きがあれば上書きする。
   ========================================================================== */
async function kmBuildNewTop(cssText) {
  const B = (name, attrs = {}, inner = []) => wp.blocks.createBlock(name, attrs, inner);
  const P = (content, className) => B("core/paragraph", { content, className });
  const H = (content, level = 2) => B("core/heading", { content, level });
  const L = (items, className, ordered = false) =>
    B("core/list", { ordered, className }, items.map((content) => B("core/list-item", { content })));
  const T = (rows, className) =>
    B("core/table", {
      className,
      body: rows.map((r) => ({ cells: [{ content: r[0], tag: "th" }, { content: r[1], tag: "td" }] })),
    });
  const G = (className, inner, anchor) => B("core/group", { className, anchor }, inner);
  const BTN = (className, items) =>
    B("core/buttons", { className }, items.map(([text, url, cls]) => B("core/button", { text, url, className: cls })));
  const D = (q, a) => B("core/details", { summary: q }, [P(a)]);
  const TODO = (t = "【要確認】") => `<span class="km-todo">${t}</span>`;

  const TEL = "tel:07091861366";
  const telButton = BTN("km-tel", [["<small>24時間受付・年中無休</small>070-9186-1366", TEL]]);

  const blocks = [
    G("km-lp", [
      // ---- 1. ファーストビュー：2つの入口に分ける ----
      G("km-section km-fv", [
        P("赤羽・北区から都内各地へ駆けつける鍵屋", "km-eyebrow"),
        H("鍵のトラブルも、安否確認の鍵開けも<br>鍵マッハ24", 1),
        P("24時間受付。最短5分で到着し、作業前に総額をお伝えします。", "km-fv__lead"),
        P("<strong>どちらでお困りですか？</strong>"),
        BTN("km-entry", [
          ["<strong>鍵をなくした・開かない</strong>ご本人で、今すぐ家に入りたい方", "#self", "km-entry-self"],
          ["<strong>家族・入居者と連絡が取れない</strong>安否確認の鍵開け（ご家族・大家さん・管理会社）", "#anpi", "km-entry-anpi"],
        ]),
        telButton,
        L(["作業前に<br>総額をお伝え", "見積もり後の<br>キャンセル無料", "24時間<br>365日受付", "中間手数料なし<br>自社スタッフ"], "km-promise"),
      ]),

      // ---- 2. 入口A：ご本人（鍵の紛失・閉め出し・鍵交換） ----
      G("km-section km-self", [
        G("km-self-head", [
          P("鍵をなくした・開かない方へ", "km-eyebrow"),
          H("家の鍵をなくした・家に入れない"),
          P("その場で落ち着いて、お電話ください。場所と鍵の種類をうかがい、到着時間と料金の目安をお伝えします。"),
        ]),
        H("どんなお困りですか？", 3),
        L([
          '<a href="#price">家の鍵をなくした・家に入れない</a>',
          '<a href="#price">締め出された・オートロックで入れない</a>',
          '<a href="#price">鍵が開かない・回らない</a>',
          '<a href="#chintai">賃貸で鍵をなくした</a>',
          '<a href="#koukan">鍵を交換したい</a>',
          '<a href="#price">ディンプルキーの鍵開け・交換</a>',
        ], "km-trouble"),

        G("km-price", [
          H("鍵開け・鍵交換の料金", 3),
          P("表示はすべて<strong>出張費・見積もり費込みの税込総額</strong>です。" + TODO("【要確認：金額】")),
          T([
            ["鍵開け（玄関・一般的な鍵）", "◯◯円"],
            ["鍵開け（ディンプルキー等）", "◯◯円"],
            ["鍵開け（補助錠・室内ドア）", "◯◯円"],
            ["鍵交換（一般シリンダー・部品込み）", "◯◯円〜"],
            ["鍵交換（ディンプルシリンダー・部品込み）", "◯◯円〜"],
            ["鍵の修理（回らない・抜けない）", "◯◯円〜"],
          ]),
          P("深夜・早朝の割増：" + TODO("【要確認：あり◯円／なし】") + "<br>「〜」の料金は鍵の種類・部品代で変わります。必ず作業前に総額をお伝えします。", "km-note"),
        ], "price"),

        H("料金が後から増えない3つのルール", 3),
        L([
          "<strong>作業前に、総額をお伝えします。</strong>到着後に鍵の状態を確認し、作業に入る前に最終金額を提示します。",
          "<strong>ご納得いただけなければ0円です。</strong>見積もり後のキャンセルに費用はかかりません。",
          "<strong>提示した金額以上は請求しません。</strong>追加の作業が必要なときは、必ず先にご相談します。",
        ], "km-steps", true),

        H("お電話から作業完了まで", 3),
        L([
          "<strong>お電話</strong>　場所と鍵の状況をうかがい、到着時間と料金の目安をお伝えします。",
          "<strong>到着</strong>　最短5分、平均5〜20分。到着前にスタッフからお電話します。",
          "<strong>本人確認・お見積もり</strong>　防犯のため身分証を確認します。身分証が室内にある場合は、開けた後に確認します。",
          "<strong>作業</strong>　ご了承いただいてから始めます。",
          "<strong>お支払い</strong>　" + TODO("【要確認：現金・カード・QR決済】"),
        ], "km-steps", true),

        G("km-box", [
          H("賃貸で鍵をなくした方へ", 3),
          P("賃貸の場合は、管理会社か大家さんにも連絡してください。合鍵があるか、鍵を交換するときのルールがあるかを確認できます。夜間で連絡がつかないときは、先に鍵開けだけ行い、交換は管理会社と相談してからでも大丈夫です。"),
        ], "chintai"),

        G("km-box", [
          H("鍵をなくしたら、鍵交換もご検討ください", 3),
          P("住所が分かる物と一緒に落とした場合は、悪用を防ぐために鍵交換をおすすめします。鍵開けと同じ日に交換もできます。"),
          P("鍵交換（一般シリンダー・部品込み）：◯◯円〜　" + TODO()),
        ], "koukan"),

        H("鍵をなくしたら、まずやること", 3),
        L([
          "<strong>最後に鍵を使った場所を思い出す。</strong>立ち寄った店・駅・職場に問い合わせます。",
          "<strong>警察に遺失届を出す。</strong>交番や警察署で届け出できます。",
          "<strong>賃貸なら管理会社・大家さんへ連絡する。</strong>",
          "<strong>どうしても入れないときは鍵屋へ。</strong>24時間受付しています。",
        ], "km-steps", true),
        telButton,
      ], "self"),

      // ---- 3. 入口B：安否確認の鍵開け ----
      G("km-section km-anpi", [
        G("km-anpi-head", [
          P("家族・入居者と連絡が取れない方へ", "km-eyebrow"),
          H("安否確認の鍵開け"),
          P("離れて暮らす親と連絡が取れない。入居者と連絡がつかない。そんなときは、まず警察に相談してください。部屋に入る必要があるとき、鍵マッハ24が駆けつけて鍵を開けます。"),
        ]),
        H("警察への頼み方と、鍵屋を呼ぶ流れ", 3),
        L([
          "<strong>警察に相談する。</strong>命に関わりそうなときは110番。そうでなければ、お住まいの地域の警察署に相談します。",
          "<strong>部屋に入るかを決める。</strong>警察の判断で、ご家族や管理会社の立ち会いのもと進みます。",
          "<strong>鍵屋を呼ぶ。</strong>合鍵がないときは、鍵マッハ24にお電話ください。警察から鍵屋の手配を頼まれることもあります。",
          "<strong>開けた後まで対応します。</strong>確認後の施錠、必要なら鍵交換まで行います。",
        ], "km-steps", true),
        P("※実際の手順は、警察の判断や状況によって変わります。", "km-note"),

        H("ご依頼いただける方", 3),
        L([
          "ご家族・ご親族",
          "大家さん・管理会社",
          "会社の総務・人事のご担当者",
          "警察からのご依頼",
        ]),
        P("防犯のため、ご依頼の方とお部屋の関係を確認します（身分証、賃貸借契約書など）。" + TODO("【要確認：必要な書類】"), "km-note"),

        H("安否確認の鍵開けの料金", 3),
        T([
          ["安否確認の鍵開け", "◯◯円"],
          ["警察の到着を待つ時間", TODO("【要確認：無料／◯分ごと◯円】")],
          ["開けた後の施錠・鍵交換", "◯◯円〜"],
        ]),

        G("km-box", [
          H("管理会社・大家さん・法人の方へ", 3),
          P("入居者や社員と連絡が取れないときの鍵開けを、継続してお任せいただけます。請求書でのお支払い、作業報告書の発行に対応します。" + TODO()),
        ]),
        telButton,
      ], "anpi"),

      // ---- 4. 選ばれる理由 ----
      G("km-section", [
        H("鍵マッハ24が選ばれる理由"),
        L([
          "<strong>都内各地に10数名のスタッフが待機。</strong>最短5分、平均5〜20分で到着します。",
          "<strong>中間手数料なし。</strong>自社のスタッフが直接うかがいます。",
          "<strong>作業前に総額をお伝えします。</strong>ご納得いただけなければキャンセル無料です。",
          "<strong>警察の立ち会いでの作業にも慣れています。</strong>" + TODO(),
        ], "km-steps", true),
      ]),

      // ---- 5. 対応エリア ----
      G("km-section", [
        H("対応エリアと到着の目安"),
        P("赤羽・北区を中心に、東京都内に対応しています。"),
        T([
          ["北区（赤羽・王子・十条）", "約◯分"],
          ["板橋区", "約◯分"],
          ["足立区", "約◯分"],
          ["豊島区・練馬区・荒川区", "約◯分"],
          ["川口市", "約◯分"],
        ], "km-area-table"),
        P("到着時間は目安です。道路状況により前後します。" + TODO("【要確認：到着目安と対応エリア】"), "km-note"),
      ]),

      // ---- 6. よくある質問 ----
      G("km-section", [
        H("よくある質問"),
        D("鍵開けの料金はいくらですか？", "玄関の一般的な鍵は◯◯円（出張費・見積もり費込み、税込）です。到着後、作業前に総額をお伝えします。"),
        D("見積もり後にキャンセルできますか？", "はい。金額にご納得いただけない場合、キャンセル料はかかりません。"),
        D("到着までどのくらいかかりますか？", "最短5分、平均5〜20分ほどです。お電話の際に目安をお伝えします。"),
        D("身分証が必要ですか？", "防犯のため、鍵開けの際はご本人確認をお願いしています。身分証が室内にある場合は、開けた後にご提示いただきます。"),
        D("鍵を壊さずに開けられますか？", "ほとんどの鍵は壊さずに開けられます。壊す必要があるときは、作業前に必ずご説明し、ご了承をいただいてから行います。"),
        D("賃貸で鍵をなくしました。勝手に開けてもいいですか？", "鍵開けは入居者ご本人からのご依頼で行えます。鍵交換は、管理会社や大家さんのルールを確認してから行うのがおすすめです。"),
        D("安否確認のとき、警察の立ち会いは必要ですか？", "状況によって異なります。まず警察に相談し、警察の判断に沿って進めてください。鍵マッハ24は、警察やご家族の立ち会いのもとで作業します。"),
        D("深夜でも来てもらえますか？", "24時間365日受付しています。" + TODO("【要確認：深夜の体制と割増】")),
      ]),

      // ---- 7. 最後の電話 ----
      G("km-section km-cta", [
        H("鍵のトラブル・安否確認、今すぐご相談ください"),
        P("作業前に総額をお伝えします。お見積もり後のキャンセルは無料です。"),
        telButton,
      ]),
    ]),
  ];

  const content = wp.blocks.serialize(blocks);
  const SLUG = "new-top-draft";
  const found = await wp.apiFetch({ path: `/wp/v2/pages?status=draft&slug=${SLUG}&context=edit&_fields=id` });
  const data = {
    title: "新トップ案（2つの入口）",
    slug: SLUG,
    status: "draft",
    content,
    meta: {
      _veu_custom_css: cssText,
      _lightning_design_setting: { layout: "col-one-no-subsection", site_body_padding: "" },
    },
  };
  const page = found.length
    ? await wp.apiFetch({ path: `/wp/v2/pages/${found[0].id}`, method: "POST", data })
    : await wp.apiFetch({ path: "/wp/v2/pages", method: "POST", data });
  return { id: page.id, status: page.status, link: page.link, length: content.length };
}
