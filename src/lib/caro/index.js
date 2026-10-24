// Bộ luật cờ caro theo giao diện chung cho mọi loại cờ (xem src/lib/tro-choi.js).
// Thế cờ: { b, s }; b là lưới 15 x 15 "r"/"b"/null (không có "loại" quân), s là bên đến lượt ("r" đi trước).
// Không ăn quân, không chiếu nên quanBiAn luôn rỗng và biChieu luôn false.
import * as L from "./luat.js";

const luat = {
  ma: "caro",
  HANG: 15,
  COT: 15,
  NUOC_TOI_DA: L.NUOC_TOI_DA,
  MAU_KY: L.MAU_KY,

  khoiTao: L.khoiTao,
  saoChep: L.saoChep,
  nuocHopLe: L.nuocHopLe,
  timNuoc: L.timNuoc,
  apDung: L.apDung,
  apKy: L.apKy,
  kyHieu: L.kyHieu,
  biChieu: () => false,
  quanBiAn: () => ({ r: [], b: [] }),
  ketThucNhanh: L.ketThucNhanh,
  ketThuc: L.ketThuc,
};

export default luat;
