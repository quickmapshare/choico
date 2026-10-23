// Máy trên sảnh thượng đài: mỗi mức có một con máy đứng sẵn trên đài như người chơi, người khác thách đấu được.
// Máy đánh đúng như trận với máy (cùng mức, cùng thời gian nghĩ), chỉ khác là đi trên server và không có tài khoản,
// nên chỉ người thách đấu được cộng trừ điểm. Không phải route.
import { timNuocMay } from "../../src/lib/co-tuong-may.js";
import { chonTrongDinh } from "../../src/lib/co-tuong.js";
import { MUC, thoiGianNghi } from "../../src/lib/co-tuong-muc.js";
import { duyetNuoc, benDenLuot, GIAY_MOI_NUOC, laMay, TIEN_TO_MAY, soDaiConHieuLuc } from "../../src/lib/co-tuong-tran.js";
import { BANG_TRAN, taoTran, capNhatTran, ketThucTran, sauPhut } from "./tran.js";

export { laMay };
export const MUC_MAY = [1, 2, 3, 4, 5];
export const tenMay = (muc) => `Máy mức ${muc}`;

// Nước đi của máy bên r (đỏ, bên đã đăng ký trận thượng đài) trên bàn b, theo đúng cách trận với máy chọn nước.
// lichSu: các nước đã đi (ký hiệu), để nhận ra thế lặp và luật hòa 120 nước.
export function nuocMay(b, muc, lichSu) {
  const kq = timNuocMay(b, "r", { ...MUC[muc], thoiGianMs: thoiGianNghi(muc), pst: true, lichSu });
  const chon = chonTrongDinh(kq.xep);
  return chon ? chon.nuoc : null;
}

// Nếu đang đến lượt máy thì máy đi một nước rồi lưu lại. Trả về trận sau khi máy đi (hoặc nguyên trận nếu không cần đi).
// Máy luôn là bên đỏ (người tạo trận). Máy không bao giờ hết giờ nên không có hạn nước cho máy.
export async function diNuocMay(pb, H, tran) {
  if (!laMay(tran.do) || tran.trang_thai !== "dang_dau") return tran;
  const nuoc = tran.nuoc || [];
  const hienTai = duyetNuoc(nuoc);
  if (!hienTai.hop_le || hienTai.ket_thuc || benDenLuot(nuoc.length) !== "r") return tran;

  const ky = nuocMay(hienTai.b, tran.cap_do, nuoc);
  if (!ky) return tran;
  const nuocMoi = [...nuoc, ky];
  const sau = duyetNuoc(nuocMoi);
  if (!sau.hop_le) return tran;

  if (sau.ket_thuc) {
    await ketThucTran(pb, H, tran, { ket_qua: sau.ket_qua, ly_do: sau.ly_do, nuoc: nuocMoi });
    return { ...tran, nuoc: nuocMoi, trang_thai: "ket_thuc", ket_qua: sau.ket_qua, ly_do: sau.ly_do, han_nuoc: "" };
  }
  const hanMoi = sauPhut(GIAY_MOI_NUOC);
  await capNhatTran(pb, H, tran, { nuoc: nuocMoi, han_nuoc: hanMoi });
  return { ...tran, nuoc: nuocMoi, han_nuoc: hanMoi };
}

// Mỗi mức luôn có một máy đang chờ trên đài. Máy vừa có người thách đấu (hoặc trận kết thúc) thì tạo máy mới cho mức đó.
// Gọi khi trả danh sách sảnh, nên mức nào hết máy sẽ có lại ngay lần sau có người mở sảnh.
export async function bamDanhMay(pb, H) {
  const r = await fetch(
    `${pb}/api/collections/${BANG_TRAN}/records?perPage=50&fields=id,do,cap_do,created&filter=${encodeURIComponent(`loai="dai" && trang_thai="cho" && do~"${TIEN_TO_MAY}%"`)}`,
    { headers: H },
  );
  if (!r.ok) return;
  const dangCho = new Set(((await r.json()).items || []).filter((t) => laMay(t.do) && soDaiConHieuLuc(t)).map((t) => t.cap_do));
  await Promise.all(
    MUC_MAY.filter((muc) => !dangCho.has(muc)).map((muc) =>
      taoTran(pb, H, {
        ma: crypto.randomUUID().replace(/-/g, ""),
        loai: "dai",
        che_do: "cung",
        cap_do: muc,
        trang_thai: "cho",
        do: `${TIEN_TO_MAY}${muc}`,
        ten_do: tenMay(muc),
        nuoc: [],
        da_tinh_diem: false,
      }).catch(() => {}),
    ),
  );
}
