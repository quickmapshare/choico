// Đăng tin nhắc rằm (15 âm) và mùng 1 (âm) lên kênh Telegram.
// Chạy mỗi ngày; ngày nào không phải mùng 1 hoặc rằm thì thoát luôn, không đăng.
//
// Dùng:
//   node scripts/nhac-ram-mung1.mjs                 chỉ in nội dung tin của hôm nay (thử)
//   node scripts/nhac-ram-mung1.mjs --ngay=2026-03-03   thử với ngày khác
//   node scripts/nhac-ram-mung1.mjs --send          đăng thật (cần TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID)

import { ngayAm, ngayHienTai, leAmCua, nhanThangAm, tenNamCanChi, tenThangCanChi } from "../src/lib/lich-phien.js";
import { t } from "../src/i18n/strings.js";

const LINK_LICH = "https://chophien.pages.dev/am-lich/";

const thamSo = process.argv.slice(2);
const guiThat = thamSo.includes("--send");
const ngayArg = thamSo.find((a) => a.startsWith("--ngay="))?.slice("--ngay=".length);
// --thu: thêm dòng [Tin thử] để kênh biết đây là tin kiểm tra, không phải tin của ngày hôm nay
const laTinThu = thamSo.includes("--thu");

// Ngày dương cần xét: mặc định là hôm nay theo giờ Việt Nam
function ngayCanXet() {
  if (!ngayArg) return ngayHienTai();
  const [y, m, d] = ngayArg.split("-").map(Number);
  return { y, m, d };
}

// Nội dung tin, hoặc null nếu hôm đó không phải mùng 1 hoặc rằm
export function noiDungTin(ngayDuong) {
  const am = ngayAm(ngayDuong);
  const laRam = am.ngay === 15;
  const laMung1 = am.ngay === 1;
  if (!laRam && !laMung1) return null;

  const tieuDe = laRam ? `🌕 Hôm nay là rằm ${nhanThangAm(am, "vi")}` : `🌑 Hôm nay là mùng 1 ${nhanThangAm(am, "vi")}`;
  const dong = [
    `${tieuDe}.`,
    `Dương lịch: ${String(ngayDuong.d).padStart(2, "0")}/${String(ngayDuong.m).padStart(2, "0")}/${ngayDuong.y}.`,
  ];
  // Can chi tháng chỉ tính cho tháng thường; tháng nhuận dùng chung can chi với tháng trước nên không ghi
  if (!am.nhuan) dong.push(`Năm ${tenNamCanChi(am.nam)}, tháng ${tenThangCanChi(am.nam, am.thang)}.`);

  const lePhatSinh = leAmCua(am).map((khoa) => t("vi", "le")[khoa]);
  if (lePhatSinh.length) dong.push(`Lễ hôm nay: ${lePhatSinh.join(", ")}.`);

  // Trang lịch âm mở đúng tháng dương của ngày này
  dong.push(`Xem lịch âm cả tháng: ${LINK_LICH}#${ngayDuong.y}-${String(ngayDuong.m).padStart(2, "0")}`);
  return dong.join("\n");
}

async function guiTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID.");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.ok) throw new Error(`Telegram lỗi ${res.status}: ${JSON.stringify(data)}`);
}

// Chỉ chạy khi gọi trực tiếp, không chạy khi được import để test
if (process.argv[1]?.endsWith("nhac-ram-mung1.mjs")) {
  const ngay = ngayCanXet();
  const text = noiDungTin(ngay);
  if (!text) {
    console.log(`Hôm nay ${ngay.d}/${ngay.m}/${ngay.y} không phải mùng 1 hoặc rằm, không đăng.`);
    process.exit(0);
  }
  const noiDung = laTinThu ? `[Tin thử] Nội dung dưới đây dùng để kiểm tra bot, không phải tin của hôm nay.\n\n${text}` : text;
  console.log(noiDung);
  if (!guiThat) {
    console.log("\n(Chưa gửi. Thêm --send để đăng.)");
    process.exit(0);
  }
  await guiTelegram(noiDung);
  console.log("\nĐã đăng lên Telegram.");
}
