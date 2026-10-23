import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// EventSource giả: ghi lại các trình nghe để test tự phát sự kiện
class ESGia {
  static CLOSED = 2;
  static tatCa = [];
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.nghe = {};
    this.daDong = false;
    ESGia.tatCa.push(this);
  }
  addEventListener(ten, fn) {
    this.nghe[ten] = fn;
  }
  phat(ten, data) {
    this.nghe[ten]?.({ data: JSON.stringify(data) });
  }
  close() {
    this.daDong = true;
    this.readyState = ESGia.CLOSED;
  }
}

const cho = () => new Promise((r) => setTimeout(r, 0)); // đợi các lời gọi async (fetch đăng ký) chạy xong

describe("ngheTinHieu", () => {
  let fetchGia;
  let ngheTinHieu;

  beforeEach(async () => {
    ESGia.tatCa = [];
    globalThis.EventSource = ESGia;
    fetchGia = vi.fn(async () => ({ ok: true }));
    globalThis.fetch = fetchGia;
    ({ ngheTinHieu } = await import("../src/lib/co-tuong-realtime.js"));
  });
  afterEach(() => {
    vi.useRealTimers();
    delete globalThis.EventSource;
  });

  it("kết nối xong thì đăng ký đúng chuông, báo đang nghe, chưa gọi đọc lại", async () => {
    const khiDoi = vi.fn();
    const khiTrangThai = vi.fn();
    ngheTinHieu("abc123", khiDoi, khiTrangThai);
    ESGia.tatCa[0].phat("PB_CONNECT", { clientId: "c1" });
    await cho();
    expect(JSON.parse(fetchGia.mock.calls[0][1].body)).toEqual({ clientId: "c1", subscriptions: ["co_tuong_tin_hieu/abc123"] });
    expect(khiTrangThai).toHaveBeenLastCalledWith(true);
    expect(khiDoi).not.toHaveBeenCalled();
  });

  it("chuông rung thì gọi đọc lại", async () => {
    const khiDoi = vi.fn();
    ngheTinHieu("abc123", khiDoi);
    const es = ESGia.tatCa[0];
    es.phat("PB_CONNECT", { clientId: "c1" });
    await cho();
    es.phat("co_tuong_tin_hieu/abc123", { action: "update", record: { phien: 1, tom_tat: { n: 3, ky: "b2e2" } } });
    expect(khiDoi).toHaveBeenCalledTimes(1);
    expect(khiDoi).toHaveBeenCalledWith({ phien: 1, tom_tat: { n: 3, ky: "b2e2" } }); // trang dùng tóm tắt để đi quân ngay
  });

  it("kết nối lại (clientId mới) thì đăng ký lại và đọc lại một lần để bù thay đổi đã lỡ", async () => {
    const khiDoi = vi.fn();
    ngheTinHieu("abc123", khiDoi);
    const es = ESGia.tatCa[0];
    es.phat("PB_CONNECT", { clientId: "c1" });
    await cho();
    es.phat("PB_CONNECT", { clientId: "c2" });
    await cho();
    expect(JSON.parse(fetchGia.mock.calls[1][1].body).clientId).toBe("c2");
    expect(khiDoi).toHaveBeenCalledTimes(1);
    expect(khiDoi).toHaveBeenCalledWith(); // không kèm tóm tắt: trang đọc lại cả trận
  });

  it("đăng ký lỗi thì báo không nghe được (trang quay về đọc lại theo nhịp)", async () => {
    fetchGia.mockResolvedValueOnce({ ok: false });
    const khiTrangThai = vi.fn();
    ngheTinHieu("abc123", () => {}, khiTrangThai);
    ESGia.tatCa[0].phat("PB_CONNECT", { clientId: "c1" });
    await cho();
    expect(khiTrangThai).toHaveBeenLastCalledWith(false);
  });

  it("kết nối đóng hẳn thì tự mở lại sau 3 giây; đã dừng nghe thì không mở lại", () => {
    vi.useFakeTimers();
    const dung = ngheTinHieu("abc123", () => {});
    const es = ESGia.tatCa[0];
    es.readyState = ESGia.CLOSED;
    es.onerror();
    vi.advanceTimersByTime(3000);
    expect(ESGia.tatCa.length).toBe(2);

    dung();
    expect(ESGia.tatCa[1].daDong).toBe(true);
    ESGia.tatCa[1].readyState = ESGia.CLOSED;
    ESGia.tatCa[1].onerror();
    vi.advanceTimersByTime(10000);
    expect(ESGia.tatCa.length).toBe(2);
  });

  it("không có chuông (trận cũ) hoặc trình duyệt không hỗ trợ thì không nghe", () => {
    const khiTrangThai = vi.fn();
    ngheTinHieu("", () => {}, khiTrangThai);
    expect(ESGia.tatCa.length).toBe(0);
    expect(khiTrangThai).toHaveBeenCalledWith(false);
  });
});
