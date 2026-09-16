/**
 * 肌REVO 高田馬場店 LP 予約バックエンド（Google Apps Script）
 *
 * 空き枠は「予約専用のGoogleカレンダー」の予定の有無から自動計算する。
 * スプレッドシートに空き枠を手入力する必要はない。
 *
 * 使い方:
 * 1. Googleカレンダーで新しいカレンダーを作成する（例：「肌REVO高田馬場 予約」）。
 *    このカレンダーの「設定と共有」からカレンダーIDをコピーし、
 *    下記 CALENDAR_ID に設定する。
 * 2. 営業時間（BUSINESS_START_HOUR〜BUSINESS_END_HOUR）のうち、
 *    このカレンダーに予定が入っていない時間帯が「空き」として扱われる。
 *    - 定休日や臨時休業にしたい日は、その日の営業時間帯（例：11:00〜20:00）
 *      に「定休日」等の予定を1件入れるだけでよい。曜日を固定するコードは
 *      書いていないため、不定休（例：基本は火・木だがたまに変わる）にも
 *      そのまま対応できる。
 *    - LP経由の予約が入ると、このカレンダーに自動で予定が作成される。
 *    - Hot Pepper Beauty経由の予約が入った場合は、スタッフがこのカレンダーに
 *      手動で同じ時間帯の予定を1件追加する（LP側との二重予約を防ぐ運用）。
 * 3. Googleスプレッドシートを新規作成し、以下のシートを用意する。
 *
 *    シート「Bookings」（ヘッダー行必須）
 *      token | timestamp | date | time | name | phone | email | status | gender | age | eventId
 *      - LPからの予約はこのシートに自動追記される（予約の記録・本人確認用）。
 *      - status は "confirmed" または "cancelled"。
 *      - token は予約者本人がLPの予約管理ページ（src/manage.html）から
 *        日時変更・キャンセルを行うための一意なキー。
 *      - eventId は上記予約専用カレンダーに作成された予定のID（変更・削除に使う）。
 *
 * 4. 拡張機能 > Apps Script を開き、このファイルの内容を貼り付ける。
 * 5. CALENDAR_ID・NOTIFY_EMAIL を実際の値に書き換える。
 * 6. 「デプロイ」>「新しいデプロイ」>種類「ウェブアプリ」で公開する。
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 *    - Googleカレンダーへのアクセス許可を求められるので許可する。
 * 7. 発行されたWeb App URLを src/script.js の RESERVE_CONFIG.webAppUrl に設定する。
 *
 * 注意:
 * - このスクリプトはHot Pepper Beautyの空き状況を自動取得するものではない。
 * - Salon Boardへの予約登録は行わない。スタッフが手動で登録すること。
 * - 日時変更・キャンセルは「来店前日23:59まで」本人が自分でLPから行える。
 *   来店当日分の変更・キャンセルはこのシステムでは受け付けない
 *   （電話等、店舗側の別対応に誘導する）。
 */

const CALENDAR_ID = "hadarevo.takadanobaba@gmail.com";
const SHEET_BOOKINGS = "Bookings";
// 複数人に通知したい場合はカンマ区切りで追加できる（例: "a@example.com,b@example.com"）
const NOTIFY_EMAIL = "revi.kds@gmail.com,murase416@gmail.com,rukam0225@gmail.com";

const BUSINESS_START_HOUR = 11; // 営業開始 11:00
const BUSINESS_END_HOUR = 20; // 営業終了 20:00
const TREATMENT_MINUTES = 110; // 初回体験ハーブピーリングの所要時間
const SLOT_INTERVAL_MINUTES = 30; // 候補として提示する開始時刻の間隔
const LOOKAHEAD_DAYS = 21; // 何日先まで空き枠を計算するか
const MAX_RETURNED_SLOTS = 30;

const STORE_DISPLAY_NAME = "肌REVO高田馬場店";
const STORE_ADDRESS = "東京都新宿区高田馬場4-9-18 畔上セブンビル402";
const STORE_MAP_URL =
  "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(STORE_ADDRESS);
const STORE_PHONE = "070-8390-6769";

function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  if (action === "slots") {
    return jsonResponse({ ok: true, slots: getAvailableSlots() });
  }
  if (action === "booking") {
    return jsonResponse(getBookingByToken(String(e.parameter.token || "")));
  }
  return jsonResponse({ ok: false, message: "unknown action" });
}

function doPost(e) {
  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ ok: false, message: "リクエストの形式が不正です。" });
  }

  const action = payload.action || "create";

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return jsonResponse({ ok: false, message: "混み合っています。もう一度お試しください。" });
  }

  try {
    if (action === "create") return createBooking(payload);
    if (action === "reschedule") return rescheduleBooking(payload);
    if (action === "cancel") return cancelBooking(payload);
    return jsonResponse({ ok: false, message: "unknown action" });
  } finally {
    lock.releaseLock();
  }
}

/* ---- 予約作成 ---- */

function createBooking(payload) {
  const slotId = String(payload.slotId || "");
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const email = String(payload.email || "").trim();
  const gender = String(payload.gender || "").trim();
  const age = String(payload.age || "").trim();

  if (!slotId || !name || !phone || !email || !gender || !age) {
    return jsonResponse({ ok: false, message: "必須項目が不足しています。" });
  }

  const slotStart = parseSlotId(slotId);
  if (!slotStart) {
    return jsonResponse({ ok: false, message: "指定された日時が見つかりませんでした。" });
  }
  const slotEnd = new Date(slotStart.getTime() + TREATMENT_MINUTES * 60000);

  const calendar = getReservationCalendar();
  if (!isRangeFree(calendar, slotStart, slotEnd)) {
    return jsonResponse({
      ok: false,
      message: "この日時は直前に予約が埋まった可能性があります。他の日時をお選びください。",
    });
  }

  const event = calendar.createEvent(
    `【LP予約】${name}様`,
    slotStart,
    slotEnd,
    { description: `電話番号: ${phone}\nメール: ${email}\n性別: ${gender}\n年齢: ${age}` }
  );

  const dateStr = formatDate(slotStart);
  const timeStr = formatTime(slotStart);

  const token = Utilities.getUuid();
  const bookings = getSheet(SHEET_BOOKINGS);
  bookings.appendRow([
    token,
    new Date(),
    dateStr,
    timeStr,
    name,
    phone,
    email,
    "confirmed",
    gender,
    age,
    event.getId(),
  ]);

  const manageUrl = buildManageUrl(token);
  notifyStaff({ slotDate: dateStr, slotTime: timeStr, name, phone, email, gender, age, type: "新規予約" });
  notifyCustomer(email, { date: dateStr, time: timeStr, manageUrl });

  return jsonResponse({ ok: true, token, manageUrl, date: dateStr, time: timeStr });
}

/* ---- 日時変更（来店前日23:59まで） ---- */

function rescheduleBooking(payload) {
  const token = String(payload.token || "");
  const newSlotId = String(payload.newSlotId || "");

  const bookingsSheet = getSheet(SHEET_BOOKINGS);
  const booking = findBookingRow(bookingsSheet, token);
  if (!booking || booking.status !== "confirmed") {
    return jsonResponse({ ok: false, message: "有効な予約が見つかりませんでした。" });
  }
  if (!isChangeAllowed(booking.date)) {
    return jsonResponse({
      ok: false,
      message: "ご来店前日を過ぎているため、このページからの変更はできません。お電話にてご連絡ください。",
    });
  }

  const newSlotStart = parseSlotId(newSlotId);
  if (!newSlotStart) {
    return jsonResponse({ ok: false, message: "指定された日時が見つかりませんでした。" });
  }
  const newSlotEnd = new Date(newSlotStart.getTime() + TREATMENT_MINUTES * 60000);

  const calendar = getReservationCalendar();
  if (!isRangeFree(calendar, newSlotStart, newSlotEnd)) {
    return jsonResponse({ ok: false, message: "その日時はすでに埋まっています。他の日時をお選びください。" });
  }

  const oldEvent = booking.eventId ? calendar.getEventById(booking.eventId) : null;
  if (oldEvent) oldEvent.deleteEvent();

  const newEvent = calendar.createEvent(
    `【LP予約】${booking.name}様`,
    newSlotStart,
    newSlotEnd,
    { description: `電話番号: ${booking.phone}\nメール: ${booking.email}` }
  );

  const newDateStr = formatDate(newSlotStart);
  const newTimeStr = formatTime(newSlotStart);

  bookingsSheet.getRange(booking.row, booking.dateCol + 1).setValue(newDateStr);
  bookingsSheet.getRange(booking.row, booking.timeCol + 1).setValue(newTimeStr);
  bookingsSheet.getRange(booking.row, booking.eventIdCol + 1).setValue(newEvent.getId());

  notifyStaff({
    slotDate: newDateStr,
    slotTime: newTimeStr,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    type: `日時変更（変更前: ${booking.date} ${booking.time}）`,
  });

  return jsonResponse({ ok: true, date: newDateStr, time: newTimeStr });
}

/* ---- キャンセル（来店前日23:59まで） ---- */

function cancelBooking(payload) {
  const token = String(payload.token || "");

  const bookingsSheet = getSheet(SHEET_BOOKINGS);
  const booking = findBookingRow(bookingsSheet, token);
  if (!booking || booking.status !== "confirmed") {
    return jsonResponse({ ok: false, message: "有効な予約が見つかりませんでした。" });
  }
  if (!isChangeAllowed(booking.date)) {
    return jsonResponse({
      ok: false,
      message: "ご来店前日を過ぎているため、このページからのキャンセルはできません。お電話にてご連絡ください。",
    });
  }

  bookingsSheet.getRange(booking.row, booking.statusCol + 1).setValue("cancelled");

  if (booking.eventId) {
    const calendar = getReservationCalendar();
    const event = calendar.getEventById(booking.eventId);
    if (event) event.deleteEvent();
  }

  notifyStaff({
    slotDate: booking.date,
    slotTime: booking.time,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    type: "キャンセル",
  });

  return jsonResponse({ ok: true });
}

/* ---- 予約状況の取得（本人の管理ページ用） ---- */

function getBookingByToken(token) {
  if (!token) return { ok: false, message: "トークンが指定されていません。" };

  const bookingsSheet = getSheet(SHEET_BOOKINGS);
  const booking = findBookingRow(bookingsSheet, token);
  if (!booking) return { ok: false, message: "予約が見つかりませんでした。" };

  return {
    ok: true,
    status: booking.status,
    date: booking.date,
    time: booking.time,
    canChange: booking.status === "confirmed" && isChangeAllowed(booking.date),
  };
}

/* ---- 空き枠の計算（Googleカレンダーの予定の有無から算出） ---- */

function getAvailableSlots() {
  const calendar = getReservationCalendar();
  const now = new Date();
  const rangeEnd = new Date();
  rangeEnd.setDate(rangeEnd.getDate() + LOOKAHEAD_DAYS);

  const events = calendar.getEvents(now, rangeEnd);
  const slots = [];

  for (let d = 0; d < LOOKAHEAD_DAYS; d++) {
    const day = new Date();
    day.setDate(day.getDate() + d);
    day.setHours(BUSINESS_START_HOUR, 0, 0, 0);

    const dayEnd = new Date(day);
    dayEnd.setHours(BUSINESS_END_HOUR, 0, 0, 0);

    const windowStart = day < now ? now : day;
    if (windowStart >= dayEnd) continue;

    // 営業時間内で、この日のカレンダー予定と重なる区間をマージして「埋まっている区間」を作る
    const busy = events
      .filter((ev) => ev.getEndTime() > windowStart && ev.getStartTime() < dayEnd)
      .map((ev) => ({
        start: ev.getStartTime() < windowStart ? windowStart : ev.getStartTime(),
        end: ev.getEndTime() > dayEnd ? dayEnd : ev.getEndTime(),
      }))
      .sort((a, b) => a.start - b.start);

    const merged = [];
    busy.forEach((b) => {
      const last = merged[merged.length - 1];
      if (last && b.start <= last.end) {
        if (b.end > last.end) last.end = b.end;
      } else {
        merged.push({ start: b.start, end: b.end });
      }
    });

    // 空き区間（予定と予定の間、または予定がない区間）を算出
    const gaps = [];
    let cursor = windowStart;
    merged.forEach((b) => {
      if (b.start > cursor) gaps.push({ start: cursor, end: b.start });
      if (b.end > cursor) cursor = b.end;
    });
    if (cursor < dayEnd) gaps.push({ start: cursor, end: dayEnd });

    // 各空き区間の開始時刻ちょうどから候補を詰めて生成する（予約直後の端数時間を無駄にしない）。
    // ただし「現在時刻」による打ち切りだけは次の30分区切りに切り上げる（今すぐ予約を避けるため）。
    gaps.forEach((gap) => {
      let slotStart = new Date(gap.start);
      if (gap.start.getTime() === windowStart.getTime() && windowStart.getTime() === now.getTime()) {
        const rounded = Math.ceil(slotStart.getMinutes() / SLOT_INTERVAL_MINUTES) * SLOT_INTERVAL_MINUTES;
        slotStart.setMinutes(rounded, 0, 0);
      }

      while (true) {
        const slotEnd = new Date(slotStart.getTime() + TREATMENT_MINUTES * 60000);
        if (slotEnd > gap.end) break;

        slots.push({
          id: formatSlotId(slotStart),
          date: formatDate(slotStart),
          label: `${formatLabel(formatDate(slotStart))} ${formatTime(slotStart)}`,
          sortKey: slotStart.getTime(),
        });

        slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60000);
      }
    });
  }

  slots.sort((a, b) => a.sortKey - b.sortKey);
  return slots.slice(0, MAX_RETURNED_SLOTS).map(({ id, date, label }) => ({ id, date, label }));
}

function isRangeFree(calendar, start, end) {
  return calendar.getEvents(start, end).length === 0;
}

/* ---- 共通ヘルパー ---- */

function getReservationCalendar() {
  return CalendarApp.getCalendarById(CALENDAR_ID);
}

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function findBookingRow(sheet, token) {
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const tokenCol = header.indexOf("token");
  const dateCol = header.indexOf("date");
  const timeCol = header.indexOf("time");
  const nameCol = header.indexOf("name");
  const phoneCol = header.indexOf("phone");
  const emailCol = header.indexOf("email");
  const statusCol = header.indexOf("status");
  const eventIdCol = header.indexOf("eventId");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][tokenCol]) === token) {
      return {
        row: i + 1,
        date: formatDate(data[i][dateCol]),
        time: formatTimeCell(data[i][timeCol]),
        name: data[i][nameCol],
        phone: data[i][phoneCol],
        email: data[i][emailCol],
        status: data[i][statusCol],
        eventId: String(data[i][eventIdCol] || ""),
        dateCol,
        timeCol,
        statusCol,
        eventIdCol,
      };
    }
  }
  return null;
}

// 変更・キャンセルは「来店前日23:59まで」。来店日当日・過去分は不可。
function isChangeAllowed(dateStr) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  return dateStr > today;
}

// 空き枠の識別子。日時をそのままIDとして使う（例: 2026-09-16T12:30）。
function formatSlotId(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm");
}

function parseSlotId(slotId) {
  const m = slotId.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

function formatTime(value) {
  return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
}

// スプレッドシートのセルに "12:30" と入力すると時刻型として保存され、
// getValues() ではDateオブジェクトとして返ってくるため文字列に整形する。
function formatTimeCell(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }
  return String(value);
}

function formatLabel(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}/${Number(d)}`;
}

function buildManageUrl(token) {
  const LP_BASE_URL = "https://kobaren01-maker.github.io/hadarevo-takadanobaba-lp";
  return `${LP_BASE_URL}/manage.html?t=${token}`;
}

function notifyStaff(booking) {
  const subject = `【LP予約】${booking.type}`;
  const body = [
    `種別: ${booking.type}`,
    `日時: ${booking.slotDate} ${booking.slotTime}`,
    `お名前: ${booking.name}`,
    `電話番号: ${booking.phone}`,
    `メール: ${booking.email || "(未入力)"}`,
    `性別: ${booking.gender || "(未入力)"}`,
    `年齢: ${booking.age || "(未入力)"}`,
    "",
    "Salon Boardへの反映を忘れずに行ってください。",
  ].join("\n");

  MailApp.sendEmail(NOTIFY_EMAIL, subject, body, { name: STORE_DISPLAY_NAME });
}

function notifyCustomer(email, info) {
  const subject = "【肌REVO高田馬場店】ご予約を受け付けました";
  const body = [
    `ご予約日時: ${info.date} ${info.time}`,
    "",
    "■ 店舗情報",
    `住所: ${STORE_ADDRESS}`,
    `地図: ${STORE_MAP_URL}`,
    "",
    "■ 日時変更・キャンセルについて",
    "来店前日まで、下記ページから何度でも日時変更・キャンセルが可能です。",
    info.manageUrl,
    "",
    "■ ご予約にあたっての注意事項",
    "・当日のキャンセルはキャンセル料100%をいただきます。",
    `・遅れる場合は ${STORE_PHONE} までご連絡ください。`,
    "・1か月以内に整形手術を受けた方、または何らかの治療を行っている方は、事前に医師にご確認をお願いいたします。",
    "",
    "当日の変更・キャンセルは店舗まで直接ご連絡ください。",
  ].join("\n");

  MailApp.sendEmail(email, subject, body, { name: STORE_DISPLAY_NAME });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/**
 * Apps Scriptは一定時間アクセスがないと休止し、次のアクセス時（＝お客様が
 * LPやmanage.htmlを開いた瞬間）に起動し直すため数十秒〜数分の遅延が発生する。
 * これを避けるため、時間主導型トリガーで数分おきにこの関数を実行し、
 * スクリプトを起動したままにしておく。
 *
 * 設定方法：Apps Scriptエディタ左メニューの時計アイコン「トリガー」→
 * 「トリガーを追加」→ 実行する関数「keepAlive」→ イベントのソース
 * 「時間主導型」→ 分ベースのタイマー→ 「5分おき」を選んで保存。
 */
function keepAlive() {
  getReservationCalendar();
}
