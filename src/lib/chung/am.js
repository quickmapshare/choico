// Âm thanh cho cờ tướng, tạo bằng Web Audio nên không cần tệp âm thanh.
// Mặc định tắt. Chỉ tạo ngữ cảnh âm thanh khi đã bật, và ngữ cảnh phải được tạo hoặc mở lại trong lúc người dùng đang bấm
// (trình duyệt, nhất là iPhone, không cho phát tiếng nếu chưa có thao tác của người dùng).

const AM_LUONG = 0.35; // âm lượng chung, để nhỏ cho khỏi giật mình

// Một nốt có bao (lên nhanh, tắt dần)
function note(c, dich, t, tanSo, doDai, kieu, manh) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = kieu;
  o.frequency.setValueAtTime(tanSo, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(manh, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + doDai);
  o.connect(g);
  g.connect(dich);
  o.start(t);
  o.stop(t + doDai + 0.02);
}

// Tiếng "cộc" của quân gỗ đặt xuống bàn: thân tiếng trầm giảm nhanh cộng với tiếng chạm ngắn.
// manh: độ mạnh. cao: hệ số tần số (lớn hơn thì tiếng cao hơn).
function coc(c, dich, t, manh, cao, tiengChamBuf) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(190 * cao, t);
  o.frequency.exponentialRampToValueAtTime(75 * cao, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9 * manh, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g);
  g.connect(dich);
  o.start(t);
  o.stop(t + 0.14);

  const n = c.createBufferSource();
  n.buffer = tiengChamBuf;
  const loc = c.createBiquadFilter();
  loc.type = "bandpass";
  loc.frequency.value = 1500 * cao;
  loc.Q.value = 1.1;
  const gn = c.createGain();
  gn.gain.setValueAtTime(0.7 * manh, t);
  gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  n.connect(loc);
  loc.connect(gn);
  gn.connect(dich);
  n.start(t);
  n.stop(t + 0.05);
}

// Các kiểu tiếng: (ngữ cảnh, nút đích, thời điểm bắt đầu, bộ đệm nhiễu)
const KIEU = {
  di: (c, d, t, buf) => coc(c, d, t, 1, 1, buf),
  an: (c, d, t, buf) => { coc(c, d, t, 1.1, 0.85, buf); coc(c, d, t + 0.07, 1.3, 1.15, buf); },
  // Chiếu tướng: hai nốt cao liền nhau, đến sau tiếng quân đặt xuống
  chieu: (c, d, t) => { note(c, d, t + 0.16, 698, 0.14, "triangle", 0.5); note(c, d, t + 0.3, 932, 0.2, "triangle", 0.5); },
  thang: (c, d, t) => [523, 659, 784].forEach((f, i) => note(c, d, t + i * 0.13, f, 0.22, "triangle", 0.5)),
  thua: (c, d, t) => [392, 330, 262].forEach((f, i) => note(c, d, t + i * 0.16, f, 0.28, "triangle", 0.5)),
  hoa: (c, d, t) => [440, 440].forEach((f, i) => note(c, d, t + i * 0.16, f, 0.2, "triangle", 0.4)),
};

// taoNguCanh: hàm tạo AudioContext, truyền vào để kiểm thử được mà không cần trình duyệt.
export function taoAmThanh(taoNguCanh) {
  const tao = taoNguCanh || (() => new (globalThis.AudioContext || globalThis.webkitAudioContext)());
  let c = null;
  let dich = null;
  let nhieu = null;
  let bat = false;

  // Tạo (nếu chưa có) và mở lại ngữ cảnh nếu bị trình duyệt tạm dừng. Gọi trong lúc người dùng đang bấm.
  function mo() {
    if (!bat) return null;
    if (!c) {
      c = tao();
      dich = c.createGain();
      dich.gain.value = AM_LUONG;
      dich.connect(c.destination);
      nhieu = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * 0.05)), c.sampleRate);
      const d = nhieu.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (c.state === "suspended" && c.resume) c.resume();
    return c;
  }

  return {
    dangBat: () => bat,
    // taoNgay = false: chỉ đặt cờ bật (khi khôi phục lựa chọn lúc tải trang, chưa có thao tác của người dùng),
    // ngữ cảnh âm thanh sẽ được tạo ở lần gọi mo() đầu tiên trong lúc người dùng bấm.
    datBat(v, taoNgay = true) {
      bat = Boolean(v);
      if (bat && taoNgay) try { mo(); } catch { /* trình duyệt không hỗ trợ: im lặng */ }
    },
    mo() {
      try { mo(); } catch { /* im lặng */ }
    },
    // loai: "di", "an", "chieu", "thang", "thua", "hoa". doTreMs: phát sau bấy nhiêu ms.
    phat(loai, doTreMs = 0) {
      if (!bat || !KIEU[loai]) return;
      try {
        const ctx = mo();
        if (!ctx) return;
        KIEU[loai](ctx, dich, ctx.currentTime + doTreMs / 1000 + 0.005, nhieu);
      } catch {
        // Lỗi âm thanh không được làm hỏng ván cờ
      }
    },
  };
}
