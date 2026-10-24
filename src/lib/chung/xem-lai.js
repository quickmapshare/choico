// Tính năng xem lại ván, dùng chung cho mọi loại cờ và mọi loại trận (đấu máy, chơi với bạn, thượng đài, link /xem-van/).
// Chỉ lo việc đi tới, lùi, tự chạy trên danh sách nước và thanh nút (components/ThanhXemLai.astro); trang tự vẽ bàn trong
// khiVe, nên mỗi trang giữ cách xoay bàn và khay quân của mình. Ai được dùng: xem duocDung("xem_lai") trong tinh-nang.js.
import { phatLai } from "./van.js";
import { phatTiengNuoc } from "./ban.js";
import { f } from "./trinh-duyet.js";

const NHIP_MS = 1100; // ms giữa hai nước khi tự chạy

// am: âm thanh của trang (tiếng đi quân khi tới một nước). nhan: chuỗi của trang (xlChay, xlDung, xlTrangThai).
// khiVe({ the, nuocCuoi, anCuoi, hieuUng, k, n }): vẽ thế cờ sau k nước; hieuUng có khi vừa tới đúng một nước
//   ({ batDau, quanBiAn, oAn, chieu, tu, den }, như hiệu ứng lúc chơi).
// khiThoat(): trả bàn về trạng thái thật của trang. khiDoi(): gọi khi bắt đầu, thoát hoặc đổi nước (để trang ẩn hiện nút).
// hienTrangThai(text): dòng thông báo "Xem lại: nước k/n". coThoat: hiện nút Thoát (trang chỉ để xem thì không cần).
export function taoXemLai({ am, nhan, khiVe, khiThoat = () => {}, khiDoi = () => {}, hienTrangThai = () => {}, coThoat = true }) {
  const $ = (id) => document.getElementById(id);
  const thanh = $("co-xl");
  const nut = { dau: $("co-xl-dau"), lui: $("co-xl-lui"), chay: $("co-xl-chay"), tien: $("co-xl-tien"), cuoi: $("co-xl-cuoi"), thoat: $("co-xl-thoat") };
  const bieuTuongChay = $("co-xl-bat");
  const bieuTuongTam = $("co-xl-tam");
  nut.thoat.hidden = !coThoat;

  let luat = null;
  let nuoc = [];
  let k = 0;
  let dang = false;
  let chayId;

  function capNhat() {
    thanh.hidden = !dang;
    if (dang) {
      nut.dau.disabled = nut.lui.disabled = k <= 0;
      nut.tien.disabled = nut.cuoi.disabled = k >= nuoc.length;
      const dangChay = chayId !== undefined;
      bieuTuongChay.toggleAttribute("hidden", dangChay);
      bieuTuongTam.toggleAttribute("hidden", !dangChay);
      nut.chay.setAttribute("aria-label", dangChay ? nhan.xlDung : nhan.xlChay);
      nut.chay.title = dangChay ? nhan.xlDung : nhan.xlChay;
    }
    khiDoi();
  }

  function dung() {
    if (chayId !== undefined) {
      clearInterval(chayId);
      chayId = undefined;
    }
    capNhat();
  }

  // Tới thế sau kMoi nước. hoatAnh: đi tới đúng một nước thì chạy hiệu ứng và phát tiếng như lúc chơi.
  function den(kMoi, hoatAnh = false) {
    if (!dang) return;
    const n = nuoc.length;
    kMoi = Math.max(0, Math.min(n, kMoi));
    const truoc = k;
    const p = phatLai(luat, nuoc, { den: kMoi }); // nhật ký hỏng thì dừng ở nước hợp lệ cuối
    k = kMoi;
    let hieuUng = null;
    if (hoatAnh && p.hop_le && p.m && kMoi === truoc + 1) {
      const m = p.m;
      hieuUng = { batDau: Date.now(), quanBiAn: m.an || null, oAn: m.oAn, chieu: luat.biChieu(p.the, p.the.s), tu: m.tu, den: m.den };
      phatTiengNuoc(am, Boolean(m.an), hieuUng.chieu);
    }
    if (k >= n) dung();
    hienTrangThai(f(nhan.xlTrangThai, { k, n }));
    khiVe({ the: p.the, nuocCuoi: p.nuocCuoi, anCuoi: p.anCuoi, hieuUng, k, n });
    capNhat();
  }

  function chay() {
    if (!dang) return;
    if (k >= nuoc.length) den(0);
    dung();
    chayId = window.setInterval(() => den(k + 1, true), NHIP_MS);
    capNhat();
  }

  // Bắt đầu xem lại danh sách nước dsNuoc của loại cờ có bộ luật luatVan, từ thế sau tu nước (mặc định thế mở đầu),
  // tự chạy nếu tuChay
  function batDau(luatVan, dsNuoc, { tuChay = true, tu = 0 } = {}) {
    if (dang || !dsNuoc?.length) return;
    am.mo(); // tạo ngữ cảnh âm thanh trong lúc người dùng bấm (iPhone chỉ cho phép như vậy)
    luat = luatVan;
    nuoc = [...dsNuoc];
    dang = true;
    k = -1;
    den(tu);
    if (tuChay) chay();
  }

  function thoat() {
    if (!dang) return;
    dang = false;
    dung();
    khiThoat();
  }

  const buoc = (fn) => () => {
    dung();
    fn();
  };
  nut.dau.addEventListener("click", buoc(() => den(0)));
  nut.lui.addEventListener("click", buoc(() => den(k - 1)));
  nut.tien.addEventListener("click", buoc(() => den(k + 1, true)));
  nut.cuoi.addEventListener("click", buoc(() => den(nuoc.length)));
  nut.chay.addEventListener("click", () => (chayId !== undefined ? dung() : chay()));
  nut.thoat.addEventListener("click", thoat);
  document.addEventListener("keydown", (e) => {
    if (!dang || e.target?.closest?.("input, textarea")) return;
    if (e.key === "ArrowLeft") { dung(); den(k - 1); e.preventDefault(); }
    if (e.key === "ArrowRight") { dung(); den(k + 1, true); e.preventDefault(); }
  });

  return { batDau, thoat, dangXem: () => dang };
}
