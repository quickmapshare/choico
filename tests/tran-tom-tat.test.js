import { describe, it, expect, vi } from "vitest";
import { tomTatTran, donTranCu } from "../functions/_lib/tran.js";

describe("donTranCu (dọn link cũ)", () => {
  it("xóa link không ai vào và trận của khách kèm chuông; bỏ qua tài khoản mã bắt đầu bằng k và chuông sảnh; 5 phút mới chạy lại", async () => {
    const goi = [];
    globalThis.fetch = vi.fn(async (url, init = {}) => {
      goi.push(`${init.method || "GET"} ${url}`);
      if (url.includes("filter=") && decodeURIComponent(url).includes('den=""')) {
        return { ok: true, json: async () => ({ items: [{ id: "t1", do: "abc", tin_hieu: "c1" }, { id: "t2", do: "abc", tin_hieu: "sanhthuongdai01" }] }) };
      }
      if (url.includes("filter=")) {
        return { ok: true, json: async () => ({ items: [{ id: "t3", do: "k_khach123456789012", tin_hieu: "" }, { id: "t4", do: "kxtaikhoan12345", tin_hieu: "c4" }] }) };
      }
      return { ok: true };
    });
    expect(await donTranCu("http://pb", {})).toBe(3);
    const xoa = goi.filter((g) => g.startsWith("DELETE")).map((g) => g.replace("DELETE http://pb/api/collections/", ""));
    expect(xoa.sort()).toEqual(["co_tuong_tin_hieu/records/c1", "co_tuong_tran/records/t1", "co_tuong_tran/records/t2", "co_tuong_tran/records/t3"]);
    expect(await donTranCu("http://pb", {})).toBe(0); // vừa dọn xong, chưa tới 5 phút
  });
});

describe("tomTatTran (tóm tắt gửi kèm chuông)", () => {
  it("lấy số nước, nước cuối, hạn nước, trạng thái và giờ bấm", () => {
    const tran = { nuoc: ["h2e2", "h9g7"], han_nuoc: "2026-10-23T10:00:00.000Z", trang_thai: "dang_dau" };
    expect(tomTatTran(tran, 123)).toEqual({ n: 2, ky: "h9g7", han: "2026-10-23T10:00:00.000Z", trang_thai: "dang_dau", gui: 123 });
  });

  it("trận chưa có nước, không hạn nước, không giờ bấm", () => {
    expect(tomTatTran({ trang_thai: "cho" })).toEqual({ n: 0, ky: "", han: "", trang_thai: "cho" });
  });
});
