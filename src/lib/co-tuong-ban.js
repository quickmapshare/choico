// Bàn cờ dùng chung cho chơi với máy (components/CoTuong.astro) và chơi với người (views/TrangTran.astro):
// toạ độ, vẽ bàn, vẽ quân, khay quân bị ăn, hiệu ứng nước đi, tiếng đi quân và nút loa.
// Hai trang chỉ khác ở chỗ lấy trạng thái ván và cách xoay bàn, nên mọi thứ vẽ ra đều nằm ở đây; sửa một nơi là hai trang cùng đổi.
import { biChieu } from "./co-tuong.js";

export const KC = 50; // khoảng cách hai đường kẻ, theo hệ toạ độ SVG
export const LE = 30; // lề quanh bàn
export const RONG = LE * 2 + 8 * KC;
export const CAO = LE * 2 + 9 * KC;
export const TEN = { K: "帥", A: "仕", E: "相", H: "傌", R: "俥", C: "炮", P: "兵" }; // quân đỏ
export const TEN_DEN = { K: "將", A: "士", E: "象", H: "馬", R: "車", C: "砲", P: "卒" }; // quân đen
export const THOI_GIAN = { DI: 200, AN: 360, CHIEU: 800 }; // ms: quân trượt tới nơi; quân bị ăn mờ dần và vòng sáng; vòng và nhãn chiếu tướng

const SVG_NS = "http://www.w3.org/2000/svg";
const KHOA_TIENG = "co-tuong-tieng"; // lựa chọn âm thanh dùng chung giữa mọi trang cờ

// Toạ độ SVG của ô (hàng r, cột c). xoay = true khi cầm quân đen: bàn lật 180 độ để quân đen nằm phía dưới.
export function taoToa(xoay = false) {
  return {
    x: (c) => LE + (xoay ? 8 - c : c) * KC,
    y: (r) => LE + (xoay ? 9 - r : r) * KC,
  };
}

// Tạo phần tử SVG kèm thuộc tính; thuộc tính có giá trị undefined thì bỏ qua
export function svgEl(tag, attrs, cha) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined) e.setAttribute(k, String(v));
  if (cha) cha.appendChild(e);
  return e;
}

// Vẽ một quân trong nhóm .co-quan để có thể làm hoạt ảnh riêng
export function vePhanQuan(cha, p, x, y) {
  const laDo = p[0] === "r";
  const mau = laDo ? "#b3261e" : "#1f1f1f";
  const q = svgEl("g", { class: "co-quan" }, cha);
  svgEl("circle", { cx: x, cy: y, r: 20, fill: "#fbf6e6", stroke: mau, "stroke-width": 2 }, q);
  svgEl("text", { x, y: y + 8, "text-anchor": "middle", "font-size": 24, "font-weight": "bold", fill: mau }, q).textContent = laDo
    ? TEN[p[1]]
    : TEN_DEN[p[1]];
  return q;
}

// Vẽ khay quân bị ăn của bên s vào el. anCuoi: quân vừa bị ăn gần nhất, dạng "bR"; quân cùng loại cuối cùng của bên đó được đánh dấu.
export function veKhayQuanAn(el, list, s, anCuoi) {
  el.replaceChildren();
  const noi = anCuoi && anCuoi[0] === s ? list.lastIndexOf(anCuoi[1]) : -1;
  list.forEach((t, i) => {
    const chip = document.createElement("span");
    chip.className = "co-chip co-chip-" + s + (i === noi ? " co-chip-moi" : "");
    chip.textContent = s === "r" ? TEN[t] : TEN_DEN[t];
    el.appendChild(chip);
  });
}

// Đường kẻ bàn, cung tướng và sông (sóng nước). Các hàng và cột dùng toa để vẽ đúng cả khi bàn xoay.
function veNenBan(s, toa) {
  const net = { stroke: "#7a4b1e", "stroke-width": 1.5, fill: "none" };
  svgEl("rect", { x: 0, y: 0, width: RONG, height: CAO, rx: 10, fill: "#f1dca8" }, s);
  // Đường ngang: cả 10 hàng chạy suốt bàn
  for (let r = 0; r < 10; r++) svgEl("line", { ...net, x1: toa.x(0), y1: toa.y(r), x2: toa.x(8), y2: toa.y(r) }, s);
  // Đường dọc: cột ngoài cùng chạy suốt, các cột giữa bị ngắt ở sông
  for (let c = 0; c < 9; c++) {
    if (c === 0 || c === 8) {
      svgEl("line", { ...net, x1: toa.x(c), y1: toa.y(0), x2: toa.x(c), y2: toa.y(9) }, s);
    } else {
      svgEl("line", { ...net, x1: toa.x(c), y1: toa.y(0), x2: toa.x(c), y2: toa.y(4) }, s);
      svgEl("line", { ...net, x1: toa.x(c), y1: toa.y(5), x2: toa.x(c), y2: toa.y(9) }, s);
    }
  }
  // Hai đường chéo trong mỗi cung tướng
  for (const r0 of [0, 7]) {
    svgEl("line", { ...net, x1: toa.x(3), y1: toa.y(r0), x2: toa.x(5), y2: toa.y(r0 + 2) }, s);
    svgEl("line", { ...net, x1: toa.x(5), y1: toa.y(r0), x2: toa.x(3), y2: toa.y(r0 + 2) }, s);
  }
  // Sông: hai đường sóng nước giữa hàng 4 và hàng 5. Hai đầu sóng cách mép bàn bằng nhau,
  // và chia đúng số đoạn để sóng đối xứng qua tâm bàn
  const xTrai = Math.min(toa.x(0), toa.x(8)) + 6;
  const xPhai = Math.max(toa.x(0), toa.x(8)) - 6;
  const nSong = 32;
  const rongSong = (xPhai - xTrai) / nSong;
  for (const dy of [-10, 10]) {
    let d = `M${xTrai} ${toa.y(4.5) + dy} q${rongSong / 2} -5 ${rongSong} 0`;
    for (let i = 1; i < nSong; i++) d += ` t${rongSong} 0`;
    svgEl("path", { d, fill: "none", stroke: "#2f6f9f", "stroke-width": 2, "stroke-linecap": "round" }, s);
  }
}

// Vẽ toàn bộ bàn vào banEl (thay nội dung cũ) và trả về phần tử svg.
// ban: lưới 10 x 9 kiểu "rK", "bR" hoặc null. toa: từ taoToa(). nuocCuoi: [[r, c] ô rời, [r, c] ô đến] của nước vừa đi, hoặc null.
// chon: [r, c] ô đang chọn, hoặc null. dich: danh sách [r, c] các ô đi được từ ô đang chọn.
/**
 * @param {HTMLElement} banEl
 * @param {{ ban: (string | null)[][], toa: ReturnType<typeof taoToa>, khoa?: boolean, nuocCuoi?: [number, number][] | null,
 *   chon?: [number, number] | null, dich?: [number, number][], nhanBan?: string }} opts
 * @returns {SVGSVGElement}
 */
export function veBanCo(banEl, { ban, toa, khoa = false, nuocCuoi = null, chon = null, dich = [], nhanBan }) {
  banEl.replaceChildren();
  banEl.classList.toggle("khoa", khoa);
  const s = svgEl("svg", { viewBox: `0 0 ${RONG} ${CAO}`, class: "co-svg", role: "img", "aria-label": nhanBan }, banEl);
  veNenBan(s, toa);

  const laO = (o, r, c) => o && o[0] === r && o[1] === c;
  const laDich = (r, c) => dich.some(([dr, dc]) => dr === r && dc === c);
  const oDi = nuocCuoi ? nuocCuoi[0] : null; // ô quân vừa rời
  const oDen = nuocCuoi ? nuocCuoi[1] : null; // ô quân vừa đến
  const dangBiChieu = { r: biChieu(ban, "r"), b: biChieu(ban, "b") }; // tướng bên nào đang bị chiếu
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const x = toa.x(c);
      const y = toa.y(r);
      const p = ban[r][c];
      const g = svgEl("g", { class: "co-o", "data-r": r, "data-c": c }, s);
      // Ô quân vừa rời: vòng nét đứt, nền vàng nhạt. Ô quân vừa đến: vòng liền đậm hơn, nền vàng.
      if (laO(oDi, r, c)) svgEl("circle", { cx: x, cy: y, r: 22, fill: "rgba(224,161,0,.22)", stroke: "#e0a100", "stroke-width": 2, "stroke-dasharray": "4 3" }, g);
      if (laO(oDen, r, c)) svgEl("circle", { cx: x, cy: y, r: 24, fill: "rgba(224,161,0,.35)", stroke: "#e0a100", "stroke-width": 3.5 }, g);
      if (laO(chon, r, c)) svgEl("circle", { cx: x, cy: y, r: 22, fill: "none", stroke: "#1e88e5", "stroke-width": 3 }, g);
      if (laDich(r, c)) svgEl("circle", { cx: x, cy: y, r: 7, fill: "rgba(30,136,229,.65)" }, g);
      // Tướng đang bị chiếu: vòng đỏ đậm quanh quân, giữ nguyên cho đến khi hết bị chiếu
      if (p && p[1] === "K" && dangBiChieu[p[0]]) svgEl("circle", { cx: x, cy: y, r: 25, fill: "rgba(229,57,53,.28)", stroke: "#e53935", "stroke-width": 3.5 }, g);
      if (p) vePhanQuan(g, p, x, y);
      // Vùng bấm trong suốt phủ lên trên để nhận nhấp chuột
      svgEl("circle", { cx: x, cy: y, r: KC / 2 - 2, fill: "transparent" }, g);
    }
  }
  return s;
}

// Vị trí tướng của bên bn ("r" hoặc "b"), null nếu không thấy
export function timTuong(ban, bn) {
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) if (ban[r][c] === bn + "K") return [r, c];
  return null;
}

// Tổng thời gian hiệu ứng của một nước: quân trượt, rồi vòng sáng (và nhãn chiếu nếu có)
export function tongThoiGianHieuUng(chieu) {
  return THOI_GIAN.DI + Math.max(THOI_GIAN.AN, chieu ? THOI_GIAN.CHIEU : 0);
}

function giamChuyenDong() {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

// Hiệu ứng nước vừa đi: quân trượt từ ô cũ sang ô mới, nếu ăn quân thì quân bị ăn mờ dần và vòng sáng lan ra,
// nếu chiếu tướng thì vòng đỏ và nhãn "Chiếu tướng!" nổi lên quanh tướng bị chiếu.
// hieu: { batDau, quanBiAn, chieu }; batDau là thời điểm đi, để vẽ lại giữa chừng vẫn chạy tiếp đúng tiến độ.
// Trả về true khi hiệu ứng đã xong (bên gọi bỏ hieu đi), false khi còn chạy hoặc không chạy được.
export function chayHieuUng(s, hieu, { banEl, ban, toa, nuocCuoi, nhanChieu }) {
  if (!hieu || !nuocCuoi || giamChuyenDong() || !s.animate) return false;
  const troi = Date.now() - hieu.batDau;
  if (troi >= tongThoiGianHieuUng(hieu.chieu)) return true;
  const [tu, den] = nuocCuoi;
  const x = toa.x(den[1]);
  const y = toa.y(den[0]);
  const GIUA = "transform-box: fill-box; transform-origin: center;";

  // Quân bị ăn nằm yên ở ô đến cho đến khi quân đi tới, rồi mờ dần
  if (hieu.quanBiAn) {
    const ma = svgEl("g", { style: GIUA, "pointer-events": "none" }, s);
    vePhanQuan(ma, hieu.quanBiAn, x, y);
    ma.animate(
      [
        { opacity: 1, transform: "scale(1)", offset: 0 },
        { opacity: 1, transform: "scale(1)", offset: THOI_GIAN.DI / (THOI_GIAN.DI + THOI_GIAN.AN) },
        { opacity: 0, transform: "scale(1.5)", offset: 1 },
      ],
      { duration: THOI_GIAN.DI + THOI_GIAN.AN, delay: -troi, fill: "forwards" },
    );
  }

  // Vòng sáng lan ra khi quân đến nơi: đỏ nếu ăn quân, vàng nếu chỉ đi
  const vong = svgEl("circle", {
    cx: x, cy: y, r: 22, fill: "none", stroke: hieu.quanBiAn ? "#e53935" : "#e0a100", "stroke-width": 4,
    opacity: 0, style: GIUA, "pointer-events": "none",
  }, s);
  vong.animate(
    [{ opacity: 0.95, transform: "scale(1)" }, { opacity: 0, transform: "scale(2)" }],
    { duration: THOI_GIAN.AN, delay: THOI_GIAN.DI - troi, easing: "ease-out", fill: "forwards" },
  );

  // Chiếu tướng: vòng đỏ lan ra quanh tướng bị chiếu và nhãn nổi lên (bên bị chiếu là đối phương của quân vừa đi)
  if (hieu.chieu) {
    const benBiChieu = ban[den[0]][den[1]][0] === "r" ? "b" : "r";
    const tuong = timTuong(ban, benBiChieu);
    if (tuong) {
      const kx = toa.x(tuong[1]);
      const ky = toa.y(tuong[0]);
      const vongChieu = svgEl("circle", {
        cx: kx, cy: ky, r: 24, fill: "none", stroke: "#e53935", "stroke-width": 4, opacity: 0, style: GIUA, "pointer-events": "none",
      }, s);
      vongChieu.animate(
        [{ opacity: 0.95, transform: "scale(1)" }, { opacity: 0, transform: "scale(2.4)" }],
        { duration: THOI_GIAN.CHIEU, delay: THOI_GIAN.DI - troi, easing: "ease-out", fill: "forwards" },
      );
      // Nhãn nằm phía trong bàn (xét theo vị trí tướng trên màn hình, nên đúng cả khi bàn xoay)
      const tuongOTren = ky < CAO / 2;
      const nhan = svgEl("text", {
        x: kx, y: tuongOTren ? ky + 46 : ky - 34, "text-anchor": "middle", "font-size": 20, "font-weight": 800,
        fill: "#e53935", stroke: "#fff", "stroke-width": 4, "paint-order": "stroke", opacity: 0, style: GIUA, "pointer-events": "none",
      }, s);
      nhan.textContent = nhanChieu;
      nhan.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(.8)", offset: 0 },
          { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.2 },
          { opacity: 1, transform: "translateY(0) scale(1)", offset: 0.75 },
          { opacity: 0, transform: "translateY(-6px) scale(1)", offset: 1 },
        ],
        { duration: THOI_GIAN.CHIEU, delay: THOI_GIAN.DI - troi, fill: "forwards" },
      );
    }
  }

  // Quân vừa đi trượt từ ô cũ, đưa lên lớp trên cùng để không bị quân khác che
  const quan = banEl.querySelector(`g.co-o[data-r="${den[0]}"][data-c="${den[1]}"] .co-quan`);
  if (quan && THOI_GIAN.DI > troi) {
    s.appendChild(quan);
    quan.animate(
      [
        { transform: `translate(${toa.x(tu[1]) - x}px, ${toa.y(tu[0]) - y}px)` },
        { transform: "translate(0px, 0px)" },
      ],
      { duration: THOI_GIAN.DI, delay: -troi, easing: "ease-out", fill: "backwards" },
    );
  }
  return false;
}

// Tiếng đi quân đến đúng lúc quân trượt tới nơi (hai tiếng cộc nếu ăn quân), rồi tiếng chiếu nếu có
export function phatTiengNuoc(am, anQuan, chieu) {
  am.phat(anQuan ? "an" : "di", THOI_GIAN.DI);
  if (chieu) am.phat("chieu", THOI_GIAN.DI);
}

// Nút loa: đang bật thì hiện loa gạch chéo (bấm để tắt), đang tắt thì hiện loa có sóng (bấm để bật).
// Lựa chọn được nhớ trong localStorage và dùng chung cho mọi trang cờ; mặc định tắt.
// nhan: { amThanh, batAm, tatAm } lấy từ chuỗi của trang.
export function gaiNutTieng(am, { nut, loaBat, loaTat, nhan }) {
  const hien = () => {
    const bat = am.dangBat();
    nut.setAttribute("aria-label", nhan.amThanh);
    nut.setAttribute("aria-pressed", String(bat));
    nut.title = bat ? nhan.tatAm : nhan.batAm;
    nut.classList.toggle("co-dang-bat", bat);
    // SVG không có thuộc tính hidden như phần tử HTML, phải đặt trực tiếp thuộc tính
    loaBat.toggleAttribute("hidden", bat);
    loaTat.toggleAttribute("hidden", !bat);
  };
  try {
    am.datBat(localStorage.getItem(KHOA_TIENG) === "1", false);
  } catch {
    // Trình duyệt chặn localStorage: giữ mặc định tắt
  }
  hien();
  nut.addEventListener("click", () => {
    am.mo(); // tạo hoặc mở lại ngữ cảnh âm thanh ngay trong lúc người dùng bấm (iPhone chỉ cho phép như vậy)
    am.datBat(!am.dangBat());
    try {
      localStorage.setItem(KHOA_TIENG, am.dangBat() ? "1" : "0");
    } catch {
      // không nhớ được lựa chọn, vẫn dùng bình thường
    }
    hien();
    am.phat("di"); // nghe thử ngay khi vừa bật
  });
}
