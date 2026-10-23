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

// Hết giờ không xử thua ngay: bên đang chờ (không phải bên đến lượt) chọn một trong ba cách.
export const LUA_CHON_HET_GIO = ["them_1_phut", "thoai_mai", "xu_thua"];

// benCua: bên của người chọn. Trả về { loi } hoặc { cap_nhat } (ghi vào trận, trận vẫn tiếp tục)
// hoặc { ket_thuc: { ket_qua, ly_do } } (xử thua). "thoai_mai" đặt han_nuoc rỗng: nước này không giới hạn thời gian.
export function xuLyHetGio(tran, benCua, luaChon, now = Date.now()) {
  if (!LUA_CHON_HET_GIO.includes(luaChon)) return { loi: "lua_chon_khong_hop_le" };
  const het = kiemHetGio(tran, now);
  if (!het) return { loi: "chua_het_gio" };
  if (benCua === benDenLuot((tran.nuoc || []).length)) return { loi: "khong_phai_ben_cho" }; // người chậm không tự quyết
  if (luaChon === "them_1_phut") return { cap_nhat: { han_nuoc: new Date(now + GIAY_MOI_NUOC * 1000).toISOString() } };
  if (luaChon === "thoai_mai") return { cap_nhat: { han_nuoc: "" } };
  return { ket_thuc: { ket_qua: het.ket_qua, ly_do: "het_gio" } };
}

// Trận bị bỏ dở: quá hạn nước đi 5 phút mà không ai quyết định (người chậm bỏ đi, đối thủ cũng không bấm gì) thì đóng trận.
// Nước đã chọn "nghĩ thoải mái" không có hạn, nên tính từ lần cập nhật cuối: sau 60 phút không ai thao tác cũng đóng.
export const BO_DO_PHUT = 5;
export const BO_DO_KHONG_GIOI_HAN_PHUT = 60;

export function kiemBoDo(tran, now = Date.now()) {
  if (tran.trang_thai !== "dang_dau") return false;
  if (tran.han_nuoc) return now > Date.parse(tran.han_nuoc) + BO_DO_PHUT * 60_000;
  const cuoi = Date.parse(String(tran.updated || "").replace(" ", "T")); // PocketBase ghi "2026-10-23 12:00:00.000Z"
  return Number.isFinite(cuoi) && now > cuoi + BO_DO_KHONG_GIOI_HAN_PHUT * 60_000;
}

// Máy trên sảnh thượng đài có tiền tố này trong mã người chơi (xem functions/_lib/may-dai.js). Máy không có tài khoản.
export const TIEN_TO_MAY = "may_";
export const laMay = (id) => typeof id === "string" && id.startsWith(TIEN_TO_MAY);

// Người lên đài còn đứng trên đài: đang chờ đối thủ và chưa quá 30 phút kể từ lúc lên đài. Máy thì luôn đứng sẵn trên đài.
export function soDaiConHieuLuc(tran, now = Date.now()) {
  if (tran.loai !== "dai" || tran.trang_thai !== "cho") return false;
  if (laMay(tran.do)) return true;
  const tao = Date.parse(String(tran.created || "").replace(" ", "T")); // PocketBase ghi "2026-10-23 12:00:00.000Z"
  return Number.isFinite(tao) && now < tao + HAN_SANH_PHUT * 60_000;
}
