// Phần dùng chung của máy đánh cờ, không phụ thuộc trình duyệt.
// Mọi máy (src/lib/<loại cờ>/may.js) trả về { xep, doSau, nodes }; xep là các nước sắp theo điểm giảm dần,
// mỗi phần tử { nuoc: ký hiệu, diem }. Các nước bằng điểm với nước đầu bảng đều có điểm chính xác.

// Chọn ngẫu nhiên trong các nước bằng điểm cao nhất, để ván không lặp lại.
export function chonTrongDinh(xep) {
  if (xep.length === 0) return null;
  const dinh = xep[0].diem;
  const bang = xep.filter((x) => x.diem === dinh);
  return bang[Math.floor(Math.random() * bang.length)];
}
