// Cộng điểm và đổi mức cho một người chơi sau một ván tính điểm (đấu máy hoặc thượng đài). Không phải route.
// Quy tắc dùng chung: điểm theo kết quả trừ điểm hoãn, điểm không xuống dưới 0; thắng lên một mức, thua xuống một mức, hòa giữ nguyên.
// Hai bước tách riêng vì ván đấu máy cần biết điểm thực nhận để ghi vào nhật ký TRƯỚC khi cộng điểm (xem co-tuong-van.js).
import { diemCongVan } from "../../src/lib/co-tuong.js";

// Bước 1: đọc điểm hiện tại và tính điểm, mức mới. Chưa ghi gì. Trả về { loi } hoặc kế hoạch cho ghiDiem.
export async function tinhDiem(pb, H, nguoi, ketQua, soHoan = 0) {
  const r = await fetch(`${pb}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${encodeURIComponent(`nguoi_choi="${nguoi.id}"`)}`, { headers: H });
  if (!r.ok) return { loi: "khong_doc_duoc_diem" };
  const dong = (await r.json()).items?.[0] ?? null;
  const diemCu = dong ? dong.diem : 0;
  const diemMoi = Math.max(0, diemCu + diemCongVan(ketQua, soHoan)); // điểm tối thiểu là 0
  const mucMoi = Math.min(5, Math.max(1, (dong?.muc || 1) + (ketQua === "thang" ? 1 : ketQua === "thua" ? -1 : 0)));
  return { dong, diemMoi, thayDoi: diemMoi - diemCu, mucMoi };
}

// Bước 2: ghi điểm theo kế hoạch của tinhDiem. Trả về { diem_cong, tong_diem, muc } hoặc { loi }.
export async function ghiDiem(pb, H, nguoi, ten, ketQua, ke) {
  const { dong, diemMoi, mucMoi } = ke;
  const ghi = dong
    ? await fetch(`${pb}/api/collections/cho_phien_co_diem/records/${dong.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({
        diem: diemMoi,
        muc: mucMoi,
        so_van: dong.so_van + 1,
        thang: dong.thang + (ketQua === "thang" ? 1 : 0),
        hoa: dong.hoa + (ketQua === "hoa" ? 1 : 0),
        thua: dong.thua + (ketQua === "thua" ? 1 : 0),
      }),
    })
    : await fetch(`${pb}/api/collections/cho_phien_co_diem/records`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        ten,
        nguoi_choi: nguoi.id,
        diem: diemMoi,
        muc: mucMoi,
        so_van: 1,
        thang: ketQua === "thang" ? 1 : 0,
        hoa: ketQua === "hoa" ? 1 : 0,
        thua: ketQua === "thua" ? 1 : 0,
      }),
    });
  if (!ghi.ok) return { loi: "khong_cong_duoc_diem" };
  return { diem_cong: ke.thayDoi, tong_diem: diemMoi, muc: mucMoi };
}

// Tính và ghi liền (dùng cho thượng đài, không cần ghi nhật ký giữa hai bước)
export async function capNhatDiem(pb, H, nguoi, ten, ketQua, soHoan = 0) {
  const ke = await tinhDiem(pb, H, nguoi, ketQua, soHoan);
  if (ke.loi) return ke;
  return ghiDiem(pb, H, nguoi, ten, ketQua, ke);
}
