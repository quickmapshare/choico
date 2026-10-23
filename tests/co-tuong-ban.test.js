import { describe, it, expect } from "vitest";
import { taoToa, tongThoiGianHieuUng, phatTiengNuoc, THOI_GIAN, KC, LE } from "../src/lib/co-tuong-ban.js";

describe("toạ độ bàn", () => {
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
