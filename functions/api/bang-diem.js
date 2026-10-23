// Cloudflare Pages Function: trả top 10 bảng điểm của một loại cờ (?tro_choi=..., thiếu là cờ tướng) và vị trí của người
// đang đăng nhập (nếu có). Chỉ tính người chơi đã đăng nhập Google (dòng có nguoi_choi). Dòng điểm cũ chưa gắn tài khoản
// không lên bảng. Tên trong bảng điểm được che chữ số (tenBangDiem) để không lộ số điện thoại. Không trả tên gốc của người khác.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tenBangDiem } from "../../src/lib/chung/ten.js";
import { locTroChoi } from "../../src/lib/tro-choi.js";
import { tra, xacThuc, headerAdmin, thieuCauHinh, troChoiCua, BANG_DIEM, loc } from "../_lib/pocketbase.js";

export async function onRequestGet({ request, env }) {
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });
  const troChoi = troChoiCua(new URL(request.url).searchParams.get("tro_choi"));
  if (!troChoi) return tra(400, { loi: "tro_choi_khong_hop_le" });

  const pb = env.PB_URL;
  let nguoi;
  let H;
  try {
    // không đăng nhập thì chỉ xem top 10
    [nguoi, H] = await Promise.all([xacThuc(pb, request), headerAdmin(env)]);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const diemUrl = `${pb}/api/collections/${BANG_DIEM}/records`;
  const cuaLoai = locTroChoi(troChoi.ma);

  try {
    const doc = async (q) => {
      const r = await fetch(`${diemUrl}?${q}`, { headers: H });
      if (!r.ok) throw new Error("khong_doc_duoc");
      return r.json();
    };
    const [top, mine] = await Promise.all([
      doc(`perPage=10&sort=-diem,ten&filter=${loc(`nguoi_choi!="" && ${cuaLoai}`)}`),
      nguoi ? doc(`perPage=1&filter=${loc(`nguoi_choi="${nguoi.id}" && ${cuaLoai}`)}`) : null,
    ]);
    let viTri = null;
    const dong = mine?.items?.[0];
    if (dong) {
      const hon = await doc(`perPage=1&fields=id&filter=${loc(`nguoi_choi!="" && ${cuaLoai} && diem>${dong.diem}`)}`);
      viTri = { hang: (hon.totalItems || 0) + 1, diem: dong.diem };
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
