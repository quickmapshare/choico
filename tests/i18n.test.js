import { describe, it, expect } from "vitest";
import { CHU, NGON_NGU, boTienTo } from "../src/i18n/strings.js";
import { CHU_CO_VUA } from "../src/i18n/co-vua.js";
import { CHU_CARO } from "../src/i18n/caro.js";

// Chỗ thay dạng {ten} phải giữ nguyên trong mọi bản dịch
const choThay = (s) => (s.match(/\{\w+\}/g) || []).sort().join(",");

describe("chuỗi đa ngôn ngữ", () => {
  it("mỗi ngôn ngữ trong NGON_NGU có bảng chuỗi và mã không trùng", () => {
    const ma = NGON_NGU.map((n) => n.ma);
    expect(new Set(ma).size).toBe(ma.length);
    for (const m of ma) expect(CHU[m], m).toBeTruthy();
  });

  for (const [ten, bang] of [["chung", CHU], ["cờ vua", CHU_CO_VUA], ["caro", CHU_CARO]]) {
    it(`${ten}: mỗi ngôn ngữ đủ khóa như tiếng Việt, không để trống, giữ nguyên chỗ thay`, () => {
      const goc = bang.vi;
      for (const ma of Object.keys(bang)) {
        if (ma === "vi") continue;
        const thieu = Object.keys(goc).filter((k) => !(k in bang[ma]));
        const thua = Object.keys(bang[ma]).filter((k) => !(k in goc));
        const trong = Object.keys(bang[ma]).filter((k) => typeof bang[ma][k] === "string" && !bang[ma][k].trim());
        const lechCho = Object.keys(goc).filter((k) => k in bang[ma] && choThay(goc[k]) !== choThay(bang[ma][k]));
        expect({ ma, thieu, thua, trong, lechCho }).toEqual({ ma, thieu: [], thua: [], trong: [], lechCho: [] });
      }
    });
  }

  it("bỏ tiền tố ngôn ngữ của mọi ngôn ngữ có tiền tố", () => {
    for (const n of NGON_NGU.filter((x) => x.ma !== "vi")) {
      expect(boTienTo(`${n.tienTo}/co-vua/`)).toBe("/co-vua/");
    }
    expect(boTienTo("/co-tuong/")).toBe("/co-tuong/");
  });
});
