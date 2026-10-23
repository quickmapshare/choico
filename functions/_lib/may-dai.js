// Máy trên sảnh thượng đài: mỗi mức có một con máy đứng sẵn trên đài như người chơi, người khác thách đấu được.
// Máy không có tài khoản và không tính nước trên server: người thách đấu chơi như trận với máy, trình duyệt của họ tính nước
// của máy (cùng mức, cùng thời gian nghĩ) rồi gửi lên (xem TrangTran.astro). Server chỉ kiểm luật, nên chỉ người thách đấu được
// cộng trừ điểm. Không phải route.
import { laMay, TIEN_TO_MAY } from "../../src/lib/co-tuong-tran.js";
import { BANG_TRAN, BANG_TIN_HIEU, TIN_HIEU_SANH, taoTran } from "./tran.js";

export { laMay };
export const MUC_MAY = [1, 2, 3, 4, 5];
export const tenMay = (muc) => `Máy mức ${muc}`;

// Xóa một trận máy thừa kèm chuông của nó (chuông chung của sảnh thì giữ)
async function xoaTran(pb, H, t) {
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records/${t.id}`, { method: "DELETE", headers: H });
  if (r.ok && t.tin_hieu && t.tin_hieu !== TIN_HIEU_SANH) {
    await fetch(`${pb}/api/collections/${BANG_TIN_HIEU}/records/${t.tin_hieu}`, { method: "DELETE", headers: H });
  }
}

// Mỗi mức luôn có một máy đang chờ trên đài. Máy vừa có người thách đấu (hoặc trận kết thúc) thì tạo máy mới cho mức đó.
// Gọi khi trả danh sách sảnh, nên mức nào hết máy sẽ có lại ngay lần sau có người mở sảnh.
export async function bamDanhMay(pb, H) {
  const r = await fetch(
    `${pb}/api/collections/${BANG_TRAN}/records?perPage=100&sort=created&fields=id,do,cap_do,tin_hieu&filter=${encodeURIComponent(`loai="dai" && trang_thai="cho" && do~"${TIEN_TO_MAY}%"`)}`,
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
  await Promise.all(thua.map((t) => xoaTran(pb, H, t)));
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
