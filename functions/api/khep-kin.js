// Cloudflare Pages Function: khép kín, tạo và vào trận bằng link (mọi loại cờ). Trận khép kín không tính điểm.
//  - "tao" {tro_choi}: người tạo là tài khoản hoặc khách (mã khách x-khach-id, tên tự nhập). Link có hạn 24 giờ hoặc đến khi người tạo
//    vô hiệu hóa. Khách tạo link có giới hạn số lượng để không ai tạo tràn bản ghi.
//  - "vao": ai có link cũng vào được (kể cả khách không tài khoản). Người vào trước thì trận bắt đầu, người sau bị từ chối.
//  - "huy": người tạo vô hiệu hóa link khi chưa có ai vào.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra, headerAdmin, thieuCauHinh, troChoiCua } from "../_lib/pocketbase.js";
import { layNguoi, docTran, capNhatTran, taoTran, sauPhut, donTranCu, MAU_MA, BANG_TRAN } from "../_lib/tran.js";
import { lamSachTen, tenHopLe } from "../../src/lib/chung/ten.js";
import { maKhepKinConHieuLuc, GIAY_MOI_NUOC, HAN_KHEP_KIN_GIO } from "../../src/lib/chung/tran.js";

// Giới hạn link do khách tạo trong 10 phút, ba mức:
//  - mỗi mã khách trên một IP: 10 (người dùng chung mạng như 4G, wifi trường không chặn lẫn nhau)
//  - mỗi IP: 50 (mã khách do trình duyệt tự sinh, đổi mã liên tục cũng chỉ tới đây)
//  - toàn hệ thống: 150 (khoảng 1/3 sức chứa ước tính của VPS, phòng khi dùng nhiều IP)
// Tài khoản không bị giới hạn. IP lấy từ header CF-Connecting-IP (Cloudflare gắn, người gọi không giả được), chỉ lưu mã băm.
const KHACH_MOI_MA = 10;
const KHACH_MOI_IP = 50;
const KHACH_TOAN_BO = 150;
const KHUNG_KHACH_MS = 10 * 60 * 1000;

// Mã băm IP: HMAC-SHA256 với khóa bí mật (mật khẩu admin, không nằm trong mã nguồn) để không dò ngược ra IP được.
// Đổi khóa thì mã băm đổi theo, chỉ làm bộ đếm 10 phút bắt đầu lại.
async function bamIp(request, khoa) {
  const ip = request.headers.get("cf-connecting-ip") || "";
  if (!ip) return "";
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(khoa), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const ky = new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(ip)));
  return [...ky.slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function khachTaoQuaNhieu(pb, H, idKhach, ipBam) {
  const tu = new Date(Date.now() - KHUNG_KHACH_MS).toISOString().replace("T", " ");
  const dem = async (loc) => {
    const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=1&fields=id&filter=${encodeURIComponent(`loai="khep_kin" && created>="${tu}" && ${loc}`)}`, { headers: H });
    if (!r.ok) throw new Error("khong_doc_duoc");
    return (await r.json()).totalItems;
  };
  // Không có IP (chạy thử ở máy) thì chỉ đếm theo mã khách và toàn hệ thống
  const [cuaMa, cuaIp, toanBo] = await Promise.all([
    dem(ipBam ? `do="${idKhach}" && ip_bam="${ipBam}"` : `do="${idKhach}"`),
    ipBam ? dem(`ip_bam="${ipBam}"`) : 0,
    dem(`ip_bam!=""`), // chỉ link khách mới có ip_bam ("k_%" trong LIKE còn khớp cả mã tài khoản bắt đầu bằng "k")
  ]);
  return cuaMa >= KHACH_MOI_MA || cuaIp >= KHACH_MOI_IP || toanBo >= KHACH_TOAN_BO;
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (thieuCauHinh(env)) return tra(503, { loi: "chua_cau_hinh" });
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
    const troChoi = troChoiCua(body.tro_choi);
    if (!troChoi) return tra(400, { loi: "tro_choi_khong_hop_le" });
    // Tài khoản thì dùng tên hồ sơ (chưa có thì trình duyệt tạo tên rồi thử lại), khách thì tự nhập (không bắt buộc)
    if (nguoi.tai_khoan && !nguoi.ten) return tra(409, { loi: "chua_co_ten" });
    let ten = nguoi.ten;
    let ipBam = "";
    if (!nguoi.tai_khoan) {
      try {
        ipBam = await bamIp(request, env.PB_ADMIN_PASSWORD);
        if (await khachTaoQuaNhieu(pb, H, nguoi.id, ipBam)) return tra(429, { loi: "tao_qua_nhieu" });
      } catch {
        return tra(502, { loi: "khong_ket_noi_pocketbase" });
      }
      const nhap = lamSachTen(typeof body.ten_khach === "string" ? body.ten_khach : "");
      ten = tenHopLe(nhap) ? nhap : "Khách";
    }
    const ma = crypto.randomUUID().replace(/-/g, "");
    const r = await taoTran(pb, H, {
      ma,
      tro_choi: troChoi.ma,
      loai: "khep_kin",
      trang_thai: "cho",
      do: nguoi.id,
      ten_do: ten,
      nuoc: [],
      het_han: sauPhut(HAN_KHEP_KIN_GIO * 3600),
      ip_bam: ipBam,
    });
    if (!r.ok) return tra(502, { loi: "khong_tao_duoc" });
    waitUntil(donTranCu(pb, H).catch(() => {})); // dọn link cũ sau khi đã trả lời, lỗi thì để lần sau
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
