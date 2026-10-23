// Tiện ích dùng chung cho trận giữa hai người (khép kín và thượng đài). Không phải route.
// Người chơi là tài khoản (header Authorization) hoặc khách (header x-khach-id, khép kín không cần tài khoản).
import { dangNhap, xacThuc } from "./pocketbase.js";
import { capNhatDiem } from "./diem.js";
import { ketQuaChoBen } from "../../src/lib/co-tuong-tran.js";

export const BANG_TRAN = "co_tuong_tran";
export const MAU_MA = /^[a-f0-9]{32}$/; // mã trận sinh bằng crypto.randomUUID() bỏ dấu gạch
const MAU_KHACH = /^[A-Za-z0-9-]{16,64}$/;

// Danh tính người gọi: { id, ten, tai_khoan } hoặc null nếu không có cả tài khoản lẫn mã khách
export async function layNguoi(pb, request) {
  const tk = await xacThuc(pb, request);
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

// Chuông báo (collection co_tuong_tin_hieu): trình duyệt nghe realtime, chuông rung thì mới gọi server lấy trạng thái,
// thay cho việc hỏi liên tục. Chuông chỉ chứa số phiên bản, không chứa dữ liệu trận.
const BANG_TIN_HIEU = "co_tuong_tin_hieu";
export const TIN_HIEU_SANH = "sanhthuongdai01"; // chuông chung của sảnh thượng đài

async function taoTinHieu(pb, H) {
  const r = await fetch(`${pb}/api/collections/${BANG_TIN_HIEU}/records`, { method: "POST", headers: H, body: JSON.stringify({ phien: 0 }) });
  return r.ok ? (await r.json()).id : ""; // không tạo được thì trận vẫn chạy, trình duyệt tự đọc lại định kỳ như trước
}

// Rung chuông: tăng số phiên bản (phép cộng nguyên tử của PocketBase). Lỗi thì bỏ qua, trình duyệt còn lần đọc dự phòng.
export async function baoTinHieu(pb, H, id) {
  if (!id) return;
  try {
    await fetch(`${pb}/api/collections/${BANG_TIN_HIEU}/records/${id}`, { method: "PATCH", headers: H, body: JSON.stringify({ "phien+": 1 }) });
  } catch {
    // bỏ qua
  }
}

// Ghi thay đổi của trận rồi rung chuông của trận đó (sau khi ghi xong, để người nghe đọc được trạng thái mới)
export async function capNhatTran(pb, H, tran, data) {
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records/${tran.id}`, { method: "PATCH", headers: H, body: JSON.stringify(data) });
  if (r.ok) await baoTinHieu(pb, H, tran.tin_hieu);
  return r;
}

// Tạo trận mới kèm chuông riêng của trận
export async function taoTran(pb, H, data) {
  const tinHieu = await taoTinHieu(pb, H);
  return fetch(`${pb}/api/collections/${BANG_TRAN}/records`, { method: "POST", headers: H, body: JSON.stringify({ ...data, tin_hieu: tinHieu }) });
}

export const sauPhut = (giay) => new Date(Date.now() + giay * 1000).toISOString();

// Cộng điểm cho cả hai người của một trận thượng đài đã có kết quả. Điểm tính như đấu máy (xem diem.js), không hoãn nước.
async function tinhDiemTran(pb, H, tran, ketQua) {
  const ben = [["r", tran.do, tran.ten_do], ["b", tran.den, tran.ten_den]];
  for (const [s, id, ten] of ben) {
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
