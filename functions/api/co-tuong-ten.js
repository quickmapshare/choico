// Cloudflare Pages Function: đổi tên người chơi cờ tướng, cập nhật tên trong bảng điểm và nhật ký ván.
// Gọi lại sau khi lỗi giữa chừng vẫn an toàn: phần đã đổi thì bỏ qua, phần còn lại được đổi tiếp.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tenHopLe } from "../../src/lib/co-tuong.js";
import { tra, dangNhap } from "../_lib/pocketbase.js";

const NGUON_CHO_PHEP = ["https://choico.pages.dev"];

// Tìm một dòng theo tên trong collection. Trả về null nếu không có.
async function timTheoTen(pb, H, collection, ten) {
  const r = await fetch(`${pb}/api/collections/${collection}/records?perPage=1&filter=${encodeURIComponent(`ten="${ten}"`)}`, { headers: H });
  if (!r.ok) throw new Error("khong_doc_duoc");
  return (await r.json()).items?.[0] ?? null;
}

export async function onRequestPost({ request, env }) {
  const nguon = request.headers.get("origin") || "";
  const choPhep = NGUON_CHO_PHEP.includes(nguon) || nguon.startsWith("http://localhost");
  if (!choPhep) return tra(403, { loi: "nguon_khong_duoc_phep" });
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });

  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const { ten_cu, ten_moi } = body ?? {};
  if (typeof ten_cu !== "string" || !tenHopLe(ten_cu)) return tra(400, { loi: "ten_cu_khong_hop_le" });
  if (typeof ten_moi !== "string" || !tenHopLe(ten_moi)) return tra(400, { loi: "ten_moi_khong_hop_le" });
  if (ten_cu === ten_moi) return tra(200, { ten: ten_moi, so_van_doi_ten: 0 });

  const pb = env.PB_URL;
  let token;
  try {
    token = await dangNhap(pb, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const H = { "content-type": "application/json", authorization: token };

  try {
    const diemCu = await timTheoTen(pb, H, "cho_phien_co_diem", ten_cu);
    const diemMoi = await timTheoTen(pb, H, "cho_phien_co_diem", ten_moi);
    // Tên mới đã có người dùng, và tên cũ cũng còn: không gộp hai người lại
    if (diemCu && diemMoi) return tra(409, { loi: "ten_da_ton_tai" });

    if (diemCu) {
      const r = await fetch(`${pb}/api/collections/cho_phien_co_diem/records/${diemCu.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ ten: ten_moi }),
      });
      if (!r.ok) return tra(502, { loi: "khong_doi_duoc_diem" });
    }

    // Đổi tên trên mọi ván đã tính điểm. Lọc lại từ đầu sau mỗi lần sửa, vì dòng đã sửa không còn khớp tên cũ.
    let soVanDoi = 0;
    for (;;) {
      const r = await fetch(`${pb}/api/collections/cho_phien_co_van/records?perPage=200&filter=${encodeURIComponent(`ten="${ten_cu}"`)}`, { headers: H });
      if (!r.ok) return tra(502, { loi: "khong_doc_duoc_van" });
      const items = (await r.json()).items ?? [];
      if (items.length === 0) break;
      for (const van of items) {
        const sua = await fetch(`${pb}/api/collections/cho_phien_co_van/records/${van.id}`, {
          method: "PATCH",
          headers: H,
          body: JSON.stringify({ ten: ten_moi }),
        });
        if (!sua.ok) return tra(502, { loi: "khong_doi_duoc_van" });
        soVanDoi++;
      }
    }
    return tra(200, { ten: ten_moi, so_van_doi_ten: soVanDoi });
  } catch {
    return tra(502, { loi: "khong_doi_duoc_ten" });
  }
}
