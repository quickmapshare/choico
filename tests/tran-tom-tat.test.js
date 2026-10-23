import { describe, it, expect } from "vitest";
import { tomTatTran } from "../functions/_lib/tran.js";

describe("tomTatTran (tóm tắt gửi kèm chuông)", () => {
  it("lấy số nước, nước cuối, hạn nước, trạng thái và giờ bấm", () => {
    const tran = { nuoc: ["h2e2", "h9g7"], han_nuoc: "2026-10-23T10:00:00.000Z", trang_thai: "dang_dau" };
    expect(tomTatTran(tran, 123)).toEqual({ n: 2, ky: "h9g7", han: "2026-10-23T10:00:00.000Z", trang_thai: "dang_dau", gui: 123 });
  });

  it("trận chưa có nước, không hạn nước, không giờ bấm", () => {
    expect(tomTatTran({ trang_thai: "cho" })).toEqual({ n: 0, ky: "", han: "", trang_thai: "cho" });
  });
});
