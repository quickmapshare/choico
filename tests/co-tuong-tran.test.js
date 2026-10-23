import { describe, it, expect } from "vitest";
import { duyetNuoc, kiemHetGio, benCuaToi, ketQuaChoBen, benDenLuot, GIAY_MOI_NUOC } from "../src/lib/co-tuong-tran.js";
import { khoiTao, nuocHopLe, kyHieu } from "../src/lib/co-tuong.js";

// Một nước hợp lệ đầu tiên của đỏ, rồi của đen (lấy từ luật, không viết tay)
function nuocDauCuaBen(nuoc, s) {
  // Dựng bàn theo nuoc để lấy nước hợp lệ đầu tiên của bên s
  const d = duyetNuoc(nuoc);
  return kyHieu(nuocHopLe(d.b, s)[0]);
}

describe("duyetNuoc", () => {
  it("ván mới chưa có nước: đỏ đi trước", () => {
    const d = duyetNuoc([]);
    expect(d.hop_le).toBe(true);
    expect(d.s).toBe("r");
    expect(d.ket_thuc).toBe(false);
  });

  it("nước đầu hợp lệ thì bên đi tiếp là đen", () => {
    const n1 = nuocDauCuaBen([], "r");
    const d = duyetNuoc([n1]);
    expect(d.hop_le).toBe(true);
    expect(d.s).toBe("b");
  });

  it("nước không có trong danh sách hợp lệ bị từ chối", () => {
    expect(duyetNuoc(["a0a1"]).hop_le).toBe(false); // a0 là quân đen, đỏ không đi được
  });

  it("sau hai nước (đỏ rồi đen) thì lại đến lượt đỏ", () => {
    const n1 = nuocDauCuaBen([], "r");
    const n2 = nuocDauCuaBen([n1], "b");
    const d = duyetNuoc([n1, n2]);
    expect(d.hop_le).toBe(true);
    expect(d.s).toBe("r");
  });
});

describe("kiemHetGio", () => {
  const tran = { trang_thai: "dang_dau", nuoc: [], han_nuoc: new Date(1000_000).toISOString() };
  it("chưa hết giờ thì không có kết quả", () => {
    expect(kiemHetGio(tran, 1000_000 - 1)).toBeNull();
  });
  it("hết giờ khi đỏ đến lượt: đỏ thua", () => {
    expect(kiemHetGio(tran, 1000_000 + 1)).toEqual({ ket_qua: "den", ly_do: "het_gio" });
  });
  it("hết giờ khi đen đến lượt: đen thua", () => {
    const t = { ...tran, nuoc: ["a0a1"] };
    expect(kiemHetGio(t, 1000_000 + 1)).toEqual({ ket_qua: "do", ly_do: "het_gio" });
  });
  it("trận đã kết thúc thì không tính giờ nữa", () => {
    expect(kiemHetGio({ ...tran, trang_thai: "ket_thuc" }, 9e12)).toBeNull();
  });
});

describe("benCuaToi và điểm", () => {
  const tran = { do: "A", den: "B" };
  it("nhận đúng bên của người chơi", () => {
    expect(benCuaToi(tran, "A")).toBe("r");
    expect(benCuaToi(tran, "B")).toBe("b");
    expect(benCuaToi(tran, "C")).toBeNull();
  });
  it("điểm theo bên: thắng, thua, hòa như đấu máy", () => {
    expect(ketQuaChoBen("do", "r")).toBe("thang");
    expect(ketQuaChoBen("do", "b")).toBe("thua");
    expect(ketQuaChoBen("hoa", "r")).toBe("hoa");
    expect(ketQuaChoBen("hoa", "b")).toBe("hoa");
  });
  it("lượt theo số nước đã đi", () => {
    expect(benDenLuot(0)).toBe("r");
    expect(benDenLuot(1)).toBe("b");
    expect(GIAY_MOI_NUOC).toBe(60);
  });
});
