// Cloudflare Pages Function: xem trạng thái một trận giữa hai người, đi nước và đầu hàng.
//  - GET ?ma=...: người trong trận thấy đủ thông tin. Người ngoài chỉ thấy loại trận và tên người tạo (để biết link có hợp lệ không).
//  - POST {hanh_dong: "nuoc", ky}: đi một nước. Server dựng lại bàn từ danh sách nước và kiểm tra luật.
//  - POST {hanh_dong: "dau_hang"}: bỏ cuộc.
// Hết 60 giây cho một nước thì bên đến lượt thua, server tự xử khi có yêu cầu đến.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra } from "../_lib/pocketbase.js";
import { layNguoi, headerAdmin, docTran, capNhatTran, sauPhut, MAU_MA } from "../_lib/tran.js";
import { timNuoc } from "../../src/lib/co-tuong.js";
import {
  duyetNuoc, kiemHetGio, benCuaToi, benDenLuot, GIAY_MOI_NUOC, MAU_KY_HOP_LE,
} from "../../src/lib/co-tuong-tran.js";

// Kết thúc trận (hết giờ, đầu hàng, hết nước). Khép kín không tính điểm.
async function ketThuc(pb, H, tran, { ket_qua, ly_do, nuoc }) {
  const data = { trang_thai: "ket_thuc", ket_qua, ly_do, han_nuoc: "" };
  if (nuoc) data.nuoc = nuoc;
  return capNhatTran(pb, H, tran.id, data);
}

// Trả về cho người chơi (đủ thông tin) hoặc cho người ngoài (chỉ đủ để xem link)
function ban(tran, benCua) {
  const co = {
    loai: tran.loai,
    trang_thai: tran.trang_thai,
    ten_do: tran.ten_do,
    het_han: tran.het_han,
    bay_gio: new Date().toISOString(), // giờ server, để trình duyệt đếm ngược đúng dù đồng hồ máy lệch
  };
  if (!benCua) return co;
  return {
    ...co,
    ma: tran.ma,
    ten_den: tran.ten_den || "",
    nuoc: tran.nuoc || [],
    han_nuoc: tran.han_nuoc || "",
    ket_qua: tran.ket_qua || null,
    ly_do: tran.ly_do || null,
    ban_cua: benCua, // "r" hoặc "b"
    den_luot: tran.trang_thai === "dang_dau" ? benDenLuot((tran.nuoc || []).length) : null,
  };
}

export async function onRequestGet({ request, env }) {
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });
  const ma = new URL(request.url).searchParams.get("ma") || "";
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });
  const pb = env.PB_URL;
  const nguoi = await layNguoi(pb, request);
  let H;
  try {
    H = await headerAdmin(env);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const { tran, loi } = await docTran(pb, H, ma);
  if (loi) return tra(502, { loi });
  if (!tran) return tra(404, { loi: "khong_tim_thay" });

  // Hết giờ thì ghi nhận ngay để mọi người thấy đúng kết quả
  if (tran.trang_thai === "dang_dau") {
    const het = kiemHetGio(tran);
    if (het) {
      await ketThuc(pb, H, tran, { ket_qua: het.ket_qua, ly_do: het.ly_do, nuoc: null });
      return tra(200, ban({ ...tran, trang_thai: "ket_thuc", ket_qua: het.ket_qua, ly_do: het.ly_do }, nguoi && benCuaToi(tran, nguoi.id)));
    }
  }
  return tra(200, ban(tran, nguoi && benCuaToi(tran, nguoi.id)));
}

export async function onRequestPost({ request, env }) {
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });
  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const pb = env.PB_URL;
  const nguoi = await layNguoi(pb, request);
  if (!nguoi) return tra(401, { loi: "chua_co_danh_tinh" });
  const ma = typeof body?.ma === "string" ? body.ma : "";
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });

  let H;
  try {
    H = await headerAdmin(env);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const { tran, loi } = await docTran(pb, H, ma);
  if (loi) return tra(502, { loi });
  if (!tran) return tra(404, { loi: "khong_tim_thay" });
  const benCua = benCuaToi(tran, nguoi.id);
  if (!benCua) return tra(403, { loi: "khong_trong_tran" });
  if (tran.trang_thai !== "dang_dau") return tra(409, { loi: "tran_khong_dang_dau" });

  // Hết giờ rồi thì không nhận nước nữa
  const het = kiemHetGio(tran);
  if (het) {
    await ketThuc(pb, H, tran, { ket_qua: het.ket_qua, ly_do: het.ly_do, nuoc: null });
    return tra(409, { loi: "het_gio", ket_qua: het.ket_qua });
  }

  if (body.hanh_dong === "dau_hang") {
    const ket = benCua === "r" ? "den" : "do";
    await ketThuc(pb, H, tran, { ket_qua: ket, ly_do: "dau_hang", nuoc: null });
    return tra(200, ban({ ...tran, trang_thai: "ket_thuc", ket_qua: ket, ly_do: "dau_hang", han_nuoc: "" }, benCua));
  }

  if (body.hanh_dong !== "nuoc") return tra(400, { loi: "hanh_dong_khong_hop_le" });
  const ky = typeof body.ky === "string" ? body.ky : "";
  if (!MAU_KY_HOP_LE.test(ky)) return tra(400, { loi: "nuoc_khong_hop_le" });

  const nuocCu = tran.nuoc || [];
  const hienTai = duyetNuoc(nuocCu);
  if (!hienTai.hop_le) return tra(500, { loi: "van_hong" });
  if (benDenLuot(nuocCu.length) !== benCua) return tra(409, { loi: "chua_den_luot" });
  if (!timNuoc(hienTai.b, benCua, ky)) return tra(422, { loi: "nuoc_sai_luat" });

  const nuocMoi = [...nuocCu, ky];
  const sau = duyetNuoc(nuocMoi);
  if (!sau.hop_le) return tra(422, { loi: "nuoc_sai_luat" });

  if (sau.ket_thuc) {
    await ketThuc(pb, H, tran, { ket_qua: sau.ket_qua, ly_do: sau.ly_do, nuoc: nuocMoi });
    return tra(200, ban({ ...tran, nuoc: nuocMoi, trang_thai: "ket_thuc", ket_qua: sau.ket_qua, ly_do: sau.ly_do, han_nuoc: "" }, benCua));
  }
  // Trả luôn trạng thái mới để trình duyệt không phải gọi thêm một lượt đọc
  const hanMoi = sauPhut(GIAY_MOI_NUOC);
  const r = await capNhatTran(pb, H, tran.id, { nuoc: nuocMoi, han_nuoc: hanMoi });
  if (!r.ok) return tra(502, { loi: "khong_luu_duoc_nuoc" });
  return tra(200, ban({ ...tran, nuoc: nuocMoi, han_nuoc: hanMoi }, benCua));
}
