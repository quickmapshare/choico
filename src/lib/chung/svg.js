// Tạo phần tử SVG, dùng chung cho khung bàn cờ và bộ vẽ của từng loại cờ.
const SVG_NS = "http://www.w3.org/2000/svg";

// Tạo phần tử SVG kèm thuộc tính; thuộc tính có giá trị undefined thì bỏ qua
export function svgEl(tag, attrs, cha) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) e.setAttribute(k, String(v));
  if (cha) cha.appendChild(e);
  return e;
}
