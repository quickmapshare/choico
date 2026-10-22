// Máy tìm nước cờ tướng tốc độ cao. Chỉ dùng cho AI, luật cờ chính thức vẫn ở co-tuong.js.
// Khác bản cũ: bàn cờ là mảng số, bảng nước đi tính sẵn, bộ đệm nước đi dùng chung (không cấp phát khi tìm),
// điểm, hash và vị trí tướng cập nhật tăng dần khi đi, tìm trên nước giả hợp lệ (bắt tướng = thắng).
// Có tìm sâu dần, bảng băm vị trí (tt), tìm kiếm tĩnh (q) và điểm vị trí quân (pst), mỗi thứ bật tắt riêng.
// Luôn dùng PVS và nhận ra thế lặp, luật hòa 120 nước (khi có lichSu). Null-move và LMR (cat), gia hạn khi bị chiếu
// (giaHan) làm điểm khác minimax đúng nên chỉ bật khi chọn.
import { khoiTao, NUOC_TOI_DA } from "./co-tuong.js";

// Quân = bên * 8 + loại. Bên 0 là đỏ (phía dưới, đi lên), bên 1 là đen. Loại 1..7. Ô = hàng * 9 + cột.
const TK = 1, TA = 2, TE = 3, TH = 4, TR = 5, TC = 6, TP = 7;
const LOAI = "KAEHRCP";
const CAC_COT = "abcdefghi";
const GT = [0, 10000, 200, 200, 400, 900, 450, 100]; // giá trị quân, giống co-tuong.js
const THUONG_SONG = 100; // tốt đã qua sông
const MAT = 100000;
const MAT_NGUONG = MAT - 1000; // điểm có |giá trị| lớn hơn ngưỡng này là điểm chiếu hết
const VO_CUC = 1 << 28;
const HET_GIO = Symbol("het_gio");
const MAXPLY = 80;
const MAXM = 192; // số nước tối đa mỗi tầng
const QD = 6; // độ sâu tối đa của tìm kiếm tĩnh

// ---------- Bảng tính sẵn ----------
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const NHAY_MA = [
  [-2, -1, -1, 0], [-2, 1, -1, 0], [2, -1, 1, 0], [2, 1, 1, 0],
  [-1, -2, 0, -1], [1, -2, 0, -1], [-1, 2, 0, 1], [1, 2, 0, 1],
];
const trongBien = (r, c) => r >= 0 && r < 10 && c >= 0 && c < 9;
const trongCung = (bn, r, c) => c >= 3 && c <= 5 && (bn === 0 ? r >= 7 && r <= 9 : r >= 0 && r <= 2);
const nuaNha = (bn, r) => (bn === 0 ? r >= 5 : r <= 4);

// NS[quân][ô] = [đích, ô chặn (-1 nếu không có), ...] cho tướng, sĩ, tượng, mã, tốt. Xe và pháo dùng tia.
const NS_TMP = Array.from({ length: 16 }, () => Array.from({ length: 90 }, () => []));
const RAYS = Array.from({ length: 90 }, () => [[], [], [], []]);
for (let r = 0; r < 10; r++) {
  for (let c = 0; c < 9; c++) {
    const o = r * 9 + c;
    DIR4.forEach(([dr, dc], d) => {
      let nr = r + dr, nc = c + dc;
      while (trongBien(nr, nc)) { RAYS[o][d].push(nr * 9 + nc); nr += dr; nc += dc; }
    });
    for (let bn = 0; bn < 2; bn++) {
      const them = (n, a, b2) => NS_TMP[(bn << 3) | n][o].push(a, b2);
      if (trongCung(bn, r, c)) {
        for (const [dr, dc] of DIR4) if (trongCung(bn, r + dr, c + dc)) them(TK, (r + dr) * 9 + c + dc, -1);
        for (const [dr, dc] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          if (trongCung(bn, r + dr, c + dc)) them(TA, (r + dr) * 9 + c + dc, -1);
        }
      }
      for (const [dr, dc] of [[2, 2], [2, -2], [-2, 2], [-2, -2]]) {
        const nr = r + dr, nc = c + dc;
        if (trongBien(nr, nc) && nuaNha(bn, r) && nuaNha(bn, nr)) them(TE, nr * 9 + nc, (r + dr / 2) * 9 + c + dc / 2);
      }
      for (const [dr, dc, lr, lc] of NHAY_MA) {
        if (trongBien(r + dr, c + dc) && trongBien(r + lr, c + lc)) them(TH, (r + dr) * 9 + c + dc, (r + lr) * 9 + c + lc);
      }
      const tien = bn === 0 ? -1 : 1;
      if (trongBien(r + tien, c)) them(TP, (r + tien) * 9 + c, -1);
      if (!nuaNha(bn, r)) for (const dc of [-1, 1]) if (trongBien(r, c + dc)) them(TP, r * 9 + c + dc, -1);
    }
  }
}
const NS = NS_TMP.map((a) => a.map((l) => Int8Array.from(l)));

// ATT[bên][ô] = [ô quân, ô chặn, quân, ...]: các quân không trượt của bên đó có thể ăn ô này
const ATT_TMP = [Array.from({ length: 90 }, () => []), Array.from({ length: 90 }, () => [])];
for (let bn = 0; bn < 2; bn++) {
  for (const t of [TK, TA, TE, TH, TP]) {
    const p = (bn << 3) | t;
    for (let o = 0; o < 90; o++) {
      const l = NS[p][o];
      for (let i = 0; i < l.length; i += 2) ATT_TMP[bn][l[i]].push(o, l[i + 1], p);
    }
  }
}
const ATT = ATT_TMP.map((a) => a.map((l) => Int8Array.from(l)));

// Zobrist
let seed = 2463534242;
const rnd32 = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const Z1 = new Int32Array(16 * 90).map(() => rnd32());
const Z2 = new Int32Array(16 * 90).map(() => rnd32());
const ZS1 = rnd32();
const ZS2 = rnd32();

// Bảng điểm quân tại ô, nhìn từ đỏ: quân đỏ dương, quân đen âm
function taoBangDiem(pst) {
  const t = new Int32Array(16 * 90);
  for (let bn = 0; bn < 2; bn++) {
    for (let k = 1; k <= 7; k++) {
      for (let o = 0; o < 90; o++) {
        const r = (o / 9) | 0, c = o % 9;
        let v = GT[k];
        const quaSong = bn === 0 ? r <= 4 : r >= 5;
        if (k === TP && quaSong) v += THUONG_SONG;
        if (pst) {
          const tien = bn === 0 ? 9 - r : r;
          const giua = 4 - Math.abs(c - 4);
          if (k === TH) v += giua * 4 + Math.min(tien, 6) * 3;
          else if (k === TR) v += Math.min(tien, 7) * 3 + giua;
          else if (k === TC) v += giua * 3;
          else if (k === TP && tien >= 5) v += giua * 4 + (tien - 5) * 5;
        }
        t[((bn << 3) | k) * 90 + o] = bn === 0 ? v : -v;
      }
    }
  }
  return t;
}
const DIEM_THUONG = taoBangDiem(false);
const DIEM_PST = taoBangDiem(true);

// ---------- Trạng thái tìm kiếm (module dùng một lần mỗi lệnh gọi, không đệ quy lồng nhau) ----------
const bd = new Int8Array(90);
const kingSq = new Int32Array(2);
const MV = new Int32Array(MAXPLY * MAXM);
const SC = new Int32Array(MAXPLY * MAXM);
const KIL = new Int32Array(MAXPLY * 2);
// Lịch sử: nước yên tĩnh (không ăn quân) nào hay cắt tỉa thì được xếp lên trước ở các nhánh khác
const LICH_SU = new Int32Array(90 * 90); // [từ * 90 + đến]
const LICH_SU_MAX = 8000; // dưới điểm của nước giết (9000) để không vượt lên trên
const TT_BITS = 19;
const TT_MASK = (1 << TT_BITS) - 1;
const ttKey = new Int32Array(1 << TT_BITS);
const ttInfo = new Int32Array(1 << TT_BITS); // 0 = trống; sau đó độ sâu + 1 (8 bit), cờ (2 bit)
const ttSc = new Int32Array(1 << TT_BITS);
const ttMv = new Int32Array(1 << TT_BITS);
let h1 = 0, h2 = 0, ev = 0, nodes = 0, het = 0, bangDiem = DIEM_THUONG, dungQ = false, dungTT = false;
let dungCat = false, dungGiaHan = false, dungDG = false, gioiHanNut = 0; // dg: thêm điểm an toàn tướng
let cauHinhTT = -1; // cách tính điểm (pst, q) của các điểm đang nằm trong bảng băm
// Số quân mỗi loại theo mã quân, cập nhật khi ăn quân
const DEM = new Int32Array(16);
// Hash các thế đã qua: lịch sử ván (chỉ số 0 đến iGoc - 1), thế gốc (iGoc), rồi đường đang tìm (iGoc + ply).
// mocGoc: chỉ số thế ngay sau lần ăn quân gần nhất trong ván, trước đó không thể lặp lại. nuocVan: số nước đã đi.
const DUONG1 = new Int32Array(NUOC_TOI_DA + MAXPLY + 8);
const DUONG2 = new Int32Array(NUOC_TOI_DA + MAXPLY + 8);
let iGoc = 0, mocGoc = 0, nuocVan = 0;

// Nước đi mã hóa: từ | đến << 7 | quân bị ăn << 14
function dat(m) {
  const tu = m & 127, den = (m >> 7) & 127, an = (m >> 14) & 15;
  const p = bd[tu];
  bd[den] = p; bd[tu] = 0;
  const pi = p * 90;
  h1 ^= Z1[pi + tu] ^ Z1[pi + den] ^ ZS1;
  h2 ^= Z2[pi + tu] ^ Z2[pi + den] ^ ZS2;
  ev += bangDiem[pi + den] - bangDiem[pi + tu];
  if (an) { const ai = an * 90 + den; h1 ^= Z1[ai]; h2 ^= Z2[ai]; ev -= bangDiem[ai]; DEM[an]--; }
  if ((p & 7) === TK) kingSq[p >> 3] = den;
}

function hoan(m) {
  const tu = m & 127, den = (m >> 7) & 127, an = (m >> 14) & 15;
  const p = bd[den];
  bd[tu] = p; bd[den] = an;
  const pi = p * 90;
  h1 ^= Z1[pi + tu] ^ Z1[pi + den] ^ ZS1;
  h2 ^= Z2[pi + tu] ^ Z2[pi + den] ^ ZS2;
  ev -= bangDiem[pi + den] - bangDiem[pi + tu];
  if (an) { const ai = an * 90 + den; h1 ^= Z1[ai]; h2 ^= Z2[ai]; ev += bangDiem[ai]; DEM[an]++; }
  if ((p & 7) === TK) kingSq[p >> 3] = tu;
}

// Hai tướng đối mặt, không có quân nào ở giữa
function doiMat() {
  const a = kingSq[0], b = kingSq[1];
  if (a % 9 !== b % 9) return false;
  const lo = (a < b ? a : b) + 9, hi = a < b ? b : a;
  for (let o = lo; o < hi; o += 9) if (bd[o] !== 0) return false;
  return true;
}

// Ô o có bị quân bên bn ăn được không
function damBat(o, bn) {
  const l = ATT[bn][o];
  for (let i = 0; i < l.length; i += 3) {
    if (bd[l[i]] === l[i + 2] && (l[i + 1] < 0 || bd[l[i + 1]] === 0)) return true;
  }
  const xe = (bn << 3) | TR, phao = (bn << 3) | TC;
  const rays = RAYS[o];
  for (let d = 0; d < 4; d++) {
    const ray = rays[d];
    let coNgoi = false;
    for (let i = 0; i < ray.length; i++) {
      const q = bd[ray[i]];
      if (q === 0) continue;
      if (!coNgoi) { if (q === xe) return true; coNgoi = true; } else { if (q === phao) return true; break; }
    }
  }
  return false;
}

// Sinh nước giả hợp lệ của bên bn vào bộ đệm tầng ply. chiAn: chỉ nước ăn quân. Trả về số nước.
function sinh(bn, ply, chiAn) {
  const base = ply * MAXM;
  let n = 0;
  for (let o = 0; o < 90; o++) {
    const p = bd[o];
    if (p === 0 || (p >> 3) !== bn) continue;
    const t = p & 7;
    if (t === TR) {
      const rays = RAYS[o];
      for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        for (let i = 0; i < ray.length; i++) {
          const den = ray[i], q = bd[den];
          if (q === 0) { if (!chiAn) { MV[base + n] = o | (den << 7); SC[base + n] = 0; n++; } }
          else {
            if ((q >> 3) !== bn) { MV[base + n] = o | (den << 7) | (q << 14); SC[base + n] = 10000 + GT[q & 7] * 16 - GT[t]; n++; }
            break;
          }
        }
      }
    } else if (t === TC) {
      const rays = RAYS[o];
      for (let d = 0; d < 4; d++) {
        const ray = rays[d];
        const len = ray.length;
        let i = 0;
        for (; i < len; i++) {
          const den = ray[i];
          if (bd[den] !== 0) break;
          if (!chiAn) { MV[base + n] = o | (den << 7); SC[base + n] = 0; n++; }
        }
        for (i++; i < len; i++) {
          const den = ray[i], q = bd[den];
          if (q !== 0) {
            if ((q >> 3) !== bn) { MV[base + n] = o | (den << 7) | (q << 14); SC[base + n] = 10000 + GT[q & 7] * 16 - GT[t]; n++; }
            break;
          }
        }
      }
    } else {
      const l = NS[p][o];
      for (let i = 0; i < l.length; i += 2) {
        const chan = l[i + 1];
        if (chan >= 0 && bd[chan] !== 0) continue;
        const den = l[i], q = bd[den];
        if (q === 0) { if (!chiAn) { MV[base + n] = o | (den << 7); SC[base + n] = 0; n++; } }
        else if ((q >> 3) !== bn) { MV[base + n] = o | (den << 7) | (q << 14); SC[base + n] = 10000 + GT[q & 7] * 16 - GT[t]; n++; }
      }
    }
  }
  return n;
}

// Đưa nước có điểm sắp xếp cao nhất từ vị trí i trở đi lên vị trí i
function chon(base, n, i) {
  let tot = i;
  let v = SC[base + i];
  for (let j = i + 1; j < n; j++) if (SC[base + j] > v) { v = SC[base + j]; tot = j; }
  if (tot !== i) {
    const m = MV[base + i]; MV[base + i] = MV[base + tot]; MV[base + tot] = m;
    SC[base + tot] = SC[base + i]; SC[base + i] = v;
  }
  return MV[base + i];
}

// An toàn tướng: thiếu sĩ, tượng thì bị phạt, càng nặng khi đối phương còn nhiều xe, mã, pháo. Điểm nhìn từ đỏ.
function anToanTuong() {
  let v = 0;
  for (let bn = 0; bn < 2; bn++) {
    const ta = bn << 3, dich = (bn ^ 1) << 3;
    const thieu = (2 - DEM[ta | TA]) * 25 + (2 - DEM[ta | TE]) * 20;
    const tanCong = 2 * DEM[dich | TR] + DEM[dich | TH] + DEM[dich | TC];
    const phat = (thieu * tanCong) >> 2;
    v += bn === 0 ? -phat : phat;
  }
  return v;
}

const diemBen = (bn) => {
  const v = dungDG ? ev + anToanTuong() : ev;
  return bn === 0 ? v : -v;
};

function kiemGio() {
  if ((++nodes & 2047) === 0 && ((het !== 0 && Date.now() > het) || (gioiHanNut !== 0 && nodes > gioiHanNut))) throw HET_GIO;
}

// Thế đang xét (chỉ số i) đã có trước đó với cùng bên đi, kể từ chỉ số moc. Cần ít nhất 4 nước mới lặp được.
function lapLai(i, moc) {
  for (let j = i - 4; j >= moc; j -= 2) if (DUONG1[j] === h1 && DUONG2[j] === h2) return true;
  return false;
}

// Bên bn còn xe, mã hoặc pháo. Chỉ còn tướng, sĩ, tượng, tốt thì bỏ lượt có thể có lợi, null-move không an toàn.
const conQuanManh = (bn) => DEM[(bn << 3) | TR] + DEM[(bn << 3) | TH] + DEM[(bn << 3) | TC] > 0;

// Lá khi không dùng tìm kiếm tĩnh: nước cuối của đối phương để tướng bị ăn thì tính là thắng
function la(bn, ply) {
  kiemGio();
  if (damBat(kingSq[bn ^ 1], bn)) return MAT - ply;
  return diemBen(bn);
}

function tinhTinh(bn, alpha, beta, ply, qd) {
  kiemGio();
  if (damBat(kingSq[bn ^ 1], bn)) return MAT - ply;
  let tot = diemBen(bn);
  if (tot >= beta || qd <= 0 || ply >= MAXPLY - 2) return tot;
  if (tot > alpha) alpha = tot;
  const base = ply * MAXM;
  const n = sinh(bn, ply, true);
  for (let i = 0; i < n; i++) {
    const m = chon(base, n, i);
    dat(m);
    if (doiMat()) { hoan(m); continue; }
    const v = -tinhTinh(bn ^ 1, -beta, -alpha, ply + 1, qd - 1);
    hoan(m);
    if (v > tot) { tot = v; if (v > alpha) alpha = v; if (alpha >= beta) break; }
  }
  return tot;
}

// moc: chỉ số thế ngay sau lần ăn quân (hoặc bỏ lượt) gần nhất trên đường đi. choNull: được thử bỏ lượt.
function nega(bn, depth, alpha, beta, ply, moc, choNull) {
  const i = iGoc + ply;
  DUONG1[i] = h1; DUONG2[i] = h2;
  // Ván đủ 120 nước hoặc thế lặp lại: hòa, trừ khi nước vừa đi để tướng bị ăn
  if (nuocVan + ply >= NUOC_TOI_DA || (depth > 0 && lapLai(i, moc))) return damBat(kingSq[bn ^ 1], bn) ? MAT - ply : 0;
  let biChieu = false;
  if (dungCat || dungGiaHan) {
    biChieu = damBat(kingSq[bn], bn ^ 1);
    if (biChieu && dungGiaHan && ply < MAXPLY - 10) depth++; // bị chiếu: tìm sâu thêm một lớp
  }
  if (depth <= 0) return dungQ ? tinhTinh(bn, alpha, beta, ply, QD) : la(bn, ply);
  kiemGio();
  if (damBat(kingSq[bn ^ 1], bn)) return MAT - ply;
  if (ply >= MAXPLY - 2) return diemBen(bn);
  let nuocTT = 0, idx = 0;
  if (dungTT) {
    idx = h1 & TT_MASK;
    if (ttInfo[idx] !== 0 && ttKey[idx] === h2) {
      const info = ttInfo[idx];
      nuocTT = ttMv[idx];
      if (((info & 255) - 1) >= depth) {
        let s = ttSc[idx];
        if (s > MAT_NGUONG) s -= ply; else if (s < -MAT_NGUONG) s += ply;
        const co = (info >> 8) & 3;
        if (co === 0) return s;
        if (co === 1 && s >= beta) return s;
        if (co === 2 && s <= alpha) return s;
      }
    }
  }
  // Null-move: bỏ lượt mà đối phương tìm nông vẫn không gỡ được thì nhánh này gần như chắc chắn bị cắt
  if (dungCat && choNull && beta - alpha === 1 && !biChieu && depth >= 3 && conQuanManh(bn) && diemBen(bn) >= beta) {
    const R = depth >= 6 ? 3 : 2;
    h1 ^= ZS1; h2 ^= ZS2;
    const v = -nega(bn ^ 1, depth - 1 - R, -beta, -beta + 1, ply + 1, i + 1, false);
    h1 ^= ZS1; h2 ^= ZS2;
    if (v >= beta) return v > MAT_NGUONG ? beta : v; // không tin điểm chiếu hết có được nhờ bỏ lượt
  }
  const base = ply * MAXM;
  const n = sinh(bn, ply, false);
  const k1 = KIL[ply * 2], k2 = KIL[ply * 2 + 1];
  for (let j = 0; j < n; j++) {
    const m = MV[base + j];
    if (m === nuocTT) SC[base + j] = 2000000;
    else if (m === k1 || m === k2) SC[base + j] = 9000;
    else if (((m >> 14) & 15) === 0) SC[base + j] = LICH_SU[(m & 127) * 90 + ((m >> 7) & 127)];
  }
  const alpha0 = alpha;
  let tot = -VO_CUC, tot_m = 0, hopLe = 0;
  for (let k = 0; k < n; k++) {
    const m = chon(base, n, k);
    dat(m);
    if (doiMat()) { hoan(m); continue; }
    hopLe++;
    const an = (m >> 14) & 15;
    const mocCon = an ? i + 1 : moc;
    let v;
    if (hopLe === 1) {
      v = -nega(bn ^ 1, depth - 1, -beta, -alpha, ply + 1, mocCon, true);
    } else {
      // LMR: nước yên tĩnh xếp muộn (không ăn quân, không chiếu, không phải nước giết) thì tìm nông hơn
      let giam = 0;
      if (dungCat && depth >= 3 && hopLe > 3 && !an && !biChieu && m !== k1 && m !== k2 && !damBat(kingSq[bn ^ 1], bn)) {
        giam = hopLe > 10 ? 2 : 1;
      }
      // PVS: các nước sau nước đầu chỉ cần chứng minh không hơn alpha, có vẻ hơn mới tìm lại đủ
      v = -nega(bn ^ 1, depth - 1 - giam, -alpha - 1, -alpha, ply + 1, mocCon, true);
      if (v > alpha && giam) v = -nega(bn ^ 1, depth - 1, -alpha - 1, -alpha, ply + 1, mocCon, true);
      if (v > alpha && v < beta) v = -nega(bn ^ 1, depth - 1, -beta, -alpha, ply + 1, mocCon, true);
    }
    hoan(m);
    if (v > tot) {
      tot = v; tot_m = m;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (((m >> 14) & 15) === 0) {
          const li = (m & 127) * 90 + ((m >> 7) & 127);
          LICH_SU[li] = Math.min(LICH_SU_MAX, LICH_SU[li] + depth * depth);
          if (m !== k1) { KIL[ply * 2 + 1] = k1; KIL[ply * 2] = m; }
        }
        break;
      }
    }
  }
  if (hopLe === 0) return -MAT + ply;
  if (dungTT) {
    let s = tot;
    if (s > MAT_NGUONG) s += ply; else if (s < -MAT_NGUONG) s -= ply;
    const co = tot <= alpha0 ? 2 : tot >= beta ? 1 : 0;
    ttKey[idx] = h2; ttInfo[idx] = (depth + 1) | (co << 8); ttSc[idx] = s; ttMv[idx] = tot_m;
  }
  return tot;
}

const moTa = (m) => {
  const tu = m & 127, den = (m >> 7) & 127;
  const quan = (p) => (p >> 3 === 0 ? "r" : "b") + LOAI[(p & 7) - 1];
  const an = (m >> 14) & 15;
  return {
    m: { tu: [(tu / 9) | 0, tu % 9], den: [(den / 9) | 0, den % 9], an: an ? quan(an) : null },
    nuoc: CAC_COT[tu % 9] + ((tu / 9) | 0) + CAC_COT[den % 9] + ((den / 9) | 0),
  };
};

// Tìm nước cho bên s ("r" hoặc "b") trên bàn b (mảng 10x9 như co-tuong.js).
// Trả về { xep, doSau, nodes }. xep: danh sách nước hợp lệ sắp theo điểm giảm dần, mỗi phần tử
// { m: {tu, den, an}, nuoc, diem }. soNuoc nước đầu bảng có điểm chính xác, các nước sau chỉ là cận trên.
// Các nước bằng điểm với nước đầu bảng đều có điểm chính xác, nên chonTrongDinh dùng được.
// Nạp bàn dạng chuỗi vào mảng số, tính hash, điểm và vị trí tướng. Trả về false nếu thiếu tướng.
function napBan(b, bn, pst) {
  bangDiem = pst ? DIEM_PST : DIEM_THUONG;
  bd.fill(0); h1 = 0; h2 = 0; ev = 0; nodes = 0; het = 0;
  DEM.fill(0);
  kingSq[0] = -1; kingSq[1] = -1;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const x = b[r][c];
      if (!x) continue;
      const p = ((x[0] === "r" ? 0 : 1) << 3) | (LOAI.indexOf(x[1]) + 1);
      const o = r * 9 + c;
      bd[o] = p;
      DEM[p]++;
      h1 ^= Z1[p * 90 + o]; h2 ^= Z2[p * 90 + o];
      ev += bangDiem[p * 90 + o];
      if ((p & 7) === TK) kingSq[p >> 3] = o;
    }
  }
  if (bn === 1) { h1 ^= ZS1; h2 ^= ZS2; }
  return kingSq[0] >= 0 && kingSq[1] >= 0;
}

const MAU_NUOC = /^[a-i][0-9][a-i][0-9]$/;

// Nạp lịch sử ván (các nước từ thế mở đầu, dạng "h2e2") để nhận ra thế lặp và biết còn bao nhiêu nước tới hòa.
// Chỉ dùng khi đi lại đúng các nước đó từ thế mở đầu ra được bàn hiện tại, không thì bỏ qua.
// Luôn để lại bàn b đã nạp, như napBan.
function napLichSu(lichSu, b, bn, pst) {
  iGoc = 0; mocGoc = 0; nuocVan = 0;
  let ok = Array.isArray(lichSu) && lichSu.length > 0 && lichSu.length <= NUOC_TOI_DA;
  let moc = 0, c1 = 0, c2 = 0;
  if (ok) {
    napBan(khoiTao(), 0, pst);
    for (let i = 0; i < lichSu.length; i++) {
      const x = lichSu[i];
      if (typeof x !== "string" || !MAU_NUOC.test(x)) { ok = false; break; }
      const tu = Number(x[1]) * 9 + CAC_COT.indexOf(x[0]);
      const den = Number(x[3]) * 9 + CAC_COT.indexOf(x[2]);
      if (bd[tu] === 0) { ok = false; break; }
      DUONG1[i] = h1; DUONG2[i] = h2;
      const an = bd[den];
      dat(tu | (den << 7) | (an << 14));
      if (an) moc = i + 1;
    }
    c1 = h1; c2 = h2;
  }
  napBan(b, bn, pst);
  if (ok && h1 === c1 && h2 === c2) { iGoc = lichSu.length; mocGoc = moc; nuocVan = lichSu.length; }
}

// Tướng của bên s có đang bị chiếu không (dùng để kiểm thử so với co-tuong.js)
export function biChieuMay(b, s) {
  const bn = s === "r" ? 0 : 1;
  if (!napBan(b, bn, false)) return true;
  return damBat(kingSq[bn], bn ^ 1);
}

// Các nước giả hợp lệ (chưa kiểm tra tướng bị chiếu) của bên s, dạng "h2e2" (dùng để kiểm thử)
export function nuocGiaMay(b, s) {
  const bn = s === "r" ? 0 : 1;
  napBan(b, bn, false);
  const n = sinh(bn, 0, false);
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = MV[i], tu = m & 127, den = (m >> 7) & 127;
    out.push(CAC_COT[tu % 9] + ((tu / 9) | 0) + CAC_COT[den % 9] + ((den / 9) | 0));
  }
  return out;
}

// lichSu: các nước đã đi trong ván từ thế mở đầu (để nhận ra thế lặp và luật hòa 120 nước).
// nutToiDa: dừng sau khoảng số nút này (độ sâu 1 luôn xong), dùng để đấu thử không phụ thuộc tốc độ máy.
export function timNuocMay(b, s, {
  doSauToiDa = 20, thoiGianMs = 0, soNuoc = 1, q = false, tt = false, pst = false,
  cat = false, giaHan = false, dg = false, nutToiDa = 0, lichSu = null,
} = {}) {
  const bn = s === "r" ? 0 : 1;
  dungQ = q; dungTT = tt; dungCat = cat; dungGiaHan = giaHan; dungDG = dg;
  if (!napBan(b, bn, pst)) return { xep: [], doSau: 0, nodes: 0 };
  napLichSu(lichSu, b, bn, pst);
  DUONG1[iGoc] = h1; DUONG2[iGoc] = h2;
  // Giữ bảng băm giữa các nước để lượt sau không tính lại từ đầu. Xóa khi đổi cách tính điểm.
  const cauHinh = (pst ? 1 : 0) | (q ? 2 : 0) | (dg ? 4 : 0);
  if (dungTT && cauHinh !== cauHinhTT) { ttInfo.fill(0); cauHinhTT = cauHinh; }
  KIL.fill(0);
  LICH_SU.fill(0);

  // Nước gốc: chỉ lấy nước hợp lệ thật (tướng không bị chiếu, không đối mặt)
  const nGoc = sinh(bn, 0, false);
  let goc = [];
  for (let i = 0; i < nGoc; i++) {
    const m = MV[i];
    dat(m);
    const hopLe = !doiMat() && !damBat(kingSq[bn], bn ^ 1);
    hoan(m);
    if (hopLe) goc.push({ m, o: SC[i] });
  }
  goc.sort((x, y) => y.o - x.o);
  goc = goc.map((x) => x.m);
  if (goc.length === 0) return { xep: [], doSau: 0, nodes: 0 };

  const batDau = Date.now();
  let ketQua = null, doSau = 0;
  for (let d = 1; d <= doSauToiDa; d++) {
    het = d === 1 || !thoiGianMs ? 0 : batDau + thoiGianMs; // độ sâu 1 luôn hoàn thành
    gioiHanNut = d === 1 ? 0 : nutToiDa;
    const ds = [];
    const top = []; // điểm giảm dần của soNuoc nước tốt nhất đến lúc này
    try {
      for (const m of goc) {
        const alphaGoc = top.length >= soNuoc ? top[soNuoc - 1] - 1 : -VO_CUC;
        dat(m);
        const mocCon = (m >> 14) & 15 ? iGoc + 1 : mocGoc;
        let v;
        if (alphaGoc === -VO_CUC) {
          v = -nega(bn ^ 1, d - 1, -VO_CUC, VO_CUC, 1, mocCon, true);
        } else {
          // PVS ở gốc: thử với cửa sổ hẹp, chỉ tìm lại đủ khi nước này có thể vào nhóm đầu bảng
          v = -nega(bn ^ 1, d - 1, -alphaGoc - 1, -alphaGoc, 1, mocCon, true);
          if (v > alphaGoc) v = -nega(bn ^ 1, d - 1, -VO_CUC, -alphaGoc, 1, mocCon, true);
        }
        hoan(m);
        ds.push({ m, v });
        let j = top.length;
        top.push(v);
        while (j > 0 && top[j - 1] < v) { top[j] = top[j - 1]; j--; }
        top[j] = v;
        if (top.length > soNuoc) top.pop();
      }
    } catch (e) {
      if (e === HET_GIO) break;
      throw e;
    }
    ds.sort((x, y) => y.v - x.v);
    goc = ds.map((x) => x.m);
    ketQua = ds;
    doSau = d;
    if (Math.abs(ds[0].v) > MAT - 200) break; // đã thấy chiếu hết, không cần tìm sâu hơn
  }
  return { xep: ketQua.map((x) => ({ ...moTa(x.m), diem: x.v || 0 })), doSau, nodes }; // x.v || 0 để không trả -0
}
