// Bộ vẽ bàn cờ vua cho src/lib/chung/ban.js: kích thước, toạ độ, nền bàn (ô sáng tối, chữ cột và số hàng) và quân.
// Quân nằm trong ô vuông, nên ô được đánh dấu bằng cả ô (oVuong = true).
// Quân vẽ bằng ký tự quân cờ Unicode (bản tô đặc cho cả hai bên, quân trắng tô trắng viền đen); ︎ bắt trình duyệt
// hiện dạng chữ, không đổi thành hình emoji (iPhone đổi quân tốt thành emoji nếu thiếu).
import { svgEl } from "../chung/svg.js";

export const KC = 50; // cạnh một ô, theo hệ toạ độ SVG
export const LE = 22; // lề quanh bàn, chứa chữ cột và số hàng
export const RONG = LE * 2 + 8 * KC;
export const CAO = RONG;
const KY_TU = { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" };
const PHONG_CHU = '"Segoe UI Symbol", "Noto Sans Symbols 2", "Apple Symbols", "DejaVu Sans", sans-serif';
const O_SANG = "#f0d9b5";
const O_TOI = "#b58863";

// Tâm ô (hàng r, cột c). xoay = true khi cầm quân đen: bàn lật 180 độ để quân đen nằm phía dưới.
export function taoToa(xoay = false) {
  return {
    x: (c) => LE + KC / 2 + (xoay ? 7 - c : c) * KC,
    y: (r) => LE + KC / 2 + (xoay ? 7 - r : r) * KC,
  };
}

// Ký tự của quân p (ví dụ "bQ") trên khay quân bị ăn và ô chọn quân phong cấp
export const kyTu = (p) => KY_TU[p[1]] + "︎";

export function veQuan(cha, p, x, y) {
  const trang = p[0] === "r";
  const q = svgEl("g", { class: "co-quan" }, cha);
  svgEl("text", {
    x, y: y + 15, "text-anchor": "middle", "font-size": 42, "font-family": PHONG_CHU,
    fill: trang ? "#ffffff" : "#1f1f1f", stroke: trang ? "#1f1f1f" : "#f6f0e4", "stroke-width": trang ? 1.6 : 0.6,
    "paint-order": "stroke", "stroke-linejoin": "round",
  }, q).textContent = kyTu(p);
  return q;
}

// Khung bàn, 64 ô sáng tối (ô a1 luôn tối), chữ cột a-h dưới bàn và số hàng 1-8 bên trái (đúng cả khi bàn xoay)
export function veNen(s, toa) {
  svgEl("rect", { x: 0, y: 0, width: RONG, height: CAO, rx: 10, fill: "#6f4a2a" }, s);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      svgEl("rect", { x: toa.x(c) - KC / 2, y: toa.y(r) - KC / 2, width: KC, height: KC, fill: (r + c) % 2 ? O_TOI : O_SANG }, s);
    }
  }
  const chu = { "text-anchor": "middle", "font-size": 13, "font-weight": 600, fill: "#f3e3c3", "pointer-events": "none" };
  for (let c = 0; c < 8; c++) svgEl("text", { ...chu, x: toa.x(c), y: CAO - LE / 2 + 5 }, s).textContent = "abcdefgh"[c];
  for (let r = 0; r < 8; r++) svgEl("text", { ...chu, x: LE / 2, y: toa.y(r) + 5 }, s).textContent = String(8 - r);
}

export default { RONG, CAO, KC, oVuong: true, taoToa, kyTu, veQuan, veNen };
