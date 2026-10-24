import { describe, it, expect, afterEach } from "vitest";
import { onRequestGet } from "../functions/api/van-xem.js";

const ENV = { PB_URL: "http://pb", PB_ADMIN_EMAIL: "a", PB_ADMIN_PASSWORD: "b" };
const MA = "a".repeat(32);

// PocketBase giả: đăng nhập admin và đọc một trận theo mã
function gia(tran) {
  globalThis.fetch = async (url) => {
    const ok = (body) => new Response(JSON.stringify(body), { status: 200 });
    if (String(url).includes("auth-with-password")) return ok({ token: "t" });
    if (String(url).includes("/co_tuong_tran/records")) return ok({ items: tran ? [tran] : [] });
    return new Response("{}", { status: 404 });
  };
}
afterEach(() => delete globalThis.fetch);

const goi = async (q) => {
  const r = await onRequestGet({ request: new Request(`http://x/api/van-xem?${q}`), env: ENV });
  return { status: r.status, data: await r.json() };
};

describe("xem lại trận hai người qua link", () => {
  it("trận đã xong: trả nước đi, loại cờ, tên đã che chữ số, kết quả theo bên", async () => {
    gia({ ma: MA, tro_choi: "co_vua", loai: "khep_kin", trang_thai: "ket_thuc", do: "k_x", den: "u1", ten_do: "An 0912", ten_den: "Bình", ket_qua: "den", ly_do: "chieu_het", nuoc: ["f2f3", "e7e5", "g2g4", "d8h4"] });
    const { status, data } = await goi(`tran=${MA}`);
    expect(status).toBe(200);
    expect(data).toMatchObject({ tro_choi: "co_vua", ten_do: "An ****", ten_den: "Bình", ket_qua: "den", ly_do: "chieu_het", may_muc: null });
    expect(data.nuoc).toHaveLength(4);
    expect(data).not.toHaveProperty("do");
  });

  it("trận cũ chưa ghi loại cờ là cờ tướng; máy trên đài giữ tên và có mức", async () => {
    gia({ ma: MA, loai: "dai", trang_thai: "ket_thuc", do: "may_3", cap_do: 3, ten_do: "Máy mức 3", ten_den: "Chi", ket_qua: "do", nuoc: ["h7e7"] });
    const { data } = await goi(`tran=${MA}`);
    expect(data).toMatchObject({ tro_choi: "co_tuong", ten_do: "Máy mức 3", may_muc: 3 });
  });

  it("trận đang đấu: xem trực tiếp, có hạn nước, giờ server và mã chuông", async () => {
    gia({ ma: MA, loai: "khep_kin", trang_thai: "dang_dau", do: "k_x", ten_do: "An", ten_den: "Bình", nuoc: ["h7e7"], han_nuoc: "2026-10-24 10:00:00.000Z", tin_hieu: "c".repeat(15) });
    const { status, data } = await goi(`tran=${MA}`);
    expect(status).toBe(200);
    expect(data).toMatchObject({ dang_dau: true, nuoc: ["h7e7"], han_nuoc: "2026-10-24 10:00:00.000Z", tin_hieu: "c".repeat(15), ket_qua: null });
    expect(data.bay_gio).toBeTruthy();
    // Chưa đi nước nào vẫn xem được (bàn khởi đầu)
    gia({ ma: MA, trang_thai: "dang_dau", nuoc: [] });
    expect((await goi(`tran=${MA}`)).data.nuoc).toEqual([]);
  });

  it("trận đã xong không có trường xem trực tiếp", async () => {
    gia({ ma: MA, trang_thai: "ket_thuc", ket_qua: "hoa", nuoc: ["h7e7"], tin_hieu: "c".repeat(15) });
    const { data } = await goi(`tran=${MA}`);
    expect(data).not.toHaveProperty("dang_dau");
    expect(data).not.toHaveProperty("tin_hieu");
  });

  it("trận còn chờ người vào hoặc không có thì không cho xem; mã sai dạng bị từ chối", async () => {
    gia({ ma: MA, trang_thai: "cho", nuoc: [] });
    expect((await goi(`tran=${MA}`)).status).toBe(404);
    gia(null);
    expect((await goi(`tran=${MA}`)).status).toBe(404);
    expect((await goi("tran=abc")).status).toBe(400);
  });
});
