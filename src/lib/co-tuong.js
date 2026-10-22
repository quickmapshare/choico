// Luật cờ tướng và AI minimax (alpha-beta).
// Tên người chơi: tối đa 20 ký tự, chỉ gồm chữ cái (kể cả tiếng Việt có dấu) và khoảng trắng giữa các từ.
export const TEN_TOI_DA = 20;
const MAU_TEN = /^\p{L}+( \p{L}+)*$/u;

// Làm sạch khi gõ: bỏ mọi ký tự không phải chữ cái hoặc khoảng trắng, gộp khoảng trắng, cắt độ dài.
export function lamSachTen(s) {
  return String(s)
    .replace(/[^\p{L} ]/gu, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ +/, "")
    .slice(0, TEN_TOI_DA);
}

export function tenHopLe(s) {
  return s.length > 0 && s.length <= TEN_TOI_DA && MAU_TEN.test(s);
}

// Bàn 10 hàng x 9 cột. Hàng 0 là phía đen (trên), hàng 9 là phía đỏ (dưới). Đỏ đi trước.
// Quân là chuỗi 2 ký tự: bên ("r" đỏ, "b" đen) + loại ("K" tướng, "A" sĩ, "E" tượng, "H" mã, "R" xe, "C" pháo, "P" tốt).
// Ký hiệu nước đi: cột a-i rồi hàng 0-9, ví dụ "h2e2" là từ cột h hàng 2 sang cột e hàng 2.

const CAC_COT = "abcdefghi";
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NHAY_MA = [
  [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1],
];
// Giá trị quân để đánh giá (tướng rất lớn để không bao giờ đổi).
const GIA_TRI = { K: 10000, A: 200, E: 200, H: 400, R: 900, C: 450, P: 100 };
const THUONG_SONG = 100; // tốt đã qua sông thêm điểm

const doiBen = (s) => (s === "r" ? "b" : "r");
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
      for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if (coThe(r + dr, c + dc) && trongCung(s, r + dr, c + dc)) out.push([r + dr, c + dc]);
      }
      break;
    case "E":
      for (const [dr, dc] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
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

function timVua(b, s) {
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
  const dich = doiBen(s);
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (b[r][c] && b[r][c][0] === dich) {
        if (nuocThuVi(b, r, c).some(([a, z]) => a === v[0] && z === v[1])) return true;
      }
    }
  }
  return false;
}

// Thực hiện nước đi tạm thời, trả về quân bị ăn để hoàn tác.
function thucHien(b, m) {
  const [r, c] = m.tu;
  const [r2, c2] = m.den;
  const an = b[r2][c2];
  b[r2][c2] = b[r][c];
  b[r][c] = null;
  return an;
}

function hoanTac(b, m, an) {
  const [r, c] = m.tu;
  const [r2, c2] = m.den;
  b[r][c] = b[r2][c2];
  b[r2][c2] = an;
}

// Các nước đi hợp lệ của bên s (không để tướng mình bị chiếu, không đối mặt tướng).
export function nuocHopLe(b, s) {
  const out = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (!b[r][c] || b[r][c][0] !== s) continue;
      for (const [r2, c2] of nuocThuVi(b, r, c)) {
        const m = { tu: [r, c], den: [r2, c2] };
        const an = thucHien(b, m);
        const hop = !biChieu(b, s) && !vuaDoiMat(b);
        hoanTac(b, m, an);
        if (hop) out.push({ ...m, an });
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

// Tìm nước hợp lệ theo ký hiệu, trả về null nếu không có.
export function timNuoc(b, s, ky) {
  return nuocHopLe(b, s).find((m) => kyHieu(m) === ky) || null;
}

// Điểm của bàn theo góc nhìn bên s: dương là s hơn.
export function danhGia(b, s) {
  let diem = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = b[r][c];
      if (!p) continue;
      let v = GIA_TRI[p[1]];
      if (p[1] === "P" && (p[0] === "r" ? r <= 4 : r >= 5)) v += THUONG_SONG;
      diem += p[0] === s ? v : -v;
    }
  }
  return diem;
}

const MAT = -100000;

// Negamax với cắt tỉa alpha-beta. Điểm luôn nhìn từ bên đang đi.
function negamax(b, s, doSau, alpha, beta) {
  if (doSau === 0) return danhGia(b, s);
  const nuoc = nuocHopLe(b, s);
  if (nuoc.length === 0) return MAT; // hết nước đi là thua (kể cả hết nước không bị chiếu)
  // Thử nước ăn quân trước để cắt tỉa nhiều hơn
  nuoc.sort((x, y) => (y.an ? GIA_TRI[y.an[1]] : 0) - (x.an ? GIA_TRI[x.an[1]] : 0));
  let tot = -Infinity;
  for (const m of nuoc) {
    const an = thucHien(b, m);
    const v = -negamax(b, doiBen(s), doSau - 1, -beta, -alpha);
    hoanTac(b, m, an);
    if (v > tot) tot = v;
    if (tot > alpha) alpha = tot;
    if (alpha >= beta) break;
  }
  return tot;
}

// Xếp hạng tất cả nước đi của s theo điểm, cao nhất trước.
export function xepHangNuoc(b, s, doSau) {
  const nuoc = nuocHopLe(b, s);
  const ket = nuoc.map((m) => {
    const an = thucHien(b, m);
    const diem = -negamax(b, doiBen(s), doSau - 1, -Infinity, Infinity);
    hoanTac(b, m, an);
    return { m, nuoc: kyHieu(m), diem };
  });
  return ket.sort((x, y) => y.diem - x.diem);
}

// Chọn nước tốt nhất; các nước bằng điểm nhau được chọn ngẫu nhiên để ván không lặp lại.
export function nuocTot(b, s, doSau) {
  const xep = xepHangNuoc(b, s, doSau);
  if (xep.length === 0) return null;
  const dinh = xep[0].diem;
  const bang = xep.filter((x) => x.diem === dinh);
  return bang[Math.floor(Math.random() * bang.length)];
}

// Bàn dạng chữ để gửi cho AI: mỗi hàng là 9 ô, ".." là ô trống.
export function banVanBan(b) {
  return b
    .map((hang, r) => `${r}: ` + hang.map((p) => p || "..").join(" "))
    .join("\n");
}
