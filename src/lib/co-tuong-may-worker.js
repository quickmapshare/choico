// Web Worker chạy máy tìm nước, để trang cờ tướng không đứng hình khi máy nghĩ lâu.
// Nhận { ban, ben, tuyChon } và trả về kết quả của timNuocMay (cùng cấu trúc { xep, doSau, nodes }).
import { timNuocMay } from "./co-tuong-may.js";

self.onmessage = (e) => {
  const { ban, ben, tuyChon } = e.data;
  self.postMessage(timNuocMay(ban, ben, tuyChon));
};
