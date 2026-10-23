// Năm mức chơi của máy, dùng chung cho trận với máy (components/CoTuong.astro) và máy trên sảnh thượng đài (functions/_lib/may-dai.js).
// doSauToiDa: giới hạn độ sâu tìm kiếm. haiku: số nước đầu để Haiku chọn (0 = không dùng).
// tt: bảng băm vị trí, q: tìm kiếm tĩnh, giaHan: tìm sâu thêm khi bị chiếu, cat: null-move và LMR (xem co-tuong-may.js).
// Mức 1 đến 3 giữ cách tìm cũ (chỉ nhanh hơn).
// Thời gian nghĩ tối đa của máy là số mức tính theo giây: mức n nghĩ tối đa n giây (xem thoiGianNghi).
// Mức 5 không giới hạn độ sâu, tìm sâu dần đến hết giờ. Chỉ mức 5 bật cat, vì cắt tỉa chỉ có lợi khi được
// tìm sâu hơn, mức 4 bị giới hạn độ sâu 4 nên cắt tỉa chỉ làm nó yếu đi.
// ld: điểm độ linh hoạt của xe, mã, pháo. Tìm chậm đi khoảng 1/3 nhưng vẫn mạnh hơn khi cùng thời gian
// (đấu thử 200 ván, 100 ms mỗi nước: thắng 55, thua 33, hòa 112).
export const MUC = {
  1: { doSauToiDa: 1, haiku: 0 },
  2: { doSauToiDa: 2, haiku: 0 },
  3: { doSauToiDa: 3, haiku: 0 },
  4: { doSauToiDa: 4, tt: true, q: true, giaHan: true, ld: true, haiku: 0 },
  5: { doSauToiDa: 30, tt: true, q: true, giaHan: true, cat: true, ld: true, haiku: 0 },
};
export const MUC_TOI_DA = 5;

export const thoiGianNghi = (muc) => muc * 1000; // ms
