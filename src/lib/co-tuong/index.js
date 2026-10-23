// Bộ luật cờ tướng theo giao diện chung cho mọi loại cờ (xem src/lib/tro-choi.js).
// Thế cờ: { b, s }; b là lưới 10 x 9 kiểu "rK", "bR" hoặc null, s là bên đến lượt ("r" đỏ đi trước, "b" đen).
import * as L from "./luat.js";

const luat = {
  ma: "co_tuong",
  HANG: 10,
  COT: 9,
  NUOC_TOI_DA: L.NUOC_TOI_DA,
  MAU_KY: L.MAU_KY,

  khoiTao: () => ({ b: L.khoiTao(), s: "r" }),
  saoChep: (the) => ({ b: the.b.map((h) => h.slice()), s: the.s }),
  nuocHopLe: (the) => L.nuocHopLe(the.b, the.s),
  timNuoc: (the, ky) => L.timNuoc(the.b, the.s, ky),
  kyHieu: L.kyHieu,
  biChieu: (the, s) => L.biChieu(the.b, s),
  quanBiAn: (the) => L.quanBiAn(the.b),

  // Đi nước m (đã hợp lệ) rồi đổi lượt
  apDung(the, m) {
    L.apDung(the.b, m);
    the.s = L.doiBen(the.s);
  },

  // Đi theo ký hiệu mà không kiểm luật (nước đã được kiểm khi ghi). Ký hiệu hỏng hoặc ô đi không có quân của bên đến lượt thì null.
  apKy(the, ky) {
    const m = L.nuocTuKy(ky);
    if (!m || the.b[m.tu[0]][m.tu[1]]?.[0] !== the.s) return null;
    m.an = the.b[m.den[0]][m.den[1]];
    luat.apDung(the, m);
    return m;
  },

  // Kết thúc không cần sinh nước: đủ số nước tối đa thì hòa
  ketThucNhanh: (the, soNuoc) => (soNuoc >= L.NUOC_TOI_DA ? { ket_qua: "hoa", ly_do: "het_nuoc_hoa" } : null),

  // Ván kết thúc chưa sau soNuoc nước. Bên đến lượt hết nước đi (bị chiếu bí hoặc hết cờ) thì thua.
  ketThuc(the, soNuoc) {
    if (L.nuocHopLe(the.b, the.s).length === 0) return { ket_qua: the.s === "b" ? "do" : "den", ly_do: "het_nuoc" };
    return luat.ketThucNhanh(the, soNuoc);
  },
};

export default luat;
