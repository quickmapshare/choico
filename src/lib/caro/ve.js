// Bộ vẽ bàn cờ caro cho src/lib/chung/ban.js: kích thước, toạ độ, nền bàn (lưới 15x15) và quân.
// Quân đặt trên giao điểm đường kẻ như cờ tướng, nên ô được đánh dấu bằng vòng tròn (oVuong = false).
// Quân chỉ có hai màu ("r" đi trước, "b" đi sau), không có "loại" nên vẽ bằng quân tròn đặc, không chữ.
import { svgEl } from "../chung/svg.js";

export const KC = 30; // khoảng cách hai đường kẻ, theo hệ toạ độ SVG
export const LE = 22; // lề quanh bàn, chứa chữ cột và số hàng
const SO_O = 15; // 15 đường kẻ mỗi chiều (14 ô x 14 ô)
export const RONG = LE * 2 + (SO_O - 1) * KC;
export const CAO = RONG;
const COT_CHU = "abcdefghijklmno";
const MAU = { r: "#b3261e", b: "#1f1f1f" };

// Toạ độ SVG của giao điểm (hàng r, cột c). xoay = true: bàn lật 180 độ để quân đi sau nằm phía dưới.
export function taoToa(xoay = false) {
  const max = SO_O - 1;
  return {
    x: (c) => LE + (xoay ? max - c : c) * KC,
    y: (r) => LE + (xoay ? max - r : r) * KC,
  };
}

// Caro không có khay quân bị ăn nên kyTu chỉ dùng phòng khi cần tới (không có loại quân, trả về quân tròn đơn giản)
export const kyTu = (p) => (p[0] === "r" ? "●" : "○");

export function veQuan(cha, p, x, y) {
  const mau = MAU[p[0]];
  const q = svgEl("g", { class: "co-quan" }, cha);
  svgEl("circle", { cx: x, cy: y, r: KC * 0.4, fill: mau, stroke: "#00000030", "stroke-width": 1 }, q);
  return q;
}

// Lưới 15x15 đường kẻ, chữ cột a-o dưới bàn và số hàng 1-15 bên trái (đúng cả khi bàn xoay)
export function veNen(s, toa) {
  const net = { stroke: "#7a4b1e", "stroke-width": 1, fill: "none" };
  svgEl("rect", { x: 0, y: 0, width: RONG, height: CAO, rx: 10, fill: "#f1dca8" }, s);
  for (let i = 0; i < SO_O; i++) {
    svgEl("line", { ...net, x1: toa.x(0), y1: toa.y(i), x2: toa.x(SO_O - 1), y2: toa.y(i) }, s);
    svgEl("line", { ...net, x1: toa.x(i), y1: toa.y(0), x2: toa.x(i), y2: toa.y(SO_O - 1) }, s);
  }
  // Điểm giữa bàn, như bàn cờ vây, chỉ để trang trí
  svgEl("circle", { cx: toa.x(7), cy: toa.y(7), r: 2.5, fill: "#7a4b1e" }, s);
  const chu = { "text-anchor": "middle", "font-size": 11, "font-weight": 600, fill: "#7a4b1e", "pointer-events": "none" };
  for (let c = 0; c < SO_O; c++) svgEl("text", { ...chu, x: toa.x(c), y: CAO - LE / 2 + 5 }, s).textContent = COT_CHU[c];
  for (let r = 0; r < SO_O; r++) svgEl("text", { ...chu, x: LE / 2, y: toa.y(r) + 4 }, s).textContent = String(SO_O - r);
}

export default { RONG, CAO, KC, oVuong: false, taoToa, kyTu, veQuan, veNen };
