import { describe, it, expect } from "vitest";
import { lamSachTen, tenHopLe, tenBangDiem, taoTenTam } from "../src/lib/chung/ten.js";
import { diemCongVan, HOAN_TOI_DA, mucSauVan, MUC_TOI_DA } from "../src/lib/chung/diem.js";

describe("tên tạm", () => {
  it("tên tạm luôn hợp lệ, có 4 chữ cái và ngày chơi lần đầu", () => {
    for (let i = 0; i < 50; i++) {
      const t = taoTenTam();
      expect(tenHopLe(t)).toBe(true);
      expect(t).toMatch(/^Kỳ thủ [A-Z]{4} \d{8}$/);
      expect(t.length).toBeLessThanOrEqual(50);
    }
  });

  it("chọn đúng chữ cái theo số ngẫu nhiên và ghép ngày theo giờ Việt Nam", () => {
    // 2026-10-22 23:30 UTC là 2026-10-23 06:30 giờ Việt Nam
    const luc = new Date("2026-10-22T23:30:00Z");
    expect(taoTenTam(() => 0, luc)).toBe("Kỳ thủ AAAA 23102026");
    expect(taoTenTam(() => 0.999999, luc)).toBe("Kỳ thủ ZZZZ 23102026");
  });

  it("tên có chữ số được chấp nhận, tên tạm có ngày vẫn hợp lệ", () => {
    expect(tenHopLe("Kỳ thủ KQMA 23102026")).toBe(true);
    expect(tenHopLe("0912345678")).toBe(true);
  });
});

describe("điểm và nước hoãn", () => {
  it("không hoãn thì giữ nguyên điểm theo kết quả", () => {
    expect(diemCongVan("thang", 0)).toBe(3);
    expect(diemCongVan("hoa", 0)).toBe(1);
    expect(diemCongVan("thua", 0)).toBe(-1);
  });

  it("mỗi nước hoãn trừ 0,5 điểm, tối đa 3 nước", () => {
    expect(diemCongVan("thang", 1)).toBe(2.5);
    expect(diemCongVan("thang", 3)).toBe(1.5);
    expect(diemCongVan("thua", 3)).toBe(-2.5);
    expect(HOAN_TOI_DA).toBe(3);
  });
});

describe("tên người chơi", () => {
  it("chấp nhận chữ cái, có dấu tiếng Việt và khoảng trắng giữa các từ", () => {
    expect(tenHopLe("Nguyễn Văn An")).toBe(true);
    expect(tenHopLe("Đỗ")).toBe(true);
  });

  it("từ chối ký tự đặc biệt, khoảng trắng đầu hoặc cuối, chuỗi rỗng", () => {
    expect(tenHopLe("An!")).toBe(false);
    expect(tenHopLe("An-Bình")).toBe(false);
    expect(tenHopLe(" An")).toBe(false);
    expect(tenHopLe("An ")).toBe(false);
    expect(tenHopLe("")).toBe(false);
  });

  it("giới hạn 50 ký tự", () => {
    expect(tenHopLe("a".repeat(50))).toBe(true);
    expect(tenHopLe("a".repeat(51))).toBe(false);
  });

  it("bảng xếp hạng che mọi chữ số bằng dấu *", () => {
    expect(tenBangDiem("0912345678")).toBe("**********");
    expect(tenBangDiem("Kỳ thủ KQMA 23102026")).toBe("Kỳ thủ KQMA ********");
    expect(tenBangDiem("Lê Hoài")).toBe("Lê Hoài");
  });

  it("làm sạch khi gõ: bỏ ký tự đặc biệt, giữ chữ số, gộp khoảng trắng, cắt 50 ký tự", () => {
    expect(lamSachTen("An2!3")).toBe("An23");
    expect(lamSachTen("  Lê   Hoài")).toBe("Lê Hoài");
    expect(lamSachTen("Lê ")).toBe("Lê "); // giữ khoảng trắng cuối khi đang gõ, cắt khi lưu
    expect(lamSachTen("a".repeat(60))).toHaveLength(50);
    expect(tenHopLe(lamSachTen("Trần #1 Bình 99").trim())).toBe(true); // trang cắt khoảng trắng cuối khi lưu
  });
});

describe("mức sau ván", () => {
  it("thắng lên một mức, thua xuống một mức, hòa giữ nguyên, không ra ngoài 1..5", () => {
    expect(mucSauVan(3, "thang")).toBe(4);
    expect(mucSauVan(3, "thua")).toBe(2);
    expect(mucSauVan(3, "hoa")).toBe(3);
    expect(mucSauVan(MUC_TOI_DA, "thang")).toBe(MUC_TOI_DA);
    expect(mucSauVan(1, "thua")).toBe(1);
    expect(mucSauVan(undefined, "thang")).toBe(2); // chưa có mức thì coi là mức 1
  });
});
