import { describe, it, expect } from "vitest";
import {
  khoiTao, nuocHopLe, timNuoc, apDung, apKy, kyHieu, perft, tuFen, ketThuc, ketThucNhanh, quanBiAn, thieuQuan, biChieu, saoChep,
} from "../src/lib/co-vua/luat.js";
import luat from "../src/lib/co-vua/index.js";
import { duyetNuoc, themNuoc, phatLai, xacMinhVan } from "../src/lib/chung/van.js";

// Đi lần lượt các nước theo ký hiệu (phải hợp lệ), trả về thế cờ
function di(the, ...ky) {
  for (const k of ky) {
    const m = timNuoc(the, k);
    if (!m) throw new Error(`nước không hợp lệ: ${k}`);
    apDung(the, m);
  }
  return the;
}

// Ván ngẫu nhiên hợp luật (hạt giống cố định để test lặp lại được), dừng khi hết ván
function vanNgauNhien(hat, toiDa = 200) {
  let x = hat;
  const ngauNhien = () => (x = (Math.imul(x, 1103515245) + 12345) >>> 0) / 4294967296;
  const the = khoiTao();
  const nuoc = [];
  while (nuoc.length < toiDa && !ketThuc(the, nuoc.length)) {
    const ds = nuocHopLe(the);
    // Ưu tiên ăn quân và phong cấp để ván ngắn và có đủ các loại nước
    const hay = ds.filter((m) => m.an || m.phong || m.nhap);
    const nguon = hay.length && ngauNhien() < 0.5 ? hay : ds;
    const m = nguon[Math.floor(ngauNhien() * nguon.length)];
    nuoc.push(kyHieu(m));
    apDung(the, m);
  }
  return { nuoc, the };
}

describe("cờ vua: sinh nước (perft, số liệu chuẩn)", () => {
  it("thế mở đầu", () => {
    const the = khoiTao();
    expect(perft(the, 1)).toBe(20);
    expect(perft(the, 2)).toBe(400);
    expect(perft(the, 3)).toBe(8902);
  });

  it("Kiwipete: nhập thành, bắt qua đường, phong cấp", () => {
    const the = tuFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
    expect(perft(the, 1)).toBe(48);
    expect(perft(the, 2)).toBe(2039);
  });

  it("thế 3: tốt ghim ngang khi bắt qua đường", () => {
    const the = tuFen("8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1");
    expect(perft(the, 1)).toBe(14);
    expect(perft(the, 2)).toBe(191);
    expect(perft(the, 3)).toBe(2812);
  });

  it("thế 4 và 5", () => {
    expect(perft(tuFen("r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1"), 2)).toBe(264);
    expect(perft(tuFen("rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8"), 2)).toBe(1486);
  });
});

describe("cờ vua: nước đặc biệt", () => {
  it("nhập thành cánh vua: xe sang f1, mất quyền nhập thành của trắng", () => {
    const the = di(tuFen("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"), "e1g1");
    expect(the.b[7][6]).toBe("rK");
    expect(the.b[7][5]).toBe("rR");
    expect(the.b[7][7]).toBeNull();
    expect(the.nhap).toBe("kq");
  });

  it("không nhập thành đi qua ô bị tấn công, cánh còn lại vẫn được", () => {
    const the = tuFen("5r1k/8/8/8/8/8/8/R3K2R w KQ - 0 1");
    expect(timNuoc(the, "e1g1")).toBeNull();
    expect(timNuoc(the, "e1c1")).toMatchObject({ nhap: "Q" });
  });

  it("xe bị ăn ở góc thì mất quyền nhập thành bên đó", () => {
    const the = di(tuFen("r3k2r/8/8/8/8/8/8/R3K1BR b KQkq - 0 1"), "a8a1");
    expect(the.nhap).toBe("Kk");
  });

  it("bắt tốt qua đường ngay sau nước đi hai ô, tốt bị bắt biến mất", () => {
    const the = di(tuFen("4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1"), "d7d5");
    const m = timNuoc(the, "e5d6");
    expect(m).toMatchObject({ qua: true, an: "bP", oAn: [3, 3] });
    apDung(the, m);
    expect(the.b[3][3]).toBeNull();
    expect(the.b[2][3]).toBe("rP");
  });

  it("để qua một nước thì không bắt qua đường được nữa", () => {
    const the = di(tuFen("4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1"), "d7d5", "e1e2", "e8e7");
    expect(timNuoc(the, "e5d6")).toBeNull();
  });

  it("phong cấp: phải ghi loại quân, có đủ bốn lựa chọn", () => {
    const the = tuFen("8/P6k/8/8/8/8/8/K7 w - - 0 1");
    expect(timNuoc(the, "a7a8")).toBeNull();
    expect(nuocHopLe(the).filter((m) => m.tu[0] === 1).map(kyHieu).sort()).toEqual(["a7a8b", "a7a8n", "a7a8q", "a7a8r"]);
    di(the, "a7a8n");
    expect(the.b[0][0]).toBe("rN");
  });

  it("đi theo ký hiệu không kiểm luật cho cùng thế cờ với đi có kiểm luật", () => {
    for (let hat = 1; hat <= 6; hat++) {
      const { nuoc, the } = vanNgauNhien(hat);
      const nhanh = khoiTao();
      for (const k of nuoc) expect(apKy(nhanh, k)).not.toBeNull();
      expect(nhanh).toEqual(the);
    }
  });
});

describe("cờ vua: kết thúc ván", () => {
  it("chiếu hết (thế chiếu hết nhanh nhất): bên bị chiếu hết thua", () => {
    const the = di(khoiTao(), "f2f3", "e7e5", "g2g4", "d8h4");
    expect(ketThuc(the, 4)).toEqual({ ket_qua: "den", ly_do: "chieu_het" });
    expect(xacMinhVan(luat, ["f2f3", "e7e5", "g2g4", "d8h4"])).toEqual({ hop_le: true, ket_qua: "thua" });
  });

  it("hết nước đi mà không bị chiếu là hòa (pat)", () => {
    const the = tuFen("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
    expect(biChieu(the.b, "b")).toBe(false);
    expect(ketThuc(the, 10)).toEqual({ ket_qua: "hoa", ly_do: "hoa_pat" });
  });

  it("lặp thế cờ 3 lần thì hòa, và không được đi tiếp sau đó", () => {
    const vong = ["g1f3", "g8f6", "f3g1", "f6g8"];
    const nuoc = [...vong, ...vong];
    const the = di(khoiTao(), ...nuoc);
    expect(ketThucNhanh(the, nuoc.length)).toEqual({ ket_qua: "hoa", ly_do: "lap_3" });
    expect(duyetNuoc(luat, nuoc)).toMatchObject({ hop_le: true, ket_thuc: true, ket_qua: "hoa", ly_do: "lap_3" });
    expect(duyetNuoc(luat, [...nuoc, "e2e4"]).hop_le).toBe(false);
    expect(themNuoc(luat, nuoc, "e2e4")).toEqual({ hop_le: false });
  });

  it("50 nước không ăn quân và không đi tốt thì hòa", () => {
    const the = di(tuFen("4k3/8/8/8/8/8/R7/4K3 w - - 99 80"), "a2a3");
    expect(ketThucNhanh(the, 159)).toEqual({ ket_qua: "hoa", ly_do: "luat_50" });
  });

  it("không đủ quân để chiếu hết", () => {
    const q = (fen) => thieuQuan(tuFen(fen).b);
    expect(q("8/8/4k3/8/8/4K3/8/8 w - - 0 1")).toBe(true);
    expect(q("8/8/4k3/8/8/4KB2/8/8 w - - 0 1")).toBe(true);
    expect(q("8/8/4kn2/8/8/4K3/8/8 w - - 0 1")).toBe(true);
    expect(q("8/8/2b1k3/8/8/4KB2/8/8 w - - 0 1")).toBe(true); // hai tượng cùng màu ô
    expect(q("8/8/3bk3/8/8/4KB2/8/8 w - - 0 1")).toBe(false); // hai tượng khác màu ô
    expect(q("8/8/4k3/8/8/4KNN1/8/8 w - - 0 1")).toBe(false);
    expect(q("8/8/4k3/8/8/4K2P/8/8 w - - 0 1")).toBe(false);
  });

  it("ván ngẫu nhiên đã kết thúc thì xác minh được và có kết quả", () => {
    for (let hat = 10; hat <= 15; hat++) {
      const { nuoc, the } = vanNgauNhien(hat, 600);
      const kt = ketThuc(the, nuoc.length);
      expect(kt).not.toBeNull();
      const kq = xacMinhVan(luat, nuoc);
      expect(kq.hop_le).toBe(true);
      expect(kq.ket_qua).toBe(kt.ket_qua === "do" ? "thang" : kt.ket_qua === "den" ? "thua" : "hoa");
    }
  });
});

describe("cờ vua: dựng lại ván và thêm nước", () => {
  it("themNuoc cho cùng kết quả với duyetNuoc dọc theo ván", () => {
    for (let hat = 20; hat <= 22; hat++) {
      const { nuoc } = vanNgauNhien(hat);
      for (let i = 1; i <= nuoc.length; i += 9) {
        const { the: t1, m, ...a } = themNuoc(luat, nuoc.slice(0, i - 1), nuoc[i - 1]);
        const { the: t2, ...d } = duyetNuoc(luat, nuoc.slice(0, i));
        expect(a).toEqual(d);
        expect(t1).toEqual(t2);
        expect(kyHieu(m)).toBe(nuoc[i - 1]);
      }
    }
  });

  it("phatLai nhớ quân bị ăn gần nhất, kể cả bắt qua đường", () => {
    const nuoc = ["e2e4", "a7a6", "e4e5", "d7d5", "e5d6"];
    const p = phatLai(luat, nuoc);
    expect(p.hop_le).toBe(true);
    expect(p.anCuoi).toBe("bP");
    expect(p.nuocCuoi).toEqual([[3, 4], [2, 3]]);
  });

  it("ký hiệu sai dạng hoặc sai luật bị từ chối", () => {
    expect(duyetNuoc(luat, ["e2e5"]).hop_le).toBe(false);
    expect(duyetNuoc(luat, ["e7e5"]).hop_le).toBe(false); // trắng đi trước
    expect(phatLai(luat, ["zz"], { kiemLuat: false }).hop_le).toBe(false);
    expect(luat.MAU_KY.test("e7e8q")).toBe(true);
    expect(luat.MAU_KY.test("e7e8k")).toBe(false);
  });
});

describe("cờ vua: quân bị ăn", () => {
  it("thế mở đầu chưa có quân nào bị ăn", () => {
    expect(quanBiAn(khoiTao().b)).toEqual({ r: [], b: [] });
  });

  it("phong cấp không tính là mất quân, tốt đã phong được trừ đi", () => {
    // Trắng còn 6 tốt và có hai hậu (một hậu từ tốt): thiếu một xe, hai tượng, một mã và một tốt bị ăn
    const the = tuFen("4k3/8/8/8/8/8/1PPPPPP1/QQ2K1NR w - - 0 1");
    expect(quanBiAn(the.b).r).toEqual(["R", "B", "B", "N", "P"]);
    // Đen chỉ còn vua: mất hết
    expect(quanBiAn(the.b).b).toEqual(["Q", "R", "R", "B", "B", "N", "N", "P", "P", "P", "P", "P", "P", "P", "P"]);
  });

  it("saoChep không dùng chung bàn và bộ đếm", () => {
    const a = khoiTao();
    const b = saoChep(a);
    di(b, "e2e4");
    expect(a.b[6][4]).toBe("rP");
    expect(Object.keys(a.dem)).toHaveLength(1);
  });
});
