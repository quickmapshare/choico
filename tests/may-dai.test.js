import { describe, it, expect, afterEach } from "vitest";
import { bamDanhMay } from "../functions/_lib/may-dai.js";
import { denLuotMay, duocDiNuoc, kiemHetGio } from "../src/lib/chung/tran.js";
import { MUC } from "../src/lib/co-tuong/muc.js";
import { MUC_TOI_DA, thoiGianNghi } from "../src/lib/chung/diem.js";

// PocketBase giả trong bộ nhớ, đủ cho việc đặt máy lên đài
function taoPocketBase() {
  const trans = {};
  globalThis.fetch = async (url, opt = {}) => {
    const ok = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    const bang = String(url).match(/\/collections\/([a-z_]+)\/records/)?.[1];
    if (bang === "co_tuong_tin_hieu") return ok({ id: "tin" });
    if (bang === "co_tuong_tran" && opt.method === "POST") {
      const moi = { id: "x" + Math.random().toString(36).slice(2), ...JSON.parse(opt.body) };
      trans[moi.id] = moi;
      return ok(moi);
    }
    if (bang === "co_tuong_tran" && opt.method === "DELETE") {
      delete trans[String(url).match(/records\/([a-z0-9]+)/)[1]];
      return ok({});
    }
    // PocketBase chỉ trả các trường được yêu cầu qua "fields": mock cũng phải vậy thì mới bắt được lỗi thiếu trường
    const fields = new URL(url).searchParams.get("fields");
    const cat = (t) => (fields ? Object.fromEntries(fields.split(",").map((f) => [f, t[f]])) : t);
    return ok({ items: Object.values(trans).map(cat) });
  };
  return trans;
}

afterEach(() => {
  delete globalThis.fetch;
});

const tranMay = (nuoc = [], extra = {}) => ({ loai: "dai", do: "may_3", den: "nguoi", cap_do: 3, trang_thai: "dang_dau", nuoc, ...extra });

describe("máy đứng sẵn trên đài", () => {
  it("mỗi mức có đúng một máy, chế độ cùng mức", async () => {
    const trans = taoPocketBase();
    await bamDanhMay("http://pb", {});
    const ds = Object.values(trans);
    expect(ds.map((t) => t.cap_do).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(ds.every((t) => t.do === `may_${t.cap_do}` && t.che_do === "cung" && t.trang_thai === "cho")).toBe(true);
  });

  it("mức nào còn máy thì không tạo thêm, dù tải sảnh nhiều lần", async () => {
    const trans = taoPocketBase();
    for (let i = 0; i < 4; i++) await bamDanhMay("http://pb", {});
    expect(Object.keys(trans).length).toBe(5);
  });

  it("dọn các máy trùng mức đã sinh ra từ lỗi cũ, giữ một máy mỗi mức", async () => {
    const trans = taoPocketBase();
    await bamDanhMay("http://pb", {});
    // Thêm máy trùng ở mức 2 và 3
    for (const [id, muc] of [["d1", 2], ["d2", 2], ["d3", 3]]) {
      trans[id] = { id, loai: "dai", trang_thai: "cho", do: `may_${muc}`, cap_do: muc, tin_hieu: "" };
    }
    expect(Object.keys(trans).length).toBe(8);
    await bamDanhMay("http://pb", {});
    expect(Object.values(trans).map((t) => t.cap_do).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("dọn máy trùng với số lượng lớn", () => {
  it("mỗi lần tải sảnh chỉ dọn một ít (để không quá giới hạn lời gọi), nhiều lần thì dọn hết", async () => {
    const trans = taoPocketBase();
    await bamDanhMay("http://pb", {});
    for (let i = 0; i < 200; i++) trans[`d${i}`] = { id: `d${i}`, loai: "dai", trang_thai: "cho", do: "may_1", cap_do: 1, tin_hieu: "" };
    expect(Object.keys(trans).length).toBe(205);
    await bamDanhMay("http://pb", {});
    const conLai = Object.keys(trans).length;
    expect(conLai).toBeGreaterThan(190); // một lần chỉ xóa vài bản, không xóa cả trăm bản một lúc
    for (let i = 0; i < 60 && Object.keys(trans).length > 5; i++) await bamDanhMay("http://pb", {});
    expect(Object.values(trans).map((t) => t.cap_do).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("lượt đi trong trận với máy", () => {
  it("máy đỏ đi trước: lượt chẵn là của máy, lượt lẻ là của người", () => {
    expect(denLuotMay(tranMay([]))).toBe(true);
    expect(denLuotMay(tranMay(["a0a1"]))).toBe(false);
    expect(denLuotMay(tranMay(["a0a1", "a9a8"]))).toBe(true);
  });

  it("trận hai người thì không có lượt của máy", () => {
    expect(denLuotMay(tranMay([], { do: "nguoi-1" }))).toBe(false);
  });

  it("đến lượt máy thì người thách đấu (bên đen) gửi nước thay cho máy, bên khác thì không", () => {
    expect(duocDiNuoc(tranMay([]), "b")).toBe(true);
    expect(duocDiNuoc(tranMay([]), "r")).toBe(true); // bên đỏ (máy) đúng lượt; người dùng không bao giờ là bên đỏ trong trận máy
    expect(duocDiNuoc(tranMay(["a0a1"]), "b")).toBe(true); // lượt của chính người chơi
    expect(duocDiNuoc(tranMay(["a0a1"]), "r")).toBe(false); // máy không đi khi chưa đến lượt
  });

  it("trận hai người: chỉ đúng bên đến lượt mới đi được", () => {
    const t = tranMay([], { do: "nguoi-1" });
    expect(duocDiNuoc(t, "r")).toBe(true);
    expect(duocDiNuoc(t, "b")).toBe(false);
  });

  it("máy không có hạn nước nên không bao giờ hết giờ; người chơi quá hạn thì thua", () => {
    const muoi = Date.parse("2026-10-23T12:00:00Z");
    expect(kiemHetGio(tranMay([], { han_nuoc: "" }), muoi)).toBe(null);
    const quaHan = tranMay(["a0a1"], { han_nuoc: "2026-10-23T11:59:00Z" });
    expect(kiemHetGio(quaHan, muoi)).toEqual({ ket_qua: "do", ly_do: "het_gio" }); // lượt bên đen, bên đỏ (máy) thắng
  });
});

describe("mức của máy", () => {
  it("đủ năm mức và thời gian nghĩ bằng số mức tính theo giây", () => {
    expect(Object.keys(MUC).map(Number)).toEqual([1, 2, 3, 4, 5]);
    expect(MUC_TOI_DA).toBe(5);
    expect(thoiGianNghi(5)).toBe(5000);
  });
});
