// Minimax alpha-beta đơn giản trên bàn dạng chuỗi của luat.js. Máy chơi thật dùng ./may.js (nhanh hơn nhiều);
// bản này giữ lại làm mẫu đối chiếu trong test: hai bên phải cho cùng điểm ở cùng độ sâu.
import { nuocHopLe, thucHien, hoanTac, kyHieu, doiBen } from "./luat.js";
import { chonTrongDinh } from "../chung/may.js";

// Giá trị quân để đánh giá (tướng rất lớn để không bao giờ đổi).
const GIA_TRI = { K: 10000, A: 200, E: 200, H: 400, R: 900, C: 450, P: 100 };
const THUONG_SONG = 100; // tốt đã qua sông thêm điểm
const MAT = -100000;

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

// Tín hiệu hết giờ: ném ra khi tìm kiếm quá thời gian cho phép
const HET_GIO = Symbol("het_gio");

// Negamax với cắt tỉa alpha-beta. Điểm luôn nhìn từ bên đang đi.
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
