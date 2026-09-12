/**
 * 肌REVO 高田馬場店 LP 予約バックエンド（Google Apps Script）
 *
 * 使い方:
 * 1. Googleスプレッドシートを新規作成し、以下2つのシートを用意する。
 *
 *    シート「Slots」（ヘッダー行必須）
 *      id | date       | time  | status
 *      1  | 2026-09-07 | 12:30 | available
 *      2  | 2026-09-07 | 16:30 | available
 *      ...
 *      - status は "available" または "booked"。
 *      - スタッフはこのシートを直接編集して枠を追加する。
 *      - Hot Pepper Beauty経由で予約が入った場合は、該当行のstatusを
 *        手動で "booked" に変更する（LP側との二重予約を防ぐための運用）。
 *
 *    シート「Bookings」（ヘッダー行必須）
 *      token | timestamp | slotId | date | time | name | phone | email | status
 *      - LPからの予約はこのシートに自動追記される。
 *      - status は "confirmed" または "cancelled"。
 *      - token は予約者本人がLPの予約管理ページ（src/manage.html）から
 *        日時変更・キャンセルを行うための一意なキー。
 *
 * 2. 拡張機能 > Apps Script を開き、このファイルの内容を貼り付ける。
 * 3. NOTIFY_EMAIL を実際の通知先メールアドレスに書き換える。
 * 4. 「デプロイ」>「新しいデプロイ」>種類「ウェブアプリ」で公開する。
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 5. 発行されたWeb App URLを src/script.js の RESERVE_CONFIG.webAppUrl に設定する。
 *
 * 注意:
 * - このスクリプトはHot Pepper Beautyの空き状況を自動取得するものではない。
 *   空き枠はあくまで「Slots」シートに手入力されたデータのみを参照する。
 * - Salon Boardへの予約登録は行わない。スタッフが手動で登録すること。
 * - 日時変更・キャンセルは「来店前日23:59まで」本人が自分でLPから行える。
 *   来店当日分の変更・キャンセルはこのシステムでは受け付けない
 *   （電話等、店舗側の別対応に誘導する）。
 */

const SHEET_SLOTS = "Slots";
const SHEET_BOOKINGS = "Bookings";
// 複数人に通知したい場合はカンマ区切りで追加できる（例: "a@example.com,b@example.com"）
const NOTIFY_EMAIL = "revi.kds@gmail.com";
const MAX_RETURNED_SLOTS = 30;

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

  if (!slotId || !name || !phone) {
    return jsonResponse({ ok: false, message: "必須項目が不足しています。" });
  }

  const slotsSheet = getSheet(SHEET_SLOTS);
  const slot = findSlotRow(slotsSheet, slotId);

  if (!slot) {
    return jsonResponse({ ok: false, message: "指定された日時が見つかりませんでした。" });
  }
  if (slot.status !== "available") {
    return jsonResponse({
      ok: false,
      message: "この日時は直前に予約が埋まった可能性があります。他の日時をお選びください。",
    });
  }

  slotsSheet.getRange(slot.row, slot.statusCol + 1).setValue("booked");

  const token = Utilities.getUuid();
  const bookings = getSheet(SHEET_BOOKINGS);
  bookings.appendRow([
    token,
    new Date(),
    slotId,
    slot.date,
    slot.time,
    name,
    phone,
    email,
    "confirmed",
  ]);

  const manageUrl = buildManageUrl(token);
  notifyStaff({ slotDate: slot.date, slotTime: slot.time, name, phone, email, type: "新規予約" });
  if (email) notifyCustomer(email, { date: slot.date, time: slot.time, manageUrl });

  return jsonResponse({ ok: true, token, manageUrl, date: slot.date, time: slot.time });
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

  const slotsSheet = getSheet(SHEET_SLOTS);
  const newSlot = findSlotRow(slotsSheet, newSlotId);
  if (!newSlot || newSlot.status !== "available") {
    return jsonResponse({ ok: false, message: "その日時はすでに埋まっています。他の日時をお選びください。" });
  }

  // 旧枠を空け、新枠を確保
  const oldSlot = findSlotRow(slotsSheet, booking.slotId);
  if (oldSlot) {
    slotsSheet.getRange(oldSlot.row, oldSlot.statusCol + 1).setValue("available");
  }
  slotsSheet.getRange(newSlot.row, newSlot.statusCol + 1).setValue("booked");

  bookingsSheet.getRange(booking.row, booking.slotIdCol + 1).setValue(newSlotId);
  bookingsSheet.getRange(booking.row, booking.dateCol + 1).setValue(newSlot.date);
  bookingsSheet.getRange(booking.row, booking.timeCol + 1).setValue(newSlot.time);

  notifyStaff({
    slotDate: newSlot.date,
    slotTime: newSlot.time,
    name: booking.name,
    phone: booking.phone,
    email: booking.email,
    type: `日時変更（変更前: ${booking.date} ${booking.time}）`,
  });

  return jsonResponse({ ok: true, date: newSlot.date, time: newSlot.time });
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

  const slotsSheet = getSheet(SHEET_SLOTS);
  const slot = findSlotRow(slotsSheet, booking.slotId);
  if (slot) {
    slotsSheet.getRange(slot.row, slot.statusCol + 1).setValue("available");
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

/* ---- 共通ヘルパー ---- */

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function findSlotRow(sheet, slotId) {
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const idCol = header.indexOf("id");
  const dateCol = header.indexOf("date");
  const timeCol = header.indexOf("time");
  const statusCol = header.indexOf("status");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === slotId) {
      return {
        row: i + 1,
        date: formatDate(data[i][dateCol]),
        time: formatTime(data[i][timeCol]),
        status: data[i][statusCol],
        statusCol,
      };
    }
  }
  return null;
}

function findBookingRow(sheet, token) {
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const tokenCol = header.indexOf("token");
  const slotIdCol = header.indexOf("slotId");
  const dateCol = header.indexOf("date");
  const timeCol = header.indexOf("time");
  const nameCol = header.indexOf("name");
  const phoneCol = header.indexOf("phone");
  const emailCol = header.indexOf("email");
  const statusCol = header.indexOf("status");

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][tokenCol]) === token) {
      return {
        row: i + 1,
        slotId: String(data[i][slotIdCol]),
        date: formatDate(data[i][dateCol]),
        time: formatTime(data[i][timeCol]),
        name: data[i][nameCol],
        phone: data[i][phoneCol],
        email: data[i][emailCol],
        status: data[i][statusCol],
        slotIdCol,
        dateCol,
        timeCol,
        statusCol,
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

function formatDate(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(value);
}

// スプレッドシートのセルに "12:30" と入力すると時刻型として保存され、
// getValues() ではDateオブジェクトとして返ってくるため文字列に整形する。
function formatTime(value) {
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
  // ScriptApp.getService().getUrl() はWeb Appとしてデプロイ後のURLを返す。
  // フロント側の manage.html にトークンを引き渡す形にするため、
  // LP_BASE_URL を実際に公開するLPのドメインに書き換えて使う。
  const LP_BASE_URL = "https://kobaren01-maker.github.io/hadarevo-takadanobaba-lp";
  return `${LP_BASE_URL}/manage.html?t=${token}`;
}

function getAvailableSlots() {
  const sheet = getSheet(SHEET_SLOTS);
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const idCol = header.indexOf("id");
  const dateCol = header.indexOf("date");
  const timeCol = header.indexOf("time");
  const statusCol = header.indexOf("status");

  const now = new Date();
  const slots = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[statusCol] !== "available") continue;

    const dateStr = formatDate(row[dateCol]);
    const timeStr = formatTime(row[timeCol]);
    const dateTime = new Date(`${dateStr}T${timeStr}:00`);
    if (dateTime < now) continue;

    slots.push({
      id: String(row[idCol]),
      date: dateStr,
      label: `${formatLabel(dateStr)} ${timeStr}`,
      sortKey: dateTime.getTime(),
    });
  }

  slots.sort((a, b) => a.sortKey - b.sortKey);
  return slots.slice(0, MAX_RETURNED_SLOTS).map(({ id, date, label }) => ({ id, date, label }));
}

function notifyStaff(booking) {
  const subject = `【LP予約】${booking.type}`;
  const body = [
    `種別: ${booking.type}`,
    `日時: ${booking.slotDate} ${booking.slotTime}`,
    `お名前: ${booking.name}`,
    `電話番号: ${booking.phone}`,
    `メール: ${booking.email || "(未入力)"}`,
    "",
    "Salon Boardへの反映を忘れずに行ってください。",
  ].join("\n");

  MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
}

function notifyCustomer(email, info) {
  const subject = "【肌REVO高田馬場店】ご予約を受け付けました";
  const body = [
    `ご予約日時: ${info.date} ${info.time}`,
    "",
    "日時の変更・キャンセルは、来店前日まで下記ページから行えます。",
    info.manageUrl,
    "",
    "当日の変更・キャンセルは店舗まで直接ご連絡ください。",
  ].join("\n");

  MailApp.sendEmail(email, subject, body);
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
