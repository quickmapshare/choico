// Tạo ảnh hiện ra khi dán link vào mạng xã hội (Open Graph, 1200 x 630): public/og/<ngôn ngữ>.png, mỗi ngôn ngữ một ảnh.
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
const NGON_NGU = {
  vi: { mon: "Cờ tướng", moi: "Mời bạn chơi một ván cờ tướng", phong: "'Segoe UI', 'Be Vietnam Pro', Arial, sans-serif" },
  en: { mon: "Xiangqi", moi: "You're invited to play Xiangqi", phong: "'Segoe UI', Arial, sans-serif" },
  "zh-tw": { mon: "象棋", moi: "邀請你下一盤象棋", phong: "'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', sans-serif" },
  ko: { mon: "샹치", moi: "샹치(중국 장기) 한 판 두실래요?", phong: "'Malgun Gothic', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" },
  ja: { mon: "シャンチー", moi: "シャンチーで対局しませんか", phong: "'Yu Gothic', 'Meiryo', 'Hiragino Sans', 'Noto Sans JP', sans-serif" },
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

// Logo quân cờ tròn đỏ chữ Co (giống src/components/Logo.astro)
const LOGO = `<svg width="150" height="150" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#b3261e"/><g transform="translate(32 32) scale(1.38) translate(-32 -32)" fill="none" stroke="#fbf6e6"><path d="M41 21.3A14 14 0 1 0 41 42.7" stroke-width="9" stroke-linecap="round"/><circle cx="46" cy="32" r="4.5" fill="#fbf6e6" stroke="none"/></g></svg>`;

function trang(ma) {
  const n = NGON_NGU[ma];
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
    <div class="ban">${banCo()}</div><div class="web">choico.pages.dev</div>
  </body></html>`;
}

const ra = path.join(goc, "public", "og");
fs.mkdirSync(ra, { recursive: true });
for (const ma of Object.keys(NGON_NGU)) {
  const tep = path.join(ra, `${ma}.png`);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
    "--window-size=1200,630", `--screenshot=${tep}`, `data:text/html;charset=utf-8,${encodeURIComponent(trang(ma))}`,
  ], { stdio: "ignore" });
  console.log("đã tạo", path.relative(goc, tep), fs.statSync(tep).size, "byte");
}
