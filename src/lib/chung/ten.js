// Tên người chơi, dùng chung cho mọi loại cờ (trình duyệt và Pages Function).
// Tên: tối đa 50 ký tự, gồm chữ cái (kể cả tiếng Việt có dấu), chữ số và khoảng trắng giữa các từ.
export const TEN_TOI_DA = 50;
const MAU_TEN = /^[\p{L}\d]+( [\p{L}\d]+)*$/u;

// Làm sạch khi gõ: bỏ mọi ký tự không phải chữ cái, chữ số hoặc khoảng trắng, gộp khoảng trắng, cắt độ dài.
export function lamSachTen(s) {
  return String(s)
    .replace(/[^\p{L}\d ]/gu, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ +/, "")
    .slice(0, TEN_TOI_DA);
}

export function tenHopLe(s) {
  return s.length > 0 && s.length <= TEN_TOI_DA && MAU_TEN.test(s);
}

// Tên hiện trên bảng xếp hạng: mỗi chữ số thành dấu *, để không lộ số điện thoại hay thông tin khác.
export function tenBangDiem(s) {
  return s.replace(/\d/g, "*");
}

// Tên tạm cho người chơi chưa đặt tên, ghép thêm ngày chơi lần đầu theo giờ Việt Nam (UTC+7).
export function taoTenTam(ngauNhien = Math.random, luc = new Date()) {
  const chu = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ma = "";
  for (let i = 0; i < 4; i++) ma += chu[Math.floor(ngauNhien() * chu.length)];
  const vn = new Date(luc.getTime() + 7 * 3600 * 1000);
  const so = (n) => String(n).padStart(2, "0");
  const ngay = so(vn.getUTCDate()) + so(vn.getUTCMonth() + 1) + vn.getUTCFullYear();
  return `Kỳ thủ ${ma} ${ngay}`;
}
