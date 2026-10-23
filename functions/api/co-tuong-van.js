// Cloudflare Pages Function: nhận nhật ký một ván cờ tướng đã kết thúc, chạy lại ván để kiểm tra, rồi cộng điểm.
// Điểm chỉ được tính khi cả ván hợp lệ. Mỗi ván (ma_van) chỉ được tính một lần.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { xacMinhVan, diemCongVan, NUOC_TOI_DA, HOAN_TOI_DA } from "../../src/lib/co-tuong.js";
import { tra, dangNhap, xacThuc } from "../_lib/pocketbase.js";

const NGUON_CHO_PHEP = ["https://choico.pages.dev"];
const MAU_MA_VAN = /^[A-Za-z0-9-]{16,64}$/;
const MAU_NUOC = /^[a-i][0-9][a-i][0-9]$/;

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
  // Chỉ người đã đăng nhập Google mới được ghi điểm; tên lấy từ hồ sơ, không nhận từ trình duyệt
  const nguoi = await xacThuc(env.PB_URL, request);
  if (!nguoi) return tra(401, { loi: "chua_dang_nhap" });
  if (!nguoi.ten) return tra(409, { loi: "chua_co_ten" });
  const ten = nguoi.ten;

  const { ma_van, nuoc, so_hoan = 0 } = body ?? {};
  if (typeof ma_van !== "string" || !MAU_MA_VAN.test(ma_van)) return tra(400, { loi: "ma_van_khong_hop_le" });
  if (!Array.isArray(nuoc) || nuoc.length === 0 || nuoc.length > NUOC_TOI_DA) return tra(400, { loi: "nuoc_khong_hop_le" });
  if (!nuoc.every((x) => typeof x === "string" && MAU_NUOC.test(x))) return tra(400, { loi: "nuoc_khong_hop_le" });
  if (!Number.isInteger(so_hoan) || so_hoan < 0 || so_hoan > HOAN_TOI_DA) return tra(400, { loi: "so_hoan_khong_hop_le" });

  // Chạy lại ván: nếu nhật ký sai hoặc ván chưa kết thúc thì không tính điểm
  const kq = xacMinhVan(nuoc);
  if (!kq.hop_le) return tra(422, { loi: "van_khong_hop_le" });
  const diemCong = diemCongVan(kq.ket_qua, so_hoan); // mỗi nước hoãn trừ điểm

  const pb = env.PB_URL;
  let token;
  try {
    token = await dangNhap(pb, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
  const H = { "content-type": "application/json", authorization: token };

  // Chặn tính điểm trùng cho cùng một ván
  const daCo = await fetch(`${pb}/api/collections/cho_phien_co_van/records?perPage=1&filter=${encodeURIComponent(`ma_van="${ma_van}"`)}`, { headers: H });
  if (!daCo.ok) return tra(502, { loi: "khong_doc_duoc_van" });
  if ((await daCo.json()).totalItems > 0) return tra(409, { loi: "van_da_tinh_diem" });

  // Đọc điểm hiện tại của tên này trước, để điểm không xuống dưới 0
  const timTen = await fetch(`${pb}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${encodeURIComponent(`nguoi_choi="${nguoi.id}"`)}`, { headers: H });
  if (!timTen.ok) return tra(502, { loi: "khong_doc_duoc_diem" });
  const dong = (await timTen.json()).items?.[0] ?? null;
  const diemCu = dong ? dong.diem : 0;
  const diemMoi = Math.max(0, diemCu + diemCong); // điểm tối thiểu là 0
  const thayDoi = diemMoi - diemCu; // phần điểm thực tế được cộng hoặc trừ

  const ghiVan = await fetch(`${pb}/api/collections/cho_phien_co_van/records`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ ma_van, ten, nguoi_choi: nguoi.id, ket_qua: kq.ket_qua, diem_cong: thayDoi }),
  });
  if (!ghiVan.ok) return tra(502, { loi: "khong_ghi_duoc_van" });
  const idVan = (await ghiVan.json()).id;
  // Nếu không cộng được điểm thì xóa nhật ký ván, để lần gửi lại sau còn tính được
  const boVan = () => fetch(`${pb}/api/collections/cho_phien_co_van/records/${idVan}`, { method: "DELETE", headers: H });

  const ghiDiem = dong
    ? await fetch(`${pb}/api/collections/cho_phien_co_diem/records/${dong.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({
        diem: diemMoi,
        so_van: dong.so_van + 1,
        thang: dong.thang + (kq.ket_qua === "thang" ? 1 : 0),
        hoa: dong.hoa + (kq.ket_qua === "hoa" ? 1 : 0),
        thua: dong.thua + (kq.ket_qua === "thua" ? 1 : 0),
      }),
    })
    : await fetch(`${pb}/api/collections/cho_phien_co_diem/records`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        ten,
        nguoi_choi: nguoi.id,
        diem: diemMoi,
        so_van: 1,
        thang: kq.ket_qua === "thang" ? 1 : 0,
        hoa: kq.ket_qua === "hoa" ? 1 : 0,
        thua: kq.ket_qua === "thua" ? 1 : 0,
      }),
    });
  if (!ghiDiem.ok) {
    await boVan();
    return tra(502, { loi: "khong_cong_duoc_diem" });
  }
  return tra(200, { ket_qua: kq.ket_qua, diem_cong: thayDoi, tong_diem: diemMoi });
}
