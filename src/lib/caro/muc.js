// Năm mức chơi của máy cờ caro, dùng chung cho trận với máy và máy trên sảnh thượng đài.
// Thời gian nghĩ theo mức và số mức tối đa: xem src/lib/chung/diem.js (thoiGianNghi, MUC_TOI_DA).
// doSauToiDa: độ sâu tìm tối đa (số nước xét trước, cả hai bên). rong: số ô ứng viên giữ lại ở các nút không phải
// gốc trong may.js, mức cao giữ nhiều ô hơn nên xét được nhiều hướng tấn công/phòng thủ, nhưng chậm hơn.
export const MUC = {
  1: { doSauToiDa: 1, rong: 8 },
  2: { doSauToiDa: 2, rong: 10 },
  3: { doSauToiDa: 4, rong: 12 },
  4: { doSauToiDa: 6, rong: 14 },
  5: { doSauToiDa: 10, rong: 16 },
};
