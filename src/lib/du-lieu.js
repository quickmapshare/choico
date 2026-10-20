// Lấy dữ liệu chợ từ PocketBase lúc build (superuser, vì mọi rule collection là null).
// Không có PB_URL thì trả về rỗng để build vẫn chạy được khi chưa cấu hình.
// Chỉ đưa ra ngoài bản đã xác minh cho lịch phiên; chợ chưa xác minh vẫn hiện tên và địa chỉ, không hiện lịch.

const TRANG = 500;
let cache = null;

async function dangNhap(base, email, password) {
  const r = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error(`Đăng nhập PocketBase thất bại: ${r.status}`);
  return (await r.json()).token;
}

async function layTatCa(base, token, collection, expand = "") {
  const items = [];
  for (let page = 1; ; page++) {
    const url = `${base}/api/collections/${collection}/records?perPage=${TRANG}&page=${page}${expand}`;
    const r = await fetch(url, { headers: { authorization: token } });
    if (!r.ok) throw new Error(`Đọc ${collection} thất bại: ${r.status}`);
    const j = await r.json();
    items.push(...j.items);
    if (page >= j.totalPages) return items;
  }
}

export async function taiDuLieu() {
  if (cache) return cache;
  const base = (process.env.PB_URL ?? "").replace(/\/$/, "");
  if (!base) {
    console.warn("PB_URL chưa đặt: build không có dữ liệu chợ.");
    cache = { khuVuc: [], cho: [] };
    return cache;
  }
  const token = await dangNhap(base, process.env.PB_ADMIN_EMAIL, process.env.PB_ADMIN_PASSWORD);
  const khuVuc = await layTatCa(base, token, "cho_phien_khu_vuc");
  const cho = await layTatCa(base, token, "cho_phien_cho");
  const khuTheoId = new Map(khuVuc.map((k) => [k.id, k]));
  // Gắn tỉnh/thành cho từng xã/phường (trường cha)
  for (const k of khuVuc) k.tinh = khuTheoId.get(k.cha) ?? null;
  const choDaGhep = cho.map((c) => ({
    ...c,
    khu: khuTheoId.get(c.khu_vuc) ?? null,
    lich: c.trang_thai_xac_minh === "da_xac_minh" ? c.lich_phien ?? [] : null,
  }));
  cache = { khuVuc, cho: choDaGhep };
  return cache;
}
