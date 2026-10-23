// Tiện ích dùng chung cho trận giữa hai người (khép kín và thượng đài). Không phải route.
// Người chơi là tài khoản (header Authorization) hoặc khách (header x-khach-id, khép kín không cần tài khoản).
import { dangNhap, xacThuc } from "./pocketbase.js";

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

// Header cho các lời gọi PocketBase bằng tài khoản admin
export async function headerAdmin(env) {
  const token = await dangNhap(env.PB_URL, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  return { authorization: token, "content-type": "application/json" };
}

export async function docTran(pb, H, ma) {
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=1&filter=${encodeURIComponent(`ma="${ma}"`)}`, { headers: H });
  if (!r.ok) return { loi: "khong_doc_duoc_tran" };
  return { tran: (await r.json()).items?.[0] ?? null };
}

export function capNhatTran(pb, H, id, data) {
  return fetch(`${pb}/api/collections/${BANG_TRAN}/records/${id}`, { method: "PATCH", headers: H, body: JSON.stringify(data) });
}

export function taoTran(pb, H, data) {
  return fetch(`${pb}/api/collections/${BANG_TRAN}/records`, { method: "POST", headers: H, body: JSON.stringify(data) });
}

export const sauPhut = (giay) => new Date(Date.now() + giay * 1000).toISOString();
