import { describe, it, expect, afterEach } from "vitest";
import { diNuocMay, nuocMay, bamDanhMay } from "../functions/_lib/may-dai.js";
import { ketThucTran } from "../functions/_lib/tran.js";
import { khoiTao, nuocHopLe, kyHieu } from "../src/lib/co-tuong.js";
import { duyetNuoc, benDenLuot } from "../src/lib/co-tuong-tran.js";

// PocketBase giả trong bộ nhớ: chỉ đủ cho các lời gọi mà trận thượng đài dùng
function taoPocketBase(trans = {}) {
  const dong = { co_tuong_tran: trans, cho_phien_co_diem: {} };
  const ghi = [];
  globalThis.fetch = async (url, opt = {}) => {
    const m = String(url).match(/\/collections\/([a-z_]+)\/records(?:\/([a-z0-9]+))?/);
    const ok = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (!m) return ok({}, 404);
    const [, bang, id] = m;
    if (bang === "co_tuong_tin_hieu") return ok({ id: "tin" });
    if (bang === "cho_phien_co_diem") {
      if (opt.method === "POST") ghi.push({ bang, data: JSON.parse(opt.body) });
      return ok({ items: [] });
    }
    if (bang !== "co_tuong_tran") return ok({}, 404);
    if (opt.method === "PATCH" && id) {
      const data = JSON.parse(opt.body);
      ghi.push({ bang, id, data });
      Object.assign(dong.co_tuong_tran[id], data);
      return ok(dong.co_tuong_tran[id]);
    }
    if (opt.method === "POST") {
      const moi = { id: "x" + Math.random().toString(36).slice(2), ...JSON.parse(opt.body) };
      dong.co_tuong_tran[moi.id] = moi;
      return ok(moi);
    }
    // Đọc danh sách: trả các trận đang có (đủ để bamDanhMay và docTran tìm)
    const items = Object.values(dong.co_tuong_tran);
    return ok({ items });
  };
  return { dong, ghi };
}

function tranMay(muc, extra = {}) {
  return {
    id: "t" + muc,
    ma: "a".repeat(32),
    loai: "dai",
    che_do: "cung",
    cap_do: muc,
    trang_thai: "dang_dau",
    do: `may_${muc}`,
    ten_do: `Máy mức ${muc}`,
    den: "nguoi-that",
    ten_den: "Người",
    nuoc: [],
    da_tinh_diem: false,
    created: "2026-10-23 12:00:00.000Z",
    ...extra,
  };
}

const H = { authorization: "x" };
const PB = "http://pb";

afterEach(() => {
  delete globalThis.fetch;
});

describe("máy đi nước trên thượng đài", () => {
  it("máy đỏ đi trước khi có người vào: thêm đúng một nước hợp lệ", async () => {
    const { dong } = taoPocketBase({ t1: tranMay(1) });
    const tran = await diNuocMay(PB, H, dong.co_tuong_tran.t1);
    expect(tran.nuoc.length).toBe(1);
    expect(duyetNuoc(tran.nuoc).hop_le).toBe(true);
    expect(tran.han_nuoc).not.toBe("");
  });

  it("không đến lượt máy thì không đi", async () => {
    const { ghi } = taoPocketBase({});
    const tran = tranMay(1, { nuoc: [kyHieu(nuocHopLe(khoiTao(), "r")[0])] });
    const sau = await diNuocMay(PB, H, tran);
    expect(sau).toBe(tran);
    expect(ghi.length).toBe(0);
  });

  it("trận của người chơi thật thì máy không đụng vào", async () => {
    const { ghi } = taoPocketBase({});
    const tran = tranMay(1, { do: "nguoi-that" });
    expect(await diNuocMay(PB, H, tran)).toBe(tran);
    expect(ghi.length).toBe(0);
  });

  it("ván đầy đủ với người đi ngẫu nhiên: nước nào cũng hợp luật, không cộng điểm cho máy", async () => {
    const { dong, ghi } = taoPocketBase({ t1: tranMay(1) });
    let tran = dong.co_tuong_tran.t1;
    let hat = 7;
    const ngauNhien = () => ((hat = (hat * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let buoc = 0; buoc < 200 && tran.trang_thai === "dang_dau"; buoc++) {
      const nuoc = tran.nuoc;
      const hienTai = duyetNuoc(nuoc);
      expect(hienTai.hop_le).toBe(true);
      if (benDenLuot(nuoc.length) === "b") {
        // Người đi ngẫu nhiên, rồi máy đáp lại
        const ds = nuocHopLe(hienTai.b, "b");
        if (ds.length === 0) break;
        const ky = kyHieu(ds[Math.floor(ngauNhien() * ds.length)]);
        Object.assign(tran, { nuoc: [...nuoc, ky] });
        const sau = duyetNuoc(tran.nuoc);
        if (sau.ket_thuc) {
          await ketThucTran(PB, H, tran, { ket_qua: sau.ket_qua, ly_do: sau.ly_do, nuoc: tran.nuoc });
          break;
        }
      }
      tran = await diNuocMay(PB, H, tran);
    }
    expect(tran.nuoc.length).toBeGreaterThan(0);
    // Máy không có tài khoản: mọi bản ghi điểm (nếu ván đã kết thúc) đều là của người chơi, không bao giờ của máy
    const diem = ghi.filter((g) => g.bang === "cho_phien_co_diem");
    expect(diem.every((g) => g.data.nguoi_choi === "nguoi-that")).toBe(true);
  });
});

describe("mức máy và bảng mời", () => {
  it("nước của máy là một nước hợp lệ trên bàn hiện tại", () => {
    const b = khoiTao();
    const ky = nuocMay(b, 1, []);
    expect(ky).toMatch(/^[a-i][0-9][a-i][0-9]$/);
    expect(nuocHopLe(b, "r").map(kyHieu)).toContain(ky);
  });

  it("mỗi mức có đúng một máy đứng sẵn trên đài", async () => {
    const { dong } = taoPocketBase({});
    await bamDanhMay(PB, H);
    const tao = Object.values(dong.co_tuong_tran);
    expect(tao.map((t) => t.cap_do).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(tao.every((t) => t.do.startsWith("may_") && t.che_do === "cung")).toBe(true);
  });
});
