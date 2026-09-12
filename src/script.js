// 肌REVO 高田馬場店 LP - 挙動まわり
// 1) 画像未配置時のプレースホルダー表示
// 2) BLOCK02 口コミの横自動スクロール（ゆっくりループ／操作時は一時停止）
// 3) スマホ固定CTAバーの表示切り替え
// 4) BLOCK10 予約枠選択・予約フォーム（Google Apps Script Web Appと通信）
// 5) manage.html 予約確認・日時変更・キャンセル（同じくApps Script Web Appと通信）
//
// 画像キャッシュについて：差し替えた画像がブラウザに反映されない/切り替わる瞬間に
// 一瞬古い画像と重なって見える場合は、index.html側のimg srcに直接
// ?v=を付けてバージョンを上げること（README参照）。JSでsrcを書き換える方式は、
// 初回に古い画像が一瞬表示されてから新しい画像に切り替わる二段階読み込みになり、
// かえって「二重に見える」瞬間を生みやすいため採用しない。

// 予約バックエンド（Google Apps Script）のWeb App URLと、
// 予約完了時に発火するMeta PixelのカスタムイベントIDはここで差し替える。
// デプロイ手順・スプレッドシート構成は README.md を参照。
const RESERVE_CONFIG = {
  webAppUrl: "https://script.google.com/macros/s/AKfycbw53HzQx_vUexfyJuu_TLxHTv7GhCdYTiBdB0CxBKfmDkYhYACjfFVfQRAwV_Oa8hBA/exec",
  initialSlotCount: 5,
};

document.addEventListener("DOMContentLoaded", () => {
  // 口コミの複製（クローン）を先に済ませてから、
  // プレースホルダー監視を仕込む（複製後のimgにも効かせるため）
  initReviewScroller();
  initImagePlaceholders();
  initStickyCta();
  initReservation();
  initManage();
});

/* ---- 1. 画像プレースホルダー ----
   error イベントは bubbling しないため、document 側で capture して拾う。
   これにより複製されたimg要素にも個別リスナーなしで対応できる。
*/
function initImagePlaceholders() {
  const markMissing = (img) => {
    const slot = img.closest(".img-slot");
    if (slot) slot.classList.add("img-missing");
  };

  document.addEventListener(
    "error",
    (e) => {
      if (e.target && e.target.tagName === "IMG" && e.target.closest(".img-slot")) {
        markMissing(e.target);
      }
    },
    true
  );

  document.querySelectorAll(".img-slot img").forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      markMissing(img);
    }
  });
}

/* ---- 2. 口コミ横スクロール（無限ループ・低速オートスクロール） ---- */
function initReviewScroller() {
  const scroller = document.querySelector("[data-review-scroller]");
  if (!scroller) return;

  const track = scroller.querySelector(".review-scroller__track");
  if (!track) return;

  // ループ用に中身を複製
  const originalHTML = track.innerHTML;
  track.innerHTML = originalHTML + originalHTML;

  let paused = false;
  let resumeTimer = null;
  const SPEED = 0.35; // px / frame（ゆっくり）

  scroller.addEventListener("pointerdown", () => {
    paused = true;
    if (resumeTimer) clearTimeout(resumeTimer);
  });
  scroller.addEventListener("pointerup", () => {
    resumeTimer = setTimeout(() => (paused = false), 2500);
  });
  scroller.addEventListener("touchstart", () => {
    paused = true;
    if (resumeTimer) clearTimeout(resumeTimer);
  }, { passive: true });
  scroller.addEventListener("touchend", () => {
    resumeTimer = setTimeout(() => (paused = false), 2500);
  });

  function tick() {
    if (!paused) {
      scroller.scrollLeft += SPEED;
      const half = track.scrollWidth / 2;
      if (scroller.scrollLeft >= half) {
        scroller.scrollLeft -= half;
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---- 3. スマホ固定CTAバー ----
   最初から常時表示し、スクロール位置に関係なく一切隠さない。
   （以前はFV・オファー画像・最終ステップが画面内にある間だけ隠す
   仕様だったが、常に予約導線を見せておきたいという方針に変更した）
*/
function initStickyCta() {
  const bar = document.querySelector("[data-sticky-cta]");
  if (!bar) return;
  bar.classList.add("is-visible");
}

/* ---- 4. 予約枠選択・予約フォーム ----
   空き枠はHot Pepper Beautyの自動取得ではなく、肌REVO側が独自管理する
   Googleスプレッドシート（Apps Script Web App経由）から取得する。
   HPB経由の予約はスタッフが手動で同じ枠を埋める運用が前提。
*/
function initReservation() {
  const root = document.querySelector("[data-reserve]");
  if (!root) return;

  const statusEl = root.querySelector("[data-reserve-status]");
  const slotsEl = root.querySelector("[data-reserve-slots]");
  const moreBtn = root.querySelector("[data-reserve-more]");
  const calendarToggleBtn = root.querySelector("[data-reserve-calendar-toggle]");
  const calendarEl = root.querySelector("[data-reserve-calendar]");
  const dateInput = root.querySelector("[data-reserve-date-input]");
  const dateSlotsEl = root.querySelector("[data-reserve-date-slots]");
  const calendarEmptyEl = root.querySelector("[data-reserve-calendar-empty]");
  const form = root.querySelector("[data-reserve-form]");
  const selectedEl = root.querySelector("[data-reserve-selected]");
  const errorEl = root.querySelector("[data-reserve-error]");
  const completeEl = root.querySelector("[data-reserve-complete]");

  let allSlots = [];
  let expanded = false;
  let selectedSlot = null;

  fetchSlots();

  moreBtn.addEventListener("click", () => {
    expanded = true;
    renderSlots();
  });

  calendarToggleBtn.addEventListener("click", () => {
    calendarEl.hidden = !calendarEl.hidden;
  });

  dateInput.addEventListener("change", () => {
    renderDateSlots(dateInput.value);
  });

  form.addEventListener("submit", onSubmit);

  async function fetchSlots() {
    if (!RESERVE_CONFIG.webAppUrl || RESERVE_CONFIG.webAppUrl.startsWith("REPLACE_")) {
      // 予約バックエンド未接続の間は、ブロックごと非表示にして余白も詰める。
      // Apps ScriptのURLを設定すれば自動的に表示されるようになる。
      root.hidden = true;
      return;
    }
    try {
      const res = await fetch(`${RESERVE_CONFIG.webAppUrl}?action=slots`);
      if (!res.ok) throw new Error("failed to fetch slots");
      const data = await res.json();
      allSlots = Array.isArray(data.slots) ? data.slots : [];
      renderSlots();
    } catch (err) {
      statusEl.textContent = "空き状況の取得に失敗しました。時間をおいて再度お試しください。";
    }
  }

  function renderSlots() {
    if (allSlots.length === 0) {
      statusEl.textContent = "現在ご案内できる空き枠がありません。お電話にてお問い合わせください。";
      slotsEl.hidden = true;
      moreBtn.hidden = true;
      calendarToggleBtn.hidden = true;
      return;
    }

    statusEl.textContent = "ご希望の日時をお選びください。";
    slotsEl.hidden = false;
    slotsEl.innerHTML = "";

    const visible = expanded ? allSlots : allSlots.slice(0, RESERVE_CONFIG.initialSlotCount);

    visible.forEach((slot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "reserve__slot";
      btn.textContent = slot.label;
      btn.dataset.slotId = slot.id;
      if (selectedSlot && selectedSlot.id === slot.id) {
        btn.classList.add("is-selected");
      }
      btn.addEventListener("click", () => selectSlot(slot));
      slotsEl.appendChild(btn);
    });

    moreBtn.hidden = expanded || allSlots.length <= RESERVE_CONFIG.initialSlotCount;
    calendarToggleBtn.hidden = false;
    dateInput.min = allSlots[0].date;
  }

  function renderDateSlots(dateStr) {
    calendarEmptyEl.hidden = true;
    dateSlotsEl.innerHTML = "";

    if (!dateStr) return;

    const matches = allSlots.filter((slot) => slot.date === dateStr);

    if (matches.length === 0) {
      calendarEmptyEl.hidden = false;
      return;
    }

    matches.forEach((slot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "reserve__slot";
      btn.textContent = slot.label;
      btn.dataset.slotId = slot.id;
      if (selectedSlot && selectedSlot.id === slot.id) {
        btn.classList.add("is-selected");
      }
      btn.addEventListener("click", () => selectSlot(slot));
      dateSlotsEl.appendChild(btn);
    });
  }

  function renderComplete(data) {
    const detailEl = root.querySelector("[data-reserve-complete-detail]");
    if (!detailEl) return;
    if (data.manageUrl) {
      detailEl.innerHTML = `ご予約日時：${escapeHtml(selectedSlot.label)}<br />予約管理リンク：<a href="${escapeHtml(
        data.manageUrl
      )}">${escapeHtml(data.manageUrl)}</a>（このリンクは大切に保存してください）`;
    } else {
      detailEl.textContent = `ご予約日時：${selectedSlot.label}`;
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  function selectSlot(slot) {
    selectedSlot = slot;
    selectedEl.textContent = slot.label;
    form.hidden = false;
    errorEl.hidden = true;
    renderSlots();
    if (dateInput.value) renderDateSlots(dateInput.value);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!selectedSlot) return;

    errorEl.hidden = true;
    const submitBtn = form.querySelector("[data-reserve-submit]");
    submitBtn.disabled = true;

    const formData = new FormData(form);
    const payload = {
      action: "create",
      slotId: selectedSlot.id,
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email") || "",
    };

    try {
      const res = await fetch(RESERVE_CONFIG.webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.message || "この日時は直前に予約が埋まった可能性があります。");
      }

      allSlots = allSlots.filter((s) => s.id !== selectedSlot.id);
      form.hidden = true;
      slotsEl.hidden = true;
      moreBtn.hidden = true;
      calendarToggleBtn.hidden = true;
      calendarEl.hidden = true;
      statusEl.hidden = true;
      completeEl.hidden = false;
      renderComplete(data);

      if (typeof fbq === "function") {
        fbq("trackCustom", "ReservationComplete", { slot: selectedSlot.label });
      }
    } catch (err) {
      errorEl.textContent = err.message || "予約に失敗しました。もう一度お試しください。";
      errorEl.hidden = false;
      selectedSlot = null;
      form.hidden = true;
      await fetchSlots();
    } finally {
      submitBtn.disabled = false;
    }
  }
}

/* ---- 5. 予約確認・日時変更・キャンセル（manage.html） ----
   URLの ?t=トークン で本人の予約を特定する。
   来店前日23:59を過ぎた予約は、バックエンド側(isChangeAllowed)の判定に従い
   変更・キャンセルの操作自体をここでも無効化する。
*/
function initManage() {
  const root = document.querySelector("[data-manage-app]");
  if (!root) return;

  const token = new URLSearchParams(window.location.search).get("t");
  const statusEl = root.querySelector("[data-manage-status]");
  const currentEl = root.querySelector("[data-manage-current]");
  const datetimeEl = root.querySelector("[data-manage-datetime]");
  const actionsEl = root.querySelector("[data-manage-actions]");
  const deadlineNoteEl = root.querySelector("[data-manage-deadline-note]");
  const rescheduleBtn = root.querySelector("[data-manage-reschedule]");
  const cancelBtn = root.querySelector("[data-manage-cancel]");
  const slotsEl = root.querySelector("[data-manage-slots]");
  const resultEl = root.querySelector("[data-manage-result]");

  if (!token) {
    statusEl.textContent = "予約管理リンクが正しくありません。予約完了時に届いたリンクからアクセスしてください。";
    return;
  }
  if (!RESERVE_CONFIG.webAppUrl || RESERVE_CONFIG.webAppUrl.startsWith("REPLACE_")) {
    statusEl.textContent = "現在準備中です。お電話にてお問い合わせください。";
    return;
  }

  loadBooking();

  rescheduleBtn.addEventListener("click", async () => {
    slotsEl.hidden = false;
    slotsEl.innerHTML = "読み込み中…";
    try {
      const res = await fetch(`${RESERVE_CONFIG.webAppUrl}?action=slots`);
      const data = await res.json();
      const slots = Array.isArray(data.slots) ? data.slots : [];
      slotsEl.innerHTML = "";
      if (slots.length === 0) {
        slotsEl.textContent = "現在ご案内できる空き枠がありません。お電話にてお問い合わせください。";
        return;
      }
      slots.forEach((slot) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "reserve__slot";
        btn.textContent = slot.label;
        btn.addEventListener("click", () => doReschedule(slot.id, slot.label));
        slotsEl.appendChild(btn);
      });
    } catch (err) {
      slotsEl.textContent = "空き状況の取得に失敗しました。時間をおいて再度お試しください。";
    }
  });

  cancelBtn.addEventListener("click", () => {
    if (!window.confirm("この予約をキャンセルします。よろしいですか？")) return;
    doCancel();
  });

  async function loadBooking() {
    try {
      const res = await fetch(`${RESERVE_CONFIG.webAppUrl}?action=booking&token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!data.ok) {
        statusEl.textContent = data.message || "予約が見つかりませんでした。";
        return;
      }
      if (data.status === "cancelled") {
        statusEl.textContent = "この予約はすでにキャンセルされています。";
        return;
      }

      statusEl.hidden = true;
      currentEl.hidden = false;
      datetimeEl.textContent = `${data.date} ${data.time}`;

      if (!data.canChange) {
        actionsEl.hidden = true;
        deadlineNoteEl.hidden = false;
      }
    } catch (err) {
      statusEl.textContent = "予約の確認に失敗しました。時間をおいて再度お試しください。";
    }
  }

  async function doReschedule(newSlotId, newLabel) {
    resultEl.hidden = true;
    try {
      const res = await fetch(RESERVE_CONFIG.webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "reschedule", token, newSlotId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      slotsEl.hidden = true;
      datetimeEl.textContent = newLabel;
      resultEl.textContent = "日時を変更しました。";
      resultEl.hidden = false;
    } catch (err) {
      resultEl.textContent = err.message || "変更に失敗しました。もう一度お試しください。";
      resultEl.hidden = false;
    }
  }

  async function doCancel() {
    resultEl.hidden = true;
    try {
      const res = await fetch(RESERVE_CONFIG.webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "cancel", token }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message);

      actionsEl.hidden = true;
      resultEl.textContent = "予約をキャンセルしました。";
      resultEl.hidden = false;
    } catch (err) {
      resultEl.textContent = err.message || "キャンセルに失敗しました。もう一度お試しください。";
      resultEl.hidden = false;
    }
  }
}
