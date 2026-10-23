// Tiện ích dùng chung cho các Pages Function ghi bảng điểm cờ tướng (không phải route, không có onRequest).
import { tenHopLe, lamSachTen, taoTenTam } from "../../src/lib/co-tuong.js";

export const NGUOI_CHOI = "co_tuong_nguoi_choi"; // collection auth, đăng nhập bằng Google

export function tra(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function dangNhap(pb, email, password) {
  const r = await fetch(`${pb}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error("dang_nhap_loi");
  return (await r.json()).token;
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
  const loc = (c) => encodeURIComponent(c);
  const [a, b] = await Promise.all([
    fetch(`${pb}/api/collections/${NGUOI_CHOI}/records?perPage=1&filter=${loc(`ten="${ten}" && id!="${idNguoi}"`)}`, { headers: H }),
    fetch(`${pb}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${loc(`ten="${ten}" && nguoi_choi!="${idNguoi}"`)}`, { headers: H }),
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
