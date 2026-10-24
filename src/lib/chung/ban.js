// Khung bàn cờ dùng chung cho mọi loại cờ, cho cả chơi với máy (components/ChoiVoiMay.astro) và chơi với người
// (views/TrangTran.astro): vẽ bàn qua bộ vẽ của loại cờ, đánh dấu ô, khay quân bị ăn, hiệu ứng nước đi, tiếng đi quân,
// nút loa và phóng to. Hai trang chỉ khác ở chỗ lấy trạng thái ván và cách xoay bàn; sửa một nơi là mọi trang cùng đổi.
//
// Bộ vẽ (ve) của mỗi loại cờ (src/lib/<loại>/ve.js) có: RONG, CAO (khung SVG), KC (cỡ một ô), oVuong (quân nằm trong ô
// vuông như cờ vua, hay trên giao điểm như cờ tướng), taoToa(xoay) → { x(c), y(r) }, veNen(svg, toa),
// veQuan(cha, p, x, y) → phần tử, kyTu(p) → chữ trên khay quân bị ăn.
import { svgEl } from "./svg.js";

export { svgEl };
export const THOI_GIAN = { DI: 200, AN: 360, CHIEU: 800 }; // ms: quân trượt tới nơi; quân bị ăn mờ dần và vòng sáng; vòng và nhãn chiếu tướng

const KHOA_TIENG = "co-tuong-tieng"; // lựa chọn âm thanh dùng chung giữa mọi trang cờ (giữ tên khóa cũ để không mất lựa chọn)

// Vị trí vua/tướng (loại "K") của bên s, null nếu không thấy
export function timVua(b, s) {
  for (let r = 0; r < b.length; r++) for (let c = 0; c < b[r].length; c++) if (b[r][c] === s + "K") return [r, c];
  return null;
}

// Vẽ khay quân bị ăn của bên s vào el. anCuoi: quân vừa bị ăn gần nhất, dạng "bR"; quân cùng loại cuối cùng của bên đó được đánh dấu.
export function veKhayQuanAn(el, list, s, anCuoi, ve) {
  el.replaceChildren();
  const noi = anCuoi && anCuoi[0] === s ? list.lastIndexOf(anCuoi[1]) : -1;
  list.forEach((t, i) => {
    const chip = document.createElement("span");
    chip.className = "co-chip co-chip-" + s + (i === noi ? " co-chip-moi" : "");
    chip.textContent = ve.kyTu(s + t);
    el.appendChild(chip);
  });
}

// Màu đánh dấu: ô vừa rời, ô vừa đến, ô đang chọn, ô đi được, vua đang bị chiếu
const VANG = "#e0a100";
const XANH = "#1e88e5";
const DO = "#e53935";

// Đánh dấu một ô. Cờ tướng (quân trên giao điểm) dùng vòng tròn; cờ vua (quân trong ô) tô cả ô.
// kieu: "roi", "den", "chon", "dich" (ô trống đi được), "dichAn" (ô có quân địch ăn được), "chieu".
function danhDau(g, kieu, x, y, ve) {
  if (ve.oVuong) {
    const n = ve.KC / 2;
    const o = { x: x - n, y: y - n, width: ve.KC, height: ve.KC };
    if (kieu === "roi") svgEl("rect", { ...o, fill: "rgba(224,161,0,.32)" }, g);
    if (kieu === "den") svgEl("rect", { ...o, fill: "rgba(224,161,0,.5)" }, g);
    if (kieu === "chon") svgEl("rect", { ...o, fill: "rgba(30,136,229,.35)", stroke: XANH, "stroke-width": 3 }, g);
    if (kieu === "dich") svgEl("circle", { cx: x, cy: y, r: ve.KC * 0.16, fill: "rgba(30,136,229,.65)" }, g);
    if (kieu === "dichAn") svgEl("circle", { cx: x, cy: y, r: n - 4, fill: "none", stroke: "rgba(30,136,229,.75)", "stroke-width": 5 }, g);
    if (kieu === "chieu") svgEl("rect", { ...o, fill: "rgba(229,57,53,.45)", stroke: DO, "stroke-width": 3 }, g);
    return;
  }
  if (kieu === "roi") svgEl("circle", { cx: x, cy: y, r: 22, fill: "rgba(224,161,0,.22)", stroke: VANG, "stroke-width": 2, "stroke-dasharray": "4 3" }, g);
  if (kieu === "den") svgEl("circle", { cx: x, cy: y, r: 24, fill: "rgba(224,161,0,.35)", stroke: VANG, "stroke-width": 3.5 }, g);
  if (kieu === "chon") svgEl("circle", { cx: x, cy: y, r: 22, fill: "none", stroke: XANH, "stroke-width": 3 }, g);
  if (kieu === "dich" || kieu === "dichAn") svgEl("circle", { cx: x, cy: y, r: 7, fill: "rgba(30,136,229,.65)" }, g);
  if (kieu === "chieu") svgEl("circle", { cx: x, cy: y, r: 25, fill: "rgba(229,57,53,.28)", stroke: DO, "stroke-width": 3.5 }, g);
}

// Vẽ toàn bộ bàn vào banEl (thay nội dung cũ) và trả về phần tử svg.
// ban: lưới các quân kiểu "rK", "bR" hoặc null. ve: bộ vẽ của loại cờ. toa: từ ve.taoToa().
// nuocCuoi: [[r, c] ô rời, [r, c] ô đến] của nước vừa đi, hoặc null. chon: [r, c] ô đang chọn, hoặc null.
// dich: danh sách [r, c] các ô đi được từ ô đang chọn. chieu: { r, b } bên nào đang bị chiếu.
/**
 * @param {HTMLElement} banEl
 * @param {{ ban: (string | null)[][], ve: any, toa: { x: (c: number) => number, y: (r: number) => number }, khoa?: boolean,
 *   nuocCuoi?: [number, number][] | null, chon?: [number, number] | null, dich?: [number, number][], chieu?: { r: boolean, b: boolean },
 *   nhanBan?: string }} opts
 * @returns {SVGSVGElement}
 */
export function veBanCo(banEl, { ban, ve, toa, khoa = false, nuocCuoi = null, chon = null, dich = [], chieu = { r: false, b: false }, nhanBan }) {
  banEl.replaceChildren();
  banEl.classList.toggle("khoa", khoa);
  const s = svgEl("svg", { viewBox: `0 0 ${ve.RONG} ${ve.CAO}`, class: "co-svg", role: "img", "aria-label": nhanBan }, banEl);
  ve.veNen(s, toa);

  const laO = (o, r, c) => o && o[0] === r && o[1] === c;
  const laDich = (r, c) => dich.some(([dr, dc]) => dr === r && dc === c);
  const oDi = nuocCuoi ? nuocCuoi[0] : null; // ô quân vừa rời
  const oDen = nuocCuoi ? nuocCuoi[1] : null; // ô quân vừa đến
  for (let r = 0; r < ban.length; r++) {
    for (let c = 0; c < ban[r].length; c++) {
      const x = toa.x(c);
      const y = toa.y(r);
      const p = ban[r][c];
      const g = svgEl("g", { class: "co-o", "data-r": r, "data-c": c }, s);
      if (laO(oDi, r, c)) danhDau(g, "roi", x, y, ve);
      if (laO(oDen, r, c)) danhDau(g, "den", x, y, ve);
      if (laO(chon, r, c)) danhDau(g, "chon", x, y, ve);
      if (laDich(r, c)) danhDau(g, p ? "dichAn" : "dich", x, y, ve);
      // Vua đang bị chiếu: đánh dấu đỏ, giữ nguyên cho đến khi hết bị chiếu
      if (p && p[1] === "K" && chieu[p[0]]) danhDau(g, "chieu", x, y, ve);
      if (p) ve.veQuan(g, p, x, y);
      // Vùng bấm trong suốt phủ lên trên để nhận nhấp chuột
      if (ve.oVuong) svgEl("rect", { x: x - ve.KC / 2, y: y - ve.KC / 2, width: ve.KC, height: ve.KC, fill: "transparent" }, g);
      else svgEl("circle", { cx: x, cy: y, r: ve.KC / 2 - 2, fill: "transparent" }, g);
    }
  }
  return s;
}

// Tổng thời gian hiệu ứng của một nước: quân trượt, rồi vòng sáng (và nhãn chiếu nếu có)
export function tongThoiGianHieuUng(chieu) {
  return THOI_GIAN.DI + Math.max(THOI_GIAN.AN, chieu ? THOI_GIAN.CHIEU : 0);
}

function giamChuyenDong() {
  return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
}

// Hiệu ứng nước vừa đi: quân trượt từ ô cũ sang ô mới, nếu ăn quân thì quân bị ăn mờ dần và vòng sáng lan ra,
// nếu chiếu thì vòng đỏ và nhãn chiếu nổi lên quanh vua bị chiếu.
// hieu: { batDau, quanBiAn, oAn?, chieu }; batDau là thời điểm đi, để vẽ lại giữa chừng vẫn chạy tiếp đúng tiến độ.
// oAn: ô của quân bị ăn nếu khác ô đến (bắt tốt qua đường trong cờ vua).
// Trả về true khi hiệu ứng đã xong (bên gọi bỏ hieu đi), false khi còn chạy hoặc không chạy được.
export function chayHieuUng(s, hieu, { banEl, ban, ve, toa, nuocCuoi, nhanChieu }) {
  if (!hieu || !nuocCuoi || giamChuyenDong() || !s.animate) return false;
  const troi = Date.now() - hieu.batDau;
  if (troi >= tongThoiGianHieuUng(hieu.chieu)) return true;
  const [tu, den] = nuocCuoi;
  const x = toa.x(den[1]);
  const y = toa.y(den[0]);
  const GIUA = "transform-box: fill-box; transform-origin: center;";

  // Quân bị ăn nằm yên ở ô của nó cho đến khi quân đi tới, rồi mờ dần
  if (hieu.quanBiAn) {
    const oAn = hieu.oAn || den;
    const ma = svgEl("g", { style: GIUA, "pointer-events": "none" }, s);
    ve.veQuan(ma, hieu.quanBiAn, toa.x(oAn[1]), toa.y(oAn[0]));
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
    cx: x, cy: y, r: 22, fill: "none", stroke: hieu.quanBiAn ? DO : VANG, "stroke-width": 4,
    opacity: 0, style: GIUA, "pointer-events": "none",
  }, s);
  vong.animate(
    [{ opacity: 0.95, transform: "scale(1)" }, { opacity: 0, transform: "scale(2)" }],
    { duration: THOI_GIAN.AN, delay: THOI_GIAN.DI - troi, easing: "ease-out", fill: "forwards" },
  );

  // Chiếu: vòng đỏ lan ra quanh vua bị chiếu và nhãn nổi lên (bên bị chiếu là đối phương của quân vừa đi)
  if (hieu.chieu) {
    const benBiChieu = ban[den[0]][den[1]]?.[0] === "r" ? "b" : "r";
    const vua = timVua(ban, benBiChieu);
    if (vua) {
      const kx = toa.x(vua[1]);
      const ky = toa.y(vua[0]);
      const vongChieu = svgEl("circle", {
        cx: kx, cy: ky, r: 24, fill: "none", stroke: DO, "stroke-width": 4, opacity: 0, style: GIUA, "pointer-events": "none",
      }, s);
      vongChieu.animate(
        [{ opacity: 0.95, transform: "scale(1)" }, { opacity: 0, transform: "scale(2.4)" }],
        { duration: THOI_GIAN.CHIEU, delay: THOI_GIAN.DI - troi, easing: "ease-out", fill: "forwards" },
      );
      // Nhãn nằm phía trong bàn (xét theo vị trí vua trên màn hình, nên đúng cả khi bàn xoay)
      const vuaOTren = ky < ve.CAO / 2;
      const nhan = svgEl("text", {
        x: kx, y: vuaOTren ? ky + 46 : ky - 34, "text-anchor": "middle", "font-size": 20, "font-weight": 800,
        fill: DO, stroke: "#fff", "stroke-width": 4, "paint-order": "stroke", opacity: 0, style: GIUA, "pointer-events": "none",
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

// Ô được bấm trên bàn, dạng [r, c]; null nếu bấm ra ngoài các ô
export function oBamDuoc(e) {
  const o = e.target.closest?.(".co-o");
  return o ? [Number(o.getAttribute("data-r")), Number(o.getAttribute("data-c"))] : null;
}

// Nước đặt quân trực tiếp vào ô (r, c), cho loại cờ không "nhặt quân lên rồi đi" mà chỉ đặt một quân mới vào ô trống
// (cờ caro): nước có ô đi và ô đến là cùng một ô. Cờ tướng/cờ vua không có nước nào như vậy nên luôn trả về null,
// bàn bấm vẫn theo đúng cách chọn quân rồi chọn ô đích như cũ.
export function nuocDatTaiO(luat, the, r, c) {
  return luat.nuocHopLe(the).find((m) => m.tu[0] === r && m.tu[1] === c && m.den[0] === r && m.den[1] === c) || null;
}

// Phóng to bàn cờ: trình duyệt có Fullscreen API (máy tính, Android) thì dùng nó, còn iPhone Safari phủ kín màn hình bằng CSS.
// nut: nút phóng to; nutMo, nutDong: hai biểu tượng trong nút; nutThuNho: nút cố định góc phải để thu lại (chỉ hiện khi phóng bằng CSS).
// nhan: { phongTo, thuNhoBan } lấy từ chuỗi của trang. Ẩn nút chat khi đang phóng to, để nút chat không che bàn.
export function gaiPhongTo(banEl, { nut, nutMo, nutDong, nutThuNho, nhan }) {
  const coFullscreen = Boolean(banEl.requestFullscreen);
  const dangPhong = () => document.fullscreenElement === banEl || banEl.classList.contains("co-phong-to-css");
  const capNhat = () => {
    const dang = dangPhong();
    document.body.classList.toggle("co-dang-phong-to", dang);
    const nhanNut = dang ? nhan.thuNhoBan : nhan.phongTo;
    nut.setAttribute("aria-label", nhanNut);
    nut.title = nhanNut;
    nutMo.toggleAttribute("hidden", dang);
    nutDong.toggleAttribute("hidden", !dang);
  };
  // Đổi phóng to bằng CSS (iPhone): cập nhật nút và nút thu nhỏ cố định
  const datCss = (bat) => {
    banEl.classList.toggle("co-phong-to-css", bat);
    nutThuNho.hidden = !bat;
    capNhat();
  };
  nut.addEventListener("click", () => {
    if (!coFullscreen) {
      datCss(!banEl.classList.contains("co-phong-to-css"));
    } else if (document.fullscreenElement === banEl) {
      void document.exitFullscreen();
    } else {
      void banEl.requestFullscreen().catch(() => {});
    }
  });
  nutThuNho.addEventListener("click", () => datCss(false));
  if (coFullscreen) document.addEventListener("fullscreenchange", capNhat);
  capNhat();
}

// Gắn các nút dùng chung của khung bàn (components/NutBan.astro, components/KhungBan.astro, id cố định): loa và phóng to.
export function gaiNutKhung(am, banEl, nhan) {
  const $ = (id) => document.getElementById(id);
  gaiNutTieng(am, { nut: $("co-tieng"), loaBat: $("co-loa-bat"), loaTat: $("co-loa-tat"), nhan });
  gaiPhongTo(banEl, { nut: $("co-phong-to"), nutMo: $("co-phong-mo"), nutDong: $("co-phong-dong"), nutThuNho: $("co-thu-nho"), nhan });
}

// Vẽ hai khay quân bị ăn trên và dưới bàn (components/KhungBan.astro). benTren: bên có quân nằm phía trên bàn ("b" nếu
// không xoay bàn). Khay không có chữ tiêu đề, chỉ có nhãn cho trình đọc màn hình. nhan: { quanDoBiAn, quanDenBiAn }.
export function veHaiKhay(ket, benTren, anCuoi, ve, nhan) {
  const benDuoi = benTren === "r" ? "b" : "r";
  const $ = (id) => document.getElementById(id);
  const nhanCua = (s) => (s === "r" ? nhan.quanDoBiAn : nhan.quanDenBiAn);
  $("co-khay-tren").setAttribute("aria-label", nhanCua(benTren));
  $("co-khay-duoi").setAttribute("aria-label", nhanCua(benDuoi));
  veKhayQuanAn($("co-an-tren"), ket[benTren], benTren, anCuoi, ve);
  veKhayQuanAn($("co-an-duoi"), ket[benDuoi], benDuoi, anCuoi, ve);
}

// Chọn một trong các nước cùng ô đi và ô đến (tốt phong cấp ở cờ vua: hậu, xe, tượng, mã). Hiện ô chọn quân trên bàn
// (components/KhungBan.astro). cacNuoc: các nước có trường phong (loại quân). Trả về Promise nước được chọn, hoặc null nếu
// người chơi bỏ (bấm ra ngoài hoặc Esc). nhan(loai): tên quân cho trình đọc màn hình.
export function chonNuocPhong(cacNuoc, ve, ben, nhan = () => "") {
  const hop = document.getElementById("co-chon-quan");
  const ds = document.getElementById("co-chon-quan-nut");
  return new Promise((xong) => {
    const phim = (e) => {
      if (e.key === "Escape") dong(null);
    };
    function dong(m) {
      hop.hidden = true;
      hop.onclick = null;
      document.removeEventListener("keydown", phim);
      xong(m);
    }
    ds.replaceChildren();
    for (const m of cacNuoc) {
      const nut = document.createElement("button");
      nut.type = "button";
      nut.className = `co-chip co-chip-${ben} co-chon-mot`;
      nut.textContent = ve.kyTu(ben + m.phong);
      nut.setAttribute("aria-label", nhan(m.phong) || nut.textContent);
      nut.addEventListener("click", () => dong(m));
      ds.appendChild(nut);
    }
    hop.onclick = (e) => {
      if (e.target === hop) dong(null);
    };
    hop.hidden = false;
    document.addEventListener("keydown", phim);
    ds.querySelector("button")?.focus();
  });
}
