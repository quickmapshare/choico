import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TRO_CHOI } from "../src/lib/tro-choi.js";

// DOM giả đủ cho thanh xem lại: phần tử có hidden, disabled, thuộc tính và trình nghe sự kiện
function taoPhanTu() {
  const nghe = {};
  const tt = {};
  return {
    hidden: false, disabled: false, title: "",
    addEventListener: (ten, fn) => (nghe[ten] = fn),
    bam: () => nghe.click?.(),
    setAttribute: (k, v) => (tt[k] = v),
    getAttribute: (k) => tt[k],
    toggleAttribute: (k, bat) => (bat ? (tt[k] = "") : delete tt[k]),
    coThuocTinh: (k) => k in tt,
  };
}

let pt;
let taoXemLai;
beforeEach(async () => {
  pt = {};
  globalThis.document = {
    getElementById: (id) => (pt[id] ??= taoPhanTu()),
    addEventListener: () => {},
  };
  globalThis.window = { setInterval: (fn, ms) => setInterval(fn, ms) };
  vi.useFakeTimers();
  ({ taoXemLai } = await import("../src/lib/chung/xem-lai.js"));
});
afterEach(() => {
  vi.useRealTimers();
  delete globalThis.document;
  delete globalThis.window;
});

const NHAN = { xlChay: "chạy", xlDung: "dừng", xlTrangThai: "nước {k}/{n}" };
const amGia = () => ({ goi: [], mo() {}, phat(loai) { this.goi.push(loai); } });

function chuanBi(troChoi, nuoc, tuyChon = {}) {
  const ve = [];
  const trangThai = [];
  let thoat = 0;
  const am = amGia();
  const xl = taoXemLai({
    am, nhan: NHAN, khiVe: (p) => ve.push(p), khiThoat: () => thoat++, hienTrangThai: (t) => trangThai.push(t), ...tuyChon,
  });
  xl.batDau(TRO_CHOI[troChoi].luat, nuoc, { tuChay: false });
  return { xl, ve, trangThai, am, soThoat: () => thoat };
}

describe("xem lại ván (dùng chung mọi loại cờ)", () => {
  it("cờ vua: bắt đầu ở thế mở đầu, tới từng nước có hiệu ứng và tiếng, lùi thì không", () => {
    const { ve, trangThai, am } = chuanBi("co_vua", ["e2e4", "d7d5", "e4d5"]);
    expect(ve.at(-1)).toMatchObject({ k: 0, n: 3, hieuUng: null });
    expect(pt["co-xl"].hidden).toBe(false);
    expect(pt["co-xl-lui"].disabled).toBe(true);
    pt["co-xl-tien"].bam();
    expect(ve.at(-1).k).toBe(1);
    expect(ve.at(-1).hieuUng).toMatchObject({ tu: [6, 4], den: [4, 4], quanBiAn: null });
    pt["co-xl-cuoi"].bam();
    expect(ve.at(-1)).toMatchObject({ k: 3, anCuoi: "bP" });
    expect(pt["co-xl-tien"].disabled).toBe(true);
    pt["co-xl-lui"].bam();
    expect(ve.at(-1)).toMatchObject({ k: 2, hieuUng: null });
    expect(trangThai.at(-1)).toBe("nước 2/3");
    expect(am.goi).toEqual(["di"]); // chỉ nước tới từng bước mới có tiếng
  });

  it("cờ tướng: tự chạy tới hết ván rồi dừng, thoát thì trả bàn cho trang và ẩn thanh", () => {
    const { xl, ve, soThoat } = chuanBi("co_tuong", ["h7e7", "h0g2", "b9c7"]);
    pt["co-xl-chay"].bam();
    expect(pt["co-xl-chay"].getAttribute("aria-label")).toBe("dừng");
    vi.advanceTimersByTime(1100 * 4);
    expect(ve.at(-1).k).toBe(3);
    expect(pt["co-xl-chay"].getAttribute("aria-label")).toBe("chạy"); // tới cuối thì tự dừng
    pt["co-xl-thoat"].bam();
    expect(xl.dangXem()).toBe(false);
    expect(soThoat()).toBe(1);
    expect(pt["co-xl"].hidden).toBe(true);
  });

  it("trang chỉ để xem thì không có nút thoát; ván rỗng thì không bắt đầu", () => {
    const { xl } = chuanBi("co_vua", [], { coThoat: false });
    expect(pt["co-xl-thoat"].hidden).toBe(true);
    expect(xl.dangXem()).toBe(false);
  });
});

describe("quyền dùng tính năng", () => {
  it("xem lại hiện mở cho mọi người, tính năng lạ thì không", async () => {
    const { duocDung } = await import("../src/lib/chung/tinh-nang.js");
    expect(duocDung("xem_lai")).toBe(true);
    expect(duocDung("xem_lai", { id: "a", tai_khoan: true })).toBe(true);
    expect(duocDung("khong_co")).toBe(false);
  });
});
