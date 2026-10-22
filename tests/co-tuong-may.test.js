import { describe, it, expect } from "vitest";
import { khoiTao, nuocHopLe, apDung, kyHieu, xepHangNuoc, biChieu, nuocThuVi } from "../src/lib/co-tuong.js";
import { timNuocMay, biChieuMay, nuocGiaMay } from "../src/lib/co-tuong-may.js";

const doiBen = (s) => (s === "r" ? "b" : "r");

// Các thế cờ lấy từ ván đi ngẫu nhiên có hạt giống cố định, để test lặp lại được
function theCoMau(soVan = 12) {
  let h = 20240601;
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };
  const ra = [];
  for (let v = 0; v < soVan; v++) {
    const b = khoiTao();
    let s = "r";
    const dai = 6 + Math.floor(rnd() * 70);
    for (let i = 0; i < dai; i++) {
      const ds = nuocHopLe(b, s);
      if (!ds.length) break;
      if (i % 5 === 0) ra.push({ b: structuredClone(b), s });
      apDung(b, ds[Math.floor(rnd() * ds.length)]);
      s = doiBen(s);
    }
  }
  return ra;
}

// Bàn trống có hai tướng không đối mặt, rồi đặt thêm quân
function banTrong(quan) {
  const b = Array.from({ length: 10 }, () => Array(9).fill(null));
  for (const [r, c, p] of quan) b[r][c] = p;
  return b;
}

describe("máy tìm nước (mảng số): khớp luật co-tuong.js", () => {
  const cac = theCoMau();

  it("danh sách nước hợp lệ ở gốc giống nuocHopLe", () => {
    for (const { b, s } of cac) {
      const cu = nuocHopLe(b, s).map(kyHieu).sort();
      const moi = timNuocMay(b, s, { doSauToiDa: 1, soNuoc: 1000 }).xep.map((x) => x.nuoc).sort();
      expect(moi).toEqual(cu);
    }
  });

  it("nước giả hợp lệ giống nuocThuVi", () => {
    for (const { b, s } of cac) {
      const cu = [];
      for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) {
        if (b[r][c] && b[r][c][0] === s) for (const [r2, c2] of nuocThuVi(b, r, c)) cu.push(kyHieu({ tu: [r, c], den: [r2, c2] }));
      }
      expect(nuocGiaMay(b, s).sort()).toEqual(cu.sort());
    }
  });

  it("kiểm tra chiếu giống biChieu", () => {
    for (const { b } of cac) {
      for (const s of ["r", "b"]) expect(biChieuMay(b, s)).toBe(biChieu(b, s));
    }
  });

  it("điểm từng nước ở độ sâu 2 và 3 giống bản cũ (bỏ các thế đã thấy chiếu hết)", () => {
    cac.forEach(({ b, s }, i) => {
      for (const d of i < 4 ? [2, 3] : [2]) { // bản cũ chậm, độ sâu 3 chỉ thử vài thế
        const cu = new Map(xepHangNuoc(b, s, d).map((x) => [x.nuoc, x.diem]));
        const kq = timNuocMay(b, s, { doSauToiDa: d, soNuoc: 1000 });
        if (kq.doSau !== d) continue; // dừng sớm vì thấy chiếu hết
        for (const x of kq.xep) {
          if (Math.abs(x.diem) > 90000 || Math.abs(cu.get(x.nuoc)) > 90000) continue;
          expect(x.diem).toBe(cu.get(x.nuoc) + 0); // + 0 để bản cũ trả -0 vẫn so được
        }
      }
    });
  }, 30000);
});

describe("máy tìm nước (mảng số): chơi cờ", () => {
  // Đỏ có hai xe, đen chỉ còn tướng ở (0,4): xe (5,8) đi lên (0,8) là chiếu hết
  const thế = () => banTrong([
    [9, 3, "rK"], [0, 4, "bK"], [1, 0, "rR"], [5, 8, "rR"],
  ]);

  it("thấy nước thắng ngay: sau nước chọn đen hết nước đi", () => {
    const b = thế();
    const kq = timNuocMay(b, "r", { doSauToiDa: 4 });
    expect(kq.xep[0].diem).toBeGreaterThan(90000);
    apDung(b, nuocHopLe(b, "r").find((m) => kyHieu(m) === kq.xep[0].nuoc));
    expect(nuocHopLe(b, "b")).toHaveLength(0);
  });

  it("bên bị chiếu hết không còn nước đi", () => {
    const b = thế();
    b[0][8] = "rR"; b[5][8] = null;
    expect(timNuocMay(b, "b", { doSauToiDa: 3 }).xep).toEqual([]);
  });

  it("ăn quân không được bảo vệ", () => {
    const b = banTrong([[9, 3, "rK"], [0, 4, "bK"], [5, 0, "rR"], [5, 7, "bC"]]);
    const kq = timNuocMay(b, "r", { doSauToiDa: 3 });
    expect(kq.xep[0].nuoc).toBe("a5h5");
  });

  it("mọi biến thể (bảng băm, tìm kiếm tĩnh, điểm vị trí) chỉ đi nước hợp lệ", () => {
    for (const { b, s } of theCoMau(3)) {
      const hopLe = new Set(nuocHopLe(b, s).map(kyHieu));
      for (const opts of [{}, { tt: true }, { tt: true, q: true }, { tt: true, q: true, pst: true }]) {
        const kq = timNuocMay(b, s, { doSauToiDa: 4, ...opts });
        expect(hopLe.has(kq.xep[0].nuoc)).toBe(true);
      }
    }
  });

  it("soNuoc: các nước đầu bảng có điểm chính xác như khi tìm đủ", () => {
    for (const { b, s } of theCoMau(4)) {
      const day = timNuocMay(b, s, { doSauToiDa: 3, soNuoc: 1000 });
      const ba = timNuocMay(b, s, { doSauToiDa: 3, soNuoc: 3 });
      if (day.doSau !== 3 || ba.doSau !== 3) continue;
      const diemDay = new Map(day.xep.map((x) => [x.nuoc, x.diem]));
      for (const x of ba.xep.slice(0, 3)) {
        if (Math.abs(x.diem) > 90000) continue;
        expect(x.diem).toBe(diemDay.get(x.nuoc));
      }
    }
  });

  it("dừng đúng giờ nhưng luôn trả về một nước", () => {
    const t0 = Date.now();
    const kq = timNuocMay(khoiTao(), "r", { doSauToiDa: 30, thoiGianMs: 100 });
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(kq.doSau).toBeGreaterThanOrEqual(1);
    expect(kq.xep.length).toBeGreaterThan(0);
  });
});
