// Tạo ảnh hiện ra khi dán link vào mạng xã hội (Open Graph, 1200 x 630), mỗi loại cờ, mỗi ngôn ngữ một ảnh:
// cờ tướng (và trang chủ) ở public/og/<ngôn ngữ>.png, cờ vua ở public/og/co-vua/<ngôn ngữ>.png, caro ở
// public/og/caro/<ngôn ngữ>.png (Layout chọn theo loại cờ).
// Dùng Chrome ở chế độ không giao diện để vẽ, nên chữ Việt, Hoa, Hàn, Nhật lấy phông có sẵn trên máy.
// Chạy: node tools/tao-anh-chia-se.mjs   (đặt CHROME nếu Chrome không nằm ở chỗ mặc định). Đổi nội dung thì sửa rồi chạy lại, commit ảnh.
// Chữ trên ảnh do AI viết, chưa có người bản ngữ kiểm tra (xem CLAUDE.md).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";

// Mỗi ngôn ngữ: tên môn cờ, lời mời, phông chữ
const CO_TUONG = {
  vi: { mon: "Cờ tướng", moi: "Mời bạn chơi một ván cờ tướng", phong: "'Segoe UI', 'Be Vietnam Pro', Arial, sans-serif" },
  en: { mon: "Xiangqi", moi: "You're invited to play Xiangqi", phong: "'Segoe UI', Arial, sans-serif" },
  "zh-tw": { mon: "象棋", moi: "邀請你下一盤象棋", phong: "'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif" },
  ko: { mon: "샹치", moi: "샹치(중국 장기) 한 판 두실래요?", phong: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" },
  ja: { mon: "シャンチー", moi: "シャンチーで対局しませんか", phong: "'Yu Gothic', 'Meiryo', 'Hiragino Sans', 'Noto Sans JP', sans-serif" },
};
const CO_VUA = {
  vi: { ...CO_TUONG.vi, mon: "Cờ vua", moi: "Mời bạn chơi một ván cờ vua" },
  en: { ...CO_TUONG.en, mon: "Chess", moi: "You're invited to play chess" },
  "zh-tw": { ...CO_TUONG["zh-tw"], mon: "西洋棋", moi: "邀請你下一盤西洋棋" },
  ko: { ...CO_TUONG.ko, mon: "체스", moi: "체스 한 판 두실래요?" },
  ja: { ...CO_TUONG.ja, mon: "チェス", moi: "チェスで対局しませんか" },
};
const CO_CARO = {
  vi: { ...CO_TUONG.vi, mon: "Cờ caro", moi: "Mời bạn chơi một ván cờ caro" },
  en: { ...CO_TUONG.en, mon: "Gomoku", moi: "You're invited to play Gomoku" },
  "zh-tw": { ...CO_TUONG["zh-tw"], mon: "五子棋", moi: "邀請你下一盤五子棋" },
  ko: { ...CO_TUONG.ko, mon: "오목", moi: "오목 한 판 두실래요?" },
  ja: { ...CO_TUONG.ja, mon: "五目並べ", moi: "五目並べで対局しませんか" },
};

// Bàn cờ cắt một góc kèm vài quân, cùng kiểu với bàn cờ trong trang (xem src/lib/co-tuong/ve.js)
function banCo() {
  const KC = 86;
  const x = (c) => 40 + c * KC;
  const y = (r) => 40 + r * KC;
  const net = 'stroke="#7a4b1e" stroke-width="3" fill="none"';
  let svg = `<rect width="${40 * 2 + KC * 4}" height="${40 * 2 + KC * 5}" rx="22" fill="#f1dca8"/>`;
  for (let r = 0; r <= 5; r++) svg += `<line ${net} x1="${x(0)}" y1="${y(r)}" x2="${x(4)}" y2="${y(r)}"/>`;
  for (let c = 0; c <= 4; c++) svg += `<line ${net} x1="${x(c)}" y1="${y(0)}" x2="${x(c)}" y2="${y(5)}"/>`;
  svg += `<line ${net} x1="${x(1)}" y1="${y(0)}" x2="${x(3)}" y2="${y(2)}"/><line ${net} x1="${x(3)}" y1="${y(0)}" x2="${x(1)}" y2="${y(2)}"/>`;
  const quan = (c, r, chu, mau) =>
    `<circle cx="${x(c)}" cy="${y(r)}" r="38" fill="#fbf6e6" stroke="${mau}" stroke-width="4"/>` +
    `<text x="${x(c)}" y="${y(r) + 16}" text-anchor="middle" font-size="46" font-weight="700" fill="${mau}" font-family="'Microsoft JhengHei','PingFang TC','Noto Sans TC',serif">${chu}</text>`;
  svg += quan(2, 0, "將", "#1f1f1f") + quan(1, 2, "馬", "#1f1f1f") + quan(3, 3, "炮", "#b3261e") + quan(2, 5, "帥", "#b3261e");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${40 * 2 + KC * 4}" height="${40 * 2 + KC * 5}" viewBox="0 0 ${40 * 2 + KC * 4} ${40 * 2 + KC * 5}">${svg}</svg>`;
}

// Bàn cờ vua cắt một góc (5 x 6 ô) kèm vài quân, cùng màu và kiểu quân với src/lib/co-vua/ve.js
function banCoVua() {
  const KC = 84, LE = 18, SC = 5, SH = 6;
  const rong = LE * 2 + KC * SC, cao = LE * 2 + KC * SH;
  let svg = `<rect width="${rong}" height="${cao}" rx="22" fill="#6f4a2a"/>`;
  for (let r = 0; r < SH; r++) for (let c = 0; c < SC; c++)
    svg += `<rect x="${LE + c * KC}" y="${LE + r * KC}" width="${KC}" height="${KC}" fill="${(r + c) % 2 ? "#b58863" : "#f0d9b5"}"/>`;
  const quan = (c, r, chu, trang) =>
    `<text x="${LE + c * KC + KC / 2}" y="${LE + r * KC + KC / 2 + 26}" text-anchor="middle" font-size="74" ` +
    `font-family="'Segoe UI Symbol','Noto Sans Symbols 2','Apple Symbols','DejaVu Sans',sans-serif" ` +
    `fill="${trang ? "#ffffff" : "#1f1f1f"}" stroke="${trang ? "#1f1f1f" : "#f6f0e4"}" stroke-width="${trang ? 2.6 : 1}" ` +
    `paint-order="stroke" stroke-linejoin="round">${chu}&#xFE0E;</text>`;
  svg += quan(3, 0, "♚", false) + quan(1, 1, "♟", false) + quan(2, 2, "♞", false) +
    quan(3, 3, "♕", true) + quan(1, 4, "♟", true) + quan(2, 5, "♚", true);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${rong}" height="${cao}" viewBox="0 0 ${rong} ${cao}">${svg}</svg>`;
}

// Trang giấy ô li cắt một góc (5 x 6 ô, giống src/lib/caro/ve.js) kèm vài dấu X đỏ / O xanh, có một dãy gần thắng
function banCaro() {
  const KC = 84, LE = 18, SC = 5, SH = 6;
  const rong = LE * 2 + KC * SC, cao = LE * 2 + KC * SH;
  const x = (c) => LE + c * KC + KC / 2;
  const y = (r) => LE + r * KC + KC / 2;
  let svg = `<rect width="${rong}" height="${cao}" rx="22" fill="#fdfbf3"/>`;
  for (let i = 0; i < SC; i++) svg += `<line stroke="#dceaf6" stroke-width="2" x1="${x(i)}" y1="${LE}" x2="${x(i)}" y2="${cao - LE}"/>`;
  for (let i = 0; i < SH; i++) svg += `<line stroke="#dceaf6" stroke-width="2" x1="${LE}" y1="${y(i)}" x2="${rong - LE}" y2="${y(i)}"/>`;
  for (let i = 0; i <= SC; i++) svg += `<line stroke="#a9cbe8" stroke-width="2.5" x1="${LE + i * KC}" y1="${LE}" x2="${LE + i * KC}" y2="${cao - LE}"/>`;
  for (let i = 0; i <= SH; i++) svg += `<line stroke="#a9cbe8" stroke-width="2.5" x1="${LE}" y1="${LE + i * KC}" x2="${rong - LE}" y2="${LE + i * KC}"/>`;
  svg += `<line stroke="#e57373" stroke-width="3.5" x1="${LE - 8}" y1="8" x2="${LE - 8}" y2="${cao - 8}"/>`;
  const but = (mau) => `fill="none" stroke="${mau}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"`;
  const n = KC * 0.3;
  const X = (c, r) => { const cx = x(c), cy = y(r);
    return `<path ${but("#d32f2f")} d="M${cx - n} ${cy - n + 3} Q${cx + 3} ${cy - 3} ${cx + n} ${cy + n}"/>` +
      `<path ${but("#d32f2f")} d="M${cx + n - 3} ${cy - n} Q${cx - 3} ${cy + 3} ${cx - n + 3} ${cy + n - 3}"/>`; };
  const O = (c, r) => { const cx = x(c), cy = y(r);
    return `<path ${but("#1565c0")} transform="rotate(-12 ${cx} ${cy})" d="M${cx + 5} ${cy - n} C${cx + n + 8} ${cy - n} ${cx + n + 3} ${cy + n} ${cx} ${cy + n} C${cx - n - 5} ${cy + n} ${cx - n - 3} ${cy - n + 3} ${cx + 8} ${cy - n - 3}"/>`; };
  svg += X(0, 5) + X(1, 4) + X(2, 3) + X(3, 2) + O(1, 2) + O(3, 4) + O(2, 1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${rong}" height="${cao}" viewBox="0 0 ${rong} ${cao}">${svg}</svg>`;
}

// Logo quân cờ tròn đỏ chữ Co (giống src/components/Logo.astro)
const LOGO = `<svg width="150" height="150" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#b3261e"/><g transform="translate(32 32) scale(1.38) translate(-32 -32)" fill="none" stroke="#fbf6e6"><path d="M41 21.3A14 14 0 1 0 41 42.7" stroke-width="9" stroke-linecap="round"/><circle cx="46" cy="32" r="4.5" fill="#fbf6e6" stroke="none"/></g></svg>`;

function trang(n, ban) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:1200px;height:630px;overflow:hidden}
    body{background:#f7f5f0;color:#1f2421;font-family:${n.phong};position:relative}
    .trai{position:absolute;left:80px;top:0;bottom:0;width:640px;display:flex;flex-direction:column;justify-content:center}
    .ten{display:flex;align-items:center;gap:28px}
    .ten b{font-size:120px;letter-spacing:-3px;font-weight:800;line-height:1}
    .ten b i{font-style:normal;color:#b3261e}
    .mon{margin-top:34px;font-size:46px;font-weight:700;color:#b3261e}
    .moi{margin-top:14px;font-size:38px;line-height:1.35;color:#3b423f}
    .web{position:absolute;left:80px;bottom:44px;font-size:28px;color:#5f6764}
    .ban{position:absolute;right:70px;top:50%;transform:translateY(-50%) rotate(4deg);filter:drop-shadow(0 18px 30px rgba(31,36,33,.25))}
  </style></head><body>
    <div class="trai"><div class="ten">${LOGO}<b>Choi<i>Co</i></b></div><div class="mon">${n.mon}</div><div class="moi">${n.moi}</div></div>
    <div class="ban">${ban}</div><div class="web">choico.pages.dev</div>
  </body></html>`;
}

const BO = [
  { thuMuc: path.join(goc, "public", "og"), chu: CO_TUONG, ban: banCo() },
  { thuMuc: path.join(goc, "public", "og", "co-vua"), chu: CO_VUA, ban: banCoVua() },
  { thuMuc: path.join(goc, "public", "og", "caro"), chu: CO_CARO, ban: banCaro() },
];
for (const { thuMuc, chu, ban } of BO) {
  fs.mkdirSync(thuMuc, { recursive: true });
  for (const ma of Object.keys(chu)) {
    const tep = path.join(thuMuc, `${ma}.png`);
    execFileSync(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      "--window-size=1200,630", `--screenshot=${tep}`, `data:text/html;charset=utf-8,${encodeURIComponent(trang(chu[ma], ban))}`,
    ], { stdio: "ignore" });
    console.log("đã tạo", path.relative(goc, tep), fs.statSync(tep).size, "byte");
  }
}
