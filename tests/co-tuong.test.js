import { describe, it, expect } from "vitest";
import {
  khoiTao, nuocThuVi, nuocHopLe, vuaDoiMat, apDung, kyHieu,
  timNuoc, nuocTot, xepHangNuoc, banVanBan, lamSachTen, tenHopLe, tenBangDiem,
  xacMinhVan, xepHangTheoThoiGian, quanBiAn, biChieu, diemCongVan, HOAN_TOI_DA, taoTenTam,
} from "../src/lib/co-tuong.js";

describe("tên tạm", () => {
  it("tên tạm luôn hợp lệ, có 4 chữ cái và ngày chơi lần đầu", () => {
    for (let i = 0; i < 50; i++) {
      const t = taoTenTam();
      expect(tenHopLe(t)).toBe(true);
      expect(t).toMatch(/^Kỳ thủ [A-Z]{4} \d{8}$/);
      expect(t.length).toBeLessThanOrEqual(50);
    }
  });

  it("chọn đúng chữ cái theo số ngẫu nhiên và ghép ngày theo giờ Việt Nam", () => {
    // 2026-10-22 23:30 UTC là 2026-10-23 06:30 giờ Việt Nam
    const luc = new Date("2026-10-22T23:30:00Z");
    expect(taoTenTam(() => 0, luc)).toBe("Kỳ thủ AAAA 23102026");
    expect(taoTenTam(() => 0.999999, luc)).toBe("Kỳ thủ ZZZZ 23102026");
  });

  it("tên có chữ số được chấp nhận, tên tạm có ngày vẫn hợp lệ", () => {
    expect(tenHopLe("Kỳ thủ KQMA 23102026")).toBe(true);
    expect(tenHopLe("0912345678")).toBe(true);
  });
});

describe("quân đã bị ăn", () => {
  it("thế mở đầu chưa có quân nào bị ăn", () => {
    expect(quanBiAn(khoiTao())).toEqual({ r: [], b: [] });
  });

  it("sắp theo mức quan trọng và đúng bên", () => {
    const b = khoiTao();
    b[0][1] = null; // mất mã đen
    b[0][7] = null; // mất mã đen
    b[9][8] = null; // mất xe đỏ
    b[3][0] = null; // mất tốt đen
    expect(quanBiAn(b)).toEqual({ r: ["R"], b: ["H", "H", "P"] });
  });
});

describe("tìm nước theo thời gian", () => {
  it("không giới hạn thời gian thì đi đúng độ sâu yêu cầu", () => {
    const { xep, doSau } = xepHangTheoThoiGian(khoiTao(), "r", { doSauToiDa: 2, thoiGianMs: 0 });
    expect(doSau).toBe(2);
    expect(xep).toHaveLength(44);
  });

  it("hết giờ giữa chừng vẫn trả về kết quả và không làm hỏng bàn cờ", () => {
    const b = khoiTao();
    const truoc = JSON.stringify(b);
    const { xep, doSau } = xepHangTheoThoiGian(b, "r", { doSauToiDa: 6, thoiGianMs: 30 });
    expect(xep).toHaveLength(44);
    expect(doSau).toBeGreaterThanOrEqual(1);
    expect(doSau).toBeLessThan(6);
    expect(JSON.stringify(b)).toBe(truoc); // bàn phải như cũ sau khi bị ngắt
  });
});

describe("xác minh ván để tính điểm", () => {
  // Chơi ngẫu nhiên đến khi hết nước hoặc đủ 120 nước, trả về nhật ký nước đi
  function vanNgauNhien() {
    const b = khoiTao();
    const log = [];
    let s = "r";
    while (log.length < 120) {
      const nuoc = nuocHopLe(b, s);
      if (nuoc.length === 0) break;
      const m = nuoc[Math.floor(Math.random() * nuoc.length)];
      log.push(kyHieu(m));
      apDung(b, m);
      s = s === "r" ? "b" : "r";
    }
    return log;
  }

  it("ván ngẫu nhiên hợp lệ luôn được nhận và có kết quả đúng", () => {
    for (let i = 0; i < 20; i++) {
      const log = vanNgauNhien();
      const kq = xacMinhVan(log);
      if (log.length >= 120) expect(kq).toEqual({ hop_le: true, ket_qua: expect.stringMatching(/thang|thua|hoa/) });
      else expect(kq.hop_le).toBe(true);
    }
  });

  it("nước đi không hợp lệ hoặc ván chưa kết thúc thì bị từ chối", () => {
    expect(xacMinhVan(["a0a0"])).toEqual({ hop_le: false });
    // Đỏ đi nước của đen: không hợp lệ
    expect(xacMinhVan(["a3a4"])).toEqual({ hop_le: false });
    // Ván chưa kết thúc (mới 1 nước)
    expect(xacMinhVan(["a6a5"])).toEqual({ hop_le: false });
  });
});

describe("điểm và nước hoãn", () => {
  it("không hoãn thì giữ nguyên điểm theo kết quả", () => {
    expect(diemCongVan("thang", 0)).toBe(3);
    expect(diemCongVan("hoa", 0)).toBe(1);
    expect(diemCongVan("thua", 0)).toBe(-1);
  });

  it("mỗi nước hoãn trừ 0,5 điểm, tối đa 3 nước", () => {
    expect(diemCongVan("thang", 1)).toBe(2.5);
    expect(diemCongVan("thang", 3)).toBe(1.5);
    expect(diemCongVan("thua", 3)).toBe(-2.5);
    expect(HOAN_TOI_DA).toBe(3);
  });
});

describe("tên người chơi", () => {
  it("chấp nhận chữ cái, có dấu tiếng Việt và khoảng trắng giữa các từ", () => {
    expect(tenHopLe("Nguyễn Văn An")).toBe(true);
    expect(tenHopLe("Đỗ")).toBe(true);
  });

  it("từ chối ký tự đặc biệt, khoảng trắng đầu hoặc cuối, chuỗi rỗng", () => {
    expect(tenHopLe("An!")).toBe(false);
    expect(tenHopLe("An-Bình")).toBe(false);
    expect(tenHopLe(" An")).toBe(false);
    expect(tenHopLe("An ")).toBe(false);
    expect(tenHopLe("")).toBe(false);
  });

  it("giới hạn 50 ký tự", () => {
    expect(tenHopLe("a".repeat(50))).toBe(true);
    expect(tenHopLe("a".repeat(51))).toBe(false);
  });

  it("bảng xếp hạng che mọi chữ số bằng dấu *", () => {
    expect(tenBangDiem("0912345678")).toBe("**********");
    expect(tenBangDiem("Kỳ thủ KQMA 23102026")).toBe("Kỳ thủ KQMA ********");
    expect(tenBangDiem("Lê Hoài")).toBe("Lê Hoài");
  });

  it("làm sạch khi gõ: bỏ ký tự đặc biệt, giữ chữ số, gộp khoảng trắng, cắt 50 ký tự", () => {
    expect(lamSachTen("An2!3")).toBe("An23");
    expect(lamSachTen("  Lê   Hoài")).toBe("Lê Hoài");
    expect(lamSachTen("Lê ")).toBe("Lê "); // giữ khoảng trắng cuối khi đang gõ, cắt khi lưu
    expect(lamSachTen("a".repeat(60))).toHaveLength(50);
    expect(tenHopLe(lamSachTen("Trần #1 Bình 99").trim())).toBe(true); // trang cắt khoảng trắng cuối khi lưu
  });
});

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

describe("kiểm tra chiếu", () => {
  // Bàn trống với tướng đỏ ở (9,4), tướng đen ở (0,3) (không đối mặt)
  const banTrong = () => {
    const b = Array.from({ length: 10 }, () => Array(9).fill(null));
    b[9][4] = "rK";
    b[0][3] = "bK";
    return b;
  };

  it("mã chiếu khi chân mã trống, không chiếu khi bị chặn", () => {
    const b = banTrong();
    b[7][3] = "bH"; // mã đen ở (7,3) đi tới (9,4), chân mã ở (8,3)
    expect(biChieu(b, "r")).toBe(true);
    b[8][3] = "rA"; // chân mã bị chặn
    expect(biChieu(b, "r")).toBe(false);
  });

  it("pháo chiếu khi có đúng một ngòi trên đường", () => {
    const b = banTrong();
    b[0][4] = "bC";
    expect(biChieu(b, "r")).toBe(false); // không có ngòi
    b[5][4] = "rP"; // ngòi
    expect(biChieu(b, "r")).toBe(true);
  });

  it("tốt đen đã qua sông chiếu ngang", () => {
    const b = banTrong();
    b[9][4] = null;
    b[7][4] = "rK"; // tướng đỏ trong cung ở (7,4)
    b[7][3] = "bP"; // tốt đen ở hàng 7 đã qua sông, đứng cạnh tướng
    expect(biChieu(b, "r")).toBe(true);
  });
});
