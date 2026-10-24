// Phần của từng loại cờ chỉ dùng ở trình duyệt: bộ vẽ bàn, mức chơi của máy và máy chạy trong Web Worker.
// Luật và đường dẫn nằm ở src/lib/tro-choi.js (dùng được cả ở server). Thêm loại cờ mới thì thêm vào các bảng dưới đây.
import { TRO_CHOI } from "../tro-choi.js";
import veCoTuong from "../co-tuong/ve.js";
import veCoVua from "../co-vua/ve.js";
import { MUC as MUC_CO_TUONG } from "../co-tuong/muc.js";
import { MUC as MUC_CO_VUA } from "../co-vua/muc.js";

export const VE = { co_tuong: veCoTuong, co_vua: veCoVua };
export const MUC = { co_tuong: MUC_CO_TUONG, co_vua: MUC_CO_VUA };

// Vite cần đường dẫn worker viết thẳng trong new Worker(new URL(...)) nên mỗi loại cờ một dòng
const TAO_WORKER = {
  co_tuong: () => new Worker(new URL("../co-tuong/may-worker.js", import.meta.url), { type: "module" }),
  co_vua: () => new Worker(new URL("../co-vua/may-worker.js", import.meta.url), { type: "module" }),
};
// Trình duyệt không chạy được worker thì tải máy vào trang (trang đứng hình trong lúc máy nghĩ)
const TAI_MAY = {
  co_tuong: () => import("../co-tuong/may.js"),
  co_vua: () => import("../co-vua/may.js"),
};

// Máy của một loại cờ, chạy trong Web Worker để trang vẫn bấm được và hiệu ứng vẫn mượt khi máy nghĩ lâu.
// tinh(the, tuyChon) → Promise kết quả { xep, doSau, nodes } (xem src/lib/chung/may.js), hoặc null nếu bị hủy.
// huy(): dừng hẳn lượt đang tính (ván mới), kết quả muộn bị bỏ.
export function taoMay(troChoi) {
  let worker = null;
  let cho = null; // hàm trả kết quả của lượt đang chờ
  let dem = 0; // tăng mỗi lần hủy, để kết quả của lượt cũ bị bỏ

  function huy() {
    dem++;
    worker?.terminate();
    worker = null;
    if (cho) {
      cho(null);
      cho = null;
    }
  }

  function tinh(the, tuyChon) {
    const ma = dem;
    return new Promise((xong) => {
      const tinhTrongTrang = () => setTimeout(async () => {
        const { tinh: tinhMay } = await TAI_MAY[troChoi]();
        xong(ma === dem ? tinhMay(the, tuyChon) : null);
      }, 30);
      if (typeof Worker === "undefined") return tinhTrongTrang();
      try {
        worker ??= TAO_WORKER[troChoi]();
        const w = worker;
        cho = xong;
        w.onmessage = (e) => {
          if (cho === xong) cho = null;
          xong(ma === dem ? e.data : null);
        };
        w.onerror = () => {
          if (worker === w) worker = null;
          if (cho !== xong) return; // lượt tính này đã xong hoặc bị hủy
          cho = null;
          tinhTrongTrang();
        };
        w.postMessage({ the, tuyChon });
      } catch {
        cho = null;
        tinhTrongTrang();
      }
    });
  }

  return { tinh, huy };
}

// Làm sáng mục menu của loại cờ đang xem (trang dùng chung cho mọi loại cờ như /tran/ chỉ biết loại cờ khi đã tải trận)
// Menu con (chơi với máy / bạn / thượng đài) đổi theo loại cờ; muc là mã mục con cần sáng ("tran", "dai"), bỏ trống thì giữ nguyên.
export function sangMenu(troChoi, muc = "") {
  for (const a of document.querySelectorAll("#menu-chinh a[data-tro-choi]")) {
    if (a.getAttribute("data-tro-choi") === troChoi) {
      a.setAttribute("aria-current", "page");
      const ten = document.querySelector(".ten-co-con span");
      if (ten) ten.textContent = a.textContent;
    } else a.removeAttribute("aria-current");
  }
  const tienTo = document.documentElement.dataset.tienTo || "";
  for (const a of document.querySelectorAll("#menu-con a[data-muc]")) {
    const duong = TRO_CHOI[troChoi]?.duong[a.getAttribute("data-muc")];
    if (duong) a.setAttribute("href", `${tienTo}${duong}`);
    if (muc) {
      if (a.getAttribute("data-muc") === muc) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
  }
}

// Chuỗi giao diện theo ngôn ngữ trang, do trang đưa vào một thẻ <script type="application/json">. f() điền các chỗ {x}.
export const docChu = (id) => JSON.parse(document.getElementById(id)?.textContent || "{}");
export const f = (mau, v = {}) => String(mau ?? "").replace(/\{(\w+)\}/g, (_, k) => (k in v ? String(v[k]) : `{${k}}`));
