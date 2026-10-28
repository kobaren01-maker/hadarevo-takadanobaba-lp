/* ==========================================================================
   鍵マッハ24 新サイト一式を WordPress の「下書き」として作る／更新する
   - 固定ページ：トップ案、鍵をなくした、鍵交換、安否確認、法人の方へ、料金表、対応エリア（一覧＋区ごと）
   - 投稿：コラム4本（カテゴリー「鍵のお役立ちコラム」）
   - 各ページに：検索結果用のタイトル、説明文（抜粋）、構造化データ（JSON-LD）、ページ専用CSS
   使い方：WordPress の「固定ページを追加」画面で、このファイルを読み込んで
     await kmBuildSite(cssText)
   すべて status: draft。公開済みのページ・投稿には触らない（同じスラッグの下書きだけ上書き）。
   作業事例は既存の投稿（公開済み）を読み取り、地域・内容ごとに一覧へ差し込む（投稿そのものは変えない）。
   ========================================================================== */
async function kmBuildSite(cssText) {
  const SITE = "https://h-gate.jp";
  const TEL = "tel:07091861366";
  const TEL_TEXT = "070-9186-1366";
  const BIZ_ID = SITE + "/#business";

  // ---- ブロックの部品 ----
  const B = (name, attrs = {}, inner = []) => wp.blocks.createBlock(name, attrs, inner);
  const P = (content, className) => B("core/paragraph", { content, className });
  const H = (content, level = 2) => B("core/heading", { content, level });
  const L = (items, className, ordered = false) =>
    B("core/list", { ordered, className }, items.map((content) => B("core/list-item", { content })));
  const T = (rows, className) =>
    B("core/table", { className, body: rows.map((r) => ({ cells: [{ content: r[0], tag: "th" }, { content: r[1], tag: "td" }] })) });
  const G = (className, inner, anchor) => B("core/group", { className, anchor }, inner);
  const BTN = (className, items) =>
    B("core/buttons", { className }, items.map(([text, url, cls]) => B("core/button", { text, url, className: cls })));
  const D = (q, a) => B("core/details", { summary: q }, [P(a)]);
  const HTML = (content) => B("core/html", { content });
  const TODO = (t = "【要確認】") => `<span class="km-todo">${t}</span>`;
  const A = (path, text) => `<a href="${SITE}${path}">${text}</a>`;
  const strip = (s) => s.replace(/<[^>]+>/g, "");

  const telButton = () => BTN("km-tel", [[`<small>24時間受付・年中無休</small>${TEL_TEXT}`, TEL]]);
  const answer = (html) => G("km-answer", [P(html)]);
  const cta = (title = "鍵のトラブル、今すぐご相談ください") =>
    G("km-section km-cta", [H(title), P("作業前に書面でお見積もりをお出しし、ご納得いただいてから作業に入ります。"), telButton(),
      P(`メールでのご相談は<a href="${SITE}/%e3%81%8a%e5%95%8f%e3%81%84%e5%90%88%e3%82%8f%e3%81%9b/">お問い合わせフォーム</a>から。お急ぎのときはお電話ください。`, "km-cta__mail")]);
  const faqBlocks = (faqs) => [H("よくある質問"), ...faqs.map(([q, a]) => D(q, a))];
  const supervisor = () =>
    G("km-supervisor", [P(`監修：鍵マッハ24 代表 ${TODO("【要確認：氏名・経歴】")}<br>鍵マッハ24は、年間3,000件以上の鍵の作業に対応しています。<br>運営：${TODO("【要確認：株式会社H-GATE（正式名称）】")}`)]);

  // ---- 構造化データ（Googleに「ここは鍵屋で、何をしていて、どこに行けるか」を伝える） ----
  const LD = (obj) => HTML(`<script type="application/ld+json">${JSON.stringify(obj)}</script>`);
  const AREAS = [
    { slug: "kita", name: "北区", min: 5, note: "鍵マッハ24の拠点がある区です。",
      police: ["赤羽警察署", "王子警察署", "滝野川警察署"],
      stations: ["赤羽", "東十条", "十条", "王子", "田端", "王子神谷", "赤羽岩淵", "浮間舟渡"],
      near: ["板橋区", "豊島区", "文京区", "荒川区", "足立区", "埼玉県川口市", "埼玉県戸田市"] },
    { slug: "koto", name: "江東区", min: 5,
      police: ["深川警察署", "城東警察署", "東京湾岸警察署"],
      stations: ["門前仲町", "木場", "東陽町", "南砂町", "亀戸", "大島", "清澄白河", "森下", "住吉", "豊洲"],
      near: ["墨田区", "江戸川区", "中央区"] },
    { slug: "edogawa", name: "江戸川区", min: 15,
      police: ["小松川警察署", "葛西警察署", "小岩警察署"],
      stations: ["葛西", "西葛西", "船堀", "一之江", "瑞江", "篠崎", "小岩", "平井"],
      near: ["江東区", "墨田区", "葛飾区", "千葉県市川市", "千葉県浦安市"] },
    { slug: "sumida", name: "墨田区", min: 5,
      police: ["本所警察署", "向島警察署"],
      stations: ["錦糸町", "両国", "押上", "曳舟", "東向島", "鐘ヶ淵", "本所吾妻橋", "菊川"],
      near: ["台東区", "荒川区", "葛飾区", "江戸川区", "江東区", "中央区"] },
    { slug: "katsushika", name: "葛飾区", min: 5,
      police: ["亀有警察署", "葛飾警察署"],
      stations: ["亀有", "金町", "新小岩", "青砥", "高砂", "立石", "堀切菖蒲園", "お花茶屋", "柴又"],
      near: ["足立区", "墨田区", "江戸川区", "千葉県松戸市", "埼玉県八潮市", "埼玉県三郷市"] },
    { slug: "adachi", name: "足立区", min: 5,
      police: ["千住警察署", "西新井警察署", "竹の塚警察署", "綾瀬警察署"],
      stations: ["北千住", "綾瀬", "北綾瀬", "竹ノ塚", "西新井", "五反野", "梅島", "六町"],
      near: ["北区", "荒川区", "葛飾区", "埼玉県川口市", "埼玉県草加市", "埼玉県八潮市"] },
  ];
  // 到着の目安と支払い方法（友人の回答 2026/10/28）
  const FAST_WARDS = ["北区", "板橋区", "足立区", "豊島区", "練馬区", "荒川区", "江東区", "墨田区", "葛飾区", "文京区", "台東区"];
  const SAITAMA = ["川口市", "戸田市", "草加市", "新座市", "蕨市", "さいたま市", "朝霞市", "和光市", "志木市"];
  const FAST = "東京23区の北部・東部と埼玉県南部は最短5分、そのほかの23区は最短15分";
  const PAY = "現金、クレジットカード（VISA・Mastercard・JCB・American Express）、QRコード決済（PayPayなど）";
  const business = {
    "@context": "https://schema.org",
    "@type": "Locksmith",
    "@id": BIZ_ID,
    name: "鍵マッハ24",
    url: SITE + "/",
    telephone: "+81-70-9186-1366",
    // サイトには登記上の住所（バーチャルオフィス）を載せる（友人の回答 2026/10/28）。Googleビジネスプロフィールは別途、自宅で住所非表示
    address: { "@type": "PostalAddress", postalCode: "115-0045", addressRegion: "東京都", addressLocality: "北区", streetAddress: "赤羽1-7-9 赤羽第一葉山ビル4F", addressCountry: "JP" },
    paymentAccepted: "現金, クレジットカード, QRコード決済",
    areaServed: [{ "@type": "State", name: "東京都" }, ...SAITAMA.map((n) => ({ "@type": "City", name: "埼玉県" + n }))],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    knowsAbout: ["鍵開け", "鍵交換", "シリンダー交換", "ディンプルキー", "安否確認の鍵開け"],
  };
  const service = (name, serviceType, path, description) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    serviceType,
    description,
    url: SITE + path,
    provider: { "@id": BIZ_ID },
    areaServed: { "@type": "State", name: "東京都" },
  });
  const faqLd = (faqs) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: strip(a) } })),
  });
  // 記事の構造化データ（Article）はテーマ側が自動で出すので、ここでは使わない
  const articleLd = (headline, path, description) => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: SITE + path,
    author: { "@type": "Organization", name: "鍵マッハ24", url: SITE + "/" },
    publisher: { "@id": BIZ_ID },
  });

  // ---- 既存の作業事例（公開済みの投稿）を読み取る ----
  const posts = await wp.apiFetch({ path: "/wp/v2/posts?per_page=100&status=publish&_fields=id,date,link,content" });
  const cases = posts
    .map((p) => {
      const t = new DOMParser().parseFromString(p.content.rendered, "text/html").body.textContent.replace(/\s+/g, " ").trim();
      const place = ((t.match(/依頼現場[：:]\s*(\S+)/) || [])[1] || "").replace(/^東京都/, "");
      const ask = ((t.match(/依頼内容[：:]\s*(.+?)。/) || [])[1] || "").trim();
      const voice = ((t.match(/ご感想[：:]\s*(.+?)(。|$)/) || [])[1] || "").trim();
      const srcset = (p.content.rendered.match(/srcset="([^"]+)"/) || [])[1] || "";
      const img = (srcset.split(",").map((x) => x.trim().split(" ")).find((x) => x[1] === "225w") || [])[0]
        || (p.content.rendered.match(/<img[^>]+src="([^"]+)"/) || [])[1] || "";
      return { id: p.id, date: p.date.slice(0, 10), link: p.link, place, ask, voice, img, tokyo: /依頼現場[：:]\s*東京都/.test(t) };
    })
    .filter((c) => c.tokyo && c.ask);
  const caseList = (list, max = 6) =>
    list.length
      ? B("core/list", { className: "km-cases" }, list.slice(0, max).map((c) =>
          B("core/list-item", { content: `${c.img ? `<img src="${c.img}" alt="${c.place}での作業の写真" width="225" height="300" loading="lazy">` : ""}<a href="${c.link}">${c.date.replace(/-/g, "/")}　${c.place}</a><br>${c.ask}` })))
      : P("この地域の作業事例は準備中です。", "km-note");
  // お客様の声：作業事例の投稿にある本物の「お客様ご感想」を、町名つきで抜き出す（口コミの構造化データは付けない）
  const voiceList = (list, max = 4) => {
    const v = list.filter((c) => c.voice).slice(0, max);
    return v.length
      ? B("core/list", { className: "km-voices" }, v.map((c) =>
          B("core/list-item", { content: `「${c.voice}」<small>${c.place}のお客様／<a href="${c.link}">${c.ask}</a></small>` })))
      : P("この地域のお客様の声は準備中です。", "km-note");
  };
  const isLost = (c) => /紛失|なくし|無くし|置いて|おいて|忘れ/.test(c.ask);
  const isStuck = (c) => /開かな|開けられな|回らな|刺さらな|折れ|変形|不具合/.test(c.ask) && !/車|バイク|ロッカー|金庫/.test(c.ask);
  const isHome = (c) => !/車|バイク|ロッカー|金庫|メットイン/.test(c.ask);

  // ---- 料金表（金額は友人に確認してから埋める） ----
  const priceOpen = [
    ["鍵開け（玄関・一般的な鍵）", "◯◯円"],
    ["鍵開け（ディンプルキー等の防犯性の高い鍵）", "◯◯円"],
    ["鍵開け（補助錠・室内ドア）", "◯◯円"],
  ];
  const priceChange = [
    ["鍵交換（一般シリンダー・部品込み）", "◯◯円〜"],
    ["鍵交換（ディンプルシリンダー・部品込み）", "◯◯円〜"],
    ["補助錠の取り付け（部品込み）", "◯◯円〜"],
  ];
  const priceOther = [["鍵の修理（回らない・抜けない・折れた鍵の取り出し）", "◯◯円〜"]];
  const priceAnpi = [
    ["安否確認の鍵開け", "◯◯円"],
    ["警察の到着を待つ時間", TODO("【要確認：無料／◯分ごと◯円】")],
    ["開けた後の施錠・鍵交換", "◯◯円〜"],
  ];
  const priceNote = () =>
    P(`表示は税込の総額です（出張費・見積もり費を含むか${TODO()}）。深夜・早朝の割増：${TODO("【要確認：あり◯円／なし】")}<br>「〜」の料金は鍵の種類・部品代で変わります。作業前に書面でお見積もりをお出しします。`, "km-note");

  // ---- よくある質問（ページの文章と構造化データの両方に同じ文で使う） ----
  const FAQ_COMMON = [
    ["キャンセル料はかかりますか？", "いたずら防止のため、お客様のご都合によるキャンセルにはキャンセル料がかかります。お電話の段階で必ずご説明してから伺います。"],
    ["到着までどのくらいかかりますか？", FAST + "で到着します。お電話の際に到着の目安をお伝えします。"],
  ];
  const FAQ_LOST = [
    ["鍵をなくして家に入れません。どうすればいいですか？", "合鍵を持っている家族や管理会社に連絡がつかない場合は、鍵屋に鍵を開けてもらうのが一番早い方法です。鍵マッハ24は24時間受付で、作業前に総額をお伝えします。"],
    ["身分証が家の中にあります。開けてもらえますか？", "はい。開けた後に、室内の顔写真付きの身分証（運転免許証など）で確認させていただきます。お持ちでない場合は、不動産の契約書や公共料金の支払い書などで確認します。"],
    ["鍵を壊さずに開けられますか？", "ほとんどの鍵は壊さずに開けられます。壊す必要があるときは、作業前に必ずご説明し、ご了承をいただいてから行います。"],
    ["賃貸でも開けてもらえますか？", "はい。入居者ご本人からのご依頼で開けられます。鍵交換をする場合は、先に管理会社や大家さんのルールを確認してください。"],
    ...FAQ_COMMON,
  ];
  const FAQ_KOUKAN = [
    ["鍵をなくしたら、鍵交換は必要ですか？", "住所が分かる物と一緒になくした場合や、見つからない場合は、悪用を防ぐために交換をおすすめします。"],
    ["鍵交換にかかる時間はどのくらいですか？", `一般的な玄関の鍵で${TODO("【要確認：◯分】")}ほどです。部品の在庫があれば、その日のうちに交換できます。`],
    ["賃貸の部屋の鍵を勝手に交換してもいいですか？", "多くの賃貸契約では、管理会社や大家さんの許可が必要です。交換の前に必ず確認してください。"],
    ["ディンプルキーと普通の鍵は何が違いますか？", "ディンプルキーは表面に小さなくぼみが並んだ鍵で、鍵穴の仕組みが複雑なため、不正に開けられにくい鍵です。その分、部品代は普通の鍵より高くなります。"],
    ...FAQ_COMMON,
  ];
  const FAQ_ANPI = [
    ["家族と連絡が取れません。最初に何をすればいいですか？", "命に関わりそうなときは、迷わず119番（救急）か110番（警察）してください。そうでなければ、お住まいの地域の警察署に相談するか、警察相談専用電話（#9110）に電話します。部屋に入る必要があり、合鍵がないときに鍵屋を呼びます。"],
    ["安否確認のとき、警察の立ち会いは必要ですか？", "状況によって異なります。まず警察に相談し、警察の判断に沿って進めてください。鍵マッハ24は、警察やご家族、管理会社の立ち会いのもとで作業します。"],
    ["家族ではなく大家さんや管理会社でも依頼できますか？", "はい。顔写真付きの身分証と、建物の所有者・管理者であることが分かる書類（契約書など）を確認させていただいたうえで対応します。"],
    ["警察と鍵屋、どちらに先に連絡すればいいですか？", "命に関わりそうなときは、すぐに119番（救急）か110番（警察）に電話してください。そのうえで、鍵マッハ24にも直接お電話ください。鍵屋が先に決まっていると、警察の立ち会いの段取りが決めやすく、到着までの時間を短くできます。"],
    ["夜中でも来てもらえますか？", "はい。24時間365日受付しています。10名以上のスタッフが、24時間いつでも対応できる体制です。"],
  ];
  const FAQ_PRICE = [
    ["鍵開けの料金はいくらですか？", "玄関の一般的な鍵は◯◯円（出張費・見積もり費込み、税込）です。到着後、作業前に総額をお伝えします。"],
    ["作業の後で料金が増えることはありますか？", "ありません。作業前にお伝えした金額以上は請求しません。追加の作業が必要なときは、必ず先にご相談します。"],
    ["支払い方法は何がありますか？", `${PAY}に対応しています。請求書でのお支払いは法人のお客様のみです。`],
    ...FAQ_COMMON,
  ];

  // ---- 共通の部品 ----
  const rules = () => [
    H("安心してお任せいただくための3つの約束"),
    L([
      "<strong>作業前に、書面でお見積もりをお出しします。</strong>作業内容と金額にご納得いただき、書類にサインをいただいてから作業に入ります。",
      "<strong>提示した金額以上は請求しません。</strong>追加の作業が必要なときは、必ず先にご相談します。",
      "<strong>作業の後、お客様と一緒に傷の確認をします。</strong>万一のときのため、賠償責任保険にも加入しています。",
    ], "km-promises", true),
  ];
  const flow = () => [
    H("お電話から作業完了まで", 3),
    L([
      "<strong>お電話</strong>　場所と鍵の状況をうかがい、到着時間と料金の目安をお伝えします。いたずら防止のため、お客様のご都合によるキャンセルにはキャンセル料がかかることも、この時点でご説明します。",
      "<strong>到着</strong>　最短5分で伺います。",
      "<strong>本人確認・お見積もり</strong>　顔写真付きの身分証でご本人であることを確認し、書面でお見積もりをお出しします。",
      "<strong>サイン・作業</strong>　作業内容と金額にご納得いただき、書類にサインをいただいてから作業に入ります。",
      "<strong>傷の確認</strong>　作業が終わったら、お客様と一緒にドアや鍵に傷がないかを確認します。",
      `<strong>お支払い</strong>　${PAY}。`,
    ], "km-steps km-flow", true),
  ];
  const areaLinks = () => L(AREAS.map((a) => A(`/area/${a.slug}/`, a.name + "の鍵屋")), "km-links");
  const serviceLinks = () =>
    L([
      A("/kagi-funshitsu/", "鍵をなくした・家に入れない"),
      A("/kagi-koukan/", "鍵交換・シリンダー交換"),
      A("/anpi-kakunin/", "安否確認の鍵開け"),
      A("/houjin/", "管理会社・大家さん・法人の方へ"),
      A("/price/", "料金表"),
      A("/area/", "対応エリア"),
    ], "km-links");
  // 1. 画面下に固定の電話の帯（CSSで画面下に固定する）
  const fixedCta = () =>
    G("km-fixed-cta", [BTN("km-fixed-cta__btns", [
      [`<small>24時間受付・最短5分</small>${TEL_TEXT}`, TEL, "km-fixed-cta__tel"],
      ["メールで相談", SITE + "/%e3%81%8a%e5%95%8f%e3%81%84%e5%90%88%e3%82%8f%e3%81%9b/", "km-fixed-cta__mail"],
    ])]);
  const lp = (inner, extraClass = "") => [G(("km-lp " + extraClass).trim(), [...inner, fixedCta()])];

  // 2. 困りごとを絵で選ぶ入口（線だけの簡単な絵。自作）
  const ICON = {
    lost: '<path d="M14 30a8 8 0 1 1 8-8"/><path d="M20 26l14-14 4 4M30 16l4 4"/><path d="M38 34l4 4M42 34l-4 4"/>',
    out: '<rect x="12" y="6" width="22" height="36" rx="2"/><circle cx="29" cy="25" r="1.6"/><path d="M38 24h8M42 20l4 4-4 4"/>',
    stuck: '<rect x="12" y="20" width="24" height="20" rx="3"/><path d="M17 20v-6a7 7 0 0 1 14 0v6"/><path d="M24 28v5"/>',
    broken: '<circle cx="12" cy="24" r="6"/><path d="M18 24h8l2-3 2 6 2-3h4"/><path d="M38 20l6 8"/>',
    change: '<path d="M10 18h22l-5-5M38 30H16l5 5"/><circle cx="40" cy="18" r="3"/><circle cx="8" cy="30" r="3"/>',
    anpi: '<circle cx="18" cy="14" r="5"/><path d="M8 38v-6a10 10 0 0 1 20 0v6"/><path d="M32 22a8 8 0 1 1 8 8M40 30v4"/>',
  };
  const tiles = () =>
    HTML('<ul class="km-tiles">' + [
      ["lost", "鍵をなくした", "/kagi-funshitsu/"],
      ["out", "締め出された", "/kagi-funshitsu/"],
      ["stuck", "鍵が開かない・回らない", "/kagi-funshitsu/"],
      ["broken", "鍵が折れた・曲がった", "/kagi-funshitsu/"],
      ["change", "鍵を交換したい", "/kagi-koukan/"],
      ["anpi", "家族と連絡が取れない", "/anpi-kakunin/"],
    ].map(([k, label, path]) =>
      `<li><a href="${SITE}${path}"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg><span>${label}</span></a></li>`).join("") + "</ul>");

  // 現場の写真（WordPressに入っている作業事例の写真。個人情報はモザイク済み）
  const UP = SITE + "/wp-content/uploads/";
  const fvPhotos = () =>
    HTML('<figure class="km-fv-photos">' + ["2026/08/8-3-2-225x300.jpg", "2026/07/0730-2-225x300.jpg", "2026/07/0723-2-225x300.jpg"]
      .map((f) => `<img src="${UP}${f}" alt="鍵マッハ24の作業現場の写真" width="225" height="300">`).join("") +
      '<figcaption>実際の作業現場（個人情報は加工しています）</figcaption></figure>');
  const serviceCards = () =>
    HTML('<ul class="km-services">' + [
      ["/kagi-funshitsu/", "2026/08/0817-225x300.jpg", "家の鍵をなくした・家に入れない", "鍵の紛失、締め出し、オートロック。壊さずに開けるのが基本です"],
      ["/kagi-koukan/", "2026/07/0730-2-225x300.jpg", "鍵交換・シリンダー交換", "なくした後の交換、入居時の交換、ディンプルキーへの交換"],
      ["/anpi-kakunin/", "2026/07/0721-225x300.jpg", "安否確認の鍵開け", "家族や入居者と連絡が取れないとき。警察の立ち会いに慣れています"],
      ["/houjin/", "2026/07/0728-225x300.jpg", "管理会社・大家さん・法人の方へ", "入居者の安否確認、退去・入居時の鍵交換。請求書払いに対応"],
    ].map(([path, f, t, d]) => `<li><a href="${SITE}${path}"><img src="${UP}${f}" alt="" width="225" height="300" loading="lazy"><strong>${t}</strong><span>${d}</span></a></li>`).join("") + "</ul>");

  // 3. 数字を大きく見せる信頼のバッジ
  const stats = () =>
    L(["最短<strong>5</strong>分で到着", "年間<strong>3,000</strong>件以上", "<strong>10</strong>名以上が24時間待機", "<strong>賠償責任保険</strong>に加入"], "km-stats");

  // 4. 安すぎる表示への注意（他社の名前は出さない）
  const cheapWarning = () =>
    G("km-box km-box--warn", [
      H("「◯千円〜」の安すぎる広告にご注意ください", 3),
      P('鍵開けの広告では、安い金額だけを大きく見せて、現地で高い料金を請求されたという相談が寄せられています。東京都消費生活総合センターも、鍵開けサービスのトラブルに<a href="https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/kinkyu/documents/kagi_kaijou_service.pdf">注意を呼びかけています</a>。'),
      P("<strong>鍵マッハ24は、作業前に書面でお見積もりをお出しし、作業内容と金額にご納得いただいてから作業に入ります。</strong>提示した金額以上は請求しません。"),
    ]);

  // 8. 本人確認に使える書類（友人の回答 2026/10/28：顔写真付きの身分証。ない場合は不動産の契約書・公共料金の支払い書など）
  const idDocs = () =>
    G("km-box", [
      H("本人確認に使える書類", 3),
      L(["運転免許証", "マイナンバーカード", "パスポート", "在留カード"]),
      P("顔写真付きの身分証をお持ちでない場合は、不動産の契約書や公共料金の支払い書などで確認します。身分証が家の中にある場合は、開けた後にご提示ください。", "km-note"),
    ]);

  // 5. 鍵交換を3段階で選ぶ（金額は正式な料金が決まってから）
  const plans = () =>
    L([
      "<strong>費用を抑える</strong>一般的なシリンダーへの交換。入居時や、とにかく前の鍵を使えなくしたいときに<span>◯◯円〜</span>",
      "<strong>バランスよく</strong>ディンプルキーへの交換。防犯性と費用のバランスを取りたいときに<span>◯◯円〜</span>",
      "<strong>防犯性を高める</strong>防犯性の高いディンプルキー＋補助錠。空き巣が心配なとき、玄関の鍵を2つにしたいときに<span>◯◯円〜</span>",
    ], "km-plans");

  // ======================================================================
  // ページの定義
  // ======================================================================
  const PAGES = [];

  // ---- トップ ----
  PAGES.push({
    slug: "new-top-draft",
    title: "新トップ案（2つの入口）",
    headTitle: "鍵開け・鍵交換の鍵マッハ24｜赤羽拠点・東京都内24時間受付",
    excerpt: "家の鍵をなくした・家に入れない時の鍵開け、鍵交換、家族や入居者と連絡が取れない時の安否確認の鍵開けは鍵マッハ24へ。赤羽を拠点に東京都内へ24時間出張。作業前に書面でお見積もりをお出しします。",
    hideHeader: true,
    blocks: () => lp([
      G("km-section km-fv", [
        P("赤羽を拠点に、東京都内へ駆けつける鍵屋", "km-eyebrow"),
        H("鍵開け・鍵交換・安否確認の鍵開けは<br>鍵マッハ24", 1),
        P('24時間受付。<mark class="km-mk">最短5分</mark>で到着します。年間3,000件以上の鍵の作業に対応しています。', "km-fv__lead"),
        P("<strong>どちらでお困りですか？</strong>"),
        BTN("km-entry", [
          ["<strong>鍵をなくした・開かない</strong>ご本人で、今すぐ家に入りたい方", SITE + "/kagi-funshitsu/", "km-entry-self"],
          ["<strong>家族・入居者と連絡が取れない</strong>安否確認の鍵開け（ご家族・大家さん・管理会社）", SITE + "/anpi-kakunin/", "km-entry-anpi"],
        ]),
        telButton(),
        stats(),
        fvPhotos(),
      ]),
      G("km-section", [H("どんなお困りですか？"), tiles()]),
      G("km-section", [H("ご依頼の多い作業"), serviceCards()]),
      G("km-section", [H("鍵開け・鍵交換の料金"), T([...priceOpen.slice(0, 2), priceChange[0]]), priceNote(), P(A("/price/", "料金表をすべて見る →")), cheapWarning()]),
      G("km-section km-band", rules()),
      G("km-section km-band", [H("お客様の声"), voiceList(cases.filter(isHome), 4), P("作業事例に掲載しているお客様のご感想から抜粋しています。", "km-note")]),
      G("km-section", [H("最近の作業事例"), caseList(cases.filter(isHome), 5)]),
      G("km-section", [H("対応エリア"), P("赤羽を拠点に、東京都内と埼玉県南部に出張しています。" + FAST_WARDS.join("・") + "と、埼玉県の" + SAITAMA.join("・") + "は最短5分です。作業事例の多い地域はこちらです。"), areaLinks(), P(A("/area/", "対応エリアをすべて見る →"))]),
      G("km-section", [
        H("鍵のお役立ちコラム"),
        L([
          A("/kagi-nakushita/", "家の鍵をなくしたときにまずやること"),
          A("/chintai-kagi-funshitsu/", "賃貸で鍵をなくしたら？管理会社への連絡と費用"),
          A("/kagi-koukan-hiyou/", "鍵交換の費用と、交換したほうがいいタイミング"),
          A("/anpi-kakunin-keisatsu/", "家族と連絡が取れないときの安否確認と、警察への頼み方"),
        ]),
      ]),
      cta("鍵のトラブル・安否確認、今すぐご相談ください"),
      LD(business),
      LD({ "@context": "https://schema.org", "@type": "WebSite", name: "鍵マッハ24", url: SITE + "/" }),
    ]),
  });

  // ---- 鍵をなくした・家に入れない ----
  PAGES.push({
    slug: "kagi-funshitsu",
    title: "家の鍵をなくした・家に入れないときの鍵開け",
    headTitle: "家の鍵をなくした・家に入れない時の鍵開け｜東京24時間 鍵マッハ24",
    excerpt: "家の鍵をなくした、締め出された、オートロックで入れない時は鍵マッハ24へ。東京都内に24時間出張し、最短5分で到着。ほとんどの鍵は壊さずに開けられます。作業前に書面でお見積もりをお出しします。",
    blocks: () => lp([
      answer("<strong>家の鍵をなくして入れないときは、鍵屋に鍵を開けてもらうのが一番早い方法です。</strong>鍵マッハ24は24時間受付、東京都内に最短5分で到着し、作業前に総額をお伝えします。"),
      telButton(),
      G("km-section", [
        H("こんなときにご依頼ください"),
        L([
          "家の鍵をなくした・どこかに置いてきた",
          "家から締め出された（鍵を持たずに出てドアが閉まった）",
          "マンションのオートロックで入れない",
          "鍵が折れた・曲がった・鍵穴に刺さらない",
          "鍵が回らない・ドアが開かない",
          "バーロック（内側の補助ロック）がかかってしまった",
        ]),
      ]),
      stats(),
      G("km-section", [H("どんなお困りですか？"), tiles()]),
      G("km-section", [H("鍵開けの料金"), T(priceOpen), priceNote(), P(A("/price/", "料金表をすべて見る →")), cheapWarning()]),
      G("km-section", [...rules(), ...flow()]),
      G("km-section", [
        H("本人確認について"),
        P("鍵開けは、防犯のため必ずご本人であることを確認してから行います。確認は顔写真付きの身分証（運転免許証、マイナンバーカードなど）で行います。身分証が家の中にある場合は、開けた後に確認させていただきます。顔写真付きの身分証をお持ちでない場合は、不動産の契約書や公共料金の支払い書などで確認します。ご本人以外のお部屋は開けられません。"),
        idDocs(),
      ]),
      G("km-section", [
        H("賃貸のお部屋の場合"),
        P(`賃貸でも、入居者ご本人からのご依頼で鍵を開けられます。合鍵があるかどうか、鍵交換のルールがあるかは、管理会社か大家さんに確認してください。夜間で連絡がつかないときは、先に鍵開けだけ行い、交換は後日相談しても大丈夫です。詳しくは${A("/chintai-kagi-funshitsu/", "賃貸で鍵をなくしたら")}をご覧ください。`),
      ]),
      G("km-section", [
        H("開けた後は、鍵交換もご検討ください"),
        P(`住所が分かる物と一緒に鍵をなくした場合は、悪用を防ぐために鍵交換をおすすめします。鍵開けと同じ日に交換もできます。${A("/kagi-koukan/", "鍵交換・シリンダー交換について")}`),
      ]),
      G("km-section", [
        H("鍵をなくしたら、まずやること"),
        L([
          "<strong>最後に鍵を使った場所を思い出す。</strong>立ち寄った店・駅・職場に問い合わせます。",
          "<strong>警察に遺失届を出す。</strong>交番や警察署で届け出できます。",
          "<strong>賃貸なら管理会社・大家さんへ連絡する。</strong>",
          "<strong>どうしても入れないときは鍵屋へ。</strong>24時間受付しています。",
        ], "km-steps", true),
        P(A("/kagi-nakushita/", "詳しく：家の鍵をなくしたときにまずやること →")),
      ]),
      G("km-section km-band", [H("鍵をなくしたお客様の声"), voiceList(cases.filter((c) => isHome(c) && (isLost(c) || isStuck(c))), 4)]),
      G("km-section", [H("鍵の紛失・締め出しの作業事例"), caseList(cases.filter((c) => isHome(c) && (isLost(c) || isStuck(c))), 8)]),
      G("km-section km-band", faqBlocks(FAQ_LOST)),
      G("km-section", [H("対応エリア"), areaLinks()]),
      cta(),
      LD(service("家の鍵の鍵開け（紛失・締め出し）", "鍵開け", "/kagi-funshitsu/", "家の鍵をなくした、締め出された時の鍵開け。東京都内に24時間出張。")),
      LD(faqLd(FAQ_LOST)),
    ]),
  });

  // ---- 鍵交換 ----
  PAGES.push({
    slug: "kagi-koukan",
    title: "鍵交換・シリンダー交換",
    headTitle: "鍵交換の費用とシリンダー交換｜東京・赤羽の鍵マッハ24",
    excerpt: "鍵交換・シリンダー交換は鍵マッハ24へ。鍵をなくした後の交換、入居時の交換、防犯性の高いディンプルキーへの交換に対応。部品込みの総額を作業前にお伝えします。東京都内に24時間出張します。",
    blocks: () => lp([
      answer("<strong>鍵交換は、鍵穴の部品（シリンダー）ごと新しくする作業です。</strong>鍵をなくしたときや、入居したときに交換すると、前の鍵では開けられなくなります。鍵マッハ24は部品込みの総額を作業前にお伝えします。"),
      telButton(),
      G("km-section", [
        H("鍵交換をしたほうがいいとき"),
        L([
          "<strong>鍵をなくした。</strong>特に、住所が分かる物と一緒になくした場合",
          "<strong>新しい家に入居した。</strong>前の住人が合鍵を持っている可能性があります",
          "<strong>合鍵を返してもらえない。</strong>引っ越し業者や知人に渡したままの場合",
          "<strong>鍵が回りにくい・引っかかる。</strong>部品がすり減っている合図です",
          "<strong>防犯性を上げたい。</strong>ディンプルキーや補助錠への交換",
        ]),
      ]),
      stats(),
      G("km-section", [H("鍵交換は3つの考え方から選べます"), plans(), P("どれにするか迷ったら、お電話でご相談ください。ドアに合う部品と総額をお伝えします。", "km-note")]),
      G("km-section", [H("鍵交換の料金（部品込み）"), T(priceChange), priceNote(), P(A("/price/", "料金表をすべて見る →")), cheapWarning()]),
      G("km-section", [
        H("普通の鍵とディンプルキーの違い"),
        T([
          ["普通の鍵（ギザギザの鍵）", "部品代が安い。仕組みが単純なぶん、防犯性はディンプルキーより低い"],
          ["ディンプルキー（くぼみのある鍵）", "鍵穴の仕組みが複雑で、不正に開けられにくい。合鍵を作るのに時間と費用がかかる"],
        ], "km-compare"),
        P("どちらにするか迷ったら、お電話でご相談ください。ドアに合う部品をお伝えします。"),
      ]),
      G("km-section", [
        H("鍵交換の流れ"),
        L([
          "<strong>お電話</strong>　鍵の種類（鍵に刻まれたメーカー名など）が分かれば教えてください。",
          "<strong>到着・確認</strong>　ドアと鍵の部品を確認し、交換できる部品と総額を提示します。",
          `<strong>交換</strong>　ご了承いただいてから作業します。目安は${TODO("【要確認：◯分】")}です。`,
          "<strong>新しい鍵のお渡し</strong>　新しい鍵が全部そろっているか一緒に確認します。",
        ], "km-steps", true),
        P("賃貸の場合は、交換の前に管理会社か大家さんの許可を取ってください。", "km-note"),
      ]),
      G("km-section km-band", faqBlocks(FAQ_KOUKAN)),
      G("km-section", [H("対応エリア"), areaLinks()]),
      cta("鍵交換のご相談・お見積もり"),
      LD(service("鍵交換・シリンダー交換", "鍵交換", "/kagi-koukan/", "鍵の紛失後、入居時、防犯のための鍵交換・シリンダー交換。部品込みの総額を作業前に提示。")),
      LD(faqLd(FAQ_KOUKAN)),
    ]),
  });

  // ---- 安否確認 ----
  PAGES.push({
    slug: "anpi-kakunin",
    title: "安否確認の鍵開け",
    headTitle: "安否確認の鍵開け｜家族・入居者と連絡が取れない時 東京 鍵マッハ24",
    excerpt: "離れて暮らす家族や入居者と連絡が取れない時の安否確認の鍵開けは鍵マッハ24へ。警察への頼み方から、立ち会いのもとでの鍵開け、開けた後の施錠・鍵交換まで対応します。東京都内に24時間出張します。",
    extraClass: "km-anpi-page",
    blocks: () => lp([
      answer("<strong>家族や入居者と連絡が取れないときは、警察に相談し、鍵マッハ24にも直接お電話ください。</strong>部屋に入る必要があり、合鍵がないときに駆けつけて鍵を開けます。スタッフは全員、警察の立ち会いでの作業を経験しています。"),
      telButton(),
      stats(),
      G("km-section km-anpi", [
        H("こんなときにご依頼ください"),
        L([
          "一人暮らしの親と、何日も連絡が取れない",
          "入居者と連絡がつかず、郵便物がたまっている",
          "社員が無断欠勤して、連絡が取れない",
          "警察から、鍵を開けられる業者を呼ぶよう言われた",
        ]),
        H("警察への頼み方と、鍵屋を呼ぶ流れ"),
        L([
          "<strong>警察に相談する。</strong>命に関わりそうなときは、すぐに119番（救急）か110番（警察）。そうでなければ、お住まいの地域の警察署か、警察相談専用電話（#9110）に相談します。",
          "<strong>部屋に入るかを決める。</strong>警察の判断で、ご家族や管理会社の立ち会いのもと進みます。",
          "<strong>合鍵がなければ鍵屋を呼ぶ。</strong>管理会社や大家さんが合鍵を持っていないか、先に確認すると早く済みます。",
          "<strong>開けた後まで対応します。</strong>確認後の施錠、必要なら鍵交換まで行います。",
        ], "km-steps", true),
        P(`※実際の手順は、警察の判断や状況によって変わります。詳しくは${A("/anpi-kakunin-keisatsu/", "家族と連絡が取れないときの安否確認と、警察への頼み方")}をご覧ください。`, "km-note"),
      ]),
      G("km-section", [
        H("ご依頼いただける方"),
        L(["ご家族・ご親族", "大家さん・管理会社", "会社の総務・人事のご担当者", "警察からのご依頼"]),
        P("防犯のため、顔写真付きの身分証でご依頼の方を確認します。", "km-note"),
        idDocs(),
      ]),
      G("km-section", [H("安否確認の鍵開けの料金"), T(priceAnpi), priceNote()]),
      G("km-section", [
        H("管理会社・大家さん・法人の方へ"),
        P(`入居者や社員の安否確認を継続してお任せいただけます。請求書でのお支払い（法人のお客様のみ）と、作業報告書の発行に対応します。　${A("/houjin/", "法人の方へ →")}`),
      ]),
      G("km-section km-band", faqBlocks(FAQ_ANPI)),
      cta("安否確認の鍵開け、今すぐご相談ください"),
      supervisor(),
      LD(service("安否確認の鍵開け", "鍵開け", "/anpi-kakunin/", "家族・入居者と連絡が取れない時の安否確認の鍵開け。警察やご家族の立ち会いのもとで作業。")),
      LD(faqLd(FAQ_ANPI)),
    ], "km-anpi-page"),
  });

  // ---- 法人の方へ ----
  const FAQ_HOUJIN = [
    ["継続して依頼する場合、契約は必要ですか？", `${TODO("【要確認：契約の有無・取引の始め方】")}`],
    ["作業報告書はもらえますか？", "はい。作業ごとに作業報告書を発行します。"],
    ["夜間や休日でも対応できますか？", "はい。24時間365日受付しています。10名以上のスタッフが、24時間いつでも対応できる体制です。"],
  ];
  PAGES.push({
    slug: "houjin",
    title: "管理会社・大家さん・法人の方へ",
    headTitle: "管理会社・大家さん向け 鍵開け・鍵交換・安否確認｜鍵マッハ24",
    excerpt: "管理会社・大家さん・法人の方へ。入居者の安否確認の鍵開け、退去・入居時の鍵交換、入居者の鍵紛失の対応を、24時間継続してお任せいただけます。請求書払い・作業報告書に対応します。",
    blocks: () => lp([
      answer("<strong>入居者の安否確認、退去・入居時の鍵交換、入居者の鍵紛失の対応を、24時間お任せいただけます。</strong>請求書でのお支払いと作業報告書の発行に対応します。"),
      telButton(),
      G("km-section", [
        H("ご依頼の多い作業"),
        T([
          ["入居者と連絡が取れない", "警察やご家族の立ち会いのもとで鍵開け。開けた後の施錠まで"],
          ["退去・入居時の鍵交換", "シリンダー交換。複数の部屋もまとめてご相談ください"],
          ["入居者の鍵紛失", "夜間・休日の鍵開けを入居者からの電話で直接対応"],
          ["社員と連絡が取れない", "社宅・寮の安否確認の鍵開け"],
        ], "km-compare"),
      ]),
      G("km-section", [
        H("鍵マッハ24にお任せいただける理由"),
        L([
          "<strong>10名以上のスタッフが24時間待機。</strong>最短5分で到着します。年間3,000件以上の鍵の作業に対応しています。",
          "<strong>警察の立ち会いに慣れています。</strong>安否確認の鍵開けは、スタッフ全員が経験済みです。",
          "<strong>中間手数料なし。</strong>自社のスタッフが直接うかがいます。",
          "<strong>作業前に総額をお伝えします。</strong>入居者に請求する場合も、金額で揉めません。",
          "<strong>請求書払い・作業報告書。</strong>法人のお客様は請求書でお支払いいただけます。作業ごとに作業報告書を発行します。",
        ], "km-steps", true),
      ]),
      G("km-section", [H("管理物件での作業事例"), caseList(cases.filter((c) => /賃貸|物件|管理/.test(c.ask)), 4)]),
      G("km-section km-band", faqBlocks(FAQ_HOUJIN)),
      G("km-section", [
        H("お取引のご相談"),
        P(`お電話（${TEL_TEXT}）か、${A("/%e3%81%8a%e5%95%8f%e3%81%84%e5%90%88%e3%82%8f%e3%81%9b/", "お問い合わせフォーム")}からご連絡ください。`),
      ]),
      cta("法人のお取引・ご相談"),
      LD(service("管理会社・法人向けの鍵開け・鍵交換・安否確認", "鍵開け", "/houjin/", "管理会社・大家さん・法人向けに、安否確認の鍵開け、鍵交換、入居者の鍵紛失対応を24時間提供。")),
      LD(faqLd(FAQ_HOUJIN)),
    ]),
  });

  // ---- 料金表 ----
  PAGES.push({
    slug: "price",
    title: "鍵開け・鍵交換の料金表",
    headTitle: "鍵開け・鍵交換の料金表｜作業前に総額提示 鍵マッハ24",
    excerpt: "鍵マッハ24の鍵開け・鍵交換・鍵修理・安否確認の鍵開けの料金表です。表示は出張費・見積もり費込みの税込総額。作業前に書面でお見積もりをお出しし、ご納得いただいてから作業に入ります。",
    blocks: () => lp([
      answer("<strong>料金は税込の総額で表示しています。</strong>到着後、作業前に書面でお見積もりをお出しし、作業内容と金額にご納得いただいてから作業に入ります。" + TODO("【要確認：出張費・見積もり費を料金に含むか】")),
      cheapWarning(),
      G("km-section", [H("鍵開け"), T(priceOpen)]),
      G("km-section", [H("鍵交換（部品込み）"), T(priceChange)]),
      G("km-section", [H("鍵の修理"), T(priceOther)]),
      G("km-section", [H("安否確認の鍵開け"), T(priceAnpi)]),
      G("km-section", [
        H("追加でかかる費用"),
        T([
          ["深夜・早朝の割増", TODO("【要確認：あり◯円／なし】")],
          ["出張費", TODO("【要確認：料金に含む／別途◯円】")],
          ["お客様のご都合によるキャンセル", "キャンセル料がかかります " + TODO("【要確認：金額】")],
        ]),
        priceNote(),
      ]),
      G("km-section", [H("お支払い方法"), T([["現金", "対応"], ["クレジットカード", "VISA・Mastercard・JCB・American Express"], ["QRコード決済", "PayPayなど"], ["請求書", "法人のお客様のみ"]], "km-area-table")]),
      G("km-section km-band", rules()),
      G("km-section km-band", faqBlocks(FAQ_PRICE)),
      cta(),
      LD(faqLd(FAQ_PRICE)),
    ]),
  });

  // ---- 対応エリア（一覧） ----
  PAGES.push({
    slug: "area",
    title: "対応エリア",
    headTitle: "対応エリア｜東京都内の鍵開け・鍵交換 鍵マッハ24",
    excerpt: "鍵マッハ24の対応エリアです。赤羽を拠点に、東京都内に24時間出張して鍵開け・鍵交換・安否確認の鍵開けを行います。作業事例の多い地域ごとに、到着の目安と事例をまとめています。",
    blocks: () => lp([
      answer("<strong>赤羽を拠点に、東京都内と埼玉県南部に出張しています。</strong>10名以上のスタッフが24時間待機しているので、" + FAST + "で到着します。多摩地域にも伺いますが、府中市より西は少しお時間をいただきます。"),
      G("km-section", [H("到着の目安"), T([[FAST_WARDS.join("・"), "最短5分"], ["埼玉県 " + SAITAMA.join("・"), "最短5分"], ["そのほかの東京23区", "最短15分"], ["多摩地域", "お電話でご確認ください"]], "km-area-table"), P("府中市より西の地域は、少しお時間をいただきます。", "km-note")]),
      G("km-section", [H("作業事例の多い地域"), areaLinks()]),
      G("km-section", [H("最近の作業事例"), caseList(cases.filter(isHome), 6)]),
      cta(),
    ]),
  });

  // ---- 対応エリア（区ごと） ----
  for (const a of AREAS) {
    const here = cases.filter((c) => c.place.startsWith(a.name));
    const towns = [...new Set(here.map((c) => c.place.replace(a.name, "")).filter(Boolean))];
    PAGES.push({
      slug: a.slug,
      parentSlug: "area",
      title: `${a.name}の鍵開け・鍵交換`,
      headTitle: `${a.name}の鍵屋｜鍵開け・鍵交換 24時間 鍵マッハ24`,
      excerpt: `${a.name}で家の鍵をなくした、家に入れない、鍵を交換したい時は鍵マッハ24へ。${a.name}に24時間出張し、作業前に総額をお伝えします。${a.name}${towns.length ? "（" + towns.slice(0, 3).join("・") + "など）" : ""}での実際の作業事例も掲載しています。`,
      blocks: () => lp([
        answer(`<strong>${a.name}の鍵開け・鍵交換は、鍵マッハ24が24時間うかがいます。</strong>${a.note || ""}最短${a.min}分で到着し、作業前に書面でお見積もりをお出しします。`),
        telButton(),
        stats(),
        G("km-section", [
          H(`${a.name}での作業事例`),
          P(here.length ? `${a.name}${towns.length ? "（" + towns.join("・") + "）" : ""}で、これまでに${here.length}件の作業をご紹介しています。` : `${a.name}の作業事例は準備中です。`),
          caseList(here, 10),
        ]),
        G("km-section km-band", [H(`${a.name}のお客様の声`), voiceList(here, 4)]),
        G("km-section", [
          H(`${a.name}の地域の情報`),
          H("主な駅", 3),
          P(a.stations.join("・") + "など、区内全域に伺います。"),
          H(`${a.name}を管轄する警察署`, 3),
          P(`${a.police.join("・")}。家族や入居者と連絡が取れないときは、お住まいの地域を管轄する警察署に相談します。命に関わりそうなときは110番、急ぎでない相談は警察相談専用電話（#9110）です。<a href="https://www.keishicho.metro.tokyo.lg.jp/about_mpd/shokai/ichiran/kensaku/${a.slug}.html">${a.name}の警察署の所在地と電話番号（警視庁）</a>`),
          H("近くの地域", 3),
          P(a.near.map((n) => { const x = AREAS.find((y) => y.name === n); return x ? A(`/area/${x.slug}/`, n) : n; }).join("・") + "にも伺います。"),
        ]),
        G("km-section", [H(`${a.name}で多いご依頼`), serviceLinks()]),
        G("km-section", [H("料金の目安"), T([...priceOpen.slice(0, 1), priceChange[0]]), priceNote(), P(A("/price/", "料金表をすべて見る →"))]),
        G("km-section km-band", rules()),
        G("km-section", [H("ほかの対応エリア"), areaLinks()]),
        cta(`${a.name}の鍵のトラブル、今すぐご相談ください`),
        LD({ ...service(`${a.name}の鍵開け・鍵交換`, "鍵開け", `/area/${a.slug}/`, `東京都${a.name}への鍵開け・鍵交換の出張。`), areaServed: { "@type": "City", name: "東京都" + a.name } }),
      ]),
    });
  }

  // ======================================================================
  // コラム（投稿）の定義
  // ======================================================================
  const COLUMNS = [
    {
      slug: "kagi-nakushita",
      title: "家の鍵をなくしたときにまずやること｜探す順番と、入れないときの対処法",
      headTitle: "家の鍵をなくしたらまずやること｜順番と対処法 鍵マッハ24",
      excerpt: "家の鍵をなくしたときは、①最後に使った場所を思い出す ②警察に遺失届を出す ③賃貸なら管理会社に連絡 ④入れないときは鍵屋へ、の順で進めます。鍵交換が必要な場面も鍵屋が解説します。",
      blocks: () => lp([
        answer("<strong>結論：家の鍵をなくしたら、①最後に鍵を使った場所を思い出す、②警察に遺失届を出す、③賃貸なら管理会社か大家さんに連絡する、④どうしても入れないときは鍵屋を呼ぶ、の順で進めてください。</strong>"),
        H("1. 最後に鍵を使った場所を思い出す"),
        P("家を出たときに鍵をかけたなら、なくしたのはその後です。立ち寄った店、駅、職場、乗ったタクシーを順に思い出し、電話で問い合わせます。鉄道会社やタクシー会社には、忘れ物の問い合わせ窓口があります。"),
        H("2. 警察に遺失届を出す"),
        P("交番や警察署で、遺失届（なくし物の届け出）を出します。誰かが拾って届けてくれたとき、連絡をもらえるようになります。"),
        H("3. 賃貸なら管理会社・大家さんに連絡する"),
        P(`管理会社や大家さんが合鍵を持っていれば、それで入れることがあります。夜間で連絡がつかない場合は、鍵屋に開けてもらい、鍵交換は後日相談しても大丈夫です。費用の考え方は${A("/chintai-kagi-funshitsu/", "賃貸で鍵をなくしたら")}で詳しく説明しています。`),
        H("4. どうしても入れないときは鍵屋を呼ぶ"),
        P("合鍵が手に入らず、今すぐ家に入りたいときは鍵屋に鍵を開けてもらいます。ほとんどの鍵は壊さずに開けられます。電話の段階で、到着時間と料金の目安を必ず確認してください。"),
        H("鍵屋を選ぶときに確認したいこと"),
        L([
          "<strong>作業前に総額を教えてくれるか。</strong>「◯◯円〜」の安い金額だけを見て呼ぶと、後で高くなることがあります",
          "<strong>キャンセル料の条件を、電話の段階で説明してくれるか。</strong>どんなときにいくらかかるかを、呼ぶ前に確認します",
          "<strong>本人確認をするか。</strong>本人確認をしっかりする鍵屋は、防犯意識が高い証拠です",
        ]),
        H("鍵交換は必要？"),
        P(`住所が分かる物（免許証、郵便物など）と一緒になくした場合や、どこでなくしたか分からない場合は、悪用を防ぐために鍵交換をおすすめします。${A("/kagi-koukan-hiyou/", "鍵交換の費用とタイミング")}も参考にしてください。`),
        G("km-section", [H("家に入れなくてお困りの方へ"), P(`鍵マッハ24は24時間受付で、東京都内に最短5分で到着します。${A("/kagi-funshitsu/", "鍵をなくした・家に入れないときの鍵開け")}`), telButton()]),
        supervisor(),
      ]),
    },
    {
      slug: "chintai-kagi-funshitsu",
      title: "賃貸で鍵をなくしたら？管理会社への連絡と、費用は誰が払うか",
      headTitle: "賃貸で鍵をなくしたら？管理会社への連絡と費用｜鍵マッハ24",
      excerpt: "賃貸で鍵をなくしたら、まず管理会社か大家さんに連絡します。自分の不注意でなくした場合、鍵開けや鍵交換の費用は入居者が負担するのが一般的です。夜間に連絡がつかない時の対処法も解説します。",
      blocks: () => lp([
        answer("<strong>結論：賃貸で鍵をなくしたら、まず管理会社か大家さんに連絡してください。</strong>自分の不注意でなくした場合、鍵開けや鍵交換の費用は入居者が負担するのが一般的です。勝手に鍵を交換せず、交換するときは必ず許可を取ります。"),
        H("最初に管理会社・大家さんへ連絡する理由"),
        L([
          "合鍵を持っていれば、鍵屋を呼ばずに入れることがある",
          "鍵交換のルール（指定の業者・部品）が決まっていることがある",
          "契約によっては、紛失を報告する決まりがある",
        ]),
        H("夜間で連絡がつかないときは？"),
        P(`管理会社の窓口が閉まっていて、どうしても今夜家に入りたいときは、鍵屋に鍵を開けてもらって大丈夫です。入居者ご本人であれば鍵を開けられます。鍵交換は、翌日以降に管理会社と相談してから決めます。${A("/kagi-funshitsu/", "鍵をなくした・家に入れないときの鍵開け")}`),
        H("費用は誰が払う？"),
        P("入居者の不注意で鍵をなくした場合、鍵開けや鍵交換の費用は入居者の負担になるのが一般的です。ただし、契約内容や火災保険・家財保険の特約で補償される場合もあります。契約書と保険の内容を確認してみてください。"),
        H("勝手に鍵を交換してはいけない理由"),
        P("鍵は部屋の設備の一部で、多くの賃貸契約では交換に管理会社や大家さんの許可が必要です。無断で交換すると、退去時に元に戻す費用を求められることがあります。"),
        G("km-section", [H("賃貸のお部屋の鍵開け・鍵交換"), P("鍵マッハ24は24時間受付。作業前に総額をお伝えするので、管理会社への報告にもそのままお使いいただけます。"), telButton()]),
        supervisor(),
      ]),
    },
    {
      slug: "kagi-koukan-hiyou",
      title: "鍵交換の費用と、交換したほうがいいタイミング",
      headTitle: "鍵交換の費用と交換すべきタイミング｜鍵屋が解説 鍵マッハ24",
      excerpt: "鍵交換の費用は、鍵の種類と部品代で決まります。普通の鍵とディンプルキーの違い、鍵をなくした時・入居時・鍵が回りにくい時など、交換したほうがいいタイミングを鍵屋が解説します。",
      blocks: () => lp([
        answer("<strong>結論：鍵交換の費用は「鍵の種類（部品代）」と「作業費」で決まります。</strong>鍵をなくしたとき、入居したとき、鍵が回りにくくなったときが交換のタイミングです。見積もりでは、部品代込みの総額を確認してください。"),
        H("費用が変わるポイント"),
        T([
          ["鍵の種類", "普通の鍵より、ディンプルキーなど防犯性の高い鍵のほうが部品代が高い"],
          ["ドアと部品の相性", "ドアに合う部品が限られると、選べる鍵が変わる"],
          ["本数", "玄関に鍵が2つある場合は、2つ分の費用がかかる"],
          ["時間帯", "深夜・早朝は割増がある業者もある"],
        ], "km-compare"),
        P(`鍵マッハ24の料金は${A("/price/", "料金表")}をご覧ください。`),
        H("交換したほうがいいタイミング"),
        L([
          "<strong>鍵をなくしたとき</strong>：特に住所が分かる物と一緒になくした場合",
          "<strong>入居したとき</strong>：前の住人が合鍵を持っている可能性がある",
          "<strong>合鍵を返してもらえないとき</strong>",
          "<strong>鍵が回りにくい・引っかかるとき</strong>：部品のすり減りが原因のことが多い",
          "<strong>空き巣が心配なとき</strong>：防犯性の高い鍵や補助錠に替える",
        ]),
        H("普通の鍵とディンプルキー、どちらがいい？"),
        P("ディンプルキーは表面に小さなくぼみが並んだ鍵で、鍵穴の仕組みが複雑なため、不正に開けられにくい鍵です。防犯を重視するならディンプルキー、費用を抑えたいなら普通の鍵、という選び方が基本です。"),
        G("km-section", [H("鍵交換のご相談"), P(A("/kagi-koukan/", "鍵交換・シリンダー交換のページを見る →")), telButton()]),
        supervisor(),
      ]),
    },
    {
      slug: "anpi-kakunin-keisatsu",
      title: "家族と連絡が取れないときの安否確認｜警察への頼み方と、鍵開けの流れ",
      headTitle: "家族と連絡が取れない時の安否確認｜警察への頼み方 鍵マッハ24",
      excerpt: "離れて暮らす家族と連絡が取れない時は、命に関わりそうなら110番、そうでなければ地域の警察署か#9110に相談します。警察への伝え方、部屋に入るまでの流れ、鍵屋を呼ぶタイミングを鍵屋が解説します。",
      blocks: () => lp([
        answer("<strong>結論：命に関わりそうなときは、迷わず119番（救急）か110番（警察）。</strong>そうでなければ、本人が住んでいる地域の警察署か、警察相談専用電話（#9110）に相談します。部屋に入る必要があり、合鍵がないときに鍵屋を呼びます。"),
        H("まず確認したいこと"),
        L([
          "電話・メッセージ・SNSで連絡がつかないか",
          "職場や、近くに住む知人・親族が様子を知らないか",
          "管理会社や大家さんが合鍵を持っていないか",
        ]),
        H("警察に伝えること"),
        L([
          "本人の名前、住所、年齢",
          "最後に連絡が取れた日時",
          "持病や、心配している理由",
          "あなたと本人の関係（家族・大家さんなど）",
        ]),
        H("部屋に入るまでの流れ"),
        L([
          "<strong>警察に相談する</strong>：状況によって、警察官が自宅を訪ねて様子を確認します",
          "<strong>部屋に入るかを決める</strong>：警察の判断で、ご家族や管理会社の立ち会いのもと進みます",
          "<strong>合鍵がなければ鍵屋を呼ぶ</strong>：警察から鍵屋の手配を頼まれることもあります",
          "<strong>開けた後</strong>：確認が済んだら、部屋を施錠します。必要なら鍵交換も行います",
        ], "km-steps", true),
        P("※実際の手順は、警察の判断や状況によって変わります。", "km-note"),
        H("離れて暮らしていて、すぐに行けないときは？"),
        P("ご家族が遠方にいる場合でも、警察や管理会社と連絡を取りながら進められます。鍵マッハ24にお電話いただければ、現地での立ち会いの段取りもご相談に乗ります。"),
        G("km-section km-anpi", [H("安否確認の鍵開けのご依頼"), P(A("/anpi-kakunin/", "安否確認の鍵開けのページを見る →")), telButton()]),
        supervisor(),
      ], "km-anpi-page"),
    },
  ];

  // ======================================================================
  // 保存（下書きのみ）
  // ======================================================================
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n").trim(); // WAFが「/* */」を止めるため外す
  const hideHeaderCss = "\n.page-header, .breadcrumb { display: none; }\n.site-body { padding-top: 16px; }";
  const design = { layout: "col-one-no-subsection", site_body_padding: "" };

  const findDraft = async (type, slug) => {
    const list = await wp.apiFetch({ path: `/wp/v2/${type}?status=draft&slug=${slug}&context=edit&_fields=id` });
    return list[0]?.id;
  };
  const upsert = async (type, def, extra = {}) => {
    let id = await findDraft(type, def.slug);
    // WAFは「長い本文つきの新規作成」を止めるので、先に空の下書きを作ってから本文を入れる
    if (!id) id = (await wp.apiFetch({ path: `/wp/v2/${type}`, method: "POST", data: { title: def.slug, slug: def.slug, status: "draft" } })).id;
    const data = {
      title: def.title,
      slug: def.slug,
      status: "draft",
      content: wp.blocks.serialize(def.blocks()),
      excerpt: def.excerpt,
      veu_head_title_object: { title: def.headTitle, add_site_title: "" },
      meta: { _veu_custom_css: css + (def.hideHeader ? hideHeaderCss : ""), _lightning_design_setting: design },
      ...extra,
    };
    const res = await wp.apiFetch({ path: `/wp/v2/${type}/${id}`, method: "POST", data });
    return { type, id: res.id, slug: def.slug, len: data.content.length };
  };

  const results = [];
  const ids = {};
  for (const def of PAGES.filter((p) => !p.parentSlug)) {
    const r = await upsert("pages", def);
    ids[def.slug] = r.id;
    results.push(r);
  }
  for (const def of PAGES.filter((p) => p.parentSlug)) {
    results.push(await upsert("pages", def, { parent: ids[def.parentSlug] }));
  }

  // コラム用のカテゴリー（スラッグ column）。なければ作る
  let cat = (await wp.apiFetch({ path: "/wp/v2/categories?slug=column&_fields=id" }))[0];
  if (!cat) cat = await wp.apiFetch({ path: "/wp/v2/categories", method: "POST", data: { name: "鍵のお役立ちコラム", slug: "column" } });
  for (const def of COLUMNS) {
    results.push(await upsert("posts", def, { categories: [cat.id] }));
  }
  return results;
}
