// Máy đánh cờ vua tốc độ cao. Chỉ dùng cho AI, luật cờ chính thức vẫn ở luat.js (server kiểm mọi nước bằng luat.js).
// Bàn 0x88 (mảng số 128 ô), nước đi mã hóa thành số nguyên, đi và hoàn tác tại chỗ (không cấp phát khi tìm),
// điểm, hash và vị trí vua cập nhật tăng dần. Tìm trên nước giả hợp lệ, đi xong mới bỏ nước để vua bị chiếu.
// Tùy chọn giống máy cờ tướng (src/lib/co-tuong/may.js): tìm sâu dần, bảng băm vị trí (tt), tìm kiếm tĩnh (q), điểm vị trí
// quân (pst), gia hạn khi bị chiếu (giaHan), null-move và LMR (cat). Luôn dùng PVS và nhận ra thế lặp, luật 50 nước và
// giới hạn số nước của ván (khi có lichSu).
import { NUOC_TOI_DA, khoiTao } from "./luat.js";

// Quân = màu * 8 + loại. Màu 0 là trắng (bên "r", đi lên), 1 là đen. Ô = hàng * 16 + cột, hàng 0 là hàng 8 trên bàn.
const TP = 1, TN = 2, TB = 3, TR = 4, TQ = 5, TK = 6;
const LOAI = " PNBRQK";
const CAC_COT = "abcdefgh";
const GT = [0, 100, 320, 330, 500, 900, 20000];
const PHA = [0, 0, 1, 1, 2, 4, 0]; // trọng số giai đoạn ván: đủ quân là 24, chỉ còn tốt và vua là 0
const MAT = 100000;
const MAT_NGUONG = MAT - 1000;
const VO_CUC = 1 << 28;
const HET_GIO = Symbol("het_gio");
const MAXPLY = 96;
const MAXM = 256;
const QD = 8;
const NGOAI = 0x88;

const HUONG_MA = [-33, -31, -18, -14, 14, 18, 31, 33];
const HUONG_VUA = [-17, -16, -15, -1, 1, 15, 16, 17];
const HUONG_THANG = [-16, 16, -1, 1];
const HUONG_CHEO = [-17, -15, 15, 17];

// Bảng điểm vị trí (Simplified Evaluation Function), nhìn từ trắng, hàng 8 trước
const PST = {
  [TP]: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [TN]: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [TB]: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [TR]: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [TQ]: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
};
const VUA_GIUA = [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10,
  20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20];
const VUA_CUOI = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30,
  -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];

// Chỉ số ô 0..63 trong bảng điểm theo màu (đen soi gương theo hàng)
const o64 = (o, mau) => (mau === 0 ? (o >> 4) * 8 + (o & 7) : (7 - (o >> 4)) * 8 + (o & 7));

// Điểm quân tại ô (gồm giá trị quân), nhìn từ trắng: quân trắng dương, quân đen âm. Vua chỉ có phần vị trí tính riêng.
function taoBang(pst) {
  const t = new Int32Array(16 * 128);
  for (let mau = 0; mau < 2; mau++) {
    for (let k = TP; k <= TQ; k++) {
      for (let o = 0; o < 128; o++) {
        if (o & NGOAI) continue;
        const v = GT[k] + (pst ? PST[k][o64(o, mau)] : 0);
        t[((mau << 3) | k) * 128 + o] = mau === 0 ? v : -v;
      }
    }
  }
  return t;
}
const BANG_THUONG = taoBang(false);
const BANG_PST = taoBang(true);

// Zobrist
let seed = 1804289383;
const rnd32 = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return seed | 0; };
const Z1 = new Int32Array(16 * 128).map(() => rnd32());
const Z2 = new Int32Array(16 * 128).map(() => rnd32());
const ZS1 = rnd32(), ZS2 = rnd32();
const ZC1 = new Int32Array(16).map(() => rnd32()), ZC2 = new Int32Array(16).map(() => rnd32());
const ZE1 = new Int32Array(8).map(() => rnd32()), ZE2 = new Int32Array(8).map(() => rnd32());

// Quyền nhập thành: 1 trắng cánh vua, 2 trắng cánh hậu, 4 đen cánh vua, 8 đen cánh hậu. Đi từ hoặc tới ô nào thì giữ lại các bit này.
const GIU_NHAP = new Int32Array(128).fill(15);
GIU_NHAP[0x74] = 15 & ~3; GIU_NHAP[0x77] = 15 & ~1; GIU_NHAP[0x70] = 15 & ~2;
GIU_NHAP[0x04] = 15 & ~12; GIU_NHAP[0x07] = 15 & ~4; GIU_NHAP[0x00] = 15 & ~8;

// ---------- Trạng thái (module dùng một lần mỗi lệnh gọi) ----------
const bd = new Int8Array(128);
const vua = new Int32Array(2);
let ben = 0, nhap = 0, qua = -1, n50 = 0, h1 = 0, h2 = 0, ev = 0, pha = 0, nodes = 0, het = 0, gioiHanNut = 0;
let bang = BANG_THUONG, dungPst = false, dungQ = false, dungTT = false, dungCat = false, dungGiaHan = false;
// Ngăn xếp để hoàn tác
const NX = MAXPLY + NUOC_TOI_DA + 16;
const sNhap = new Int32Array(NX), sQua = new Int32Array(NX), sN50 = new Int32Array(NX);
const sH1 = new Int32Array(NX), sH2 = new Int32Array(NX), sEv = new Int32Array(NX), sPha = new Int32Array(NX);
let sp = 0;
const MV = new Int32Array(MAXPLY * MAXM);
const SC = new Int32Array(MAXPLY * MAXM);
const KIL = new Int32Array(MAXPLY * 2);
const LICH_SU = new Int32Array(128 * 128);
const LICH_SU_MAX = 8000;
const TT_BITS = 19;
const TT_MASK = (1 << TT_BITS) - 1;
const ttKey = new Int32Array(1 << TT_BITS), ttInfo = new Int32Array(1 << TT_BITS), ttSc = new Int32Array(1 << TT_BITS), ttMv = new Int32Array(1 << TT_BITS);
let cauHinhTT = -1;
// Hash các thế đã qua: lịch sử ván (0..iGoc-1), thế gốc (iGoc), rồi đường đang tìm. mocGoc: ngay sau nước không đảo ngược
// được gần nhất (ăn quân, đi tốt); trước đó không thể lặp lại. nuocVan: số nước đã đi trong ván.
const DUONG1 = new Int32Array(NUOC_TOI_DA + MAXPLY + 8), DUONG2 = new Int32Array(NUOC_TOI_DA + MAXPLY + 8);
let iGoc = 0, mocGoc = 0, nuocVan = 0;

// Nước: từ | đến << 7 | phong << 14 (loại) | cờ << 17 (1 qua đường, 2 nhập thành, 4 tốt đi hai ô) | quân bị ăn << 20
const F_QUA = 1, F_NHAP = 2, F_HAI = 4;
const mTu = (m) => m & 127, mDen = (m) => (m >> 7) & 127, mPhong = (m) => (m >> 14) & 7, mCo = (m) => (m >> 17) & 7, mAn = (m) => (m >> 20) & 15;
const taoNuoc = (tu, den, an, phong = 0, co = 0) => tu | (den << 7) | (phong << 14) | (co << 17) | (an << 20);

const doiQua = (o) => { if (o >= 0) { h1 ^= ZE1[o & 7]; h2 ^= ZE2[o & 7]; } };

function datQuan(p, o) { bd[o] = p; h1 ^= Z1[p * 128 + o]; h2 ^= Z2[p * 128 + o]; ev += bang[p * 128 + o]; pha += PHA[p & 7]; }
function boQuan(o) { const p = bd[o]; bd[o] = 0; h1 ^= Z1[p * 128 + o]; h2 ^= Z2[p * 128 + o]; ev -= bang[p * 128 + o]; pha -= PHA[p & 7]; }

function dat(m) {
  sNhap[sp] = nhap; sQua[sp] = qua; sN50[sp] = n50; sH1[sp] = h1; sH2[sp] = h2; sEv[sp] = ev; sPha[sp] = pha; sp++;
  const tu = mTu(m), den = mDen(m), co = mCo(m), phong = mPhong(m);
  const p = bd[tu];
  if (co & F_QUA) boQuan(den + (ben === 0 ? 16 : -16));
  else if (bd[den]) boQuan(den);
  boQuan(tu);
  datQuan(phong ? (ben << 3) | phong : p, den);
  if (co & F_NHAP) {
    const [x, x2] = den > tu ? [tu + 3, tu + 1] : [tu - 4, tu - 1];
    const xe = bd[x];
    boQuan(x);
    datQuan(xe, x2);
  }
  if ((p & 7) === TK) vua[ben] = den;
  h1 ^= ZC1[nhap]; h2 ^= ZC2[nhap];
  nhap &= GIU_NHAP[tu] & GIU_NHAP[den];
  h1 ^= ZC1[nhap]; h2 ^= ZC2[nhap];
  doiQua(qua);
  qua = co & F_HAI ? (tu + den) >> 1 : -1;
  doiQua(qua);
  n50 = (p & 7) === TP || mAn(m) ? 0 : n50 + 1;
  ben ^= 1;
  h1 ^= ZS1; h2 ^= ZS2;
}

function hoan(m) {
  ben ^= 1;
  const tu = mTu(m), den = mDen(m), co = mCo(m), an = mAn(m);
  const p = mPhong(m) ? (ben << 3) | TP : bd[den];
  bd[tu] = p;
  bd[den] = 0;
  if (co & F_QUA) bd[den + (ben === 0 ? 16 : -16)] = an;
  else if (an) bd[den] = an;
  if (co & F_NHAP) {
    const [x, x2] = den > tu ? [tu + 3, tu + 1] : [tu - 4, tu - 1];
    bd[x] = bd[x2];
    bd[x2] = 0;
  }
  if ((p & 7) === TK) vua[ben] = tu;
  sp--;
  nhap = sNhap[sp]; qua = sQua[sp]; n50 = sN50[sp]; h1 = sH1[sp]; h2 = sH2[sp]; ev = sEv[sp]; pha = sPha[sp];
}

// Bỏ lượt (null-move): chỉ đổi bên và xóa ô qua đường
function datNull() {
  sNhap[sp] = nhap; sQua[sp] = qua; sN50[sp] = n50; sH1[sp] = h1; sH2[sp] = h2; sEv[sp] = ev; sPha[sp] = pha; sp++;
  doiQua(qua);
  qua = -1;
  ben ^= 1;
  h1 ^= ZS1; h2 ^= ZS2;
}
function hoanNull() {
  ben ^= 1;
  sp--;
  nhap = sNhap[sp]; qua = sQua[sp]; n50 = sN50[sp]; h1 = sH1[sp]; h2 = sH2[sp]; ev = sEv[sp]; pha = sPha[sp];
}

// Ô o có bị quân màu mau tấn công không
function biTan(o, mau) {
  const b8 = mau << 3;
  // Tốt trắng đứng dưới ô (hàng lớn hơn), tốt đen đứng trên
  const t1 = mau === 0 ? o + 15 : o - 15, t2 = mau === 0 ? o + 17 : o - 17;
  if (!(t1 & NGOAI) && bd[t1] === (b8 | TP)) return true;
  if (!(t2 & NGOAI) && bd[t2] === (b8 | TP)) return true;
  for (let i = 0; i < 8; i++) {
    const x = o + HUONG_MA[i];
    if (!(x & NGOAI) && bd[x] === (b8 | TN)) return true;
  }
  for (let i = 0; i < 8; i++) {
    const x = o + HUONG_VUA[i];
    if (!(x & NGOAI) && bd[x] === (b8 | TK)) return true;
  }
  for (let i = 0; i < 4; i++) {
    const d = HUONG_THANG[i];
    for (let x = o + d; !(x & NGOAI); x += d) {
      const q = bd[x];
      if (q) { if (q === (b8 | TR) || q === (b8 | TQ)) return true; break; }
    }
  }
  for (let i = 0; i < 4; i++) {
    const d = HUONG_CHEO[i];
    for (let x = o + d; !(x & NGOAI); x += d) {
      const q = bd[x];
      if (q) { if (q === (b8 | TB) || q === (b8 | TQ)) return true; break; }
    }
  }
  return false;
}

const biChieuMay = () => biTan(vua[ben], ben ^ 1);

// Sinh nước giả hợp lệ của bên đang đi vào bộ đệm tầng ply. chiAn: chỉ nước ăn quân và phong cấp. Trả về số nước.
function sinh(ply, chiAn) {
  const base = ply * MAXM;
  let n = 0;
  const mau = ben, dich = ben ^ 1;
  const them = (m, diem) => { MV[base + n] = m; SC[base + n] = diem; n++; };
  const diemAn = (an, quan) => 10000 + GT[an & 7] * 16 - GT[quan & 7];
  for (let o = 0; o < 128; o++) {
    if (o & NGOAI) { o += 7; continue; }
    const p = bd[o];
    if (!p || (p >> 3) !== mau) continue;
    const t = p & 7;
    if (t === TP) {
      const tien = mau === 0 ? -16 : 16;
      const cuoi = mau === 0 ? 0 : 7;
      const dau = mau === 0 ? 6 : 1;
      const x = o + tien;
      const phongCap = (x >> 4) === cuoi;
      if (!(x & NGOAI) && !bd[x]) {
        if (phongCap) { for (const ph of [TQ, TN, TR, TB]) them(taoNuoc(o, x, 0, ph), 9500 + GT[ph]); }
        else if (!chiAn) {
          them(taoNuoc(o, x, 0), 0);
          const x2 = x + tien;
          if ((o >> 4) === dau && !bd[x2]) them(taoNuoc(o, x2, 0, 0, F_HAI), 0);
        }
      }
      for (const dc of [-1, 1]) {
        const y = x + dc;
        if (y & NGOAI) continue;
        const q = bd[y];
        if (q && (q >> 3) === dich) {
          if (phongCap) { for (const ph of [TQ, TN, TR, TB]) them(taoNuoc(o, y, q, ph), diemAn(q, p) + GT[ph]); }
          else them(taoNuoc(o, y, q), diemAn(q, p));
        } else if (y === qua) {
          them(taoNuoc(o, y, (dich << 3) | TP, 0, F_QUA), diemAn(TP, p));
        }
      }
    } else if (t === TN || t === TK) {
      const huong = t === TN ? HUONG_MA : HUONG_VUA;
      for (let i = 0; i < 8; i++) {
        const x = o + huong[i];
        if (x & NGOAI) continue;
        const q = bd[x];
        if (!q) { if (!chiAn) them(taoNuoc(o, x, 0), 0); }
        else if ((q >> 3) === dich) them(taoNuoc(o, x, q), diemAn(q, p));
      }
      // Nhập thành: ô giữa trống, vua không bị chiếu và không đi qua ô bị tấn công
      if (t === TK && !chiAn) {
        const h = mau === 0 ? 0x70 : 0x00;
        if (o === h + 4) {
          const kv = mau === 0 ? 1 : 4, kh = mau === 0 ? 2 : 8;
          if (nhap & kv && !bd[h + 5] && !bd[h + 6] && bd[h + 7] === ((mau << 3) | TR) && !biTan(h + 4, dich) && !biTan(h + 5, dich) && !biTan(h + 6, dich)) {
            them(taoNuoc(o, h + 6, 0, 0, F_NHAP), 50);
          }
          if (nhap & kh && !bd[h + 3] && !bd[h + 2] && !bd[h + 1] && bd[h] === ((mau << 3) | TR) && !biTan(h + 4, dich) && !biTan(h + 3, dich) && !biTan(h + 2, dich)) {
            them(taoNuoc(o, h + 2, 0, 0, F_NHAP), 40);
          }
        }
      }
    } else {
      const huong = t === TB ? HUONG_CHEO : t === TR ? HUONG_THANG : HUONG_VUA;
      for (let i = 0; i < huong.length; i++) {
        const d = huong[i];
        for (let x = o + d; !(x & NGOAI); x += d) {
          const q = bd[x];
          if (!q) { if (!chiAn) them(taoNuoc(o, x, 0), 0); continue; }
          if ((q >> 3) === dich) them(taoNuoc(o, x, q), diemAn(q, p));
          break;
        }
      }
    }
  }
  return n;
}

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

// Điểm theo bên đang đi: quân, vị trí, và vị trí vua chuyển dần từ giữa ván sang cuối ván theo số quân còn lại
function diem() {
  let v = ev;
  if (dungPst) {
    const p = Math.min(24, pha);
    const vt = vua[0], vd = vua[1];
    v += ((VUA_GIUA[o64(vt, 0)] - VUA_GIUA[o64(vd, 1)]) * p + (VUA_CUOI[o64(vt, 0)] - VUA_CUOI[o64(vd, 1)]) * (24 - p)) / 24 | 0;
  }
  return ben === 0 ? v : -v;
}

function kiemGio() {
  if ((++nodes & 2047) === 0 && ((het !== 0 && Date.now() > het) || (gioiHanNut !== 0 && nodes > gioiHanNut))) throw HET_GIO;
}

// Thế đang xét (chỉ số i) đã có trước đó với cùng bên đi, kể từ chỉ số moc
function lapLai(i, moc) {
  for (let j = i - 2; j >= moc; j -= 2) if (DUONG1[j] === h1 && DUONG2[j] === h2) return true;
  return false;
}

// Bên đang đi còn quân lớn (không chỉ vua và tốt): bỏ lượt mới an toàn
const conQuanLon = () => {
  for (let o = 0; o < 128; o++) {
    if (o & NGOAI) { o += 7; continue; }
    const p = bd[o];
    if (p && (p >> 3) === ben && (p & 7) >= TN && (p & 7) <= TQ) return true;
  }
  return false;
};

function tinhTinh(alpha, beta, ply, qd) {
  kiemGio();
  // Bị chiếu thì phải thử mọi nước (không được đứng yên), không thì chỉ thử nước ăn quân và phong cấp.
  // Hết độ sâu tìm kiếm tĩnh thì đứng yên tính điểm, kể cả khi bị chiếu, để chuỗi chiếu liên tục không kéo dài mãi.
  const chieu = qd > 0 && ply < MAXPLY - 2 && biChieuMay();
  let tot = -VO_CUC;
  if (!chieu) {
    tot = diem();
    if (tot >= beta || qd <= 0 || ply >= MAXPLY - 2) return tot;
    if (tot > alpha) alpha = tot;
  }
  const base = ply * MAXM;
  const n = sinh(ply, !chieu);
  let hopLe = 0;
  for (let i = 0; i < n; i++) {
    const m = chon(base, n, i);
    dat(m);
    if (biTan(vua[ben ^ 1], ben)) { hoan(m); continue; }
    hopLe++;
    const v = -tinhTinh(-beta, -alpha, ply + 1, qd - 1);
    hoan(m);
    if (v > tot) { tot = v; if (v > alpha) alpha = v; if (alpha >= beta) break; }
  }
  if (chieu && hopLe === 0) return -MAT + ply;
  return tot;
}

function nega(depth, alpha, beta, ply, moc, choNull) {
  const i = iGoc + ply;
  DUONG1[i] = h1; DUONG2[i] = h2;
  if (ply > 0 && (n50 >= 100 || nuocVan + ply >= NUOC_TOI_DA || lapLai(i, moc))) return 0;
  const chieu = biChieuMay();
  if (chieu && dungGiaHan && ply < MAXPLY - 10) depth++;
  if (depth <= 0) return dungQ ? tinhTinh(alpha, beta, ply, QD) : (kiemGio(), diem());
  kiemGio();
  if (ply >= MAXPLY - 2) return diem();
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
  if (dungCat && choNull && beta - alpha === 1 && !chieu && depth >= 3 && conQuanLon() && diem() >= beta) {
    const R = depth >= 6 ? 3 : 2;
    datNull();
    const v = -nega(depth - 1 - R, -beta, -beta + 1, ply + 1, i + 1, false);
    hoanNull();
    if (v >= beta) return v > MAT_NGUONG ? beta : v;
  }
  const base = ply * MAXM;
  const n = sinh(ply, false);
  const k1 = KIL[ply * 2], k2 = KIL[ply * 2 + 1];
  for (let j = 0; j < n; j++) {
    const m = MV[base + j];
    if (m === nuocTT) SC[base + j] = 2000000;
    else if (m === k1 || m === k2) SC[base + j] = 9000;
    else if (!mAn(m) && !mPhong(m)) SC[base + j] += LICH_SU[mTu(m) * 128 + mDen(m)];
  }
  const alpha0 = alpha;
  let tot = -VO_CUC, totM = 0, hopLe = 0;
  for (let k = 0; k < n; k++) {
    const m = chon(base, n, k);
    dat(m);
    if (biTan(vua[ben ^ 1], ben)) { hoan(m); continue; }
    hopLe++;
    const yen = !mAn(m) && !mPhong(m);
    const mocCon = yen && (bd[mDen(m)] & 7) !== TP ? moc : i + 1;
    let v;
    if (hopLe === 1) {
      v = -nega(depth - 1, -beta, -alpha, ply + 1, mocCon, true);
    } else {
      let giam = 0;
      if (dungCat && depth >= 3 && hopLe > 3 && yen && !chieu && m !== k1 && m !== k2 && !biChieuMay()) giam = hopLe > 10 ? 2 : 1;
      v = -nega(depth - 1 - giam, -alpha - 1, -alpha, ply + 1, mocCon, true);
      if (v > alpha && giam) v = -nega(depth - 1, -alpha - 1, -alpha, ply + 1, mocCon, true);
      if (v > alpha && v < beta) v = -nega(depth - 1, -beta, -alpha, ply + 1, mocCon, true);
    }
    hoan(m);
    if (v > tot) {
      tot = v; totM = m;
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (yen) {
          const li = mTu(m) * 128 + mDen(m);
          LICH_SU[li] = Math.min(LICH_SU_MAX, LICH_SU[li] + depth * depth);
          if (m !== k1) { KIL[ply * 2 + 1] = k1; KIL[ply * 2] = m; }
        }
        break;
      }
    }
  }
  if (hopLe === 0) return chieu ? -MAT + ply : 0; // chiếu hết thì thua, hết nước mà không bị chiếu thì hòa
  if (dungTT) {
    let s = tot;
    if (s > MAT_NGUONG) s += ply; else if (s < -MAT_NGUONG) s -= ply;
    const co = tot <= alpha0 ? 2 : tot >= beta ? 1 : 0;
    ttKey[idx] = h2; ttInfo[idx] = (depth + 1) | (co << 8); ttSc[idx] = s; ttMv[idx] = totM;
  }
  return tot;
}

const tenO = (o) => CAC_COT[o & 7] + (8 - (o >> 4));
const kyHieuMay = (m) => tenO(mTu(m)) + tenO(mDen(m)) + (mPhong(m) ? LOAI[mPhong(m)].toLowerCase() : "");

// Nạp thế cờ của luat.js ({ b, s, nhap, qua, n50 }) vào mảng số. Trả về false nếu thiếu vua.
function napThe(the, pst) {
  bang = pst ? BANG_PST : BANG_THUONG;
  bd.fill(0); h1 = 0; h2 = 0; ev = 0; pha = 0; nodes = 0; het = 0; sp = 0;
  vua[0] = -1; vua[1] = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = the.b[r][c];
      if (!x) continue;
      const p = ((x[0] === "r" ? 0 : 1) << 3) | LOAI.indexOf(x[1]);
      const o = r * 16 + c;
      datQuan(p, o);
      if ((p & 7) === TK) vua[p >> 3] = o;
    }
  }
  ben = the.s === "r" ? 0 : 1;
  if (ben === 1) { h1 ^= ZS1; h2 ^= ZS2; }
  nhap = (the.nhap.includes("K") ? 1 : 0) | (the.nhap.includes("Q") ? 2 : 0) | (the.nhap.includes("k") ? 4 : 0) | (the.nhap.includes("q") ? 8 : 0);
  h1 ^= ZC1[nhap]; h2 ^= ZC2[nhap];
  qua = the.qua ? the.qua[0] * 16 + the.qua[1] : -1;
  doiQua(qua);
  n50 = the.n50 || 0;
  return vua[0] >= 0 && vua[1] >= 0;
}

// Tìm trong các nước giả hợp lệ của tầng 0 nước có ký hiệu ky (dùng khi nạp lịch sử)
function timTheoKy(ky) {
  const n = sinh(0, false);
  for (let i = 0; i < n; i++) if (kyHieuMay(MV[i]) === ky) return MV[i];
  return 0;
}

// Nạp lịch sử ván từ thế mở đầu để nhận ra thế lặp và biết còn bao nhiêu nước tới hòa. Chỉ dùng khi đi lại đúng các nước đó
// ra được thế hiện tại, không thì bỏ qua. Luôn để lại thế the đã nạp.
function napLichSu(lichSu, the, pst, theDau) {
  iGoc = 0; mocGoc = 0; nuocVan = 0;
  let ok = Array.isArray(lichSu) && lichSu.length > 0 && lichSu.length <= NUOC_TOI_DA;
  let moc = 0, c1 = 0, c2 = 0;
  if (ok) {
    napThe(theDau, pst);
    for (let i = 0; i < lichSu.length; i++) {
      const m = typeof lichSu[i] === "string" ? timTheoKy(lichSu[i]) : 0;
      if (!m) { ok = false; break; }
      DUONG1[i] = h1; DUONG2[i] = h2;
      const khongLui = mAn(m) || (bd[mTu(m)] & 7) === TP;
      dat(m);
      if (khongLui) moc = i + 1;
    }
    c1 = h1; c2 = h2;
  }
  napThe(the, pst);
  if (ok && h1 === c1 && h2 === c2) { iGoc = lichSu.length; mocGoc = moc; nuocVan = lichSu.length; }
}

// Thế mở đầu của ván cờ vua (để nạp lịch sử)
const THE_DAU = khoiTao();

// Đếm nút cây nước đi hợp lệ đến độ sâu d (perft), để kiểm thử bộ sinh nước của máy với luat.js
export function perftMay(the, d) {
  napThe(the, false);
  const dem = (dd, ply) => {
    if (dd === 0) return 1;
    let n = 0;
    const k = sinh(ply, false);
    for (let i = 0; i < k; i++) {
      const m = MV[ply * MAXM + i];
      dat(m);
      if (!biTan(vua[ben ^ 1], ben)) n += dem(dd - 1, ply + 1);
      hoan(m);
    }
    return n;
  };
  return dem(d, 0);
}

// Tìm nước cho bên đến lượt của thế cờ the (như luat.js). Trả về { xep, doSau, nodes }; xep: các nước hợp lệ sắp theo điểm
// giảm dần, mỗi phần tử { nuoc, diem }. soNuoc nước đầu bảng có điểm chính xác, các nước sau chỉ là cận trên.
// lichSu: các nước đã đi từ thế mở đầu (nhận ra thế lặp, luật hòa). nutToiDa: dừng sau khoảng số nút này (độ sâu 1 luôn xong).
export function timNuocMay(the, {
  doSauToiDa = 20, thoiGianMs = 0, soNuoc = 1, q = false, tt = false, pst = false, cat = false, giaHan = false,
  nutToiDa = 0, lichSu = null,
} = {}) {
  dungPst = pst; dungQ = q; dungTT = tt; dungCat = cat; dungGiaHan = giaHan;
  if (!napThe(the, pst)) return { xep: [], doSau: 0, nodes: 0 };
  napLichSu(lichSu, the, pst, THE_DAU);
  DUONG1[iGoc] = h1; DUONG2[iGoc] = h2;
  const cauHinh = (pst ? 1 : 0) | (q ? 2 : 0);
  if (dungTT && cauHinh !== cauHinhTT) { ttInfo.fill(0); cauHinhTT = cauHinh; }
  KIL.fill(0);
  LICH_SU.fill(0);

  // Nước gốc: chỉ lấy nước hợp lệ thật (vua không bị chiếu sau khi đi)
  const nGoc = sinh(0, false);
  let goc = [];
  for (let i = 0; i < nGoc; i++) {
    const m = MV[i];
    dat(m);
    const ok = !biTan(vua[ben ^ 1], ben);
    hoan(m);
    if (ok) goc.push({ m, o: SC[i] });
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
    const top = [];
    try {
      for (const m of goc) {
        const alphaGoc = top.length >= soNuoc ? top[soNuoc - 1] - 1 : -VO_CUC;
        const yen = !mAn(m) && !mPhong(m) && (bd[mTu(m)] & 7) !== TP;
        dat(m);
        const mocCon = yen ? mocGoc : iGoc + 1;
        let v;
        if (alphaGoc === -VO_CUC) {
          v = -nega(d - 1, -VO_CUC, VO_CUC, 1, mocCon, true);
        } else {
          v = -nega(d - 1, -alphaGoc - 1, -alphaGoc, 1, mocCon, true);
          if (v > alphaGoc) v = -nega(d - 1, -VO_CUC, -alphaGoc, 1, mocCon, true);
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
      if (e === HET_GIO) {
        // Hoàn tác các nước đang dở trên ngăn xếp: nạp lại thế gốc
        napThe(the, pst);
        break;
      }
      throw e;
    }
    ds.sort((x, y) => y.v - x.v);
    goc = ds.map((x) => x.m);
    ketQua = ds;
    doSau = d;
    if (Math.abs(ds[0].v) > MAT - 200) break; // đã thấy chiếu hết, không cần tìm sâu hơn
  }
  return { xep: ketQua.map((x) => ({ nuoc: kyHieuMay(x.m), diem: x.v || 0 })), doSau, nodes };
}

// Giao diện chung của máy (xem src/lib/chung/may.js)
export const tinh = timNuocMay;
