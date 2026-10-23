// Cloudflare Pages Function: sảnh thượng đài. Phải đăng nhập (cả người lên đài lẫn người thách đấu). Ván có tính điểm như đấu máy.
//  - GET: danh sách người đang trên đài mà bạn thách đấu được, và trận đang dở của bạn (nếu có).
//  - POST "len_dai" {che_do: "cung" | "moi"}: lên đài. "cung": chỉ người cùng mức thấy và thách đấu được. "moi": mọi người đã đăng nhập đều được.
//  - POST "roi_dai" {ma}: rời đài khi chưa có ai thách đấu.
//  - POST "vao_dai" {ma}: thách đấu một người đang trên đài. Ai vào trước thì trận bắt đầu.
// Mỗi người chỉ có một trận thượng đài chưa xong cùng lúc. Lên đài mà 30 phút không ai thách đấu thì tự rời đài.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra } from "../_lib/pocketbase.js";
import { tenBangDiem } from "../../src/lib/co-tuong.js";
import { layNguoi, headerAdmin, docTran, capNhatTran, taoTran, sauPhut, baoTinHieu, donTranCu, BANG_TRAN, MAU_MA, TIN_HIEU_SANH } from "../_lib/tran.js";
import { GIAY_MOI_NUOC, HAN_SANH_PHUT, soDaiConHieuLuc } from "../../src/lib/co-tuong-tran.js";

const loc = (c) => encodeURIComponent(c);

// Mức hiện tại của người chơi (1 nếu chưa có điểm)
async function mucCuaToi(pb, H, id) {
  const r = await fetch(`${pb}/api/collections/cho_phien_co_diem/records?perPage=1&filter=${loc(`nguoi_choi="${id}"`)}`, { headers: H });
  if (!r.ok) return null;
  return (await r.json()).items?.[0]?.muc || 1;
}

// Trận thượng đài chưa xong của người chơi (đang chờ đối thủ hoặc đang đấu)
async function tranDangCo(pb, H, id) {
  const loc2 = `loai="dai" && (do="${id}" || den="${id}") && (trang_thai="cho" || trang_thai="dang_dau")`;
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=20&filter=${loc(loc2)}`, { headers: H });
  if (!r.ok) return { loi: "khong_doc_duoc" };
  // Trận chờ quá lâu thì coi như đã rời đài, dọn luôn
  for (const t of (await r.json()).items || []) {
    if (t.trang_thai === "cho" && !soDaiConHieuLuc(t)) {
      await capNhatTran(pb, H, t, { trang_thai: "huy", ly_do: "het_han_sanh" });
      await baoTinHieu(pb, H, TIN_HIEU_SANH);
      continue;
    }
    return { tran: t };
  }
  return { tran: null };
}

async function dauVao(request, env) {
  if (!env.PB_URL || !env.PB_ADMIN_EMAIL || !env.PB_ADMIN_PASSWORD) return { loiTra: tra(503, { loi: "chua_cau_hinh" }) };
  const pb = env.PB_URL;
  // Kiểm tra người chơi và lấy token admin cùng lúc (hai việc độc lập), đỡ một lượt chờ nối tiếp
  const [nguoi, H] = await Promise.all([layNguoi(pb, request), headerAdmin(env).catch(() => null)]);
  if (!nguoi?.tai_khoan) return { loiTra: tra(401, { loi: "can_dang_nhap" }) };
  if (!nguoi.ten) return { loiTra: tra(409, { loi: "chua_co_ten" }) };
  if (!H) return { loiTra: tra(502, { loi: "khong_ket_noi_pocketbase" }) };
  return { pb, nguoi, H };
}

export async function onRequestGet({ request, env }) {
  const { loiTra, pb, nguoi, H } = await dauVao(request, env);
  if (loiTra) return loiTra;
  // Ba lượt đọc độc lập nên chạy song song (trước đây nối tiếp nên trang tải lâu). Lọc theo mức làm ở đây, sau khi biết mức.
  const dieuKien = `loai="dai" && trang_thai="cho" && do!="${nguoi.id}"`;
  const [muc, dangCo, r] = await Promise.all([
    mucCuaToi(pb, H, nguoi.id),
    tranDangCo(pb, H, nguoi.id),
    fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=50&sort=-created&filter=${loc(dieuKien)}`, { headers: H }),
  ]);
  if (muc === null) return tra(502, { loi: "khong_doc_duoc_diem" });
  if (dangCo.loi) return tra(502, { loi: dangCo.loi });
  if (!r.ok) return tra(502, { loi: "khong_doc_duoc_sanh" });

  // Người đang chờ mà mình thách đấu được: cùng mức, hoặc đã chọn mở rộng cho mọi người
  const ds = ((await r.json()).items || []).filter((t) => (t.che_do === "moi" || t.cap_do === muc) && soDaiConHieuLuc(t));
  return tra(200, {
    muc,
    cua_toi: dangCo.tran ? { ma: dangCo.tran.ma, trang_thai: dangCo.tran.trang_thai } : null,
    danh_sach: ds.map((t) => ({ ma: t.ma, ten: tenBangDiem(t.ten_do || ""), cap_do: t.cap_do, che_do: t.che_do })),
  });
}

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const { loiTra, pb, nguoi, H } = await dauVao(request, env);
  if (loiTra) return loiTra;

  if (body?.hanh_dong === "len_dai") {
    if (body.che_do !== "cung" && body.che_do !== "moi") return tra(400, { loi: "che_do_khong_hop_le" });
    const dangCo = await tranDangCo(pb, H, nguoi.id);
    if (dangCo.loi) return tra(502, { loi: dangCo.loi });
    if (dangCo.tran) return tra(409, { loi: "dang_co_tran", ma: dangCo.tran.ma });
    const muc = await mucCuaToi(pb, H, nguoi.id);
    if (muc === null) return tra(502, { loi: "khong_doc_duoc_diem" });
    const ma = crypto.randomUUID().replace(/-/g, "");
    const r = await taoTran(pb, H, {
      ma,
      loai: "dai",
      che_do: body.che_do,
      cap_do: muc,
      trang_thai: "cho",
      do: nguoi.id,
      ten_do: nguoi.ten,
      nuoc: [],
      da_tinh_diem: false,
    });
    if (!r.ok) return tra(502, { loi: "khong_len_dai_duoc" });
    await baoTinHieu(pb, H, TIN_HIEU_SANH); // người khác trong sảnh thấy ngay người vừa lên đài
    waitUntil(donTranCu(pb, H).catch(() => {})); // dọn link cũ sau khi đã trả lời, lỗi thì để lần sau
    return tra(200, { ma });
  }

  const ma = typeof body?.ma === "string" ? body.ma : "";
  if (!MAU_MA.test(ma)) return tra(400, { loi: "ma_khong_hop_le" });
  const { tran, loi } = await docTran(pb, H, ma);
  if (loi) return tra(502, { loi });
  if (!tran || tran.loai !== "dai") return tra(404, { loi: "khong_tim_thay" });

  if (body.hanh_dong === "roi_dai") {
    if (tran.do !== nguoi.id) return tra(403, { loi: "khong_phai_nguoi_len_dai" });
    if (tran.trang_thai !== "cho") return tra(409, { loi: "da_co_nguoi_thach_dau" });
    const r = await capNhatTran(pb, H, tran, { trang_thai: "huy", ly_do: "roi_dai" });
    if (!r.ok) return tra(502, { loi: "khong_roi_duoc" });
    await baoTinHieu(pb, H, TIN_HIEU_SANH);
    return tra(200, { ok: true });
  }

  if (body.hanh_dong === "vao_dai") {
    if (tran.do === nguoi.id) return tra(409, { loi: "la_dai_cua_ban" });
    if (tran.trang_thai !== "cho" || !soDaiConHieuLuc(tran)) return tra(409, { loi: "da_co_nguoi_vao" });
    // Thượng đài cùng mức: người thách đấu phải cùng mức với người trên đài
    if (tran.che_do === "cung") {
      const muc = await mucCuaToi(pb, H, nguoi.id);
      if (muc === null) return tra(502, { loi: "khong_doc_duoc_diem" });
      if (muc !== tran.cap_do) return tra(403, { loi: "khac_muc" });
    }
    const dangCo = await tranDangCo(pb, H, nguoi.id);
    if (dangCo.loi) return tra(502, { loi: dangCo.loi });
    if (dangCo.tran) return tra(409, { loi: "dang_co_tran", ma: dangCo.tran.ma });
    const r = await capNhatTran(pb, H, tran, {
      den: nguoi.id,
      ten_den: nguoi.ten,
      trang_thai: "dang_dau",
      han_nuoc: sauPhut(GIAY_MOI_NUOC),
    });
    if (!r.ok) return tra(502, { loi: "khong_vao_duoc" });
    await baoTinHieu(pb, H, TIN_HIEU_SANH); // người này rời khỏi danh sách chờ
    // Hai người cùng thách đấu một lúc: đọc lại, chỉ người ghi cuối được coi là đã vào
    const sau = await docTran(pb, H, ma);
    if (sau.loi || sau.tran?.den !== nguoi.id) return tra(409, { loi: "da_co_nguoi_vao" });
    return tra(200, { ma });
  }

  return tra(400, { loi: "hanh_dong_khong_hop_le" });
}
