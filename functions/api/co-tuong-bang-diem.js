// Cloudflare Pages Function: trả top 10 bảng điểm cờ tướng và vị trí của người đang đăng nhập (nếu có).
// Chỉ tính người chơi đã đăng nhập Google (dòng có nguoi_choi). Dòng điểm cũ chưa gắn tài khoản không lên bảng.
// Tên trong bảng điểm được che chữ số (tenBangDiem) để không lộ số điện thoại. Không trả tên gốc của người khác.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tenBangDiem } from "../../src/lib/co-tuong.js";
import { tra, dangNhap, xacThuc } from "../_lib/pocketbase.js";

export async function onRequestGet({ request, env }) {
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });

  const pb = env.PB_URL;
  const nguoi = await xacThuc(pb, request); // không đăng nhập thì chỉ xem top 10
  let token;
  try {
    token = await dangNhap(pb, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const H = { authorization: token };
  const diemUrl = `${pb}/api/collections/cho_phien_co_diem/records`;
  const daDangNhap = encodeURIComponent('nguoi_choi!=""');

  try {
    const top = await (await fetch(`${diemUrl}?perPage=10&sort=-diem,ten&filter=${daDangNhap}`, { headers: H })).json();
    let viTri = null;
    if (nguoi) {
      const mine = await (await fetch(`${diemUrl}?perPage=1&filter=${encodeURIComponent(`nguoi_choi="${nguoi.id}"`)}`, { headers: H })).json();
      const dong = mine.items?.[0];
      if (dong) {
        const hon = await (await fetch(`${diemUrl}?perPage=1&filter=${encodeURIComponent(`nguoi_choi!="" && diem>${dong.diem}`)}`, { headers: H })).json();
        viTri = { hang: (hon.totalItems || 0) + 1, diem: dong.diem };
      }
    }
    return tra(200, {
      top: (top.items || []).map((it) => ({
        ten: tenBangDiem(it.ten),
        diem: it.diem,
        minh: !!nguoi && it.nguoi_choi === nguoi.id, // dòng của chính người đang xem
      })),
      vi_tri: viTri,
    });
  } catch {
    return tra(502, { loi: "khong_doc_duoc_bang_diem" });
  }
}
