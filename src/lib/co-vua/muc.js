// Năm mức chơi của máy cờ vua, dùng chung cho trận với máy và máy trên sảnh thượng đài.
// Thời gian nghĩ theo mức và số mức tối đa: xem src/lib/chung/diem.js (thoiGianNghi, MUC_TOI_DA).
// Tùy chọn giống máy cờ tướng (xem may.js): doSauToiDa giới hạn độ sâu, q tìm kiếm tĩnh (xét hết chuỗi ăn quân ở lá, không
// bỏ sót quân bị treo), tt bảng băm vị trí, giaHan tìm sâu thêm khi bị chiếu, cat null-move và LMR. pst: điểm vị trí quân.
// Mức 1 và 2 không có tìm kiếm tĩnh nên hay bỏ quân, hợp với người mới; từ mức 3 máy không còn để mất quân vô cớ.
export const MUC = {
  1: { doSauToiDa: 1, pst: true },
  2: { doSauToiDa: 2, pst: true },
  3: { doSauToiDa: 3, pst: true, q: true },
  4: { doSauToiDa: 4, pst: true, q: true, tt: true, giaHan: true },
  5: { doSauToiDa: 30, pst: true, q: true, tt: true, giaHan: true, cat: true },
};
