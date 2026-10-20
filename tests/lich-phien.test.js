import { describe, it, expect } from "vitest";
import { coPhienTheoQuy, coPhienHomNay, ngayHienTai, dinhDangDuong, dinhDangAm, tenNamCanChi, cacPhienTiepTheo, moTaQuy, luoiThang, nhanThangAm, tenThangCanChi, leAmCua, tietKhiTrongNam, ngayDuongTuAm } from "../src/lib/lich-phien.js";

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

describe("ngôn ngữ tiếng Anh", () => {
  it("ngày dương tiếng Anh", () => {
    expect(dinhDangDuong({ y: 2026, m: 10, d: 20 }, "en")).toBe("Tuesday, 20/10/2026");
  });

  it("ngày âm tiếng Anh có con giáp", () => {
    expect(dinhDangAm({ y: 2026, m: 10, d: 20 }, "en")).toBe("Lunar day 11, month 9, year Bính Ngọ (Horse)");
    expect(dinhDangAm({ y: 2025, m: 7, d: 25 }, "en")).toBe("Lunar day 1, month leap 6, year Ất Tỵ (Snake)");
  });

  it("mô tả quy tắc tiếng Anh", () => {
    expect(moTaQuy({ loai: "ngay_am", ngay: [5, 10, -1] }, "en")).toBe("day 5, day 10, last day of each lunar month (leap months excluded)");
    expect(moTaQuy({ loai: "chu_ky", ngay_goc: "2026-01-01", chu_ky: 5 }, "en")).toBe("every 5 days, counting from 01/01/2026");
  });
});

describe("ngày âm theo tháng cố định (chợ theo năm)", () => {
  // Tết 2026 là 17/02/2026 (mùng 1 tháng Giêng)
  const vieng = { loai: "ngay_am", ngay: [7, 8], thang: [1] };
  it("chợ Viềng: mùng 7 và 8 tháng Giêng", () => {
    expect(coPhienTheoQuy(vieng, ngay("2026-02-23"))).toBe(true); // mùng 7 tháng Giêng
    expect(coPhienTheoQuy(vieng, ngay("2026-02-24"))).toBe(true); // mùng 8 tháng Giêng
    expect(coPhienTheoQuy(vieng, ngay("2026-02-25"))).toBe(false);
  });
  it("không lặp sang tháng khác có cùng ngày", () => {
    // mùng 7 tháng 2 âm (cùng ngày trong tháng) không được tính
    expect(coPhienTheoQuy(vieng, ngay("2026-03-19"))).toBe(false);
  });
  it("chợ Tết Mỹ Lợi: mùng 1 đến 3 tháng Giêng", () => {
    const tet = { loai: "ngay_am", ngay: [1, 2, 3], thang: [1] };
    expect(coPhienTheoQuy(tet, ngay("2026-02-17"))).toBe(true);
    expect(coPhienTheoQuy(tet, ngay("2026-02-19"))).toBe(true);
    expect(coPhienTheoQuy(tet, ngay("2026-02-20"))).toBe(false);
  });
  it("mô tả quy tắc theo tháng", () => {
    expect(moTaQuy(vieng, "vi")).toBe("ngày 7, ngày 8 tháng 1 âm lịch hằng năm");
    expect(moTaQuy(vieng, "en")).toBe("day 7, day 8 of lunar month 1 every year");
  });
});

describe("mô tả chu kỳ dễ hiểu", () => {
  it("chu kỳ 1 ngày là hàng ngày", () => {
    expect(moTaQuy({ loai: "chu_ky", ngay_goc: "2026-10-20", chu_ky: 1 }, "vi")).toBe("hàng ngày");
    expect(moTaQuy({ loai: "chu_ky", ngay_goc: "2026-10-20", chu_ky: 1 }, "en")).toBe("daily");
  });
  it("chu kỳ 7 ngày là mỗi tuần vào một thứ", () => {
    expect(moTaQuy({ loai: "chu_ky", ngay_goc: "2026-10-18", chu_ky: 7 }, "vi")).toBe("mỗi tuần vào Chủ nhật");
    expect(moTaQuy({ loai: "chu_ky", ngay_goc: "2026-10-22", chu_ky: 7 }, "en")).toBe("every week on Thursday");
  });
});

describe("lưới lịch tháng", () => {
  it("tháng 2/2026: 28 ngày, mùng 1 là Chủ nhật, mùng 1 Tết là 17/02", () => {
    const luoi = luoiThang(2026, 2);
    expect(luoi.soNgay).toBe(28);
    expect(luoi.thuDau).toBe(0);
    const tet = luoi.ngay.find((o) => o.duong.d === 17);
    expect(tet.am).toMatchObject({ ngay: 1, thang: 1, nhuan: false });
  });

  it("tháng 12/2024 có 31 ngày, bắt đầu Chủ nhật", () => {
    const luoi = luoiThang(2024, 12);
    expect(luoi.soNgay).toBe(31);
    expect(luoi.thuDau).toBe(0);
  });

  it("tháng nhuận 6/2025 hiện trong lưới tháng 7 dương", () => {
    const ngayNhuan = luoiThang(2025, 7).ngay.find((o) => o.duong.d === 25);
    expect(ngayNhuan.am).toMatchObject({ ngay: 1, thang: 6, nhuan: true });
    expect(nhanThangAm(ngayNhuan.am)).toBe("tháng nhuận 6");
    expect(nhanThangAm(ngayNhuan.am, "en")).toBe("leap month 6");
  });
});

describe("can chi tháng âm", () => {
  it("tháng Giêng năm Bính Ngọ 2026 là Canh Dần", () => {
    expect(tenThangCanChi(2026, 1)).toBe("Canh Dần");
  });

  it("tháng 12 cuối năm đi đúng thứ tự can chi", () => {
    // Tháng Giêng Canh Dần, tháng 12 là Tân Sửu (Canh+11 = Tân, Dần+11 = Sửu)
    expect(tenThangCanChi(2026, 12)).toBe("Tân Sửu");
  });
});

describe("ngày lễ âm", () => {
  it("mùng 1 Tết và Trung thu 2025 nhận đúng lễ", () => {
    expect(leAmCua({ ngay: 1, thang: 1, nhuan: false })).toEqual(["tet"]);
    expect(leAmCua({ ngay: 15, thang: 8, nhuan: false })).toEqual(["trungThu"]);
  });

  it("tháng nhuận không có lễ", () => {
    expect(leAmCua({ ngay: 15, thang: 8, nhuan: true })).toEqual([]);
  });
});

describe("tiết khí", () => {
  it("Xuân phân 2026 rơi vào 20/03", () => {
    const xuanPhan = tietKhiTrongNam(2026).find((tk) => tk.so === 0);
    expect(xuanPhan.ngay).toEqual({ y: 2026, m: 3, d: 20 });
  }); 

  it("năm có đủ 24 tiết khí, mỗi tiết khí một lần", () => {
    const ds = tietKhiTrongNam(2026);
    expect(ds).toHaveLength(24);
    expect(new Set(ds.map((tk) => tk.so)).size).toBe(24);
  });
});

describe("đổi ngày âm sang dương", () => {
  it("mùng 1 Tết Bính Ngọ 2026 là 17/02/2026", () => {
    expect(ngayDuongTuAm({ ngay: 1, thang: 1, nam: 2026 })).toEqual({ y: 2026, m: 2, d: 17 });
  });

  it("Trung thu 2025 (15/8 âm) là 06/10/2025", () => {
    expect(ngayDuongTuAm({ ngay: 15, thang: 8, nam: 2025 })).toEqual({ y: 2025, m: 10, d: 6 });
  });

  it("tháng nhuận 6/2025 đổi được", () => {
    expect(ngayDuongTuAm({ ngay: 1, thang: 6, nam: 2025, nhuan: true })).toEqual({ y: 2025, m: 7, d: 25 });
  });

  it("ngày không tồn tại trả về null", () => {
    expect(ngayDuongTuAm({ ngay: 31, thang: 2, nam: 2026 })).toBeNull();
  });
});
