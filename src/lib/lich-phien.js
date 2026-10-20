// Engine lịch phiên: tính một ngày dương có phiên hay không theo quy tắc có cấu trúc.
// Quy tắc (mảng trong trường lich_phien của chợ):
//  - { loai: "ngay_am", ngay: [1, 6], thang_nhuan: "bo_qua" | "tinh" }
//      ngay: số ngày âm trong tháng; -1 = ngày cuối tháng âm (29 hoặc 30).
//      thang_nhuan mặc định "bo_qua": tháng nhuận không tính phiên.
//  - { loai: "chu_ky", ngay_goc: "YYYY-MM-DD", chu_ky: N }
//      phiên mỗi N ngày kể từ ngày gốc (không tính ngày trước ngày gốc).
// Múi giờ của phiên là Asia/Ho_Chi_Minh.

import { ngayAmVN } from "./am-lich-vn.js";
import { t } from "../i18n/strings.js";

export const MUI_GIO = "Asia/Ho_Chi_Minh";

// Ngày dương hiện tại theo múi giờ Việt Nam, dạng { y, m, d }.
export function ngayHienTai(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MUI_GIO, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const lay = (type) => Number(parts.find((p) => p.type === type).value);
  return { y: lay("year"), m: lay("month"), d: lay("day") };
}

function ngayThanhSo({ y, m, d }) {
  return Date.UTC(y, m - 1, d) / 86400000;
}

function chuoiThanhNgay(chuoi) {
  const [y, m, d] = chuoi.split("-").map(Number);
  return { y, m, d };
}

// Ngày âm của một ngày dương: { ngay, thang, nhuan }.
export function ngayAm(ngayDuong) {
  const { ngay, thang, nhuan } = ngayAmVN(ngayDuong);
  return { ngay, thang, nhuan };
}

// Ngày dương đó có phải ngày cuối của tháng âm không (ngày hôm sau là mùng 1).
function laNgayCuoiThangAm(ngayDuong) {
  return ngayAm(congNgay(ngayDuong, 1)).ngay === 1;
}

function khopNgayAm(quy, ngayDuong) {
  const am = ngayAm(ngayDuong);
  if (am.nhuan && (quy.thang_nhuan ?? "bo_qua") === "bo_qua") return false;
  // thang (tùy chọn): chỉ tính phiên trong các tháng âm này, ví dụ [1] = tháng Giêng
  if (quy.thang && !quy.thang.includes(am.thang)) return false;
  return quy.ngay.some((so) => {
    if (so === -1) return laNgayCuoiThangAm(ngayDuong);
    return so === am.ngay;
  });
}

function khopChuKy(quy, ngayDuong) {
  const goc = ngayThanhSo(chuoiThanhNgay(quy.ngay_goc));
  const diff = ngayThanhSo(ngayDuong) - goc;
  return diff >= 0 && diff % quy.chu_ky === 0;
}

// Một quy tắc có phiên vào ngày dương này không.
export function coPhienTheoQuy(quy, ngayDuong) {
  if (quy.loai === "ngay_am") return khopNgayAm(quy, ngayDuong);
  if (quy.loai === "chu_ky") return khopChuKy(quy, ngayDuong);
  throw new Error(`Loại quy tắc không hỗ trợ: ${quy.loai}`);
}

// Chợ có phiên vào ngày này không. Trả về null nếu chợ chưa xác minh (không suy đoán).
export function coPhienHomNay(cho, ngayDuong = ngayHienTai()) {
  if (cho.trang_thai_xac_minh !== "da_xac_minh") return null;
  return (cho.lich_phien ?? []).some((quy) => coPhienTheoQuy(quy, ngayDuong));
}

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CON_GIAP = ["Rat", "Ox", "Tiger", "Cat", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"];

// Tên năm can chi tiếng Việt, ví dụ 2026 -> "Bính Ngọ".
export function tenNamCanChi(nam) {
  return `${CAN[(((nam - 4) % 10) + 10) % 10]} ${CHI[(((nam - 4) % 12) + 12) % 12]}`;
}

// "Thứ Ba, 20/10/2026" hoặc "Tuesday, 20/10/2026"
export function dinhDangDuong({ y, m, d }, lang = "vi") {
  const thu = t(lang, "thu")[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${thu}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

// "Ngày 11 tháng 9 năm Bính Ngọ" hoặc "Lunar day 11, month 9, year Bính Ngọ"
export function dinhDangAm(ngayDuong, lang = "vi") {
  const am = ngayAm(ngayDuong);
  const namCanChi = tenNamCanChi(ngayAmVN(ngayDuong).nam);
  const namLoi = lang === "en"
    ? `${namCanChi} (${CON_GIAP[(((ngayAmVN(ngayDuong).nam - 4) % 12) + 12) % 12]})`
    : namCanChi;
  return t(lang, "ngayAm", am.ngay, am.thang, am.nhuan, namLoi);
}

// "tháng 9" hoặc "tháng nhuận 6" (en: "month 9", "leap month 6").
export function nhanThangAm({ thang, nhuan }, lang = "vi") {
  return t(lang, "thangAmNhan", thang, nhuan);
}

// Lưới một tháng dương: mỗi ô là { duong, am }. thuDau là thứ của ngày 1 (0 = Chủ nhật).
export function luoiThang(nam, thang) {
  const soNgay = new Date(Date.UTC(nam, thang, 0)).getUTCDate();
  const thuDau = new Date(Date.UTC(nam, thang - 1, 1)).getUTCDay();
  const ngay = [];
  for (let d = 1; d <= soNgay; d++) {
    const duong = { y: nam, m: thang, d };
    ngay.push({ duong, am: ngayAm(duong) });
  }
  return { soNgay, thuDau, ngay };
}

// Mô tả quy tắc để hiện trên trang chợ, ví dụ "ngày 5, ngày 10 âm lịch hằng tháng".
export function moTaQuy(quy, lang = "vi") {
  if (quy.loai === "ngay_am") {
    const cacNgay = quy.ngay
      .map((so) => (so === -1 ? t(lang, "quyNgayCuoi") : t(lang, "quyNgay", so)))
      .join(", ");
    if (quy.thang) {
      return t(lang, "quyNgayThang", cacNgay, quy.thang.join(", "));
    }
    return t(lang, "quyNgayAm", cacNgay, (quy.thang_nhuan ?? "bo_qua") === "bo_qua");
  }
  if (quy.loai === "chu_ky") {
    const { y, m, d } = chuoiThanhNgay(quy.ngay_goc);
    const ngayGoc = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
    if (quy.chu_ky === 1) return t(lang, "quyHangNgay");
    if (quy.chu_ky === 7) {
      const thu = t(lang, "thu")[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      return t(lang, "quyHangTuan", thu);
    }
    return t(lang, "quyChuKy", quy.chu_ky, ngayGoc);
  }
  return "";
}

// Cộng n ngày dương lịch.
export function congNgay(ngay, n) {
  const t = new Date(Date.UTC(ngay.y, ngay.m - 1, ngay.d) + n * 86400000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// Các ngày có phiên sau tuNgay (không gồm tuNgay), tối đa soLuong ngày, tìm trong tối đa gioiHanNgay ngày.
export function cacPhienTiepTheo(lich, tuNgay = ngayHienTai(), soLuong = 3, gioiHanNgay = 400) {
  const ketQua = [];
  for (let i = 1; i <= gioiHanNgay && ketQua.length < soLuong; i++) {
    const ngay = congNgay(tuNgay, i);
    if (lich.some((quy) => coPhienTheoQuy(quy, ngay))) ketQua.push(ngay);
  }
  return ketQua;
}
