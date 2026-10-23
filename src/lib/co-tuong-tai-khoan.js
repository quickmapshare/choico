// Đăng nhập Google cho cờ tướng, chạy ở trình duyệt. Dùng luồng OAuth2 của PocketBase, chuyển hướng cả trang (không popup).
//  1. batDauDangNhap(): lấy địa chỉ Google từ PocketBase, nhớ state/codeVerifier, chuyển sang Google.
//  2. Google trả về /dang-nhap/?code=...&state=...: hoanTatDangNhap() đổi code lấy token, lưu token.
// Token chỉ dùng để gửi lên Pages Function (header Authorization), nơi kiểm tra lại với PocketBase.

// Địa chỉ PocketBase công khai, chỉ dùng cho bước đăng nhập. Điểm và hồ sơ đi qua /api/co-tuong-*.
export const PB_URL = "https://api.botgap.dev";
const NGUOI_CHOI = "co_tuong_nguoi_choi";
const KHOA_TOKEN = "co-tuong-token";
const KHOA_DANG_NHAP = "co-tuong-dang-nhap"; // state, codeVerifier, redirectUrl của lần đăng nhập đang dở
const NHA_CUNG_CAP = "google";

const redirectUrl = () => `${location.origin}/dang-nhap/`;

export function docToken() {
  try {
    return localStorage.getItem(KHOA_TOKEN) || "";
  } catch {
    return "";
  }
}

export function xoaToken() {
  try {
    localStorage.removeItem(KHOA_TOKEN);
  } catch {
    // không xóa được thì lần sau token hết hạn sẽ tự bị từ chối
  }
}

// Header gửi kèm các lời gọi /api, rỗng nếu chưa đăng nhập
export function headerXacThuc() {
  const t = docToken();
  return t ? { authorization: `Bearer ${t}` } : {};
}

export async function batDauDangNhap() {
  const r = await fetch(`${PB_URL}/api/collections/${NGUOI_CHOI}/auth-methods`);
  if (!r.ok) throw new Error("khong_lay_duoc_phuong_thuc");
  const nhaCungCap = (await r.json()).oauth2?.providers?.find((p) => p.name === NHA_CUNG_CAP);
  if (!nhaCungCap) throw new Error("chua_bat_google");
  localStorage.setItem(KHOA_DANG_NHAP, JSON.stringify({
    state: nhaCungCap.state,
    codeVerifier: nhaCungCap.codeVerifier,
    redirectUrl: redirectUrl(),
    quayLai: location.pathname,
  }));
  location.href = nhaCungCap.authURL + encodeURIComponent(redirectUrl());
}

// Gọi ở trang /dang-nhap/. Trả về đường dẫn để quay lại, hoặc ném lỗi.
export async function hoanTatDangNhap() {
  const q = new URLSearchParams(location.search);
  const code = q.get("code");
  const state = q.get("state");
  let luu;
  try {
    luu = JSON.parse(localStorage.getItem(KHOA_DANG_NHAP) || "null");
  } catch {
    luu = null;
  }
  if (q.get("error")) throw new Error("da_huy");
  if (!code || !luu || luu.state !== state) throw new Error("phien_khong_khop");
  const r = await fetch(`${PB_URL}/api/collections/${NGUOI_CHOI}/auth-with-oauth2`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: NHA_CUNG_CAP, code, codeVerifier: luu.codeVerifier, redirectUrl: luu.redirectUrl }),
  });
  if (!r.ok) throw new Error("khong_doi_duoc_code");
  localStorage.setItem(KHOA_TOKEN, (await r.json()).token);
  localStorage.removeItem(KHOA_DANG_NHAP);
  // Quay lại đúng trang (giữ tiền tố ngôn ngữ); bản nhúng thì về trang đầy đủ
  return (luu.quayLai || "/co-tuong/").replace("/nhung/co-tuong/", "/co-tuong/");
}
