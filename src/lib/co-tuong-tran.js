// Luật của trận thượng đài và khép kín (hai người thật đấu với nhau). Hàm thuần, dùng chung cho server và test.
// Nước đi lưu dưới dạng ký hiệu (ví dụ "a3a4"), đỏ đi trước. Trạng thái bàn luôn được dựng lại từ danh sách nước.
import { khoiTao, nuocHopLe, apDung, timNuoc, NUOC_TOI_DA } from "./co-tuong.js";

export const GIAY_MOI_NUOC = 60; // mỗi nước có 60 giây, hết giờ thì bên đó thua
export const HAN_KHEP_KIN_GIO = 24; // mã khép kín hết hạn sau 24 giờ nếu chưa có người vào
export const HAN_SANH_PHUT = 30; // người lên đài mà không ai vào thì tự rời đài sau 30 phút

// Bên đến lượt đi tiếp theo số nước đã đi: đỏ đi trước
export const benDenLuot = (soNuoc) => (soNuoc % 2 === 0 ? "r" : "b");

// Dựng lại bàn từ danh sách nước. Trả về { hop_le: false } nếu có nước sai luật.
// Nếu hợp lệ: { hop_le, b, s (bên đến lượt), ket_thuc, ket_qua ("do"|"den"|"hoa"|null), ly_do }
export function duyetNuoc(nuoc) {
  const b = khoiTao();
  let s = "r";
  for (const ky of nuoc) {
    const m = timNuoc(b, s, ky);
    if (!m) return { hop_le: false };
    apDung(b, m);
    s = s === "r" ? "b" : "r";
  }
  if (nuocHopLe(b, s).length === 0) {
    // Bên đến lượt hết nước đi (hết cờ hoặc bị chiếu bí): bên kia thắng
    return { hop_le: true, b, s, ket_thuc: true, ket_qua: s === "b" ? "do" : "den", ly_do: "het_nuoc" };
  }
  if (nuoc.length >= NUOC_TOI_DA) return { hop_le: true, b, s, ket_thuc: true, ket_qua: "hoa", ly_do: "het_nuoc_hoa" };
  return { hop_le: true, b, s, ket_thuc: false, ket_qua: null, ly_do: null };
}

// Hết giờ: bên đến lượt thua. Trả về null nếu chưa hết giờ.
export function kiemHetGio(tran, now = Date.now()) {
  if (tran.trang_thai !== "dang_dau" || !tran.han_nuoc) return null;
  if (now <= Date.parse(tran.han_nuoc)) return null;
  const s = benDenLuot((tran.nuoc || []).length);
  return { ket_qua: s === "r" ? "den" : "do", ly_do: "het_gio" };
}

// Bên (r/b) mà người chơi có id đang cầm, null nếu không phải người trong trận
export function benCuaToi(tran, idNguoi) {
  if (tran.do === idNguoi) return "r";
  if (tran.den === idNguoi) return "b";
  return null;
}

// Kết quả (do/den/hoa) theo bên thắng ("r"/"b"/null cho hòa). Dùng để quy ra điểm cho từng người chơi.
export const benThang = (ketQua) => (ketQua === "do" ? "r" : ketQua === "den" ? "b" : null);

// Điểm theo kết quả cho người chơi bên s: thắng, thua hoặc hòa (dùng với diemCongVan)
export function ketQuaChoBen(ketQua, s) {
  if (ketQua === "hoa") return "hoa";
  return benThang(ketQua) === s ? "thang" : "thua";
}

// Mã khép kín còn dùng được để người khác vào: chưa có người vào, chưa bị người tạo vô hiệu hóa, chưa hết 24 giờ
export function maKhepKinConHieuLuc(tran, now = Date.now()) {
  if (tran.loai !== "khep_kin" || tran.trang_thai !== "cho") return false;
  if (!tran.het_han) return false;
  return now < Date.parse(tran.het_han);
}

// Ký hiệu nước đi hợp lệ về hình thức: cột a–i, hàng 0–9, ví dụ "a3a4"
export const MAU_KY_HOP_LE = /^[a-i][0-9][a-i][0-9]$/;
