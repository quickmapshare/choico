// Máy trên sảnh thượng đài: mỗi mức có một con máy đứng sẵn trên đài như người chơi, người khác thách đấu được.
// Máy không có tài khoản và không tính nước trên server: người thách đấu chơi như trận với máy, trình duyệt của họ tính nước
// của máy (cùng mức, cùng thời gian nghĩ) rồi gửi lên (xem TrangTran.astro). Server chỉ kiểm luật, nên chỉ người thách đấu được
// cộng trừ điểm. Không phải route.
import { laMay, TIEN_TO_MAY, soDaiConHieuLuc } from "../../src/lib/co-tuong-tran.js";
import { BANG_TRAN, taoTran } from "./tran.js";

export { laMay };
export const MUC_MAY = [1, 2, 3, 4, 5];
export const tenMay = (muc) => `Máy mức ${muc}`;

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
