// Luật cờ caro (ca rô, ô ăn quan 5 quân liên tục): sinh nước, ký hiệu nước đi, luật thắng/hòa. Hàm thuần, dùng chung
// cho trình duyệt, Pages Function và test. Bộ luật theo giao diện chung ở ./index.js; máy đánh ở ./may.js.
//
// Bàn 15 x 15 tự do (không luật cấm cho bên nào). Mỗi ô chỉ là "r" (đi trước) hoặc "b" (đi sau) hoặc null, không có
// "loại" quân như cờ tướng/cờ vua. Mỗi nước chỉ đặt một quân vào ô trống, không ăn quân, nên tu và den luôn là một ô.
// Ký hiệu nước đi là toạ độ ô: cột a-o rồi hàng 1-15, ví dụ "h8".
const HANG = 15;
const COT = 15;
const COT_CHU = "abcdefghijklmno";
export const MAU_KY = /^[a-o](1[0-5]|[1-9])$/;
export const NUOC_TOI_DA = HANG * COT; // hết ô trống thì hòa

export const doiBen = (s) => (s === "r" ? "b" : "r");
const ten = (r, c) => COT_CHU[c] + (HANG - r);

export function khoiTao() {
  return { b: Array.from({ length: HANG }, () => Array(COT).fill(null)), s: "r" };
}

export function saoChep(the) {
  return { b: the.b.map((h) => h.slice()), s: the.s };
}

export function nuocHopLe(the) {
  const out = [];
  for (let r = 0; r < HANG; r++) {
    for (let c = 0; c < COT; c++) {
      if (!the.b[r][c]) out.push({ tu: [r, c], den: [r, c], an: null });
    }
  }
  return out;
}

export function kyHieu(m) {
  return ten(...m.den);
}

// Đọc ký hiệu thành ô [r, c], không kiểm luật. Sai dạng thì null.
export function docKy(ky) {
  if (!MAU_KY.test(ky)) return null;
  const m = /^([a-o])(\d+)$/.exec(ky);
  return [HANG - Number(m[2]), COT_CHU.indexOf(m[1])];
}

// Nước hợp lệ của bên đến lượt theo ký hiệu (đặt quân vào ô trống), null nếu không có
export function timNuoc(the, ky) {
  const o = docKy(ky);
  if (!o || the.b[o[0]][o[1]]) return null;
  return { tu: o, den: o, an: null };
}

// Đặt quân của bên đến lượt rồi đổi lượt
export function apDung(the, m) {
  the.b[m.den[0]][m.den[1]] = the.s;
  the.s = doiBen(the.s);
}

// Đi theo ký hiệu mà không kiểm luật đầy đủ (nước đã được kiểm khi ghi). Ô đã có quân hoặc ký hiệu hỏng thì null.
export function apKy(the, ky) {
  const o = docKy(ky);
  if (!o || the.b[o[0]][o[1]]) return null;
  const m = { tu: o, den: o, an: null };
  apDung(the, m);
  return m;
}

const HUONG = [[0, 1], [1, 0], [1, 1], [1, -1]];

// Bên đang có 5 quân liên tục (ngang/dọc/chéo) trên bàn, null nếu chưa ai thắng. Quét cả bàn (225 ô x 4 hướng),
// không cần biết nước vừa đi nên dùng được cả lúc kiểm nhanh.
export function benThang(b) {
  for (let r = 0; r < HANG; r++) {
    for (let c = 0; c < COT; c++) {
      const s = b[r][c];
      if (!s) continue;
      for (const [dr, dc] of HUONG) {
        const pr = r - dr;
        const pc = c - dc;
        // Không phải đầu dãy theo hướng này (có quân cùng bên ngay trước) thì bỏ, tránh đếm trùng
        if (pr >= 0 && pr < HANG && pc >= 0 && pc < COT && b[pr][pc] === s) continue;
        let n = 0;
        let rr = r;
        let cc = c;
        while (rr >= 0 && rr < HANG && cc >= 0 && cc < COT && b[rr][cc] === s) {
          n++;
          rr += dr;
          cc += dc;
        }
        if (n >= 5) return s;
      }
    }
  }
  return null;
}

// Kết thúc không cần sinh nước: có bên đủ 5 quân liên tục, hoặc hết ô trống thì hòa
export function ketThucNhanh(the, soNuoc) {
  const s = benThang(the.b);
  if (s) return { ket_qua: s === "r" ? "do" : "den", ly_do: "thang_5" };
  if (soNuoc >= NUOC_TOI_DA) return { ket_qua: "hoa", ly_do: "het_nuoc_hoa" };
  return null;
}

// Không có luật "hết nước đi" riêng (hết ô trống đã là hòa ở ketThucNhanh)
export const ketThuc = ketThucNhanh;
