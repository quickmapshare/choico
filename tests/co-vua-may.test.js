import { describe, it, expect } from "vitest";
import { timNuocMay, perftMay } from "../src/lib/co-vua/may.js";
import { khoiTao, tuFen, perft, nuocHopLe, kyHieu, apDung, saoChep, ketThuc } from "../src/lib/co-vua/luat.js";
import { MUC } from "../src/lib/co-vua/muc.js";

const THE_CHUAN = [
  ["mở đầu", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 3],
  ["Kiwipete", "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", 2],
  ["thế 3", "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", 3],
  ["thế 4", "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", 2],
  ["thế 5", "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", 2],
];

describe("máy cờ vua: bộ sinh nước khớp với luật", () => {
  for (const [ten, fen, d] of THE_CHUAN) {
    it(`perft ${ten} độ sâu ${d}`, () => {
      const the = tuFen(fen);
      expect(perftMay(the, d)).toBe(perft(the, d));
    });
  }

  it("bảng xếp hạng gồm đúng các nước hợp lệ theo luật, dọc theo một ván", () => {
    const the = khoiTao();
    for (let i = 0; i < 40 && !ketThuc(the, i); i++) {
      const { xep } = timNuocMay(the, { doSauToiDa: 1 });
      expect(xep.map((x) => x.nuoc).sort()).toEqual(nuocHopLe(the).map(kyHieu).sort());
      const ds = nuocHopLe(the);
      apDung(the, ds.find((m) => m.an) || ds[(i * 7) % ds.length]);
    }
  });
});

describe("máy cờ vua: chọn nước", () => {
  it("thấy chiếu hết một nước (hàng cuối)", () => {
    const { xep } = timNuocMay(tuFen("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1"), { doSauToiDa: 3, q: true });
    expect(xep[0].nuoc).toBe("a1a8");
    expect(xep[0].diem).toBeGreaterThan(90000);
  });

  it("ăn hậu không được bảo vệ", () => {
    const { xep } = timNuocMay(tuFen("4k3/8/8/3q4/8/8/8/3QK3 w - - 0 1"), { doSauToiDa: 2, q: true, pst: true });
    expect(xep[0].nuoc).toBe("d1d5");
  });

  it("phong cấp thành hậu", () => {
    const { xep } = timNuocMay(tuFen("8/P6k/8/8/8/8/8/K7 w - - 0 1"), { doSauToiDa: 3, q: true, pst: true });
    expect(xep[0].nuoc).toBe("a7a8q");
  });

  it("thấy bị chiếu hết thì tránh: đen chặn nước hậu chiếu hết", () => {
    // Trắng dọa Qxf7# (hậu h5, tượng c4); đen phải giữ f7
    const the = tuFen("r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3");
    const { xep } = timNuocMay(the, { ...MUC[4], thoiGianMs: 0 });
    const sau = saoChep(the);
    apDung(sau, nuocHopLe(sau).find((m) => kyHieu(m) === xep[0].nuoc));
    const chet = nuocHopLe(sau).find((m) => kyHieu(m) === "h5f7");
    if (chet) {
      apDung(sau, chet);
      expect(ketThuc(sau, 10)?.ly_do).not.toBe("chieu_het");
    }
  });

  it("không làm đổi thế cờ đưa vào, kể cả khi hết giờ giữa chừng", () => {
    const the = tuFen("r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1");
    const truoc = JSON.stringify(the);
    const bd = Date.now();
    const kq = timNuocMay(the, { ...MUC[5], thoiGianMs: 60 });
    expect(Date.now() - bd).toBeLessThan(2000);
    expect(kq.doSau).toBeGreaterThanOrEqual(1);
    expect(kq.xep).toHaveLength(48);
    expect(JSON.stringify(the)).toBe(truoc);
  });

  it("lịch sử không dựng ra được thế hiện tại thì bỏ qua, vẫn tìm được nước", () => {
    const the = tuFen("7k/8/8/8/8/8/8/R5K1 w - - 0 1");
    const { xep } = timNuocMay(the, { doSauToiDa: 3, q: true, lichSu: ["e2e4"] });
    expect(xep.map((x) => x.nuoc).sort()).toEqual(nuocHopLe(the).map(kyHieu).sort());
  });

  it("lịch sử từ thế mở đầu được nhận khi khớp thế hiện tại", () => {
    const the = khoiTao();
    const lich = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1"];
    for (const k of lich) apDung(the, nuocHopLe(the).find((m) => kyHieu(m) === k));
    // Đen đi f6g8 thì lặp thế mở đầu lần ba (hòa). Máy có lịch sử thấy điểm nước đó là 0.
    const { xep } = timNuocMay(the, { doSauToiDa: 2, q: true, pst: true, lichSu: lich, soNuoc: 40 });
    expect(xep.find((x) => x.nuoc === "f6g8").diem).toBe(0);
  });
});
