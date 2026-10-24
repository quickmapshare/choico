// Máy đánh cờ caro: minimax/alpha-beta đầy đủ (negamax, tìm sâu dần, giới hạn thời gian), không ăn quân nên không cần
// bảng 0x88 hay tìm kiếm tĩnh như cờ tướng/cờ vua. Luật chính thức vẫn ở luat.js (server kiểm mọi nước bằng luat.js).
//
// Không gian trạng thái quá lớn để xét hết 225 ô trống, nên mỗi nước chỉ xét các ô trống trong vòng 2 ô quanh quân đã
// có trên bàn (ô xa quân không ảnh hưởng ngay), xếp theo điểm mẫu rồi cắt còn "rong" ô tốt nhất ở các nút không phải gốc
// để nhánh cây không nổ ra; ở gốc xét hết các ô ứng viên để không bỏ sót nước hay.
// Điểm mẫu theo dãy quân liên tục và số đầu hở (0, 1, 2 đầu còn trống): dãy đủ 5 thắng ngay, dãy 4 hở (hai đầu trống)
// hay dãy 3 hở đều rất nguy hiểm vì đối phương không chặn được hết. Tổng điểm bàn cộng dồn điểm mọi dãy của mỗi bên.
import { kyHieu, doiBen } from "./luat.js";

const HANG = 15;
const COT = 15;
const HUONG = [[0, 1], [1, 0], [1, 1], [1, -1]];
const MAT = 1e9; // điểm thắng, trừ đi số nước tới đích để máy chọn nước thắng nhanh nhất
const VO_CUC = 1e12;
const HET_GIO = Symbol("het_gio");
const trongBan = (r, c) => r >= 0 && r < HANG && c >= 0 && c < COT;

// Điểm một dãy dài n quân liên tục với mo đầu hở (0, 1 hoặc 2)
function diemDay(n, mo) {
  if (n >= 5) return 100000000;
  if (n === 4) return mo === 2 ? 5000000 : mo === 1 ? 500000 : 0;
  if (n === 3) return mo === 2 ? 50000 : mo === 1 ? 3000 : 0;
  if (n === 2) return mo === 2 ? 200 : mo === 1 ? 50 : 0;
  return mo === 2 ? 10 : 0; // n === 1
}

// 5 quân liên tục đi qua (r, c) theo bên s (vừa đặt), không cần quét cả bàn
function thangTaiO(b, r, c, s) {
  for (const [dr, dc] of HUONG) {
    let n = 1;
    for (const k of [1, -1]) {
      let rr = r + dr * k;
      let cc = c + dc * k;
      while (trongBan(rr, cc) && b[rr][cc] === s) {
        n++;
        rr += dr * k;
        cc += dc * k;
      }
    }
    if (n >= 5) return true;
  }
  return false;
}

// Tổng điểm 4 hướng đi qua (r, c) nếu đặt quân s vào đó (ô đang trống)
function diemDatO(b, r, c, s) {
  b[r][c] = s;
  let tong = 0;
  for (const [dr, dc] of HUONG) {
    let n = 1;
    let rr = r + dr;
    let cc = c + dc;
    while (trongBan(rr, cc) && b[rr][cc] === s) {
      n++;
      rr += dr;
      cc += dc;
    }
    const moTruoc = trongBan(rr, cc) && !b[rr][cc];
    let rr2 = r - dr;
    let cc2 = c - dc;
    while (trongBan(rr2, cc2) && b[rr2][cc2] === s) {
      n++;
      rr2 -= dr;
      cc2 -= dc;
    }
    const moSau = trongBan(rr2, cc2) && !b[rr2][cc2];
    tong += diemDay(n, (moTruoc ? 1 : 0) + (moSau ? 1 : 0));
  }
  b[r][c] = null;
  return tong;
}

// Điểm toàn bàn nhìn từ bên "r" (dương lợi cho "r", âm lợi cho "b"): quét mỗi dãy đúng một lần (chỉ tính từ đầu dãy)
function danhGiaBan(b) {
  let tong = 0;
  for (let r = 0; r < HANG; r++) {
    for (let c = 0; c < COT; c++) {
      const s = b[r][c];
      if (!s) continue;
      for (const [dr, dc] of HUONG) {
        const pr = r - dr;
        const pc = c - dc;
        if (trongBan(pr, pc) && b[pr][pc] === s) continue; // không phải đầu dãy theo hướng này
        let n = 1;
        let rr = r + dr;
        let cc = c + dc;
        while (trongBan(rr, cc) && b[rr][cc] === s) {
          n++;
          rr += dr;
          cc += dc;
        }
        const moTruoc = trongBan(rr, cc) && !b[rr][cc];
        const moSau = trongBan(pr, pc) && !b[pr][pc];
        const d = diemDay(n, (moTruoc ? 1 : 0) + (moSau ? 1 : 0));
        tong += s === "r" ? d : -d;
      }
    }
  }
  return tong;
}

// Các ô trống trong vòng 2 ô quanh quân đã có, xếp theo điểm ứng viên (điểm cao nhất của hai bên nếu đặt vào đó)
// giảm dần; limit > 0 thì cắt còn tốt nhất. Bàn trống (nước đầu ván) thì chỉ có ô giữa bàn.
function ungVien(b, limit) {
  const ke = new Set();
  let coQuan = false;
  for (let r = 0; r < HANG; r++) {
    for (let c = 0; c < COT; c++) {
      if (!b[r][c]) continue;
      coQuan = true;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (trongBan(rr, cc) && !b[rr][cc]) ke.add(rr * COT + cc);
        }
      }
    }
  }
  if (!coQuan) return [[7, 7]];
  let ds = [...ke].map((i) => {
    const r = (i / COT) | 0;
    const c = i % COT;
    return [r, c, Math.max(diemDatO(b, r, c, "r"), diemDatO(b, r, c, "b"))];
  });
  ds.sort((x, y) => y[2] - x[2]);
  if (limit && ds.length > limit) ds = ds.slice(0, limit);
  return ds.map(([r, c]) => [r, c]);
}

// Tìm nước cho bên đến lượt của thế cờ the (như luat.js). Trả về { xep, doSau, nodes }; xep: các nước ứng viên ở gốc
// sắp theo điểm giảm dần, mỗi phần tử { nuoc, diem }. doSauToiDa: độ sâu tìm tối đa. rong: số ô ứng viên giữ lại ở
// các nút không phải gốc (xem muc.js). thoiGianMs: dừng tìm sâu hơn sau khoảng thời gian này (độ sâu 1 luôn xong).
export function tinh(the, { doSauToiDa = 3, rong = 16, thoiGianMs = 0 } = {}) {
  const ben = the.s;
  const b = the.b.map((h) => h.slice());
  let nodes = 0;
  let het = 0;

  function negamax(depth, alpha, beta, s, ply) {
    nodes++;
    if (het && (nodes & 1023) === 0 && Date.now() > het) throw HET_GIO;
    const ds = ungVien(b, rong);
    if (ds.length === 0) return 0; // hết ô trống: hòa
    if (depth === 0) return danhGiaBan(b) * (s === "r" ? 1 : -1);
    let best = -VO_CUC;
    for (const [r, c] of ds) {
      b[r][c] = s;
      const thang = thangTaiO(b, r, c, s);
      const v = thang ? MAT - ply : -negamax(depth - 1, -beta, -alpha, doiBen(s), ply + 1);
      b[r][c] = null;
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let goc = ungVien(b, 0); // gốc xét hết ứng viên, không cắt
  if (goc.length === 0) return { xep: [], doSau: 0, nodes: 0 };

  const batDau = Date.now();
  let ketQua = goc.map(([r, c]) => ({ r, c, v: 0 }));
  let doSau = 0;
  for (let d = 1; d <= doSauToiDa; d++) {
    het = d === 1 || !thoiGianMs ? 0 : batDau + thoiGianMs;
    const ds = [];
    try {
      for (const [r, c] of goc) {
        b[r][c] = ben;
        const thang = thangTaiO(b, r, c, ben);
        const v = thang ? MAT - 1 : -negamax(d - 1, -VO_CUC, VO_CUC, doiBen(ben), 2);
        b[r][c] = null;
        ds.push({ r, c, v });
      }
    } catch (e) {
      if (e === HET_GIO) break;
      throw e;
    }
    ds.sort((x, y) => y.v - x.v);
    goc = ds.map((x) => [x.r, x.c]);
    ketQua = ds;
    doSau = d;
    if (Math.abs(ketQua[0].v) > MAT - 200) break; // đã thấy nước thắng, không cần tìm sâu hơn
  }
  return { xep: ketQua.map((x) => ({ nuoc: kyHieu({ den: [x.r, x.c] }), diem: x.v || 0 })), doSau, nodes };
}
