import { describe, it, expect } from "vitest";
import {
  khoiTao, nuocThuVi, nuocHopLe, vuaDoiMat, apDung, kyHieu,
  timNuoc, nuocTot, xepHangNuoc, banVanBan,
} from "../src/lib/co-tuong.js";

// Bàn trống, dùng để dựng từng tình huống
function banTrong() {
  return Array.from({ length: 10 }, () => Array(9).fill(null));
}

const ds = (list) => list.map((x) => x.join(",")).sort();

describe("cờ tướng: luật đi quân", () => {
  it("thế cờ mở đầu: đỏ có 44 nước đi hợp lệ", () => {
    expect(nuocHopLe(khoiTao(), "r")).toHaveLength(44);
  });

  it("mã bị chặn chân thì không nhảy được hướng đó", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][4] = "bK";
    b[5][4] = "rH";
    b[4][4] = "bP"; // chân mã phía trên
    const dich = ds(nuocThuVi(b, 5, 4));
    expect(dich).not.toContain("3,3");
    expect(dich).not.toContain("3,5");
    expect(dich).toContain("7,3"); // hướng không bị chặn vẫn đi được
  });

  it("tượng không qua sông và bị chặn mắt", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][4] = "bK";
    b[9][2] = "rE";
    expect(ds(nuocThuVi(b, 9, 2))).toEqual(["7,0", "7,4"]);
    b[8][3] = "bP"; // chặn mắt tượng đi về (7,4)
    expect(ds(nuocThuVi(b, 9, 2))).toEqual(["7,0"]);
  });

  it("pháo ăn quân địch sau đúng một quân ngòi", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][4] = "bK";
    b[5][0] = "rC";
    b[5][3] = "bP"; // quân ngòi
    b[5][6] = "bR"; // quân địch đứng sau ngòi
    const dich = ds(nuocThuVi(b, 5, 0));
    expect(dich).toContain("5,6");   // ăn được qua ngòi
    expect(dich).not.toContain("5,3"); // không ăn được quân ngòi
  });

  it("tốt chỉ đi ngang sau khi qua sông", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][4] = "bK";
    b[6][4] = "rP"; // chưa qua sông: chỉ đi thẳng
    expect(ds(nuocThuVi(b, 6, 4))).toEqual(["5,4"]);
    b[4][4] = "rP"; // đã qua sông (đỏ qua khi lên tới hàng 4): được đi ngang
    expect(ds(nuocThuVi(b, 4, 4))).toEqual(["3,4", "4,3", "4,5"]);
  });
});

describe("cờ tướng: tướng và chiếu", () => {
  it("hai tướng đối mặt không có quân ở giữa là vi phạm", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][4] = "bK";
    expect(vuaDoiMat(b)).toBe(true);
    b[5][4] = "rP";
    expect(vuaDoiMat(b)).toBe(false);
  });

  it("quân đang chặn giữa hai tướng không được rời cột (làm tướng đối mặt)", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][4] = "bK";
    b[5][4] = "rR";
    const tu = nuocHopLe(b, "r").filter((m) => m.tu[0] === 5 && m.tu[1] === 4);
    expect(tu.length).toBeGreaterThan(0);
    expect(tu.every((m) => m.den[1] === 4)).toBe(true);
  });

  it("tướng bị chiếu chỉ được đi tới ô không bị chiếu", () => {
    const b = banTrong();
    b[9][3] = "rK"; b[0][5] = "bK";
    b[9][0] = "bR"; // xe đen chiếu tướng đỏ theo hàng 9
    // (9,4) vẫn bị xe chiếu sau khi tướng dịch ngang; (9,2) ra ngoài cung; chỉ còn (8,3)
    const tuong = nuocHopLe(b, "r").filter((m) => m.tu[0] === 9 && m.tu[1] === 3);
    expect(ds(tuong.map((m) => m.den))).toEqual(["8,3"]);
  });
});

describe("cờ tướng: minimax", () => {
  it("chọn ăn xe miễn phí ở độ sâu 1", () => {
    const b = banTrong();
    b[9][4] = "rK"; b[0][3] = "bK"; // hai tướng không cùng cột, thế cờ hợp lệ
    b[5][0] = "rR";
    b[5][8] = "bR";
    const nuoc = nuocTot(b, "r", 1);
    expect(nuoc.nuoc).toBe(kyHieu({ tu: [5, 0], den: [5, 8] }));
  });

  it("xếp hạng trả về mọi nước hợp lệ, điểm giảm dần", () => {
    const xep = xepHangNuoc(khoiTao(), "r", 1);
    expect(xep).toHaveLength(44);
    for (let i = 1; i < xep.length; i++) expect(xep[i - 1].diem).toBeGreaterThanOrEqual(xep[i].diem);
  });

  it("ký hiệu nước đi tìm lại được, ký hiệu sai thì không có", () => {
    const b = khoiTao();
    const m = nuocHopLe(b, "r")[0];
    expect(timNuoc(b, "r", kyHieu(m))).not.toBeNull();
    expect(timNuoc(b, "r", "a0a0")).toBeNull();
  });

  it("apDung đổi bàn đúng", () => {
    const b = khoiTao();
    const m = nuocHopLe(b, "r").find((x) => kyHieu(x) === "a6a5");
    apDung(b, m);
    expect(b[5][0]).toBe("rP");
    expect(b[6][0]).toBeNull();
  });

  it("banVanBan có 10 hàng", () => {
    expect(banVanBan(khoiTao()).split("\n")).toHaveLength(10);
  });
});
