// Đi lại một ván từ danh sách nước, dùng chung cho mọi loại cờ (trình duyệt, Pages Function, test).
// luat: bộ luật của loại cờ (src/lib/tro-choi.js). Nước đi lưu dạng ký hiệu, bên đi trước ("r") đi nước đầu.
// ket_qua theo bên: "do" là bên đi trước thắng, "den" là bên đi sau thắng, "hoa".

// Dựng thế cờ sau k nước đầu. kiemLuat = false: nước đã được kiểm khi ghi (trận trên server), chỉ đặt quân lên bàn.
// Trả về { hop_le, the, nuocCuoi: [ô rời, ô đến] | null, anCuoi: quân bị ăn gần nhất | null, m: nước cuối | null }.
// Nước sai luật, hoặc còn nước sau khi ván đã hết (hòa vì đủ số nước, lặp thế...), thì hop_le = false.
export function phatLai(luat, nuoc, { kiemLuat = true, den = nuoc.length } = {}) {
  const the = luat.khoiTao();
  let nuocCuoi = null;
  let anCuoi = null;
  let m = null;
  for (let i = 0; i < den; i++) {
    const ky = nuoc[i];
    if (typeof ky !== "string") return { hop_le: false, the, nuocCuoi, anCuoi, m };
    if (kiemLuat) {
      m = luat.ketThucNhanh(the, i) ? null : luat.timNuoc(the, ky);
      if (m) luat.apDung(the, m);
    } else {
      m = luat.apKy(the, ky);
    }
    if (!m) return { hop_le: false, the, nuocCuoi, anCuoi, m };
    nuocCuoi = [m.tu, m.den];
    if (m.an) anCuoi = m.an;
  }
  return { hop_le: true, the, nuocCuoi, anCuoi, m };
}

// Thế cờ sau soNuoc nước: ván kết thúc chưa
export function trangThaiVan(luat, the, soNuoc) {
  const kt = luat.ketThuc(the, soNuoc);
  return kt ? { ket_thuc: true, ket_qua: kt.ket_qua, ly_do: kt.ly_do } : { ket_thuc: false, ket_qua: null, ly_do: null };
}

// Dựng lại cả ván và kiểm luật từng nước. Trả về { hop_le: false } nếu có nước sai luật.
// Nếu hợp lệ: { hop_le, the, s (bên đến lượt), ket_thuc, ket_qua ("do"|"den"|"hoa"|null), ly_do }
export function duyetNuoc(luat, nuoc) {
  const p = phatLai(luat, nuoc);
  if (!p.hop_le) return { hop_le: false };
  return { hop_le: true, the: p.the, s: p.the.s, ...trangThaiVan(luat, p.the, nuoc.length) };
}

// Thêm một nước vào ván (server dùng mỗi lần đi nước). Các nước cũ đã được kiểm luật lúc ghi nên chỉ đặt lên bàn: chi phí
// không tăng theo độ dài ván. Chỉ nước mới được kiểm luật đầy đủ.
// Trả về như duyetNuoc([...nuocCu, ky]) kèm m (nước vừa đi); danh sách cũ không dựng lại được thì { hop_le: false, van_hong: true }.
export function themNuoc(luat, nuocCu, ky) {
  const p = phatLai(luat, nuocCu, { kiemLuat: false });
  if (!p.hop_le) return { hop_le: false, van_hong: true };
  const m = luat.ketThucNhanh(p.the, nuocCu.length) ? null : luat.timNuoc(p.the, ky);
  if (!m) return { hop_le: false };
  luat.apDung(p.the, m);
  return { hop_le: true, the: p.the, s: p.the.s, m, ...trangThaiVan(luat, p.the, nuocCu.length + 1) };
}

// Xác minh ván đấu máy để tính điểm: người chơi cầm bên đi trước. Ván phải hợp lệ và đã kết thúc.
// Trả về { hop_le, ket_qua } với ket_qua là "thang", "thua" hoặc "hoa" theo người chơi.
export function xacMinhVan(luat, nuoc) {
  if (!Array.isArray(nuoc) || nuoc.length > luat.NUOC_TOI_DA) return { hop_le: false };
  const d = duyetNuoc(luat, nuoc);
  if (!d.hop_le || !d.ket_thuc) return { hop_le: false }; // ván chưa kết thúc thì không tính điểm
  return { hop_le: true, ket_qua: d.ket_qua === "do" ? "thang" : d.ket_qua === "den" ? "thua" : "hoa" };
}
