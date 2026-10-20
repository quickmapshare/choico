// Lịch âm Việt Nam: đổi ngày dương sang âm theo múi giờ UTC+7 (Hà Nội).
// Thuật toán thiên văn theo Hồ Ngọc Đức. Khác lịch Trung Quốc (UTC+8) ở một số ngày có trăng mới sát nửa đêm.
// Trả về { ngay, thang, nam, nhuan }: nam là năm âm lịch, nhuan = true nếu là tháng nhuận.

const TZ = 7;
const PI = Math.PI;
const DR = PI / 180;

function jdTuNgay(dd, mm, yy) {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

// Ngày (số JDN) chứa trăng mới thứ k kể từ mốc 1900.
function ngayTrangMoi(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * DR) +
    0.0021 * Math.sin(2 * DR * M) -
    0.4068 * Math.sin(Mpr * DR) +
    0.0161 * Math.sin(2 * DR * Mpr) -
    0.0004 * Math.sin(3 * DR * Mpr) +
    0.0104 * Math.sin(2 * DR * F) -
    0.0051 * Math.sin((M + Mpr) * DR) -
    0.0074 * Math.sin((M - Mpr) * DR) +
    0.0004 * Math.sin((2 * F + M) * DR) -
    0.0004 * Math.sin((2 * F - M) * DR) -
    0.0006 * Math.sin((2 * F + Mpr) * DR) +
    0.001 * Math.sin((2 * F - Mpr) * DR) +
    0.0005 * Math.sin((M + 2 * Mpr) * DR);
  let deltat;
  if (T < -11) {
    deltat = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
  } else {
    deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
  }
  const jdNew = jd1 + C1 - deltat;
  return Math.floor(jdNew + 0.5 + TZ / 24);
}

// Kinh độ mặt trời theo cung 30 độ (0..11) tại ngày jdn.
function cungMatTroi(jdn) {
  const T = (jdn - 2451545.5 - TZ / 24) / 36525;
  const T2 = T * T;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL =
    (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * DR * M) +
    0.00029 * Math.sin(3 * DR * M);
  let L = (L0 + DL) * DR;
  L = L - 2 * PI * Math.floor(L / (2 * PI));
  return Math.floor((L / PI) * 6);
}

// Ngày trăng mới của tháng 11 âm lịch (chứa đông chí) trong năm dương yy.
function thangMuoiMotAm(yy) {
  const off = jdTuNgay(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = ngayTrangMoi(k);
  if (cungMatTroi(nm) >= 9) nm = ngayTrangMoi(k - 1);
  return nm;
}

// Vị trí tháng nhuận trong năm (số tháng kể từ tháng 11 trước đó).
function vitriThangNhuan(a11) {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = cungMatTroi(ngayTrangMoi(k + i));
  do {
    last = arc;
    i++;
    arc = cungMatTroi(ngayTrangMoi(k + i));
  } while (arc !== last && i < 14);
  return i - 1;
}

// Đổi ngày dương { y, m, d } sang ngày âm theo múi giờ Việt Nam.
export function ngayAmVN({ y, m, d }) {
  const soNgay = jdTuNgay(d, m, y);
  const k = Math.floor((soNgay - 2415021.076998695) / 29.530588853);
  let thangBatDau = ngayTrangMoi(k + 1);
  if (thangBatDau > soNgay) thangBatDau = ngayTrangMoi(k);

  let a11 = thangMuoiMotAm(y);
  let b11 = a11;
  let namAm;
  if (a11 >= thangBatDau) {
    namAm = y;
    a11 = thangMuoiMotAm(y - 1);
  } else {
    namAm = y + 1;
    b11 = thangMuoiMotAm(y + 1);
  }

  const ngay = soNgay - thangBatDau + 1;
  const diff = Math.floor((thangBatDau - a11) / 29);
  let nhuan = false;
  let thang = diff + 11;
  if (b11 - a11 > 365) {
    const lechNhuan = vitriThangNhuan(a11);
    if (diff >= lechNhuan) {
      thang = diff + 10;
      if (diff === lechNhuan) nhuan = true;
    }
  }
  if (thang > 12) thang -= 12;
  if (thang >= 11 && diff < 4) namAm -= 1;

  return { ngay, thang, nam: namAm, nhuan };
}
