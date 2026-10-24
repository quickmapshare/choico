// Bộ vẽ bàn cờ caro cho src/lib/chung/ban.js: kích thước, toạ độ, nền bàn và quân.
// Tái hiện trang giấy ô li: giấy trắng ngà, kẻ ô xanh nhạt, lề đỏ bên trái; quân đánh vào giữa ô (oVuong = true)
// như đánh trên vở: bên đi trước tích dấu X đỏ, bên đi sau khoanh chữ O xanh, nét bút hơi nghiêng cho giống viết tay.
import { svgEl } from "../chung/svg.js";

export const KC = 30; // cạnh một ô, theo hệ toạ độ SVG
export const LE = 22; // lề quanh bàn, chứa chữ cột và số hàng
const SO_O = 15; // 15 x 15 ô
export const RONG = LE * 2 + SO_O * KC;
export const CAO = RONG;
const COT_CHU = "abcdefghijklmno";
const MAU = { r: "#d32f2f", b: "#1565c0" };
const GIAY = "#fdfbf3";
const KE = "#a9cbe8"; // đường kẻ ô
const KE_MO = "#dceaf6"; // đường kẻ li mờ giữa ô
const LE_DO = "#e57373";

// Tâm ô (hàng r, cột c). xoay = true: bàn lật 180 độ để quân đi sau nằm phía dưới.
export function taoToa(xoay = false) {
  const max = SO_O - 1;
  return {
    x: (c) => LE + KC / 2 + (xoay ? max - c : c) * KC,
    y: (r) => LE + KC / 2 + (xoay ? max - r : r) * KC,
  };
}

// Caro không có khay quân bị ăn nên kyTu chỉ dùng phòng khi cần tới
export const kyTu = (p) => (p[0] === "r" ? "X" : "O");

export function veQuan(cha, p, x, y) {
  const q = svgEl("g", { class: "co-quan" }, cha);
  const but = { fill: "none", stroke: MAU[p[0]], "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" };
  const n = KC * 0.3;
  if (p[0] === "r") {
    // Hai nét chéo hơi cong, đầu nét lệch nhau một chút
    svgEl("path", { ...but, d: `M${x - n} ${y - n + 1} Q${x + 1} ${y - 1} ${x + n} ${y + n}` }, q);
    svgEl("path", { ...but, d: `M${x + n - 1} ${y - n} Q${x - 1} ${y + 1} ${x - n + 1} ${y + n - 1}` }, q);
  } else {
    // Vòng O hơi dẹt, nghiêng, không khép kín hẳn
    svgEl("path", {
      ...but,
      d: `M${x + 2} ${y - n} C${x + n + 3} ${y - n} ${x + n + 1} ${y + n} ${x} ${y + n} ` +
        `C${x - n - 2} ${y + n} ${x - n - 1} ${y - n + 1} ${x + 3} ${y - n - 1}`,
      transform: `rotate(-12 ${x} ${y})`,
    }, q);
  }
  return q;
}

// Trang giấy ô li: kẻ li mờ giữa mỗi ô, kẻ ô đậm hơn, lề đỏ bên trái; chữ cột a-o dưới bàn và số hàng 1-15 bên trái
// (đúng cả khi bàn xoay)
export function veNen(s, toa) {
  svgEl("rect", { x: 0, y: 0, width: RONG, height: CAO, rx: 10, fill: GIAY, stroke: "#e6e0cf", "stroke-width": 1 }, s);
  const dau = LE;
  const cuoi = LE + SO_O * KC;
  for (let i = 0; i < SO_O; i++) {
    const g = LE + i * KC + KC / 2;
    svgEl("line", { stroke: KE_MO, "stroke-width": 0.7, x1: dau, y1: g, x2: cuoi, y2: g }, s);
    svgEl("line", { stroke: KE_MO, "stroke-width": 0.7, x1: g, y1: dau, x2: g, y2: cuoi }, s);
  }
  for (let i = 0; i <= SO_O; i++) {
    const g = LE + i * KC;
    svgEl("line", { stroke: KE, "stroke-width": 1, x1: dau, y1: g, x2: cuoi, y2: g }, s);
    svgEl("line", { stroke: KE, "stroke-width": 1, x1: g, y1: dau, x2: g, y2: cuoi }, s);
  }
  svgEl("line", { stroke: LE_DO, "stroke-width": 1.4, x1: LE - 4, y1: 4, x2: LE - 4, y2: CAO - 4 }, s);
  const chu = { "text-anchor": "middle", "font-size": 11, "font-weight": 600, fill: "#7d8fa3", "pointer-events": "none" };
  for (let c = 0; c < SO_O; c++) svgEl("text", { ...chu, x: toa.x(c), y: CAO - LE / 2 + 5 }, s).textContent = COT_CHU[c];
  for (let r = 0; r < SO_O; r++) svgEl("text", { ...chu, x: LE / 2 - 2, y: toa.y(r) + 4 }, s).textContent = String(SO_O - r);
}

export default { RONG, CAO, KC, oVuong: true, taoToa, kyTu, veQuan, veNen };
