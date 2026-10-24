// Cloudflare Pages Function: sảnh thượng đài, mỗi loại cờ một sảnh riêng (tham số tro_choi, thiếu là cờ tướng). Phải đăng
// nhập (cả người lên đài lẫn người thách đấu). Ván có tính điểm như đấu máy, vào bảng điểm của loại cờ đó.
//  - GET ?tro_choi=...: danh sách người đang trên đài mà bạn thách đấu được, và trận đang dở của bạn (nếu có).
//  - POST "len_dai" {tro_choi, che_do: "cung" | "moi"}: lên đài. "cung": chỉ người cùng mức thấy và thách đấu được. "moi": mọi người đã đăng nhập đều được.
//  - POST "roi_dai" {ma}: rời đài khi chưa có ai thách đấu.
//  - POST "vao_dai" {ma}: thách đấu một người đang trên đài. Ai vào trước thì trận bắt đầu.
// Mỗi người chỉ có một trận thượng đài chưa xong cùng lúc (tính chung mọi loại cờ). Lên đài mà 30 phút không ai thách đấu thì tự rời đài.
// Mỗi mức có sẵn một máy đứng trên đài (xem _lib/may-dai.js): thách đấu máy thì đánh như trận với máy (trình duyệt tính nước của máy),
// chỉ người chơi được cộng trừ điểm.
// Secret cần đặt trong Cloudflare Pages: PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD. Biến PB_URL lấy từ build.
import { tra, headerAdmin, thieuCauHinh, troChoiCua, loc } from "../_lib/pocketbase.js";
import { tenBangDiem } from "../../src/lib/chung/ten.js";
import { locTroChoi } from "../../src/lib/tro-choi.js";
import { layNguoi, docTran, capNhatTran, taoTran, sauPhut, baoTinHieu, donTranCu, troChoiTran, BANG_TRAN, MAU_MA } from "../_lib/tran.js";
import { docMuc } from "../_lib/diem.js";
import { GIAY_MOI_NUOC, soDaiConHieuLuc, laMay } from "../../src/lib/chung/tran.js";
import { bamDanhMay } from "../_lib/may-dai.js";

// Trận thượng đài chưa xong của người chơi (đang chờ đối thủ hoặc đang đấu)
async function tranDangCo(pb, H, id) {
  const loc2 = `loai="dai" && (do="${id}" || den="${id}") && (trang_thai="cho" || trang_thai="dang_dau")`;
  const r = await fetch(`${pb}/api/collections/${BANG_TRAN}/records?perPage=20&filter=${loc(loc2)}`, { headers: H });
  if (!r.ok) return { loi: "khong_doc_duoc" };
  // Trận chờ quá lâu thì coi như đã rời đài, dọn luôn
  for (const t of (await r.json()).items || []) {
    if (t.trang_thai === "cho" && !soDaiConHieuLuc(t)) {
      await capNhatTran(pb, H, t, { trang_thai: "huy", ly_do: "het_han_sanh" });
      await baoTinHieu(pb, H, troChoiTran(t).chuongSanh);
      continue;
    }
    return { tran: t, troChoi: troChoiTran(t).ma };
  }
  return { tran: null };
}

async function dauVao(request, env) {
  if (thieuCauHinh(env)) return { loiTra: tra(503, { loi: "chua_cau_hinh" }) };
  const pb = env.PB_URL;
  // Kiểm tra người chơi và lấy token admin cùng lúc (hai việc độc lập), đỡ một lượt chờ nối tiếp
  const [nguoi, H] = await Promise.all([layNguoi(pb, request), headerAdmin(env).catch(() => null)]);
  if (!nguoi?.tai_khoan) return { loiTra: tra(401, { loi: "can_dang_nhap" }) };
  if (!nguoi.ten) return { loiTra: tra(409, { loi: "chua_co_ten" }) };
  if (!H) return { loiTra: tra(502, { loi: "khong_ket_noi_pocketbase" }) };
  return { pb, nguoi, H };
}

export async function onRequestGet({ request, env }) {
  const troChoi = troChoiCua(new URL(request.url).searchParams.get("tro_choi"));
  if (!troChoi) return tra(400, { loi: "tro_choi_khong_hop_le" });
  const { loiTra, pb, nguoi, H } = await dauVao(request, env);
  if (loiTra) return loiTra;
  // Ba lượt đọc độc lập nên chạy song song (trước đây nối tiếp nên trang tải lâu). Lọc theo mức làm ở đây, sau khi biết mức.
  const dieuKien = `loai="dai" && trang_thai="cho" && do!="${nguoi.id}" && ${locTroChoi(troChoi.ma)}`;
  await bamDanhMay(pb, H, troChoi.ma); // mỗi mức có sẵn một máy đứng trên đài, trước khi đọc danh sách để máy mới tạo cũng hiện
  const [muc, dangCo, r] = await Promise.all([
    docMuc(pb, H, nguoi.id, troChoi.ma),
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
    cua_toi: dangCo.tran ? { ma: dangCo.tran.ma, trang_thai: dangCo.tran.trang_thai, tro_choi: dangCo.troChoi } : null,
    danh_sach: ds.map((t) => ({ ma: t.ma, ten: laMay(t.do) ? t.ten_do : tenBangDiem(t.ten_do || ""), cap_do: t.cap_do, che_do: t.che_do, may: laMay(t.do) })),
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
    const troChoi = troChoiCua(body.tro_choi);
    if (!troChoi) return tra(400, { loi: "tro_choi_khong_hop_le" });
    if (body.che_do !== "cung" && body.che_do !== "moi") return tra(400, { loi: "che_do_khong_hop_le" });
    const dangCo = await tranDangCo(pb, H, nguoi.id);
    if (dangCo.loi) return tra(502, { loi: dangCo.loi });
    if (dangCo.tran) return tra(409, { loi: "dang_co_tran", ma: dangCo.tran.ma });
    const muc = await docMuc(pb, H, nguoi.id, troChoi.ma);
    if (muc === null) return tra(502, { loi: "khong_doc_duoc_diem" });
    const ma = crypto.randomUUID().replace(/-/g, "");
    const r = await taoTran(pb, H, {
      ma,
      tro_choi: troChoi.ma,
      loai: "dai",
      che_do: body.che_do,
      cap_do: muc,
      trang_thai: "cho",
      do: nguoi.id,
      ten_do: nguoi.ten,
      nuoc: [],
    });
    if (!r.ok) return tra(502, { loi: "khong_len_dai_duoc" });
    await baoTinHieu(pb, H, troChoi.chuongSanh); // người khác trong sảnh thấy ngay người vừa lên đài
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
    await baoTinHieu(pb, H, troChoiTran(tran).chuongSanh);
    return tra(200, { ok: true });
  }

  if (body.hanh_dong === "vao_dai") {
    if (tran.do === nguoi.id) return tra(409, { loi: "la_dai_cua_ban" });
    if (tran.trang_thai !== "cho" || !soDaiConHieuLuc(tran)) return tra(409, { loi: "da_co_nguoi_vao" });
    // Thượng đài cùng mức: người thách đấu phải cùng mức với người trên đài
    if (tran.che_do === "cung") {
      const muc = await docMuc(pb, H, nguoi.id, troChoiTran(tran).ma);
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
      han_nuoc: laMay(tran.do) ? "" : sauPhut(GIAY_MOI_NUOC), // máy đi trước và không có hạn nước
    });
    if (!r.ok) return tra(502, { loi: "khong_vao_duoc" });
    await baoTinHieu(pb, H, troChoiTran(tran).chuongSanh); // người này rời khỏi danh sách chờ
    // Hai người cùng thách đấu một lúc: đọc lại, chỉ người ghi cuối được coi là đã vào
    const sau = await docTran(pb, H, ma);
    if (sau.loi || sau.tran?.den !== nguoi.id) return tra(409, { loi: "da_co_nguoi_vao" });
    return tra(200, { ma });
  }

  return tra(400, { loi: "hanh_dong_khong_hop_le" });
}
