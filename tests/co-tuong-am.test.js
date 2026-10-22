import { describe, it, expect } from "vitest";
import { taoAmThanh } from "../src/lib/co-tuong-am.js";

// Ngữ cảnh âm thanh giả: đếm số nút được tạo và được cho chạy
function taoGia(trangThai = "running") {
  const dem = { nguCanh: 0, dao: 0, nhieu: 0, batDau: 0, resume: 0 };
  const thamSo = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const nut = () => ({ connect() {} });
  const ctx = {
    state: trangThai,
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume() { dem.resume++; ctx.state = "running"; },
    createGain: () => ({ ...nut(), gain: thamSo() }),
    createOscillator: () => { dem.dao++; return { ...nut(), type: "", frequency: thamSo(), start() { dem.batDau++; }, stop() {} }; },
    createBiquadFilter: () => ({ ...nut(), type: "", frequency: { value: 0 }, Q: { value: 0 } }),
    createBufferSource: () => { dem.nhieu++; return { ...nut(), buffer: null, start() { dem.batDau++; }, stop() {} }; },
    createBuffer: (_k, dai) => ({ getChannelData: () => new Float32Array(dai) }),
  };
  return { dem, taoNguCanh: () => { dem.nguCanh++; return ctx; } };
}

describe("âm thanh cờ tướng", () => {
  it("mặc định tắt: không tạo ngữ cảnh, không phát gì", () => {
    const { dem, taoNguCanh } = taoGia();
    const am = taoAmThanh(taoNguCanh);
    expect(am.dangBat()).toBe(false);
    am.phat("di");
    am.mo();
    expect(dem.nguCanh).toBe(0);
    expect(dem.batDau).toBe(0);
  });

  it("bật rồi mới phát, và chỉ tạo ngữ cảnh một lần", () => {
    const { dem, taoNguCanh } = taoGia();
    const am = taoAmThanh(taoNguCanh);
    am.datBat(true);
    am.phat("di");
    am.phat("an");
    expect(dem.nguCanh).toBe(1);
    expect(dem.batDau).toBeGreaterThan(0);
  });

  it("mọi kiểu tiếng đều phát được, kiểu lạ thì bỏ qua", () => {
    for (const loai of ["di", "an", "chieu", "thang", "thua", "hoa"]) {
      const { dem, taoNguCanh } = taoGia();
      const am = taoAmThanh(taoNguCanh);
      am.datBat(true);
      am.phat(loai, 200);
      expect(dem.batDau, loai).toBeGreaterThan(0);
    }
    const { dem, taoNguCanh } = taoGia();
    const am = taoAmThanh(taoNguCanh);
    am.datBat(true);
    am.phat("khong-co");
    expect(dem.batDau).toBe(0);
  });

  it("tiếng ăn quân có hai tiếng cộc, tiếng đi quân có một", () => {
    const a = taoGia();
    const amDi = taoAmThanh(a.taoNguCanh);
    amDi.datBat(true);
    amDi.phat("di");
    const b = taoGia();
    const amAn = taoAmThanh(b.taoNguCanh);
    amAn.datBat(true);
    amAn.phat("an");
    expect(b.dem.nhieu).toBe(2 * a.dem.nhieu);
  });

  it("khôi phục lựa chọn lúc tải trang: chưa tạo ngữ cảnh cho đến lần mo() đầu tiên", () => {
    const { dem, taoNguCanh } = taoGia();
    const am = taoAmThanh(taoNguCanh);
    am.datBat(true, false);
    expect(am.dangBat()).toBe(true);
    expect(dem.nguCanh).toBe(0);
    am.mo();
    expect(dem.nguCanh).toBe(1);
  });

  it("mở lại ngữ cảnh bị trình duyệt tạm dừng", () => {
    const { dem, taoNguCanh } = taoGia("suspended");
    const am = taoAmThanh(taoNguCanh);
    am.datBat(true);
    expect(dem.resume).toBeGreaterThan(0);
  });

  it("tắt đi thì không phát nữa", () => {
    const { dem, taoNguCanh } = taoGia();
    const am = taoAmThanh(taoNguCanh);
    am.datBat(true);
    am.datBat(false);
    am.phat("di");
    expect(dem.batDau).toBe(0);
  });

  it("lỗi âm thanh không làm hỏng ván cờ", () => {
    const am = taoAmThanh(() => { throw new Error("không có Web Audio"); });
    expect(() => { am.datBat(true); am.phat("di"); am.mo(); }).not.toThrow();
  });
});
