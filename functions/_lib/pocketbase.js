// Tiện ích dùng chung cho các Pages Function (không phải route, không có onRequest).
import { tenHopLe, lamSachTen, taoTenTam } from "../../src/lib/chung/ten.js";
import { layTroChoi } from "../../src/lib/tro-choi.js";

export const NGUOI_CHOI = "co_tuong_nguoi_choi"; // collection auth, đăng nhập bằng Google (dùng chung cho mọi loại cờ)
export const BANG_DIEM = "cho_phien_co_diem"; // một dòng cho mỗi người chơi và loại cờ
export const BANG_VAN = "cho_phien_co_van"; // nhật ký các ván đấu máy đã tính điểm

export function tra(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const loc = (c) => encodeURIComponent(c);

// Đủ biến môi trường để gọi PocketBase bằng tài khoản admin chưa
export const thieuCauHinh = (env) => !env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD;

// Nguồn được gọi các API ghi (chống trang khác gọi thay người chơi). GET cùng nguồn không gửi origin nên không chặn.
const NGUON_CHO_PHEP = ["https://choico.pages.dev"];
export function nguonLa(request) {
  const nguon = request.headers.get("origin");
  return Boolean(nguon) && !NGUON_CHO_PHEP.includes(nguon) && !nguon.startsWith("http://localhost");
}

// Loại cờ của yêu cầu (tham số tro_choi). Thiếu thì là cờ tướng; mã lạ thì null.
export const troChoiCua = (ma) => (typeof ma === "string" || ma == null ? layTroChoi(ma) : null);

export async function dangNhap(pb, email, password) {
  const r = await fetch(`${pb}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error("dang_nhap_loi");
  return (await r.json()).token;
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

// Đọc danh sách bản ghi; token admin bị từ chối thì quên để lần sau đăng nhập lại. Trả về Response của fetch.
export async function docBang(pb, H, bang, truyVan) {
  const r = await fetch(`${pb}/api/collections/${bang}/records?${truyVan}`, { headers: H });
  if (r.status === 401 || r.status === 403) quenTokenAdmin();
  return r;
}

// Kiểm tra token đăng nhập của người chơi (header Authorization: Bearer <token>). Trả về bản ghi người chơi hoặc null.
export async function xacThuc(pb, request) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  try {
    const r = await fetch(`${pb}/api/collections/${NGUOI_CHOI}/auth-refresh`, { method: "POST", headers: { authorization: token } });
    if (!r.ok) return null;
    return (await r.json()).record ?? null;
  } catch {
    return null;
  }
}

// Tên đã có người khác dùng chưa (trong hồ sơ người chơi hoặc bảng điểm, kể cả dòng điểm cũ chưa gắn tài khoản)
export async function tenDaCoNguoiDung(pb, H, ten, idNguoi) {
  const [a, b] = await Promise.all([
    fetch(`${pb}/api/collections/${NGUOI_CHOI}/records?perPage=1&filter=${loc(`ten="${ten}" && id!="${idNguoi}"`)}`, { headers: H }),
    fetch(`${pb}/api/collections/${BANG_DIEM}/records?perPage=1&filter=${loc(`ten="${ten}" && nguoi_choi!="${idNguoi}"`)}`, { headers: H }),
  ]);
  if (!a.ok || !b.ok) throw new Error("khong_doc_duoc");
  return (await a.json()).totalItems > 0 || (await b.json()).totalItems > 0;
}

// Chọn tên chưa ai dùng, bắt đầu từ tên gốc (tên Google), thêm số nếu trùng. Không có tên gốc hợp lệ thì dùng tên tạm.
export async function chonTenMoi(pb, H, goc, idNguoi) {
  let co = lamSachTen(goc || "");
  if (!tenHopLe(co)) co = taoTenTam();
  for (let i = 0; i < 20; i++) {
    const dauSo = i === 0 ? "" : ` ${i + 1}`;
    const thu = co.slice(0, 50 - dauSo.length) + dauSo;
    if (!(await tenDaCoNguoiDung(pb, H, thu, idNguoi))) return thu;
  }
  return taoTenTam() + " " + Math.floor(Math.random() * 1000);
}
