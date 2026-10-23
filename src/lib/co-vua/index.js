// Bộ luật cờ vua theo giao diện chung cho mọi loại cờ (xem src/lib/tro-choi.js).
// Thế cờ: { b, s, nhap, qua, n50, dem } (xem ./luat.js); bên "r" là trắng, đi trước.
import * as L from "./luat.js";

const luat = {
  ma: "co_vua",
  HANG: 8,
  COT: 8,
  NUOC_TOI_DA: L.NUOC_TOI_DA,
  MAU_KY: L.MAU_KY,

  khoiTao: L.khoiTao,
  saoChep: L.saoChep,
  nuocHopLe: L.nuocHopLe,
  timNuoc: L.timNuoc,
  apDung: L.apDung,
  apKy: L.apKy,
  kyHieu: L.kyHieu,
  biChieu: (the, s) => L.biChieu(the.b, s),
  quanBiAn: (the) => L.quanBiAn(the.b),
  ketThucNhanh: L.ketThucNhanh,
  ketThuc: L.ketThuc,
};

export default luat;
