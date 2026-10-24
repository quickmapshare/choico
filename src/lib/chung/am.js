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

// iPhone gạt nút im lặng thì Web Audio bị tắt tiếng hẳn (iOS xếp nó vào loại "ambient"), còn thẻ <audio> vẫn kêu.
// Phát một đoạn im lặng bằng thẻ <audio> trong lúc người dùng bấm thì iOS chuyển cả trang sang loại "playback",
// từ đó Web Audio kêu dù đang gạt im lặng. iOS 17 trở lên có sẵn navigator.audioSession để đặt thẳng.
let daMoKenhPhat = false;
function moKenhPhat() {
  if (daMoKenhPhat) return;
  daMoKenhPhat = true;
  try {
    if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "playback";
  } catch { /* bỏ qua */ }
  if (typeof globalThis.Audio !== "function" || typeof globalThis.Blob !== "function") return;
  try {
    // WAV 8 bit, 8000 Hz, 0,1 giây toàn giá trị giữa (128) là im lặng
    const soMau = 800;
    const b = new Uint8Array(44 + soMau);
    const v = new DataView(b.buffer);
    const chu = (o, s) => [...s].forEach((k, i) => (b[o + i] = k.charCodeAt(0)));
    chu(0, "RIFF"); v.setUint32(4, 36 + soMau, true); chu(8, "WAVE");
    chu(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    chu(36, "data"); v.setUint32(40, soMau, true);
    b.fill(128, 44);
    const a = new globalThis.Audio(URL.createObjectURL(new Blob([b], { type: "audio/wav" })));
    a.setAttribute("x-webkit-airplay", "deny");
    a.disableRemotePlayback = true;
    const p = a.play();
    if (p && p.catch) p.catch(() => { daMoKenhPhat = false; }); // bị chặn thì thử lại ở lần bấm sau
  } catch {
    daMoKenhPhat = false;
  }
}

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
    moKenhPhat();
    if (!c) {
      c = tao();
      dich = c.createGain();
      dich.gain.value = AM_LUONG;
      dich.connect(c.destination);
      nhieu = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * 0.05)), c.sampleRate);
      const d = nhieu.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    // iPhone còn có trạng thái "interrupted" (sau cuộc gọi, khi chuyển app), cũng phải mở lại
    if (c.state !== "running" && c.state !== "closed" && c.resume) c.resume();
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
