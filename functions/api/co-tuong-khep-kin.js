// Cloudflare Pages Function: khép kín, tạo và vào trận bằng link. Trận khép kín không tính điểm.
//  - "tao": người tạo là tài khoản hoặc khách (mã khách x-khach-id, tên tự nhập). Link có hạn 24 giờ hoặc đến khi người tạo
//    vô hiệu hóa. Khách tạo link có giới hạn số lượng để không ai tạo tràn bản ghi.
//  - "vao": ai có link cũng vào được (kể cả khách không tài khoản). Người vào trước thì trận bắt đầu, người sau bị từ chối.
//  - "huy": người tạo vô hiệu hóa link khi chưa có ai vào.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra } from "../_lib/pocketbase.js";
import { layNguoi, headerAdmin, docTran, capNhatTran, taoTran, sauPhut, MAU_MA, BANG_TRAN } from "../_lib/tran.js";
import { lamSachTen, tenHopLe } from "../../src/lib/co-tuong.js";
import { maKhepKinConHieuLuc, GIAY_MOI_NUOC, HAN_KHEP_KIN_GIO } from "../../src/lib/co-tuong-tran.js";

// Giới hạn link do khách tạo: mỗi mã khách tối đa 5 link đang chờ trong 10 phút, toàn hệ thống tối đa 200 link khách trong
// 10 phút (mã khách do trình duyệt tự sinh nên chỉ giới hạn theo mã thì đổi mã là lách được).
const KHACH_MOI_MA = 5;
const KHACH_TOAN_BO = 200;
const KHUNG_KHACH_MS = 10 * 60 * 1000;

async function khachTaoQuaNhieu(pb, H, idKhach) {
  const tu = new Date(Date.now() - KHUNG_KHACH_MS).toISOString().replace("T", " ");
  const dem = async (loc) => {
    const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=1&fields=id&filter=${encodeURIComponent(loc)}`, { headers: H });
    if (!r.ok) throw new Error("khong_doc_duoc");
    return (await r.json()).totalItems;
  };
  const [cuaMa, toanBo] = await Promise.all([
    dem(`loai="khep_kin" && do="${idKhach}" && trang_thai="cho" && created>="${tu}"`),
    dem(`loai="khep_kin" && do~"k_%" && created>="${tu}"`),
  ]);
  return cuaMa >= KHACH_MOI_MA || toanBo >= KHACH_TOAN_BO;
}

export async function onRequestPost({ request, env }) {
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return tra(503, { loi: "chua_cau_hinh" });
  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const pb = env.PB_URL;
  const nguoi = await layNguoi(pb, request);
  if (!nguoi) return tra(401, { loi: "chua_co_danh_tinh" });

  let H;
  try {
    H = await headerAdmin(env);
  } catch {
    return tra(502, { loi: "khong_ket_noi_pocketbase" });
  }

  if (body?.hanh_dong === "tao") {
    // Tài khoản thì dùng tên hồ sơ (chưa có thì trình duyệt tạo tên rồi thử lại), khách thì tự nhập (không bắt buộc)
    if (nguoi.tai_khoan && !nguoi.ten) return tra(409, { loi: "chua_co_ten" });
    let ten = nguoi.ten;
    if (!nguoi.tai_khoan) {
      try {
        if (await khachTaoQuaNhieu(pb, H, nguoi.id)) return tra(429, { loi: "tao_qua_nhieu" });
      } catch {
        return tra(502, { loi: "khong_ket_noi_pocketbase" });
      }
      const nhap = lamSachTen(typeof body.ten_khach === "string" ? body.ten_khach : "");
      ten = tenHopLe(nhap) ? nhap : "Khách";
    }
    const ma = crypto.randomUUID().replace(/-/g, "");
    const r = await taoTran(pb, H, {
      ma,
      loai: "khep_kin",
      trang_thai: "cho",
      do: nguoi.id,
      ten_do: ten,
      nuoc: [],
      het_han: sauPhut(HAN_KHEP_KIN_GIO * 3600),
      da_tinh_diem: false,
    });
    if (!r.ok) return tra(502, { loi: "khong_tao_duoc" });
    return tra(200, { ma });
  }

  const ma = typeof body?.ma === "string" ? body.ma : "";
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });
  const { tran, loi } = await docTran(pb, H, ma);
  if (loi) return tra(502, { loi });
  if (!tran || tran.loai !== "khep_kin") return tra(404, { loi: "khong_tim_thay" });

  if (body.hanh_dong === "huy") {
    if (tran.do !== nguoi.id) return tra(403, { loi: "khong_phai_nguoi_tao" });
    if (tran.trang_thai !== "cho") return tra(409, { loi: "khong_the_huy" });
    const r = await capNhatTran(pb, H, tran, { trang_thai: "huy", ly_do: "nguoi_tao_huy" });
    if (!r.ok) return tra(502, { loi: "khong_huy_duoc" });
    return tra(200, { ok: true });
  }

  if (body.hanh_dong === "vao") {
    if (tran.do === nguoi.id) return tra(409, { loi: "la_link_cua_ban" });
    if (tran.trang_thai !== "cho") return tra(409, { loi: "da_co_nguoi_vao" });
    if (!maKhepKinConHieuLuc(tran)) return tra(410, { loi: "link_het_han" });

    // Tên người vào: tài khoản thì lấy tên hồ sơ, khách thì tự nhập (không bắt buộc)
    let ten = nguoi.ten;
    if (!ten) {
      const nhap = lamSachTen(typeof body.ten_khach === "string" ? body.ten_khach : "");
      ten = tenHopLe(nhap) ? nhap : "Khách";
    }
    const r = await capNhatTran(pb, H, tran, {
      den: nguoi.id,
      ten_den: ten,
      trang_thai: "dang_dau",
      han_nuoc: sauPhut(GIAY_MOI_NUOC),
    });
    if (!r.ok) return tra(502, { loi: "khong_vao_duoc" });
    // Hai người cùng vào gần như một lúc: đọc lại, chỉ người ghi cuối được coi là đã vào
    const sau = await docTran(pb, H, ma);
    if (sau.loi || sau.tran?.den !== nguoi.id) {
      return tra(409, { loi: "da_co_nguoi_vao" });
    }
    return tra(200, { ma });
  }

  return tra(400, { loi: "hanh_dong_khong_hop_le" });
}
