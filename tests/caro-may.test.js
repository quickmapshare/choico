import { describe, it, expect } from "vitest";
import { tinh } from "../src/lib/caro/may.js";
import { khoiTao } from "../src/lib/caro/luat.js";
import { MUC } from "../src/lib/caro/muc.js";

describe("máy cờ caro", () => {
  it("bàn trống thì đi giữa bàn", () => {
    const { xep } = tinh(khoiTao(), { doSauToiDa: 1 });
    expect(xep[0].nuoc).toBe("h8");
  });

  it("thấy nước thắng ngay: dãy 4 quân hở hai đầu, chỉ cần đặt thêm 1", () => {
    const the = khoiTao();
    for (let c = 4; c < 8; c++) the.b[7][c] = "r"; // e8 f8 g8 h8, hở cả hai đầu (d8 và i8)
    const { xep } = tinh(the, { doSauToiDa: 2 });
    expect(["d8", "i8"]).toContain(xep[0].nuoc);
    expect(xep[0].diem).toBeGreaterThan(1e8);
  });

  it("chặn nước thắng ngay của đối phương khi mình chưa thắng được", () => {
    const the = khoiTao();
    the.s = "b";
    for (let c = 4; c < 8; c++) the.b[7][c] = "r"; // đỏ dọa thắng ở d8 hoặc i8
    the.b[3][3] = "b"; // vài quân đen rải rác, không tạo đe dọa nào
    the.b[10][10] = "b";
    const { xep } = tinh(the, { doSauToiDa: 3, rong: 16 });
    expect(["d8", "i8"]).toContain(xep[0].nuoc);
  });

  it("không đổi thế cờ đưa vào", () => {
    const the = khoiTao();
    the.b[7][7] = "r";
    the.b[7][8] = "b";
    the.s = "r";
    const truoc = JSON.stringify(the);
    tinh(the, MUC[3]);
    expect(JSON.stringify(the)).toBe(truoc);
  });

  it("tôn trọng giới hạn thời gian ở mức cao nhất", () => {
    const the = khoiTao();
    the.b[7][7] = "r";
    the.b[6][6] = "b";
    the.b[8][8] = "r";
    the.b[5][5] = "b";
    const bd = Date.now();
    const kq = tinh(the, { ...MUC[5], thoiGianMs: 200 });
    expect(Date.now() - bd).toBeLessThan(3000);
    expect(kq.doSau).toBeGreaterThanOrEqual(1);
    expect(kq.xep.length).toBeGreaterThan(0);
  });
});
