// Máy đánh cờ caro: negamax/alpha-beta (tìm sâu dần, giới hạn thời gian), không ăn quân nên không cần bảng 0x88.
// Luật chính thức vẫn ở luat.js (server kiểm mọi nước bằng luat.js).
//
// Đánh giá theo "cửa sổ": mọi đoạn 5 ô liên tiếp trên bàn (ngang, dọc, hai chéo). Cửa sổ chỉ có quân một bên thì
// tính điểm cho bên đó theo số quân (1..5); có quân cả hai bên thì chết, không tính. Cách này tự nhận ra cả dãy có
// khoảng trống (xx_xx, x_xxx) và đầu hở (dãy hở có nhiều cửa sổ hơn dãy bị chặn). Số quân mỗi cửa sổ cập nhật từng
// bước khi đặt/gỡ quân nên điểm toàn bàn lấy ngay, không quét lại.
//
// Cây tìm kiếm không nổ nhờ ba điều:
// - Bên đến lượt đang có sẵn cửa sổ 4 quân thì thắng ngay. Đối phương đang có cửa sổ 4 quân thì chỉ xét các ô chặn.
// - Nước tạo ra "bốn" (ép đối phương phải chặn) và nước chặn bắt buộc không tốn độ sâu, chỉ bị chặn bởi PLY_TOI_DA.
//   Nhờ đó máy thấy chuỗi bốn liên tiếp dẫn tới thắng (4-3, 4-4) sâu hơn nhiều so với độ sâu thường.
// - Ở độ sâu 0 chỉ xét tiếp các nước tạo bốn (tìm kiếm tĩnh), không dừng giữa chừng một đòn ép.
// Mỗi nút chỉ xét các ô trống trong vòng 2 ô quanh quân đã có, xếp theo điểm mẫu rồi cắt còn "rong" ô ở các nút thường.
import { kyHieu } from "./luat.js";

const HANG = 15;
const COT = 15;
const O = HANG * COT;
const HUONG = [[0, 1], [1, 0], [1, 1], [1, -1]];
const MAT = 1e9; // điểm thắng, trừ đi số nước tới đích để máy chọn nước thắng nhanh nhất
const VO_CUC = 1e12;
const PLY_TOI_DA = 24; // chặn chuỗi mở rộng (bốn / chặn bắt buộc) kéo dài vô hạn
const HET_GIO = Symbol("het_gio");
const DIEM_CUA_SO = [0, 1, 8, 100, 2500, 1e6]; // điểm cửa sổ theo số quân của một bên
const DIEM_O = [1, 8, 100, 2000, 200000]; // điểm mẫu của ô: cộng theo số quân sẵn có trong từng cửa sổ chứa ô

// Bảng cửa sổ và danh sách cửa sổ chứa mỗi ô, láng giềng trong vòng 2 ô (tính một lần)
const cuaSoCuaO = Array.from({ length: O }, () => []);
let soCuaSo = 0;
for (const [dr, dc] of HUONG) {
  for (let r = 0; r < HANG; r++) {
    for (let c = 0; c < COT; c++) {
      const er = r + 4 * dr;
      const ec = c + 4 * dc;
      if (er < 0 || er >= HANG || ec < 0 || ec >= COT) continue;
      for (let k = 0; k < 5; k++) cuaSoCuaO[(r + k * dr) * COT + c + k * dc].push(soCuaSo);
      soCuaSo++;
    }
  }
}
const lang = Array.from({ length: O }, (_, i) => {
  const r = (i / COT) | 0;
  const c = i % COT;
  const out = [];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if ((dr || dc) && rr >= 0 && rr < HANG && cc >= 0 && cc < COT) out.push(rr * COT + cc);
    }
  }
  return out;
});

// Tìm nước cho bên đến lượt của thế cờ the (như luat.js). Trả về { xep, doSau, nodes }; xep: các nước ứng viên ở gốc
// sắp theo điểm giảm dần, mỗi phần tử { nuoc, diem }. doSauToiDa: độ sâu tìm tối đa. rong: số ô ứng viên giữ lại ở
// các nút thường (xem muc.js). thoiGianMs: dừng tìm sâu hơn sau khoảng thời gian này (độ sâu 1 luôn xong).
// soNuoc: chỉ cần xếp đúng soNuoc nước đầu (các nước sau chỉ là chặn trên, tìm nhanh hơn).
export function tinh(the, { doSauToiDa = 3, rong = 16, thoiGianMs = 0, soNuoc = 1 } = {}) {
  const p0 = the.s === "r" ? 0 : 1;
  const bd = new Int8Array(O); // 0 trống, 1 = "r", 2 = "b"
  const dem = [new Int8Array(soCuaSo), new Int8Array(soCuaSo)]; // số quân mỗi bên trong từng cửa sổ
  const ke = new Int16Array(O); // số quân trong vòng 2 ô quanh mỗi ô
  const bon = [0, 0]; // số cửa sổ "bốn" (4 quân, không có quân đối phương) của mỗi bên
  let tong = 0; // điểm toàn bàn nhìn từ bên "r"
  let nodes = 0;
  let het = 0;

  // Đặt (d = 1) hoặc gỡ (d = -1) quân bên p ở ô o; trả về true nếu vừa tạo đủ 5 quân
  function dat(o, p, d) {
    bd[o] = d > 0 ? p + 1 : 0;
    const mine = dem[p];
    const other = dem[1 - p];
    const dau = p === 0 ? 1 : -1;
    let nam = false;
    const ws = cuaSoCuaO[o];
    for (let k = 0; k < ws.length; k++) {
      const w = ws[k];
      const m = mine[w];
      const t = other[w];
      const m2 = m + d;
      const truoc = t === 0 ? dau * DIEM_CUA_SO[m] : m === 0 ? -dau * DIEM_CUA_SO[t] : 0;
      const sau = t === 0 ? dau * DIEM_CUA_SO[m2] : m2 === 0 ? -dau * DIEM_CUA_SO[t] : 0;
      tong += sau - truoc;
      if (t === 0) bon[p] += (m2 === 4 ? 1 : 0) - (m === 4 ? 1 : 0);
      else if (t === 4) bon[1 - p] += (m2 === 0 ? 1 : 0) - (m === 0 ? 1 : 0);
      if (d > 0 && t === 0 && m2 === 5) nam = true;
      mine[w] = m2;
    }
    const kl = lang[o];
    for (let k = 0; k < kl.length; k++) ke[kl[k]] += d;
    return nam;
  }

  // Các ô ứng viên của bên p, mã hóa điểm * 256 + ô, sắp giảm dần.
  // che: 0 mọi ô, 1 chỉ ô chặn bốn của đối phương, 2 chỉ ô tạo ra bốn. lim > 0 thì cắt còn lim ô (chỉ che = 0).
  function sinh(p, che, lim) {
    const mine = dem[p];
    const other = dem[1 - p];
    const out = [];
    for (let i = 0; i < O; i++) {
      if (bd[i] || !ke[i]) continue;
      let att = 0;
      let def = 0;
      let tao4 = false;
      let chan = false;
      const ws = cuaSoCuaO[i];
      for (let k = 0; k < ws.length; k++) {
        const w = ws[k];
        const m = mine[w];
        const t = other[w];
        if (t === 0) {
          att += DIEM_O[m];
          if (m === 3) tao4 = true;
        }
        if (m === 0) {
          def += DIEM_O[t];
          if (t === 4) chan = true;
        }
      }
      if (che === 1 && !chan) continue;
      if (che === 2 && !tao4) continue;
      out.push((att + def) * 256 + i);
    }
    out.sort((a, b) => b - a);
    if (lim > 0 && che === 0 && out.length > lim) out.length = lim;
    return out;
  }

  function negamax(depth, alpha, beta, p, ply) {
    nodes++;
    if (het && (nodes & 1023) === 0 && Date.now() > het) throw HET_GIO;
    if (bon[p] > 0) return MAT - ply - 1; // đang có bốn chờ sẵn: đến lượt là đủ 5
    const bi = bon[1 - p] > 0; // phải chặn
    const tinhTay = p === 0 ? tong : -tong;
    let best = -VO_CUC;
    let ds;
    if (depth <= 0) {
      if (ply >= PLY_TOI_DA) return tinhTay;
      if (bi) {
        ds = sinh(p, 1, 0);
      } else {
        if (tinhTay >= beta) return tinhTay; // đứng yên đã đủ tốt
        best = tinhTay;
        if (best > alpha) alpha = best;
        ds = sinh(p, 2, 0);
      }
      if (ds.length === 0) return best > -VO_CUC ? best : tinhTay;
    } else {
      ds = bi ? sinh(p, 1, 0) : sinh(p, 0, rong);
      if (ds.length === 0) return bi ? tinhTay : 0; // hết ô trống: hòa
    }
    for (let k = 0; k < ds.length; k++) {
      const o = ds[k] % 256;
      let v;
      if (dat(o, p, 1)) {
        v = MAT - ply - 1;
      } else {
        const mienPhi = bi || bon[p] > 0 || depth <= 0; // chặn bắt buộc, tạo bốn, hoặc đang tìm kiếm tĩnh
        v = -negamax(mienPhi ? depth : depth - 1, -beta, -alpha, 1 - p, ply + 1);
      }
      dat(o, p, -1);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  let coQuan = false;
  for (let r = 0; r < HANG; r++) {
    for (let c = 0; c < COT; c++) {
      const s = the.b[r][c];
      if (!s) continue;
      coQuan = true;
      dat(r * COT + c, s === "r" ? 0 : 1, 1);
    }
  }
  if (!coQuan) return { xep: [{ nuoc: kyHieu({ den: [7, 7] }), diem: 0 }], doSau: 0, nodes: 0 }; // nước đầu: giữa bàn

  let goc = sinh(p0, 0, 0).map((x) => x % 256); // gốc xét hết ứng viên, không cắt
  if (goc.length === 0) return { xep: [], doSau: 0, nodes: 0 };

  const batDau = Date.now();
  let ketQua = goc.map((o) => ({ o, v: 0 }));
  let doSau = 0;
  for (let d = 1; d <= doSauToiDa; d++) {
    het = d === 1 || !thoiGianMs ? 0 : batDau + thoiGianMs;
    const ds = [];
    const dinh = []; // soNuoc điểm tốt nhất đã thấy, giảm dần; điểm thứ soNuoc làm cận alpha cho nước sau
    try {
      for (const o of goc) {
        let v;
        if (dat(o, p0, 1)) {
          v = MAT - 1;
        } else {
          const alpha = dinh.length >= soNuoc ? dinh[soNuoc - 1] - 1 : -VO_CUC;
          v = -negamax(d - 1, -VO_CUC, -alpha, 1 - p0, 1);
        }
        dat(o, p0, -1);
        ds.push({ o, v });
        dinh.push(v);
        dinh.sort((a, b) => b - a);
      }
    } catch (e) {
      if (e !== HET_GIO) throw e;
      break; // bàn tạm đang dở dang nhưng không dùng nữa: chỉ trả kết quả của độ sâu trước
    }
    ds.sort((x, y) => y.v - x.v);
    goc = ds.map((x) => x.o);
    ketQua = ds;
    doSau = d;
    if (Math.abs(ketQua[0].v) > MAT - 200) break; // đã thấy nước thắng (hoặc thua chắc), không cần tìm sâu hơn
  }
  return {
    xep: ketQua.map((x) => ({ nuoc: kyHieu({ den: [(x.o / COT) | 0, x.o % COT] }), diem: x.v || 0 })),
    doSau,
    nodes,
  };
}
