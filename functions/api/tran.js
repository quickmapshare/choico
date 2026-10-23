// Cloudflare Pages Function: xem trạng thái một trận giữa hai người (mọi loại cờ), đi nước và đầu hàng.
//  - GET ?ma=...: người trong trận thấy đủ thông tin. Người ngoài chỉ thấy loại trận và tên người tạo (để biết link có hợp lệ không).
//  - POST {hanh_dong: "nuoc", ky}: đi một nước. Server dựng lại bàn từ danh sách nước và kiểm tra luật của loại cờ của trận.
//  - POST {hanh_dong: "dau_hang"}: bỏ cuộc.
// Hết 60 giây cho một nước thì KHÔNG xử thua ngay: bên đang chờ chọn cho nghĩ thêm 1 phút, nghĩ thoải mái (không giới hạn
// nước này) hoặc xử thua. Trong lúc chưa ai quyết định, bên chậm vẫn đi nước được.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra, thieuCauHinh } from "../_lib/pocketbase.js";
import { docNguoiVaTran, capNhatTran, ketThucTran, sauPhut, troChoiTran, MAU_MA } from "../_lib/tran.js";
import { tenBangDiem } from "../../src/lib/chung/ten.js";
import { themNuoc } from "../../src/lib/chung/van.js";
import {
  kiemHetGio, benCuaToi, benDenLuot, GIAY_MOI_NUOC, xuLyHetGio, kiemBoDo, laMay, denLuotMay, duocDiNuoc,
} from "../../src/lib/chung/tran.js";

// Trận bị bỏ dở (quá hạn mà không ai quyết định).
//  - Thượng đài: bên đang đến lượt mà bỏ đi thì bị xử thua và có tính điểm, để không ai tránh bị trừ điểm bằng cách bỏ đi.
//  - Khép kín: đóng trận, không có bên thắng thua.
async function dongBoDo(pb, H, tran) {
  // Trận với máy: máy đứng yên chờ người chơi (trình duyệt của họ tính nước cho máy), nên người chơi bỏ đi lúc đến lượt máy
  // không được tính thắng. Đóng trận không điểm. Đến lượt người chơi mà bỏ đi thì vẫn bị xử thua như thường.
  if (tran.loai === "dai" && !denLuotMay(tran)) {
    const ketQua = benDenLuot((tran.nuoc || []).length) === "r" ? "den" : "do";
    await ketThucTran(pb, H, tran, { ket_qua: ketQua, ly_do: "bo_do", nuoc: null });
    return { ...tran, trang_thai: "ket_thuc", ket_qua: ketQua, ly_do: "bo_do", han_nuoc: "" };
  }
  const dong = { trang_thai: "huy", ly_do: "bo_do", han_nuoc: "" };
  await capNhatTran(pb, H, tran, dong);
  return { ...tran, ...dong };
}

// Trả về cho người chơi (đủ thông tin) hoặc cho người ngoài (chỉ đủ để xem link)
function ban(tran, benCua) {
  const co = {
    tro_choi: troChoiTran(tran).ma,
    loai: tran.loai,
    trang_thai: tran.trang_thai,
    ten_do: laMay(tran.do) ? tran.ten_do : tenBangDiem(tran.ten_do || ""), // che chữ số trong tên như bảng điểm, để không lộ số điện thoại (tên máy thì giữ)
    het_han: tran.het_han,
    may_muc: laMay(tran.do) ? tran.cap_do : null, // trận với máy trên thượng đài: mức của máy, để trình duyệt người chơi tính nước cho máy
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
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });
  const ma = new URL(request.url).searchParams.get("ma") || "";
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });
  const pb = env.PB_URL;
  const { loiTra, nguoi, H, tran: tranGoc } = await docNguoiVaTran(env, request, ma);
  if (loiTra) return loiTra;
  let tran = kiemBoDo(tranGoc) ? await dongBoDo(pb, H, tranGoc) : tranGoc;
  // Trận với máy: máy không ngồi chờ để quyết định, nên người chơi hết giờ thì xử thua ngay (không có bước nghĩ thêm)
  const het = laMay(tran.do) ? kiemHetGio(tran) : null;
  if (het) {
    await ketThucTran(pb, H, tran, { ket_qua: het.ket_qua, ly_do: het.ly_do, nuoc: null });
    tran = { ...tran, trang_thai: "ket_thuc", ket_qua: het.ket_qua, ly_do: het.ly_do, han_nuoc: "" };
  }

  return tra(200, ban(tran, nguoi && benCuaToi(tran, nguoi.id)));
}

export async function onRequestPost({ request, env }) {
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });
  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const pb = env.PB_URL;
  const ma = typeof body?.ma === "string" ? body.ma : "";
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });
  const { loiTra, nguoi, H, tran } = await docNguoiVaTran(env, request, ma);
  if (loiTra) return loiTra;
  if (!nguoi) return tra(401, { loi: "chua_co_danh_tinh" });
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
  const { luat } = troChoiTran(tran);
  const ky = typeof body.ky === "string" ? body.ky : "";
  if (!luat.MAU_KY.test(ky)) return tra(400, { loi: "nuoc_khong_hop_le" });

  const nuocCu = tran.nuoc || [];
  // Đến lượt máy (trận với máy) thì người thách đấu gửi nước do trình duyệt của họ tính cho máy; server chỉ kiểm luật như mọi nước
  if (!duocDiNuoc(tran, benCua)) return tra(409, { loi: "chua_den_luot" });
  const sau = themNuoc(luat, nuocCu, ky);
  if (sau.van_hong) return tra(500, { loi: "van_hong" });
  if (!sau.hop_le) return tra(422, { loi: "nuoc_sai_luat" });
  const nuocMoi = [...nuocCu, ky];

  if (sau.ket_thuc) {
    await ketThucTran(pb, H, tran, { ket_qua: sau.ket_qua, ly_do: sau.ly_do, nuoc: nuocMoi });
    return tra(200, ban({ ...tran, nuoc: nuocMoi, trang_thai: "ket_thuc", ket_qua: sau.ket_qua, ly_do: sau.ly_do, han_nuoc: "" }, benCua));
  }
  // Trả luôn trạng thái mới để trình duyệt không phải gọi thêm một lượt đọc.
  // gui: giờ bấm nước (trình duyệt đã quy theo giờ server) chuyển qua chuông để bên kia đo độ trễ; giá trị lạ thì bỏ.
  // Máy không có hạn nước: tới lượt máy thì để trống (người chơi chỉ phải đi nước của mình trong 60 giây)
  const hanMoi = denLuotMay(tran, nuocMoi.length) ? "" : sauPhut(GIAY_MOI_NUOC);
  const gui = Number.isFinite(body.gui) && Math.abs(Date.now() - body.gui) < 60000 ? Math.round(body.gui) : 0;
  const r = await capNhatTran(pb, H, tran, { nuoc: nuocMoi, han_nuoc: hanMoi }, { gui });
  if (!r.ok) return tra(502, { loi: "khong_luu_duoc_nuoc" });
  return tra(200, ban({ ...tran, nuoc: nuocMoi, han_nuoc: hanMoi }, benCua));
}
