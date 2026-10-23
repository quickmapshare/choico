// Điểm và mức chơi, dùng chung cho mọi loại cờ (trình duyệt và Pages Function).
// Mỗi loại cờ có bảng điểm và mức riêng (cột tro_choi trong cho_phien_co_diem), nhưng cùng một cách tính.
export const DIEM_THEO_KET_QUA = { thang: 3, hoa: 1, thua: -1 };
export const HOAN_TOI_DA = 3; // mỗi ván đấu máy tối đa số nước hoãn
export const TRU_DIEM_MOI_HOAN = 0.5; // mỗi nước hoãn trừ điểm của ván

// Năm mức chơi: thắng lên một mức, thua xuống một mức, hòa giữ nguyên
export const MUC_TOI_DA = 5;
export const mucHopLe = (m) => Number.isInteger(m) && m >= 1 && m <= MUC_TOI_DA;
export function mucSauVan(muc, ketQua) {
  const doi = ketQua === "thang" ? 1 : ketQua === "thua" ? -1 : 0;
  return Math.min(MUC_TOI_DA, Math.max(1, (muc || 1) + doi));
}

// Thời gian nghĩ tối đa của máy: mức n nghĩ tối đa n giây
export const thoiGianNghi = (muc) => muc * 1000; // ms

// Điểm cộng của một ván: kết quả trừ đi số nước hoãn đã dùng
export function diemCongVan(ketQua, soHoan) {
  return DIEM_THEO_KET_QUA[ketQua] - TRU_DIEM_MOI_HOAN * soHoan;
}
