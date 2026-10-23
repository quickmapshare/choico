// Luật cờ tướng: sinh nước, kiểm tra chiếu, ký hiệu nước đi. Hàm thuần, dùng chung cho trình duyệt, Pages Function và test.
// Bộ luật theo giao diện chung cho mọi loại cờ nằm ở ./index.js; máy đánh nhanh ở ./may.js.

// Bàn 10 hàng x 9 cột. Hàng 0 là phía đen (trên), hàng 9 là phía đỏ (dưới). Đỏ đi trước.
// Quân là chuỗi 2 ký tự: bên ("r" đỏ, "b" đen) + loại ("K" tướng, "A" sĩ, "E" tượng, "H" mã, "R" xe, "C" pháo, "P" tốt).
// Ký hiệu nước đi: cột a-i rồi hàng 0-9, ví dụ "h2e2" là từ cột h hàng 2 sang cột e hàng 2.

const CAC_COT = "abcdefghi";
export const MAU_KY = /^[a-i][0-9][a-i][0-9]$/;
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CHEO = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const CHEO2 = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
export const NHAY_MA = [
  [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1],
];

export const doiBen = (s) => (s === "r" ? "b" : "r");
const ngoaiBien = (r, c) => r < 0 || r > 9 || c < 0 || c > 8;

// Cung tướng: cột 3-5, đỏ ở hàng 7-9, đen ở hàng 0-2.
function trongCung(s, r, c) {
  if (c < 3 || c > 5) return false;
  return s === "r" ? r >= 7 : r <= 2;
}

// Nửa bàn của bên s (tượng không được qua, tốt chưa qua sông thì không có đi ngang).
function trongLanhTho(s, r) {
  return s === "r" ? r >= 5 : r <= 4;
}

export function khoiTao() {
  const b = Array.from({ length: 10 }, () => Array(9).fill(null));
  const hangDau = ["R", "H", "E", "A", "K", "A", "E", "H", "R"];
  hangDau.forEach((t, c) => {
    b[0][c] = "b" + t;
    b[9][c] = "r" + t;
  });
  b[2][1] = "bC"; b[2][7] = "bC";
  b[7][1] = "rC"; b[7][7] = "rC";
  for (const c of [0, 2, 4, 6, 8]) {
    b[3][c] = "bP";
    b[6][c] = "rP";
  }
  return b;
}

// Tất cả ô quân tại (r, c) có thể đi tới, chưa kiểm tra có để tướng bị chiếu không.
export function nuocThuVi(b, r, c) {
  const p = b[r][c];
  if (!p) return [];
  const s = p[0];
  const t = p[1];
  const out = [];
  const coThe = (nr, nc) => !ngoaiBien(nr, nc) && (!b[nr][nc] || b[nr][nc][0] !== s);
  const truot = (dr, dc) => {
    let nr = r + dr;
    let nc = c + dc;
    while (!ngoaiBien(nr, nc)) {
      if (b[nr][nc]) {
        if (b[nr][nc][0] !== s) out.push([nr, nc]);
        break;
      }
      out.push([nr, nc]);
      nr += dr;
      nc += dc;
    }
  };

  switch (t) {
    case "K":
      for (const [dr, dc] of DIR4) if (coThe(r + dr, c + dc) && trongCung(s, r + dr, c + dc)) out.push([r + dr, c + dc]);
      break;
    case "A":
      for (const [dr, dc] of CHEO) if (coThe(r + dr, c + dc) && trongCung(s, r + dr, c + dc)) out.push([r + dr, c + dc]);
      break;
    case "E":
      for (const [dr, dc] of CHEO2) {
        const nr = r + dr;
        const nc = c + dc;
        if (!coThe(nr, nc) || !trongLanhTho(s, nr)) continue;
        if (b[r + dr / 2][c + dc / 2]) continue; // mắt tượng bị chặn
        out.push([nr, nc]);
      }
      break;
    case "H":
      for (const [dr, dc, lr, lc] of NHAY_MA) {
        const chanR = r + lr;
        const chanC = c + lc;
        if (ngoaiBien(chanR, chanC) || b[chanR][chanC]) continue; // chân mã bị chặn
        if (coThe(r + dr, c + dc)) out.push([r + dr, c + dc]);
      }
      break;
    case "R":
      for (const [dr, dc] of DIR4) truot(dr, dc);
      break;
    case "C":
      for (const [dr, dc] of DIR4) {
        let nr = r + dr;
        let nc = c + dc;
        while (!ngoaiBien(nr, nc) && !b[nr][nc]) {
          out.push([nr, nc]);
          nr += dr;
          nc += dc;
        }
        if (ngoaiBien(nr, nc)) continue;
        // Gặp quân ngòi, nhảy qua và ăn quân địch đầu tiên gặp
        nr += dr;
        nc += dc;
        while (!ngoaiBien(nr, nc)) {
          if (b[nr][nc]) {
            if (b[nr][nc][0] !== s) out.push([nr, nc]);
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    case "P": {
      const tien = s === "r" ? -1 : 1;
      if (coThe(r + tien, c)) out.push([r + tien, c]);
      if (!trongLanhTho(s, r)) {
        for (const dc of [-1, 1]) if (coThe(r, c + dc)) out.push([r, c + dc]);
      }
      break;
    }
  }
  return out;
}

export function timVua(b, s) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) if (b[r][c] === s + "K") return [r, c];
  }
  return null;
}

// Hai tướng đối mặt nhau trên cùng một cột, không có quân nào ở giữa.
export function vuaDoiMat(b) {
  const d = timVua(b, "r");
  const e = timVua(b, "b");
  if (!d || !e || d[1] !== e[1]) return false;
  const [, c] = d;
  const lo = Math.min(d[0], e[0]) + 1;
  const hi = Math.max(d[0], e[0]);
  for (let r = lo; r < hi; r++) if (b[r][c]) return false;
  return true;
}

// Bên s có đang bị chiếu không (tướng bị ăn cũng coi là bị chiếu).
export function biChieu(b, s) {
  const v = timVua(b, s);
  if (!v) return true;
  return dangBiTan(b, s, v[0], v[1]);
}

// Ô (r, c) có bị quân đối phương của s ăn được không. Dò từ ô đó ra ngoài, không tạo danh sách nước đi.
function dangBiTan(b, s, r, c) {
  const dich = doiBen(s);
  // Tướng và sĩ chỉ đi trong cung của đối phương, tượng không qua sông
  for (const [dr, dc] of DIR4) {
    if (!ngoaiBien(r + dr, c + dc) && b[r + dr][c + dc] === dich + "K" && trongCung(dich, r, c)) return true;
  }
  for (const [dr, dc] of CHEO) {
    if (!ngoaiBien(r + dr, c + dc) && b[r + dr][c + dc] === dich + "A" && trongCung(dich, r, c)) return true;
  }
  for (const [dr, dc] of CHEO2) {
    const hr = r - dr;
    const hc = c - dc;
    if (ngoaiBien(hr, hc) || b[hr][hc] !== dich + "E" || !trongLanhTho(dich, r)) continue;
    if (!b[r - dr / 2][c - dc / 2]) return true; // mắt tượng không bị chặn
  }
  // Xe và pháo: dò 4 hướng, quân đầu tiên gặp là xe (hoặc ngòi của pháo), quân thứ hai là pháo
  for (const [dr, dc] of DIR4) {
    let nr = r + dr;
    let nc = c + dc;
    let coNgoi = false;
    while (!ngoaiBien(nr, nc)) {
      const p = b[nr][nc];
      if (p) {
        if (p[0] === dich) {
          if (!coNgoi && p[1] === "R") return true;
          if (coNgoi && p[1] === "C") return true;
        }
        if (coNgoi) break;
        coNgoi = true;
      }
      nr += dr;
      nc += dc;
    }
  }
  // Mã: đi từ ô đích về phía mã, chân mã không được bị chặn
  for (const [dr, dc, lr, lc] of NHAY_MA) {
    const hr = r - dr;
    const hc = c - dc;
    if (ngoaiBien(hr, hc) || b[hr][hc] !== dich + "H") continue;
    if (ngoaiBien(hr + lr, hc + lc) || b[hr + lr][hc + lc]) continue; // chân mã bị chặn
    return true;
  }
  // Tốt: tốt thẳng phía trước, và tốt ngang nếu đã qua sông
  const tien = dich === "r" ? -1 : 1;
  if (!ngoaiBien(r - tien, c) && b[r - tien][c] === dich + "P") return true;
  for (const dc of [-1, 1]) {
    if (!ngoaiBien(r, c + dc) && b[r][c + dc] === dich + "P" && !trongLanhTho(dich, r)) return true;
  }
  return false;
}

// Thực hiện nước đi tạm thời, trả về quân bị ăn để hoàn tác.
export function thucHien(b, m) {
  const [r, c] = m.tu;
  const [r2, c2] = m.den;
  const an = b[r2][c2];
  b[r2][c2] = b[r][c];
  b[r][c] = null;
  return an;
}

export function hoanTac(b, m, an) {
  const [r, c] = m.tu;
  const [r2, c2] = m.den;
  b[r][c] = b[r2][c2];
  b[r2][c2] = an;
}

// Nước m của bên s có để tướng mình bị chiếu hoặc hai tướng đối mặt không. vua: vị trí tướng của s trước khi đi.
function anToan(b, s, m, vua) {
  const an = thucHien(b, m);
  const kp = b[m.den[0]][m.den[1]] === s + "K" ? m.den : vua;
  const hop = kp !== null && !dangBiTan(b, s, kp[0], kp[1]) && !vuaDoiMat(b);
  hoanTac(b, m, an);
  return hop ? { ...m, an } : null;
}

// Các nước đi hợp lệ của bên s (không để tướng mình bị chiếu, không đối mặt tướng).
export function nuocHopLe(b, s) {
  const out = [];
  const vua = timVua(b, s); // vị trí tướng của s trước khi đi, tướng tự đi thì cập nhật theo nước đi
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (!b[r][c] || b[r][c][0] !== s) continue;
      for (const den of nuocThuVi(b, r, c)) {
        const m = anToan(b, s, { tu: [r, c], den }, vua);
        if (m) out.push(m);
      }
    }
  }
  return out;
}

// Áp dụng nước đi lên bàn (không hoàn tác).
export function apDung(b, m) {
  thucHien(b, m);
}

export function kyHieu(m) {
  return CAC_COT[m.tu[1]] + m.tu[0] + CAC_COT[m.den[1]] + m.den[0];
}

// Đọc ký hiệu thành nước đi { tu, den }, không kiểm tra luật. Ký hiệu sai dạng thì trả về null.
export function nuocTuKy(ky) {
  if (!MAU_KY.test(ky)) return null;
  return { tu: [Number(ky[1]), CAC_COT.indexOf(ky[0])], den: [Number(ky[3]), CAC_COT.indexOf(ky[2])] };
}

// Tìm nước hợp lệ của bên s theo ký hiệu, trả về null nếu không có. Chỉ sinh nước của quân ở ô xuất phát,
// không sinh cả bàn, nên dựng lại ván dài vẫn nhanh.
export function timNuoc(b, s, ky) {
  const m = nuocTuKy(ky);
  if (!m || b[m.tu[0]][m.tu[1]]?.[0] !== s) return null;
  if (!nuocThuVi(b, m.tu[0], m.tu[1]).some(([r, c]) => r === m.den[0] && c === m.den[1])) return null;
  return anToan(b, s, m, timVua(b, s));
}

export const NUOC_TOI_DA = 120; // đi quá số nước này (cả hai bên) thì ván hòa

// Số quân mỗi loại của mỗi bên khi bắt đầu ván
const SO_QUAN_BAN_DAU = { K: 1, A: 2, E: 2, H: 2, R: 2, C: 2, P: 5 };
// Thứ tự quan trọng từ cao xuống thấp, dùng để sắp quân đã bị ăn
export const THU_TU_QUAN = ["K", "R", "C", "H", "E", "A", "P"];

// Quân đã bị ăn của mỗi bên, suy ra từ số quân còn lại trên bàn. ket.r là quân đỏ đã bị ăn, ket.b là quân đen đã bị ăn.
export function quanBiAn(b) {
  const dem = { r: {}, b: {} };
  for (const s of ["r", "b"]) for (const t of THU_TU_QUAN) dem[s][t] = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = b[r][c];
      if (p) dem[p[0]][p[1]]++;
    }
  }
  const ket = { r: [], b: [] };
  for (const s of ["r", "b"]) {
    for (const t of THU_TU_QUAN) {
      const thieu = SO_QUAN_BAN_DAU[t] - dem[s][t];
      for (let i = 0; i < thieu; i++) ket[s].push(t);
    }
  }
  return ket;
}

// Bàn dạng chữ để gửi cho AI: mỗi hàng là 9 ô, ".." là ô trống.
export function banVanBan(b) {
  return b
    .map((hang, r) => `${r}: ` + hang.map((p) => p || "..").join(" "))
    .join("\n");
}
