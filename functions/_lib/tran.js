// Tiện ích dùng chung cho trận giữa hai người (khép kín và thượng đài). Không phải route.
// Người chơi là tài khoản (header Authorization) hoặc khách (header x-khach-id, khép kín không cần tài khoản).
import { dangNhap, xacThuc, tra } from "./pocketbase.js";
import { capNhatDiem } from "./diem.js";
import { ketQuaChoBen, laMay } from "../../src/lib/co-tuong-tran.js";

export const BANG_TRAN = "co_tuong_tran";
export const MAU_MA = /^[a-f0-9]{32}$/; // mã trận sinh bằng crypto.randomUUID() bỏ dấu gạch
const MAU_KHACH = /^[A-Za-z0-9-]{16,64}$/;

// Kết quả kiểm tra token được nhớ ít phút trong bộ nhớ worker, để mỗi nước đi không phải gọi auth-refresh (một lượt về VPS).
// Chỉ dùng cho việc cần mã người chơi (đi nước, đầu hàng...), không dùng khi cần tên mới nhất (tạo trận, lên đài).
const NHO_TAI_KHOAN_MS = 2 * 60 * 1000;
const nhoTaiKhoan = new Map();

async function taiKhoanNho(pb, request) {
  const token = request.headers.get("authorization") || "";
  if (!token) return null;
  const nho = nhoTaiKhoan.get(token);
  if (nho && Date.now() < nho.han) return nho.tk;
  const tk = await xacThuc(pb, request);
  if (tk) {
    if (nhoTaiKhoan.size > 500) nhoTaiKhoan.clear();
    nhoTaiKhoan.set(token, { tk, han: Date.now() + NHO_TAI_KHOAN_MS });
  }
  return tk;
}

// Danh tính người gọi: { id, ten, tai_khoan } hoặc null nếu không có cả tài khoản lẫn mã khách.
// nho: dùng kết quả kiểm tra token đã nhớ (tên có thể cũ vài phút).
export async function layNguoi(pb, request, { nho = false } = {}) {
  const tk = nho ? await taiKhoanNho(pb, request) : await xacThuc(pb, request);
  if (tk) return { id: tk.id, ten: tk.ten || "", tai_khoan: true };
  const khach = request.headers.get("x-khach-id") || "";
  if (MAU_KHACH.test(khach)) return { id: `k_${khach}`, ten: "", tai_khoan: false };
  return null;
}

// Token admin được giữ lại trong bộ nhớ của worker một lúc, để mỗi yêu cầu không phải đăng nhập lại (tiết kiệm một lượt gọi).
let tokenAdmin = null;
let hanTokenAdmin = 0;
const GIU_TOKEN_MS = 10 * 60 * 1000;

// Header cho các lời gọi PocketBase bằng tài khoản admin
export async function headerAdmin(env) {
  if (!tokenAdmin || Date.now() > hanTokenAdmin) {
    tokenAdmin = await dangNhap(env.PB_URL, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
    hanTokenAdmin = Date.now() + GIU_TOKEN_MS;
  }
  return { authorization: tokenAdmin, "content-type": "application/json" };
}

// Bỏ token đã giữ (khi PocketBase từ chối), lần gọi sau sẽ đăng nhập lại
export function quenTokenAdmin() {
  tokenAdmin = null;
}

export async function docTran(pb, H, ma) {
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=1&filter=${encodeURIComponent(`ma="${ma}"`)}`, { headers: H });
  if (r.status === 401 || r.status === 403) quenTokenAdmin(); // token cũ hết hạn: lần sau đăng nhập lại
  if (!r.ok) return { loi: "khong_doc_duoc_tran" };
  return { tran: (await r.json()).items?.[0] ?? null };
}

// Chuông báo (collection co_tuong_tin_hieu): trình duyệt nghe realtime, thay cho việc hỏi liên tục. Chuông của trận mang kèm
// tóm tắt "tom_tat" (số nước, nước cuối, hạn nước, trạng thái): bên kia đi quân ngay khi chuông rung, không phải gọi server đọc
// lại. Nước đi không phải dữ liệu riêng tư, và mã chuông chỉ người trong trận biết.
const BANG_TIN_HIEU = "co_tuong_tin_hieu";
export const TIN_HIEU_SANH = "sanhthuongdai01"; // chuông chung của sảnh thượng đài

async function taoTinHieu(pb, H) {
  const r = await fetch(`${pb}/api/collections/${BANG_TIN_HIEU}/records`, { method: "POST", headers: H, body: JSON.stringify({ phien: 0 }) });
  return r.ok ? (await r.json()).id : ""; // không tạo được thì trận vẫn chạy, trình duyệt tự đọc lại định kỳ như trước
}

// Rung chuông: tăng số phiên bản (phép cộng nguyên tử của PocketBase), kèm tóm tắt nếu có. Lỗi thì bỏ qua, trình duyệt còn
// lần đọc dự phòng.
export async function baoTinHieu(pb, H, id, tomTat = null) {
  if (!id) return;
  const data = tomTat ? { "phien+": 1, tom_tat: tomTat } : { "phien+": 1 };
  try {
    await fetch(`${pb}/api/collections/${BANG_TIN_HIEU}/records/${id}`, { method: "PATCH", headers: H, body: JSON.stringify(data) });
  } catch {
    // bỏ qua
  }
}

// Tóm tắt trận gửi kèm chuông. gui: giờ (theo server) bên đi bấm nước, để bên kia đo được nước đi tới chậm bao lâu.
export function tomTatTran(tran, gui = 0) {
  const nuoc = tran.nuoc || [];
  const tt = { n: nuoc.length, ky: nuoc[nuoc.length - 1] || "", han: tran.han_nuoc || "", trang_thai: tran.trang_thai };
  if (gui) tt.gui = gui;
  return tt;
}

// Ghi thay đổi của trận rồi rung chuông của trận đó. Rung sau khi ghi xong: người nghe đi nước tiếp ngay thì server đã có
// trạng thái mới.
export async function capNhatTran(pb, H, tran, data, { gui = 0 } = {}) {
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records/${tran.id}`, { method: "PATCH", headers: H, body: JSON.stringify(data) });
  if (r.ok) await baoTinHieu(pb, H, tran.tin_hieu, tomTatTran({ ...tran, ...data }, gui));
  return r;
}

// Đọc người gọi và trận cùng lúc (hai việc không phụ thuộc nhau), bớt một lượt chờ PocketBase.
// Trả về { nguoi, H, tran } hoặc { loiTra } (Response lỗi dựng sẵn).
export async function docNguoiVaTran(env, request, ma) {
  const pb = env.PB_URL;
  try {
    const [nguoi, [H, doc]] = await Promise.all([
      layNguoi(pb, request, { nho: true }),
      headerAdmin(env).then(async (H) => [H, await docTran(pb, H, ma)]),
    ]);
    if (doc.loi) return { loiTra: tra(502, { loi: doc.loi }) };
    if (!doc.tran) return { loiTra: tra(404, { loi: "khong_tim_thay" }) };
    return { nguoi, H, tran: doc.tran };
  } catch {
    return { loiTra: tra(502, { loi: "khong_ket_noi_pocketbase" }) };
  }
}

// Tạo trận mới kèm chuông riêng của trận
export async function taoTran(pb, H, data) {
  const tinHieu = await taoTinHieu(pb, H);
  return fetch(`${pb}/api/collections/${BANG_TRAN}/records`, { method: "POST", headers: H, body: JSON.stringify({ ...data, tin_hieu: tinHieu }) });
}

export const sauPhut = (giay) => new Date(Date.now() + giay * 1000).toISOString();

// Dọn bản ghi trận cũ (kèm chuông của trận). Chỉ dọn hai loại, trận thượng đài có người chơi được giữ lại:
//  - link không ai vào: đã đóng hơn 1 ngày, hoặc còn "cho" sau 2 ngày (link khép kín hết hạn 24 giờ, đài tự rời sau 30 phút)
//  - trận do khách tạo (mã "k_..."): không thao tác gì hơn 7 ngày
// Không có lịch chạy định kỳ nên gọi kèm lúc tạo link / lên đài (sau khi đã trả lời), mỗi worker tối đa một lần mỗi 5 phút,
// mỗi lần tối đa 20 trận mỗi loại.
const DON_CACH_MS = 5 * 60 * 1000;
let donLanCuoi = 0;
const ngayTruoc = (n) => new Date(Date.now() - n * 86400000).toISOString().replace("T", " ");

export async function donTranCu(pb, H) {
  if (Date.now() - donLanCuoi < DON_CACH_MS) return 0;
  donLanCuoi = Date.now();
  const tim = async (loc) => {
    const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=20&fields=id,do,tin_hieu&filter=${encodeURIComponent(loc)}`, { headers: H });
    return r.ok ? (await r.json()).items || [] : [];
  };
  const [khongAiVao, cuaKhach] = await Promise.all([
    tim(`den="" && ((trang_thai="huy" && updated<"${ngayTruoc(1)}") || (trang_thai="cho" && created<"${ngayTruoc(2)}"))`),
    tim(`do~"k_%" && updated<"${ngayTruoc(7)}"`),
  ]);
  // "k_%" trong LIKE còn khớp mã tài khoản bắt đầu bằng "k" ("_" là ký tự đại diện), nên lọc lại cho đúng mã khách
  // Máy trên sảnh thượng đài luôn đứng sẵn, không dọn
  const canDon = new Map([...khongAiVao.filter((t) => !laMay(t.do)), ...cuaKhach.filter((t) => t.do.startsWith("k_"))].map((t) => [t.id, t]));
  await Promise.all([...canDon.values()].map(async (t) => {
    const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records/${t.id}`, { method: "DELETE", headers: H });
    if (r.ok && t.tin_hieu && t.tin_hieu !== TIN_HIEU_SANH) {
      await fetch(`${pb}/api/collections/${BANG_TIN_HIEU}/records/${t.tin_hieu}`, { method: "DELETE", headers: H });
    }
  }));
  return canDon.size;
}

// Cộng điểm cho cả hai người của một trận thượng đài đã có kết quả. Điểm tính như đấu máy (xem diem.js), không hoãn nước.
async function tinhDiemTran(pb, H, tran, ketQua) {
  const ben = [["r", tran.do, tran.ten_do], ["b", tran.den, tran.ten_den]];
  for (const [s, id, ten] of ben) {
    if (laMay(id)) continue; // máy không có tài khoản, không cộng điểm
    await capNhatDiem(pb, H, { id }, ten, ketQuaChoBen(ketQua, s), 0);
  }
}

// Kết thúc trận (hết nước, đầu hàng, hết giờ bị xử thua, bỏ dở). Chỉ trận thượng đài ("dai") mới tính điểm.
// Cờ da_tinh_diem được ghi cùng lúc với kết quả để giữ chỗ trước, tránh cộng điểm hai lần nếu hai yêu cầu kết thúc trận cùng lúc.
export async function ketThucTran(pb, H, tran, { ket_qua, ly_do, nuoc }) {
  const data = { trang_thai: "ket_thuc", ket_qua, ly_do, han_nuoc: "" };
  if (nuoc) data.nuoc = nuoc;
  const tinhDiem = tran.loai === "dai" && !tran.da_tinh_diem;
  if (tinhDiem) data.da_tinh_diem = true;
  const r = await capNhatTran(pb, H, tran, data);
  if (r.ok && tinhDiem) await tinhDiemTran(pb, H, tran, ket_qua);
  return r;
}
