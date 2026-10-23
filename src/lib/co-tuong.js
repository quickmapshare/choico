// Luật cờ tướng và AI minimax (alpha-beta).
// Tên người chơi: tối đa 50 ký tự, gồm chữ cái (kể cả tiếng Việt có dấu), chữ số và khoảng trắng giữa các từ.
export const TEN_TOI_DA = 50;
const MAU_TEN = /^[\p{L}\d]+( [\p{L}\d]+)*$/u;

// Làm sạch khi gõ: bỏ mọi ký tự không phải chữ cái, chữ số hoặc khoảng trắng, gộp khoảng trắng, cắt độ dài.
export function lamSachTen(s) {
  return String(s)
    .replace(/[^\p{L}\d ]/gu, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ +/, "")
    .slice(0, TEN_TOI_DA);
}

export function tenHopLe(s) {
  return s.length > 0 && s.length <= TEN_TOI_DA && MAU_TEN.test(s);
}

// Tên hiện trên bảng xếp hạng: mỗi chữ số thành dấu *, để không lộ số điện thoại hay thông tin khác.
export function tenBangDiem(s) {
  return s.replace(/\d/g, "*");
}

// Tên tạm cho người chơi chưa đặt tên, ghép thêm ngày chơi lần đầu theo giờ Việt Nam (UTC+7).
export function taoTenTam(ngauNhien = Math.random, luc = new Date()) {
  const chu = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let ma = "";
  for (let i = 0; i < 4; i++) ma += chu[Math.floor(ngauNhien() * chu.length)];
  const vn = new Date(luc.getTime() + 7 * 3600 * 1000);
  const so = (n) => String(n).padStart(2, "0");
  const ngay = so(vn.getUTCDate()) + so(vn.getUTCMonth() + 1) + vn.getUTCFullYear();
  return `Kỳ thủ ${ma} ${ngay}`;
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
  return dangBiTan(b, s, v[0], v[1]);
}

// Ô (r, c) có bị quân đối phương của s ăn được không. Dò từ ô đó ra ngoài, không tạo danh sách nước đi.
function dangBiTan(b, s, r, c) {
  const dich = doiBen(s);
  // Tướng và sĩ chỉ đi trong cung của đối phương, tượng không qua sông
  for (const [dr, dc] of DIR4) {
    if (!ngoaiBien(r + dr, c + dc) && b[r + dr][c + dc] === dich + "K" && trongCung(dich, r, c)) return true;
  }
  for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    if (!ngoaiBien(r + dr, c + dc) && b[r + dr][c + dc] === dich + "A" && trongCung(dich, r, c)) return true;
  }
  for (const [dr, dc] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
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
  const vua = timVua(b, s); // vị trí tướng của s trước khi đi, tướng tự đi thì cập nhật theo nước đi
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      if (!b[r][c] || b[r][c][0] !== s) continue;
      for (const [r2, c2] of nuocThuVi(b, r, c)) {
        const m = { tu: [r, c], den: [r2, c2] };
        const an = thucHien(b, m);
        const kp = b[r2][c2] === s + "K" ? [r2, c2] : vua;
        const hop = kp !== null && !dangBiTan(b, s, kp[0], kp[1]) && !vuaDoiMat(b);
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

// Đọc ký hiệu thành nước đi { tu, den }, không kiểm tra luật. Ký hiệu sai dạng thì trả về null.
export function nuocTuKy(ky) {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(ky)) return null;
  return { tu: [Number(ky[1]), CAC_COT.indexOf(ky[0])], den: [Number(ky[3]), CAC_COT.indexOf(ky[2])] };
}

// Tìm nước hợp lệ theo ký hiệu, trả về null nếu không có.
export function timNuoc(b, s, ky) {
  return nuocHopLe(b, s).find((m) => kyHieu(m) === ky) || null;
}

export const NUOC_TOI_DA = 120; // đi quá số nước này (cả hai bên) thì ván hòa
export const DIEM_THEO_KET_QUA = { thang: 3, hoa: 1, thua: -1 };
export const HOAN_TOI_DA = 3; // mỗi ván tối đa số nước hoãn
export const TRU_DIEM_MOI_HOAN = 0.5; // mỗi nước hoãn trừ điểm của ván

// Điểm cộng của một ván: kết quả trừ đi số nước hoãn đã dùng
export function diemCongVan(ketQua, soHoan) {
  return DIEM_THEO_KET_QUA[ketQua] - TRU_DIEM_MOI_HOAN * soHoan;
}

// Chạy lại cả ván từ thế cờ mở đầu để kiểm tra. Đỏ (người chơi) đi trước, các nước xen kẽ.
// Trả về { hop_le, ket_qua } với ket_qua là "thang" hoặc "thua" (theo người chơi là đỏ) hoặc "hoa".
export function xacMinhVan(danhSach) {
  const b = khoiTao();
  let s = "r";
  for (let i = 0; i < danhSach.length; i++) {
    if (i >= NUOC_TOI_DA) return { hop_le: false };
    const m = timNuoc(b, s, danhSach[i]);
    if (!m) return { hop_le: false };
    apDung(b, m);
    s = doiBen(s);
  }
  // s là bên sẽ đi tiếp: nếu bên đó hết nước thì ván đã kết thúc
  if (nuocHopLe(b, s).length === 0) return { hop_le: true, ket_qua: s === "b" ? "thang" : "thua" };
  if (danhSach.length >= NUOC_TOI_DA) return { hop_le: true, ket_qua: "hoa" };
  return { hop_le: false }; // ván chưa kết thúc thì không tính điểm
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
// Tín hiệu hết giờ: ném ra khi tìm kiếm quá thời gian cho phép
const HET_GIO = Symbol("het_gio");

// het: mốc thời gian (ms) phải dừng. Không truyền thì tìm đến hết độ sâu.
function negamax(b, s, doSau, alpha, beta, het) {
  if (het && Date.now() > het) throw HET_GIO;
  if (doSau === 0) return danhGia(b, s);
  const nuoc = nuocHopLe(b, s);
  if (nuoc.length === 0) return MAT; // hết nước đi là thua (kể cả hết nước không bị chiếu)
  // Thử nước ăn quân trước để cắt tỉa nhiều hơn
  nuoc.sort((x, y) => (y.an ? GIA_TRI[y.an[1]] : 0) - (x.an ? GIA_TRI[x.an[1]] : 0));
  let tot = -Infinity;
  for (const m of nuoc) {
    const an = thucHien(b, m);
    let v;
    try {
      v = -negamax(b, doiBen(s), doSau - 1, -beta, -alpha, het);
    } finally {
      hoanTac(b, m, an); // luôn hoàn tác, kể cả khi hết giờ giữa chừng
    }
    if (v > tot) tot = v;
    if (tot > alpha) alpha = tot;
    if (alpha >= beta) break;
  }
  return tot;
}

// Xếp hạng tất cả nước đi của s theo điểm, cao nhất trước.
export function xepHangNuoc(b, s, doSau, het) {
  const nuoc = nuocHopLe(b, s);
  const ket = nuoc.map((m) => {
    const an = thucHien(b, m);
    let diem;
    try {
      diem = -negamax(b, doiBen(s), doSau - 1, -Infinity, Infinity, het);
    } finally {
      hoanTac(b, m, an);
    }
    return { m, nuoc: kyHieu(m), diem };
  });
  return ket.sort((x, y) => y.diem - x.diem);
}

// Chọn ngẫu nhiên trong các nước bằng điểm cao nhất, để ván không lặp lại.
export function chonTrongDinh(xep) {
  if (xep.length === 0) return null;
  const dinh = xep[0].diem;
  const bang = xep.filter((x) => x.diem === dinh);
  return bang[Math.floor(Math.random() * bang.length)];
}

// Chọn nước tốt nhất với độ sâu cố định.
export function nuocTot(b, s, doSau) {
  return chonTrongDinh(xepHangNuoc(b, s, doSau));
}

// Tìm sâu dần (độ sâu 1, 2, ...) đến doSauToiDa, dừng khi hết thoiGianMs.
// Trả về bảng xếp hạng của độ sâu hoàn thành cuối cùng. thoiGianMs = 0 nghĩa là không giới hạn thời gian.
export function xepHangTheoThoiGian(b, s, { doSauToiDa, thoiGianMs }) {
  if (!thoiGianMs) return { xep: xepHangNuoc(b, s, doSauToiDa), doSau: doSauToiDa };
  const het = Date.now() + thoiGianMs;
  let xep = null;
  let doSau = 0;
  for (let d = 1; d <= doSauToiDa; d++) {
    try {
      xep = xepHangNuoc(b, s, d, het);
      doSau = d;
    } catch (e) {
      if (e === HET_GIO) break;
      throw e;
    }
  }
  if (!xep) xep = xepHangNuoc(b, s, 1); // độ sâu 1 luôn kịp
  return { xep, doSau };
}

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
