// Năm mức chơi của máy cờ tướng, dùng chung cho trận với máy và máy trên sảnh thượng đài.
// Thời gian nghĩ theo mức và số mức tối đa: xem src/lib/chung/diem.js (thoiGianNghi, MUC_TOI_DA).
// doSauToiDa: giới hạn độ sâu tìm kiếm. haiku: số nước đầu để Haiku chọn (0 = không dùng).
// tt: bảng băm vị trí, q: tìm kiếm tĩnh, giaHan: tìm sâu thêm khi bị chiếu, cat: null-move và LMR (xem may.js).
// Mức 1 đến 3 giữ cách tìm cũ (chỉ nhanh hơn).
// Mức 5 không giới hạn độ sâu, tìm sâu dần đến hết giờ. Chỉ mức 5 bật cat, vì cắt tỉa chỉ có lợi khi được
// tìm sâu hơn, mức 4 bị giới hạn độ sâu 4 nên cắt tỉa chỉ làm nó yếu đi.
// ld: điểm độ linh hoạt của xe, mã, pháo. Tìm chậm đi khoảng 1/3 nhưng vẫn mạnh hơn khi cùng thời gian
// (đấu thử 200 ván, 100 ms mỗi nước: thắng 55, thua 33, hòa 112).
// pst: điểm theo vị trí quân, bật ở mọi mức: máy đánh đều hơn (đấu thử thắng 145-6, hòa 49 trên 200 ván).
export const MUC = {
  1: { doSauToiDa: 1, pst: true, haiku: 0 },
  2: { doSauToiDa: 2, pst: true, haiku: 0 },
  3: { doSauToiDa: 3, pst: true, haiku: 0 },
  4: { doSauToiDa: 4, pst: true, tt: true, q: true, giaHan: true, ld: true, haiku: 0 },
  5: { doSauToiDa: 30, pst: true, tt: true, q: true, giaHan: true, cat: true, ld: true, haiku: 0 },
};
