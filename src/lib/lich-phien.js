// Engine lịch phiên: tính một ngày dương có phiên hay không theo quy tắc có cấu trúc.
// Quy tắc (mảng trong trường lich_phien của chợ):
//  - { loai: "ngay_am", ngay: [1, 6], thang_nhuan: "bo_qua" | "tinh" }
//      ngay: số ngày âm trong tháng; -1 = ngày cuối tháng âm (29 hoặc 30).
//      thang_nhuan mặc định "bo_qua": tháng nhuận không tính phiên.
//  - { loai: "chu_ky", ngay_goc: "YYYY-MM-DD", chu_ky: N }
//      phiên mỗi N ngày kể từ ngày gốc (không tính ngày trước ngày gốc).
// Múi giờ của phiên là Asia/Ho_Chi_Minh.

import { Solar } from "lunar-javascript";

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
export function ngayAm({ y, m, d }) {
  const lunar = Solar.fromYmd(y, m, d).getLunar();
  const thang = lunar.getMonth();
  return { ngay: lunar.getDay(), thang: Math.abs(thang), nhuan: thang < 0 };
}

// Ngày dương đó có phải ngày cuối của tháng âm không (ngày hôm sau là mùng 1).
function laNgayCuoiThangAm({ y, m, d }) {
  const sang = Solar.fromYmd(y, m, d).next(1);
  return sang.getLunar().getDay() === 1;
}

function khopNgayAm(quy, ngayDuong) {
  const am = ngayAm(ngayDuong);
  if (am.nhuan && (quy.thang_nhuan ?? "bo_qua") === "bo_qua") return false;
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
const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

// Tên năm can chi tiếng Việt, ví dụ 2026 -> "Bính Ngọ".
export function tenNamCanChi(nam) {
  return `${CAN[(((nam - 4) % 10) + 10) % 10]} ${CHI[(((nam - 4) % 12) + 12) % 12]}`;
}

// "Thứ Ba, 20/10/2026"
export function dinhDangDuong({ y, m, d }) {
  const thu = THU[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${thu}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

// "Ngày 11 tháng 9 năm Bính Ngọ" (có thêm "nhuận" nếu là tháng nhuận)
export function dinhDangAm(ngayDuong) {
  const am = ngayAm(ngayDuong);
  const thang = `${am.nhuan ? "nhuận " : ""}${am.thang}`;
  return `Ngày ${am.ngay} tháng ${thang} năm ${tenNamCanChi(Solar.fromYmd(ngayDuong.y, ngayDuong.m, ngayDuong.d).getLunar().getYear())}`;
}
