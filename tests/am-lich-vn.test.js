import { describe, it, expect } from "vitest";
import { ngayAmVN } from "../src/lib/am-lich-vn.js";

describe("lịch âm Việt Nam (UTC+7)", () => {
  // Mùng 1 Tết Nguyên Đán các năm 2020–2026
  const tet = [
    [2020, 1, 25], [2021, 2, 12], [2022, 2, 1], [2023, 1, 22],
    [2024, 2, 10], [2025, 1, 29], [2026, 2, 17],
  ];
  it.each(tet)("mùng 1 Tết %i là %i/%i dương lịch", (y, m, d) => {
    expect(ngayAmVN({ y, m, d })).toMatchObject({ ngay: 1, thang: 1, nhuan: false });
  });

  it("tháng nhuận 6 năm 2025 bắt đầu 25/07/2025", () => {
    expect(ngayAmVN({ y: 2025, m: 7, d: 25 })).toEqual({ ngay: 1, thang: 6, nam: 2025, nhuan: true });
  });

  it("tháng 7 thường năm 2025 bắt đầu 23/08/2025", () => {
    expect(ngayAmVN({ y: 2025, m: 8, d: 23 })).toMatchObject({ ngay: 1, thang: 7, nhuan: false });
  });

  it("năm âm lịch đổi sau Tết", () => {
    expect(ngayAmVN({ y: 2026, m: 2, d: 16 }).nam).toBe(2025);
    expect(ngayAmVN({ y: 2026, m: 2, d: 17 }).nam).toBe(2026);
  });
});
