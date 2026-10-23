// Cloudflare Pages Function: trả nhật ký một ván đấu máy để xem lại qua link (/xem-van/?ma=...), mọi loại cờ.
// Ai có mã ván (mã ngẫu nhiên, khó đoán) đều xem được. Không trả nguoi_choi (id tài khoản), chỉ trả tên hiển thị.
// Collection cho_phien_co_van chỉ admin đọc được, nên Function đọc bằng tài khoản admin.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra, headerAdmin, thieuCauHinh, BANG_VAN, loc } from "../_lib/pocketbase.js";
import { TRO_CHOI_MAC_DINH } from "../../src/lib/tro-choi.js";

const MAU_MA_VAN = /^[A-Za-z0-9-]{16,64}$/;

export async function onRequestGet({ request, env }) {
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });

  const ma = new URL(request.url).searchParams.get("ma_van") || "";
  if (!MAU_MA_VAN.test(ma)) return tra(400, { loi: "ma_van_khong_hop_le" });

  const pb = env.PB_URL;
  let H;
  try {
    H = await headerAdmin(env);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const r = await fetch(`${pb}/api/collections/${BANG_VAN}/records?perPage=1&filter=${loc(`ma_van="${ma}"`)}`, { headers: H });
  if (!r.ok) return tra(502, { loi: "khong_doc_duoc_van" });
  const van = (await r.json()).items?.[0];
  if (!van) return tra(404, { loi: "khong_tim_thay" });

  // Ván cũ (trước khi lưu nước đi) không có nước để xem lại
  const coNuoc = Array.isArray(van.nuoc) && van.nuoc.length > 0;
  return tra(200, {
    tro_choi: van.tro_choi || TRO_CHOI_MAC_DINH,
    ten: van.ten,
    ket_qua: van.ket_qua,
    diem_cong: van.diem_cong,
    so_hoan: van.so_hoan || 0,
    nuoc: coNuoc ? van.nuoc : null,
  });
}
