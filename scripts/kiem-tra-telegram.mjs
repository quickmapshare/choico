// Kiểm tra cấu hình Telegram, chỉ đọc, không đăng gì.
// Dùng (đặt biến môi trường trước khi chạy):
//   node scripts/kiem-tra-telegram.mjs
// Kết quả: tên bot, tên kênh, và bot có quyền đăng tin trong kênh không.

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
if (!token || !chatId) {
  console.error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.");
  process.exit(1);
}

async function goi(ten, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${ten}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(`${ten} lỗi ${res.status}: ${JSON.stringify(data)}`);
  return data.result;
}

const bot = await goi("getMe", {});
console.log(`Bot: @${bot.username}`);

const kenh = await goi("getChat", { chat_id: chatId });
console.log(`Kênh: ${kenh.title ?? "(không có tên)"} · loại: ${kenh.type} · id: ${kenh.id}`);

const thanhVien = await goi("getChatMember", { chat_id: chatId, user_id: bot.id });
const laQuanTri = ["administrator", "creator"].includes(thanhVien.status);
console.log(`Trạng thái của bot trong kênh: ${thanhVien.status}`);
if (!laQuanTri) {
  console.log("Bot chưa là quản trị viên của kênh, cần thêm làm quản trị viên có quyền Đăng tin.");
} else if (thanhVien.can_post_messages === false) {
  console.log("Bot là quản trị viên nhưng chưa có quyền Đăng tin.");
} else {
  console.log("OK: bot có thể đăng tin vào kênh này.");
}
