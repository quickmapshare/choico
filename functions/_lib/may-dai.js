// Máy trên sảnh thượng đài: mỗi loại cờ, mỗi mức có một con máy đứng sẵn trên đài như người chơi, người khác thách đấu được.
// Máy không có tài khoản và không tính nước trên server: người thách đấu chơi như trận với máy, trình duyệt của họ tính nước
// của máy (cùng mức, cùng thời gian nghĩ) rồi gửi lên (xem TrangTran.astro). Server chỉ kiểm luật, nên chỉ người thách đấu được
// cộng trừ điểm. Không phải route.
import { laMay, TIEN_TO_MAY } from "../../src/lib/chung/tran.js";
import { MUC_TOI_DA } from "../../src/lib/chung/diem.js";
import { locTroChoi, TRO_CHOI_MAC_DINH } from "../../src/lib/tro-choi.js";
import { BANG_TRAN, taoTran, xoaTran } from "./tran.js";

export { laMay };
export const MUC_MAY = Array.from({ length: MUC_TOI_DA }, (_, i) => i + 1);
export const tenMay = (muc) => `Máy mức ${muc}`;
const TOI_DA_DON_MOI_LAN = 5;

// Mỗi mức luôn có một máy đang chờ trên đài. Máy vừa có người thách đấu (hoặc trận kết thúc) thì tạo máy mới cho mức đó.
// Gọi khi trả danh sách sảnh, nên mức nào hết máy sẽ có lại ngay lần sau có người mở sảnh.
export async function bamDanhMay(pb, H, troChoi = TRO_CHOI_MAC_DINH) {
  const r = await fetch(
    `${pb}/api/collections/${BANG_TRAN}/records?perPage=100&sort=created&fields=id,do,cap_do,tin_hieu&filter=${encodeURIComponent(`loai="dai" && trang_thai="cho" && do~"${TIEN_TO_MAY}%" && ${locTroChoi(troChoi)}`)}`,
    { headers: H },
  );
  if (!r.ok) return;
  // Bộ lọc đã giới hạn loại và trạng thái, nên không cần kiểm lại (kiểm lại cần đủ trường, mà ở đây chỉ đọc vài trường)
  const dangCho = new Map(); // mức -> máy đầu tiên (cũ nhất) đang chờ
  const thua = []; // máy trùng mức: giữ một, bỏ các bản còn lại
  for (const t of ((await r.json()).items || []).filter((x) => laMay(x.do))) {
    if (dangCho.has(t.cap_do)) thua.push(t);
    else dangCho.set(t.cap_do, t);
  }
  // Dọn dần: mỗi lần tối đa vài bản, vì mỗi lần xóa là hai lời gọi PocketBase và một yêu cầu Cloudflare chỉ được gọi ra ngoài
  // một số lượng có hạn. Dọn hàng trăm bản một lúc làm cả sảnh lỗi; nhiều lần tải sảnh sẽ dọn hết.
  await Promise.all(thua.slice(0, TOI_DA_DON_MOI_LAN).map((t) => xoaTran(pb, H, t)));
  await Promise.all(
    MUC_MAY.filter((muc) => !dangCho.has(muc)).map((muc) =>
      taoTran(pb, H, {
        ma: crypto.randomUUID().replace(/-/g, ""),
        tro_choi: troChoi,
        loai: "dai",
        che_do: "cung",
        cap_do: muc,
        trang_thai: "cho",
        do: `${TIEN_TO_MAY}${muc}`,
        ten_do: tenMay(muc),
        nuoc: [],
      }).catch(() => {}),
    ),
  );
}
