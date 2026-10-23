// Cloudflare Pages Function: hồ sơ người chơi cờ tướng đã đăng nhập Google.
//  - GET: trả tên hiển thị. Lần đầu chưa có tên thì tạo từ tên Google (thêm số nếu trùng).
//  - POST { ten_moi }: đổi tên, cập nhật luôn bảng điểm và các ván đã tính điểm của người này.
// Header Authorization: Bearer <token PocketBase của người chơi>.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tenHopLe } from "../../src/lib/co-tuong.js";
import { tra, dangNhap, xacThuc, chonTenMoi, tenDaCoNguoiDung, NGUOI_CHOI } from "../_lib/pocketbase.js";

const NGUON_CHO_PHEP = ["https://choico.pages.dev"];

async function vaoAdmin(env) {
  const token = await dangNhap(env.PB_URL, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  return { "content-type": "application/json", authorization: token };
}

function kiemTraChung(request, env) {
  const nguon = request.headers.get("origin");
  // GET từ cùng nguồn không gửi header origin; chỉ chặn khi có origin lạ
  if (nguon && !NGUON_CHO_PHEP.includes(nguon) && !nguon.startsWith("http://localhost")) return tra(403, { loi: "nguon_khong_duoc_phep" });
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });
  return null;
}

export async function onRequestGet({ request, env }) {
  const loi = kiemTraChung(request, env);
  if (loi) return loi;
  const nguoi = await xacThuc(env.PB_URL, request);
  if (!nguoi) return tra(401, { loi: "chua_dang_nhap" });

  try {
    const H = await vaoAdmin(env);
    // Mức chơi hiện tại của tài khoản (chưa chơi ván nào thì là mức 1)
    const r0 = await fetch(`${env.PB_URL}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${encodeURIComponent(`nguoi_choi="${nguoi.id}"`)}`, { headers: H });
    const muc = r0.ok ? (await r0.json()).items?.[0]?.muc || 1 : 1;
    if (nguoi.ten) return tra(200, { ten: nguoi.ten, muc });

    const ten = await chonTenMoi(env.PB_URL, H, nguoi.name, nguoi.id);
    const r = await fetch(`${env.PB_URL}/api/collections/${NGUOI_CHOI}/records/${nguoi.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({ ten }),
    });
    if (!r.ok) return tra(502, { loi: "khong_luu_duoc_ten" });
    return tra(200, { ten, muc });
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
}

export async function onRequestPost({ request, env }) {
  const loi = kiemTraChung(request, env);
  if (loi) return loi;
  const nguoi = await xacThuc(env.PB_URL, request);
  if (!nguoi) return tra(401, { loi: "chua_dang_nhap" });

  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const tenMoi = body?.ten_moi;
  if (typeof tenMoi !== "string" || !tenHopLe(tenMoi)) return tra(400, { loi: "ten_moi_khong_hop_le" });
  if (tenMoi === nguoi.ten) return tra(200, { ten: tenMoi });

  const pb = env.PB_URL;
  try {
    const H = await vaoAdmin(env);
    if (await tenDaCoNguoiDung(pb, H, tenMoi, nguoi.id)) return tra(409, { loi: "ten_da_ton_tai" });

    const sua = (duong, du_lieu) => fetch(`${pb}/api/collections/${duong}`, { method: "PATCH", headers: H, body: JSON.stringify(du_lieu) });
    const loc = (c) => encodeURIComponent(c);

    // Đổi dòng điểm trước (có chỉ mục duy nhất theo tên), rồi hồ sơ, rồi các ván. Gọi lại sau khi lỗi giữa chừng vẫn an toàn.
    const diem = await fetch(`${pb}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${loc(`nguoi_choi="${nguoi.id}"`)}`, { headers: H });
    if (!diem.ok) return tra(502, { loi: "khong_doc_duoc_diem" });
    const dong = (await diem.json()).items?.[0];
    if (dong && !(await sua(`cho_phien_co_diem/records/${dong.id}`, { ten: tenMoi })).ok) return tra(502, { loi: "khong_doi_duoc_diem" });

    if (!(await sua(`${NGUOI_CHOI}/records/${nguoi.id}`, { ten: tenMoi })).ok) return tra(502, { loi: "khong_doi_duoc_ten" });

    // Đổi tên trên mọi ván đã tính điểm. Lọc lại từ đầu sau mỗi lần sửa, vì dòng đã sửa không còn khớp.
    let soVanDoi = 0;
    for (;;) {
      const r = await fetch(`${pb}/api/collections/cho_phien_co_van/records?perPage=200&filter=${loc(`nguoi_choi="${nguoi.id}" && ten!="${tenMoi}"`)}`, { headers: H });
      if (!r.ok) return tra(502, { loi: "khong_doc_duoc_van" });
      const items = (await r.json()).items ?? [];
      if (items.length === 0) break;
      for (const van of items) {
        if (!(await sua(`cho_phien_co_van/records/${van.id}`, { ten: tenMoi })).ok) return tra(502, { loi: "khong_doi_duoc_van" });
        soVanDoi++;
      }
    }
    return tra(200, { ten: tenMoi, so_van_doi_ten: soVanDoi });
  } catch {
    return tra(502, { loi: "khong_doi_duoc_ten" });
  }
}
