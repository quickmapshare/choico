// Cloudflare Pages Function: trả top 10 bảng điểm cờ tướng và vị trí của một tên.
// Tên trong bảng điểm được che chữ số (tenBangDiem) để không lộ số điện thoại. Không trả tên gốc của người khác.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tenHopLe, tenBangDiem } from "../../src/lib/co-tuong.js";
import { tra, dangNhap } from "../_lib/pocketbase.js";

export async function onRequestGet({ request, env }) {
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });

  // Tên truyền vào chỉ dùng để tìm vị trí; nếu không hợp lệ thì coi như chưa có tên
  const ten = new URL(request.url).searchParams.get("ten") || "";
  const coTen = tenHopLe(ten);

  const pb = env.PB_URL;
  let token;
  try {
    token = await dangNhap(pb, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const H = { authorization: token };
  const diemUrl = `${pb}/api/collections/cho_phien_co_diem/records`;

  try {
    const top = await (await fetch(`${diemUrl}?perPage=10&sort=-diem,ten`, { headers: H })).json();
    let viTri = null;
    if (coTen) {
      const mine = await (await fetch(`${diemUrl}?perPage=1&filter=${encodeURIComponent(`ten="${ten}"`)}`, { headers: H })).json();
      const dong = mine.items?.[0];
      if (dong) {
        const hon = await (await fetch(`${diemUrl}?perPage=1&filter=${encodeURIComponent(`diem>${dong.diem}`)}`, { headers: H })).json();
        viTri = { hang: (hon.totalItems || 0) + 1, diem: dong.diem };
      }
    }
    return tra(200, {
      top: (top.items || []).map((it) => ({
        ten: tenBangDiem(it.ten),
        diem: it.diem,
        minh: coTen && it.ten === ten, // dòng của chính người đang xem
      })),
      vi_tri: viTri,
    });
  } catch {
    return tra(502, { loi: "khong_doc_duoc_bang_diem" });
  }
}
