/* ==========================================================================
   フッター（ウィジェット block-10）を新しいデザインに作り直す（2026/11/6 公開後）
   - 古いフッターの「無料でお見積り」は、基本料金5,500円に見積もりが含まれるため事実と違う → 外す
   - 色はサイトと同じ紺。フッターのメニューとコピーライトの帯も、このウィジェットの中のCSSで整える（全ページに効く）
   - スマホ用の block-11 は「使っていないウィジェット」に移す（削除はしない）
   使い方：WordPressの編集画面で読み込んで await kmBuildFooter()
   ========================================================================== */
async function kmBuildFooter() {
  const B = (name, attrs = {}, inner = []) => wp.blocks.createBlock(name, attrs, inner);
  const P = (content, className) => B("core/paragraph", { content, className });
  const css = `
.site-footer { background: #0b2a5b; color: #fff; border-top: 0; margin-top: 0; }
.site-body:has(.km-cta) { padding-bottom: 0 !important; }
.site-body:has(.km-cta) .main-section { margin-bottom: 0 !important; }
.vk_post:has(img[src*="kagimach24-column-"]) .vk_post_imgOuter_singleTermLabel { display: none; }
.entry-body h1, .entry-body h2, .entry-body h3, .entry-body h4, .page-header-title, .entry-title, .site-footer .footer-nav-list a { text-wrap: balance; }
.entry-body p, .entry-body li { text-wrap: pretty; line-break: strict; }
.site-footer .footer-nav { background: #08214a; border: 0; padding: 18px 0; }
.site-footer .footer-nav-list { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 22px; margin: 0; padding: 0 16px; list-style: none; }
.site-footer .footer-nav-list li { margin: 0; padding: 0; border: 0 !important; }
.site-footer .footer-nav-list li::before, .site-footer .footer-nav-list li::after { display: none !important; }
.site-footer .footer-nav-list a { color: #fff !important; font-size: 14px; text-decoration: none; display: inline-block; padding: 6px 0; }
.site-footer .footer-nav-list a:hover { text-decoration: underline; }
.site-footer .site-footer-content { padding-top: 28px; padding-bottom: 28px; }
.site-footer-copyright { background: transparent; border-top: 1px solid rgba(255,255,255,0.15); padding-bottom: 96px; }
.site-footer-copyright p, .site-footer-copyright a { color: #aab6cc !important; font-size: 12px; }
.km-footer { text-align: center; color: #fff; display: grid; gap: 12px; justify-items: center; }
.km-footer p { margin: 0 !important; color: #fff; }
.km-footer .wp-block-image { margin: 0 !important; }
.km-footer .wp-block-image img { width: 240px; max-width: 70vw; height: auto; background: #fff; border-radius: 10px; padding: 8px 14px; }
.km-footer__lead { font-size: 14px; opacity: 0.9; }
.km-footer__tel a { display: inline-block; background: #ff7a00; color: #fff !important; text-decoration: none; border-radius: 999px; font-weight: 900; font-size: 26px; line-height: 1.2; padding: 10px 30px 12px; box-shadow: 0 3px 0 #c75400; white-space: nowrap; }
.km-footer__tel small { display: block; font-size: 12px; font-weight: 700; }
.km-footer__line a { display: inline-block; background: #06c755; color: #fff !important; text-decoration: none; border-radius: 999px; font-weight: 900; font-size: 15px; padding: 10px 26px; }
.km-footer__points { font-size: 14px; font-weight: 700; color: #ffd83d !important; }
.km-footer__company { font-size: 12.5px; line-height: 1.8; opacity: 0.85; }
@media (max-width: 480px) { .km-footer__tel a { font-size: 22px; padding: 10px 22px 12px; } }
`.trim();
  const blocks = [
    B("core/group", { className: "km-footer" }, [
      B("core/image", { url: "https://h-gate.jp/wp-content/uploads/2026/10/kagimach24-logo-footer.webp", alt: "鍵マッハ24", id: 928, sizeSlug: "full", align: "center" }),
      P("東京都内・埼玉県南部　鍵開け・鍵交換・安否確認の鍵開け", "km-footer__lead"),
      P('<a href="tel:07091861366"><small>24時間受付・年中無休</small>070-9186-1366</a>', "km-footer__tel"),
      P('<a href="https://lin.ee/OV5d1Pb">LINEで相談する（友だち追加）</a>', "km-footer__line"),
      P("作業前に書面でお見積もり ／ 鍵が開かなかったら0円", "km-footer__points"),
      P("運営：株式会社H-GATE<br>〒115-0045 東京都北区赤羽1-7-9 赤羽第一葉山ビル4F", "km-footer__company"),
      B("core/html", { content: `<style>${css}</style>` }),
    ]),
  ];
  const content = wp.blocks.serialize(blocks);
  const w10 = await wp.apiFetch({ path: "/wp/v2/widgets/block-10", method: "POST", data: { instance: { raw: { content } } } });
  const w11 = await wp.apiFetch({ path: "/wp/v2/widgets/block-11", method: "POST", data: { sidebar: "wp_inactive_widgets" } });
  return { w10: w10.sidebar, w11: w11.sidebar, len: content.length };
}
