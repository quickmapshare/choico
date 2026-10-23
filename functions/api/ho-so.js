// Cloudflare Pages Function: hồ sơ người chơi đã đăng nhập Google (một tài khoản cho mọi loại cờ).
//  - GET ?tro_choi=...: trả tên hiển thị và mức chơi của loại cờ đó (thiếu là cờ tướng). Lần đầu chưa có tên thì tạo từ tên
//    Google (thêm số nếu trùng).
//  - POST { ten_moi }: đổi tên, cập nhật luôn các dòng bảng điểm (mọi loại cờ) và các ván đã tính điểm của người này.
// Header Authorization: Bearer <token PocketBase của người chơi>.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tenHopLe } from "../../src/lib/chung/ten.js";
import {
  tra, xacThuc, chonTenMoi, tenDaCoNguoiDung, headerAdmin, nguonLa, thieuCauHinh, troChoiCua, NGUOI_CHOI, BANG_DIEM, BANG_VAN, loc,
} from "../_lib/pocketbase.js";
import { docMuc } from "../_lib/diem.js";

function kiemTraChung(request, env) {
  if (nguonLa(request)) return tra(403, { loi: "nguon_khong_duoc_phep" });
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });
  return null;
}

export async function onRequestGet({ request, env }) {
  const loi = kiemTraChung(request, env);
  if (loi) return loi;
  const troChoi = troChoiCua(new URL(request.url).searchParams.get("tro_choi"));
  if (!troChoi) return tra(400, { loi: "tro_choi_khong_hop_le" });
  const nguoi = await xacThuc(env.PB_URL, request);
  if (!nguoi) return tra(401, { loi: "chua_dang_nhap" });

  try {
    const H = await headerAdmin(env);
    // Mức chơi hiện tại của tài khoản ở loại cờ này (chưa chơi ván nào thì là mức 1)
    const muc = (await docMuc(env.PB_URL, H, nguoi.id, troChoi.ma)) || 1;
    if (nguoi.ten) return tra(200, { ten: nguoi.ten, muc });

    const ten = await chonTenMoi(env.PB_URL, H, nguoi.name, nguoi.id);
    const r = await fetch(`${env.PB_URL}/api/collections/${NGUOI_CHOI}/records/${nguoi.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({ ten }),
    });
    if (!r.ok) return tra(502, { loi: "khong_luu_duoc_ten" });
    return tra(200, { ten, muc });
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }
}

export async function onRequestPost({ request, env }) {
  const loi = kiemTraChung(request, env);
  if (loi) return loi;
  const nguoi = await xacThuc(env.PB_URL, request);
  if (!nguoi) return tra(401, { loi: "chua_dang_nhap" });

  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const tenMoi = body?.ten_moi;
  if (typeof tenMoi !== "string" || !tenHopLe(tenMoi)) return tra(400, { loi: "ten_moi_khong_hop_le" });
  if (tenMoi === nguoi.ten) return tra(200, { ten: tenMoi });

  const pb = env.PB_URL;
  try {
    const H = await headerAdmin(env);
    if (await tenDaCoNguoiDung(pb, H, tenMoi, nguoi.id)) return tra(409, { loi: "ten_da_ton_tai" });

    const sua = (duong, du_lieu) => fetch(`${pb}/api/collections/${duong}`, { method: "PATCH", headers: H, body: JSON.stringify(du_lieu) });

    // Sửa mọi bản ghi của người này trong bang mà tên còn khác tên mới. Lọc lại từ đầu sau mỗi lần sửa, vì dòng đã sửa
    // không còn khớp. Trả về số dòng đã sửa, hoặc null nếu lỗi.
    async function doiTenTrong(bang) {
      let so = 0;
      for (;;) {
        const r = await fetch(`${pb}/api/collections/${bang}/records?perPage=200&fields=id&filter=${loc(`nguoi_choi="${nguoi.id}" && ten!="${tenMoi}"`)}`, { headers: H });
        if (!r.ok) return null;
        const items = (await r.json()).items ?? [];
        if (items.length === 0) return so;
        for (const it of items) {
          if (!(await sua(`${bang}/records/${it.id}`, { ten: tenMoi })).ok) return null;
          so++;
        }
      }
    }

    // Đổi các dòng điểm trước (có chỉ mục duy nhất theo tên và loại cờ), rồi hồ sơ, rồi các ván. Gọi lại sau khi lỗi giữa
    // chừng vẫn an toàn.
    if ((await doiTenTrong(BANG_DIEM)) === null) return tra(502, { loi: "khong_doi_duoc_diem" });
    if (!(await sua(`${NGUOI_CHOI}/records/${nguoi.id}`, { ten: tenMoi })).ok) return tra(502, { loi: "khong_doi_duoc_ten" });
    const soVanDoi = await doiTenTrong(BANG_VAN);
    if (soVanDoi === null) return tra(502, { loi: "khong_doi_duoc_van" });
    return tra(200, { ten: tenMoi, so_van_doi_ten: soVanDoi });
  } catch {
    return tra(502, { loi: "khong_doi_duoc_ten" });
  }
}
