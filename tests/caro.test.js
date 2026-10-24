import { describe, it, expect } from "vitest";
import caro from "../src/lib/caro/index.js";
import { khoiTao, nuocHopLe, timNuoc, apDung, apKy, kyHieu, docKy, benThang, ketThuc, ketThucNhanh, MAU_KY } from "../src/lib/caro/luat.js";

describe("luật cờ caro", () => {
  it("thế mở đầu: bàn 15x15 trống, bên đỏ đi trước, 225 nước hợp lệ", () => {
    const the = khoiTao();
    expect(the.s).toBe("r");
    expect(the.b).toHaveLength(15);
    expect(the.b[0]).toHaveLength(15);
    expect(nuocHopLe(the)).toHaveLength(225);
  });

  it("ký hiệu nước đi khớp mẫu và đọc lại đúng ô", () => {
    expect(MAU_KY.test("h8")).toBe(true);
    expect(MAU_KY.test("a1")).toBe(true);
    expect(MAU_KY.test("o15")).toBe(true);
    expect(MAU_KY.test("p1")).toBe(false);
    expect(MAU_KY.test("a16")).toBe(false);
    expect(docKy("a15")).toEqual([0, 0]); // hàng 15 là hàng trên cùng (chỉ số 0)
    expect(docKy("o1")).toEqual([14, 14]); // hàng 1 là hàng dưới cùng, cột o là cột cuối
    expect(kyHieu({ den: [0, 0] })).toBe("a15");
  });

  it("đặt quân đổi lượt, ô đã có quân thì không tìm/đi được nữa", () => {
    const the = khoiTao();
    const m = timNuoc(the, "h8");
    expect(m).toEqual({ tu: [7, 7], den: [7, 7], an: null });
    apDung(the, m);
    expect(the.b[7][7]).toBe("r");
    expect(the.s).toBe("b");
    expect(timNuoc(the, "h8")).toBeNull();
  });

  it("apKy như apDung nhưng không kiểm toàn bộ luật (chỉ kiểm ô trống)", () => {
    const the = khoiTao();
    const m = apKy(the, "a15");
    expect(m).toEqual({ tu: [0, 0], den: [0, 0], an: null });
    expect(the.b[0][0]).toBe("r");
    expect(the.s).toBe("b");
    expect(apKy(the, "a15")).toBeNull(); // ô đã có quân
    expect(apKy(the, "xx")).toBeNull(); // ký hiệu sai dạng
  });

  it("5 quân liên tiếp ngang thì bên đó thắng, biChieu/quanBiAn luôn trung lập", () => {
    const the = khoiTao();
    for (let c = 0; c < 5; c++) the.b[7][c] = "r";
    expect(benThang(the.b)).toBe("r");
    expect(ketThucNhanh(the, 9)).toEqual({ ket_qua: "do", ly_do: "thang_5" });
    expect(caro.biChieu(the, "r")).toBe(false);
    expect(caro.quanBiAn(the)).toEqual({ r: [], b: [] });
  });

  it("5 quân liên tiếp chéo cũng thắng, bên đen thắng thì ket_qua là den", () => {
    const the = khoiTao();
    for (let i = 0; i < 5; i++) the.b[i][i] = "b";
    expect(benThang(the.b)).toBe("b");
    expect(ketThuc(the, 9).ket_qua).toBe("den");
  });

  it("4 quân không đủ 5 thì chưa ai thắng", () => {
    const the = khoiTao();
    for (let c = 0; c < 4; c++) the.b[7][c] = "r";
    expect(benThang(the.b)).toBeNull();
    expect(ketThucNhanh(the, 4)).toBeNull();
  });

  it("hết ô trống mà chưa ai đủ 5 thì hòa", () => {
    const the = khoiTao();
    expect(ketThucNhanh(the, 225)).toEqual({ ket_qua: "hoa", ly_do: "het_nuoc_hoa" });
  });
});
