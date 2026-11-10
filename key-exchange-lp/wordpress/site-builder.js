/* ==========================================================================
   鍵マッハ24 新サイト一式を WordPress の「下書き」として作る／更新する
   - 固定ページ：トップ案、鍵をなくした、鍵交換、安否確認、法人の方へ、料金表、対応エリア（一覧＋区ごと）
   - 投稿：コラム4本（カテゴリー「鍵のお役立ちコラム」）
   - 各ページに：検索結果用のタイトル、説明文（抜粋）、構造化データ（JSON-LD）、ページ専用CSS
   使い方：WordPress の「固定ページを追加」画面で、このファイルを読み込んで
     await kmBuildSite(cssText)
   2026/11/6 公開済み。同じスラッグのページ・投稿を探して中身だけ上書きし、公開・予約の状態はそのまま保つ（新しいものだけ下書きで作る）。
   作業事例は既存の投稿（公開済み）を読み取り、地域・内容ごとに一覧へ差し込む（投稿そのものは変えない）。
   ========================================================================== */
async function kmBuildSite(cssText) {
  const SITE = "https://h-gate.jp";
  const TEL = "tel:07091861366";
  const TEL_TEXT = "070-9186-1366";
  // 公式LINEの友だち追加URL（https://lin.ee/〜）。空の間は、LINEの入口をどこにも出さない（docs/18-line-strategy.md）
  const LINE_URL = "https://lin.ee/OV5d1Pb"; // 2026/11/6 公式LINE開設
  const BIZ_ID = SITE + "/#business";
  const ORG_ID = SITE + "/#organization";

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
      // メールの問い合わせはやめて、電話の横にLINE（2026/11/6）
      BTN("km-line__btn km-cta__line", [["LINEで相談する（友だち追加）", LINE_URL]]),
      P("LINEでは写真を送っていただくだけで、鍵交換のお見積もりの目安をお伝えします。お急ぎのときはお電話ください。", "km-cta__mail")]);
  const faqBlocks = (faqs) => [H("よくある質問"), ...faqs.map(([q, a]) => D(q, a))];
  const supervisor = () =>
    G("km-supervisor", [P(`監修：寺内 大将（株式会社H-GATE 代表取締役・鍵マッハ24 代表）<br>鍵の仕事に携わって3年。自分が鍵をなくしたときに駆けつけてくれた鍵屋さんの丁寧な対応に感動し、鍵マッハ24を始めました。<br>鍵マッハ24は、年間3,000件以上の鍵の作業に対応しています。<br>運営：株式会社H-GATE（2022年6月設立）　${A("/%e4%bc%9a%e7%a4%be%e6%a6%82%e8%a6%81/", "会社概要")}`)]);

  // ---- 構造化データ（Googleに「ここは鍵屋で、何をしていて、どこに行けるか」を伝える） ----
  const LD = (obj) => HTML(`<script type="application/ld+json">${JSON.stringify(obj)}</script>`);
  const AREAS = [
    { slug: "kita", name: "北区", min: 5, note: "鍵マッハ24の事務所がある区です。",
      police: ["赤羽警察署", "王子警察署", "滝野川警察署"],
      stations: ["赤羽", "東十条", "十条", "王子", "田端", "王子神谷", "赤羽岩淵", "浮間舟渡"],
      near: ["板橋区", "豊島区", "文京区", "荒川区", "足立区", "埼玉県川口市", "埼玉県戸田市"] },
    { slug: "koto", name: "江東区", min: 5,
      police: ["深川警察署", "城東警察署", "東京湾岸警察署"],
      stations: ["門前仲町", "木場", "東陽町", "南砂町", "亀戸", "大島", "清澄白河", "森下", "住吉", "豊洲"],
      near: ["墨田区", "江戸川区", "中央区"] },
    { slug: "edogawa", name: "江戸川区", min: 5,
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
  // 到着の目安と支払い方法（友人の回答 2026/11/6：スタッフは都内各地に散らばって待機。最短5分は待機場所しだい。QRコード決済はなし）
  const SAITAMA = ["川口市", "戸田市", "草加市", "新座市", "蕨市", "さいたま市", "朝霞市", "和光市", "志木市"];
  const FAST = "東京都内の各地でスタッフが待機しているので、最短5分（その時に待機しているスタッフの場所によって変わります）";
  const PAY = "現金、クレジットカード（VISA・Mastercard・JCB・American Express・Diners Club）、スマホのタッチ決済（Apple Payなど）";
  const business = {
    "@context": "https://schema.org",
    "@type": "Locksmith",
    "@id": BIZ_ID,
    name: "鍵マッハ24",
    url: SITE + "/",
    telephone: "+81-70-9186-1366",
    // サイトには登記上の住所（バーチャルオフィス）を載せる（友人の回答 2026/10/28）。Googleビジネスプロフィールは別途、自宅で住所非表示
    address: { "@type": "PostalAddress", postalCode: "115-0045", addressRegion: "東京都", addressLocality: "北区", streetAddress: "赤羽1-7-9 赤羽第一葉山ビル4F", addressCountry: "JP" },
    paymentAccepted: "現金, クレジットカード, スマホのタッチ決済",
    priceRange: "基本料金5,500円＋作業料金11,000円〜",
    areaServed: [{ "@type": "State", name: "東京都" }, ...SAITAMA.map((n) => ({ "@type": "City", name: "埼玉県" + n }))],
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    knowsAbout: ["鍵開け", "鍵交換", "シリンダー交換", "ディンプルキー", "安否確認の鍵開け"],
    parentOrganization: { "@id": ORG_ID },
  };
  // 運営会社（会社概要のページの情報 2026/11/3）。鍵マッハ24はこの会社が運営するサービス
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "株式会社H-GATE",
    url: SITE + "/",
    telephone: "+81-70-9186-1366",
    email: "hgate2022.6@gmail.com",
    foundingDate: "2022-06",
    identifier: [
      { "@type": "PropertyValue", propertyID: "法人番号", value: "9012301013027" },
      { "@type": "PropertyValue", propertyID: "適格請求書発行事業者登録番号", value: "T9012301013027" },
    ],
    address: { "@type": "PostalAddress", postalCode: "115-0045", addressRegion: "東京都", addressLocality: "北区", streetAddress: "赤羽1-7-9 赤羽第一葉山ビル4F", addressCountry: "JP" },
    brand: { "@id": BIZ_ID },
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
          // 人の絵ではなく、その作業事例の実際の写真を添える（作り物の顔写真は使わない）
          B("core/list-item", { className: c.img ? "km-voice--photo" : "", content: `${c.img ? `<img class="km-voice__img" src="${c.img}" alt="${c.place}での作業の写真" width="225" height="300" loading="lazy" decoding="async">` : ""}「${c.voice}」<small><span class="km-voice__meta">${c.date.replace(/-/g, "/")}　${c.place}のお客様</span><a href="${c.link}">${c.ask}</a></small>` })))
      : P("この地域のお客様の声は準備中です。", "km-note");
  };
  const isLost = (c) => /紛失|なくし|無くし|置いて|おいて|忘れ/.test(c.ask);
  const isStuck = (c) => /開かな|開けられな|回らな|刺さらな|折れ|変形|不具合/.test(c.ask) && !/車|バイク|ロッカー|金庫/.test(c.ask);
  const isHome = (c) => !/車|バイク|ロッカー|金庫|メットイン/.test(c.ask);

  // ---- 料金表（友人の回答 2026/11/6）。料金は「基本料金＋作業料金」、部品が必要なときは部品代 ----
  const priceBase = ["基本料金（出張・お見積もり）", "5,500円"];
  const priceOpen = [["鍵開け（一般的な鍵・ディンプルキー・補助錠・室内ドア）", "作業料金 16,500円〜"]];
  const priceChange = [["鍵交換（一般的な鍵・ディンプルキー）", "作業料金 11,000円〜＋部品代"]];
  const priceOther = [["鍵の修理（回らない・抜けない・折れた鍵の取り出し）", "作業料金 11,000円〜"]];
  const priceAnpi = [
    ["安否確認の鍵開け", "作業料金 22,000円〜"],
    ["警察の到着を待つ時間", "最初の20分 1,100円、以降10分ごとに1,100円"],
    ["開けた後の鍵交換", "作業料金 11,000円〜＋部品代"],
  ];
  const priceExtra = [
    ["深夜の割増（20時〜24時）", "5,500円"],
    ["深夜・早朝の割増（24時〜8時）", "8,800円"],
    ["部品代", "部品が必要な作業のみ。作業前にお見積もりでお伝えします"],
    ["お客様のご都合によるキャンセル", "スタッフが出発した後は、基本料金（5,500円）をいただきます"],
    ["鍵が開かなかった場合", "0円（基本料金もいただきません）"],
  ];
  const priceNote = () =>
    P("お支払いは「基本料金5,500円（出張・お見積もり）＋作業料金」で、部品が必要な作業は部品代がかかります。表示は税込です。深夜の割増：20時〜24時は5,500円、24時〜8時は8,800円。<br><strong>鍵が開かなかった場合は0円です。</strong>作業前に書面でお見積もりをお出しします。", "km-note");

  // ---- よくある質問（ページの文章と構造化データの両方に同じ文で使う） ----
  const FAQ_COMMON = [
    ["キャンセル料はかかりますか？", "スタッフが出発した後に、お客様のご都合でキャンセルされた場合は、基本料金（5,500円）をいただきます。いたずら防止のためです。お電話の段階で必ずご説明してから伺います。"],
    ["到着までどのくらいかかりますか？", FAST + "。お電話の際に、到着の目安をお伝えします。"],
    ["鍵が開かなかったら料金はかかりますか？", "鍵が開かなかった場合は、基本料金も含めて0円です。"],
  ];
  const FAQ_LOST = [
    ["鍵をなくして家に入れません。どうすればいいですか？", "合鍵を持っている家族や管理会社に連絡がつかない場合は、鍵屋に鍵を開けてもらうのが一番早い方法です。鍵マッハ24は24時間受付で、作業前に総額をお伝えします。"],
    ["身分証が家の中にあります。開けてもらえますか？", "はい。開けた後に、室内の顔写真付きの身分証（運転免許証、マイナンバーカード、パスポート、在留カードなど）で確認させていただきます。お持ちでない場合は、不動産の契約書や公共料金の支払い書などで確認します。"],
    ["鍵を壊さずに開けられますか？", "ディンプルキーを含め、ほとんどの鍵は壊さずに開けられます。鍵穴の中が壊れていて、ほかに開ける方法がない場合に限り、作業前に理由をご説明し、ご了承をいただいてから壊して開けます。"],
    ["賃貸でも開けてもらえますか？", "はい。入居者ご本人からのご依頼で開けられます。鍵交換をする場合は、先に管理会社や大家さんのルールを確認してください。"],
    ...FAQ_COMMON,
  ];
  const FAQ_KOUKAN = [
    ["鍵をなくしたら、鍵交換は必要ですか？", "住所が分かる物と一緒になくした場合や、見つからない場合は、悪用を防ぐために交換をおすすめします。"],
    ["鍵交換にかかる時間はどのくらいですか？", "作業そのものは、到着してから10〜15分ほどです。事前のご説明とお支払いを含めて、25分ほどみてください。部品の在庫があれば、その日のうちに交換できます。"],
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
    ["鍵開けの料金はいくらですか？", "基本料金5,500円（出張・お見積もり）＋作業料金16,500円〜です（税込）。深夜は割増があります（20時〜24時は5,500円、24時〜8時は8,800円）。到着後、作業前に書面で総額をお伝えします。鍵が開かなかった場合は0円です。"],
    ["出張費や見積もりの費用は別にかかりますか？", "出張とお見積もりは、基本料金5,500円に含まれています。それ以外の出張費や見積もり料はいただきません。"],
    ["作業の後で料金が増えることはありますか？", "ありません。作業前にお伝えした金額以上は請求しません。追加の作業が必要なときは、必ず先にご相談します。"],
    ["支払い方法は何がありますか？", `${PAY}に対応しています。請求書でのお支払いは法人のお客様のみです。`],
    ...FAQ_COMMON,
  ];

  // ---- 共通の部品 ----
  const rules = () => [
    H("安心してお任せいただくための4つの約束"),
    L([
      "<strong>鍵が開かなかったら0円</strong>開けられなかった場合は、基本料金も含めて料金はいただきません。",
      "<strong>作業前に、書面でお見積もり</strong>ご納得いただき、サインをいただいてから作業します。",
      "<strong>提示した金額以上は請求しません</strong>追加の作業は、必ず先にご相談します。",
      "<strong>作業後に、一緒に傷の確認</strong>ドアや鍵に傷がないか、お客様と一緒に確かめてからお支払いいただきます。",
    ], "km-promises", true),
  ];
  // 写真は wordpress/flow/ の240px WebP をメディアに入れたもの（2026/11）。仮の画像で、本物のスタッフの写真が届いたら差し替える
  const flowImg = (name, alt) => `<img class="km-flow__img" src="${SITE}/wp-content/uploads/2026/11/kagimach24-flow-${name}.webp" alt="${alt}" width="240" height="240" loading="lazy" decoding="async">`;
  const flow = (level = 3) => [
    H("ご依頼の流れ", level),
    L([
      flowImg("1-call", "玄関の前から鍵屋に電話する女性") + "<strong>お電話</strong>場所と鍵の状況をうかがい、到着時間と料金の目安をお伝えします。",
      flowImg("2-arrive", "工具バッグを持って玄関へ向かうスタッフ") + "<strong>最短5分で到着</strong>到着前にスタッフからお電話します。",
      flowImg("3-estimate", "玄関先で見積書を見せて説明するスタッフ") + "<strong>書面でお見積もり</strong>顔写真付きの身分証で本人確認をして、金額を書面でお出しします。",
      flowImg("4-work", "玄関ドアの鍵の部品を交換するスタッフの手元") + "<strong>サインをいただいて作業</strong>終わったら、一緒にドアや鍵に傷がないかを確認します。",
      flowImg("5-pay", "スマホのタッチ決済で支払うお客様") + `<strong>お支払い</strong>現金、クレジットカード（VISA・Mastercard・JCB・American Express・Diners Club）、スマホのタッチ決済が使えます。`,
    ], "km-steps km-flow km-flow--photo", true),
    P("いたずら防止のため、スタッフが出発した後のお客様のご都合によるキャンセルは、基本料金（5,500円）をいただきます。お電話の段階で必ずご説明します。", "km-note"),
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
      ["LINEで相談", LINE_URL, "km-fixed-cta__line"],
    ])]);
  // 写真見積もりの入口（急がない相談をLINEで受ける）。緊急の鍵開けのページには置かない
  const lineBox = (title = "写真を送るだけで、鍵交換のお見積もり", lead = "LINEで写真を3枚送っていただくと、来る前に部品と金額の目安をお伝えします。夜中でもお送りいただけます。") =>
    LINE_URL ? [G("km-section km-line", [
      H(title),
      P(lead),
      L(["鍵穴の正面", "ドアを開けたときに見える側面の金属の板（文字が写るように）", "今お使いの鍵"], "km-steps", true),
      P("あわせて、住所（市区町村まで）をお送りください。正式なお見積もりは、現地で確認して作業前に書面でお出しします。", "km-note"),
      BTN("km-line__btn", [["LINEで写真を送る", LINE_URL]]),
      P(`お急ぎの方は、お電話がいちばん早いです（${TEL_TEXT}・24時間受付）。`, "km-note"),
    ])] : [];
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

  // 最初の画面の「最短5分」の丸い印（飾り。aria-hiddenで読み上げない。同じ言葉は見出しにある）
  const medal = () =>
    HTML('<svg class="km-medal" viewBox="0 0 160 160" width="160" height="160" aria-hidden="true" focusable="false"><circle cx="80" cy="80" r="76" fill="#ffd83d"/><circle cx="80" cy="80" r="66" fill="none" stroke="#0b2a5b" stroke-width="3" stroke-dasharray="4 6"/><text x="80" y="62" text-anchor="middle" font-size="22" font-weight="900" fill="#0b2a5b">最短</text><text x="74" y="112" text-anchor="middle" font-size="58" font-weight="900" fill="#0b2a5b">5</text><text x="112" y="112" text-anchor="middle" font-size="22" font-weight="900" fill="#0b2a5b">分</text><text x="80" y="134" text-anchor="middle" font-size="13" font-weight="700" fill="#0b2a5b">で到着</text></svg>');

  // 3. 数字を大きく見せる信頼のバッジ
  const stats = () =>
    L(["最短<strong>5</strong>分で到着", "年間<strong>3,000</strong>件以上", "<strong>10</strong>名以上が24時間待機", "全スタッフが<strong>警察立ち会い</strong>を経験"], "km-stats");

  // 私たちの想い（トップのFVのすぐ下）。代表のきっかけ（2026/11/6 友人の回答）と、鍵マッハ24の約束からまとめた文。見本サイトの文は使わない
  const message = () =>
    G("km-section km-message", [
      P("私たちの想い", "km-message__eyebrow"),
      H('<mark class="km-mk">鍵で困ったとき、</mark><br><mark class="km-mk">いちばんに思い出してもらえる鍵屋へ。</mark>'),
      HTML('<figure class="km-message__photos">' + [["2-arrive", "玄関へ向かうスタッフ"], ["3-estimate", "見積書を見せて説明するスタッフ"], ["4-work", "鍵の部品を交換するスタッフの手元"]]
        .map(([n, alt]) => `<img src="${SITE}/wp-content/uploads/2026/11/kagimach24-flow-${n}.webp" alt="${alt}" width="240" height="240" loading="lazy" decoding="async">`).join("") + "</figure>"),
      P("私たちの代表自身、鍵をなくして途方に暮れたことがあります。そのとき駆けつけてくれた鍵屋さんの丁寧な対応に、心から救われました。あのときの安心を、今度は自分がお客様に届けたい。それが、鍵マッハ24の始まりです。"),
      P("鍵のトラブルは、急いでいて、ゆっくり比べる余裕がないときに起こります。だからこそ鍵マッハ24は、料金をすべて公開し、作業の前に書面でお見積もりをお出しすることを、当たり前に続けています。鍵が開かなかったときは、料金はいただきません。"),
      P("早く駆けつけること。料金をはっきりさせること。最後まで丁寧に作業すること。<br>この3つを大切に、「頼んでよかった」と言っていただける鍵屋を目指します。"),
      P("鍵マッハ24 代表", "km-message__sign"),
    ]);

  // 4. 安すぎる表示への注意（他社の名前は出さない）。2026/11/7 スマホで読みやすいように作り直し：短い導入 → 2枚のカードで比べる → 3つの約束 → 料金表へ
  const cheapWarning = (priceLink = true) =>
    G("km-box km-box--warn km-cheap", [
      H("「◯千円〜」の安すぎる広告にご注意ください", 3),
      P("広告の「◯千円〜」は<strong>作業料金だけ</strong>の金額で、出張費・基本料金・深夜の割増が現地で足されることがあります。", "km-cheap__lead"),
      HTML('<div class="km-cheap__cmp">'
        + '<div class="km-cheap__card km-cheap__card--other"><p class="km-cheap__label">よくある広告</p><p class="km-cheap__price">◯千円〜</p><p class="km-cheap__note">作業料金だけの表示。出張費・基本料金・深夜の割増は別にかかることも</p></div>'
        + '<div class="km-cheap__card km-cheap__card--us"><p class="km-cheap__label">鍵マッハ24　日中の鍵開け</p><p class="km-cheap__price">合計 22,000円〜</p><p class="km-cheap__note">基本料金5,500円＋作業料金16,500円〜。深夜の割増やキャンセルまで、すべて料金表で公開しています</p></div>'
        + "</div>"),
      L(["作業前に、書面でお見積もり", "お見積もりより高く請求しません", "鍵が開かなかったら0円"], "km-cheap__checks"),
      ...(priceLink ? [P(A("/price/", "鍵マッハ24の料金表をすべて見る →"), "km-cheap__link")] : []),
      P('参考：<a href="https://www.shouhiseikatu.metro.tokyo.lg.jp/sodan/kinkyu/documents/kagi_kaijou_service.pdf">東京都消費生活総合センター</a>（現地で高い料金を請求される相談が増えています）', "km-note km-cheap__src"),
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
      "<strong>費用を抑える</strong>一般的なシリンダーへの交換。入居時や、とにかく前の鍵を使えなくしたいときに<span>11,000円〜＋部品代</span>",
      "<strong>バランスよく</strong>ディンプルキーへの交換。防犯性と費用のバランスを取りたいときに<span>11,000円〜＋部品代</span>",
      "<strong>防犯性を高める</strong>より防犯性の高いディンプルキーへの交換。空き巣が心配なときに<span>11,000円〜＋部品代</span>",
    ], "km-plans");

  // ---- コラムのテーマ別カテゴリー（トピッククラスター） ----
  // 「最新の投稿」ブロックは公開済みの記事だけを出すので、予約投稿で毎日1本ずつ公開されるたびに一覧が自動で増え、リンク切れも起きない
  const CLUSTERS = {
    nakushita: { slug: "column-nakushita", name: "鍵をなくした・開かない", thumb: 1361, description: "家の鍵をなくした、締め出された、鍵が回らない・抜けない、閉じ込められたときの対処法をまとめています。",
      posts: ["kagi-nakushita", "chintai-kagi-funshitsu", "mansion-kagi-funshitsu", "kagi-otoshita-keisatsu", "shimedashi", "autolock-kagi-wasureta", "kagi-mawaranai", "kagi-nukenai-oreta", "toilet-heya-kagi-akanai", "kagi-funshitsu-hoken", "dimple-key-nakushita"] },
    koukan: { slug: "column-koukan", name: "鍵交換・防犯", thumb: 1362, description: "鍵交換の費用とタイミング、シリンダー交換、ディンプルキー、補助錠、合鍵、鍵の手入れなど、鍵交換と玄関の防犯の情報をまとめています。",
      posts: ["kagi-koukan-hiyou", "cylinder-koukan-jibun", "dimple-key-koukan", "dimple-key-aikagi", "hikkoshi-kagi-koukan", "chintai-aikagi", "genkan-hojojou", "kagi-shurui", "kagiana-junkatsuzai", "smartlock-chuui"] },
    ryoukin: { slug: "column-ryoukin", name: "料金・鍵屋の選び方", thumb: 1363, description: "鍵開けの料金の考え方、安い広告の注意点、安心して頼める鍵屋の選び方をまとめています。",
      posts: ["kagiake-ryoukin", "kagiya-yasui-chuui", "kagiya-erabikata"] },
    anpi: { slug: "column-anpi", name: "安否確認", thumb: 1364, description: "家族や入居者、社員と連絡が取れないときの安否確認、警察への相談のしかた、鍵開けの流れと費用、管理会社・法人の方向けの情報をまとめています。",
      posts: ["anpi-kakunin-keisatsu", "oya-renraku-torenai", "anpi-kakunin-houritsu", "mudan-kekkin-renraku-torenai", "nyukyosha-renraku-torenai", "anpi-kakunin-hiyou", "oya-mimamori-sonae", "kanri-kaisha-kagiya-erabikata"] },
  };
  const CAT = {}; // 保存の直前にカテゴリーを用意して入れる（column と各テーマ）
  const relatedCols = (key, title, n = 12) => G("km-section km-related", [
    H(title),
    B("core/latest-posts", { categories: [{ id: CAT[key].id, value: CAT[key].name }], postsToShow: n, displayPostDate: false, order: "desc", orderBy: "date", className: "km-related-list" }),
    P(`<a href="${CAT[key].link}">${CAT[key].name}の記事をすべて見る →</a>`),
  ]);

  // ======================================================================
  // ページの定義
  // ======================================================================
  const PAGES = [];

  // ---- トップ ----
  PAGES.push({
    slug: "top",
    title: "トップ",
    headTitle: "鍵開け・鍵交換の鍵マッハ24｜赤羽拠点・東京都内24時間受付",
    excerpt: "家の鍵をなくした・家に入れない時の鍵開け、鍵交換、家族や入居者と連絡が取れない時の安否確認の鍵開けは鍵マッハ24へ。赤羽を拠点に東京都内へ24時間出張。作業前に書面でお見積もりをお出しします。",
    hideHeader: true,
    blocks: () => lp([
      G("km-section km-fv", [
        medal(),
        P("東京都内・埼玉県南部｜24時間受付", "km-eyebrow"),
        H('鍵開け・鍵交換<br><mark class="km-mk">最短5分</mark>で駆けつけ', 1),
        telButton(),
        L(["作業前に書面でお見積もり", "鍵が開かなかったら0円", "年間3,000件以上の実績"], "km-chips"),
        P(A("/anpi-kakunin/", "家族・入居者と連絡が取れない方（安否確認）はこちら"), "km-fv__sub"),
      ]),
      message(),
      G("km-section", [H("どんなお困りですか？"), tiles()]),
      G("km-section km-band", [H("お客様の声"), voiceList(cases.filter(isHome), 3), P("作業事例に掲載しているお客様のご感想から抜粋しています。", "km-note")]),
      G("km-section", [H("料金の目安"), T([priceBase, priceOpen[0], priceChange[0]]), priceNote(), cheapWarning()]),
      G("km-section", flow(2)),
      G("km-section km-band", rules()),
      G("km-section", [H("鍵マッハ24が選ばれる理由"), stats(), fvPhotos()]),
      G("km-section", [H("最近の作業事例"), caseList(cases.filter(isHome), 4)]),
      G("km-section", [H("対応エリア"), P("東京都内の各地でスタッフが待機しているので、最短5分で到着します。埼玉県南部と多摩地域にも伺います。到着の目安は、お電話でお伝えします。"), areaLinks(), P(A("/area/", "対応エリアをすべて見る"))]),
      relatedCols("column", "鍵のお役立ちコラム", 6),
      cta("鍵のトラブル・安否確認、今すぐご相談ください"),
      LD(business),
      LD(organization),
      LD({ "@context": "https://schema.org", "@type": "WebSite", name: "鍵マッハ24", url: SITE + "/", publisher: { "@id": ORG_ID } }),
    ]),
  });

  // ---- 鍵をなくした・家に入れない ----
  PAGES.push({
    slug: "kagi-funshitsu",
    title: "家の鍵をなくした・家に入れないときの鍵開け",
    headTitle: "家の鍵をなくした・家に入れない時の鍵開け｜東京24時間 鍵マッハ24",
    excerpt: "家の鍵をなくした、締め出された、オートロックで入れない時は鍵マッハ24へ。東京都内に24時間出張し、最短5分で到着。ほとんどの鍵は壊さずに開けられます。作業前に書面でお見積もり、開かなかったら0円です。",
    blocks: () => lp([
      answer("<strong>家の鍵をなくして入れないときは、鍵屋に鍵を開けてもらうのが一番早い方法です。</strong>鍵マッハ24は24時間受付、東京都内に最短5分で到着し、作業前に総額をお伝えします。"),
      telButton(),
      G("km-section", [
        H("こんなときにご依頼ください"),
        P("鍵マッハ24でご相談がいちばん多いのは「外出中に鍵をなくした」、次が「鍵が折れて家に入れない」、その次が「鍵は刺さるのに開きにくい・抜けにくい」です。"),
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
      G("km-section km-band", [H("鍵をなくしたお客様の声"), voiceList(cases.filter((c) => isHome(c) && (isLost(c) || isStuck(c))), 3)]),
      G("km-section", [H("鍵開けの料金"), T([priceBase, ...priceOpen]), priceNote(), cheapWarning()]),
      G("km-section", [...rules(), ...flow()]),
      G("km-section", [
        H("本人確認について"),
        P("鍵開けは、防犯のため必ずご本人であることを確認してから行います。確認は顔写真付きの身分証（運転免許証、マイナンバーカード、パスポート、在留カードなど）で行います。身分証が家の中にある場合は、開けた後に確認させていただきます。顔写真付きの身分証をお持ちでない場合は、不動産の契約書や公共料金の支払い書などで確認します。ご本人以外のお部屋は開けられません。"),
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
      G("km-section", [H("鍵の紛失・締め出しの作業事例"), caseList(cases.filter((c) => isHome(c) && (isLost(c) || isStuck(c))), 8)]),
      G("km-section km-band", faqBlocks(FAQ_LOST)),
      relatedCols("nakushita", "鍵をなくした・開かないときのコラム"),
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
          "<strong>防犯性を上げたい。</strong>防犯性の高いディンプルキーへの交換",
        ]),
      ]),
      stats(),
      G("km-section", [H("鍵交換は3つの考え方から選べます"), plans(), P("どれにするか迷ったら、お電話でご相談ください。ドアに合う部品と総額をお伝えします。", "km-note")]),
      ...lineBox(),
      G("km-section", [H("鍵交換の料金"), T([priceBase, ...priceChange]), priceNote(), cheapWarning()]),
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
          "<strong>交換</strong>　ご了承いただいてから作業します。作業そのものは10〜15分ほどです（ご説明とお支払いを含めて25分ほど）。",
          "<strong>新しい鍵のお渡し</strong>　新しい鍵が全部そろっているか一緒に確認します。",
        ], "km-steps", true),
        P("賃貸の場合は、交換の前に管理会社か大家さんの許可を取ってください。", "km-note"),
      ]),
      G("km-section km-band", faqBlocks(FAQ_KOUKAN)),
      relatedCols("koukan", "鍵交換・防犯のコラム"),
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
      G("km-section", [H("安否確認の鍵開けの料金"), T([priceBase, ...priceAnpi]), priceNote()]),
      G("km-section", [
        H("管理会社・大家さん・法人の方へ"),
        P(`入居者や社員の安否確認を継続してお任せいただけます。請求書でのお支払い（法人のお客様のみ）と、作業報告書の発行に対応します。　${A("/houjin/", "法人の方へ →")}`),
      ]),
      G("km-section km-band", faqBlocks(FAQ_ANPI)),
      relatedCols("anpi", "安否確認のコラム"),
      cta("安否確認の鍵開け、今すぐご相談ください"),
      supervisor(),
      LD(service("安否確認の鍵開け", "鍵開け", "/anpi-kakunin/", "家族・入居者と連絡が取れない時の安否確認の鍵開け。警察やご家族の立ち会いのもとで作業。")),
      LD(faqLd(FAQ_ANPI)),
    ], "km-anpi-page"),
  });

  // ---- 法人の方へ ----
  const FAQ_HOUJIN = [
    ["取引を始めるには、どうすればいいですか？", "お電話かLINEでご連絡ください。物件の数やご依頼の内容をうかがい、お支払い方法などを決めて、その日からご依頼いただけます。"],
    ["請求書の締め日と支払い期限は？", "標準は、当月末締め・翌月末払いです。御社のご都合に合わせてご相談できます。"],
    ["適格請求書（インボイス）に対応していますか？", "はい。株式会社H-GATEは適格請求書発行事業者です（登録番号 T9012301013027）。"],
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
          "<strong>請求書払い・作業報告書・インボイス対応。</strong>法人のお客様は請求書でお支払いいただけます（標準は月末締め・翌月末払い）。作業ごとに作業報告書を発行します。適格請求書の登録番号は T9012301013027 です。",
        ], "km-steps", true),
      ]),
      G("km-section", [H("管理物件での作業事例"), caseList(cases.filter((c) => /賃貸|物件|管理/.test(c.ask)), 4)]),
      ...lineBox("物件名と写真を送るだけでご依頼いただけます", "管理会社・大家さんのご依頼は、LINEでも受け付けます。物件名と部屋番号、鍵の写真をお送りいただければ、日程と金額の目安をお返しします。作業報告書もLINEでお送りできます。"),
      G("km-section km-band", faqBlocks(FAQ_HOUJIN)),
      G("km-section", [
        H("お取引のご相談"),
        P(`お電話（${TEL_TEXT}）か、<a href="${LINE_URL}">公式LINE</a>からご連絡ください。`),
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
      answer("<strong>料金は「基本料金5,500円（出張・お見積もり）＋作業料金」です。</strong>部品が必要な作業は、部品代がかかります。表示は税込です。到着後、作業前に書面でお見積もりをお出しし、作業内容と金額にご納得いただいてから作業に入ります。鍵が開かなかった場合は0円です。"),
      cheapWarning(false),
      G("km-section", [H("基本料金"), T([priceBase]), P("出張とお見積もりの費用です。すべてのご依頼でかかります。これ以外に、出張費や見積もり料はいただきません。", "km-note")]),
      G("km-section", [H("鍵開け"), T(priceOpen)]),
      G("km-section", [H("鍵交換"), T(priceChange)]),
      G("km-section", [H("鍵の修理"), T(priceOther)]),
      G("km-section", [H("安否確認の鍵開け"), T(priceAnpi)]),
      ...lineBox("お家の鍵の場合はいくら？写真で目安をお伝えします"),
      G("km-section", [
        H("時間帯の割増・そのほかの費用"),
        T(priceExtra),
        priceNote(),
      ]),
      G("km-section", [H("お支払い方法"), T([["現金", "対応"], ["クレジットカード", "VISA・Mastercard・JCB・American Express・Diners Club"], ["スマホのタッチ決済", "Apple Payなど"], ["請求書", "法人のお客様のみ（インボイス対応）"]], "km-area-table")]),
      G("km-section km-band", rules()),
      G("km-section km-band", faqBlocks(FAQ_PRICE)),
      relatedCols("ryoukin", "料金・鍵屋の選び方のコラム"),
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
      answer("<strong>東京都内と埼玉県南部に、24時間出張しています。</strong>10名以上のスタッフが都内の各地で待機しているので、最短5分で到着します。到着の目安は、その時に待機しているスタッフの場所によって変わるため、お電話でお伝えします。"),
      G("km-section", [H("到着の目安"), T([["東京23区", "最短5分（待機しているスタッフの場所によって変わります）"], ["埼玉県 " + SAITAMA.join("・"), "お電話でご確認ください"], ["多摩地域", "お電話でご確認ください"]], "km-area-table"), P("府中市より西の地域は、少しお時間をいただきます。", "km-note")]),
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
        G("km-section", [H("料金の目安"), T([priceBase, priceOpen[0], priceChange[0]]), priceNote(), P(A("/price/", "料金表をすべて見る →"))]),
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
  // コラムの本文は columns.js（各3,000字以上）。先に columns.js を読み込んでおく
  if (!window.kmColumns) throw new Error("columns.js が読み込まれていません");
  const parts = { B, P, H, L, T, G, A, D, TODO, answer, telButton, supervisor, LD, faqLd, lp };
  // 第1弾（毎日投稿の1〜7本目）は columns2.js。読み込んでいれば一緒に下書きにする
  const COLUMNS = [...window.kmColumns(parts), ...(window.kmColumns2 ? window.kmColumns2(parts) : []), ...(window.kmColumns3 ? window.kmColumns3(parts) : []), ...(window.kmColumns4 ? window.kmColumns4(parts) : []), ...(window.kmColumns5 ? window.kmColumns5(parts) : [])];

  // ======================================================================
  // 保存（下書きのみ）
  // ======================================================================
  const css = cssText.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\n\s*\n/g, "\n").trim(); // WAFが「/* */」を止めるため外す
  // トップは、テーマのスライドショー（古い画像「年間実績3万件以上」など）も隠す
  const hideHeaderCss = "\n.page-header, .breadcrumb { display: none; }\n.site-body { padding-top: 16px; }\n.lightning_swiper { display: none !important; }";
  const design = { layout: "col-one-no-subsection", site_body_padding: "" };

  // 2026/11/6 公開後：下書きだけでなく、公開中・予約中のページも同じスラッグで探して上書きする（状態はそのまま）
  const findDraft = async (type, slug) => {
    const list = await wp.apiFetch({ path: `/wp/v2/${type}?status=draft,publish,future,pending,private&slug=${slug}&context=edit&_fields=id` });
    return list[0]?.id;
  };
  const upsert = async (type, def, extra = {}) => {
    let id = await findDraft(type, def.slug);
    // WAFは「長い本文つきの新規作成」を止めるので、先に空の下書きを作ってから本文を入れる
    if (!id) id = (await wp.apiFetch({ path: `/wp/v2/${type}`, method: "POST", data: { title: def.slug, slug: def.slug, status: "draft" } })).id;
    const data = {
      title: def.title,
      slug: def.slug,
      content: wp.blocks.serialize(def.blocks()),
      excerpt: def.excerpt,
      veu_head_title_object: { title: def.headTitle, add_site_title: "" },
      meta: { _veu_custom_css: css + (def.hideHeader ? hideHeaderCss : ""), _lightning_design_setting: design },
      ...extra,
    };
    const res = await wp.apiFetch({ path: `/wp/v2/${type}/${id}`, method: "POST", data });
    return { type, id: res.id, slug: def.slug, len: data.content.length };
  };

  // コラム用のカテゴリー（スラッグ column）と、テーマ別の子カテゴリー。なければ作る（記事がない間はサイトに表示されない）
  const ensureCat = async (slug, name, description, parent = 0) => {
    let c = (await wp.apiFetch({ path: `/wp/v2/categories?slug=${slug}&_fields=id,name,link,parent` }))[0];
    if (!c) c = await wp.apiFetch({ path: "/wp/v2/categories", method: "POST", data: { name, slug, description, parent } });
    else c = await wp.apiFetch({ path: `/wp/v2/categories/${c.id}`, method: "POST", data: { name, description, parent } });
    return { id: c.id, name: c.name, link: c.link };
  };
  CAT.column = await ensureCat("column", "鍵のお役立ちコラム", "鍵をなくしたとき、鍵交換、防犯、料金、安否確認について、鍵屋が分かりやすく解説するコラムです。");
  for (const [key, c] of Object.entries(CLUSTERS)) CAT[key] = await ensureCat(c.slug, c.name, c.description, CAT.column.id);
  const clusterOf = (slug) => Object.keys(CLUSTERS).find((k) => CLUSTERS[k].posts.includes(slug));

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

  for (const def of COLUMNS) {
    const key = clusterOf(def.slug);
    if (!key) throw new Error("テーマが決まっていないコラム: " + def.slug);
    // アイキャッチはテーマ別のブランド画像（wordpress/thumbs/、2026/11/8）
    results.push(await upsert("posts", def, { categories: [CAT.column.id, CAT[key].id], featured_media: CLUSTERS[key].thumb }));
  }
  return results;
}
