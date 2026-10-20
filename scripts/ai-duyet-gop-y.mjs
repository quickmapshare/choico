// AI sơ duyệt góp ý trong hàng chờ cho_phien_gop_y.
// AI chỉ gắn nhãn khuyến nghị và lý do vào bản ghi (ai_khuyen_nghi, ai_ly_do). Không đổi trang_thai, không đưa lên web.
// Người duyệt vẫn quyết định cuối cùng và là người nhập dữ liệu vào cho_phien_cho.
//
// Chạy: node scripts/ai-duyet-gop-y.mjs [--dry-run]
// Cần biến môi trường: PB_URL, PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD, ANTHROPIC_API_KEY

const MODEL = "claude-haiku-5-5";
const DRY = process.argv.includes("--dry-run");

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Thiếu biến môi trường ${k}`);
  return v;
};

const PB = env("PB_URL").replace(/\/$/, "");

async function dangNhapPB() {
  const r = await fetch(`${PB}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: env("PB_ADMIN_EMAIL"), password: env("PB_ADMIN_PASSWORD") }),
  });
  if (!r.ok) throw new Error(`Đăng nhập PocketBase thất bại: ${r.status}`);
  return (await r.json()).token;
}

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

async function danhGia(ban) {
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
    headers: {
      "content-type": "application/json",
      "x-api-key": env("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: "user", content: noiDung }] }),
  });
  if (!r.ok) throw new Error(`Claude API lỗi: ${r.status} ${await r.text()}`);
  const text = (await r.json()).content.find((c) => c.type === "text")?.text ?? "";
  const khop = text.match(/\{[\s\S]*\}/);
  if (!khop) throw new Error(`Phản hồi AI không phải JSON: ${text.slice(0, 300)}`);
  const json = JSON.parse(khop[0]);
  if (!["nen_nhan", "can_xem_lai", "nen_tu_choi"].includes(json.khuyen_nghi)) throw new Error(`Khuyến nghị không hợp lệ: ${json.khuyen_nghi}`);
  return json;
}

async function main() {
  if (DRY) console.log("Chế độ thử (--dry-run): không ghi vào PocketBase.");
  const token = await dangNhapPB();
  const H = { "content-type": "application/json", authorization: token };
  const filter = encodeURIComponent('trang_thai="cho_duyet" && ai_khuyen_nghi=""');
  const list = await (await fetch(`${PB}/api/collections/cho_phien_gop_y/records?perPage=50&filter=${filter}&expand=cho,khu_vuc`, { headers: H })).json();
  console.log(`Có ${list.items.length} góp ý chưa được AI sơ duyệt.`);

  for (const gy of list.items) {
    const ban = {
      loai: gy.loai,
      noi_dung: gy.noi_dung,
      nguon_url: gy.nguon_url,
      ten_cho: gy.ten_cho,
      dia_chi: gy.dia_chi,
      cho_ten: gy.expand?.cho?.ten,
      khu_ten: gy.expand?.khu_vuc?.ten,
    };
    const kq = await danhGia(ban);
    console.log(`${gy.id} [${gy.loai}] → ${kq.khuyen_nghi}: ${kq.ly_do}`);
    if (!DRY) {
      const r = await fetch(`${PB}/api/collections/cho_phien_gop_y/records/${gy.id}`, {
        method: "PATCH",
        headers: H,
        body: JSON.stringify({ ai_khuyen_nghi: kq.khuyen_nghi, ai_ly_do: kq.ly_do, ai_danh_gia_luc: new Date().toISOString() }),
      });
      if (!r.ok) throw new Error(`Ghi ${gy.id} thất bại: ${r.status}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message, err.cause ? `(${err.cause.code || err.cause.message})` : "");
  process.exit(1);
});
