// Cloudflare Pages Function: xem trạng thái một trận giữa hai người, đi nước và đầu hàng.
//  - GET ?ma=...: người trong trận thấy đủ thông tin. Người ngoài chỉ thấy loại trận và tên người tạo (để biết link có hợp lệ không).
//  - POST {hanh_dong: "nuoc", ky}: đi một nước. Server dựng lại bàn từ danh sách nước và kiểm tra luật.
//  - POST {hanh_dong: "dau_hang"}: bỏ cuộc.
// Hết 60 giây cho một nước thì KHÔNG xử thua ngay: bên đang chờ chọn cho nghĩ thêm 1 phút, nghĩ thoải mái (không giới hạn
// nước này) hoặc xử thua. Trong lúc chưa ai quyết định, bên chậm vẫn đi nước được.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra } from "../_lib/pocketbase.js";
import { layNguoi, headerAdmin, docTran, capNhatTran, ketThucTran, sauPhut, MAU_MA } from "../_lib/tran.js";
import { timNuoc, tenBangDiem } from "../../src/lib/co-tuong.js";
import {
  duyetNuoc, kiemHetGio, benCuaToi, benDenLuot, GIAY_MOI_NUOC, MAU_KY_HOP_LE, xuLyHetGio, kiemBoDo,
} from "../../src/lib/co-tuong-tran.js";

// Trận bị bỏ dở (quá hạn mà không ai quyết định).
//  - Thượng đài: bên đang đến lượt mà bỏ đi thì bị xử thua và có tính điểm, để không ai tránh bị trừ điểm bằng cách bỏ đi.
//  - Khép kín: đóng trận, không có bên thắng thua.
async function dongBoDo(pb, H, tran) {
  if (tran.loai === "dai") {
    const ketQua = benDenLuot((tran.nuoc || []).length) === "r" ? "den" : "do";
    await ketThucTran(pb, H, tran, { ket_qua: ketQua, ly_do: "bo_do", nuoc: null });
    return { ...tran, trang_thai: "ket_thuc", ket_qua: ketQua, ly_do: "bo_do", han_nuoc: "" };
  }
  await capNhatTran(pb, H, tran, { trang_thai: "huy", ly_do: "bo_do", han_nuoc: "" });
  return { ...tran, trang_thai: "huy", ly_do: "bo_do", han_nuoc: "" };
}

// Trả về cho người chơi (đủ thông tin) hoặc cho người ngoài (chỉ đủ để xem link)
function ban(tran, benCua) {
  const co = {
    loai: tran.loai,
    trang_thai: tran.trang_thai,
    ten_do: tenBangDiem(tran.ten_do || ""), // che chữ số trong tên như bảng điểm, để không lộ số điện thoại
    het_han: tran.het_han,
    bay_gio: new Date().toISOString(), // giờ server, để trình duyệt đếm ngược đúng dù đồng hồ máy lệch
  };
  if (!benCua) return co;
  return {
    ...co,
    ma: tran.ma,
    ten_den: tenBangDiem(tran.ten_den || ""),
    nuoc: tran.nuoc || [],
    han_nuoc: tran.han_nuoc || "",
    ket_qua: tran.ket_qua || null,
    ly_do: tran.ly_do || null,
    ban_cua: benCua, // "r" hoặc "b"
    tin_hieu: tran.tin_hieu || "", // mã chuông báo realtime của trận (rỗng với trận tạo trước khi có chuông)
    den_luot: tran.trang_thai === "dang_dau" ? benDenLuot((tran.nuoc || []).length) : null,
    het_gio: Boolean(kiemHetGio(tran)), // đã quá hạn nước này, đang chờ bên kia quyết định
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
  const { tran: tranGoc, loi } = await docTran(pb, H, ma);
  if (loi) return tra(502, { loi });
  if (!tranGoc) return tra(404, { loi: "khong_tim_thay" });
  const tran = kiemBoDo(tranGoc) ? await dongBoDo(pb, H, tranGoc) : tranGoc;

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
  if (kiemBoDo(tran)) {
    await dongBoDo(pb, H, tran);
    return tra(409, { loi: "tran_da_dong" });
  }
  if (tran.trang_thai !== "dang_dau") return tra(409, { loi: "tran_khong_dang_dau" });

  // Bên đang chờ quyết định khi đối thủ hết giờ
  if (body.hanh_dong === "xu_het_gio") {
    const kq = xuLyHetGio(tran, benCua, body.lua_chon);
    if (kq.loi) return tra(409, { loi: kq.loi });
    if (kq.ket_thuc) {
      await ketThucTran(pb, H, tran, { ket_qua: kq.ket_thuc.ket_qua, ly_do: kq.ket_thuc.ly_do, nuoc: null });
      return tra(200, ban({ ...tran, trang_thai: "ket_thuc", ket_qua: kq.ket_thuc.ket_qua, ly_do: kq.ket_thuc.ly_do, han_nuoc: "" }, benCua));
    }
    const r = await capNhatTran(pb, H, tran, kq.cap_nhat);
    if (!r.ok) return tra(502, { loi: "khong_luu_duoc" });
    return tra(200, ban({ ...tran, ...kq.cap_nhat }, benCua));
  }

  if (body.hanh_dong === "dau_hang") {
    const ket = benCua === "r" ? "den" : "do";
    await ketThucTran(pb, H, tran, { ket_qua: ket, ly_do: "dau_hang", nuoc: null });
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
    await ketThucTran(pb, H, tran, { ket_qua: sau.ket_qua, ly_do: sau.ly_do, nuoc: nuocMoi });
    return tra(200, ban({ ...tran, nuoc: nuocMoi, trang_thai: "ket_thuc", ket_qua: sau.ket_qua, ly_do: sau.ly_do, han_nuoc: "" }, benCua));
  }
  // Trả luôn trạng thái mới để trình duyệt không phải gọi thêm một lượt đọc
  const hanMoi = sauPhut(GIAY_MOI_NUOC);
  const r = await capNhatTran(pb, H, tran, { nuoc: nuocMoi, han_nuoc: hanMoi });
  if (!r.ok) return tra(502, { loi: "khong_luu_duoc_nuoc" });
  return tra(200, ban({ ...tran, nuoc: nuocMoi, han_nuoc: hanMoi }, benCua));
}
