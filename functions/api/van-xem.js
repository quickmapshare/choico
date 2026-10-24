// Cloudflare Pages Function: trả nhật ký một ván để xem lại qua link, mọi loại cờ.
//  - ?ma_van=...: ván đấu máy đã tính điểm (cho_phien_co_van), link /xem-van/?ma=...
//  - ?tran=...: trận giữa hai người (co_tuong_tran: khép kín hoặc thượng đài), đã xong hoặc đang đấu (xem trực tiếp),
//    link /xem-van/?tran=...
// Ai có mã (mã ngẫu nhiên, khó đoán) đều xem được. Không trả id tài khoản, chỉ trả tên hiển thị (che chữ số như bảng điểm).
// Quyền xem lại đi qua duocDung("xem_lai") (src/lib/chung/tinh-nang.js), để sau này giới hạn được (ví dụ tính năng trả phí).
// Collection chỉ admin đọc được, nên Function đọc bằng tài khoản admin.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra, headerAdmin, thieuCauHinh, xacThuc, BANG_VAN, loc } from "../_lib/pocketbase.js";
import { docTran, troChoiTran, MAU_MA } from "../_lib/tran.js";
import { TRO_CHOI_MAC_DINH } from "../../src/lib/tro-choi.js";
import { tenBangDiem } from "../../src/lib/chung/ten.js";
import { laMay } from "../../src/lib/chung/tran.js";
import { duocDung } from "../../src/lib/chung/tinh-nang.js";

const MAU_MA_VAN = /^[A-Za-z0-9-]{16,64}$/;

// Trận hai người đã xong (hoặc bị đóng giữa chừng) và có nước đi thì xem lại được. Trận đang đấu thì xem trực tiếp: trả thêm
// hạn nước, giờ server và mã chuông của trận để trang nghe nước đi mới (chuông chỉ chứa nước đi, ai có link xem đều biết rồi).
async function xemTran(pb, H, ma) {
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });
  const { tran, loi } = await docTran(pb, H, ma);
  if (loi) return tra(502, { loi });
  const dangDau = tran?.trang_thai === "dang_dau";
  const xong = tran && (tran.trang_thai === "ket_thuc" || tran.trang_thai === "huy");
  if (!xong && !dangDau) return tra(404, { loi: "khong_tim_thay" });
  const nuoc = Array.isArray(tran.nuoc) && tran.nuoc.length > 0 ? tran.nuoc : null;
  const trucTiep = dangDau
    ? { dang_dau: true, nuoc: tran.nuoc || [], han_nuoc: tran.han_nuoc || "", tin_hieu: tran.tin_hieu || "", bay_gio: new Date().toISOString() }
    : {};
  return tra(200, {
    tro_choi: troChoiTran(tran).ma,
    loai: tran.loai,
    ten_do: laMay(tran.do) ? tran.ten_do : tenBangDiem(tran.ten_do || ""),
    ten_den: tenBangDiem(tran.ten_den || ""),
    may_muc: laMay(tran.do) ? tran.cap_do : null,
    ket_qua: tran.ket_qua || null,
    ly_do: tran.ly_do || null,
    nuoc,
    ...trucTiep,
  });
}

export async function onRequestGet({ request, env }) {
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });
  const q = new URL(request.url).searchParams;
  const pb = env.PB_URL;
  let H;
  let nguoi;
  try {
    [H, nguoi] = await Promise.all([headerAdmin(env), xacThuc(pb, request)]);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  if (!duocDung("xem_lai", nguoi)) return tra(403, { loi: "can_nang_cap" });

  if (q.has("tran")) return xemTran(pb, H, q.get("tran") || "");

  const ma = q.get("ma_van") || "";
  if (!MAU_MA_VAN.test(ma)) return tra(400, { loi: "ma_van_khong_hop_le" });
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
