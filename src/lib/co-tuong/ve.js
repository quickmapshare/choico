// Bộ vẽ bàn cờ tướng cho src/lib/chung/ban.js: kích thước, toạ độ, nền bàn (đường kẻ, cung, sông) và quân.
// Quân đặt trên giao điểm đường kẻ, nên ô được đánh dấu bằng vòng tròn (oVuong = false).
import { svgEl } from "../chung/svg.js";

export const KC = 50; // khoảng cách hai đường kẻ, theo hệ toạ độ SVG
export const LE = 30; // lề quanh bàn
export const RONG = LE * 2 + 8 * KC;
export const CAO = LE * 2 + 9 * KC;
export const TEN = { K: "帥", A: "仕", E: "相", H: "傌", R: "俥", C: "炮", P: "兵" }; // quân đỏ
export const TEN_DEN = { K: "將", A: "士", E: "象", H: "馬", R: "車", C: "砲", P: "卒" }; // quân đen

// Toạ độ SVG của ô (hàng r, cột c). xoay = true khi cầm quân đen: bàn lật 180 độ để quân đen nằm phía dưới.
export function taoToa(xoay = false) {
  return {
    x: (c) => LE + (xoay ? 8 - c : c) * KC,
    y: (r) => LE + (xoay ? 9 - r : r) * KC,
  };
}

// Chữ của quân p (ví dụ "bR") trên khay quân bị ăn
export const kyTu = (p) => (p[0] === "r" ? TEN : TEN_DEN)[p[1]];

// Vẽ một quân trong nhóm .co-quan để có thể làm hoạt ảnh riêng
export function veQuan(cha, p, x, y) {
  const mau = p[0] === "r" ? "#b3261e" : "#1f1f1f";
  const q = svgEl("g", { class: "co-quan" }, cha);
  svgEl("circle", { cx: x, cy: y, r: 20, fill: "#fbf6e6", stroke: mau, "stroke-width": 2 }, q);
  svgEl("text", { x, y: y + 8, "text-anchor": "middle", "font-size": 24, "font-weight": "bold", fill: mau }, q).textContent = kyTu(p);
  return q;
}

// Đường kẻ bàn, cung tướng và sông (sóng nước). Các hàng và cột dùng toa để vẽ đúng cả khi bàn xoay.
export function veNen(s, toa) {
  const net = { stroke: "#7a4b1e", "stroke-width": 1.5, fill: "none" };
  svgEl("rect", { x: 0, y: 0, width: RONG, height: CAO, rx: 10, fill: "#f1dca8" }, s);
  // Đường ngang: cả 10 hàng chạy suốt bàn
  for (let r = 0; r < 10; r++) svgEl("line", { ...net, x1: toa.x(0), y1: toa.y(r), x2: toa.x(8), y2: toa.y(r) }, s);
  // Đường dọc: cột ngoài cùng chạy suốt, các cột giữa bị ngắt ở sông
  for (let c = 0; c < 9; c++) {
    if (c === 0 || c === 8) {
      svgEl("line", { ...net, x1: toa.x(c), y1: toa.y(0), x2: toa.x(c), y2: toa.y(9) }, s);
    } else {
      svgEl("line", { ...net, x1: toa.x(c), y1: toa.y(0), x2: toa.x(c), y2: toa.y(4) }, s);
      svgEl("line", { ...net, x1: toa.x(c), y1: toa.y(5), x2: toa.x(c), y2: toa.y(9) }, s);
    }
  }
  // Hai đường chéo trong mỗi cung tướng
  for (const r0 of [0, 7]) {
    svgEl("line", { ...net, x1: toa.x(3), y1: toa.y(r0), x2: toa.x(5), y2: toa.y(r0 + 2) }, s);
    svgEl("line", { ...net, x1: toa.x(5), y1: toa.y(r0), x2: toa.x(3), y2: toa.y(r0 + 2) }, s);
  }
  // Sông: hai đường sóng nước giữa hàng 4 và hàng 5. Hai đầu sóng cách mép bàn bằng nhau,
  // và chia đúng số đoạn để sóng đối xứng qua tâm bàn
  const xTrai = Math.min(toa.x(0), toa.x(8)) + 6;
  const xPhai = Math.max(toa.x(0), toa.x(8)) - 6;
  const nSong = 32;
  const rongSong = (xPhai - xTrai) / nSong;
  for (const dy of [-10, 10]) {
    let d = `M${xTrai} ${toa.y(4.5) + dy} q${rongSong / 2} -5 ${rongSong} 0`;
    for (let i = 1; i < nSong; i++) d += ` t${rongSong} 0`;
    svgEl("path", { d, fill: "none", stroke: "#2f6f9f", "stroke-width": 2, "stroke-linecap": "round" }, s);
  }
}

export default { RONG, CAO, KC, oVuong: false, taoToa, kyTu, veQuan, veNen };
