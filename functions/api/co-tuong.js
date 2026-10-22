// Cloudflare Pages Function: nhờ Haiku 5.5 chọn một nước trong danh sách minimax đã đưa ra.
// Khóa ANTHROPIC_API_KEY đặt trong Cloudflare Pages (Settings > Environment variables, dạng secret).
// Hàm chỉ trả về nước nằm trong danh sách gửi lên, nên Haiku không thể bịa nước đi.

const NGUON_CHO_PHEP = ["https://chophien.pages.dev"];
const MODEL = "claude-haiku-5-5";
const MAU_NUOC = /^[a-i][0-9][a-i][0-9]$/;
const MAU_NUOC_TRONG_CAU = /[a-i][0-9][a-i][0-9]/;

function tra(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function onRequestPost({ request, env }) {
  const nguon = request.headers.get("origin") || "";
  const choPhep = NGUON_CHO_PHEP.includes(nguon) || nguon.startsWith("http://localhost");
  if (!choPhep) return tra(403, { loi: "nguon_khong_duoc_phep" });

  if (!env.ANTHROPIC_API_KEY) return tra(503, { loi: "chua_cau_hinh" });

  let body;
  try {
    body = await request.json();
  } catch {
    return tra(400, { loi: "json_khong_hop_le" });
  }
  const { ban, nuoc } = body ?? {};
  if (typeof ban !== "string" || ban.length > 400) return tra(400, { loi: "ban_khong_hop_le" });
  if (!Array.isArray(nuoc) || nuoc.length < 1 || nuoc.length > 8) return tra(400, { loi: "nuoc_khong_hop_le" });
  if (!nuoc.every((x) => typeof x === "string" && MAU_NUOC.test(x))) return tra(400, { loi: "nuoc_khong_hop_le" });

  const cau = [
    "Bạn là kỳ thủ cờ tướng. Bàn có 10 hàng (hàng 0 là phía quân đen ở trên, hàng 9 là phía quân đỏ ở dưới) và 9 cột a-i.",
    "Quân: rK tướng đỏ, rA sĩ, rE tượng, rH mã, rR xe, rC pháo, rP tốt; chữ b là quân đen. .. là ô trống.",
    "Bên đang đi là quân đen (b).",
    "",
    "Thế cờ:",
    ban,
    "",
    "Các nước đi do máy đã phân tích và xếp theo điểm (nước đầu tốt nhất theo máy):",
    nuoc.join(", "),
    "",
    "Chọn đúng một nước trong danh sách trên, ưu tiên nước giữ được thế và không để mất quân.",
    "Chỉ trả lời mã nước, ví dụ: h2e2. Không giải thích.",
  ].join("\n");

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16,
        messages: [{ role: "user", content: cau }],
      }),
    });
  } catch {
    return tra(502, { loi: "khong_goi_duoc_ai" });
  }
  if (!r.ok) return tra(502, { loi: "ai_tra_loi_loi", ma: r.status });

  const data = await r.json();
  const text = data?.content?.[0]?.text ?? "";
  const tim = text.match(MAU_NUOC_TRONG_CAU)?.[0];
  if (!tim || !nuoc.includes(tim)) return tra(502, { loi: "nuoc_ngoai_danh_sach" });
  return tra(200, { nuoc: tim });
}
