import { describe, it, expect } from "vitest";
import { coPhienTheoQuy, coPhienHomNay, ngayHienTai, dinhDangDuong, dinhDangAm, tenNamCanChi, cacPhienTiepTheo, moTaQuy } from "../src/lib/lich-phien.js";

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

describe("định dạng ngày hiển thị", () => {
  it("ngày dương có thứ trong tuần", () => {
    expect(dinhDangDuong({ y: 2026, m: 10, d: 20 })).toBe("Thứ Ba, 20/10/2026");
    expect(dinhDangDuong({ y: 2026, m: 2, d: 17 })).toBe("Thứ Ba, 17/02/2026");
  });

  it("năm can chi tiếng Việt", () => {
    expect(tenNamCanChi(2026)).toBe("Bính Ngọ");
    expect(tenNamCanChi(2025)).toBe("Ất Tỵ");
    expect(tenNamCanChi(2024)).toBe("Giáp Thìn");
  });

  it("ngày âm có năm can chi", () => {
    expect(dinhDangAm({ y: 2026, m: 10, d: 20 })).toBe("Ngày 11 tháng 9 năm Bính Ngọ");
    expect(dinhDangAm({ y: 2026, m: 2, d: 17 })).toBe("Ngày 1 tháng 1 năm Bính Ngọ");
  });

  it("tháng nhuận được ghi rõ", () => {
    expect(dinhDangAm({ y: 2025, m: 7, d: 25 })).toBe("Ngày 1 tháng nhuận 6 năm Ất Tỵ");
  });
});

describe("phiên tiếp theo", () => {
  const haDong = [{ loai: "ngay_am", ngay: [5, 10, 15, 20, 25, 30] }];

  it("hôm nay không có phiên thì lấy các phiên sau đó", () => {
    // 20/10/2026 là 11/9 âm, phiên kế tiếp là 15/9 = 24/10/2026
    const ds = cacPhienTiepTheo(haDong, ngay("2026-10-20"), 2);
    expect(ds).toEqual([{ y: 2026, m: 10, d: 24 }, { y: 2026, m: 10, d: 29 }]);
  });

  it("không tính chính ngày hôm nay", () => {
    // 24/10/2026 là 15/9 âm: phiên đầu tiên sau ngày đó phải lớn hơn 24/10
    const ds = cacPhienTiepTheo(haDong, ngay("2026-10-24"), 1);
    expect(ds).toEqual([{ y: 2026, m: 10, d: 29 }]);
  });

  it("chu kỳ ngày", () => {
    const ds = cacPhienTiepTheo([{ loai: "chu_ky", ngay_goc: "2026-01-01", chu_ky: 5 }], ngay("2026-01-01"), 2);
    expect(ds).toEqual([{ y: 2026, m: 1, d: 6 }, { y: 2026, m: 1, d: 11 }]);
  });

  it("mô tả quy tắc dễ đọc", () => {
    expect(moTaQuy({ loai: "ngay_am", ngay: [5, 10, -1] })).toBe("ngày 5, ngày 10, ngày cuối tháng âm lịch hằng tháng (không tính tháng nhuận)");
    expect(moTaQuy({ loai: "chu_ky", ngay_goc: "2026-01-01", chu_ky: 5 })).toBe("mỗi 5 ngày, tính từ 01/01/2026");
  });
});
