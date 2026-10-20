import { describe, it, expect } from "vitest";
import { coPhienTheoQuy, coPhienHomNay, ngayHienTai } from "../src/lib/lich-phien.js";

const ngay = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };

describe("quy tắc ngày âm", () => {
  it("mùng 1 Tết 2026 là 17/02/2026", () => {
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [1] }, ngay("2026-02-17"))).toBe(true);
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [1] }, ngay("2026-02-18"))).toBe(false);
  });

  it("tháng nhuận 6/2025 (25/07 – 22/08): bỏ qua mặc định", () => {
    // Mùng 1 tháng nhuận không có phiên khi thang_nhuan = bo_qua (mặc định)
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [1] }, ngay("2025-07-25"))).toBe(false);
    // Mùng 1 tháng 7 thường (23/08) có phiên
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [1] }, ngay("2025-08-23"))).toBe(true);
  });

  it("tháng nhuận khi thang_nhuan = tinh thì tính phiên", () => {
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [1], thang_nhuan: "tinh" }, ngay("2025-07-25"))).toBe(true);
  });

  it("-1 là ngày cuối tháng âm: tháng 6 thường 2025 có 30 ngày", () => {
    // 24/07/2025 là 30/6 âm (tháng thường, đủ 30 ngày)
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [-1] }, ngay("2025-07-24"))).toBe(true);
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [-1] }, ngay("2025-07-23"))).toBe(false);
  });

  it("-1 ở cuối tháng nhuận: 22/08/2025 là 29/6 nhuận", () => {
    // Tháng nhuận bị bỏ qua mặc định, nên không có phiên
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [-1] }, ngay("2025-08-22"))).toBe(false);
    // Khi tính tháng nhuận thì ngày cuối vẫn khớp
    expect(coPhienTheoQuy({ loai: "ngay_am", ngay: [-1], thang_nhuan: "tinh" }, ngay("2025-08-22"))).toBe(true);
  });
});

describe("quy tắc chu kỳ", () => {
  const quy = { loai: "chu_ky", ngay_goc: "2026-01-01", chu_ky: 5 };

  it("có phiên đúng ngày gốc và mỗi 5 ngày", () => {
    expect(coPhienTheoQuy(quy, ngay("2026-01-01"))).toBe(true);
    expect(coPhienTheoQuy(quy, ngay("2026-01-06"))).toBe(true);
    expect(coPhienTheoQuy(quy, ngay("2026-01-05"))).toBe(false);
  });

  it("không có phiên trước ngày gốc", () => {
    expect(coPhienTheoQuy(quy, ngay("2025-12-27"))).toBe(false);
  });

  it("qua mốc năm mới vẫn đúng", () => {
    // 2026-01-01 + 365 ngày = 2027-01-01, 365 % 5 = 0
    expect(coPhienTheoQuy(quy, ngay("2027-01-01"))).toBe(true);
  });
});

describe("coPhienHomNay", () => {
  const quyNgayAm = { loai: "ngay_am", ngay: [1] };

  it("chợ chưa xác minh trả về null, không suy đoán", () => {
    expect(coPhienHomNay({ trang_thai_xac_minh: "chua_xac_minh", lich_phien: [quyNgayAm] }, ngay("2026-02-17"))).toBeNull();
  });

  it("chợ đã xác minh: có phiên nếu một quy tắc khớp", () => {
    const cho = { trang_thai_xac_minh: "da_xac_minh", lich_phien: [quyNgayAm] };
    expect(coPhienHomNay(cho, ngay("2026-02-17"))).toBe(true);
    expect(coPhienHomNay(cho, ngay("2026-02-18"))).toBe(false);
  });

  it("ngayHienTai trả về ngày theo giờ Việt Nam", () => {
    // 2026-02-16 17:30 UTC = 2026-02-17 00:30 giờ Việt Nam
    expect(ngayHienTai(new Date("2026-02-16T17:30:00Z"))).toEqual({ y: 2026, m: 2, d: 17 });
  });
});
