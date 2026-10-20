// Cloudflare Worker chạy theo lịch: AI sơ duyệt góp ý trong hàng chờ cho_phien_gop_y.
// Chỉ gắn ai_khuyen_nghi và ai_ly_do. Không đổi trang_thai, không đưa lên web. Người duyệt vẫn quyết định.
// Secret cần đặt: ANTHROPIC_API_KEY, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD (xem wrangler.toml).

const MODEL = "claude-haiku-5-5";
const GIOI_HAN_MOI_LAN = 20;
const KHUYEN_NGHI = ["nen_nhan", "can_xem_lai", "nen_tu_choi"];

const PROMPT = `Bạn sơ duyệt một góp ý gửi lên trang "Chợ phiên Việt Nam" (thông tin chợ phiên và lịch phiên).
Nhiệm vụ: đánh giá góp ý, KHÔNG tự khẳng định lại thông tin chợ.
Quy tắc:
- Không dùng kiến thức của bạn để xác nhận lịch phiên hay địa chỉ. Chỉ đánh giá nội dung được gửi.
- Chọn một khuyến nghị:
  - "nen_nhan": nội dung cụ thể, có nguồn hoặc có vẻ thật, cần người kiểm tra trước khi nhập.
  - "can_xem_lai": thiếu nguồn, mơ hồ, hoặc có điểm đáng ngờ, cần người xem kỹ.
  - "nen_tu_choi": spam, quảng cáo, chửi bới, nội dung không liên quan, thông tin cá nhân, hoặc thử nghiệm vô nghĩa.
- Lý do ngắn gọn bằng tiếng Việt, một đến hai câu.
- Trả về DUY NHẤT một JSON: {"khuyen_nghi": "...", "ly_do": "..."}

Loại góp ý: {loai}
Chợ liên quan: {cho}
Khu vực: {khu}
Nội dung:
"""{noi_dung}"""
Nguồn: {nguon}
Tên chợ đề xuất: {ten_cho}
Địa chỉ: {dia_chi}`;

async function dangNhap(pb, email, password) {
  const r = await fetch(`${pb}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error(`Đăng nhập PocketBase thất bại: ${r.status}`);
  return (await r.json()).token;
}

async function danhGia(apiKey, ban) {
  const noiDung = PROMPT
    .replace("{loai}", ban.loai ?? "")
    .replace("{cho}", ban.cho_ten ?? "(không có)")
    .replace("{khu}", ban.khu_ten ?? "(không có)")
    .replace("{noi_dung}", ban.noi_dung ?? "")
    .replace("{nguon}", ban.nguon_url || "(không có)")
    .replace("{ten_cho}", ban.ten_cho || "(không có)")
    .replace("{dia_chi}", ban.dia_chi || "(không có)");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, messages: [{ role: "user", content: noiDung }] }),
  });
  if (!r.ok) throw new Error(`Claude API lỗi: ${r.status} ${await r.text()}`);
  const phanHoi = await r.json();
  const text = phanHoi.content.find((c) => c.type === "text")?.text ?? "";
  const khop = text.match(/\{[\s\S]*\}/);
  if (!khop) throw new Error(`Phản hồi AI không phải JSON: ${text.slice(0, 200)}`);
  const json = JSON.parse(khop[0]);
  if (!KHUYEN_NGHI.includes(json.khuyen_nghi)) throw new Error(`Khuyến nghị không hợp lệ: ${json.khuyen_nghi}`);
  return json;
}

export async function soDuyet(env) {
  const pb = env.PB_URL.replace(/\/$/, "");
  const dryRun = env.DRY_RUN === "1";
  const token = await dangNhap(pb, env.PB_ADMIN_EMAIL, env.PB_ADMIN_PASSWORD);
  const H = { "content-type": "application/json", authorization: token };
  const filter = encodeURIComponent('trang_thai="cho_duyet" && ai_khuyen_nghi=""');
  const list = await (await fetch(`${pb}/api/collections/cho_phien_gop_y/records?perPage=${GIOI_HAN_MOI_LAN}&filter=${filter}&expand=cho,khu_vuc`, { headers: H })).json();
  const ketQua = [];
  for (const gy of list.items ?? []) {
    const ban = {
      loai: gy.loai,
      noi_dung: gy.noi_dung,
      nguon_url: gy.nguon_url,
      ten_cho: gy.ten_cho,
      dia_chi: gy.dia_chi,
      cho_ten: gy.expand?.cho?.ten,
      khu_ten: gy.expand?.khu_vuc?.ten,
    };
    const kq = await danhGia(env.ANTHROPIC_API_KEY, ban);
    ketQua.push({ id: gy.id, ...kq });
    if (!dryRun) {
      const r = await fetch(`${pb}/api/collections/cho_phien_gop_y/records/${gy.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ ai_khuyen_nghi: kq.khuyen_nghi, ai_ly_do: kq.ly_do, ai_danh_gia_luc: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error(`Ghi ${gy.id} thất bại: ${r.status}`);
    }
  }
  return ketQua;
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      soDuyet(env).then((kq) => console.log(`AI sơ duyệt ${kq.length} góp ý`, JSON.stringify(kq))),
    );
  },
  // Chạy thủ công để kiểm tra: GET /?dry=1 trả về kết quả mà không ghi
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.searchParams.get("dry") === "1") env = { ...env, DRY_RUN: "1" };
    try {
      return Response.json(await soDuyet(env));
    } catch (err) {
      return Response.json({ loi: err.message }, { status: 500 });
    }
  },
};
