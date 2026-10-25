/* ==========================================================================
   鍵開け・鍵交換 LP（骨組み）
   固定CTAの表示制御 / 電話・LINEタップ計測
   ========================================================================== */

(function () {
  "use strict";

  // FVの電話ボタンが画面外に出たら固定バーを表示する（同じボタンが2つ同時に見えないように）
  function initFixedCta() {
    var bar = document.getElementById("fixed-cta");
    var fvTel = document.getElementById("fv-tel");
    if (!bar || !fvTel || !("IntersectionObserver" in window)) {
      if (bar) bar.classList.add("is-visible");
      return;
    }
    new IntersectionObserver(function (entries) {
      var hidden = !entries[0].isIntersecting;
      bar.classList.toggle("is-visible", hidden);
      bar.setAttribute("aria-hidden", hidden ? "false" : "true");
    }).observe(fvTel);
  }

  // 広告グループ別のFV出し分け。広告文と同じ言葉で迎えることで「探していたページだ」と即判断させる
  // 【要確認】金額は料金表と必ず一致させる（不一致は広告審査・信頼の両方で問題になる）
  var FV_VARIANTS = {
    funshitsu: { lead: "鍵をなくして家に入れない方へ", priceLabel: "玄関の鍵開け", price: "◯◯" },
    kagiake:   { lead: "玄関の鍵開け・閉め出し",       priceLabel: "玄関の鍵開け", price: "◯◯" },
    koukan:    { lead: "鍵交換・シリンダー交換",       priceLabel: "鍵交換（部品込み）", price: "◯◯〜" },
    car:       { lead: "車・バイクの鍵トラブル",       priceLabel: "車の鍵開け（インロック）", price: "◯◯" }
  };

  function initFvVariant() {
    var type = new URLSearchParams(location.search).get("type");
    var v = type && FV_VARIANTS[type];
    if (!v) return;
    document.getElementById("fv-lead").textContent = v.lead;
    document.getElementById("fv-price-label").textContent = v.priceLabel;
    document.getElementById("fv-price-num").textContent = v.price;

    // 該当するお困りごとボタンを先頭へ
    var list = document.getElementById("trouble-list");
    var item = list && list.querySelector('[data-type="' + type + '"]');
    if (item) list.insertBefore(item, list.firstElementChild);
  }

  // GA4（gtag）が読み込まれていればイベント送信。data-cta で設置位置を区別する
  function initTracking() {
    function bind(selector, eventName) {
      document.querySelectorAll(selector).forEach(function (el) {
        el.addEventListener("click", function () {
          if (typeof window.gtag === "function") {
            window.gtag("event", eventName, { cta_position: el.dataset.cta || "" });
          }
        });
      });
    }
    bind(".js-tel", "tel_click");
    bind(".js-line", "line_click");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("fv-lead")) initFvVariant();
    initFixedCta();
    initTracking();
  });
})();
