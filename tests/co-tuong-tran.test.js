import { describe, it, expect } from "vitest";
import { laMay, duyetNuoc, kiemHetGio, benCuaToi, ketQuaChoBen, benDenLuot, GIAY_MOI_NUOC, maKhepKinConHieuLuc, xuLyHetGio, kiemBoDo, soDaiConHieuLuc } from "../src/lib/co-tuong-tran.js";
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

describe("maKhepKinConHieuLuc", () => {
  const han = Date.parse("2026-10-23T12:00:00Z");
  const ma = { loai: "khep_kin", trang_thai: "cho", het_han: new Date(han).toISOString() };
  it("còn trong 24 giờ và chưa ai vào thì dùng được", () => {
    expect(maKhepKinConHieuLuc(ma, han - 1)).toBe(true);
  });
  it("hết hạn thì không dùng được", () => {
    expect(maKhepKinConHieuLuc(ma, han)).toBe(false);
  });
  it("người tạo vô hiệu hóa (huy) thì không dùng được", () => {
    expect(maKhepKinConHieuLuc({ ...ma, trang_thai: "huy" }, han - 1)).toBe(false);
  });
  it("đã có người vào (dang_dau) thì không nhận thêm người", () => {
    expect(maKhepKinConHieuLuc({ ...ma, trang_thai: "dang_dau" }, han - 1)).toBe(false);
  });
  it("ván đấu thượng đài không có mã khép kín", () => {
    expect(maKhepKinConHieuLuc({ ...ma, loai: "dai" }, han - 1)).toBe(false);
  });
});

describe("xuLyHetGio", () => {
  const han = Date.parse("2026-10-23T12:00:00Z");
  // Đỏ đã đi một nước, đến lượt đen và đen hết giờ; đỏ là bên đang chờ
  const tran = { trang_thai: "dang_dau", nuoc: ["a0a1"], han_nuoc: new Date(han).toISOString() };
  const sau = han + 5000;
  it("chưa hết giờ thì chưa được xử", () => {
    expect(xuLyHetGio(tran, "r", "xu_thua", han - 1)).toEqual({ loi: "chua_het_gio" });
  });
  it("người đang chậm không được tự quyết", () => {
    expect(xuLyHetGio(tran, "b", "them_1_phut", sau)).toEqual({ loi: "khong_phai_ben_cho" });
  });
  it("cho nghĩ thêm 1 phút: hạn mới là 60 giây từ bây giờ", () => {
    const kq = xuLyHetGio(tran, "r", "them_1_phut", sau);
    expect(Date.parse(kq.cap_nhat.han_nuoc)).toBe(sau + 60_000);
  });
  it("cho nghĩ thoải mái: không còn hạn", () => {
    expect(xuLyHetGio(tran, "r", "thoai_mai", sau)).toEqual({ cap_nhat: { han_nuoc: "" } });
  });
  it("xử thua: bên đang chờ thắng", () => {
    expect(xuLyHetGio(tran, "r", "xu_thua", sau)).toEqual({ ket_thuc: { ket_qua: "do", ly_do: "het_gio" } });
  });
  it("không có hạn (thoải mái) thì không bao giờ hết giờ", () => {
    expect(xuLyHetGio({ ...tran, han_nuoc: "" }, "r", "xu_thua", sau)).toEqual({ loi: "chua_het_gio" });
  });
  it("lựa chọn lạ bị từ chối", () => {
    expect(xuLyHetGio(tran, "r", "gi_do", sau)).toEqual({ loi: "lua_chon_khong_hop_le" });
  });
});

describe("kiemBoDo", () => {
  const han = Date.parse("2026-10-23T12:00:00Z");
  const tran = { trang_thai: "dang_dau", han_nuoc: new Date(han).toISOString(), updated: "2026-10-23 11:59:00.000Z" };
  it("mới hết giờ thì chưa đóng", () => {
    expect(kiemBoDo(tran, han + 60_000)).toBe(false);
  });
  it("quá hạn 5 phút mà không ai quyết định thì đóng", () => {
    expect(kiemBoDo(tran, han + 5 * 60_000 + 1)).toBe(true);
  });
  it("trận đã xong hoặc đang chờ thì không đóng kiểu bỏ dở", () => {
    expect(kiemBoDo({ ...tran, trang_thai: "ket_thuc" }, han + 9e6)).toBe(false);
    expect(kiemBoDo({ ...tran, trang_thai: "cho" }, han + 9e6)).toBe(false);
  });
  it("nước nghĩ thoải mái: đóng sau 60 phút không ai thao tác", () => {
    const t = { trang_thai: "dang_dau", han_nuoc: "", updated: "2026-10-23 12:00:00.000Z" };
    expect(kiemBoDo(t, han + 59 * 60_000)).toBe(false);
    expect(kiemBoDo(t, han + 61 * 60_000)).toBe(true);
  });
});

describe("soDaiConHieuLuc", () => {
  const luc = Date.parse("2026-10-23T12:00:00Z");
  const dai = { loai: "dai", trang_thai: "cho", created: "2026-10-23 12:00:00.000Z" };
  it("mới lên đài thì còn hiệu lực", () => {
    expect(soDaiConHieuLuc(dai, luc + 29 * 60_000)).toBe(true);
  });
  it("quá 30 phút không ai thách đấu thì hết hiệu lực", () => {
    expect(soDaiConHieuLuc(dai, luc + 31 * 60_000)).toBe(false);
  });
  it("đã có người vào hoặc không phải thượng đài thì không còn trên đài", () => {
    expect(soDaiConHieuLuc({ ...dai, trang_thai: "dang_dau" }, luc)).toBe(false);
    expect(soDaiConHieuLuc({ ...dai, loai: "khep_kin" }, luc)).toBe(false);
  });
  it("thiếu thời gian tạo thì không tin được, coi như hết hiệu lực", () => {
    expect(soDaiConHieuLuc({ loai: "dai", trang_thai: "cho" }, luc)).toBe(false);
  });
});

describe("máy trên thượng đài", () => {
  const luc = Date.parse("2026-10-23T12:00:00Z");
  it("nhận diện mã máy, không nhầm với người chơi", () => {
    expect(laMay("may_3")).toBe(true);
    expect(laMay("abc123")).toBe(false);
    expect(laMay(null)).toBe(false);
  });
  it("máy đứng trên đài mãi, không hết hạn như người chơi", () => {
    const may = { loai: "dai", trang_thai: "cho", do: "may_3", created: "2026-10-23 12:00:00.000Z" };
    expect(soDaiConHieuLuc(may, luc + 10 * 3600_000)).toBe(true);
  });
});
