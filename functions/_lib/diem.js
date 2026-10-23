// Cộng điểm và đổi mức cho một người chơi sau một ván tính điểm (đấu máy hoặc thượng đài). Không phải route.
// Mỗi người có một dòng điểm cho mỗi loại cờ (cột tro_choi; dòng cũ để trống là cờ tướng).
// Quy tắc dùng chung (src/lib/chung/diem.js): điểm theo kết quả trừ điểm hoãn, điểm không xuống dưới 0; thắng lên một mức,
// thua xuống một mức, hòa giữ nguyên.
// Hai bước tách riêng vì ván đấu máy cần biết điểm thực nhận để ghi vào nhật ký TRƯỚC khi cộng điểm (xem api/van.js).
import { diemCongVan, mucSauVan } from "../../src/lib/chung/diem.js";
import { locTroChoi } from "../../src/lib/tro-choi.js";
import { BANG_DIEM, loc } from "./pocketbase.js";

// Dòng điểm của người chơi ở một loại cờ, null nếu chưa có. Ném lỗi nếu không đọc được.
export async function docDongDiem(pb, H, idNguoi, troChoi) {
  const r = await fetch(`${pb}/api/collections/${BANG_DIEM}/records?perPage=1&filter=${loc(`nguoi_choi="${idNguoi}" && ${locTroChoi(troChoi)}`)}`, { headers: H });
  if (!r.ok) throw new Error("khong_doc_duoc_diem");
  return (await r.json()).items?.[0] ?? null;
}

// Mức hiện tại của người chơi ở một loại cờ (1 nếu chưa có điểm), null nếu không đọc được
export async function docMuc(pb, H, idNguoi, troChoi) {
  try {
    return (await docDongDiem(pb, H, idNguoi, troChoi))?.muc || 1;
  } catch {
    return null;
  }
}

// Bước 1: đọc điểm hiện tại và tính điểm, mức mới. Chưa ghi gì. Trả về { loi } hoặc kế hoạch cho ghiDiem.
export async function tinhDiem(pb, H, nguoi, troChoi, ketQua, soHoan = 0) {
  let dong;
  try {
    dong = await docDongDiem(pb, H, nguoi.id, troChoi);
  } catch {
    return { loi: "khong_doc_duoc_diem" };
  }
  const diemCu = dong ? dong.diem : 0;
  const diemMoi = Math.max(0, diemCu + diemCongVan(ketQua, soHoan)); // điểm tối thiểu là 0
  const mucMoi = mucSauVan(dong?.muc, ketQua);
  return { dong, troChoi, diemMoi, thayDoi: diemMoi - diemCu, mucMoi };
}

// Bước 2: ghi điểm theo kế hoạch của tinhDiem. Trả về { diem_cong, tong_diem, muc } hoặc { loi }.
export async function ghiDiem(pb, H, nguoi, ten, ketQua, ke) {
  const { dong, troChoi, diemMoi, mucMoi } = ke;
  const dem = (k) => (ketQua === k ? 1 : 0);
  const ghi = dong
    ? await fetch(`${pb}/api/collections/${BANG_DIEM}/records/${dong.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({
        diem: diemMoi,
        muc: mucMoi,
        so_van: dong.so_van + 1,
        thang: dong.thang + dem("thang"),
        hoa: dong.hoa + dem("hoa"),
        thua: dong.thua + dem("thua"),
        tro_choi: troChoi, // dòng cũ để trống thì ghi rõ luôn
      }),
    })
    : await fetch(`${pb}/api/collections/${BANG_DIEM}/records`, {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        ten,
        nguoi_choi: nguoi.id,
        tro_choi: troChoi,
        diem: diemMoi,
        muc: mucMoi,
        so_van: 1,
        thang: dem("thang"),
        hoa: dem("hoa"),
        thua: dem("thua"),
      }),
    });
  if (!ghi.ok) return { loi: "khong_cong_duoc_diem" };
  return { diem_cong: ke.thayDoi, tong_diem: diemMoi, muc: mucMoi };
}

// Tính và ghi liền (dùng cho thượng đài, không cần ghi nhật ký giữa hai bước)
export async function capNhatDiem(pb, H, nguoi, ten, troChoi, ketQua, soHoan = 0) {
  const ke = await tinhDiem(pb, H, nguoi, troChoi, ketQua, soHoan);
  if (ke.loi) return ke;
  return ghiDiem(pb, H, nguoi, ten, ketQua, ke);
}
