// Tiện ích dùng chung cho các Pages Function ghi bảng điểm cờ tướng (không phải route, không có onRequest).

export function tra(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function dangNhap(pb, email, password) {
  const r = await fetch(`${pb}/api/collections/_superusers/auth-with-password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  if (!r.ok) throw new Error("dang_nhap_loi");
  return (await r.json()).token;
}
