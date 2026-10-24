// Web Worker chạy máy cờ caro, để trang không đứng hình khi máy nghĩ lâu.
// Nhận { the, tuyChon } và trả về kết quả của tinh (cấu trúc { xep, doSau, nodes }, xem src/lib/chung/may.js).
import { tinh } from "./may.js";

self.onmessage = (e) => {
  const { the, tuyChon } = e.data;
  self.postMessage(tinh(the, tuyChon));
};
