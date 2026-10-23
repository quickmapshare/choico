// Cloudflare Pages Function: nhận nhật ký một ván đấu máy đã kết thúc, chạy lại ván để kiểm tra, rồi cộng điểm.
// Body { tro_choi, ma_van, nuoc, so_hoan }; tro_choi thiếu là cờ tướng. Người chơi cầm bên đi trước.
// Điểm chỉ được tính khi cả ván hợp lệ. Mỗi ván (ma_van) chỉ được tính một lần.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { xacMinhVan } from "../../src/lib/chung/van.js";
import { HOAN_TOI_DA } from "../../src/lib/chung/diem.js";
import { tra, xacThuc, headerAdmin, nguonLa, thieuCauHinh, troChoiCua, BANG_VAN, loc } from "../_lib/pocketbase.js";
import { tinhDiem, ghiDiem } from "../_lib/diem.js";

const MAU_MA_VAN = /^[A-Za-z0-9-]{16,64}$/;

export async function onRequestPost({ request, env }) {
  if (nguonLa(request) || !request.headers.get("origin")) return tra(403, { loi: "nguon_khong_duoc_phep" });
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });

  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  // Chỉ người đã đăng nhập Google mới được ghi điểm; tên lấy từ hồ sơ, không nhận từ trình duyệt
  const nguoi = await xacThuc(env.PB_URL, request);
  if (!nguoi) return tra(401, { loi: "chua_dang_nhap" });
  if (!nguoi.ten) return tra(409, { loi: "chua_co_ten" });
  const ten = nguoi.ten;

  const { ma_van, nuoc, so_hoan = 0 } = body ?? {};
  const troChoi = troChoiCua(body?.tro_choi);
  if (!troChoi) return tra(400, { loi: "tro_choi_khong_hop_le" });
  const { luat } = troChoi;
  if (typeof ma_van !== "string" || !MAU_MA_VAN.test(ma_van)) return tra(400, { loi: "ma_van_khong_hop_le" });
  if (!Array.isArray(nuoc) || nuoc.length === 0 || nuoc.length > luat.NUOC_TOI_DA) return tra(400, { loi: "nuoc_khong_hop_le" });
  if (!nuoc.every((x) => typeof x === "string" && luat.MAU_KY.test(x))) return tra(400, { loi: "nuoc_khong_hop_le" });
  if (!Number.isInteger(so_hoan) || so_hoan < 0 || so_hoan > HOAN_TOI_DA) return tra(400, { loi: "so_hoan_khong_hop_le" });

  // Chạy lại ván: nếu nhật ký sai hoặc ván chưa kết thúc thì không tính điểm
  const kq = xacMinhVan(luat, nuoc);
  if (!kq.hop_le) return tra(422, { loi: "van_khong_hop_le" });

  const pb = env.PB_URL;
  let H;
  try {
    H = await headerAdmin(env);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }

  // Chặn tính điểm trùng cho cùng một ván
  const daCo = await fetch(`${pb}/api/collections/${BANG_VAN}/records?perPage=1&filter=${loc(`ma_van="${ma_van}"`)}`, { headers: H });
  if (!daCo.ok) return tra(502, { loi: "khong_doc_duoc_van" });
  if ((await daCo.json()).totalItems > 0) return tra(409, { loi: "van_da_tinh_diem" });

  // Tính điểm trước để ghi điểm thực nhận (không xuống dưới 0) vào nhật ký ván; chưa ghi điểm
  const ke = await tinhDiem(pb, H, nguoi, troChoi.ma, kq.ket_qua, so_hoan);
  if (ke.loi) return tra(502, { loi: ke.loi });

  const ghiVan = await fetch(`${pb}/api/collections/${BANG_VAN}/records`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ ma_van, tro_choi: troChoi.ma, ten, nguoi_choi: nguoi.id, ket_qua: kq.ket_qua, diem_cong: ke.thayDoi, nuoc, so_hoan }),
  });
  if (!ghiVan.ok) return tra(502, { loi: "khong_ghi_duoc_van" });
  const idVan = (await ghiVan.json()).id;
  // Nếu không cộng được điểm thì xóa nhật ký ván, để lần gửi lại sau còn tính được
  const boVan = () => fetch(`${pb}/api/collections/${BANG_VAN}/records/${idVan}`, { method: "DELETE", headers: H });

  const diem = await ghiDiem(pb, H, nguoi, ten, kq.ket_qua, ke);
  if (diem.loi) {
    await boVan();
    return tra(502, { loi: diem.loi });
  }
  return tra(200, { ket_qua: kq.ket_qua, diem_cong: diem.diem_cong, tong_diem: diem.tong_diem, muc: diem.muc });
}
