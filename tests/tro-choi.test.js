import { describe, it, expect } from "vitest";
import { TRO_CHOI, MA_TRO_CHOI, layTroChoi, locTroChoi } from "../src/lib/tro-choi.js";
import { CHU } from "../src/i18n/strings.js";
import { CHU_CO_VUA } from "../src/i18n/co-vua.js";
import { phatLai, xacMinhVan } from "../src/lib/chung/van.js";

const HAM = ["khoiTao", "saoChep", "nuocHopLe", "timNuoc", "apDung", "apKy", "kyHieu", "biChieu", "quanBiAn", "ketThucNhanh", "ketThuc"];

describe("danh sách loại cờ", () => {
  it("mỗi loại cờ có đủ giao diện bộ luật, đường dẫn và chuông sảnh riêng", () => {
    const chuong = new Set();
    for (const ma of MA_TRO_CHOI) {
      const tc = TRO_CHOI[ma];
      expect(tc.ma).toBe(ma);
      expect(tc.luat.ma).toBe(ma);
      for (const h of HAM) expect(typeof tc.luat[h], `${ma}.${h}`).toBe("function");
      expect(tc.luat.MAU_KY).toBeInstanceOf(RegExp);
      expect(Number.isInteger(tc.luat.NUOC_TOI_DA)).toBe(true);
      for (const k of ["cong", "may", "tran", "dai", "xemVan", "nhung", "maNhung"]) expect(tc.duong[k]).toMatch(/^\/.*\/$/);
      // Mã bản ghi PocketBase: đúng 15 ký tự a-z0-9
      expect(tc.chuongSanh).toMatch(/^[a-z0-9]{15}$/);
      chuong.add(tc.chuongSanh);
    }
    expect(chuong.size).toBe(MA_TRO_CHOI.length);
  });

  it("thế mở đầu: bên đi trước đến lượt, chưa kết thúc, có nước đi, ký hiệu khớp mẫu", () => {
    for (const ma of MA_TRO_CHOI) {
      const { luat } = TRO_CHOI[ma];
      const the = luat.khoiTao();
      expect(the.s).toBe("r");
      expect(the.b).toHaveLength(luat.HANG);
      expect(the.b[0]).toHaveLength(luat.COT);
      expect(luat.ketThuc(the, 0)).toBeNull();
      const ds = luat.nuocHopLe(the);
      expect(ds.length).toBeGreaterThan(0);
      for (const m of ds) expect(luat.MAU_KY.test(luat.kyHieu(m))).toBe(true);
      // Nước tìm theo ký hiệu là cùng nước
      expect(luat.kyHieu(luat.timNuoc(the, luat.kyHieu(ds[0])))).toBe(luat.kyHieu(ds[0]));
      expect(phatLai(luat, [luat.kyHieu(ds[0])]).the.s).toBe("b");
      expect(xacMinhVan(luat, [luat.kyHieu(ds[0])])).toEqual({ hop_le: false }); // ván chưa kết thúc
    }
  });

  it("mã trống là cờ tướng (bản ghi cũ), mã lạ thì không có", () => {
    expect(layTroChoi("")).toBe(TRO_CHOI.co_tuong);
    expect(layTroChoi(undefined)).toBe(TRO_CHOI.co_tuong);
    expect(layTroChoi("co_vua")).toBe(TRO_CHOI.co_vua);
    expect(layTroChoi("caro")).toBeNull();
    expect(locTroChoi("co_tuong")).toBe('(tro_choi="co_tuong" || tro_choi="")');
    expect(locTroChoi("co_vua")).toBe('tro_choi="co_vua"');
  });
});

describe("chuỗi giao diện", () => {
  it("5 ngôn ngữ có cùng bộ khóa", () => {
    const goc = Object.keys(CHU.vi).sort();
    for (const l of Object.keys(CHU)) expect(Object.keys(CHU[l]).sort(), l).toEqual(goc);
  });

  it("chuỗi riêng của cờ vua: đủ 5 ngôn ngữ, cùng khóa, chỉ đè lên khóa có sẵn hoặc khóa riêng của cờ vua", () => {
    const khoa = Object.keys(CHU_CO_VUA.vi).sort();
    expect(Object.keys(CHU_CO_VUA).sort()).toEqual(Object.keys(CHU).sort());
    for (const l of Object.keys(CHU_CO_VUA)) expect(Object.keys(CHU_CO_VUA[l]).sort(), l).toEqual(khoa);
    const rieng = ["quanQ", "quanR", "quanB", "quanN"];
    for (const k of khoa) if (!rieng.includes(k)) expect(CHU.vi, k).toHaveProperty(k);
  });
});
