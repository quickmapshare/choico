// Luật cờ vua: sinh nước, kiểm tra chiếu, ký hiệu nước đi, các luật hòa. Hàm thuần, dùng chung cho trình duyệt,
// Pages Function và test. Bộ luật theo giao diện chung ở ./index.js; máy đánh ở ./may.js.
//
// Bàn 8 x 8: hàng 0 là hàng 8 (phía đen, trên), hàng 7 là hàng 1 (phía trắng, dưới); cột 0..7 là a..h.
// Quân là chuỗi 2 ký tự: bên ("r" trắng, đi trước; "b" đen) + loại ("K" vua, "Q" hậu, "R" xe, "B" tượng, "N" mã, "P" tốt).
// Bên "r" là trắng để dùng chung mã bên với cờ tướng (bên đi trước).
// Ký hiệu nước đi kiểu UCI: ô đi rồi ô đến, thêm loại quân phong cấp nếu có, ví dụ "e2e4", "e7e8q", nhập thành "e1g1".
//
// Thế cờ: { b, s, nhap, qua, n50, dem }
//   nhap: quyền nhập thành còn lại, chuỗi con của "KQkq" (K, Q: trắng cánh vua, cánh hậu; k, q: đen)
//   qua: ô có thể bắt tốt qua đường ([hàng, cột]) ngay sau một nước tốt đi hai ô, không thì null
//   n50: số nước (của cả hai bên) kể từ lần ăn quân hoặc đi tốt gần nhất, cho luật 50 nước
//   dem: số lần mỗi thế cờ đã xuất hiện (khóa của khoaThe), cho luật lặp thế 3 lần
// Nước: { tu, den, an, phong?, nhap?, qua?, oAn? }: phong là loại quân phong cấp, nhap là "K"/"Q" khi nhập thành,
// qua = true khi bắt tốt qua đường (oAn là ô của tốt bị bắt).

const CAC_COT = "abcdefgh";
export const MAU_KY = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
export const NUOC_TOI_DA = 300; // đi quá số nước này (cả hai bên) thì ván hòa
export const PHONG = ["Q", "R", "B", "N"]; // các loại quân tốt được phong, quân mạnh trước

export const doiBen = (s) => (s === "r" ? "b" : "r");
const ngoai = (r, c) => r < 0 || r > 7 || c < 0 || c > 7;
const MA = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const VUA = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const THANG = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const CHEO = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const HANG_DAU = { r: 7, b: 0 }; // hàng quân lớn của mỗi bên
const TIEN = { r: -1, b: 1 }; // hướng tốt đi
const ten = (r, c) => CAC_COT[c] + (8 - r);

export function banDau() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const hang = ["R", "N", "B", "Q", "K", "B", "N", "R"];
  hang.forEach((t, c) => {
    b[0][c] = "b" + t;
    b[7][c] = "r" + t;
    b[1][c] = "bP";
    b[6][c] = "rP";
  });
  return b;
}

// Ô (r, c) có bị quân bên s tấn công không (dò từ ô đó ra ngoài)
export function biTan(b, r, c, s) {
  // Tốt của s tấn công chéo về phía trước của nó, tức là đứng phía sau ô này theo hướng đi của s
  const hr = r - TIEN[s];
  for (const dc of [-1, 1]) if (!ngoai(hr, c + dc) && b[hr][c + dc] === s + "P") return true;
  for (const [dr, dc] of MA) if (!ngoai(r + dr, c + dc) && b[r + dr][c + dc] === s + "N") return true;
  for (const [dr, dc] of VUA) if (!ngoai(r + dr, c + dc) && b[r + dr][c + dc] === s + "K") return true;
  const tia = (huong, loai) => {
    for (const [dr, dc] of huong) {
      let nr = r + dr;
      let nc = c + dc;
      while (!ngoai(nr, nc)) {
        const p = b[nr][nc];
        if (p) {
          if (p[0] === s && (p[1] === loai || p[1] === "Q")) return true;
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
    return false;
  };
  return tia(THANG, "R") || tia(CHEO, "B");
}

export function timVua(b, s) {
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (b[r][c] === s + "K") return [r, c];
  return null;
}

// Bên s có đang bị chiếu không (không còn vua cũng coi là bị chiếu)
export function biChieu(b, s) {
  const v = timVua(b, s);
  return !v || biTan(b, v[0], v[1], doiBen(s));
}

// Các nước giả hợp lệ (chưa kiểm vua bị chiếu) của quân ở ô (r, c), thêm vào out. Nhập thành đã kiểm đủ điều kiện.
function nuocTuO(the, r, c, out) {
  const { b } = the;
  const p = b[r][c];
  if (!p) return out;
  const s = p[0];
  const dich = doiBen(s);
  const them = (nr, nc, them2 = {}) => out.push({ tu: [r, c], den: [nr, nc], an: b[nr][nc], ...them2 });
  switch (p[1]) {
    case "P": {
      const d = TIEN[s];
      const cuoi = s === "r" ? 0 : 7;
      // Tới hàng cuối thì sinh đủ bốn nước phong cấp
      const di = (nr, nc, them2 = {}) => {
        if (nr === cuoi) for (const ph of PHONG) them(nr, nc, { ...them2, phong: ph });
        else them(nr, nc, them2);
      };
      if (!ngoai(r + d, c) && !b[r + d][c]) {
        di(r + d, c);
        if (r === HANG_DAU[s] + d && !b[r + 2 * d][c]) them(r + 2 * d, c);
      }
      for (const dc of [-1, 1]) {
        const nr = r + d;
        const nc = c + dc;
        if (ngoai(nr, nc)) continue;
        if (b[nr][nc] && b[nr][nc][0] === dich) di(nr, nc);
        else if (the.qua && the.qua[0] === nr && the.qua[1] === nc) {
          out.push({ tu: [r, c], den: [nr, nc], an: b[r][nc], qua: true, oAn: [r, nc] });
        }
      }
      break;
    }
    case "N":
      for (const [dr, dc] of MA) {
        const nr = r + dr;
        const nc = c + dc;
        if (!ngoai(nr, nc) && b[nr][nc]?.[0] !== s) them(nr, nc);
      }
      break;
    case "K": {
      for (const [dr, dc] of VUA) {
        const nr = r + dr;
        const nc = c + dc;
        if (!ngoai(nr, nc) && b[nr][nc]?.[0] !== s) them(nr, nc);
      }
      // Nhập thành: vua và xe chưa đi (còn quyền), ô giữa trống, vua không đang bị chiếu và không đi qua ô bị tấn công
      const h = HANG_DAU[s];
      if (r !== h || c !== 4) break;
      const quyen = s === "r" ? ["K", "Q"] : ["k", "q"];
      if (the.nhap.includes(quyen[0]) && b[h][7] === s + "R" && !b[h][5] && !b[h][6]
        && !biTan(b, h, 4, dich) && !biTan(b, h, 5, dich) && !biTan(b, h, 6, dich)) {
        them(h, 6, { nhap: "K" });
      }
      if (the.nhap.includes(quyen[1]) && b[h][0] === s + "R" && !b[h][1] && !b[h][2] && !b[h][3]
        && !biTan(b, h, 4, dich) && !biTan(b, h, 3, dich) && !biTan(b, h, 2, dich)) {
        them(h, 2, { nhap: "Q" });
      }
      break;
    }
    default: {
      const huong = p[1] === "R" ? THANG : p[1] === "B" ? CHEO : [...THANG, ...CHEO];
      for (const [dr, dc] of huong) {
        let nr = r + dr;
        let nc = c + dc;
        while (!ngoai(nr, nc)) {
          if (b[nr][nc]) {
            if (b[nr][nc][0] !== s) them(nr, nc);
            break;
          }
          them(nr, nc);
          nr += dr;
          nc += dc;
        }
      }
    }
  }
  return out;
}

// Đặt nước m lên bàn b (chỉ bàn, không đổi quyền nhập thành, lượt...). Trả về hàm hoàn tác.
function datLenBan(b, m) {
  const [r, c] = m.tu;
  const [r2, c2] = m.den;
  const p = b[r][c];
  const cuDen = b[r2][c2];
  b[r2][c2] = m.phong ? p[0] + m.phong : p;
  b[r][c] = null;
  let hoan = () => {
    b[r][c] = p;
    b[r2][c2] = cuDen;
  };
  if (m.qua) {
    const [ra, ca] = m.oAn;
    const tot = b[ra][ca];
    b[ra][ca] = null;
    const h1 = hoan;
    hoan = () => {
      h1();
      b[ra][ca] = tot;
    };
  } else if (m.nhap) {
    // Xe nhảy qua vua: cánh vua từ cột h sang f, cánh hậu từ cột a sang d
    const [cx, cx2] = m.nhap === "K" ? [7, 5] : [0, 3];
    b[r][cx2] = b[r][cx];
    b[r][cx] = null;
    const h1 = hoan;
    hoan = () => {
      h1();
      b[r][cx] = b[r][cx2];
      b[r][cx2] = null;
    };
  }
  return hoan;
}

// Nước giả hợp lệ m của bên s có để vua mình bị chiếu không
function anToan(b, s, m) {
  const hoan = datLenBan(b, m);
  const ok = !biChieu(b, s);
  hoan();
  return ok;
}

export function nuocHopLe(the) {
  const out = [];
  const s = the.s;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (the.b[r][c]?.[0] !== s) continue;
      for (const m of nuocTuO(the, r, c, [])) if (anToan(the.b, s, m)) out.push(m);
    }
  }
  return out;
}

export function kyHieu(m) {
  return ten(...m.tu) + ten(...m.den) + (m.phong ? m.phong.toLowerCase() : "");
}

// Đọc ký hiệu thành { tu, den, phong? }, không kiểm luật. Sai dạng thì null.
export function docKy(ky) {
  if (!MAU_KY.test(ky)) return null;
  const o = (i) => [8 - Number(ky[i + 1]), CAC_COT.indexOf(ky[i])];
  return { tu: o(0), den: o(2), phong: ky[4] ? ky[4].toUpperCase() : undefined };
}

// Nước hợp lệ của bên đến lượt theo ký hiệu, null nếu không có. Chỉ sinh nước của quân ở ô đi.
export function timNuoc(the, ky) {
  const k = docKy(ky);
  if (!k || the.b[k.tu[0]][k.tu[1]]?.[0] !== the.s) return null;
  const m = nuocTuO(the, k.tu[0], k.tu[1], []).find((x) => x.den[0] === k.den[0] && x.den[1] === k.den[1] && x.phong === k.phong);
  return m && anToan(the.b, the.s, m) ? m : null;
}

// Ô bắt tốt qua đường chỉ tính vào thế cờ khi thật sự có tốt bắt được (luật lặp thế coi hai thế như nhau nếu không bắt được)
function quaCoNghia(the) {
  if (!the.qua) return false;
  const [r, c] = the.qua;
  const hr = r - TIEN[the.s];
  return [-1, 1].some((dc) => !ngoai(hr, c + dc) && the.b[hr][c + dc] === the.s + "P");
}

// Khóa của thế cờ cho luật lặp thế: vị trí quân, bên đến lượt, quyền nhập thành, ô bắt qua đường (nếu bắt được)
export function khoaThe(the) {
  const ban = the.b.map((h) => h.map((p) => p || "..").join("")).join("/");
  return `${ban} ${the.s} ${the.nhap || "-"} ${quaCoNghia(the) ? ten(...the.qua) : "-"}`;
}

export function khoiTao() {
  const the = { b: banDau(), s: "r", nhap: "KQkq", qua: null, n50: 0, dem: {} };
  the.dem[khoaThe(the)] = 1;
  return the;
}

export function saoChep(the) {
  return { ...the, b: the.b.map((h) => h.slice()), qua: the.qua && [...the.qua], dem: { ...the.dem } };
}

// Đi nước m (đã hợp lệ) rồi đổi lượt, cập nhật quyền nhập thành, ô qua đường, đếm luật 50 nước và đếm lặp thế
export function apDung(the, m) {
  const { b } = the;
  const p = b[m.tu[0]][m.tu[1]];
  datLenBan(b, m);
  // Vua đi thì mất cả hai quyền; xe rời góc hoặc bị ăn ở góc thì mất quyền bên đó
  let nhap = the.nhap;
  const bo = (k) => (nhap = nhap.replace(k, ""));
  if (p[1] === "K") (p[0] === "r" ? ["K", "Q"] : ["k", "q"]).forEach(bo);
  for (const [r, c] of [m.tu, m.den]) {
    if (r === 7 && c === 7) bo("K");
    if (r === 7 && c === 0) bo("Q");
    if (r === 0 && c === 7) bo("k");
    if (r === 0 && c === 0) bo("q");
  }
  the.nhap = nhap;
  the.qua = p[1] === "P" && Math.abs(m.den[0] - m.tu[0]) === 2 ? [(m.tu[0] + m.den[0]) / 2, m.tu[1]] : null;
  the.n50 = p[1] === "P" || m.an ? 0 : the.n50 + 1;
  the.s = doiBen(the.s);
  const k = khoaThe(the);
  the.dem[k] = (the.dem[k] || 0) + 1;
}

// Đi theo ký hiệu mà không kiểm luật (nước đã được kiểm khi ghi). Ký hiệu hỏng hoặc ô đi không có quân của bên đến lượt
// thì null. Nhập thành, bắt qua đường suy ra từ quân và ô đi.
export function apKy(the, ky) {
  const k = docKy(ky);
  if (!k) return null;
  const p = the.b[k.tu[0]][k.tu[1]];
  if (p?.[0] !== the.s) return null;
  const m = { tu: k.tu, den: k.den, an: the.b[k.den[0]][k.den[1]] };
  if (k.phong) m.phong = k.phong;
  const dc = k.den[1] - k.tu[1];
  if (p[1] === "K" && Math.abs(dc) === 2) m.nhap = dc > 0 ? "K" : "Q";
  if (p[1] === "P" && dc !== 0 && !m.an) {
    m.qua = true;
    m.oAn = [k.tu[0], k.den[1]];
    m.an = the.b[k.tu[0]][k.den[1]];
  }
  apDung(the, m);
  return m;
}

// Không bên nào còn đủ quân để chiếu hết: chỉ còn vua, vua và một tượng hoặc một mã, hoặc chỉ còn các tượng cùng màu ô
export function thieuQuan(b) {
  const nho = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = b[r][c];
      if (!p || p[1] === "K") continue;
      if (p[1] !== "B" && p[1] !== "N") return false;
      nho.push({ t: p[1], mau: (r + c) % 2 });
    }
  }
  if (nho.length <= 1) return true;
  return nho.every((x) => x.t === "B" && x.mau === nho[0].mau);
}

// Hòa không cần sinh nước: lặp thế 3 lần, 50 nước không ăn quân và không đi tốt, không đủ quân, đủ số nước tối đa
export function ketThucNhanh(the, soNuoc) {
  if ((the.dem[khoaThe(the)] || 0) >= 3) return { ket_qua: "hoa", ly_do: "lap_3" };
  if (the.n50 >= 100) return { ket_qua: "hoa", ly_do: "luat_50" };
  if (thieuQuan(the.b)) return { ket_qua: "hoa", ly_do: "thieu_quan" };
  if (soNuoc >= NUOC_TOI_DA) return { ket_qua: "hoa", ly_do: "het_nuoc_hoa" };
  return null;
}

// Ván kết thúc chưa: hết nước đi mà bị chiếu thì thua (chiếu hết), không bị chiếu thì hòa (pat); rồi các luật hòa khác
export function ketThuc(the, soNuoc) {
  if (nuocHopLe(the).length === 0) {
    if (biChieu(the.b, the.s)) return { ket_qua: the.s === "b" ? "do" : "den", ly_do: "chieu_het" };
    return { ket_qua: "hoa", ly_do: "hoa_pat" };
  }
  return ketThucNhanh(the, soNuoc);
}

// Quân đã bị ăn của mỗi bên, suy ra từ số quân còn trên bàn. Quân có nhiều hơn lúc đầu là do phong cấp: trừ vào số tốt.
const SO_BAN_DAU = { Q: 1, R: 2, B: 2, N: 2, P: 8 };
export const THU_TU_QUAN = ["Q", "R", "B", "N", "P"];
export function quanBiAn(b) {
  const ket = { r: [], b: [] };
  for (const s of ["r", "b"]) {
    const dem = { Q: 0, R: 0, B: 0, N: 0, P: 0 };
    for (const h of b) for (const p of h) if (p && p[0] === s && p[1] !== "K") dem[p[1]]++;
    let phongThem = 0;
    for (const t of ["Q", "R", "B", "N"]) phongThem += Math.max(0, dem[t] - SO_BAN_DAU[t]);
    for (const t of THU_TU_QUAN) {
      const thieu = t === "P" ? SO_BAN_DAU.P - dem.P - phongThem : SO_BAN_DAU[t] - dem[t];
      for (let i = 0; i < thieu; i++) ket[s].push(t);
    }
  }
  return ket;
}

// Đếm số nút của cây nước đi đến độ sâu d (perft), để kiểm thử bộ sinh nước với số liệu chuẩn
export function perft(the, d) {
  if (d === 0) return 1;
  let n = 0;
  for (const m of nuocHopLe(the)) {
    const sau = saoChep(the);
    apDung(sau, m);
    n += d === 1 ? 1 : perft(sau, d - 1);
  }
  return n;
}

// Dựng thế cờ từ chuỗi FEN (dùng cho test)
export function tuFen(fen) {
  const [viTri, ben, nhap, qua, n50] = fen.trim().split(/\s+/);
  const b = viTri.split("/").map((hang) => {
    const out = [];
    for (const ch of hang) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else out.push((ch === ch.toUpperCase() ? "r" : "b") + ch.toUpperCase());
    }
    return out;
  });
  const the = {
    b, s: ben === "w" ? "r" : "b", nhap: nhap === "-" ? "" : nhap,
    qua: qua && qua !== "-" ? [8 - Number(qua[1]), CAC_COT.indexOf(qua[0])] : null, n50: Number(n50) || 0, dem: {},
  };
  the.dem[khoaThe(the)] = 1;
  return the;
}
