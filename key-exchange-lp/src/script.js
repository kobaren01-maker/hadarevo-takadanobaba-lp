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
    initFixedCta();
    initTracking();
  });
})();
