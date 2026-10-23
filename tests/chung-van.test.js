import { describe, it, expect } from "vitest";
import { duyetNuoc, themNuoc, phatLai } from "../src/lib/chung/van.js";
import luat from "../src/lib/co-tuong/index.js";
import { khoiTao, nuocHopLe, kyHieu, apDung, NUOC_TOI_DA } from "../src/lib/co-tuong/luat.js";

// Nước hợp lệ đầu tiên của bên đến lượt sau các nước nuoc (lấy từ luật, không viết tay). s chỉ để đọc test cho rõ.
function nuocDauCuaBen(nuoc, s) {
  const d = duyetNuoc(luat, nuoc);
  expect(d.s).toBe(s);
  return kyHieu(nuocHopLe(d.the.b, s)[0]);
}

describe("duyetNuoc", () => {
  it("ván mới chưa có nước: đỏ đi trước", () => {
    const d = duyetNuoc(luat, []);
    expect(d.hop_le).toBe(true);
    expect(d.s).toBe("r");
    expect(d.ket_thuc).toBe(false);
  });

  it("nước đầu hợp lệ thì bên đi tiếp là đen", () => {
    const n1 = nuocDauCuaBen([], "r");
    const d = duyetNuoc(luat, [n1]);
    expect(d.hop_le).toBe(true);
    expect(d.s).toBe("b");
  });

  it("nước không có trong danh sách hợp lệ bị từ chối", () => {
    expect(duyetNuoc(luat, ["a0a1"]).hop_le).toBe(false); // a0 là quân đen, đỏ không đi được
  });

  it("sau hai nước (đỏ rồi đen) thì lại đến lượt đỏ", () => {
    const n1 = nuocDauCuaBen([], "r");
    const n2 = nuocDauCuaBen([n1], "b");
    const d = duyetNuoc(luat, [n1, n2]);
    expect(d.hop_le).toBe(true);
    expect(d.s).toBe("r");
  });
});

describe("themNuoc", () => {
  // Ván ngẫu nhiên hợp luật (hạt giống cố định để test lặp lại được)
  function vanNgauNhien(hat, toiDa = 130) {
    let x = hat;
    const ngauNhien = () => (x = (Math.imul(x, 1103515245) + 12345) >>> 0) / 4294967296;
    const b = khoiTao();
    let s = "r";
    const nuoc = [];
    while (nuoc.length < toiDa) {
      const ds = nuocHopLe(b, s);
      if (!ds.length) break;
      const m = ds[Math.floor(ngauNhien() * ds.length)];
      nuoc.push(kyHieu(m));
      apDung(b, m);
      s = s === "r" ? "b" : "r";
    }
    return nuoc;
  }

  it("cho kết quả giống duyetNuoc dọc theo nhiều ván", () => {
    for (let hat = 1; hat <= 3; hat++) {
      const van = vanNgauNhien(hat);
      const cacNuoc = [...Array.from({ length: Math.ceil(van.length / 7) }, (_, k) => 1 + 7 * k), van.length]; // mỗi 7 nước và nước cuối
      for (const i of cacNuoc) {
        const { the: t1, m, ...a } = themNuoc(luat, van.slice(0, i - 1), van[i - 1]);
        const { the: t2, ...d } = duyetNuoc(luat, van.slice(0, i));
        expect(a).toEqual(d);
        expect(t1).toEqual(t2);
        if (m) expect(luat.kyHieu(m)).toBe(van[i - 1]); // quá 120 nước thì cả hai đều từ chối
      }
    }
  });

  it("có ván chạm giới hạn số nước thì xử hòa như duyetNuoc", () => {
    const van = Array.from({ length: 40 }, (_, i) => vanNgauNhien(100 + i)).find((v) => v.length >= NUOC_TOI_DA);
    expect(van).toBeTruthy();
    const kq = themNuoc(luat, van.slice(0, NUOC_TOI_DA - 1), van[NUOC_TOI_DA - 1]);
    expect(kq).toMatchObject(duyetNuoc(luat, van.slice(0, NUOC_TOI_DA)));
  });

  it("từ chối nước sai luật, không coi là ván hỏng", () => {
    const n1 = nuocDauCuaBen([], "r");
    expect(themNuoc(luat, [], "a0a1")).toEqual({ hop_le: false });
    expect(themNuoc(luat, [n1], n1)).toEqual({ hop_le: false }); // đen không đi được quân đỏ
  });

  it("danh sách nước cũ không dựng lại được thì báo ván hỏng", () => {
    const n1 = nuocDauCuaBen([], "r");
    expect(themNuoc(luat, ["a0a1"], n1).van_hong).toBe(true); // nước đầu đi quân đen
    expect(themNuoc(luat, ["zz99"], n1).van_hong).toBe(true);
  });
});

describe("phatLai", () => {
  it("dựng tới nước k, nhớ nước cuối và quân bị ăn gần nhất", () => {
    const b = khoiTao();
    let s = "r";
    const nuoc = [];
    let anCuoi = null;
    for (let i = 0; i < 60; i++) {
      const ds = nuocHopLe(b, s);
      const m = ds.find((x) => x.an) || ds[i % ds.length];
      nuoc.push(kyHieu(m));
      if (m.an) anCuoi = m.an;
      apDung(b, m);
      s = s === "r" ? "b" : "r";
      if (!nuocHopLe(b, s).length) break;
    }
    const p = phatLai(luat, nuoc);
    expect(p.hop_le).toBe(true);
    expect(p.the.b).toEqual(b);
    expect(p.anCuoi).toBe(anCuoi);
    expect(kyHieu({ tu: p.nuocCuoi[0], den: p.nuocCuoi[1] })).toBe(nuoc.at(-1));
    // Không kiểm luật cho cùng kết quả với nước hợp lệ
    expect(phatLai(luat, nuoc, { kiemLuat: false }).the).toEqual(p.the);
    expect(phatLai(luat, nuoc, { den: 0 }).the).toEqual(luat.khoiTao());
  });

  it("nước sai luật hoặc ký hiệu hỏng thì dừng", () => {
    expect(phatLai(luat, ["a0a1"]).hop_le).toBe(false);
    expect(phatLai(luat, [42]).hop_le).toBe(false);
    expect(phatLai(luat, ["zz99"], { kiemLuat: false }).hop_le).toBe(false);
  });
});

describe("ván đã hết thì không đi tiếp", () => {
  it("sau đủ số nước tối đa (hòa), nước thêm bị từ chối ở cả duyetNuoc và themNuoc", () => {
    const b = khoiTao();
    let s = "r";
    const nuoc = [];
    // Hai xe đi qua đi lại để chắc chắn đủ số nước tối đa mà không ai hết nước
    const cap = { r: ["a9a8", "a8a9"], b: ["a0a1", "a1a0"] };
    while (nuoc.length < NUOC_TOI_DA + 1) {
      const ky = cap[s][Math.floor(nuoc.length / 2) % 2];
      const m = nuocHopLe(b, s).find((x) => kyHieu(x) === ky);
      nuoc.push(ky);
      apDung(b, m);
      s = s === "r" ? "b" : "r";
    }
    expect(duyetNuoc(luat, nuoc.slice(0, NUOC_TOI_DA))).toMatchObject({ hop_le: true, ket_thuc: true, ket_qua: "hoa" });
    expect(duyetNuoc(luat, nuoc).hop_le).toBe(false);
    expect(themNuoc(luat, nuoc.slice(0, NUOC_TOI_DA), nuoc[NUOC_TOI_DA])).toEqual({ hop_le: false });
  });
});
