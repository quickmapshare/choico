// Cloudflare Pages Function: nhận nhật ký một ván cờ tướng đã kết thúc, chạy lại ván để kiểm tra, rồi cộng điểm.
// Điểm chỉ được tính khi cả ván hợp lệ. Mỗi ván (ma_van) chỉ được tính một lần.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { xacMinhVan, tenHopLe, DIEM_THEO_KET_QUA, NUOC_TOI_DA } from "../../src/lib/co-tuong.js";

const NGUON_CHO_PHEP = ["https://chophien.pages.dev"];
const MAU_MA_VAN = /^[A-Za-z0-9-]{16,64}$/;
const MAU_NUOC = /^[a-i][0-9][a-i][0-9]$/;

function tra(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function dangNhap(pb, email, password) {
  const r = await fetch(`${pb}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error("dang_nhap_loi");
  return (await r.json()).token;
}

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
  const { ma_van, ten, nuoc } = body ?? {};
  if (typeof ma_van !== "string" || !MAU_MA_VAN.test(ma_van)) return tra(400, { loi: "ma_van_khong_hop_le" });
  if (typeof ten !== "string" || !tenHopLe(ten)) return tra(400, { loi: "ten_khong_hop_le" });
  if (!Array.isArray(nuoc) || nuoc.length === 0 || nuoc.length > NUOC_TOI_DA) return tra(400, { loi: "nuoc_khong_hop_le" });
  if (!nuoc.every((x) => typeof x === "string" && MAU_NUOC.test(x))) return tra(400, { loi: "nuoc_khong_hop_le" });

  // Chạy lại ván: nếu nhật ký sai hoặc ván chưa kết thúc thì không tính điểm
  const kq = xacMinhVan(nuoc);
  if (!kq.hop_le) return tra(422, { loi: "van_khong_hop_le" });
  const diemCong = DIEM_THEO_KET_QUA[kq.ket_qua];

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

  const ghiVan = await fetch(`${pb}/api/collections/cho_phien_co_van/records`, {
    method: "POST",
    headers: H,
    body: JSON.stringify({ ma_van, ten, ket_qua: kq.ket_qua, diem_cong: diemCong }),
  });
  if (!ghiVan.ok) return tra(502, { loi: "khong_ghi_duoc_van" });

  // Cộng dồn vào bảng điểm của tên này
  const timTen = await fetch(`${pb}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${encodeURIComponent(`ten="${ten}"`)}`, { headers: H });
  const dong = timTen.ok ? (await timTen.json()).items?.[0] : null;
  const ghiDiem = dong
    ? await fetch(`${pb}/api/collections/cho_phien_co_diem/records/${dong.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({
        diem: dong.diem + diemCong,
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
        diem: diemCong,
        so_van: 1,
        thang: kq.ket_qua === "thang" ? 1 : 0,
        hoa: kq.ket_qua === "hoa" ? 1 : 0,
        thua: kq.ket_qua === "thua" ? 1 : 0,
      }),
    });
  if (!ghiDiem.ok) return tra(502, { loi: "khong_cong_duoc_diem" });
  const tong = (await ghiDiem.json()).diem;
  return tra(200, { ket_qua: kq.ket_qua, diem_cong: diemCong, tong_diem: tong });
}
