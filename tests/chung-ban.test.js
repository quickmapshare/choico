import { describe, it, expect } from "vitest";
import { tongThoiGianHieuUng, phatTiengNuoc, timVua, THOI_GIAN } from "../src/lib/chung/ban.js";
import { taoToa, KC, LE } from "../src/lib/co-tuong/ve.js";
import veCoVua from "../src/lib/co-vua/ve.js";

describe("toạ độ bàn cờ tướng", () => {
  it("bàn thường: cột 0 bên trái, hàng 0 ở trên", () => {
    const toa = taoToa();
    expect(toa.x(0)).toBe(LE);
    expect(toa.y(0)).toBe(LE);
    expect(toa.x(8)).toBe(LE + 8 * KC);
    expect(toa.y(9)).toBe(LE + 9 * KC);
  });

  it("bàn xoay 180 độ: góc trên trái đổi thành góc dưới phải", () => {
    const toa = taoToa(true);
    expect(toa.x(8)).toBe(LE);
    expect(toa.y(9)).toBe(LE);
    expect(toa.x(0)).toBe(LE + 8 * KC);
    expect(toa.y(0)).toBe(LE + 9 * KC);
  });

  it("xoay hai lần thì về lại bàn thường", () => {
    const thuong = taoToa();
    const xoay = taoToa(true);
    for (let i = 0; i < 9; i++) expect(xoay.x(8 - i)).toBe(thuong.x(i));
    for (let i = 0; i < 10; i++) expect(xoay.y(9 - i)).toBe(thuong.y(i));
  });
});

describe("thời gian hiệu ứng", () => {
  it("nước thường: quân trượt rồi vòng sáng", () => {
    expect(tongThoiGianHieuUng(false)).toBe(THOI_GIAN.DI + THOI_GIAN.AN);
  });

  it("nước chiếu: kéo dài đến hết nhãn chiếu", () => {
    expect(tongThoiGianHieuUng(true)).toBe(THOI_GIAN.DI + THOI_GIAN.CHIEU);
  });
});

describe("tiếng đi quân", () => {
  function amGia() {
    const goi = [];
    return { goi, phat: (loai, tre) => goi.push([loai, tre]) };
  }

  it("đi thường phát tiếng đi, đúng lúc quân tới nơi", () => {
    const am = amGia();
    phatTiengNuoc(am, false, false);
    expect(am.goi).toEqual([["di", THOI_GIAN.DI]]);
  });

  it("ăn quân phát tiếng ăn; chiếu thì phát thêm tiếng chiếu", () => {
    const am = amGia();
    phatTiengNuoc(am, true, true);
    expect(am.goi).toEqual([
      ["an", THOI_GIAN.DI],
      ["chieu", THOI_GIAN.DI],
    ]);
  });
});

describe("toạ độ bàn cờ vua", () => {
  it("tâm ô a8 ở góc trên trái, h1 ở góc dưới phải; xoay thì đổi chỗ", () => {
    const t = veCoVua.taoToa();
    const x = veCoVua.taoToa(true);
    const nua = veCoVua.KC / 2;
    expect([t.x(0) - nua, t.y(0) - nua]).toEqual([22, 22]);
    expect([t.x(7) + nua, t.y(7) + nua]).toEqual([veCoVua.RONG - 22, veCoVua.CAO - 22]);
    for (let i = 0; i < 8; i++) {
      expect(x.x(7 - i)).toBe(t.x(i));
      expect(x.y(7 - i)).toBe(t.y(i));
    }
  });
});

describe("tìm vua trên bàn bất kỳ cỡ nào", () => {
  it("bàn 10 x 9 và 8 x 8", () => {
    const b = Array.from({ length: 10 }, () => Array(9).fill(null));
    b[9][4] = "rK";
    expect(timVua(b, "r")).toEqual([9, 4]);
    expect(timVua(b, "b")).toBeNull();
    const c = Array.from({ length: 8 }, () => Array(8).fill(null));
    c[0][4] = "bK";
    expect(timVua(c, "b")).toEqual([0, 4]);
  });
});
